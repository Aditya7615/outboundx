import { apiRequest, toQuery } from "./api";
import type { AnalyticsOverview } from "./types";

export const analyticsService = {
  overview(days: number): Promise<AnalyticsOverview> {
    return apiRequest<AnalyticsOverview>(`/analytics/overview${toQuery({ days })}`);
  }
};
