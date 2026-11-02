import type { Request, Response } from "express";
import { contactService } from "../services/contact.service";
import { HttpError, parseInput } from "../middlewares/error";
import {
  contactCreateSchema,
  contactListQuerySchema,
  contactUpdateSchema
} from "../validation/schemas";

function userId(req: Request): number {
  if (!req.user) throw new HttpError(401, "Authentication required");
  return req.user.id;
}

export const contactController = {
  async list(req: Request, res: Response): Promise<void> {
    const query = parseInput(contactListQuerySchema, req.query);
    const result = await contactService.list(userId(req), query);
    res.json({ data: result.data, pageInfo: result.pageInfo });
  },

  async stats(req: Request, res: Response): Promise<void> {
    const result = await contactService.count(userId(req));
    res.json({ data: result });
  },

  async audience(req: Request, res: Response): Promise<void> {
    const contacts = await contactService.audienceOptions(userId(req));
    res.json({ data: contacts });
  },

  async create(req: Request, res: Response): Promise<void> {
    const input = parseInput(contactCreateSchema, req.body);
    const contact = await contactService.create(userId(req), input);
    res.status(201).json({ data: contact });
  },

  async update(req: Request, res: Response): Promise<void> {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new HttpError(400, "Invalid contact id");
    const input = parseInput(contactUpdateSchema, req.body);
    const contact = await contactService.update(userId(req), id, input);
    res.json({ data: contact });
  },

  async remove(req: Request, res: Response): Promise<void> {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new HttpError(400, "Invalid contact id");
    await contactService.remove(userId(req), id);
    res.status(204).send();
  },

  async importCsv(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      throw new HttpError(400, "Attach a CSV file using the 'file' field");
    }
    const summary = await contactService.importCsv(userId(req), req.file.buffer);
    res.status(201).json({ data: summary });
  }
};
