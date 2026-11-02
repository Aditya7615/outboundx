import request from "supertest";

jest.mock("../../src/services/auth.service", () => ({
  authService: {
    register: jest.fn(),
    login: jest.fn(),
    getProfile: jest.fn()
  }
}));

import { app } from "../../src/app";
import { authService } from "../../src/services/auth.service";
import { HttpError } from "../../src/middlewares/error";
import { signToken } from "../../src/utils/jwt";

const mockAuthService = authService as jest.Mocked<typeof authService>;

const user = {
  id: 7,
  name: "Ada Lovelace",
  email: "ada@example.com",
  createdAt: new Date("2026-02-01T00:00:00Z")
};

describe("auth routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registers a user and sets an httpOnly cookie", async () => {
    mockAuthService.register.mockResolvedValue({ user, token: "signed-token" });

    const response = await request(app).post("/api/auth/register").send({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "super-secret"
    });

    expect(response.status).toBe(201);
    expect(response.body.data.user.email).toBe("ada@example.com");
    expect(response.headers["set-cookie"]?.[0]).toContain("ox_token=signed-token");
    expect(response.headers["set-cookie"]?.[0]).toContain("HttpOnly");
  });

  it("rejects invalid registration payloads before calling the service", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "A",
      email: "not-an-email",
      password: "short"
    });

    expect(response.status).toBe(400);
    expect(mockAuthService.register).not.toHaveBeenCalled();
  });

  it("returns 409 for duplicate accounts", async () => {
    mockAuthService.register.mockRejectedValue(new HttpError(409, "Already registered"));

    const response = await request(app).post("/api/auth/register").send({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "super-secret"
    });

    expect(response.status).toBe(409);
  });

  it("logs in and returns the session user", async () => {
    mockAuthService.login.mockResolvedValue({ user, token: "signed-token" });

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "ada@example.com", password: "super-secret" });

    expect(response.status).toBe(200);
    expect(response.body.data.user.id).toBe(7);
  });

  it("returns the current user for a valid bearer token", async () => {
    mockAuthService.getProfile.mockResolvedValue(user);
    const token = signToken({ id: 7, email: user.email, name: user.name });

    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.user.name).toBe("Ada Lovelace");
  });

  it("rejects unauthenticated profile requests", async () => {
    const response = await request(app).get("/api/auth/me");
    expect(response.status).toBe(401);
  });
});
