import { Request } from "express";
import { User } from "@prisma/client";

export interface UserExtend extends Request {
  user?: User;
}

export interface AuthRequest extends Request {
  user?: { uid: string; isAdmin: boolean };
}

export interface DecodedToken {
  uid: string;
  role: "admin" | "guest" | "user";
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}
