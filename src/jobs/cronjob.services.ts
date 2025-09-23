import cron from "node-cron";
import { checkPendingPayments } from "../services/payment.checks.services";

// Run every 60 minutes
cron.schedule("*/60 * * * *", async () => {
  console.log("⏳ Running scheduled payment check...");
  try {
    await checkPendingPayments();
    console.log("✅ Payment check completed.");
  } catch (error) {
    console.error("❌ Payment check failed:", error);
  }
});
