import { createHmac, timingSafeEqual } from "node:crypto";
import type { CampaignLog, PrismaClient } from "@prisma/client";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { HttpError } from "../middlewares/error";

export class WebhookService {
  constructor(private readonly db: PrismaClient = prisma) {}

  verifySignature(rawBody: Buffer | undefined, signature: string | undefined): void {
    if (!rawBody || !signature) {
      throw new HttpError(401, "Missing webhook signature");
    }

    const expected = createHmac("sha256", env.WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    const provided = signature.replace(/^sha256=/, "");
    const expectedBuffer = Buffer.from(expected, "utf8");
    const providedBuffer = Buffer.from(provided, "utf8");

    if (
      expectedBuffer.length !== providedBuffer.length ||
      !timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      throw new HttpError(401, "Invalid webhook signature");
    }
  }

  async handleEvent(input: {
    messageId: string;
    type: "opened" | "clicked";
    timestamp?: string;
  }): Promise<{ updated: boolean; log: CampaignLog }> {
    const log = await this.db.campaignLog.findUnique({
      where: { providerMessageId: input.messageId }
    });

    if (!log) {
      throw new HttpError(404, "Unknown email message");
    }

    const rank = { sent: 0, opened: 1, clicked: 2 } as const;
    if (rank[input.type] <= rank[log.status]) {
      return { updated: false, log };
    }

    const at = input.timestamp ? new Date(input.timestamp) : new Date();
    const updated = await this.db.campaignLog.update({
      where: { id: log.id },
      data:
        input.type === "clicked"
          ? {
              status: "clicked",
              openedAt: log.openedAt ?? at,
              clickedAt: at
            }
          : { status: "opened", openedAt: at }
    });

    return { updated: true, log: updated };
  }
}

export const webhookService = new WebhookService();
