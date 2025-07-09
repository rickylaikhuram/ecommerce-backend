import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

// 🚀 Redis for OTPs (Redis Cloud)
export const redisOtp = new Redis({
  host: process.env.OTP_REDIS_HOST!,
  port: parseInt(process.env.OTP_REDIS_PORT!, 10),
  username: process.env.OTP_REDIS_USERNAME,
  password: process.env.OTP_REDIS_PASSWORD,
});

redisOtp.on("error", (err) => {
  console.error("❌ OTP Redis Error:", err);
});

// 🚀 Redis for App data (guest cart, cache, etc. — Upstash )
export const redisApp = new Redis(process.env.UPSTASH_REDIS_URL!);

redisApp.on("error", (err) => {
  console.error("❌ App Redis Error:", err);
});

// 📡 Optional connection initializer (call during app boot)
export const connectRedisClients = async () => {
  if (redisOtp.status === "end") {
    await redisOtp.connect();
    console.log("✅ OTP Redis connected");
  } else {
    console.log("ℹ️ OTP Redis already connected or connecting");
  }

  if (redisApp.status === "end") {
    await redisApp.connect();
    console.log("✅ App Redis connected");
  } else {
    console.log("ℹ️ App Redis already connected or connecting");
  }
};
