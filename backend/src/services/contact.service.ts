import type { Contact, Prisma, PrismaClient } from "@prisma/client";
import { Readable } from "node:stream";
import { parse } from "csv-parse";
import { prisma } from "../config/prisma";
import { HttpError } from "../middlewares/error";
import type { ContactListQuery, ContactCreateInput, ContactUpdateInput } from "../validation/schemas";
import { contactCreateSchema } from "../validation/schemas";
import type { PaginatedResult } from "../models/types";
import { toContactDto } from "../utils/mappers";
import { chunk, decodeCursor, encodeCursor } from "../utils/pagination";

export interface ImportSummary {
  total: number;
  imported: number;
  skipped: number;
  invalid: number;
  errors: Array<{ row: number; message: string }>;
}

const MAX_IMPORT_ROWS = 20000;
const IMPORT_BATCH_SIZE = 500;

export class ContactService {
  constructor(private readonly db: PrismaClient = prisma) {}

  async list(
    userId: number,
    query: ContactListQuery
  ): Promise<PaginatedResult<ReturnType<typeof toContactDto>>> {
    const cursorId = query.cursor ? decodeCursor(query.cursor) : null;

    const where: Prisma.ContactWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
      ...(cursorId ? { id: { lt: cursorId } } : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search } },
              { firstName: { contains: query.search } },
              { lastName: { contains: query.search } },
              { company: { contains: query.search } }
            ]
          }
        : {})
    };

    const rows = await this.db.contact.findMany({
      where,
      orderBy: { id: "desc" },
      take: query.limit + 1
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page[page.length - 1];

    return {
      data: page.map(toContactDto),
      pageInfo: {
        nextCursor: hasMore && last ? encodeCursor(last.id) : null,
        hasMore,
        limit: query.limit
      }
    };
  }

  async count(userId: number): Promise<{ total: number; active: number; unsubscribed: number }> {
    const [total, active] = await Promise.all([
      this.db.contact.count({ where: { userId } }),
      this.db.contact.count({ where: { userId, status: "active" } })
    ]);
    return { total, active, unsubscribed: total - active };
  }

  async create(userId: number, input: ContactCreateInput): Promise<ReturnType<typeof toContactDto>> {
    const contact = await this.db.contact.create({
      data: {
        userId,
        email: input.email.trim().toLowerCase(),
        phone: input.phone ?? null,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        company: input.company ?? null,
        status: input.status
      }
    });
    return toContactDto(contact);
  }

  async update(
    userId: number,
    contactId: number,
    input: ContactUpdateInput
  ): Promise<ReturnType<typeof toContactDto>> {
    await this.findOwned(userId, contactId);
    const contact = await this.db.contact.update({
      where: { id: contactId },
      data: {
        ...(input.email !== undefined ? { email: input.email.trim().toLowerCase() } : {}),
        ...(input.phone !== undefined ? { phone: input.phone ?? null } : {}),
        ...(input.firstName !== undefined ? { firstName: input.firstName ?? null } : {}),
        ...(input.lastName !== undefined ? { lastName: input.lastName ?? null } : {}),
        ...(input.company !== undefined ? { company: input.company ?? null } : {}),
        ...(input.status !== undefined ? { status: input.status } : {})
      }
    });
    return toContactDto(contact);
  }

  async remove(userId: number, contactId: number): Promise<void> {
    await this.findOwned(userId, contactId);
    await this.db.contact.delete({ where: { id: contactId } });
  }

  async findOwned(userId: number, contactId: number): Promise<Contact> {
    const contact = await this.db.contact.findFirst({
      where: { id: contactId, userId }
    });
    if (!contact) {
      throw new HttpError(404, "Contact not found");
    }
    return contact;
  }

  async importCsv(userId: number, buffer: Buffer): Promise<ImportSummary> {
    if (!buffer.length) {
      throw new HttpError(400, "CSV file is empty");
    }

    const summary: ImportSummary = {
      total: 0,
      imported: 0,
      skipped: 0,
      invalid: 0,
      errors: []
    };

    const parser = Readable.from(buffer).pipe(
      parse({
        bom: true,
        columns: (headers: string[]) =>
          headers.map((header) =>
            header.trim().toLowerCase().replace(/\s+/g, "_")
          ),
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true
      })
    );

    let batch: Prisma.ContactCreateManyInput[] = [];

    const flush = async () => {
      if (!batch.length) return;
      const result = await this.db.contact.createMany({
        data: batch,
        skipDuplicates: true
      });
      summary.imported += result.count;
      batch = [];
    };

    try {
      for await (const raw of parser) {
        summary.total += 1;
        if (summary.total > MAX_IMPORT_ROWS) {
          throw new HttpError(413, `CSV exceeds the ${MAX_IMPORT_ROWS} row limit`);
        }

        const record = raw as Record<string, string | undefined>;
        const candidate = {
          email: record.email,
          phone: record.phone,
          firstName: record.first_name ?? record.firstname,
          lastName: record.last_name ?? record.lastname,
          company: record.company,
          status: (record.status ?? "active").toLowerCase()
        };

        const parsed = contactCreateSchema.safeParse(candidate);
        if (!parsed.success) {
          summary.invalid += 1;
          if (summary.errors.length < 5) {
            summary.errors.push({
              row: summary.total + 1,
              message: parsed.error.issues.map((issue) => issue.message).join(", ")
            });
          }
          continue;
        }

        batch.push({
          userId,
          email: parsed.data.email.toLowerCase(),
          phone: parsed.data.phone ?? null,
          firstName: parsed.data.firstName ?? null,
          lastName: parsed.data.lastName ?? null,
          company: parsed.data.company ?? null,
          status: parsed.data.status
        });

        if (batch.length >= IMPORT_BATCH_SIZE) {
          await flush();
        }
      }
      await flush();
    } catch (error) {
      if (error instanceof HttpError) throw error;
      throw new HttpError(400, "Unable to parse CSV file. Download the template and try again.");
    }

    // Rows that parsed correctly but were rejected by the unique index.
    summary.skipped = summary.total - summary.invalid - summary.imported;
    return summary;
  }

  async audienceOptions(userId: number, limit = 100): Promise<ReturnType<typeof toContactDto>[]> {
    const contacts = await this.db.contact.findMany({
      where: { userId, status: "active" },
      orderBy: { id: "desc" },
      take: limit
    });
    return contacts.map(toContactDto);
  }

  async findOwnedMany(userId: number, ids: number[]): Promise<Contact[]> {
    const uniqueIds = [...new Set(ids)];
    return this.db.contact.findMany({
      where: { userId, id: { in: uniqueIds } }
    });
  }

  static chunk = chunk;
}

export const contactService = new ContactService();
