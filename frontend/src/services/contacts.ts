import { apiRequest, apiRequestPage, toQuery, type PageResponse } from "./api";
import type {
  Contact,
  ContactStats,
  ContactStatus,
  ImportSummary
} from "./types";

export interface ContactQuery {
  cursor?: string;
  limit?: number;
  search?: string;
  status?: ContactStatus | "";
}

export interface ContactInput {
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  status?: ContactStatus;
}

export const contactService = {
  list(query: ContactQuery): Promise<PageResponse<Contact>> {
    return apiRequestPage<Contact>(
      `/contacts${toQuery({
        cursor: query.cursor,
        limit: query.limit ?? 25,
        search: query.search,
        status: query.status
      })}`
    );
  },

  stats(): Promise<ContactStats> {
    return apiRequest<ContactStats>("/contacts/stats");
  },

  audience(): Promise<Contact[]> {
    return apiRequest<Contact[]>("/contacts/audience");
  },

  create(input: ContactInput): Promise<Contact> {
    return apiRequest<Contact>("/contacts", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },

  update(id: number, input: Partial<ContactInput>): Promise<Contact> {
    return apiRequest<Contact>(`/contacts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input)
    });
  },

  remove(id: number): Promise<void> {
    return apiRequest<void>(`/contacts/${id}`, { method: "DELETE" });
  },

  importCsv(file: File): Promise<ImportSummary> {
    const form = new FormData();
    form.append("file", file);
    return apiRequest<ImportSummary>("/contacts/import", {
      method: "POST",
      body: form
    });
  }
};
