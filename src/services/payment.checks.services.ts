// services/paymentStatusService.ts
import { PrismaClient, PaymentStatus, PaymentMethod, OrderStatus } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

// Define expected response type
interface PaymentGatewayResponse {
  status: string;
  message: string;
  result?: {
    txnStatus?: string;
    resultInfo?: string;
    orderId?: string;
    status?: string; // "SUCCESS" | "FAILURE"
    amount?: number | string;
    date?: string;
    utr?: string;
    remark1?: string;
    remark2?: string;
  } | null;
}

export const checkPendingPayments = async (): Promise<void> => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const pendingPayments = await prisma.payment.findMany({
    where: {
      method: PaymentMethod.UPI,
      status: PaymentStatus.PENDING,
      order: {
        createdAt: { lte: oneHourAgo },
      },
    },
    include: { order: true },
  });

  if (pendingPayments.length === 0) {
    console.log("No pending payments found.");
    return;
  }

  console.log(`Found ${pendingPayments.length} pending payments.`);

  for (const payment of pendingPayments) {
    try {
      const response = await axios.post<PaymentGatewayResponse>(
        "https://clovershop.online/api/check-order-status",
        new URLSearchParams({
          user_token: process.env.CLOVERSHOP_API_TOKEN ?? "",
          order_id: payment.order.orderNumber,
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      const data = response.data;
      const result = data.result;

      // 🟥 Case 1: No result (e.g., "Order not found")
      if (!result) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            order: {
              update: { status: OrderStatus.UNPLACED },
            },
          },
        });

        console.log(`❌ Payment ${payment.id} → FAILED (no result), Order → UNPLACED`);
        continue;
      }

      // 🟩 Case 2: Success
      if (result.status === "SUCCESS" || result.txnStatus === "COMPLETED") {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.COMPLETED,
            transactionId: result.utr ?? result.remark1 ?? result.orderId ?? null,
            paidAt: result.date ? new Date(result.date) : new Date(),
            order: {
              update: { status: OrderStatus.CONFIRMED },
            },
          },
        });

        console.log(`✅ Payment ${payment.id} → COMPLETED, Order → COMPLETED`);
      }
      // 🟥 Case 3: Failure
      else if (result.status === "FAILURE" || result.txnStatus === "FAILURE") {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            order: {
              update: { status: OrderStatus.UNPLACED },
            },
          },
        });

        console.log(`❌ Payment ${payment.id} → FAILED, Order → UNPLACED`);
      }
      // 🟨 Case 4: Unknown (leave pending)
      else {
        console.log(
          `ℹ️ Payment ${payment.id} still pending (status=${result.status}, txnStatus=${result.txnStatus}).`
        );
      }
    } catch (error: any) {
      console.error(
        `Error checking payment ${payment.id}:`,
        error.response?.data || error.message
      );
    }
  }
};
