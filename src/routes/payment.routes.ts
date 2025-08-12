import { Router } from "express";
import { cloverWebhookHandler } from "../controllers/payment.controller";

const router = Router();

router.post("/webhook-clover-upi", cloverWebhookHandler);

export default router;
