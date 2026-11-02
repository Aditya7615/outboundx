import { createHash, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { env } from "../config/env";
import { HttpError } from "../middlewares/error";
import { campaignService } from "../services/campaign.service";

function signaturesMatch(provided: string): boolean {
  const expected = createHash("sha256").update(env.CRON_SECRET).digest();
  const actual = createHash("sha256").update(provided).digest();
  return timingSafeEqual(expected, actual);
}

export const internalController = {
  async dispatchDue(req: Request, res: Response): Promise<void> {
    const header = req.header("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

    if (!token || !signaturesMatch(token)) {
      throw new HttpError(401, "Invalid cron secret");
    }

    const dispatched = await campaignService.dispatchDue();
    res.json({ data: { dispatched } });
  }
};
