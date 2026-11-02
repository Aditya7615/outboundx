import type { PrismaClient } from "@prisma/client";
import { ContactService } from "../../src/services/contact.service";
import { contactCreateSchema } from "../../src/validation/schemas";

describe("ContactService CSV import", () => {
  it("streams rows, skips invalid records and reports duplicates", async () => {
    const createMany = jest.fn(async ({ data }: { data: unknown[] }) => ({
      count: data.length - 1
    }));
    const db = {
      contact: { createMany }
    } as unknown as PrismaClient;
    const service = new ContactService(db);

    const csv = [
      "email,first_name,last_name,company,phone,status",
      "a@example.com,Ada,One,Acme,,active",
      "not-an-email,Bad,Row,Wrong,,active",
      "b@example.com,Bea,Two,Beta,,unsubscribed",
      "b@example.com,Bea,Two,Beta,,active"
    ].join("\n");

    const summary = await service.importCsv(7, Buffer.from(csv));

    expect(summary.total).toBe(4);
    expect(summary.invalid).toBe(1);
    expect(summary.imported).toBe(2);
    expect(summary.skipped).toBe(1);
    expect(summary.errors[0]?.row).toBe(3);
    expect(createMany).toHaveBeenCalledTimes(1);

    const data = createMany.mock.calls[0]?.[0]?.data as Array<Record<string, unknown>>;
    expect(data[0]).toMatchObject({
      userId: 7,
      email: "a@example.com",
      firstName: "Ada",
      status: "active"
    });
  });

  it("rejects an empty CSV", async () => {
    const service = new ContactService({} as PrismaClient);
    await expect(service.importCsv(1, Buffer.alloc(0))).rejects.toMatchObject({
      status: 400
    });
  });
});

describe("contact validation", () => {
  it("normalises blank optional values to undefined", () => {
    const parsed = contactCreateSchema.parse({
      email: "test@example.com",
      firstName: "",
      status: "active"
    });
    expect(parsed.firstName).toBeUndefined();
  });
});
