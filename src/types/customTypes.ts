import { Request } from "express";
import { User } from "@prisma/client";

export interface UserExtend extends Request {
  user?: User;
}

