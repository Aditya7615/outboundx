jest.mock("../../src/services/campaign.service", () => ({
  campaignService: { dispatchDue: jest.fn() }
}));

import request from "supertest";
import { app } from "../../src/app";
import { campaignService } from "../../src/services/campaign.service";

const mockCampaignService = campaignService as jest.Mocked<typeof campaignService>;

describe("internal scheduler route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects requests without the cron secret", async () => {
    const response = await request(app).post("/api/internal/dispatch-due");

    expect(response.status).toBe(401);
    expect(mockCampaignService.dispatchDue).not.toHaveBeenCalled();
  });

  it("dispatches due campaigns with the cron secret", async () => {
    mockCampaignService.dispatchDue.mockResolvedValue(2);

    const response = await request(app)
      .post("/api/internal/dispatch-due")
      .set("Authorization", `Bearer ${process.env.CRON_SECRET}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ dispatched: 2 });
  });
});
