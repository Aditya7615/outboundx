import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import type { AuthUser } from "../models/types";

interface TokenPayload {
  sub: string;
  email: string;
  name: string;
}

export function signToken(user: AuthUser): string {
  const payload: TokenPayload = {
    sub: String(user.id),
    email: user.email,
    name: user.name
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"]
  });
}

export function verifyToken(token: string): AuthUser {
  const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  return {
    id: Number(decoded.sub),
    email: decoded.email,
    name: decoded.name
  };
}
