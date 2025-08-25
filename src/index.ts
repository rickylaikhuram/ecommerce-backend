import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import user from "./routes/user.routes";
import admin from "./routes/admin.routes";
import auth from "./routes/auth.routes";
import products from "./routes/product.routes";
import paymentRoutes from "./routes/payment.routes";
import { errorHandler } from "./middlewares/error.middleware";
import { connectRedisClients } from "./config/redis";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173", "https://projectecommerce.pages.dev"],
    credentials: true,
  })
);
app.use(express.urlencoded({ extended: true })); // Needed for Clover webhook

// Check if user is logged in
app.use("/api/auth", auth);

// Routes
app.use("/api/user", user);
app.use("/api/admin", admin);
app.use("/api/product", products);

app.use("/api/payment", paymentRoutes);

app.post("/test", (req, res) => {
  res.send("Test route works");
});

// Global Error Handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  //Connect Redis
  await connectRedisClients();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer();
