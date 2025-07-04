import { Router } from "express";
import { identifySessionUser } from "../middlewares/auth.middlewares";
import { AuthRequest } from "../types/customTypes";

const router = Router();

router.get("/", identifySessionUser, (req: AuthRequest, res) => {
  res.status(200).json({ user: req.user });
});

export default router;
