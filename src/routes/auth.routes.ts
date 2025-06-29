import { Router } from "express";
import { isAuthenticated } from "../middlewares/auth.middlewares";
import { AuthRequest } from "../types/customTypes";

const router = Router();

router.get("/", isAuthenticated, (req: AuthRequest, res) => {
  res.status(200).json({ user: req.user });
});

export default router;
