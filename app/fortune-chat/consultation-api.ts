"use client";
import { authFetch } from "@/app/_lib/auth-client";
import { getApiBaseUrl } from "@/app/_lib/api-config";
import type { FortuneRecord } from "@/app/yeongnyangi/_lib/api";

/** 연이·네오 상담 엔진(/api/fortune-chat/consultations) 클라이언트. 서버 계약은 worker/routes/fortune-chat-consultations.js. */
export type ChatPersona = "yeoni" | "neo";
export type ChatDomain = "saju" | "ziwei" | "sukuyo" | "vedic" | "astrology" | "tarot";
/** 타로는 명식 없이 고민의 종류로 읽는다. 서버 허용 목록은 worker/yeongnyangi/payments/catalog.ts 의 chatTarotKinds. */
export type ChatTarotKind = "choice" | "love" | "feelings" | "contact" | "reunion" | "career" | "money" | "healing";
/** `honey` 는 연이 기본 상담만 — 꿀방울 30개를 쓴다(worker/lib/honey-wallet.js FORTUNE_CHAT_HONEY_COST). */
export type ChatAccessChoice = "pass" | "checkout" | "honey" | "";

export type ChatConsultation = Omit<FortuneRecord, "accessMethod"> & {
  accessMethod?: string;
  persona: ChatPersona;
  paidFeatureKey: string;
  paymentRequestId: string;
  /** PER_USE 로 열린 상담의 증빙 종류(honey·payment …). 열린 상담 머리 배지에만 쓴다. */
  perUseSource?: string;
};

export type ChatConsultationSummary = {
  id: string;
  persona: ChatPersona;
  state: string;
  paid: boolean;
  /** PER_USE 로 열린 상담의 증빙 종류(honey·payment·pass …). 기록 배지에만 쓴다. */
  perUseSource?: string;
  domain: string;
  completedChapters: number;
  totalChapters: number;
  question: string;
  createdAt: string;
  completedAt?: string;
};

export type CreateConsultationInput = {
  persona: ChatPersona;
  domain: ChatDomain;
  /** 명식 운세에만 보낸다. 타로는 프로필 없이 읽는다. */
  profileId?: string;
  question: string;
  /** 타로에만 보낸다. 명식 운세는 늘 자유 질문(ask)이다. */
  tarotKind?: ChatTarotKind;
  consultationAttemptId: string;
};

export class ConsultationApiError extends Error {
  constructor(public code: string, message: string, public status: number, public retryable = false) {
    super(message);
  }
}

export const isConsultationId = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

async function call<T>(path: string, body?: object): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), body ? 100000 : 25000);
  try {
    const response = await authFetch(`/api/fortune-chat/consultations${path}`, {
      cache: "no-store",
      signal: controller.signal,
      ...(body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const code = payload?.error?.code || payload?.code || (response.status === 404 ? "NOT_FOUND" : "REQUEST_FAILED");
      const message = payload?.message || payload?.error?.message || "상담을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
      throw new ConsultationApiError(code, message, response.status, payload?.retryable ?? [429, 502, 503, 504].includes(response.status));
    }
    return payload as T;
  } catch (error) {
    if (error instanceof ConsultationApiError) throw error;
    if ((error as Error)?.name === "AbortError") throw new ConsultationApiError("REQUEST_TIMEOUT", "응답이 늦어지고 있어요. 같은 상담에서 다시 확인해 주세요.", 504, true);
    throw new ConsultationApiError("NETWORK_ERROR", "연결이 잠시 끊겼어요. 같은 상담에서 다시 확인해 주세요.", 0, true);
  } finally {
    clearTimeout(timer);
  }
}

type One = { ok: true; consultation: ChatConsultation };

export const consultationApi = {
  /**
   * 새 상담 열기 플래그. 로그인 없이 읽는 공개 값이라 authFetch 를 쓰지 않는다 — 비로그인 401 이
   * 토큰 갱신 실패 → logout 이벤트로 번지지 않게. 실패는 false(기존 상담방)로 닫는다.
   */
  status: async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/fortune-chat/consultations/status`, { cache: "no-store", signal: controller.signal });
      const payload = response.ok ? await response.json() : null;
      return payload?.enabled === true;
    } catch {
      return false;
    } finally {
      clearTimeout(timer);
    }
  },
  list: (persona: ChatPersona) => call<{ ok: true; enabled?: boolean; consultations: ChatConsultationSummary[] }>(`?persona=${persona}`),
  create: ({ tarotKind, ...input }: CreateConsultationInput) => call<One>("", {
    ...input,
    locale: "ko",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul",
    consultationKind: tarotKind || "ask",
    topicId: "general",
  }).then((r) => r.consultation),
  read: (id: string) => call<One>(`/${id}`).then((r) => r.consultation),
  /** 빈 선택(`""`)은 아무것도 쓰지 않는다 — 이미 있는 결제 증빙만 붙여 본다. */
  activate: (id: string, access: ChatAccessChoice) => call<One>(`/${id}/activate`, { access }).then((r) => r.consultation),
  generate: (id: string) => call<One>(`/${id}/generate`, {}).then((r) => r.consultation),
};

export type HoneyStatus = {
  balance: number;
  attended: boolean;
  attendanceCount: number;
  attendanceEvery: number;
  nextRewardIn: number;
};

/** 꿀방울 잔액·출석(/api/honey/attendance, worker/routes/prompt-hub.js). 실패는 null — 잔액은 보조 정보다. */
async function honeyCall(attend: boolean): Promise<HoneyStatus | null> {
  try {
    const response = await authFetch("/api/honey/attendance", {
      cache: "no-store",
      ...(attend ? { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" } : {}),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || data?.ok !== true || !Number.isFinite(Number(data.balance))) return null;
    // 다른 화면(프롬프트 허브 등)의 잔액 표시도 새로 읽게 알린다.
    if (attend) { try { localStorage.setItem("cd:honey-refresh", String(Date.now())); } catch { /* 보조 신호다. */ } }
    return data as HoneyStatus;
  } catch {
    return null;
  }
}

export const honeyApi = {
  status: () => honeyCall(false),
  attend: () => honeyCall(true),
};
