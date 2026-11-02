import type { Request, Response } from "express";
import { analyticsService } from "../services/analytics.service";
import { HttpError, parseInput } from "../middlewares/error";
import { analyticsQuerySchema } from "../validation/schemas";

export const analyticsController = {
  async overview(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new HttpError(401, "Authentication required");
    const { days } = parseInput(analyticsQuerySchema, req.query);
    const overview = await analyticsService.overview(req.user.id, days);
    res.json({ data: overview });
  }
};
