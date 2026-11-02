import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../middlewares/error";

export const healthRouter = Router();

healthRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ok", database: "connected", uptime: process.uptime() });
    } catch {
      res.status(503).json({ status: "degraded", database: "unavailable" });
    }
  })
);
