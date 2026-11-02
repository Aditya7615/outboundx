import { HttpError } from "../middlewares/error";

export function encodeCursor(id: number): string {
  return Buffer.from(`contact:${id}`, "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): number {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const [scope, rawId] = decoded.split(":");
    const id = Number(rawId);
    if (scope !== "contact" || !Number.isInteger(id) || id <= 0) {
      throw new Error("invalid cursor");
    }
    return id;
  } catch {
    throw new HttpError(400, "Invalid pagination cursor");
  }
}

export function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}
