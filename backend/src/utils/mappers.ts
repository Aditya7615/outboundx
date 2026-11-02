import { HttpError } from "../middlewares/error";
import type { CampaignStats, ContactDto, ContactRecord } from "../models/types";

export function toContactDto(contact: ContactRecord): ContactDto {
  return {
    id: contact.id,
    email: contact.email,
    phone: contact.phone,
    firstName: contact.firstName,
    lastName: contact.lastName,
    company: contact.company,
    status: contact.status,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt
  };
}

export function emptyStats(): CampaignStats {
  return { recipients: 0, sent: 0, opened: 0, clicked: 0 };
}

export function assertOwned<T>(record: T | null, message = "Resource not found"): T {
  if (!record) {
    throw new HttpError(404, message);
  }
  return record;
}
