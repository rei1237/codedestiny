"use client";
import { authFetch } from "@/app/_lib/auth-client";
import type { FortuneRecord } from "@/app/yeongnyangi/_lib/api";

/** 연이·네오 상담 엔진(/api/fortune-chat/consultations) 클라이언트. 서버 계약은 worker/routes/fortune-chat-consultations.js. */
export type ChatPersona = "yeoni" | "neo";
export type ChatDomain = "saju" | "ziwei" | "sukuyo" | "vedic" | "astrology";
export type ChatAccessChoice = "free_trial" | "pass" | "checkout" | "";

export type ChatConsultation = Omit<FortuneRecord, "accessMethod"> & {
  accessMethod?: string;
  persona: ChatPersona;
  paidFeatureKey: string;
  paymentRequestId: string;
  freeTrialAvailable?: boolean;
};

export type ChatConsultationSummary = {
  id: string;
  persona: ChatPersona;
  state: string;
  paid: boolean;
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
  profileId: string;
  question: string;
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
  list: (persona: ChatPersona) => call<{ ok: true; enabled?: boolean; consultations: ChatConsultationSummary[] }>(`?persona=${persona}`),
  create: (input: CreateConsultationInput) => call<One>("", {
    ...input,
    locale: "ko",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Seoul",
    consultationKind: "ask",
    topicId: "general",
  }).then((r) => r.consultation),
  read: (id: string) => call<One>(`/${id}`).then((r) => r.consultation),
  /** 빈 선택(`""`)은 아무것도 쓰지 않는다 — 이미 있는 결제 증빙만 붙여 본다. */
  activate: (id: string, access: ChatAccessChoice) => call<One>(`/${id}/activate`, { access }).then((r) => r.consultation),
  generate: (id: string) => call<One>(`/${id}/generate`, {}).then((r) => r.consultation),
};
