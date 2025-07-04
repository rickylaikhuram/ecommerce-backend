import { createClient } from "redis";
import dotenv from "dotenv";

dotenv.config();

const redis = createClient({
  username: process.env.REDIS_USERNAME!,
  password: process.env.REDIS_PASSWORD!,
  socket: {
    host: process.env.REDIS_HOST!,
    port: parseInt(process.env.REDIS_PORT!, 10),
  },
});

redis.on("error", (err) => {
  console.error("❌ Redis Client Error:", err);
});

// Call this once in your app startup
export const connectRedis = async () => {
  if (!redis.isOpen) {
    await redis.connect();
    console.log("✅ Redis connected");
  }
};

export default redis;
