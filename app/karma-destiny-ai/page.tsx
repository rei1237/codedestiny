"use client";

import { CalendarDays, Clock3, Loader2, MapPin, Moon, Send, Sparkles, WalletCards } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { openPaidFeatureGate, runBillingCoinGate } from "@/app/_lib/billing-client";

type AccessType = "pass" | "paid" | "subscription" | "admin";
type CalendarType = "solar" | "lunar";
type GenderType = "male" | "female" | "unknown" | "";
type FocusAreaType = "overall" | "love" | "money" | "career" | "relationship" | "family" | "lifePattern" | "spirituality" | "custom";
type FlowStatus = "idle" | "preparing" | "payment" | "reading" | "ready" | "error";

type BirthPlace = {
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  timezone: string;
};

type ConsultationForm = {
  name: string;
  gender: GenderType;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  calendarType: CalendarType;
  birthPlace: BirthPlace;
  focusArea: FocusAreaType;
  question: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

type SummaryCards = {
  keywords?: string[];
  repeatingPattern?: string;
  currentTask?: string;
};

type IntegratedResult = {
  saju?: Record<string, unknown> | null;
  westernAstrology?: Record<string, unknown> | null;
  vedicAstrology?: Record<string, unknown> | null;
  synthesis?: Record<string, unknown> | null;
};

type BillingGatePayload = {
  featureKey?: string;
  runtimeGate?: Record<string, unknown>;
  reason?: string;
  requestId?: string;
  idempotencyKey?: string;
  cost?: number;
  coinPrice?: number;
  amountKRW?: number;
  paymentAmount?: number;
  totalAmount?: number;
  membershipCreditCost?: number;
};

type EnsureAccessResult =
  | { ok: true; accessToken: string; accessType: AccessType }
  | { ok: false; reason: "PAYMENT_REQUIRED"; message?: string; paymentPayload: BillingGatePayload }
  | { ok: false; reason: "LOGIN_REQUIRED"; message?: string }
  | { ok: false; reason: "INVALID_INPUT"; message: string }
  | { ok: false; reason?: string; message?: string };

type ConsultationResult = {
  ok: boolean;
  sessionId?: string;
  accessType?: AccessType;
  status?: string;
  integratedResult?: IntegratedResult | null;
  summaryCards?: SummaryCards | null;
  messages?: ChatMessage[];
  reason?: string;
  message?: string;
};

const FEATURE_KEY = "karma-destiny-ai-consultation";
const FEATURE_REASON = "운명의 업 AI 상담";
const FEATURE_COST = 500;
const FEATURE_AMOUNT_KRW = 50000;
const LOGIN_REQUIRED_MESSAGE = "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.";
const PAYMENT_REQUIRED_MESSAGE = "운명의 업 AI 상담 이용권이 필요합니다. 결제창을 열어드릴게요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.";
const SERVER_ERROR_MESSAGE = "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.";
const LLM_ERROR_MESSAGE = "AI 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동으로 복구됩니다.";
const REQUIRED_INPUT_MESSAGE = "운명의 업 상담에 필요한 정보가 부족해요. 생년월일, 성별, 출생시간 정보를 다시 확인해 주세요.";
const BIRTH_TIME_REQUIRED_MESSAGE = "운명의 업 상담은 출생시간에 따라 해석의 깊이가 달라져요. 출생시간을 입력하거나 ‘출생시간 모름’을 선택해 주세요.";
const CUSTOM_QUESTION_REQUIRED_MESSAGE = "직접 질문을 선택했다면 지금 가장 궁금한 내용을 짧게 적어 주세요.";
const NETWORK_ERROR_MESSAGE = "연결이 불안정해요. 잠시 후 다시 시도해 주세요.";

const FOCUS_AREA_OPTIONS: Array<{ value: FocusAreaType; label: string }> = [
  { value: "overall", label: "전체 운명의 업" },
  { value: "lifePattern", label: "반복되는 인생 패턴" },
  { value: "love", label: "사랑과 이별의 업" },
  { value: "money", label: "돈에서 반복되는 흐름" },
  { value: "career", label: "일과 사명의 방향" },
  { value: "relationship", label: "관계에서 반복되는 감정" },
  { value: "family", label: "가족과 인연의 업" },
  { value: "spirituality", label: "내면과 영혼의 성장" },
  { value: "custom", label: "직접 질문" },
];

const PLACE_PRESETS = [
  { label: "서울, 대한민국", city: "Seoul", country: "South Korea", latitude: "37.5665", longitude: "126.9780", timezone: "Asia/Seoul" },
  { label: "부산, 대한민국", city: "Busan", country: "South Korea", latitude: "35.1796", longitude: "129.0756", timezone: "Asia/Seoul" },
  { label: "도쿄, 일본", city: "Tokyo", country: "Japan", latitude: "35.6762", longitude: "139.6503", timezone: "Asia/Tokyo" },
  { label: "뉴욕, 미국", city: "New York", country: "United States", latitude: "40.7128", longitude: "-74.0060", timezone: "America/New_York" },
  { label: "로스앤젤레스, 미국", city: "Los Angeles", country: "United States", latitude: "34.0522", longitude: "-118.2437", timezone: "America/Los_Angeles" },
  { label: "런던, 영국", city: "London", country: "United Kingdom", latitude: "51.5072", longitude: "-0.1276", timezone: "Europe/London" },
  { label: "파리, 프랑스", city: "Paris", country: "France", latitude: "48.8566", longitude: "2.3522", timezone: "Europe/Paris" },
];

const defaultForm = (): ConsultationForm => ({
  name: "",
  gender: "",
  birthDate: "",
  birthTime: "",
  birthTimeUnknown: false,
  calendarType: "solar",
  birthPlace: {
    city: "Seoul",
    country: "South Korea",
    latitude: "37.5665",
    longitude: "126.9780",
    timezone: "Asia/Seoul",
  },
  focusArea: "overall",
  question: "",
});

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `kdai-${crypto.randomUUID()}`;
  return `kdai-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function toNumberOrUndefined(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function buildConsultationPayload(form: ConsultationForm) {
  const latitude = toNumberOrUndefined(form.birthPlace.latitude);
  const longitude = toNumberOrUndefined(form.birthPlace.longitude);
  const birthPlace = {
    city: form.birthPlace.city.trim(),
    country: form.birthPlace.country.trim(),
    latitude,
    longitude,
    timezone: form.birthPlace.timezone.trim(),
  };
  return {
    serviceType: "karma-ai-consultation",
    consultationType: "destinyKarma",
    userName: form.name.trim(),
    gender: form.gender,
    birthDate: form.birthDate,
    birthTime: form.birthTimeUnknown ? "" : form.birthTime,
    birthTimeUnknown: form.birthTimeUnknown,
    calendarType: form.calendarType,
    birthPlace,
    latitude,
    longitude,
    timezone: birthPlace.timezone,
    focusArea: form.focusArea,
    question: form.question.trim(),
    locale: "ko",
    birthInfo: {
      name: form.name.trim(),
      gender: form.gender,
      birthDate: form.birthDate,
      birthTime: form.birthTimeUnknown ? "" : form.birthTime,
      birthTimeUnknown: form.birthTimeUnknown,
      calendarType: form.calendarType,
      birthPlace,
    },
  };
}

function validateConsultationForm(form: ConsultationForm) {
  if (!form.birthDate || !form.gender || !form.calendarType) return REQUIRED_INPUT_MESSAGE;
  if (!form.birthTimeUnknown && !form.birthTime) return BIRTH_TIME_REQUIRED_MESSAGE;
  if (form.focusArea === "custom" && form.question.trim().length < 2) return CUSTOM_QUESTION_REQUIRED_MESSAGE;
  return "";
}

async function postJson<T>(path: string, body: Record<string, unknown>, idempotencyKey?: string): Promise<{ response: Response; payload: T }> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    credentials: "include",
    body: JSON.stringify(idempotencyKey ? { ...body, idempotencyKey } : body),
  });
  const payload = await response.json().catch(() => ({})) as T;
  return { response, payload };
}

function summarizeSystem(result: IntegratedResult | null | undefined, key: "saju" | "westernAstrology" | "vedicAstrology") {
  const source = result?.[key] || {};
  if (!source || typeof source !== "object") return "입력된 정보 기준으로 큰 흐름을 살핍니다.";
  const summary = String((source as Record<string, unknown>).patternSummary || "").trim();
  if (summary) return summary;
  if (key === "saju") return "일간과 오행의 균형으로 반복되는 선택 습관을 살핍니다.";
  if (key === "westernAstrology") return "태양과 달의 흐름으로 마음의 반복 방식을 살핍니다.";
  return "라후와 케투의 축으로 익숙한 습관과 성장 방향을 살핍니다.";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toText(value: unknown) {
  return String(value || "").trim();
}

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function maskBirthDate(value: string) {
  const match = value.match(/^(\d{4})-/);
  return match ? `${match[1]}-**-**` : "";
}

function buildBillingGateInput(paymentPayload: BillingGatePayload, idempotencyKey: string) {
  const runtimeGate = asRecord(paymentPayload.runtimeGate);
  return {
    categoryKey: toText(runtimeGate.categoryKey || "premium-consultation"),
    subFeatureKey: toText(runtimeGate.subFeatureKey || FEATURE_KEY),
    featureKey: toText(runtimeGate.featureKey || paymentPayload.featureKey) || FEATURE_KEY,
    reason: toText(runtimeGate.reason || paymentPayload.reason) || FEATURE_REASON,
    productId: toText(runtimeGate.productId || "karma-destiny-ai"),
    productType: toText(runtimeGate.productType || "karma-destiny-ai"),
    serviceType: toText(runtimeGate.serviceType || "karma-ai-consultation"),
    requestId: idempotencyKey,
    idempotencyKey,
    forceDeduct: true,
    deferUsage: true,
    usagePolicy: "apply_after_success",
    cost: toNumber(runtimeGate.cost ?? paymentPayload.cost ?? paymentPayload.coinPrice, FEATURE_COST),
    coinPrice: toNumber(runtimeGate.coinPrice ?? paymentPayload.coinPrice ?? paymentPayload.cost, FEATURE_COST),
    amountKRW: toNumber(runtimeGate.amountKRW ?? paymentPayload.amountKRW ?? paymentPayload.paymentAmount ?? paymentPayload.totalAmount, FEATURE_AMOUNT_KRW),
    membershipCreditCost: toNumber(runtimeGate.membershipCreditCost ?? paymentPayload.membershipCreditCost ?? paymentPayload.cost, FEATURE_COST),
  };
}

function splitAssistantSections(content: string) {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const chunks = normalized.split(/\n{2,}/).map((chunk) => chunk.trim()).filter(Boolean);
  return chunks.map((chunk, index) => {
    const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
    const first = lines[0] || "";
    const headingMatch = first.match(/^(?:#{1,3}\s*)?(?:\d+[.)]\s*)?(.{2,42}?)(?:[:：])?$/);
    const hasHeading = Boolean(headingMatch && lines.length > 1 && first.length <= 44);
    return {
      title: hasHeading ? headingMatch?.[1]?.replace(/\*\*/g, "").trim() || `운명의 답장 ${index + 1}` : `운명의 답장 ${index + 1}`,
      body: hasHeading ? lines.slice(1).join("\n") : chunk,
    };
  });
}

function AssistantMessageContent({ content }: { content: string }) {
  const sections = splitAssistantSections(content);
  if (!sections.length) return <p>{content}</p>;
  return (
    <div className="kdai-section-list">
      {sections.map((section, index) => (
        <section className="kdai-result-section" key={`${section.title}-${index}`}>
          <h3>{section.title}</h3>
          <p>{section.body}</p>
        </section>
      ))}
    </div>
  );
}

export default function KarmaDestinyAiPage() {
  const [form, setForm] = useState<ConsultationForm>(() => defaultForm());
  const [status, setStatus] = useState<FlowStatus>("idle");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [accessType, setAccessType] = useState<AccessType | "">("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [summaryCards, setSummaryCards] = useState<SummaryCards | null>(null);
  const [integratedResult, setIntegratedResult] = useState<IntegratedResult | null>(null);
  const [followUp, setFollowUp] = useState("");
  const [sending, setSending] = useState(false);
  const startLockRef = useRef(false);
  const idempotencyKeyRef = useRef(createIdempotencyKey());

  useEffect(() => {
    console.info("[Karma AI Page Enter]", { route: "/karma-destiny-ai" });
    console.info("[Karma AI Route Matched]", { route: "/karma-destiny-ai" });
    console.info("[Karma AI Initial Render Success]", { route: "/karma-destiny-ai", serviceType: "karma-ai-consultation" });
  }, []);

  const statusText = useMemo(() => {
    if (status === "preparing") return "운명의 기록을 펼치고 있습니다";
    if (status === "payment") return "결제창을 확인해 주세요";
    if (status === "reading") return "삶의 반복 패턴과 업의 흐름을 읽고 있습니다";
    if (status === "ready") return "상담이 이어지고 있습니다";
    return "운명의 실을 펼칠 준비가 되어 있습니다";
  }, [status]);

  const isBusy = status === "preparing" || status === "payment" || status === "reading";
  const canAskFollowUp = Boolean(sessionId && messages.length && !sending && !isBusy);

  const resetAttempt = useCallback(() => {
    if (isBusy) return;
    idempotencyKeyRef.current = createIdempotencyKey();
    setSessionId("");
    setAccessType("");
    setMessages([]);
    setSummaryCards(null);
    setIntegratedResult(null);
    setError("");
    setNotice("");
    setStatus("idle");
  }, [isBusy]);

  const updateField = (field: keyof ConsultationForm) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = event.target;
    const value = target instanceof HTMLInputElement && target.type === "checkbox" ? target.checked : target.value;
    setForm((prev) => ({ ...prev, [field]: value } as ConsultationForm));
    resetAttempt();
  };

  const updatePlaceField = (field: keyof BirthPlace) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({
      ...prev,
      birthPlace: { ...prev.birthPlace, [field]: event.target.value },
    }));
    resetAttempt();
  };

  const applyPreset = (event: ChangeEvent<HTMLSelectElement>) => {
    const preset = PLACE_PRESETS.find((item) => item.label === event.target.value);
    if (!preset) return;
    setForm((prev) => ({
      ...prev,
      birthPlace: {
        city: preset.city,
        country: preset.country,
        latitude: preset.latitude,
        longitude: preset.longitude,
        timezone: preset.timezone,
      },
    }));
    resetAttempt();
  };

  const startConsultation = useCallback(async (
    payload: ReturnType<typeof buildConsultationPayload>,
    idempotencyKey: string,
    access: Record<string, unknown>,
  ) => {
    setStatus("reading");
    const { payload: result } = await postJson<ConsultationResult>("/api/karma-destiny-ai/start", {
      ...payload,
      ...access,
    }, idempotencyKey);

    if (result.ok && Array.isArray(result.messages) && result.messages.length) {
      setSessionId(result.sessionId || "");
      setAccessType(result.accessType || "");
      setMessages(result.messages);
      setSummaryCards(result.summaryCards || null);
      setIntegratedResult(result.integratedResult || null);
      setNotice("");
      setError("");
      setStatus("ready");
      return;
    }
    if (result.ok && result.status === "generating") {
      setNotice(result.message || "삶의 반복 패턴과 업의 흐름을 읽고 있습니다");
      setStatus("reading");
      return;
    }
    if (result.reason === "PAYMENT_VERIFY_FAILED") throw new Error(PAYMENT_VERIFY_FAILED_MESSAGE);
    if (result.reason === "LLM_ERROR") throw new Error(LLM_ERROR_MESSAGE);
    throw new Error(result.message || SERVER_ERROR_MESSAGE);
  }, []);

  const runCommonBillingGate = async (paymentPayload: BillingGatePayload, idempotencyKey: string) => {
    const billingInput = buildBillingGateInput(paymentPayload, idempotencyKey);
    openPaidFeatureGate({
      featureKey: billingInput.featureKey,
      requestId: idempotencyKey,
      cost: billingInput.cost,
      paymentMode: "pass",
      message: "결제창을 확인해 주세요",
    });

    const gate = await runBillingCoinGate(billingInput);

    if (!gate.ok || !gate.data) {
      const code = String(gate.error?.code || "").toUpperCase();
      if (code === "AUTH_REQUIRED" || code === "LOGIN_REQUIRED") throw new Error(LOGIN_REQUIRED_MESSAGE);
      if (code === "INSUFFICIENT_COINS") throw new Error(PAYMENT_REQUIRED_MESSAGE);
      throw new Error(gate.error?.message || PAYMENT_VERIFY_FAILED_MESSAGE);
    }

    return {
      billingGate: gate.data as Record<string, unknown>,
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (startLockRef.current || isBusy) return;
    const validationMessage = validateConsultationForm(form);
    if (validationMessage) {
      console.warn("[Karma AI Submit Start]", {
        route: "/karma-destiny-ai",
        serviceType: "karma-ai-consultation",
        focusArea: form.focusArea,
        validation: "failed",
        birthDate: maskBirthDate(form.birthDate),
        questionLength: form.question.trim().length,
      });
      setNotice("");
      setError(validationMessage);
      setStatus("error");
      return;
    }
    startLockRef.current = true;
    const idempotencyKey = idempotencyKeyRef.current;
    const payload = {
      ...buildConsultationPayload(form),
      requestId: idempotencyKey,
    };
    console.info("[Karma AI Submit Start]", {
      route: "/karma-destiny-ai",
      requestId: idempotencyKey,
      serviceType: "karma-ai-consultation",
      focusArea: form.focusArea,
      validation: "ok",
      birthDate: maskBirthDate(form.birthDate),
      questionLength: form.question.trim().length,
    });
    let paymentAttempted = false;
    setError("");
    setNotice("");
    setStatus("preparing");

    try {
      const { payload: access } = await postJson<EnsureAccessResult>("/api/karma-destiny-ai/ensure-access", payload, idempotencyKey);
      if (access.ok) {
        await startConsultation(payload, idempotencyKey, { accessToken: access.accessToken });
        return;
      }
      const denied = access as Exclude<EnsureAccessResult, { ok: true }>;
      if (denied.reason === "LOGIN_REQUIRED") throw new Error(LOGIN_REQUIRED_MESSAGE);
      if (denied.reason === "INVALID_INPUT") throw new Error(denied.message);
      if (denied.reason === "PAYMENT_REQUIRED" && "paymentPayload" in denied) {
        paymentAttempted = true;
        setNotice(denied.message || PAYMENT_REQUIRED_MESSAGE);
        setStatus("payment");
        const billingEvidence = await runCommonBillingGate(denied.paymentPayload, idempotencyKey);
        await startConsultation(payload, idempotencyKey, billingEvidence);
        return;
      }
      throw new Error("message" in denied ? denied.message || SERVER_ERROR_MESSAGE : SERVER_ERROR_MESSAGE);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : SERVER_ERROR_MESSAGE;
      setError(
        message === LOGIN_REQUIRED_MESSAGE
          || message === PAYMENT_VERIFY_FAILED_MESSAGE
          || message === LLM_ERROR_MESSAGE
          || message === PAYMENT_REQUIRED_MESSAGE
          || message === REQUIRED_INPUT_MESSAGE
          || message === BIRTH_TIME_REQUIRED_MESSAGE
          || message === CUSTOM_QUESTION_REQUIRED_MESSAGE
          ? message
          : paymentAttempted
            ? PAYMENT_VERIFY_FAILED_MESSAGE
            : message || NETWORK_ERROR_MESSAGE,
      );
      setStatus("error");
    } finally {
      startLockRef.current = false;
    }
  };

  const handleFollowUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = followUp.trim();
    if (!message || !sessionId || sending) return;
    setSending(true);
    setError("");
    try {
      const { payload } = await postJson<ConsultationResult>("/api/karma-destiny-ai/message", { sessionId, message });
      if (!payload.ok || !Array.isArray(payload.messages)) throw new Error(payload.message || LLM_ERROR_MESSAGE);
      setMessages(payload.messages);
      setFollowUp("");
      setStatus("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : LLM_ERROR_MESSAGE);
    } finally {
      setSending(false);
    }
  };

  const keywords = summaryCards?.keywords?.length ? summaryCards.keywords.slice(0, 3) : ["반복 선택", "관계의 매듭", "재능의 숙제"];

  return (
    <main className="kdai-page" data-karma-destiny-ai="v20260627">
      <section className="kdai-hero" aria-label="운명의 업 AI 상담">
        <div className="kdai-hero__sigil" aria-hidden="true" />
        <div className="kdai-hero__image">
          <img src="/fuctionassets/soul-origin-cover.webp" alt="운명의 업 대표 이미지" />
        </div>
        <div className="kdai-hero__copy">
          <div className="kdai-kicker"><Moon size={16} /> Karma · Saju · Astrology · Vedic AI Reading</div>
          <h1>운명의 업 AI 상담</h1>
          <p>반복되는 인생의 흐름 속에서, 지금 끊어내야 할 패턴과 새롭게 열어야 할 길을 읽어드립니다.</p>
          <div className="kdai-status" data-status={status}>
            {isBusy ? <Loader2 size={16} className="kdai-spin" /> : <Sparkles size={16} />}
            <span>{statusText}</span>
          </div>
          {accessType && <p className="kdai-access">이용 방식: {accessType}</p>}
        </div>
      </section>

      <section className="kdai-workspace">
        <form className="kdai-form kdai-panel" onSubmit={handleSubmit}>
          <div className="kdai-panel-title">
            <CalendarDays size={18} />
            <h2>운명의 실을 읽기 위한 정보</h2>
          </div>

          <div className="kdai-grid">
            <label>
              이름 또는 닉네임
              <input value={form.name} onChange={updateField("name")} placeholder="예: 하린" maxLength={80} />
            </label>
            <label>
              성별
              <select value={form.gender} onChange={updateField("gender")} required>
                <option value="">선택</option>
                <option value="female">여성</option>
                <option value="male">남성</option>
                <option value="unknown">비공개</option>
              </select>
            </label>
            <label>
              생년월일
              <input type="date" value={form.birthDate} onChange={updateField("birthDate")} required />
            </label>
            <label>
              양력/음력
              <select value={form.calendarType} onChange={updateField("calendarType")} required>
                <option value="solar">양력</option>
                <option value="lunar">음력</option>
              </select>
            </label>
          </div>

          <div className="kdai-time-row">
            <label>
              출생시간
              <input type="time" value={form.birthTime} onChange={updateField("birthTime")} disabled={form.birthTimeUnknown} required={!form.birthTimeUnknown} />
            </label>
            <label className="kdai-check">
              <input type="checkbox" checked={form.birthTimeUnknown} onChange={updateField("birthTimeUnknown")} />
              <span>출생시간 모름</span>
            </label>
          </div>
          {form.birthTimeUnknown && <p className="kdai-soft-note">입력된 정보 기준으로 본 흐름을 중심으로 살피겠습니다.</p>}

          <div className="kdai-panel-title kdai-place-title">
            <MapPin size={18} />
            <h2>출생지</h2>
          </div>
          <label>
            주요 도시
            <select onChange={applyPreset} value="">
              <option value="">직접 입력 또는 선택</option>
              {PLACE_PRESETS.map((preset) => <option key={preset.label} value={preset.label}>{preset.label}</option>)}
            </select>
          </label>
          <div className="kdai-grid kdai-place-grid">
            <label>
              도시
              <input value={form.birthPlace.city} onChange={updatePlaceField("city")} placeholder="Seoul" />
            </label>
            <label>
              국가
              <input value={form.birthPlace.country} onChange={updatePlaceField("country")} placeholder="South Korea" />
            </label>
            <label>
              위도
              <input value={form.birthPlace.latitude} onChange={updatePlaceField("latitude")} inputMode="decimal" placeholder="37.5665" />
            </label>
            <label>
              경도
              <input value={form.birthPlace.longitude} onChange={updatePlaceField("longitude")} inputMode="decimal" placeholder="126.9780" />
            </label>
          </div>
          <label>
            시간대
            <input value={form.birthPlace.timezone} onChange={updatePlaceField("timezone")} placeholder="Asia/Seoul" />
          </label>

          <label className="kdai-topic">
            상담 주제
            <select value={form.focusArea} onChange={updateField("focusArea")} required>
              {FOCUS_AREA_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="kdai-topic">
            현재 가장 궁금한 질문
            <textarea
              value={form.question}
              onChange={updateField("question")}
              placeholder={form.focusArea === "custom" ? "지금 가장 풀고 싶은 운명의 매듭을 적어 주세요." : "비워두면 선택한 주제를 중심으로 상담이 이어집니다."}
              minLength={form.focusArea === "custom" ? 2 : undefined}
              maxLength={1600}
              required={form.focusArea === "custom"}
            />
          </label>

          {notice && <p className="kdai-notice">{notice}</p>}
          {error && <p className="kdai-error">{error}</p>}
          <button className="kdai-primary" type="submit" disabled={isBusy}>
            {isBusy ? <Loader2 size={18} className="kdai-spin" /> : <WalletCards size={18} />}
            <span>{isBusy ? "운명의 실을 따라가는 중..." : "운명의 업 AI 상담 받기"}</span>
          </button>
        </form>

        <section className="kdai-result kdai-panel" aria-live="polite">
          <div className="kdai-panel-title">
            <Sparkles size={18} />
            <h2>상담 카드</h2>
          </div>

          {messages.length > 0 && (
            <div className="kdai-summary">
              <article>
                <span>업의 핵심 키워드</span>
                <strong>{keywords.join(" · ")}</strong>
              </article>
              <article>
                <span>반복 패턴</span>
                <strong>{summaryCards?.repeatingPattern || "익숙한 감정 반응이 선택을 되풀이하는 흐름"}</strong>
              </article>
              <article>
                <span>현재 풀어야 할 과제</span>
                <strong>{summaryCards?.currentTask || "같은 장면에서 다른 선택을 연습하는 일"}</strong>
              </article>
            </div>
          )}

          {messages.length > 0 && (
            <div className="kdai-system-cards">
              <article>
                <span>사주</span>
                <p>{summarizeSystem(integratedResult, "saju")}</p>
              </article>
              <article>
                <span>서양 점성술</span>
                <p>{summarizeSystem(integratedResult, "westernAstrology")}</p>
              </article>
              <article>
                <span>베다 점성술</span>
                <p>{summarizeSystem(integratedResult, "vedicAstrology")}</p>
              </article>
            </div>
          )}

          <div className="kdai-messages">
            {messages.length === 0 ? (
              <div className="kdai-empty">
                <div className="kdai-karma-ring" aria-hidden="true"><Clock3 size={28} /></div>
                <p>운명의 실을 펼칠 준비가 되어 있습니다.</p>
                <span>입력한 정보를 기준으로 반복되는 삶의 패턴과 지금의 질문을 연결해 상담이 이어집니다.</span>
              </div>
            ) : messages.map((message, index) => (
              <article key={`${message.role}-${index}`} className={`kdai-message kdai-message--${message.role}`}>
                <span>{message.role === "assistant" ? "상담가" : "나"}</span>
                {message.role === "assistant" ? <AssistantMessageContent content={message.content} /> : <p>{message.content}</p>}
              </article>
            ))}
          </div>

          <form className="kdai-follow" onSubmit={handleFollowUp}>
            <textarea
              value={followUp}
              onChange={(event) => setFollowUp(event.target.value)}
              placeholder="더 깊게 보고 싶은 흐름을 이어서 물어보세요."
              disabled={!canAskFollowUp}
              maxLength={1200}
            />
            <button type="submit" disabled={!canAskFollowUp || !followUp.trim()}>
              {sending ? <Loader2 size={18} className="kdai-spin" /> : <Send size={18} />}
              <span>질문하기</span>
            </button>
          </form>
        </section>
      </section>

      <style jsx global>{`
        body:has(.kdai-page) header,
        body:has(.kdai-page) footer,
        body:has(.kdai-page) .site-header,
        body:has(.kdai-page) .site-footer,
        body:has(.kdai-page) .app-chrome__header,
        body:has(.kdai-page) .app-chrome__footer {
          display: none !important;
        }
      `}</style>

      <style jsx>{`
        .kdai-page {
          position: relative;
          overflow: hidden;
          min-height: 100vh;
          padding: clamp(16px, 3vw, 40px);
          color: #f9f0dc;
          background:
            radial-gradient(circle at 18% 8%, rgba(124, 58, 237, .28), transparent 28%),
            radial-gradient(circle at 86% 18%, rgba(225, 29, 72, .18), transparent 30%),
            radial-gradient(circle at 52% 95%, rgba(20, 184, 166, .13), transparent 32%),
            linear-gradient(128deg, #060914 0%, #121126 38%, #21142d 62%, #071c24 100%);
          font-family: CodeDestinyBody, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .kdai-page::before,
        .kdai-page::after {
          position: absolute;
          inset: 0;
          pointer-events: none;
          content: "";
        }

        .kdai-page::before {
          opacity: .42;
          background:
            linear-gradient(108deg, transparent 0 18%, rgba(239, 204, 137, .24) 18.2%, transparent 18.6% 64%, rgba(190, 18, 60, .22) 64.2%, transparent 64.7%),
            repeating-linear-gradient(91deg, rgba(255,255,255,.055) 0 1px, transparent 1px 92px),
            repeating-linear-gradient(0deg, rgba(255,255,255,.035) 0 1px, transparent 1px 78px);
          mask-image: linear-gradient(180deg, rgba(0,0,0,.95), rgba(0,0,0,.28));
        }

        .kdai-page::after {
          opacity: .5;
          background-image:
            radial-gradient(circle, rgba(255, 247, 223, .62) 0 1px, transparent 1.5px),
            radial-gradient(circle, rgba(244, 114, 182, .42) 0 1px, transparent 1.5px);
          background-size: 118px 118px, 164px 164px;
          background-position: 18px 24px, 72px 48px;
        }

        .kdai-panel,
        .kdai-hero {
          border: 1px solid rgba(239, 204, 137, .22);
          border-radius: 8px;
          background:
            linear-gradient(180deg, rgba(255, 252, 243, .09), rgba(255, 255, 255, .045)),
            rgba(7, 10, 22, .78);
          box-shadow: 0 24px 70px rgba(0, 0, 0, .28), inset 0 1px 0 rgba(255, 247, 223, .08);
          backdrop-filter: blur(18px);
        }

        .kdai-hero {
          position: relative;
          overflow: hidden;
          display: grid;
          grid-template-columns: minmax(220px, 340px) minmax(0, 1fr);
          gap: clamp(18px, 4vw, 44px);
          align-items: center;
          max-width: 1220px;
          margin: 0 auto clamp(16px, 3vw, 28px);
          padding: clamp(16px, 3vw, 30px);
        }

        .kdai-hero::before {
          position: absolute;
          inset: auto -8% 18% 34%;
          height: 2px;
          content: "";
          background: linear-gradient(90deg, transparent, rgba(248, 208, 111, .85), rgba(190, 18, 60, .72), transparent);
          box-shadow: 0 0 28px rgba(248, 208, 111, .42);
          transform: rotate(-7deg);
        }

        .kdai-hero::after {
          position: absolute;
          inset: 18px 18px auto auto;
          width: min(36vw, 360px);
          aspect-ratio: 1;
          border: 1px solid rgba(239, 204, 137, .18);
          border-radius: 50%;
          content: "";
          background:
            conic-gradient(from 22deg, transparent 0 12%, rgba(239, 204, 137, .28) 12% 13%, transparent 13% 28%, rgba(244, 114, 182, .22) 28% 29%, transparent 29% 100%);
          opacity: .58;
        }

        .kdai-hero__sigil {
          position: absolute;
          inset: 12% auto auto 22%;
          width: 220px;
          aspect-ratio: 1;
          border: 1px solid rgba(239, 204, 137, .16);
          border-radius: 50%;
          background:
            repeating-conic-gradient(from 12deg, rgba(239, 204, 137, .16) 0 4deg, transparent 4deg 18deg),
            radial-gradient(circle, transparent 0 48%, rgba(190, 18, 60, .18) 49% 50%, transparent 51%);
          opacity: .34;
          animation: kdaiSlowTurn 38s linear infinite;
        }

        .kdai-hero__image {
          position: relative;
          z-index: 1;
          overflow: hidden;
          aspect-ratio: 1 / 1;
          border-radius: 8px;
          border: 1px solid rgba(239, 204, 137, .28);
          background: #11151f;
        }

        .kdai-hero__copy,
        .kdai-form,
        .kdai-result {
          position: relative;
          z-index: 1;
        }

        .kdai-hero__image img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .kdai-kicker,
        .kdai-status,
        .kdai-panel-title {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .kdai-kicker {
          color: #f1cd7c;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .kdai-hero h1 {
          max-width: 780px;
          margin: 14px 0 12px;
          font-family: CodeDestinyDisplay, CodeDestinyBody, serif;
          font-size: clamp(34px, 3.9rem, 58px);
          line-height: 1.08;
          letter-spacing: 0;
        }

        .kdai-hero p {
          max-width: 700px;
          margin: 0;
          color: rgba(249, 240, 220, .76);
          font-size: 16px;
          line-height: 1.7;
        }

        .kdai-status {
          margin-top: 18px;
          min-height: 36px;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid rgba(241, 205, 124, .2);
          background: rgba(241, 205, 124, .1);
          color: #ffe4a3;
          font-size: 14px;
        }

        .kdai-access {
          margin-top: 8px !important;
          font-size: 13px !important;
          color: rgba(154, 228, 211, .84) !important;
        }

        .kdai-workspace {
          display: grid;
          grid-template-columns: minmax(320px, 470px) minmax(0, 1fr);
          gap: clamp(16px, 3vw, 28px);
          max-width: 1220px;
          margin: 0 auto;
        }

        .kdai-form,
        .kdai-result {
          padding: clamp(16px, 2.6vw, 24px);
        }

        .kdai-panel-title {
          margin-bottom: 16px;
          color: #f1cd7c;
        }

        .kdai-panel-title h2 {
          margin: 0;
          font-size: 18px;
          letter-spacing: 0;
        }

        .kdai-place-title {
          margin-top: 20px;
        }

        .kdai-grid,
        .kdai-time-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .kdai-place-grid {
          margin-top: 12px;
        }

        .kdai-form label {
          display: grid;
          gap: 7px;
          color: rgba(249, 240, 220, .78);
          font-size: 13px;
          font-weight: 800;
        }

        .kdai-form input,
        .kdai-form select,
        .kdai-form textarea,
        .kdai-follow textarea {
          width: 100%;
          border: 1px solid rgba(239, 204, 137, .22);
          border-radius: 8px;
          background: rgba(255, 252, 243, .09);
          color: #fff7df;
          font: inherit;
          outline: none;
          transition: border-color .18s ease, box-shadow .18s ease, background .18s ease;
        }

        .kdai-form input:focus,
        .kdai-form select:focus,
        .kdai-form textarea:focus,
        .kdai-follow textarea:focus {
          border-color: rgba(248, 208, 111, .72);
          background: rgba(255, 252, 243, .13);
          box-shadow: 0 0 0 3px rgba(248, 208, 111, .14), 0 0 22px rgba(190, 18, 60, .12);
        }

        .kdai-form input,
        .kdai-form select {
          min-height: 44px;
          padding: 0 12px;
        }

        .kdai-form select option {
          color: #141922;
        }

        .kdai-time-row {
          margin-top: 12px;
          align-items: end;
        }

        .kdai-check {
          min-height: 44px;
          display: inline-flex !important;
          grid-template-columns: auto 1fr;
          align-items: center;
          padding: 11px 12px;
          border: 1px solid rgba(239, 204, 137, .2);
          border-radius: 8px;
          background: rgba(255, 255, 255, .06);
        }

        .kdai-check input {
          width: 18px;
          height: 18px;
          min-height: 18px;
          padding: 0;
        }

        .kdai-soft-note {
          margin: 10px 0 0;
          color: rgba(249, 240, 220, .68);
          font-size: 13px;
          line-height: 1.5;
        }

        .kdai-topic {
          margin-top: 12px;
        }

        .kdai-form textarea,
        .kdai-follow textarea {
          min-height: 118px;
          padding: 12px;
          resize: vertical;
          line-height: 1.6;
        }

        .kdai-notice,
        .kdai-error {
          margin: 14px 0 0;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 14px;
          line-height: 1.55;
        }

        .kdai-notice {
          color: #ffe4a3;
          background: rgba(241, 205, 124, .1);
        }

        .kdai-error {
          color: #ffd8d8;
          background: rgba(168, 48, 64, .22);
        }

        .kdai-primary,
        .kdai-follow button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 46px;
          border: 0;
          border-radius: 8px;
          color: #17120a;
          background: linear-gradient(135deg, #ffe7a6, #d9a441 52%, #be123c);
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 14px 30px rgba(0, 0, 0, .28), 0 0 0 1px rgba(255, 244, 205, .18);
          transition: transform .18s ease, box-shadow .18s ease, filter .18s ease;
        }

        .kdai-primary:hover:not(:disabled),
        .kdai-follow button:hover:not(:disabled) {
          transform: translateY(-1px);
          filter: saturate(1.08);
          box-shadow: 0 18px 34px rgba(0, 0, 0, .32), 0 0 26px rgba(248, 208, 111, .22);
        }

        .kdai-primary {
          width: 100%;
          margin-top: 16px;
        }

        .kdai-primary:disabled,
        .kdai-follow button:disabled,
        .kdai-follow textarea:disabled {
          cursor: not-allowed;
          opacity: .62;
        }

        .kdai-result {
          min-height: 620px;
          display: flex;
          flex-direction: column;
        }

        .kdai-summary,
        .kdai-system-cards {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }

        .kdai-summary article,
        .kdai-system-cards article,
        .kdai-message {
          border: 1px solid rgba(239, 204, 137, .2);
          border-radius: 8px;
          background: rgba(255, 255, 255, .07);
        }

        .kdai-summary article,
        .kdai-system-cards article {
          min-height: 112px;
          padding: 13px;
        }

        .kdai-summary span,
        .kdai-system-cards span,
        .kdai-message span {
          display: block;
          margin-bottom: 7px;
          color: #f1cd7c;
          font-size: 12px;
          font-weight: 900;
        }

        .kdai-summary strong {
          display: block;
          color: #fff7df;
          font-size: 14px;
          line-height: 1.6;
        }

        .kdai-system-cards p {
          margin: 0;
          color: rgba(249, 240, 220, .82);
          font-size: 13px;
          line-height: 1.62;
        }

        .kdai-messages {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 12px;
          overflow: auto;
          padding-right: 4px;
        }

        .kdai-empty {
          position: relative;
          display: grid;
          place-content: center;
          min-height: 360px;
          text-align: center;
          color: rgba(249, 240, 220, .72);
        }

        .kdai-karma-ring {
          position: relative;
          display: grid;
          place-items: center;
          width: 94px;
          aspect-ratio: 1;
          margin: 0 auto 12px;
          border: 1px solid rgba(239, 204, 137, .38);
          border-radius: 50%;
          color: #f1cd7c;
          background:
            conic-gradient(from 0deg, rgba(239, 204, 137, .24), transparent 24%, rgba(190, 18, 60, .22), transparent 68%, rgba(244, 114, 182, .18)),
            rgba(255, 252, 243, .04);
          box-shadow: inset 0 0 0 12px rgba(255, 255, 255, .025), 0 0 30px rgba(248, 208, 111, .16);
          animation: kdaiSlowTurn 18s linear infinite;
        }

        .kdai-karma-ring svg {
          color: #f1cd7c;
          animation: kdaiReverseTurn 18s linear infinite;
        }

        .kdai-empty p {
          margin: 0 0 8px;
          color: #f1cd7c;
          font-size: 18px;
          font-weight: 900;
        }

        .kdai-empty span {
          font-size: 14px;
        }

        .kdai-message {
          max-width: min(760px, 94%);
          padding: 14px 15px;
          white-space: pre-wrap;
          line-height: 1.72;
        }

        .kdai-message p {
          margin: 0;
          color: #fff8e6;
        }

        .kdai-section-list {
          display: grid;
          gap: 10px;
          white-space: normal;
        }

        .kdai-result-section {
          border: 1px solid rgba(239, 204, 137, .18);
          border-radius: 8px;
          padding: 13px;
          background:
            linear-gradient(135deg, rgba(255, 252, 243, .08), rgba(124, 58, 237, .08)),
            rgba(5, 9, 19, .42);
        }

        .kdai-result-section h3 {
          margin: 0 0 8px;
          color: #ffe4a3;
          font-size: 15px;
          line-height: 1.35;
          letter-spacing: 0;
        }

        .kdai-result-section p {
          white-space: pre-wrap;
        }

        .kdai-message--assistant {
          align-self: flex-start;
          background: rgba(241, 205, 124, .1);
        }

        .kdai-message--user {
          align-self: flex-end;
          background: rgba(62, 176, 151, .15);
          border-color: rgba(62, 176, 151, .28);
        }

        .kdai-follow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 118px;
          gap: 10px;
          margin-top: 16px;
        }

        .kdai-follow textarea {
          min-height: 66px;
        }

        .kdai-spin {
          animation: kdaiSpin 1s linear infinite;
        }

        @keyframes kdaiSpin {
          to { transform: rotate(360deg); }
        }

        @keyframes kdaiSlowTurn {
          to { transform: rotate(360deg); }
        }

        @keyframes kdaiReverseTurn {
          to { transform: rotate(-360deg); }
        }

        @media (max-width: 900px) {
          .kdai-page {
            padding: 12px;
          }

          .kdai-hero,
          .kdai-workspace,
          .kdai-summary,
          .kdai-system-cards {
            grid-template-columns: 1fr;
          }

          .kdai-hero__image {
            max-height: 260px;
            aspect-ratio: 16 / 9;
          }

          .kdai-hero h1 {
            font-size: 34px;
          }

          .kdai-grid,
          .kdai-time-row {
            grid-template-columns: 1fr;
          }

          .kdai-result {
            min-height: 500px;
          }

          .kdai-follow {
            grid-template-columns: 1fr;
          }

          .kdai-follow button {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
