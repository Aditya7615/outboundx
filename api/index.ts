import type { IncomingMessage, ServerResponse } from "node:http";
import { app } from "../backend/src/app";

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  app(req as never, res as never);
}
