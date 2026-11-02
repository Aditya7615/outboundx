import request from "supertest";

jest.mock("../../src/services/contact.service", () => ({
  contactService: {
    list: jest.fn(),
    stats: jest.fn(),
    audience: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    importCsv: jest.fn()
  }
}));

import { app } from "../../src/app";
import { contactService } from "../../src/services/contact.service";
import { signToken } from "../../src/utils/jwt";
import { HttpError } from "../../src/middlewares/error";

const mockContactService = contactService as jest.Mocked<typeof contactService>;
const token = signToken({ id: 7, email: "ada@example.com", name: "Ada" });

const contact = {
  id: 2,
  email: "lead@example.com",
  phone: null,
  firstName: "Lead",
  lastName: null,
  company: "Acme",
  status: "active" as const,
  createdAt: new Date("2026-02-01T00:00:00Z"),
  updatedAt: new Date("2026-02-01T00:00:00Z")
};

describe("contact routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires authentication", async () => {
    const response = await request(app).get("/api/contacts");
    expect(response.status).toBe(401);
  });

  it("passes parsed cursor pagination parameters to the service", async () => {
    mockContactService.list.mockResolvedValue({
      data: [contact],
      pageInfo: { nextCursor: null, hasMore: false, limit: 10 }
    });

    const response = await request(app)
      .get("/api/contacts?limit=10&status=active&search=acme")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(mockContactService.list).toHaveBeenCalledWith(7, {
      limit: 10,
      status: "active",
      search: "acme"
    });
  });

  it("rejects malformed cursors with a 400", async () => {
    mockContactService.list.mockRejectedValue(new HttpError(400, "Invalid cursor"));

    const response = await request(app)
      .get("/api/contacts?cursor=garbage")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
  });

  it("creates a contact with a valid payload", async () => {
    mockContactService.create.mockResolvedValue(contact);

    const response = await request(app)
      .post("/api/contacts")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "lead@example.com", firstName: "Lead" });

    expect(response.status).toBe(201);
    expect(mockContactService.create).toHaveBeenCalledWith(7, {
      email: "lead@example.com",
      firstName: "Lead",
      status: "active"
    });
  });

  it("validates the contact payload", async () => {
    const response = await request(app)
      .post("/api/contacts")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "nope" });

    expect(response.status).toBe(400);
    expect(mockContactService.create).not.toHaveBeenCalled();
  });

  it("requires a file for CSV imports", async () => {
    const response = await request(app)
      .post("/api/contacts/import")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(400);
  });

  it("accepts a CSV upload and forwards the buffer", async () => {
    mockContactService.importCsv.mockResolvedValue({
      total: 1,
      imported: 1,
      skipped: 0,
      invalid: 0,
      errors: []
    });

    const response = await request(app)
      .post("/api/contacts/import")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("email\nlead@example.com"), {
        filename: "contacts.csv",
        contentType: "text/csv"
      });

    expect(response.status).toBe(201);
    expect(response.body.data.imported).toBe(1);
    expect(mockContactService.importCsv).toHaveBeenCalledWith(
      7,
      expect.any(Buffer)
    );
  });
});
