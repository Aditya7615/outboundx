import type { Request, Response } from "express";
import { webhookService } from "../services/webhook.service";
import { parseInput } from "../middlewares/error";
import { webhookEventSchema, type WebhookEventInput } from "../validation/schemas";

export const webhookController = {
  async email(req: Request, res: Response): Promise<void> {
    const signature = req.header("x-webhook-signature");
    webhookService.verifySignature(req.rawBody, signature);

    const event = parseInput(webhookEventSchema, req.body) as WebhookEventInput;
    const result = await webhookService.handleEvent(event);

    res.json({
      data: {
        updated: result.updated,
        status: result.log.status
      }
    });
  }
};
