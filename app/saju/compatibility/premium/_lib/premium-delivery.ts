// 사주 고급 궁합(saju-compat-premium) 전달 공용 모듈 — 입력 화면과 결과 화면이 같이 쓴다.
// 서버 계약: worker/routes/saju-compat-premium.js (prepare → generate 루프 → result, 무료 retry, refund-request).
// 🔴 생성은 요청 하나에 한 장(그룹)씩이다. 202(partial)면 같은 resumeSessionId 로 이어서 부른다.
// 🔴 완성본만 보여 준다 — 서버도 완성 전에는 본문을 싣지 않는다.
import { authFetch } from "@/app/_lib/auth-client";
import { isRetriableResultPollFailure } from "@/app/_lib/consultationResultPolling";

export const FEATURE_KEY = "saju-compat-premium";
export const FEATURE_REASON = "사주 고급 궁합";
export const FEATURE_COST = 100;
export const FEATURE_AMOUNT_KRW = 10000;
export const FEATURE_MEMBERSHIP_CREDIT_COST = 1000; // 월정석 = cost × 10 (billing-policy MEMBERSHIP_CREDIT_PER_COIN)
export const API_BASE = "/api/saju-compat-premium";
export const RESULT_PATH = "/saju/compatibility/premium/result/";
export const CHAPTER_TOTAL = 4;

export const LOGIN_REQUIRED_MESSAGE = "사주 고급 궁합을 보려면 로그인이 필요합니다.";
export const PAYMENT_CANCELLED_MESSAGE = "결제를 취소했어요. 준비가 되면 다시 시작해 주세요.";
export const PAYMENT_VERIFY_FAILED_MESSAGE = "결제 또는 이용권 확인을 마치지 못했어요. 결제 내역을 확인한 뒤 다시 시도해 주세요.";
export const SERVER_ERROR_MESSAGE = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
export const RETRY_MESSAGE = "궁합 풀이를 끝까지 쓰지 못했어요. 이미 쓴 장은 그대로 두고 빠진 장만 다시 써 드려요. 추가 결제·차감은 없어요.";
export const RETRY_LABEL = "다시 시도 · 추가 결제·차감 없음";
export const REFUND_LABEL = "다시 시도 대신 환불 요청";
export const STALLED_MESSAGE = "연결이 잠시 불안정해요. 쓴 장은 저장돼 있으니 잠시 뒤 이 화면에서 이어서 볼 수 있어요.";

export const RELATION_OPTIONS = [
  { value: "some", label: "썸·호감" },
  { value: "dating", label: "연애 중" },
  { value: "married", label: "결혼·배우자" },
  { value: "reunion", label: "재회 고민" },
  { value: "premarital", label: "결혼 전 확인" },
] as const;
export type RelationType = (typeof RELATION_OPTIONS)[number]["value"];

export type PremiumPerson = {
  name: string;
  gender: "male" | "female" | "";
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  calendarType: "solar" | "lunar";
  isLeapMonth: boolean;
};

export type PremiumInput = { self: PremiumPerson; partner: PremiumPerson; relationType: RelationType };

export type RetryOffer = { sessionId: string; refundAt: string };

export type PremiumChapter = { key: string; label: string; sections: Array<{ title: string; body: string }> };
export type PremiumResult = {
  summaryTitle?: string;
  oneLine?: string;
  keywords?: string[];
  chapters?: PremiumChapter[];
  actionTips?: string[];
  finalMessage?: string;
  temperamentCaution?: string;
  staticCards?: Record<string, unknown>;
};

export type SessionPayload = {
  ok?: boolean;
  reason?: string;
  message?: string;
  sessionId?: string;
  resumeSessionId?: string;
  status?: string;
  saved?: boolean;
  continue?: boolean;
  relationType?: string;
  progress?: { completed?: number; total?: number };
  result?: PremiumResult;
  refunded?: boolean;
  refundStatus?: string;
  retry?: { available?: boolean; refundAt?: string; sessionId?: string };
  retryable?: boolean;
  paymentPayload?: Record<string, unknown>;
  side?: string;
};

export function emptyPerson(): PremiumPerson {
  return { name: "", gender: "", birthDate: "", birthTime: "", birthTimeUnknown: false, calendarType: "solar", isLeapMonth: false };
}

// 사주 탭 무료 궁합 결과의 진입 카드가 남기는 한 번짜리 입력(js/saju-engine.js _SE_SAJU_COMPAT_PREMIUM_PREFILL_KEY).
// 🔴 개인정보라 URL 이 아니라 sessionStorage 로 받고, 읽자마자 지운다. 30분 지난 값·모양이 틀린 값은 버린다.
export const PREMIUM_PREFILL_KEY = "cd:sajuCompatPremium:prefill:v1";
const PREMIUM_PREFILL_TTL_MS = 30 * 60 * 1000;

function prefillPerson(raw: unknown): PremiumPerson {
  const base = emptyPerson();
  if (!raw || typeof raw !== "object") return base;
  const src = raw as Record<string, unknown>;
  const birthDate = typeof src.birthDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(src.birthDate) ? src.birthDate : "";
  const birthTime = typeof src.birthTime === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(src.birthTime) ? src.birthTime : "";
  const calendarType = src.calendarType === "lunar" ? "lunar" : "solar";
  return {
    name: typeof src.name === "string" ? src.name.trim().slice(0, 20) : "",
    gender: src.gender === "male" || src.gender === "female" ? src.gender : "",
    birthDate,
    birthTime,
    birthTimeUnknown: !birthTime && (src.birthTimeUnknown === true || Boolean(birthDate)),
    calendarType,
    isLeapMonth: calendarType === "lunar" && src.isLeapMonth === true,
  };
}

export function readPremiumPrefill(now = Date.now()): PremiumInput | null {
  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(PREMIUM_PREFILL_KEY);
    if (raw !== null) window.sessionStorage.removeItem(PREMIUM_PREFILL_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    if (!parsed || parsed.v !== 1 || !(now - Number(parsed.savedAt || 0) < PREMIUM_PREFILL_TTL_MS)) return null;
    const relationType = RELATION_OPTIONS.some((option) => option.value === parsed.relationType) ? (parsed.relationType as RelationType) : "dating";
    return { self: prefillPerson(parsed.self), partner: prefillPerson(parsed.partner), relationType };
  } catch {
    return null;
  }
}

export function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `scp-${crypto.randomUUID()}`;
  return `scp-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function toRequestPerson(person: PremiumPerson) {
  return {
    name: person.name.trim(),
    gender: person.gender,
    birthDate: person.birthDate,
    birthTime: person.birthTimeUnknown ? "" : person.birthTime,
    birthTimeUnknown: person.birthTimeUnknown || !person.birthTime,
    calendarType: person.calendarType,
    isLeapMonth: person.calendarType === "lunar" && person.isLeapMonth,
  };
}

export function buildInputPayload(input: PremiumInput) {
  return { self: toRequestPerson(input.self), partner: toRequestPerson(input.partner), relationType: input.relationType };
}

export async function postJson<T>(path: string, body: Record<string, unknown>, idempotencyKey?: string): Promise<{ response: Response; payload: T }> {
  const response = await authFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
    credentials: "include",
    body: JSON.stringify(idempotencyKey ? { ...body, idempotencyKey } : body),
  });
  const payload = await response.json().catch(() => ({})) as T;
  return { response, payload };
}

const asRecord = (value: unknown): Record<string, unknown> => (value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {});
const toText = (value: unknown) => (typeof value === "string" ? value.trim() : "");
export function readRetryOffer(payload: SessionPayload): RetryOffer | null {
  const sessionId = toText(payload.retry?.sessionId) || toText(payload.sessionId);
  return payload.retry?.available === true && sessionId ? { sessionId, refundAt: toText(payload.retry.refundAt) } : null;
}

export function refundNotice(payload: SessionPayload): string {
  if (payload.reason === "PAYMENT_REFUNDED" || payload.reason === "REFUND_PENDING" || payload.reason === "PAYMENT_REVOKED") {
    return payload.message || "이 궁합의 결제·이용 처리가 취소되었습니다. 결제 내역을 확인해 주세요.";
  }
  return "";
}

export function resultHref(sessionId: string) {
  return `${RESULT_PATH}?sid=${encodeURIComponent(sessionId)}`;
}

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export type GenerationOutcome =
  | { kind: "completed"; payload: SessionPayload }
  | { kind: "retry"; offer: RetryOffer; message: string }
  | { kind: "refund"; message: string }
  | { kind: "payment"; payload: SessionPayload }
  | { kind: "stalled"; sessionId: string; message: string }
  | { kind: "cancelled" }
  | { kind: "error"; message: string };

/**
 * /generate(또는 /retry) 를 완성까지 이어 부른다. 한 요청 = 한 장.
 * - first: 처음 보낼 경로·본문. 그 뒤로는 응답의 sessionId 로 `{ resumeSessionId }` 만 보낸다.
 * - 일시 장애는 같은 요청을 짧게 다시 보내고, 거듭되면 stalled 로 돌려 화면이 이어보기를 안내한다.
 */
export async function runPremiumGeneration(options: {
  first: { path: string; body: Record<string, unknown>; idempotencyKey?: string };
  isCurrent: () => boolean;
  onSession?: (sessionId: string) => void;
  onProgress?: (completed: number, total: number) => void;
  /** 처음 응답 하나만 받고 멈춘다(입력 화면이 결과 화면으로 넘기기 전에 상담을 만들 때). */
  stopAfterSession?: boolean;
}): Promise<GenerationOutcome> {
  let request = options.first;
  let sessionId = "";
  let transientFailures = 0;
  for (let wave = 0; wave < 18; wave += 1) {
    if (!options.isCurrent()) return { kind: "cancelled" };
    let response: Response;
    let payload: SessionPayload;
    try {
      ({ response, payload } = await postJson<SessionPayload>(request.path, request.body, request.idempotencyKey));
    } catch {
      if (!options.isCurrent()) return { kind: "cancelled" };
      if (++transientFailures > 2) return sessionId ? { kind: "stalled", sessionId, message: STALLED_MESSAGE } : { kind: "error", message: SERVER_ERROR_MESSAGE };
      await sleep(1500 * transientFailures);
      continue;
    }
    if (!options.isCurrent()) return { kind: "cancelled" };
    if (payload.sessionId) {
      sessionId = payload.sessionId;
      options.onSession?.(sessionId);
    }
    const offer = readRetryOffer(payload);
    if (offer) return { kind: "retry", offer, message: RETRY_MESSAGE };
    const refund = refundNotice(payload);
    if (refund) return { kind: "refund", message: refund };
    if (response.status === 401 || payload.reason === "LOGIN_REQUIRED") return { kind: "error", message: LOGIN_REQUIRED_MESSAGE };
    if (response.status === 402 || payload.reason === "PAYMENT_REQUIRED") return { kind: "payment", payload };
    if (!response.ok || payload.ok === false) {
      if (!isRetriableResultPollFailure(response.status, payload as Record<string, unknown>)) {
        return { kind: "error", message: payload.message || SERVER_ERROR_MESSAGE };
      }
      if (++transientFailures > 2) return sessionId ? { kind: "stalled", sessionId, message: STALLED_MESSAGE } : { kind: "error", message: payload.message || SERVER_ERROR_MESSAGE };
      await sleep(1500 * transientFailures);
      continue;
    }
    transientFailures = 0;
    options.onProgress?.(Number(payload.progress?.completed) || 0, Number(payload.progress?.total) || CHAPTER_TOTAL);
    if (payload.status === "completed" && payload.saved === true && payload.result) return { kind: "completed", payload };
    if (!sessionId) return { kind: "error", message: SERVER_ERROR_MESSAGE };
    if (options.stopAfterSession) return { kind: "stalled", sessionId, message: "" };
    // 다른 요청이 같은 상담을 쓰는 중(generating)이면 잠깐 기다렸다가 이어 부른다.
    if (payload.status === "generating" && payload.continue !== true) await sleep(3000);
    request = { path: `${API_BASE}/generate`, body: { resumeSessionId: sessionId } };
  }
  return sessionId ? { kind: "stalled", sessionId, message: STALLED_MESSAGE } : { kind: "error", message: SERVER_ERROR_MESSAGE };
}

export async function requestRetry(sessionId: string) {
  return postJson<SessionPayload>(`${API_BASE}/retry`, { sessionId });
}

export async function requestRefund(sessionId: string) {
  return postJson<SessionPayload>(`${API_BASE}/refund-request`, { sessionId });
}
