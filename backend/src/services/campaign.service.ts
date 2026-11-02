import { Prisma, type Campaign, type CampaignLog, type PrismaClient } from "@prisma/client";
import { prisma } from "../config/prisma";
import { HttpError } from "../middlewares/error";
import type {
  CampaignDto,
  CampaignLogDto,
  CampaignStats,
  PaginatedResult
} from "../models/types";
import type {
  CampaignCreateInput,
  CampaignUpdateInput,
  LogListQuery
} from "../validation/schemas";
import { emptyStats } from "../utils/mappers";
import { chunk, decodeCursor, encodeCursor } from "../utils/pagination";
import { emailProvider, type EmailProvider } from "./email-provider.service";

const MAX_DISPATCH_RECIPIENTS = 5000;
const SEND_CONCURRENCY = 20;

export class CampaignService {
  constructor(
    private readonly db: PrismaClient = prisma,
    private readonly provider: EmailProvider = emailProvider
  ) {}

  async list(userId: number, status?: Campaign["status"]): Promise<CampaignDto[]> {
    const campaigns = await this.db.campaign.findMany({
      where: { userId, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" }
    });

    if (!campaigns.length) return [];

    const grouped = await this.db.campaignLog.groupBy({
      by: ["campaignId", "status"],
      where: { campaignId: { in: campaigns.map((campaign) => campaign.id) } },
      _count: { _all: true }
    });

    const statsByCampaign = new Map<number, CampaignStats>();
    for (const row of grouped) {
      const stats = statsByCampaign.get(row.campaignId) ?? emptyStats();
      const count = row._count._all;
      stats.recipients += count;
      stats.sent += count;
      if (row.status === "opened" || row.status === "clicked") stats.opened += count;
      if (row.status === "clicked") stats.clicked += count;
      statsByCampaign.set(row.campaignId, stats);
    }

    return campaigns.map((campaign) => this.toDto(campaign, statsByCampaign.get(campaign.id)));
  }

  async getById(userId: number, campaignId: number): Promise<CampaignDto> {
    const campaign = await this.findOwned(userId, campaignId);
    const grouped = await this.db.campaignLog.groupBy({
      by: ["status"],
      where: { campaignId: campaign.id },
      _count: { _all: true }
    });

    const stats = emptyStats();
    for (const row of grouped) {
      stats.recipients += row._count._all;
      stats.sent += row._count._all;
      if (row.status === "opened" || row.status === "clicked") stats.opened += row._count._all;
      if (row.status === "clicked") stats.clicked += row._count._all;
    }

    return this.toDto(campaign, stats);
  }

  async getLogs(
    userId: number,
    campaignId: number,
    query: LogListQuery
  ): Promise<PaginatedResult<CampaignLogDto>> {
    await this.findOwned(userId, campaignId);
    const cursorId = query.cursor ? decodeCursor(query.cursor) : null;

    const logs = await this.db.campaignLog.findMany({
      where: {
        campaignId,
        ...(cursorId ? { id: { lt: cursorId } } : {})
      },
      orderBy: { id: "desc" },
      take: query.limit + 1,
      include: {
        contact: {
          select: { email: true, firstName: true, lastName: true, company: true }
        }
      }
    });

    const hasMore = logs.length > query.limit;
    const page = hasMore ? logs.slice(0, query.limit) : logs;
    const last = page[page.length - 1];

    return {
      data: page.map((log) => this.toLogDto(log)),
      pageInfo: {
        nextCursor: hasMore && last ? encodeCursor(last.id) : null,
        hasMore,
        limit: query.limit
      }
    };
  }

  async create(userId: number, input: CampaignCreateInput): Promise<CampaignDto> {
    const audienceIds = input.audienceContactIds
      ? [...new Set(input.audienceContactIds)]
      : [];

    if (input.audienceType === "selected") {
      const owned = await this.db.contact.findMany({
        where: { userId, id: { in: audienceIds } },
        select: { id: true }
      });
      if (owned.length !== audienceIds.length) {
        throw new HttpError(400, "One or more selected contacts do not exist");
      }
    }

    const scheduledFor = input.scheduledFor ? new Date(input.scheduledFor) : null;
    if (scheduledFor && scheduledFor.getTime() <= Date.now()) {
      throw new HttpError(400, "Scheduled time must be in the future");
    }

    const campaign = await this.db.campaign.create({
      data: {
        userId,
        title: input.title,
        content: input.content,
        audienceType: input.audienceType,
        audienceContactIds:
          input.audienceType === "selected" ? audienceIds : undefined,
        scheduledFor,
        status: scheduledFor ? "scheduled" : "draft"
      }
    });

    return this.toDto(campaign, emptyStats());
  }

  async update(
    userId: number,
    campaignId: number,
    input: CampaignUpdateInput
  ): Promise<CampaignDto> {
    const campaign = await this.findOwned(userId, campaignId);
    if (campaign.status === "sending" || campaign.status === "completed") {
      throw new HttpError(409, "Only draft or scheduled campaigns can be edited");
    }

    const effectiveAudienceType = input.audienceType ?? campaign.audienceType;
    const currentAudienceIds = Array.isArray(campaign.audienceContactIds)
      ? campaign.audienceContactIds.map(Number)
      : [];
    const effectiveAudienceIds =
      input.audienceContactIds !== undefined
        ? input.audienceContactIds ?? []
        : currentAudienceIds;

    if (effectiveAudienceType === "selected") {
      if (!effectiveAudienceIds.length) {
        throw new HttpError(400, "Select at least one contact for a selected audience");
      }
      const uniqueIds = [...new Set(effectiveAudienceIds)];
      const owned = await this.db.contact.findMany({
        where: { userId, id: { in: uniqueIds } },
        select: { id: true }
      });
      if (owned.length !== uniqueIds.length) {
        throw new HttpError(400, "One or more selected contacts do not exist");
      }
    }

    const scheduledFor =
      input.scheduledFor === undefined
        ? undefined
        : input.scheduledFor === null
          ? null
          : new Date(input.scheduledFor);

    if (scheduledFor && scheduledFor.getTime() <= Date.now()) {
      throw new HttpError(400, "Scheduled time must be in the future");
    }

    const updated = await this.db.campaign.update({
      where: { id: campaignId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.content !== undefined ? { content: input.content } : {}),
        ...(input.audienceType !== undefined ? { audienceType: input.audienceType } : {}),
        ...(input.audienceType !== undefined || input.audienceContactIds !== undefined
          ? {
              audienceContactIds:
                effectiveAudienceType === "selected" ? effectiveAudienceIds : Prisma.DbNull
            }
          : {}),
        ...(scheduledFor !== undefined ? { scheduledFor } : {}),
        ...(scheduledFor !== undefined
          ? { status: scheduledFor ? "scheduled" : "draft" }
          : {})
      }
    });

    return this.getById(userId, updated.id);
  }

  async remove(userId: number, campaignId: number): Promise<void> {
    const campaign = await this.findOwned(userId, campaignId);
    if (campaign.status === "sending") {
      throw new HttpError(409, "Cannot delete a campaign while it is sending");
    }
    await this.db.campaign.delete({ where: { id: campaignId } });
  }

  async dispatch(
    userId: number,
    campaignId: number
  ): Promise<{ sent: number; skipped: number; campaign: CampaignDto }> {
    const campaign = await this.findOwned(userId, campaignId);
    if (campaign.status === "sending") {
      throw new HttpError(409, "Campaign is already sending");
    }
    if (campaign.status === "completed") {
      return { sent: 0, skipped: 0, campaign: await this.getById(userId, campaignId) };
    }

    const audienceIds = this.audienceIds(campaign);
    const audienceWhere = {
      userId,
      status: "active" as const,
      ...(audienceIds ? { id: { in: audienceIds } } : {})
    };

    const recipientCount = await this.db.contact.count({ where: audienceWhere });
    if (recipientCount > MAX_DISPATCH_RECIPIENTS) {
      throw new HttpError(
        400,
        `Campaign audience exceeds the ${MAX_DISPATCH_RECIPIENTS} recipient limit`
      );
    }

    const contacts = await this.db.contact.findMany({ where: audienceWhere });

    if (!contacts.length) {
      await this.db.campaign.update({
        where: { id: campaignId },
        data: { status: "completed" }
      });
      return { sent: 0, skipped: 0, campaign: await this.getById(userId, campaignId) };
    }

    const existing = await this.db.campaignLog.findMany({
      where: { campaignId },
      select: { contactId: true }
    });
    const alreadySent = new Set(existing.map((log) => log.contactId));
    const recipients = contacts.filter((contact) => !alreadySent.has(contact.id));

    await this.db.campaign.update({
      where: { id: campaignId },
      data: { status: "sending" }
    });

    let sent = 0;
    try {
      for (const batch of chunk(recipients, SEND_CONCURRENCY)) {
        const messages = await Promise.all(
          batch.map((contact) =>
            this.provider.send({
              to: contact.email,
              subject: campaign.title,
              body: campaign.content,
              campaignId: campaign.id,
              contactId: contact.id
            })
          )
        );

        await this.db.campaignLog.createMany({
          data: batch.map((contact, index) => ({
            campaignId: campaign.id,
            contactId: contact.id,
            status: "sent" as const,
            providerMessageId: messages[index]?.messageId,
            sentAt: new Date()
          })),
          skipDuplicates: true
        });

        sent += batch.length;
      }

      await this.db.campaign.update({
        where: { id: campaignId },
        data: { status: "completed" }
      });
    } catch (error) {
      await this.db.campaign.update({
        where: { id: campaignId },
        data: { status: campaign.scheduledFor ? "scheduled" : "draft" }
      });
      throw error;
    }

    return {
      sent,
      skipped: contacts.length - recipients.length,
      campaign: await this.getById(userId, campaignId)
    };
  }

  async dispatchDue(): Promise<number> {
    const due = await this.db.campaign.findMany({
      where: {
        status: "scheduled",
        scheduledFor: { lte: new Date() }
      },
      take: 10
    });

    let dispatched = 0;
    for (const campaign of due) {
      try {
        await this.dispatch(campaign.userId, campaign.id);
        dispatched += 1;
      } catch (error) {
        console.error(`Failed to dispatch campaign ${campaign.id}`, error);
      }
    }
    return dispatched;
  }

  async findOwned(userId: number, campaignId: number): Promise<Campaign> {
    const campaign = await this.db.campaign.findFirst({
      where: { id: campaignId, userId }
    });
    if (!campaign) {
      throw new HttpError(404, "Campaign not found");
    }
    return campaign;
  }

  private audienceIds(campaign: Campaign): number[] | null {
    if (campaign.audienceType !== "selected" || !campaign.audienceContactIds) {
      return null;
    }
    const raw = campaign.audienceContactIds;
    if (!Array.isArray(raw)) return null;
    return raw.map(Number).filter((id) => Number.isInteger(id) && id > 0);
  }

  private toDto(campaign: Campaign, stats: CampaignStats = emptyStats()): CampaignDto {
    return {
      id: campaign.id,
      title: campaign.title,
      content: campaign.content,
      status: campaign.status,
      audienceType: campaign.audienceType,
      audienceContactIds: Array.isArray(campaign.audienceContactIds)
        ? campaign.audienceContactIds.map(Number)
        : null,
      scheduledFor: campaign.scheduledFor,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
      stats
    };
  }

  private toLogDto(
    log: CampaignLog & {
      contact: {
        email: string;
        firstName: string | null;
        lastName: string | null;
        company: string | null;
      };
    }
  ): CampaignLogDto {
    return {
      id: log.id,
      contactId: log.contactId,
      status: log.status,
      sentAt: log.sentAt,
      openedAt: log.openedAt,
      clickedAt: log.clickedAt,
      contact: log.contact
    };
  }
}

export const campaignService = new CampaignService();
