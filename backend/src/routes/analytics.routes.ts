import { Router } from "express";
import { analyticsController } from "../controllers/analytics.controller";
import { asyncHandler } from "../middlewares/error";
import { requireAuth } from "../middlewares/auth";

export const analyticsRouter = Router();

analyticsRouter.use(requireAuth);
analyticsRouter.get("/overview", asyncHandler(analyticsController.overview));
