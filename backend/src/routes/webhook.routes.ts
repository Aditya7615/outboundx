import { Router } from "express";
import { webhookController } from "../controllers/webhook.controller";
import { asyncHandler } from "../middlewares/error";
import { webhookLimiter } from "../middlewares/rate-limit";

export const webhookRouter = Router();

webhookRouter.post("/email", webhookLimiter, asyncHandler(webhookController.email));
