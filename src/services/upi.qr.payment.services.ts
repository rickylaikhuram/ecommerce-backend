// services/clovershopPayment.ts
import axios from "axios";
import qs from "qs";
import dotenv from "dotenv";

dotenv.config();
const CLOVERSHOP_CREATE_ORDER_URL = process.env.CLOVERSHOP_CREATE_ORDER_URL!;
const CLOVERSHOP_API_TOKEN = process.env.CLOVERSHOP_API_TOKEN!;
const WEBHOOK_URL = process.env.WEBHOOK_URL!;

interface CloverCreateOrderResponse {
  status: boolean;
  message: string;
  result?: {
    orderId: string;
    payment_url: string;
  };
}

export async function createCloverOrder(
  customerMobile: string,
  amount: number,
  orderId: string,
  remark1?: string,
) {
  const payload = {
    customer_mobile: customerMobile,
    user_token: CLOVERSHOP_API_TOKEN,
    amount: String(amount),
    order_id: orderId,
    redirect_url: WEBHOOK_URL, // can also be your site checkout success page
    remark1: remark1 || "",
  };

  const { data } = await axios.post<CloverCreateOrderResponse>(
    CLOVERSHOP_CREATE_ORDER_URL,
    qs.stringify(payload),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  if (!data.status) {
    throw new Error(data.message || "Failed to create Clover order");
  }

  return data.result!;
}
