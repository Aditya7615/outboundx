import type { NextFunction, Request, Response } from "express";
import { HttpError } from "./error";
import { verifyToken } from "../utils/jwt";
import { COOKIE_NAME } from "../utils/cookies";

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const header = req.headers.authorization;
    const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    const token = bearer ?? (req.cookies?.[COOKIE_NAME] as string | undefined);

    if (!token) {
      throw new HttpError(401, "Authentication required");
    }

    req.user = verifyToken(token);
    next();
  } catch (error) {
    if (error instanceof HttpError) {
      next(error);
      return;
    }
    next(new HttpError(401, "Invalid or expired session"));
  }
}

export function attachUser(req: Request, _res: Response, next: NextFunction): void {
  try {
    const header = req.headers.authorization;
    const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    const token = bearer ?? (req.cookies?.[COOKIE_NAME] as string | undefined);
    if (token) {
      req.user = verifyToken(token);
    }
  } catch {
    req.user = undefined;
  }
  next();
}
