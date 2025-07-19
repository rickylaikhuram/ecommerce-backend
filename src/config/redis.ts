import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

// Validating Environment Variable
const validateEnv = () => {
  const required = ['OTP_REDIS_HOST', 'OTP_REDIS_PORT', 'UPSTASH_REDIS_URL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

validateEnv();

// 🔐 Redis Configs
const otpRedisConfig = {
  host: process.env.OTP_REDIS_HOST!,
  port: parseInt(process.env.OTP_REDIS_PORT!, 10),
  username: process.env.OTP_REDIS_USERNAME,
  password: process.env.OTP_REDIS_PASSWORD,
  // ⏳ Retry logic for ECONNRESET, etc.
  retryStrategy(times: number) {
    const delay = Math.min(times * 100, 3000); // max 3 sec
    console.warn(`🔁 OTP Redis retrying attempt ${times} in ${delay}ms`);
    return delay;
  },
  // Optional: Add connection timeout
  connectTimeout: 10000,
  // Optional: Enable offline queue
  enableOfflineQueue: true,
};

const upstashRedisConfig = {
  // Automatically parsed from rediss://... string
  retryStrategy(times: number) {
    const delay = Math.min(times * 100, 3000);
    console.warn(`🔁 App Redis retrying attempt ${times} in ${delay}ms`);
    return delay;
  },
  connectTimeout: 10000,
  enableOfflineQueue: true,
};

// 🚀 Redis for OTPs (Redis Cloud)
export const redisOtp = new Redis(otpRedisConfig);

// 🚀 Redis for App (Upstash)
export const redisApp = new Redis(
  process.env.UPSTASH_REDIS_URL!,
  upstashRedisConfig
);

// 🧯 Redis error handlers
redisOtp.on("error", (err) => {
  console.error("❌ OTP Redis Error:", err.message);
});

redisApp.on("error", (err) => {
  console.error("❌ App Redis Error:", err.message);
});

// Add connection success handlers
redisOtp.on("connect", () => {
  console.log("✅ OTP Redis connected");
});

redisApp.on("connect", () => {
  console.log("✅ App Redis connected");
});

// 🔌 Optional: Connect manually if not auto-connected
export const connectRedisClients = async () => {
  const connect = async (client: Redis, label: string) => {
    // Check if client needs connection
    if (client.status === "end" || client.status === "close" || client.status === "wait") {
      try {
        await client.connect();
        console.log(`✅ ${label} Redis manually connected`);
      } catch (err) {
        if (err instanceof Error) {
          console.error(`❌ Failed to connect ${label} Redis:`, err.message);
        } else {
          console.error(`❌ Failed to connect ${label} Redis:`, err);
        }
        throw err; // Re-throw to handle at higher level
      }
    } else if (client.status === "ready") {
      console.log(`✅ ${label} Redis already connected`);
    }
  };

  // Connect both clients
  try {
    await Promise.all([
      connect(redisOtp, "OTP"),
      connect(redisApp, "App")
    ]);
  } catch (err) {
    console.error("❌ Failed to connect Redis clients:", err);
    throw err;
  }
};

// Optional: Graceful shutdown
export const disconnectRedisClients = async () => {
  try {
    await Promise.all([
      redisOtp.quit(),
      redisApp.quit()
    ]);
    console.log("✅ All Redis connections closed gracefully");
  } catch (err) {
    console.error("❌ Error closing Redis connections:", err);
  }
};