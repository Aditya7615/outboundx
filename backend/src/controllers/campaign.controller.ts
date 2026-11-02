import type { Request, Response } from "express";
import { campaignService } from "../services/campaign.service";
import { HttpError, parseInput } from "../middlewares/error";
import {
  campaignCreateSchema,
  campaignListQuerySchema,
  campaignUpdateSchema,
  logListQuerySchema
} from "../validation/schemas";

function userId(req: Request): number {
  if (!req.user) throw new HttpError(401, "Authentication required");
  return req.user.id;
}

function campaignId(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "Invalid campaign id");
  return id;
}

export const campaignController = {
  async list(req: Request, res: Response): Promise<void> {
    const { status } = parseInput(campaignListQuerySchema, req.query);
    const campaigns = await campaignService.list(userId(req), status);
    res.json({ data: campaigns });
  },

  async get(req: Request, res: Response): Promise<void> {
    const campaign = await campaignService.getById(userId(req), campaignId(req));
    res.json({ data: campaign });
  },

  async create(req: Request, res: Response): Promise<void> {
    const input = parseInput(campaignCreateSchema, req.body);
    const campaign = await campaignService.create(userId(req), input);
    res.status(201).json({ data: campaign });
  },

  async update(req: Request, res: Response): Promise<void> {
    const input = parseInput(campaignUpdateSchema, req.body);
    const campaign = await campaignService.update(userId(req), campaignId(req), input);
    res.json({ data: campaign });
  },

  async remove(req: Request, res: Response): Promise<void> {
    await campaignService.remove(userId(req), campaignId(req));
    res.status(204).send();
  },

  async dispatch(req: Request, res: Response): Promise<void> {
    const result = await campaignService.dispatch(userId(req), campaignId(req));
    res.json({ data: result });
  },

  async logs(req: Request, res: Response): Promise<void> {
    const query = parseInput(logListQuerySchema, req.query);
    const result = await campaignService.getLogs(userId(req), campaignId(req), query);
    res.json({ data: result.data, pageInfo: result.pageInfo });
  }
};
