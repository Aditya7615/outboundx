import { Router } from "express";
import { internalController } from "../controllers/internal.controller";
import { asyncHandler } from "../middlewares/error";

export const internalRouter = Router();

internalRouter.post("/dispatch-due", asyncHandler(internalController.dispatchDue));
