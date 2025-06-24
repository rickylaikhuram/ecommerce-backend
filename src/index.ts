import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import user from "./routes/user";
// import admin from "./routes/admin";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET as string;
console.log("💡 index.ts is starting...")
// Middlewares
app.use(express.json());
app.use(cors());

// Check if user is logged in
app.get("/islogIn", (req: Request, res: Response) => {
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
// app.use("/admin", admin);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Global Error:", err);

  if (err.name === "UnauthorizedError") {
    res.status(401).json({ message: "Invalid token" });
    return;
  }

  if (err.name === "PrismaClientKnownRequestError") {
    res.status(400).json({ message: "Database Error", detail: err.meta });
    return;
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
