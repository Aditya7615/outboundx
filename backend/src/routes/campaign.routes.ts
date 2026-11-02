import { Router } from "express";
import { campaignController } from "../controllers/campaign.controller";
import { asyncHandler } from "../middlewares/error";
import { requireAuth } from "../middlewares/auth";

export const campaignRouter = Router();

campaignRouter.use(requireAuth);

campaignRouter.get("/", asyncHandler(campaignController.list));
campaignRouter.post("/", asyncHandler(campaignController.create));
campaignRouter.get("/:id", asyncHandler(campaignController.get));
campaignRouter.patch("/:id", asyncHandler(campaignController.update));
campaignRouter.delete("/:id", asyncHandler(campaignController.remove));
campaignRouter.post("/:id/dispatch", asyncHandler(campaignController.dispatch));
campaignRouter.get("/:id/logs", asyncHandler(campaignController.logs));
