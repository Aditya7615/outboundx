import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodTypeAny, type z } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function parseInput<S extends ZodTypeAny>(schema: S, input: unknown): z.infer<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new HttpError(400, "Validation failed", result.error.flatten());
  }
  return result.data;
}

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { message: "Route not found" } });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      error: {
        message: error.message,
        ...(error.details ? { details: error.details } : {})
      }
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: { message: "Validation failed", details: error.flatten() }
    });
    return;
  }

  const prismaError = error as { code?: string; meta?: { target?: string[] } };
  if (prismaError?.code === "P2002") {
    res.status(409).json({
      error: {
        message: "A record with those details already exists",
        details: prismaError.meta?.target
      }
    });
    return;
  }

  if (prismaError?.code === "P2025") {
    res.status(404).json({ error: { message: "Record not found" } });
    return;
  }

  const uploadError = error as { code?: string; name?: string; message?: string };
  if (uploadError?.code === "LIMIT_FILE_SIZE") {
    res.status(413).json({ error: { message: "CSV file must be 5 MB or smaller" } });
    return;
  }
  if (uploadError?.name === "MulterError") {
    res.status(400).json({ error: { message: uploadError.message ?? "Invalid upload" } });
    return;
  }

  console.error("Unhandled error", error);
  res.status(500).json({ error: { message: "Internal server error" } });
}
