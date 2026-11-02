import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { asyncHandler } from "../middlewares/error";
import { requireAuth } from "../middlewares/auth";
import { authLimiter } from "../middlewares/rate-limit";

export const authRouter = Router();

authRouter.post("/register", authLimiter, asyncHandler(authController.register));
authRouter.post("/login", authLimiter, asyncHandler(authController.login));
authRouter.post("/logout", asyncHandler(authController.logout));
authRouter.get("/me", requireAuth, asyncHandler(authController.me));
