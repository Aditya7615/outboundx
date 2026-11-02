import type { PageInfo } from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ErrorBody {
  error?: { message?: string; details?: unknown };
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

async function request<T>(
  path: string,
  init: RequestInit,
  unwrap: boolean
): Promise<T> {
  const hasBody = init.body !== undefined;
  const response = await fetch(`/api${path}`, {
    credentials: "include",
    ...init,
    headers: {
      ...(hasBody && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...init.headers
    }
  });

  const body = (await parseBody(response)) as (T & { data?: T }) | ErrorBody | undefined;

  if (!response.ok) {
    const errorBody = body as ErrorBody | undefined;
    throw new ApiError(
      errorBody?.error?.message ?? `Request failed with status ${response.status}`,
      response.status,
      errorBody?.error?.details
    );
  }

  if (unwrap && body && typeof body === "object" && "data" in body) {
    return (body as { data: T }).data;
  }
  return body as T;
}

export function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return request<T>(path, init, true);
}

export function toQuery(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export interface PageResponse<T> {
  data: T[];
  pageInfo: PageInfo;
}

export async function apiRequestPage<T>(path: string): Promise<PageResponse<T>> {
  return request<PageResponse<T>>(path, {}, false);
}
