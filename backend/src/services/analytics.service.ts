import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../config/prisma";
import type { CampaignStatus } from "../models/types";
import {
  fillDailySeries,
  rate,
  toDateKey,
  type DailySeriesPoint
} from "./analytics.helpers";

interface StatusCount {
  status: "sent" | "opened" | "clicked";
  _count: { _all: number };
}

interface CampaignStatusCount {
  campaignId: number;
  status: "sent" | "opened" | "clicked";
  _count: { _all: number };
}

interface RawDailyRow {
  date: Date | string;
  sent: bigint | number;
  opened: bigint | number;
  clicked: bigint | number;
}

export interface AnalyticsOverviewDto {
  rangeDays: number;
  totals: {
    contacts: number;
    activeContacts: number;
    campaigns: number;
    activeCampaigns: number;
    sent: number;
    opened: number;
    clicked: number;
  };
  rates: {
    openRate: number;
    clickRate: number;
  };
  funnel: Array<{ stage: string; value: number }>;
  daily: DailySeriesPoint[];
  campaigns: Array<{
    id: number;
    title: string;
    status: CampaignStatus;
    sent: number;
    opened: number;
    clicked: number;
    openRate: number;
    clickRate: number;
  }>;
}

export class AnalyticsService {
  constructor(private readonly db: PrismaClient = prisma) {}

  async overview(userId: number, days: number): Promise<AnalyticsOverviewDto> {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days + 1);
    since.setUTCHours(0, 0, 0, 0);

    const [contacts, activeContacts, campaigns, statusCounts, dailyRows, campaignRows] =
      await Promise.all([
        this.db.contact.count({ where: { userId } }),
        this.db.contact.count({ where: { userId, status: "active" } }),
        this.db.campaign.findMany({
          where: { userId },
          select: { id: true, title: true, status: true },
          orderBy: { createdAt: "desc" }
        }),
        this.db.campaignLog.groupBy({
          by: ["status"],
          where: { campaign: { userId } },
          _count: { _all: true }
        }),
        this.db.$queryRaw<RawDailyRow[]>(Prisma.sql`
          SELECT DATE(cl.sent_at) AS date,
                 CAST(COUNT(*) AS SIGNED) AS sent,
                 CAST(SUM(CASE WHEN cl.opened_at IS NOT NULL THEN 1 ELSE 0 END) AS SIGNED) AS opened,
                 CAST(SUM(CASE WHEN cl.clicked_at IS NOT NULL THEN 1 ELSE 0 END) AS SIGNED) AS clicked
          FROM campaign_logs cl
          INNER JOIN campaigns c ON c.id = cl.campaign_id
          WHERE c.user_id = ${userId} AND cl.sent_at >= ${since}
          GROUP BY DATE(cl.sent_at)
          ORDER BY date ASC
        `),
        this.db.campaignLog.groupBy({
          by: ["campaignId", "status"],
          where: { campaign: { userId } },
          _count: { _all: true }
        })
      ]);

    const totals = this.summariseStatusCounts(statusCounts as StatusCount[]);
    const daily = fillDailySeries(
      dailyRows.map((row) => ({
        date: toDateKey(row.date),
        sent: Number(row.sent),
        opened: Number(row.opened),
        clicked: Number(row.clicked)
      })),
      days
    );

    const statsByCampaign = new Map<number, { sent: number; opened: number; clicked: number }>();
    for (const row of campaignRows as CampaignStatusCount[]) {
      const stats = statsByCampaign.get(row.campaignId) ?? {
        sent: 0,
        opened: 0,
        clicked: 0
      };
      stats.sent += row._count._all;
      if (row.status === "opened" || row.status === "clicked") {
        stats.opened += row._count._all;
      }
      if (row.status === "clicked") stats.clicked += row._count._all;
      statsByCampaign.set(row.campaignId, stats);
    }

    return {
      rangeDays: days,
      totals: {
        contacts,
        activeContacts,
        campaigns: campaigns.length,
        activeCampaigns: campaigns.filter(
          (campaign) => campaign.status === "scheduled" || campaign.status === "sending"
        ).length,
        ...totals
      },
      rates: {
        openRate: rate(totals.opened, totals.sent),
        clickRate: rate(totals.clicked, totals.sent)
      },
      funnel: [
        { stage: "Sent", value: totals.sent },
        { stage: "Opened", value: totals.opened },
        { stage: "Clicked", value: totals.clicked }
      ],
      daily,
      campaigns: campaigns.slice(0, 8).map((campaign) => {
        const stats = statsByCampaign.get(campaign.id) ?? {
          sent: 0,
          opened: 0,
          clicked: 0
        };
        return {
          id: campaign.id,
          title: campaign.title,
          status: campaign.status,
          ...stats,
          openRate: rate(stats.opened, stats.sent),
          clickRate: rate(stats.clicked, stats.sent)
        };
      })
    };
  }

  private summariseStatusCounts(rows: StatusCount[]) {
    let sent = 0;
    let opened = 0;
    let clicked = 0;

    for (const row of rows) {
      sent += row._count._all;
      if (row.status === "opened" || row.status === "clicked") opened += row._count._all;
      if (row.status === "clicked") clicked += row._count._all;
    }

    return { sent, opened, clicked };
  }
}

export const analyticsService = new AnalyticsService();
