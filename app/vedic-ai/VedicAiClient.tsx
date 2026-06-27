"use client";

import { useMemo, useRef, useState } from "react";
import { CalendarDays, Clock3, Compass, Loader2, MapPin, Moon, Send, Sparkles, Star } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { runBillingCoinGate } from "@/app/_lib/billing-client";
import styles from "./VedicAiClient.module.css";

type Gender = "male" | "female" | "unknown" | "";
type CalendarType = "solar" | "lunar" | "";
type FocusArea = "overall" | "love" | "money" | "career" | "health" | "relationship" | "spirituality" | "custom";
type Phase = "idle" | "access" | "payment" | "start" | "chat";
type Message = {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};
type FormState = {
  userName: string;
  gender: Gender;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  calendarType: CalendarType;
  birthPlace: string;
  latitude: string;
  longitude: string;
  timezone: string;
  focusArea: FocusArea;
  question: string;
};
type SummaryCards = {
  lagna?: string;
  moonSign?: string;
  nakshatra?: string;
  currentDasha?: string;
  keywords?: string[];
  d1?: Record<string, unknown> | null;
  d9?: Record<string, unknown> | null;
};
type Consultation = {
  id: string;
  status: string;
  birthInfo: Record<string, unknown>;
  topic: string;
  focusArea?: FocusArea;
  userQuestion?: string;
  vedicChart: Record<string, unknown>;
  accessType: "pass" | "paid" | "subscription";
  paymentId?: string;
  messages: Message[];
  summaryCards?: SummaryCards;
};
type EnsureAccessResult =
  | { ok: true; accessToken: string; accessType: "pass" | "paid" | "subscription"; consultation?: Consultation }
  | { ok: false; reason: "PAYMENT_REQUIRED"; paymentPayload: Record<string, unknown>; message?: string }
  | { ok: false; reason: "LOGIN_REQUIRED"; message?: string }
  | { ok: false; reason: "INVALID_INPUT"; message: string };
type StartResult = {
  ok?: boolean;
  reason?: string;
  message?: string;
  consultation?: Consultation;
};
type PendingAccess = {
  requestId: string;
  access: Record<string, unknown>;
  paymentWasRequired: boolean;
};

const FEATURE_KEY = "vedic-ai-consultation";
const CONSULTATION_TYPE = "vedic";
const FEATURE_COST = 300;
const AMOUNT_KRW = 30000;
const MEMBERSHIP_CREDIT_COST = 3000;
const REASON = "베다점 AI 상담";

const FOCUS_OPTIONS: Array<{ value: FocusArea; label: string }> = [
  { value: "overall", label: "전체 흐름" },
  { value: "love", label: "연애" },
  { value: "money", label: "재물" },
  { value: "career", label: "일과 진로" },
  { value: "health", label: "건강" },
  { value: "relationship", label: "관계" },
  { value: "spirituality", label: "영성" },
  { value: "custom", label: "직접 질문" },
];

const PLACE_PRESETS = [
  { label: "서울, 한국", latitude: "37.5665", longitude: "126.9780", timezone: "Asia/Seoul" },
  { label: "부산, 한국", latitude: "35.1796", longitude: "129.0756", timezone: "Asia/Seoul" },
  { label: "인천, 한국", latitude: "37.4563", longitude: "126.7052", timezone: "Asia/Seoul" },
  { label: "대구, 한국", latitude: "35.8714", longitude: "128.6014", timezone: "Asia/Seoul" },
  { label: "제주, 한국", latitude: "33.4996", longitude: "126.5312", timezone: "Asia/Seoul" },
  { label: "Delhi, India", latitude: "28.6139", longitude: "77.2090", timezone: "Asia/Kolkata" },
  { label: "Mumbai, India", latitude: "19.0760", longitude: "72.8777", timezone: "Asia/Kolkata" },
  { label: "Tokyo, Japan", latitude: "35.6762", longitude: "139.6503", timezone: "Asia/Tokyo" },
  { label: "New York, USA", latitude: "40.7128", longitude: "-74.0060", timezone: "America/New_York" },
  { label: "Los Angeles, USA", latitude: "34.0522", longitude: "-118.2437", timezone: "America/Los_Angeles" },
];

const ERROR_TEXT: Record<string, string> = {
  INPUT_MISSING: "베다점 상담에 필요한 정보가 부족해요. 생년월일, 성별, 출생시간 정보를 다시 확인해 주세요.",
  BIRTH_TIME_MISSING: "베다점은 출생시간이 중요해요. 출생시간을 입력하거나 ‘출생시간 모름’을 선택해 주세요.",
  CUSTOM_QUESTION_MISSING: "직접 질문을 선택했다면 지금 가장 궁금한 내용을 함께 적어 주세요.",
  BIRTH_PLACE_INVALID: "출생지와 시간대를 확인하기 어려워요. 도시명 또는 시간대를 다시 확인해 주세요.",
  LOGIN_REQUIRED: "로그인이 필요한 상담입니다. 로그인 후 다시 시도해 주세요.",
  PAYMENT_REQUIRED: "이용권 또는 결제가 필요한 상담입니다. 결제 정보를 확인해 주세요.",
  PAYMENT_VERIFY_FAILED: "결제 정보를 확인하지 못했어요. 결제나 이용권은 차감되지 않았습니다.",
  PREPARE_FAILED: "베다점 상담을 준비하는 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.",
  CHART_CALCULATION_FAILED: "베다 차트를 계산하는 중 문제가 발생했어요. 입력한 출생 정보를 다시 확인해 주세요.",
  LLM_FAILED: "AI 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동으로 복구됩니다.",
  NETWORK_ERROR: "연결이 불안정해요. 잠시 후 다시 시도해 주세요.",
  SERVER_ERROR: "베다점 상담을 준비하는 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.",
};

const SECTION_TITLES = [
  "우주가 말하는 핵심 결론",
  "나의 베다 차트 기질",
  "현재 질문과 연결되는 별의 흐름",
  "나크샤트라가 비추는 감정",
  "일과 재물의 방향",
  "관계와 인연의 흐름",
  "조심해야 할 선택",
  "오늘의 별빛 행동 처방",
  "마지막 조언",
];

const initialForm: FormState = {
  userName: "",
  gender: "",
  birthDate: "",
  birthTime: "",
  birthTimeUnknown: false,
  calendarType: "solar",
  birthPlace: PLACE_PRESETS[0].label,
  latitude: PLACE_PRESETS[0].latitude,
  longitude: PLACE_PRESETS[0].longitude,
  timezone: PLACE_PRESETS[0].timezone,
  focusArea: "overall",
  question: "",
};

function makeRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `vedic-ai-${crypto.randomUUID()}`;
  }
  return `vedic-ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
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

function optionalNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function runtimePayload(result: unknown) {
  const record = asRecord(result);
  const payload = asRecord(record.payload);
  const data = asRecord(record.data);
  return Object.keys(payload).length ? payload : (Object.keys(data).length ? data : record);
}

function isPaymentGranted(result: unknown) {
  const record = asRecord(result);
  const payload = runtimePayload(result);
  const status = toText(record.status || payload.status || payload.paymentStatus).toLowerCase();
  const denied = new Set(["error", "failed", "failure", "payment_required", "cancelled", "canceled"]);
  if (record.ok === false || payload.ok === false || denied.has(status)) return false;
  if (["granted", "paid", "success", "succeeded", "confirmed", "complete", "completed", "approved"].includes(status)) return true;
  return Boolean(
    record.transactionId
    || record.paymentId
    || record.purchaseId
    || payload.transactionId
    || payload.paymentId
    || payload.purchaseId
    || Object.keys(asRecord(payload.accessGrant)).length
    || Object.keys(asRecord(payload.consume)).length
  );
}

function extractPayment(result: unknown, fallbackRequestId: string) {
  const record = asRecord(result);
  const payload = runtimePayload(result);
  const payment = asRecord(payload.payment);
  const accessGrant = asRecord(payload.accessGrant);
  const consume = asRecord(payload.consume);
  const paymentId = toText(
    record.paymentId
    || record.transactionId
    || record.purchaseId
    || payload.paymentId
    || payload.transactionId
    || payload.purchaseId
    || payment.paymentId
    || payment.impUid
    || payment.merchantUid
    || accessGrant.paymentId
    || accessGrant.purchaseId
    || fallbackRequestId,
  );
  return {
    paymentId,
    transactionId: paymentId,
    paymentEvidence: payload,
    billingEvidence: payload,
    payment: { ...payment, paymentId, requestId: fallbackRequestId },
    accessGrant,
    consume,
  };
}

async function postJson<T>(path: string, body: Record<string, unknown>, requestId?: string) {
  try {
    const response = await authFetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(requestId ? { "Idempotency-Key": requestId } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data: data as T };
  } catch {
    throw new Error("NETWORK_ERROR");
  }
}

function validateForm(form: FormState) {
  if (!form.birthDate || !form.gender || !form.calendarType) return ERROR_TEXT.INPUT_MISSING;
  if (!form.birthTimeUnknown && !form.birthTime) return ERROR_TEXT.BIRTH_TIME_MISSING;
  if (!form.birthPlace.trim() && !form.timezone.trim()) return ERROR_TEXT.BIRTH_PLACE_INVALID;
  if (form.focusArea === "custom" && form.question.trim().length < 2) return ERROR_TEXT.CUSTOM_QUESTION_MISSING;
  return "";
}

function buildPayload(form: FormState, requestId: string) {
  return {
    serviceType: FEATURE_KEY,
    consultationType: CONSULTATION_TYPE,
    userName: form.userName.trim() || undefined,
    gender: form.gender || "unknown",
    birthDate: form.birthDate,
    birthTime: form.birthTimeUnknown ? "" : form.birthTime,
    birthTimeUnknown: form.birthTimeUnknown,
    calendarType: form.calendarType,
    birthPlace: form.birthPlace.trim(),
    latitude: optionalNumber(form.latitude),
    longitude: optionalNumber(form.longitude),
    timezone: form.timezone.trim(),
    focusArea: form.focusArea,
    question: form.question.trim(),
    locale: "ko",
    requestId,
  };
}

function buildBillingGateInput(paymentPayload: Record<string, unknown>, requestId: string) {
  return {
    featureKey: FEATURE_KEY,
    subFeatureKey: FEATURE_KEY,
    productId: toText(paymentPayload.productId) || FEATURE_KEY,
    serviceType: FEATURE_KEY,
    reason: toText(paymentPayload.reason) || REASON,
    forceDeduct: true,
    requestId,
    idempotencyKey: requestId,
    cost: toNumber(paymentPayload.cost ?? paymentPayload.coinPrice, FEATURE_COST),
    coinPrice: toNumber(paymentPayload.coinPrice ?? paymentPayload.cost, FEATURE_COST),
    amountKRW: toNumber(paymentPayload.amountKRW ?? paymentPayload.amountKrw ?? paymentPayload.paymentAmount, AMOUNT_KRW),
    membershipCreditCost: toNumber(paymentPayload.membershipCreditCost, MEMBERSHIP_CREDIT_COST),
  };
}

function chartPoint(chart: Record<string, unknown>, key: string) {
  return asRecord(chart[key]);
}

function planetSummary(chart: Record<string, unknown>, name: string) {
  const planets = Array.isArray(chart.planets) ? chart.planets : [];
  const found = planets.map(asRecord).find((planet) => toText(planet.name) === name);
  if (!found) return "";
  return [found.sign, found.house ? `${found.house}H` : "", found.nakshatra].filter(Boolean).join(" · ");
}

function vargaPlanetSign(chart: Record<string, unknown>, chartKey: string, planetName: string) {
  const divisionalCharts = asRecord(chart.divisionalCharts);
  const varga = asRecord(divisionalCharts[chartKey]);
  return toText(asRecord(varga[planetName]).sign);
}

function sectionHeading(line: string) {
  const text = line.replace(/^#{1,4}\s*/, "").replace(/^\d+[\).]\s*/, "").replace(/[:：]\s*$/, "").trim();
  return SECTION_TITLES.find((title) => text.includes(title) || title.includes(text)) || "";
}

function splitAssistantSections(content: string) {
  const lines = content.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const sections: Array<{ title: string; body: string }> = [];
  let currentTitle = "";
  let buffer: string[] = [];

  lines.forEach((line) => {
    const heading = sectionHeading(line);
    if (heading) {
      if (buffer.length) sections.push({ title: currentTitle || SECTION_TITLES[Math.min(sections.length, SECTION_TITLES.length - 1)], body: buffer.join("\n") });
      currentTitle = heading;
      buffer = [];
      return;
    }
    buffer.push(line);
  });

  if (buffer.length) sections.push({ title: currentTitle || SECTION_TITLES[Math.min(sections.length, SECTION_TITLES.length - 1)], body: buffer.join("\n") });
  if (sections.length > 1) return sections;

  const paragraphs = content.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  if (paragraphs.length <= 1) return [{ title: SECTION_TITLES[0], body: content.trim() }];
  return paragraphs.slice(0, SECTION_TITLES.length).map((body, index) => ({
    title: SECTION_TITLES[index] || `별빛 조언 ${index + 1}`,
    body,
  }));
}

export default function VedicAiClient() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [chatInput, setChatInput] = useState("");
  const requestIdRef = useRef("");
  const pendingAccessRef = useRef<PendingAccess | null>(null);
  const submitBusyRef = useRef(false);

  const busy = phase === "access" || phase === "payment" || phase === "start";
  const chatBusy = phase === "chat";
  const validationMessage = validateForm(form);

  const phaseText = useMemo(() => {
    if (phase === "access") return "베다 상담 권한을 확인하는 중...";
    if (phase === "payment") return "결제 정보를 확인하는 중...";
    if (phase === "start") return "나크샤트라의 빛을 읽는 중...";
    if (phase === "chat") return "행성의 흐름과 질문을 다시 연결하는 중...";
    return "";
  }, [phase]);

  function updateForm(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function applyPreset(value: string) {
    const preset = PLACE_PRESETS.find((place) => place.label === value);
    if (!preset) {
      updateForm({ birthPlace: value });
      return;
    }
    updateForm({
      birthPlace: preset.label,
      latitude: preset.latitude,
      longitude: preset.longitude,
      timezone: preset.timezone,
    });
  }

  async function startConsultation(requestId: string, access: Record<string, unknown>, paymentWasRequired = false) {
    setPhase("start");
    const { status, data } = await postJson<StartResult>(
      "/api/vedic-ai/start",
      { ...buildPayload(form, requestId), ...access, idempotencyKey: requestId },
      requestId,
    );
    if (data.ok && data.consultation) {
      setConsultation(data.consultation);
      setError("");
      setNotice("");
      requestIdRef.current = "";
      pendingAccessRef.current = null;
      return;
    }
    if (status === 402 && paymentWasRequired) throw new Error("PAYMENT_VERIFY_FAILED");
    throw new Error(toText(data.reason) || (status === 401 ? "LOGIN_REQUIRED" : status >= 500 ? "SERVER_ERROR" : "PREPARE_FAILED"));
  }

  async function handleSubmit() {
    if (busy || submitBusyRef.current) return;
    if (validationMessage) {
      setError(validationMessage);
      setNotice("");
      return;
    }

    const requestId = requestIdRef.current || makeRequestId();
    requestIdRef.current = requestId;
    submitBusyRef.current = true;
    setError("");
    setNotice("");

    try {
      const pending = pendingAccessRef.current;
      if (pending && pending.requestId === requestId) {
        await startConsultation(requestId, pending.access, pending.paymentWasRequired);
        return;
      }

      setPhase("access");
      const { data } = await postJson<EnsureAccessResult>(
        "/api/vedic-ai/ensure-access",
        { ...buildPayload(form, requestId), idempotencyKey: requestId },
        requestId,
      );

      if (data.ok) {
        if (data.consultation) {
          setConsultation(data.consultation);
          requestIdRef.current = "";
          pendingAccessRef.current = null;
          return;
        }
        await startConsultation(requestId, { accessToken: data.accessToken, accessType: data.accessType });
        return;
      }

      if (data.reason === "LOGIN_REQUIRED") throw new Error("LOGIN_REQUIRED");
      if (data.reason === "INVALID_INPUT") throw new Error("PREPARE_FAILED");

      setNotice(ERROR_TEXT.PAYMENT_REQUIRED);
      setPhase("payment");
      const paymentPayload = asRecord(data.paymentPayload);
      const gate = await runBillingCoinGate(buildBillingGateInput(paymentPayload, requestId));
      if (!isPaymentGranted(gate)) throw new Error("PAYMENT_VERIFY_FAILED");

      const access = extractPayment(gate, requestId);
      pendingAccessRef.current = { requestId, access, paymentWasRequired: true };
      await startConsultation(requestId, access, true);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "SERVER_ERROR";
      const clearPrepaid = ["LLM_FAILED", "CHART_CALCULATION_FAILED", "BIRTH_PLACE_INVALID", "PAYMENT_VERIFY_FAILED", "LOGIN_REQUIRED", "PREPARE_FAILED"].includes(code);
      if (clearPrepaid) {
        pendingAccessRef.current = null;
        requestIdRef.current = "";
      }
      setError(ERROR_TEXT[code] || ERROR_TEXT.SERVER_ERROR);
    } finally {
      submitBusyRef.current = false;
      setPhase("idle");
    }
  }

  async function handleSendMessage() {
    if (!consultation || chatBusy || chatInput.trim().length < 2) return;
    const message = chatInput.trim();
    setChatInput("");
    setError("");
    setPhase("chat");
    try {
      const { status, data } = await postJson<StartResult>(
        "/api/vedic-ai/message",
        { consultationId: consultation.id, message },
      );
      if (data.ok && data.consultation) {
        setConsultation(data.consultation);
        return;
      }
      throw new Error(toText(data.reason) || (status === 401 ? "LOGIN_REQUIRED" : "SERVER_ERROR"));
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "SERVER_ERROR";
      setError(ERROR_TEXT[code] || ERROR_TEXT.SERVER_ERROR);
    } finally {
      setPhase("idle");
    }
  }

  const chart = consultation?.vedicChart || {};
  const summary = consultation?.summaryCards || {};
  const lagna = chartPoint(chart, "lagna");
  const moon = chartPoint(chart, "moon");

  return (
    <main className={styles.shell} data-vedic-ai-page="direct-route-v20260627">
      <section className={styles.hero}>
        <div className={styles.starLayer} aria-hidden="true" />
        <div className={styles.heroInner}>
          <div className={styles.copy}>
            <span className={styles.eyebrow}><Sparkles size={16} /> Vedic Astrology · Jyotish AI Reading</span>
            <h1>베다점 AI 상담</h1>
            <p>나크샤트라와 행성의 흐름을 따라 지금의 질문을 조용히 풀어드립니다.</p>
            <div className={styles.heroMeta}>
              <span>30,000원</span>
              <span>{FEATURE_COST}코인</span>
              <span>LLM 상담</span>
            </div>
          </div>
          <div className={styles.mandalaStage} aria-hidden="true">
            <div className={styles.mandalaCore} />
            <div className={styles.orbitOne} />
            <div className={styles.orbitTwo} />
          </div>
        </div>
      </section>

      <section className={styles.workspace}>
        <form className={styles.formPanel} onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}>
          <div className={styles.panelHeader}>
            <span><Star size={18} /> 별의 지도를 열기 위한 정보</span>
            <strong>Vedic AI</strong>
          </div>

          <div className={styles.formGrid}>
            <label>
              <span>이름 또는 닉네임</span>
              <input value={form.userName} onChange={(event) => updateForm({ userName: event.target.value })} maxLength={80} disabled={busy} placeholder="상담에서 부를 이름" />
            </label>
            <label>
              <span>성별</span>
              <select value={form.gender} onChange={(event) => updateForm({ gender: event.target.value as Gender })} disabled={busy}>
                <option value="">선택</option>
                <option value="female">여성</option>
                <option value="male">남성</option>
                <option value="unknown">비공개</option>
              </select>
            </label>
            <label>
              <span><CalendarDays size={15} /> 생년월일</span>
              <input type="date" value={form.birthDate} onChange={(event) => updateForm({ birthDate: event.target.value })} disabled={busy} />
            </label>
            <label>
              <span>달력 기준</span>
              <select value={form.calendarType} onChange={(event) => updateForm({ calendarType: event.target.value as CalendarType })} disabled={busy}>
                <option value="solar">양력</option>
                <option value="lunar">음력</option>
              </select>
            </label>
            <label>
              <span><Clock3 size={15} /> 출생시간</span>
              <input type="time" value={form.birthTime} onChange={(event) => updateForm({ birthTime: event.target.value })} disabled={busy || form.birthTimeUnknown} />
            </label>
            <label>
              <span><Compass size={15} /> 시간대</span>
              <input value={form.timezone} onChange={(event) => updateForm({ timezone: event.target.value })} disabled={busy} placeholder="Asia/Seoul" />
            </label>
          </div>

          <label className={styles.checkRow}>
            <input type="checkbox" checked={form.birthTimeUnknown} onChange={(event) => updateForm({ birthTimeUnknown: event.target.checked, birthTime: event.target.checked ? "" : form.birthTime })} disabled={busy} />
            <span>출생시간 모름</span>
          </label>
          {form.birthTimeUnknown && (
            <p className={styles.softNotice}>출생시간이 불확실하면 라그나의 정밀도는 낮추고, 달과 나크샤트라의 흐름을 중심으로 읽습니다.</p>
          )}

          <div className={styles.formGrid}>
            <label>
              <span><MapPin size={15} /> 출생지</span>
              <input
                list="vedic-place-presets"
                value={form.birthPlace}
                onChange={(event) => applyPreset(event.target.value)}
                disabled={busy}
                placeholder="도시, 국가"
              />
              <datalist id="vedic-place-presets">
                {PLACE_PRESETS.map((place) => <option key={place.label} value={place.label} />)}
              </datalist>
            </label>
            <label>
              <span>상담 주제</span>
              <select value={form.focusArea} onChange={(event) => updateForm({ focusArea: event.target.value as FocusArea })} disabled={busy}>
                {FOCUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label>
              <span>위도</span>
              <input type="number" step="0.0001" value={form.latitude} onChange={(event) => updateForm({ latitude: event.target.value })} disabled={busy} placeholder="37.5665" />
            </label>
            <label>
              <span>경도</span>
              <input type="number" step="0.0001" value={form.longitude} onChange={(event) => updateForm({ longitude: event.target.value })} disabled={busy} placeholder="126.9780" />
            </label>
          </div>

          <label>
            <span>자유 질문</span>
            <textarea value={form.question} onChange={(event) => updateForm({ question: event.target.value })} maxLength={1500} disabled={busy} placeholder="지금 가장 궁금한 흐름을 자연스럽게 적어 주세요." />
          </label>

          {(error || notice || phaseText) && (
            <div className={error ? styles.errorBox : styles.noticeBox}>
              {phaseText && <Loader2 className={styles.spin} size={16} />}
              <span>{error || phaseText || notice}</span>
            </div>
          )}

          <button type="submit" className={styles.primaryButton} disabled={busy}>
            {busy ? <Loader2 className={styles.spin} size={18} /> : <Moon size={18} />}
            {busy ? "나크샤트라의 흐름을 읽는 중..." : "베다점 AI 상담 받기"}
          </button>
        </form>

        <section className={styles.resultPanel}>
          {busy && (
            <div className={styles.loadingVeil} aria-live="polite">
              <div className={styles.loadingMandala} />
              <strong>{phaseText || "라시 차트를 정렬하는 중..."}</strong>
              <span>행성의 흐름과 질문을 조용히 맞추고 있습니다.</span>
            </div>
          )}

          {!consultation ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyMandala} aria-hidden="true" />
              <h2>우주의 차트를 펼칠 준비가 되어 있습니다.</h2>
              <p>입력한 정보를 기준으로 별의 흐름과 현재 질문을 연결해 상담이 이어집니다.</p>
            </div>
          ) : (
            <>
              <div className={styles.summaryGrid}>
                <article><span>Lagna</span><strong>{summary.lagna || toText(lagna.sign) || "Moon Chart"}</strong></article>
                <article><span>Moon Sign</span><strong>{summary.moonSign || toText(moon.sign) || "-"}</strong></article>
                <article><span>Nakshatra</span><strong>{summary.nakshatra || toText(moon.nakshatra) || "-"}</strong></article>
                <article><span>Current Dasha</span><strong>{summary.currentDasha || "-"}</strong></article>
              </div>

              <div className={styles.keywordRow}>
                {(summary.keywords || []).slice(0, 4).map((keyword) => <span key={keyword}>{keyword}</span>)}
              </div>

              <div className={styles.chartCards}>
                <article>
                  <span>D1 Rashi</span>
                  <strong>{planetSummary(chart, "Sun") || "태양의 흐름"}</strong>
                  <p>{planetSummary(chart, "Rahu") || "라후와 케투의 축을 상담에 함께 반영합니다."}</p>
                </article>
                <article>
                  <span>D9 Navamsa</span>
                  <strong>{toText(asRecord(asRecord(summary.d9).Venus).sign) || vargaPlanetSign(chart, "d9", "Venus") || "내면의 성숙"}</strong>
                  <p>관계, 약속, 오래 남는 선택의 질감을 함께 살핍니다.</p>
                </article>
              </div>

              <div className={styles.chatList}>
                {consultation.messages.map((message, index) => (
                  message.role === "assistant" ? (
                    <div className={styles.sectionGrid} key={`${message.role}-${index}`}>
                      {splitAssistantSections(message.content).map((section, sectionIndex) => (
                        <article className={styles.sectionCard} key={`${section.title}-${sectionIndex}`}>
                          <span>{section.title}</span>
                          <p>{section.body}</p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <article className={styles.userMsg} key={`${message.role}-${index}`}>
                      <span>나의 질문</span>
                      <p>{message.content}</p>
                    </article>
                  )
                ))}
              </div>

              <div className={styles.chatInput}>
                <textarea value={chatInput} onChange={(event) => setChatInput(event.target.value)} maxLength={1800} disabled={chatBusy} placeholder="상담 흐름에 이어서 더 묻고 싶은 내용을 적어 주세요." />
                <button type="button" onClick={() => void handleSendMessage()} disabled={chatBusy || chatInput.trim().length < 2} aria-label="추가 질문 보내기">
                  {chatBusy ? <Loader2 className={styles.spin} size={18} /> : <Send size={18} />}
                </button>
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}
