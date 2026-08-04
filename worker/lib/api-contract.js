export const API_SCHEMA_VERSION = "1";

export function requestIdFromRequest(request) {
  const incoming = String(request?.headers?.get("x-request-id") || request?.headers?.get("x-correlation-id") || request?.headers?.get("cf-ray") || "").trim();
  if (incoming) return incoming.slice(0, 120);
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `cd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildApiMeta({ generatedAt = new Date().toISOString(), stale = false, source = "db", expiresAt = null } = {}) {
  return {
    generatedAt,
    schemaVersion: API_SCHEMA_VERSION,
    stale: Boolean(stale),
    source: String(source || "unknown"),
    expiresAt: expiresAt || null,
  };
}

export function buildApiError({ code, retryable = false, message, requestId } = {}) {
  return {
    code: String(code || "INTERNAL_SERVER_ERROR"),
    retryable: Boolean(retryable),
    message: String(message || "요청을 처리하지 못했습니다."),
    ...(requestId ? { requestId: String(requestId).slice(0, 120) } : {}),
  };
}

export function retryableForStatus(status) {
  return status === 429 || status === 502 || status === 503 || status === 504;
}
