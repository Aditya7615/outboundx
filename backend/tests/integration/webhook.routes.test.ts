import { createHmac } from "node:crypto";
import { fakePrisma } from "../helpers/fake-prisma";

jest.mock("../../src/config/prisma", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { fakePrisma: prisma } = require("../helpers/fake-prisma");
  return { prisma };
});

import request from "supertest";
import { app } from "../../src/app";

const secret = process.env.WEBHOOK_SECRET as string;

describe("email webhook route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("applies a signed open event", async () => {
    fakePrisma.campaignLog.findUnique.mockResolvedValue({
      id: 1,
      campaignId: 2,
      contactId: 3,
      status: "sent",
      providerMessageId: "mock_123",
      sentAt: new Date(),
      openedAt: null,
      clickedAt: null,
      updatedAt: new Date()
    });
    fakePrisma.campaignLog.update.mockResolvedValue({
      id: 1,
      campaignId: 2,
      contactId: 3,
      status: "opened",
      providerMessageId: "mock_123",
      sentAt: new Date(),
      openedAt: new Date(),
      clickedAt: null,
      updatedAt: new Date()
    });

    const payload = JSON.stringify({ messageId: "mock_123", type: "opened" });
    const signature = createHmac("sha256", secret).update(payload).digest("hex");

    const response = await request(app)
      .post("/api/webhooks/email")
      .set("Content-Type", "application/json")
      .set("x-webhook-signature", signature)
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ updated: true, status: "opened" });
  });

  it("rejects requests without a valid signature", async () => {
    const response = await request(app)
      .post("/api/webhooks/email")
      .send({ messageId: "mock_123", type: "opened" });

    expect(response.status).toBe(401);
    expect(fakePrisma.campaignLog.findUnique).not.toHaveBeenCalled();
  });
});
