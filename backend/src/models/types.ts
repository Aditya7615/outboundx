import type {
  Campaign,
  CampaignLog,
  Contact,
  User
} from "@prisma/client";
import type { CampaignStatus, ContactStatus, LogStatus } from "@prisma/client";

export type { CampaignStatus, ContactStatus, LogStatus };

export interface AuthUser {
  id: number;
  email: string;
  name: string;
}

export interface ContactDto {
  id: number;
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  status: ContactStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignStats {
  recipients: number;
  sent: number;
  opened: number;
  clicked: number;
}

export interface CampaignDto {
  id: number;
  title: string;
  content: string;
  status: CampaignStatus;
  audienceType: string;
  audienceContactIds: number[] | null;
  scheduledFor: Date | null;
  createdAt: Date;
  updatedAt: Date;
  stats: CampaignStats;
}

export interface CampaignLogDto {
  id: number;
  contactId: number;
  status: LogStatus;
  sentAt: Date;
  openedAt: Date | null;
  clickedAt: Date | null;
  contact?: {
    email: string;
    firstName: string | null;
    lastName: string | null;
    company: string | null;
  };
}

export interface PaginatedResult<T> {
  data: T[];
  pageInfo: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

export type ContactRecord = Contact;
export type CampaignRecord = Campaign;
export type CampaignLogRecord = CampaignLog;
export type UserRecord = User;
