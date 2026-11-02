import type { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { parseInput } from "../middlewares/error";
import { loginSchema, registerSchema } from "../validation/schemas";
import { clearAuthCookie, setAuthCookie } from "../utils/cookies";
import { HttpError } from "../middlewares/error";

export const authController = {
  async register(req: Request, res: Response): Promise<void> {
    const input = parseInput(registerSchema, req.body);
    const result = await authService.register(input);
    setAuthCookie(res, result.token);
    res.status(201).json({ data: result });
  },

  async login(req: Request, res: Response): Promise<void> {
    const input = parseInput(loginSchema, req.body);
    const result = await authService.login(input);
    setAuthCookie(res, result.token);
    res.json({ data: result });
  },

  async logout(_req: Request, res: Response): Promise<void> {
    clearAuthCookie(res);
    res.status(204).send();
  },

  async me(req: Request, res: Response): Promise<void> {
    if (!req.user) throw new HttpError(401, "Authentication required");
    const user = await authService.getProfile(req.user.id);
    res.json({ data: { user } });
  }
};
