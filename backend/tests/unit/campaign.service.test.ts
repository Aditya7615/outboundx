import type { PrismaClient } from "@prisma/client";
import { CampaignService } from "../../src/services/campaign.service";

function campaign(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    userId: 7,
    title: "Founder outreach",
    content: "Hello from OutboundX",
    status: "draft",
    audienceType: "all_active",
    audienceContactIds: null,
    scheduledFor: null,
    createdAt: new Date("2026-02-01T00:00:00Z"),
    updatedAt: new Date("2026-02-01T00:00:00Z"),
    ...overrides
  };
}

describe("CampaignService dispatch", () => {
  it("sends to each active contact and records provider message ids", async () => {
    const state = campaign();
    const logs: Array<Record<string, unknown>> = [];

    const db = {
      campaign: {
        findFirst: jest.fn(async () => state),
        update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          Object.assign(state, data);
          return state;
        })
      },
      contact: {
        count: jest.fn(async () => 2),
        findMany: jest.fn(async () => [
          { id: 10, email: "a@example.com" },
          { id: 11, email: "b@example.com" }
        ])
      },
      campaignLog: {
        findMany: jest.fn(async () => []),
        createMany: jest.fn(async ({ data }: { data: Array<Record<string, unknown>> }) => {
          logs.push(...data);
          return { count: data.length };
        }),
        groupBy: jest.fn(async () => [])
      }
    } as unknown as PrismaClient;

    const provider = {
      send: jest.fn(async ({ contactId }: { contactId: number }) => ({
        messageId: `msg_${contactId}`
      }))
    };

    const service = new CampaignService(db, provider);
    const result = await service.dispatch(7, 1);

    expect(result.sent).toBe(2);
    expect(result.skipped).toBe(0);
    expect(logs).toHaveLength(2);
    expect(logs.map((log) => log.providerMessageId)).toEqual(["msg_10", "msg_11"]);
    expect(state.status).toBe("completed");
  });

  it("does not send a completed campaign twice", async () => {
    const db = {
      campaign: {
        findFirst: jest.fn(async () => campaign({ status: "completed" })),
        update: jest.fn()
      },
      contact: { count: jest.fn(async () => 0), findMany: jest.fn() },
      campaignLog: {
        findMany: jest.fn(),
        createMany: jest.fn(),
        groupBy: jest.fn(async () => [])
      }
    } as unknown as PrismaClient;

    const provider = { send: jest.fn() };
    const service = new CampaignService(db, provider);
    const result = await service.dispatch(7, 1);

    expect(result.sent).toBe(0);
    expect(provider.send).not.toHaveBeenCalled();
  });

  it("rejects audiences above the dispatch limit", async () => {
    const db = {
      campaign: {
        findFirst: jest.fn(async () => campaign()),
        update: jest.fn()
      },
      contact: { count: jest.fn(async () => 5001), findMany: jest.fn() },
      campaignLog: {
        findMany: jest.fn(),
        createMany: jest.fn(),
        groupBy: jest.fn(async () => [])
      }
    } as unknown as PrismaClient;

    const provider = { send: jest.fn() };
    const service = new CampaignService(db, provider);

    await expect(service.dispatch(7, 1)).rejects.toMatchObject({
      status: 400,
      message: "Campaign audience exceeds the 5000 recipient limit"
    });
    expect(provider.send).not.toHaveBeenCalled();
  });

  it("excludes contacts that already received the campaign", async () => {
    const db = {
      campaign: {
        findFirst: jest.fn(async () => campaign()),
        update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          Object.assign(campaign(), data);
          return campaign();
        })
      },
      contact: {
        count: jest.fn(async () => 2),
        findMany: jest.fn(async () => [
          { id: 10, email: "a@example.com" },
          { id: 11, email: "b@example.com" }
        ])
      },
      campaignLog: {
        findMany: jest.fn(async () => [{ contactId: 10 }]),
        createMany: jest.fn(async () => ({ count: 1 })),
        groupBy: jest.fn(async () => [])
      }
    } as unknown as PrismaClient;

    const provider = { send: jest.fn(async () => ({ messageId: "msg" })) };
    const service = new CampaignService(db, provider);
    const result = await service.dispatch(7, 1);

    expect(result.sent).toBe(1);
    expect(result.skipped).toBe(1);
    expect(provider.send).toHaveBeenCalledTimes(1);
  });
});
