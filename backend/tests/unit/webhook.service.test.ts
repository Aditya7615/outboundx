import { createHmac } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { WebhookService } from "../../src/services/webhook.service";

const secret = process.env.WEBHOOK_SECRET as string;

function signature(body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

function log(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    campaignId: 1,
    contactId: 2,
    status: "sent",
    providerMessageId: "mock_123",
    sentAt: new Date("2026-02-01T10:00:00Z"),
    openedAt: null,
    clickedAt: null,
    updatedAt: new Date("2026-02-01T10:00:00Z"),
    ...overrides
  };
}

describe("WebhookService", () => {
  it("accepts a valid HMAC signature", () => {
    const service = new WebhookService({} as PrismaClient);
    const body = Buffer.from(JSON.stringify({ messageId: "mock_123", type: "opened" }));
    expect(() => service.verifySignature(body, signature(body.toString()))).not.toThrow();
  });

  it("rejects a missing or invalid signature", () => {
    const service = new WebhookService({} as PrismaClient);
    const body = Buffer.from("{}");
    expect(() => service.verifySignature(body, undefined)).toThrow("Missing webhook signature");
    expect(() => service.verifySignature(body, "deadbeef")).toThrow("Invalid webhook signature");
  });

  it("upgrades a sent log to opened", async () => {
    const update = jest.fn(async ({ data }: { data: Record<string, unknown> }) =>
      log({ ...data })
    );
    const db = {
      campaignLog: {
        findUnique: jest.fn(async () => log()),
        update
      }
    } as unknown as PrismaClient;

    const service = new WebhookService(db);
    const result = await service.handleEvent({
      messageId: "mock_123",
      type: "opened",
      timestamp: "2026-02-01T11:00:00.000Z"
    });

    expect(result.updated).toBe(true);
    expect(update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: "opened", openedAt: new Date("2026-02-01T11:00:00.000Z") }
    });
  });

  it("does not downgrade a clicked event", async () => {
    const db = {
      campaignLog: {
        findUnique: jest.fn(async () => log({ status: "clicked" })),
        update: jest.fn()
      }
    } as unknown as PrismaClient;

    const service = new WebhookService(db);
    const result = await service.handleEvent({ messageId: "mock_123", type: "clicked" });

    expect(result.updated).toBe(false);
  });

  it("returns 404 for an unknown message id", async () => {
    const db = {
      campaignLog: { findUnique: jest.fn(async () => null), update: jest.fn() }
    } as unknown as PrismaClient;

    const service = new WebhookService(db);
    await expect(
      service.handleEvent({ messageId: "missing", type: "opened" })
    ).rejects.toMatchObject({ status: 404 });
  });
});
