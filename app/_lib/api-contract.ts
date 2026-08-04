export type ApiMeta = {
  generatedAt?: string;
  schemaVersion?: string | number;
  stale?: boolean;
  source?: string;
  expiresAt?: string | null;
};

export type ApiError = {
  status: number | null;
  code: string;
  retryable: boolean;
  requestId?: string;
  message: string;
};

export type ApiSuccess<T> = {
  ok: true;
  data: T;
  meta?: ApiMeta;
  requestId?: string;
};

export type ApiFailure = {
  ok: false;
  error?: {
    code?: string;
    retryable?: boolean;
    message?: string;
  };
  code?: string;
  message?: string;
  requestId?: string;
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isRetryableReadStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

export function retryAfterMs(response: Response, capMs = 5_000): number | null {
  const raw = response.headers.get("Retry-After");
  if (!raw) return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds)) return Math.max(0, Math.min(capMs, Math.floor(seconds * 1_000)));
  const dateMs = Date.parse(raw);
  if (!Number.isFinite(dateMs)) return null;
  return Math.max(0, Math.min(capMs, dateMs - Date.now()));
}

export function normalizeApiError(
  response: Response,
  payload: unknown,
  fallbackMessage = "요청을 처리하지 못했습니다.",
): ApiError {
  const body = isRecord(payload) ? payload : {};
  const nested = isRecord(body.error) ? body.error : {};
  const code = String(nested.code || body.code || `HTTP_${response.status || "NETWORK"}`).trim();
  const retryable = typeof nested.retryable === "boolean"
    ? nested.retryable
    : isRetryableReadStatus(response.status);
  const message = String(nested.message || body.message || fallbackMessage).trim() || fallbackMessage;
  return {
    status: Number.isFinite(response.status) ? response.status : null,
    code,
    retryable,
    requestId: String(body.requestId || response.headers.get("X-Request-ID") || "").trim() || undefined,
    message,
  };
}

export async function readJsonSafely(response: Response): Promise<unknown> {
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("json")) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}
