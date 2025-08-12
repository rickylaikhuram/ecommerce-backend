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
      res.status(400).json({ success: false, message: "Missing verification token" });
      return;
    }

    // Fetch reservation snapshot
    const reservationData = await redisApp.get(`order:reservation:${remark1}`);
    if (!reservationData) {
      res.status(404).json({ success: false, message: "Reservation not found or expired" });
      return;
    }

    const { orderId, items } = JSON.parse(reservationData);

    // Update Payment record regardless of success/failure
    await prisma.payment.update({
      where: { orderId },
      data: {
        status: status === "SUCCESS" ? "SUCCESS" : "FAILED",
        transactionId: remark1 || null,
        paidAt: status === "SUCCESS" ? new Date() : null,
      },
    });

    // If payment failed, stop here
    if (status !== "SUCCESS") {
      res.status(200).json({ success: true, message: "Payment not successful" });
      return;
    }

    // Decrement stock in DB and update Redis reservations
    for (const item of items) {
      await prisma.productStock.updateMany({
        where: {
          productId: item.productId,
          stockName: item.stockName,
        },
        data: {
          stock: { decrement: item.quantity },
        },
      });

      const redisKey = `stock:reservation:${item.productId}:${item.stockName}`;
      const currentReserved = await redisApp.get(redisKey);

      if (currentReserved) {
        const remaining = parseInt(currentReserved, 10) - item.quantity;
        if (remaining <= 0) {
          await redisApp.del(redisKey);
        } else {
          const ttl = await redisApp.ttl(redisKey);
          if (ttl > 0) {
            await redisApp.set(redisKey, remaining, "EX", ttl);
          } else {
            await redisApp.set(redisKey, remaining, "EX", 60 * 30);
          }
        }
      }
    }

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "CONFIRMED" },
    });

    // Remove order snapshot
    await redisApp.del(`order:reservation:${remark1}`);

    res.status(200).json({ success: true, message: "Order payment processed successfully" });
  } catch (err) {
    next(err);
  }
};
