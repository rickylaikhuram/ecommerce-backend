import express, { Request, Response } from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import user from "./routes/user.routes";
import admin from "./routes/admin.routes";
import { errorHandler } from "./middlewares/error.middleware";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET as string;

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(cors());

// Check if user is logged in
app.use("/islogIn", (req: Request, res: Response) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    res.status(401).json({ message: "Not Logged In", auth: null });
    return;
  }

  const token = authorization.split(" ")[1];
  try {
    const verified = jwt.verify(token, JWT_SECRET) as {
      email: string;
      role: "USER" | "ADMIN";
    };
    res.status(200).json({ auth: verified.role, message: "Authenticated" });
  } catch {
    res.status(403).json({ message: "Forbidden", auth: null });
  }
});

// Routes
app.use("/user", user);
app.use("/admin", admin);

// Global Error Handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
