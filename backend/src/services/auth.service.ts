import bcrypt from "bcryptjs";
import type { PrismaClient, User } from "@prisma/client";
import { prisma } from "../config/prisma";
import { HttpError } from "../middlewares/error";
import type { AuthUser } from "../models/types";
import { signToken } from "../utils/jwt";
import { toPublicUser } from "../utils/user";

export interface PublicUserDto {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

export class AuthService {
  constructor(private readonly db: PrismaClient = prisma) {}

  async register(input: { name: string; email: string; password: string }): Promise<{
    user: PublicUserDto;
    token: string;
  }> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.db.user.findUnique({ where: { email } });
    if (existing) {
      throw new HttpError(409, "An account with this email already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.db.user.create({
      data: { name: input.name.trim(), email, passwordHash }
    });

    return { user: toPublicUser(user), token: signToken(this.toAuthUser(user)) };
  }

  async login(input: { email: string; password: string }): Promise<{
    user: PublicUserDto;
    token: string;
  }> {
    const email = input.email.trim().toLowerCase();
    const user = await this.db.user.findUnique({ where: { email } });
    if (!user) {
      throw new HttpError(401, "Invalid email or password");
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new HttpError(401, "Invalid email or password");
    }

    return { user: toPublicUser(user), token: signToken(this.toAuthUser(user)) };
  }

  async getProfile(userId: number): Promise<PublicUserDto> {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new HttpError(404, "User not found");
    }
    return toPublicUser(user);
  }

  private toAuthUser(user: User): AuthUser {
    return { id: user.id, email: user.email, name: user.name };
  }
}

export const authService = new AuthService();
