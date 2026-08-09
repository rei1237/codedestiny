// 관리자 CMS 전용 fetch 헬퍼.
// 인증은 기존 꽃 admin 토큰(x-admin-token) 방식을 그대로 쓴다 — 새 인증 체계를 만들지 않는다.
import { getApiBaseUrl } from "../../../_lib/api-config";

const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;
const LOCAL_ADMIN_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0"]);

export function getAdminApiBase(): string {
  return getApiBaseUrl() || "";
}

function isLocalAdminHost(hostname: string): boolean {
  return LOCAL_ADMIN_HOSTS.has(String(hostname || "").trim().toLowerCase());
}

/** 교차 출처에 쿠키를 실어 보내면 브라우저가 요청을 승격시켜 403 을 부른다 — 같은 출처일 때만 include. */
export function resolveAdminCredentials(apiBase: string): RequestCredentials {
  if (typeof window === "undefined") return "include";
  const base = String(apiBase || "").trim();
  if (!base) return "include";

  try {
    const target = new URL(base);
    const current = new URL(window.location.origin);
    if (target.origin === current.origin) return "include";
    if (isLocalAdminHost(target.hostname) && isLocalAdminHost(current.hostname)) return "include";
    return "omit";
  } catch {
    return "include";
  }
}

export function getFlowerAdminToken(): string {
  if (typeof window === "undefined") return "";

  try {
    const token = String(window.sessionStorage.getItem("flower_admin_token") || "").trim();
    if (FLOWER_ADMIN_TOKEN_RE.test(token)) return token;
  } catch {
    // 스토리지 접근이 막힌 환경(시크릿 모드 등).
  }

  return "";
}

export function clearAdminToken(): void {
  for (const key of ["flower_admin_token", "flower_admin_password_ok"]) {
    try { window.sessionStorage.removeItem(key); } catch { /* 무시 */ }
  }
}

export function redirectToAdminLogin(): void {
  clearAdminToken();
  const next = typeof window === "undefined"
    ? "/admin/cms"
    : `${window.location.pathname}${window.location.search}`;
  window.location.assign(`/admin/login?next=${encodeURIComponent(next)}`);
}

export class AdminApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code = "") {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.code = code;
  }
}

interface AdminFetchOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * 401/403 이면 로그인으로 되돌리고, 그 외 오류는 AdminApiError 로 올린다.
 * 503(DB 일시 장애)은 화면에서 "일시적 오류"로 안내할 수 있게 상태코드를 그대로 남긴다.
 */
export async function adminFetch<T = unknown>(path: string, options: AdminFetchOptions = {}): Promise<T> {
  const apiBase = getAdminApiBase();
  const headers: Record<string, string> = {};
  const token = getFlowerAdminToken();
  if (token) headers["x-admin-token"] = token;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${apiBase}${path}`, {
    method: options.method || "GET",
    credentials: resolveAdminCredentials(apiBase),
    headers,
    cache: "no-store",
    signal: options.signal,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401 || response.status === 403) {
    redirectToAdminLogin();
    throw new AdminApiError(response.status === 401 ? "로그인이 필요합니다." : "관리자 권한이 필요합니다.", response.status);
  }

  if (!response.ok) {
    throw new AdminApiError(
      String((data as { message?: string })?.message || "요청에 실패했습니다."),
      response.status,
      String((data as { code?: string })?.code || ""),
    );
  }

  return data as T;
}
