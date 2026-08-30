// 관리자 CMS 전용 fetch 헬퍼.
// 인증은 기존 꽃 admin 토큰(x-admin-token) 방식을 그대로 쓴다 — 새 인증 체계를 만들지 않는다.
import { getApiBaseUrl } from "../../_lib/api-config";
import { normalizeAppPathname } from "@/app/app/_lib/app-route";

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

/** 로그인 화면 경로. 정규화한 pathname 과 비교하므로 후행 슬래시를 붙이지 않는다. */
const ADMIN_LOGIN_PATH = "/admin/login";

export function clearAdminToken(): void {
  for (const key of ["flower_admin_token", "flower_admin_password_ok"]) {
    try { window.sessionStorage.removeItem(key); } catch { /* 무시 */ }
  }
}

export function redirectToAdminLogin(): void {
  clearAdminToken();
  if (typeof window === "undefined") return;
  // 🔴 이미 로그인 화면이면 이동하지 않는다. trailingSlash:true 라 /admin/login 요청은 308 로
  //    /admin/login/ 이 되므로, 자기 자신으로 다시 보내면 브라우저가 그 사이를 무한 왕복한다.
  const here = normalizeAppPathname(window.location.pathname);
  if (here === ADMIN_LOGIN_PATH) return;
  const next = `${here}${window.location.search}`;
  window.location.assign(`${ADMIN_LOGIN_PATH}?next=${encodeURIComponent(next)}`);
}

/** 워커 503 봉투에서 건져 올리는 진단 정보. 어느 것도 없을 수 있다. */
export interface AdminErrorMeta {
  /** 503 의 실제 구분자. 본문 error.code 또는 errorDetails.reason. 본문 code 는 둘 다 SERVICE_UNAVAILABLE 이라 못 쓴다. */
  reason?: string;
  /** X-CD-Error-Stage: db | db-op-timeout | db-op-admission | auth | route */
  stage?: string;
  requestId?: string;
  retryAfterMs?: number;
  retryable?: boolean;
}

export class AdminApiError extends Error {
  status: number;
  code: string;
  reason: string;
  stage: string;
  requestId: string;
  retryAfterMs: number;
  retryable: boolean;

  constructor(message: string, status: number, code = "", meta: AdminErrorMeta = {}) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.code = code;
    this.reason = String(meta.reason || "");
    this.stage = String(meta.stage || "");
    this.requestId = String(meta.requestId || "");
    this.retryAfterMs = Number(meta.retryAfterMs || 0);
    this.retryable = meta.retryable === true;
  }
}

interface AdminFetchOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  /** 503/504 를 1회만 자동 재시도. GET/HEAD 가 아니면 무시된다. 기본 true. */
  retry?: boolean;
}

const RETRY_DELAY_MIN_MS = 400;
const RETRY_DELAY_MAX_MS = 3000;
const RETRY_DELAY_FALLBACK_MS = 1200;

function clampRetryDelay(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return RETRY_DELAY_FALLBACK_MS;
  return Math.min(RETRY_DELAY_MAX_MS, Math.max(RETRY_DELAY_MIN_MS, Math.round(value)));
}

/** 대기 중 abort 되면 즉시 던진다 — 화면을 떠난 뒤 재시도가 나가는 것을 막는다. */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function readErrorMeta(response: Response, data: Record<string, unknown>): AdminErrorMeta {
  const errorNode = (data?.error || {}) as Record<string, unknown>;
  const detailsNode = (data?.errorDetails || {}) as Record<string, unknown>;

  const headerRequestId = response.headers.get("X-Request-ID") || "";
  const retryAfterSec = Number(response.headers.get("Retry-After") || 0);

  return {
    reason: String(errorNode.code || detailsNode.reason || ""),
    stage: response.headers.get("X-CD-Error-Stage") || "",
    // 워커는 requestId 를 못 구하면 헤더에 문자열 "unknown" 을 넣는다 — 그건 정보가 아니므로 버린다.
    requestId: String(data?.requestId || errorNode.requestId || (headerRequestId === "unknown" ? "" : headerRequestId) || ""),
    retryAfterMs: retryAfterSec > 0 ? retryAfterSec * 1000 : 0,
    retryable: typeof errorNode.retryable === "boolean"
      ? (errorNode.retryable as boolean)
      : [429, 500, 502, 503, 504].includes(response.status),
  };
}

function isRetriableGet(method: string, status: number): boolean {
  if (method !== "GET" && method !== "HEAD") return false;
  // 429 는 재시도하지 않는다 — 서버가 명시적으로 멈추라는 뜻이라 즉시 재시도는 악순환을 만든다.
  // 500 도 하지 않는다 — 결정론적 버그라 재시도는 부하만 두 배가 된다.
  return status === 503 || status === 504;
}

/**
 * 401/403 이면 로그인으로 되돌리고, 그 외 오류는 AdminApiError 로 올린다.
 * 503(DB 일시 장애)은 화면에서 "일시적 오류"로 안내할 수 있게 상태코드·단계·요청ID를 그대로 남긴다.
 *
 * 🔴 GET/HEAD 만 1회 자동 재시도한다. 서버가 이미 재시도하는데 왜 또 하냐면 — worker/lib/db.js:1004-1007
 * 이 실측으로 문서화한 대로, 예산에서 죽은 요청이 남긴 커넥션 리셋의 **수혜자는 구조적으로 다음 요청**
 * 이고 관리자 경로에서 그 "다음 요청"이 될 수 있는 것은 클라이언트뿐이다. 두 번째 재시도는 새 정보가
 * 없으므로 넣지 않고, **변경 요청은 어떤 경우에도 자동 재시도하지 않는다**(환불·월정석 지급이 이 경로에 있다).
 * 페이지에서 이 위에 재시도 루프를 또 얹지 말 것 — 그건 진짜 중첩이다.
 */
export async function adminFetchResponse(pathOrUrl: string, options: AdminFetchOptions = {}): Promise<Response> {
  const apiBase = getAdminApiBase();
  const isAbsolute = /^https?:\/\//i.test(pathOrUrl);
  const url = isAbsolute ? pathOrUrl : `${apiBase}${pathOrUrl}`;
  const method = (options.method || "GET").toUpperCase();

  const headers: Record<string, string> = {};
  const token = getFlowerAdminToken();
  if (token) headers["x-admin-token"] = token;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const init: RequestInit = {
    method,
    credentials: resolveAdminCredentials(apiBase),
    headers,
    cache: "no-store",
    signal: options.signal,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  };

  const allowRetry = options.retry !== false && (method === "GET" || method === "HEAD");

  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (networkError) {
    if (!allowRetry || (networkError as Error)?.name === "AbortError") throw networkError;
    await delay(RETRY_DELAY_FALLBACK_MS, options.signal);
    return await fetch(url, init);
  }

  if (allowRetry && isRetriableGet(method, response.status)) {
    const retryAfterSec = Number(response.headers.get("Retry-After") || 0);
    await delay(clampRetryDelay(retryAfterSec > 0 ? retryAfterSec * 1000 : 0), options.signal);
    return await fetch(url, init);
  }

  return response;
}

export async function adminFetch<T = unknown>(path: string, options: AdminFetchOptions = {}): Promise<T> {
  const response = await adminFetchResponse(path, options);
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;

  if (response.status === 401 || response.status === 403) {
    redirectToAdminLogin();
    throw new AdminApiError(response.status === 401 ? "로그인이 필요합니다." : "관리자 권한이 필요합니다.", response.status);
  }

  if (!response.ok) {
    throw new AdminApiError(
      String((data as { message?: string })?.message || "요청에 실패했습니다."),
      response.status,
      String((data as { code?: string })?.code || ""),
      readErrorMeta(response, data),
    );
  }

  return data as T;
}

/** 화면이 그대로 렌더할 수 있는 형태로 정리한 오류. */
export interface AdminErrorView {
  /** 화면에 띄우는 한 문장. 항상 한국어. */
  message: string;
  /** 재시도 버튼을 보여도 되는가. 되돌릴 수 없는 변경이면 호출부가 무시한다. */
  retryable: boolean;
  /** "요청 ID abc123 · 단계 db-op-timeout" — 관리자가 그대로 복사해 문의에 붙일 수 있는 꼬리표. 없으면 "". */
  diagnostic: string;
}

const KOREAN_PATTERN = /[가-힣]/;

function buildDiagnostic(error: AdminApiError): string {
  const parts: string[] = [];
  if (error.requestId) parts.push(`요청 ID ${error.requestId}`);
  if (error.stage) parts.push(`단계 ${error.stage}`);
  return parts.join(" · ");
}

/**
 * 워커 오류를 화면용 한국어 안내로 바꾼다.
 *
 * 🔴 마지막 분기가 핵심이다 — 워커는 검증 오류에 이미 쓸모 있는 한국어를 준다
 * (예: "status는 new / in_progress / … 중 하나여야 합니다."). 전부 fallback 으로 갈아치우면 그게 사라지므로,
 * 한글이 들어 있으면 서버 문구를 그대로 쓰고 영문 내부 문자열일 때만 fallback 으로 바꾼다.
 *
 * @param fallback 화면별 한국어 한 문장. 예: "리뷰 목록을 불러오지 못했습니다."
 */
export function describeAdminError(caught: unknown, fallback: string): AdminErrorView {
  if (!(caught instanceof AdminApiError)) {
    return { message: `${fallback} 네트워크 연결을 확인해 주세요.`, retryable: true, diagnostic: "" };
  }

  const diagnostic = buildDiagnostic(caught);
  const view = (message: string, retryable = caught.retryable): AdminErrorView => ({ message, retryable, diagnostic });

  if (caught.status === 401) return view("로그인이 필요합니다. 로그인 화면으로 이동합니다.", false);
  if (caught.status === 403) return view("관리자 권한이 필요합니다.", false);

  if (caught.status === 503) {
    // 설정 오류는 재시도해도 절대 복구되지 않는다 — 버튼을 주면 관리자가 헛되이 누르게 된다.
    if (caught.reason === "DATABASE_CONFIG_INVALID" || caught.reason === "CONFIG_ERROR") {
      return view("데이터베이스 설정에 문제가 있습니다. 재시도해도 복구되지 않으니 워커 설정을 확인해 주세요.", false);
    }
    if (caught.stage === "db-op-admission") {
      return view("요청이 한꺼번에 몰려 잠시 처리되지 못했습니다. 잠시 후 다시 시도해 주세요.", true);
    }
    if (caught.stage === "db-op-timeout") {
      return view("데이터베이스 응답이 늦어 요청이 끊겼습니다. 잠시 후 다시 시도해 주세요.", true);
    }
    return view("데이터베이스가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해 주세요.", true);
  }

  if (caught.status === 502 || caught.status === 504) {
    return view("서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.", true);
  }
  if (caught.status === 429) {
    return view("요청이 너무 잦습니다. 잠시 후 다시 시도해 주세요.", true);
  }
  if (caught.status === 409) {
    return view("다른 곳에서 먼저 바뀐 내용이 있습니다. 새로고침한 뒤 다시 시도해 주세요.", false);
  }
  if (caught.status >= 500) {
    return view("서버에서 처리 중 오류가 났습니다. 잠시 후 다시 시도해 주세요.", true);
  }

  return view(KOREAN_PATTERN.test(caught.message) ? caught.message : fallback, false);
}
