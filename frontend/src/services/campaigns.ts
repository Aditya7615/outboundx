import { apiRequest, apiRequestPage, toQuery, type PageResponse } from "./api";
import type {
  Campaign,
  CampaignLog,
  CampaignStatus,
  CreateCampaignInput
} from "./types";

export const campaignService = {
  list(status?: CampaignStatus | ""): Promise<Campaign[]> {
    return apiRequest<Campaign[]>(`/campaigns${toQuery({ status })}`);
  },

  get(id: number): Promise<Campaign> {
    return apiRequest<Campaign>(`/campaigns/${id}`);
  },

  create(input: CreateCampaignInput): Promise<Campaign> {
    return apiRequest<Campaign>("/campaigns", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },

  update(id: number, input: Partial<CreateCampaignInput>): Promise<Campaign> {
    return apiRequest<Campaign>(`/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  },

  remove(id: number): Promise<void> {
    return apiRequest<void>(`/campaigns/${id}`, { method: "DELETE" });
  },

  dispatch(id: number): Promise<{ sent: number; skipped: number; campaign: Campaign }> {
    return apiRequest<{ sent: number; skipped: number; campaign: Campaign }>(
      `/campaigns/${id}/dispatch`,
      { method: "POST" }
    );
  },

  logs(id: number, cursor?: string, limit = 25): Promise<PageResponse<CampaignLog>> {
    return apiRequestPage<CampaignLog>(
      `/campaigns/${id}/logs${toQuery({ cursor, limit })}`
    );
  }
};
