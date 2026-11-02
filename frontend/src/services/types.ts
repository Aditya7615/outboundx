export type ContactStatus = "active" | "unsubscribed";
export type CampaignStatus = "draft" | "scheduled" | "sending" | "completed";
export type LogStatus = "sent" | "opened" | "clicked";

export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export interface Contact {
  id: number;
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  status: ContactStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PageInfo {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export interface Paginated<T> {
  data: T[];
  pageInfo: PageInfo;
}

export interface ContactStats {
  total: number;
  active: number;
  unsubscribed: number;
}

export interface CampaignStats {
  recipients: number;
  sent: number;
  opened: number;
  clicked: number;
}

export interface Campaign {
  id: number;
  title: string;
  content: string;
  status: CampaignStatus;
  audienceType: "all_active" | "selected" | string;
  audienceContactIds: number[] | null;
  scheduledFor: string | null;
  createdAt: string;
  updatedAt: string;
  stats: CampaignStats;
}

export interface CampaignLog {
  id: number;
  contactId: number;
  status: LogStatus;
  sentAt: string;
  openedAt: string | null;
  clickedAt: string | null;
  contact?: {
    email: string;
    firstName: string | null;
    lastName: string | null;
    company: string | null;
  };
}

export interface ImportSummary {
  total: number;
  imported: number;
  skipped: number;
  invalid: number;
  errors: Array<{ row: number; message: string }>;
}

export interface AnalyticsOverview {
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
  daily: Array<{ date: string; sent: number; opened: number; clicked: number }>;
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

export interface CreateCampaignInput {
  title: string;
  content: string;
  audienceType: "all_active" | "selected";
  audienceContactIds?: number[];
  scheduledFor?: string;
}
