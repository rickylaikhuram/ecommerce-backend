import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { redisApp } from "../config/redis";

export const cloverWebhookHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { order_id, status, remark1 } = req.body;

    if (!remark1) {
      res
        .status(400)
        .json({ success: false, message: "Missing verification token" });
      return;
    }

    // Fetch reservation snapshot
    const reservationData = await redisApp.get(`order:reservation:${remark1}`);
    if (!reservationData) {
      res
        .status(404)
        .json({ success: false, message: "Reservation not found or expired" });
      return;
    }

    const { orderId, items } = JSON.parse(reservationData);

    // Update payment record regardless of success/failure
    await prisma.payment.update({
      where: { orderId },
      data: {
        status: status === "SUCCESS" ? "COMPLETED" : "FAILED",
        transactionId: remark1 || null,
        paidAt: status === "SUCCESS" ? new Date() : null,
      },
    });

    // If payment failed, stop here
    if (status !== "SUCCESS") {
      res
        .status(200)
        .json({ success: true, message: "Payment not successful" });
      return;
    }

    // === RUN STOCK, ORDER, AND REDIS UPDATE IN A TRANSACTION ===
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        // 1. Lock the stock row
        const [stockRow] = await tx.$queryRawUnsafe<any[]>(`
          SELECT * FROM "ProductStock"
          WHERE "productId" = $1 AND "stockName" = $2
          FOR UPDATE
        `, item.productId, item.stockName);

        if (!stockRow) {
          throw new Error("Stock not found");
        }

        if (stockRow.stock < item.quantity) {
          throw new Error("Insufficient stock");
        }

        // 2. Decrement stock after lock
        await tx.productStock.update({
          where: { id: stockRow.id },
          data: { stock: { decrement: item.quantity } },
        });

        // 3. Update Redis reservations atomically
        const redisKey = `stock:reservation:${item.productId}:${item.stockName}`;
        const currentReserved = await redisApp.get(redisKey);

        if (currentReserved) {
          const remaining = parseInt(currentReserved, 10) - item.quantity;
          if (remaining <= 0) {
            await redisApp.del(redisKey);
          } else {
            const ttl = await redisApp.ttl(redisKey);
            // use the existing TTL if still valid, otherwise reset to 30min
            if (ttl > 0) {
              await redisApp.set(redisKey, remaining, "EX", ttl);
            } else {
              await redisApp.set(redisKey, remaining, "EX", 60 * 30);
            }
          }
        }
      }

      // 4. Confirm the order in the same transaction
      await tx.order.update({
        where: { id: orderId },
        data: { status: "CONFIRMED" },
      });
    });

    // Remove order snapshot (safe to do outside transaction)
    await redisApp.del(`order:reservation:${remark1}`);

    res
      .status(200)
      .json({ success: true, message: "Order payment processed successfully" });
  } catch (err) {
    next(err);
  }
};