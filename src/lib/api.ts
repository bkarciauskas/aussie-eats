import { z } from "zod";
import { Role } from "@/lib/roles";
import { clearSession, getAccessToken } from "@/lib/session";

export const API_BASE_URL = (process.env.API_BASE_URL ?? "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);

export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export const userPublicSchema = z.object({
  id: z.string().min(1),
  email: z.string().min(1),
  name: z.string(),
  role: z.enum([Role.CUSTOMER, Role.ADMIN]),
  isGuest: z.boolean().optional().default(false),
});

export type UserPublic = z.infer<typeof userPublicSchema>;

export const authResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().default("bearer"),
  user: userPublicSchema,
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

export const okResponseSchema = z.object({
  ok: z.boolean(),
});

export type OkResponse = z.infer<typeof okResponseSchema>;

const errorBodySchema = z.object({
  detail: z.union([
    z.string(),
    z.array(
      z.object({
        msg: z.string().optional(),
        message: z.string().optional(),
      }),
    ),
  ]),
});

export function formatApiDetail(payload: unknown, fallback: string): string {
  const parsed = errorBodySchema.safeParse(payload);
  if (!parsed.success) {
    return fallback;
  }
  const { detail } = parsed.data;
  if (typeof detail === "string") {
    return detail;
  }
  const messages = detail
    .map((item) => item.msg ?? item.message)
    .filter((msg): msg is string => Boolean(msg));
  return messages.length > 0 ? messages.join("; ") : fallback;
}

type ApiFetchOptions<TSchema extends z.ZodType> = {
  method?: string;
  body?: unknown;
  schema: TSchema;
  token?: string | null;
  headers?: HeadersInit;
  signal?: AbortSignal;
};

function buildUrl(path: string): string {
  if (!path.startsWith("/")) {
    throw new ApiError(500, "API path must start with '/'.");
  }
  return `${API_BASE_URL}${path}`;
}

export async function apiFetch<TSchema extends z.ZodType>(
  path: string,
  options: ApiFetchOptions<TSchema>,
): Promise<z.infer<TSchema>> {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(503, "Unable to reach the API. Is the FastAPI server running?");
  }

  const text = await response.text();
  let payload: unknown = undefined;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      formatApiDetail(payload, `Request failed with status ${response.status}`),
    );
  }

  const parsed = options.schema.safeParse(payload);
  if (!parsed.success) {
    throw new ApiError(502, "API returned an unexpected response shape.");
  }
  return parsed.data;
}

type ApiFetchAuthedOptions<TSchema extends z.ZodType> = Omit<ApiFetchOptions<TSchema>, "token"> & {
  /** Defaults to iron-session JWT; override in tests. */
  getToken?: () => Promise<string | null>;
  /** Defaults to clearing the session cookie; override in tests. */
  onUnauthorized?: () => Promise<void>;
};

/** Authenticated fetch: reads JWT from iron-session and sends Authorization: Bearer. */
export async function apiFetchAuthed<TSchema extends z.ZodType>(
  path: string,
  options: ApiFetchAuthedOptions<TSchema>,
): Promise<z.infer<TSchema>> {
  const getToken = options.getToken ?? getAccessToken;
  const onUnauthorized = options.onUnauthorized ?? clearSession;
  const token = await getToken();
  if (!token) {
    throw new ApiError(401, "Not authenticated");
  }

  try {
    return await apiFetch(path, { ...options, token });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      await onUnauthorized();
    }
    throw err;
  }
}
