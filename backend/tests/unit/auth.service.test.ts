import type { PrismaClient } from "@prisma/client";
import { AuthService } from "../../src/services/auth.service";
import { HttpError } from "../../src/middlewares/error";

function createFakeDb() {
  const users: Array<Record<string, unknown>> = [];
  let nextId = 1;

  return {
    users,
    db: {
      user: {
        findUnique: jest.fn(async ({ where }: { where: { email?: string; id?: number } }) => {
          if (where.email) return users.find((user) => user.email === where.email) ?? null;
          return users.find((user) => user.id === where.id) ?? null;
        }),
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const user = {
            id: nextId++,
            name: data.name,
            email: data.email,
            passwordHash: data.passwordHash,
            createdAt: new Date("2026-02-01T00:00:00Z")
          };
          users.push(user);
          return user;
        })
      }
    } as unknown as PrismaClient
  };
}

describe("AuthService", () => {
  it("registers a user, hashes the password and signs a token", async () => {
    const { db, users } = createFakeDb();
    const service = new AuthService(db);

    const result = await service.register({
      name: "Ada Lovelace",
      email: "ADA@example.com ",
      password: "super-secret"
    });

    expect(result.user.email).toBe("ada@example.com");
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(result.token.split(".")).toHaveLength(3);
    expect(String(users[0]?.passwordHash)).not.toBe("super-secret");
  });

  it("rejects duplicate email addresses", async () => {
    const { db } = createFakeDb();
    const service = new AuthService(db);

    await service.register({
      name: "Ada",
      email: "ada@example.com",
      password: "super-secret"
    });

    await expect(
      service.register({
        name: "Ada Two",
        email: "ada@example.com",
        password: "super-secret"
      })
    ).rejects.toMatchObject({ status: 409 });
  });

  it("authenticates valid credentials and rejects invalid ones", async () => {
    const { db } = createFakeDb();
    const service = new AuthService(db);
    await service.register({
      name: "Ada",
      email: "ada@example.com",
      password: "super-secret"
    });

    const login = await service.login({
      email: "ada@example.com",
      password: "super-secret"
    });
    expect(login.user.email).toBe("ada@example.com");

    await expect(
      service.login({ email: "ada@example.com", password: "wrong" })
    ).rejects.toBeInstanceOf(HttpError);
  });

  it("returns the profile for an existing user", async () => {
    const { db } = createFakeDb();
    const service = new AuthService(db);
    const registered = await service.register({
      name: "Ada",
      email: "ada@example.com",
      password: "super-secret"
    });

    const profile = await service.getProfile(registered.user.id);
    expect(profile.name).toBe("Ada");
  });
});
