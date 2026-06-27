"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { CalendarDays, Loader2, MapPin, Moon, Send, Sparkles, Stars, WalletCards } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { runBillingCoinGate } from "@/app/_lib/billing-client";

type AccessType = "pass" | "paid" | "subscription" | "admin";
type FlowPhase = "idle" | "access" | "payment" | "reading" | "ready" | "chat";
type Message = { role: "user" | "assistant"; content: string; createdAt?: string };
type ChartPoint = { sign?: string; signKo?: string; degree?: number; house?: number | null };
type AstrologyChart = {
  sun?: ChartPoint | null;
  moon?: ChartPoint | null;
  ascendant?: ChartPoint | null;
  chartRuler?: string;
  consultationKeywords?: string[];
  planets?: Array<ChartPoint & { name: string; label?: string; retrograde?: boolean | null }>;
  houses?: Array<{ house: number; sign?: string; signKo?: string; planets?: string[] }>;
  majorAspects?: Array<{ planetA: string; aspect: string; planetB: string; orb?: number | null }>;
  transits?: { majorAspectsToNatal?: Array<{ transitPlanet: string; aspect: string; natalPlanet: string; orb?: number | null }> };
  birthTimeUnknown?: boolean;
};
type Consultation = {
  id: string;
  sessionId: string;
  accessType?: AccessType;
  status?: string;
  topic?: string;
  userQuestion?: string;
  astrologyChart?: AstrologyChart | null;
  chartHighlights?: {
    sun?: ChartPoint | null;
    moon?: ChartPoint | null;
    ascendant?: ChartPoint | null;
    chartRuler?: string;
    keywords?: string[];
  };
  messages: Message[];
};
type EnsureAccessResult =
  | { ok: true; accessToken: string; accessType: AccessType }
  | { ok: false; reason: "PAYMENT_REQUIRED"; paymentPayload: Record<string, unknown> }
  | { ok: false; reason: "LOGIN_REQUIRED"; message?: string }
  | { ok: false; reason: "INVALID_INPUT"; message: string }
  | { ok: false; reason?: string; message?: string };

type FormState = {
  name: string;
  gender: string;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  placeKey: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  timezone: string;
  topic: string;
  userQuestion: string;
};

const FEATURE_KEY = "astrology-ai-consultation";
const FEATURE_TITLE = "점성술 AI 상담";
const FEATURE_COST = 390;
const FEATURE_AMOUNT_KRW = 39000;

const TOPICS = [
  "전체 차트 해석",
  "타고난 성향",
  "인생의 방향성",
  "직업/사업운",
  "재물운",
  "연애/결혼운",
  "인간관계",
  "가족/부모운",
  "건강/멘탈",
  "올해 운세",
  "현재 트랜짓 흐름",
  "이직/창업",
  "인생 전환기",
  "현재 고민 상담",
];

const PLACE_PRESETS = [
  { key: "seoul", label: "서울, 대한민국", city: "서울", country: "대한민국", latitude: "37.5665", longitude: "126.9780", timezone: "Asia/Seoul" },
  { key: "busan", label: "부산, 대한민국", city: "부산", country: "대한민국", latitude: "35.1796", longitude: "129.0756", timezone: "Asia/Seoul" },
  { key: "tokyo", label: "도쿄, 일본", city: "도쿄", country: "일본", latitude: "35.6762", longitude: "139.6503", timezone: "Asia/Tokyo" },
  { key: "singapore", label: "싱가포르", city: "싱가포르", country: "싱가포르", latitude: "1.3521", longitude: "103.8198", timezone: "Asia/Singapore" },
  { key: "new-york", label: "뉴욕, 미국", city: "뉴욕", country: "미국", latitude: "40.7128", longitude: "-74.0060", timezone: "America/New_York" },
  { key: "los-angeles", label: "로스앤젤레스, 미국", city: "로스앤젤레스", country: "미국", latitude: "34.0522", longitude: "-118.2437", timezone: "America/Los_Angeles" },
  { key: "london", label: "런던, 영국", city: "런던", country: "영국", latitude: "51.5072", longitude: "-0.1276", timezone: "Europe/London" },
  { key: "paris", label: "파리, 프랑스", city: "파리", country: "프랑스", latitude: "48.8566", longitude: "2.3522", timezone: "Europe/Paris" },
  { key: "sydney", label: "시드니, 호주", city: "시드니", country: "호주", latitude: "-33.8688", longitude: "151.2093", timezone: "Australia/Sydney" },
];

const ERROR_TEXT: Record<string, string> = {
  LOGIN_REQUIRED: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  PAYMENT_REQUIRED: "점성술 AI 상담 이용권이 필요합니다. 결제창을 열어드릴게요.",
  PAYMENT_VERIFY_FAILED: "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.",
  INVALID_INPUT: "생년월일, 출생시간, 출생지 정보를 다시 확인해 주세요.",
  PLACE_ERROR: "출생지 정보를 확인하지 못했습니다. 도시와 국가를 다시 입력해 주세요.",
  CALCULATION_ERROR: "점성술 차트 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.",
  SERVER_ERROR: "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.",
  LLM_ERROR: "AI 상담 답변을 생성하지 못했습니다. 이용권 또는 결제 권한은 보존되었으니 다시 시도해 주세요.",
};

const defaultForm = (): FormState => {
  const seoul = PLACE_PRESETS[0];
  return {
    name: "",
    gender: "",
    birthDate: "",
    birthTime: "12:00",
    birthTimeUnknown: false,
    placeKey: seoul.key,
    city: seoul.city,
    country: seoul.country,
    latitude: seoul.latitude,
    longitude: seoul.longitude,
    timezone: seoul.timezone,
    topic: TOPICS[0],
    userQuestion: "",
  };
};

function makeIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return `astro-ai-${crypto.randomUUID()}`;
  return `astro-ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toText(value: unknown) {
  return String(value || "").trim();
}

function normalizeGatePayload(result: unknown) {
  const record = asRecord(result);
  const data = asRecord(record.data);
  return Object.keys(data).length ? data : record;
}

function extractPaymentContext(result: unknown, fallbackRequestId: string) {
  const payload = normalizeGatePayload(result);
  const consume = asRecord(payload.consume);
  const accessGrant = asRecord(payload.accessGrant);
  const payment = asRecord(payload.payment);
  const paymentId = toText(
    payload.paymentId
    || payload.transactionId
    || payload.purchaseId
    || consume.transactionId
    || consume.purchaseId
    || accessGrant.transactionId
    || accessGrant.purchaseId
    || payment.paymentId
    || payment.impUid
    || payment.merchantUid
    || fallbackRequestId,
  );
  return {
    paymentId,
    payment: { ...payment, paymentId, requestId: fallbackRequestId },
    accessGrant,
    consume,
    requestId: fallbackRequestId,
  };
}

async function postJson<T>(path: string, body: Record<string, unknown>, idempotencyKey?: string) {
  const response = await authFetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify({ ...body, ...(idempotencyKey ? { idempotencyKey } : {}) }),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data: data as T };
}

function pointLabel(point?: ChartPoint | null) {
  if (!point?.sign) return "제한";
  const degree = Number.isFinite(Number(point.degree)) ? `${Number(point.degree).toFixed(1)}°` : "";
  return `${point.signKo || point.sign} ${degree}`.trim();
}

function aspectLabel(type: string) {
  if (type === "conjunction") return "합";
  if (type === "opposition") return "충";
  if (type === "square") return "스퀘어";
  if (type === "trine") return "트라인";
  if (type === "sextile") return "섹스타일";
  return type;
}

export default function AstrologyAiClient() {
  const [form, setForm] = useState<FormState>(() => defaultForm());
  const [phase, setPhase] = useState<FlowPhase>("idle");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [chatInput, setChatInput] = useState("");
  const lockRef = useRef(false);
  const idempotencyKeyRef = useRef(makeIdempotencyKey());

  const busy = phase === "access" || phase === "payment" || phase === "reading" || phase === "chat";
  const assistantMessages = consultation?.messages.filter((message) => message.role === "assistant") || [];
  const chart = consultation?.astrologyChart || null;
  const highlights = consultation?.chartHighlights;

  const phaseText = useMemo(() => {
    if (phase === "access") return "별자리 차트를 펼치고 있습니다";
    if (phase === "payment") return "결제창을 확인해 주세요";
    if (phase === "reading") return "행성과 별자리의 흐름을 읽고 있습니다";
    if (phase === "chat") return "질문의 결을 다시 살피고 있습니다";
    if (phase === "ready") return "상담이 이어지고 있습니다";
    return "출생 정보와 질문을 입력해 주세요";
  }, [phase]);

  function patchForm(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function handlePresetChange(key: string) {
    const preset = PLACE_PRESETS.find((item) => item.key === key);
    if (!preset) {
      patchForm({ placeKey: key });
      return;
    }
    patchForm({
      placeKey: key,
      city: preset.city,
      country: preset.country,
      latitude: preset.latitude,
      longitude: preset.longitude,
      timezone: preset.timezone,
    });
  }

  function buildPayload() {
    return {
      birthInfo: {
        name: form.name.trim(),
        gender: form.gender,
        birthDate: form.birthDate,
        birthTime: form.birthTimeUnknown ? "" : form.birthTime,
        birthTimeUnknown: form.birthTimeUnknown,
        birthPlace: {
          city: form.city.trim(),
          country: form.country.trim(),
          latitude: Number(form.latitude),
          longitude: Number(form.longitude),
          timezone: form.timezone.trim(),
        },
      },
      topic: form.topic,
      userQuestion: form.userQuestion.trim(),
    };
  }

  function validateForm() {
    if (!form.gender || !form.birthDate || (!form.birthTimeUnknown && !form.birthTime)) return false;
    if (!form.city.trim() || !Number.isFinite(Number(form.latitude)) || !Number.isFinite(Number(form.longitude)) || !form.timezone.trim()) return false;
    if (!form.topic || form.userQuestion.trim().length < 2) return false;
    return true;
  }

  async function startConsultation(idempotencyKey: string, access: Record<string, unknown>) {
    setPhase("reading");
    const { data } = await postJson<Consultation | { ok?: false; reason?: string; message?: string }>(
      "/api/astrology-ai/start",
      { ...buildPayload(), ...access },
      idempotencyKey,
    );
    if ("ok" in data && data.ok === false) {
      const reason = toText(data.reason || "SERVER_ERROR");
      throw new Error(reason || "SERVER_ERROR");
    }
    const next = data as Consultation;
    if (!next?.sessionId || !Array.isArray(next.messages)) throw new Error("SERVER_ERROR");
    setConsultation(next);
    setPhase("ready");
    setNotice("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || lockRef.current) return;
    if (!validateForm()) {
      setError(ERROR_TEXT.INVALID_INPUT);
      return;
    }
    lockRef.current = true;
    const idempotencyKey = idempotencyKeyRef.current || makeIdempotencyKey();
    idempotencyKeyRef.current = idempotencyKey;
    setError("");
    setNotice("");
    setPhase("access");
    try {
      const { response, data } = await postJson<EnsureAccessResult>("/api/astrology-ai/ensure-access", buildPayload(), idempotencyKey);
      if (data.ok) {
        await startConsultation(idempotencyKey, { accessToken: data.accessToken, accessType: data.accessType });
        return;
      }
      if (data.reason === "LOGIN_REQUIRED" || response.status === 401) throw new Error("LOGIN_REQUIRED");
      if (data.reason === "INVALID_INPUT") throw new Error("INVALID_INPUT");
      if (data.reason !== "PAYMENT_REQUIRED") throw new Error("SERVER_ERROR");

      setNotice(ERROR_TEXT.PAYMENT_REQUIRED);
      setPhase("payment");
      const paymentRequired = data as Extract<EnsureAccessResult, { ok: false; reason: "PAYMENT_REQUIRED" }>;
      const paymentPayload = asRecord(paymentRequired.paymentPayload);
      const runtimeGate = asRecord(paymentPayload.runtimeGate);
      const gate = await runBillingCoinGate({
        ...runtimeGate,
        featureKey: FEATURE_KEY,
        categoryKey: toText(runtimeGate.categoryKey || "premium-consultation"),
        subFeatureKey: FEATURE_KEY,
        reason: FEATURE_TITLE,
        requestId: idempotencyKey,
        idempotencyKey,
        cost: Number(runtimeGate.cost || FEATURE_COST),
        coinPrice: Number(runtimeGate.coinPrice || FEATURE_COST),
        amountKRW: Number(runtimeGate.amountKRW || FEATURE_AMOUNT_KRW),
        forceDeduct: true,
      });
      if (!gate.ok || !gate.data) {
        const code = toText(gate.error?.code || (gate.status === 401 ? "LOGIN_REQUIRED" : "PAYMENT_VERIFY_FAILED")).toUpperCase();
        throw new Error(code === "AUTH_REQUIRED" ? "LOGIN_REQUIRED" : "PAYMENT_VERIFY_FAILED");
      }
      await startConsultation(idempotencyKey, extractPaymentContext(gate, idempotencyKey));
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "SERVER_ERROR";
      setError(ERROR_TEXT[code] || ERROR_TEXT.SERVER_ERROR);
      setPhase("idle");
    } finally {
      lockRef.current = false;
    }
  }

  async function handleSendMessage() {
    if (!consultation?.sessionId || busy || chatInput.trim().length < 2) return;
    const message = chatInput.trim();
    setChatInput("");
    setError("");
    setPhase("chat");
    try {
      const { data } = await postJson<Consultation | { ok?: false; reason?: string; message?: string }>(
        "/api/astrology-ai/message",
        { sessionId: consultation.sessionId, message },
      );
      if ("ok" in data && data.ok === false) throw new Error(toText(data.reason || "LLM_ERROR"));
      setConsultation(data as Consultation);
      setPhase("ready");
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "LLM_ERROR";
      setError(ERROR_TEXT[code] || ERROR_TEXT.LLM_ERROR);
      setPhase("ready");
    }
  }

  function reset() {
    if (busy) return;
    idempotencyKeyRef.current = makeIdempotencyKey();
    setConsultation(null);
    setChatInput("");
    setNotice("");
    setError("");
    setPhase("idle");
  }

  return (
    <main className="min-h-screen bg-[#090b18] text-slate-100">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl gap-0 lg:grid-cols-[minmax(360px,440px)_1fr]">
        <form onSubmit={handleSubmit} className="border-b border-white/10 bg-[#101426] px-5 py-6 sm:px-8 lg:border-b-0 lg:border-r">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-200">Western Astrology</p>
              <h1 className="mt-2 text-3xl font-black tracking-normal text-white">점성술 AI 상담</h1>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-full border border-amber-200/40 bg-amber-300/10">
              <Moon className="h-6 w-6 text-amber-200" aria-hidden="true" />
            </div>
          </div>

          <div className="mb-5 rounded-md border border-amber-200/20 bg-[#18142b] p-4 text-sm text-amber-50/85">
            <div className="flex items-start gap-2">
              <Stars className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" aria-hidden="true" />
              <p>출생시간을 모르면 상승궁과 하우스 흐름은 조심스럽게 다루고, 행성의 별자리와 주요 각도 중심으로 읽습니다.</p>
            </div>
          </div>

          <div className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-200">
              이름 또는 닉네임
              <input className="h-11 rounded-md border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-amber-200" value={form.name} onChange={(event) => patchForm({ name: event.target.value })} autoComplete="name" />
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-semibold text-slate-200">
                성별
                <select className="h-11 rounded-md border border-white/10 bg-[#171b31] px-3 text-white outline-none focus:border-amber-200" value={form.gender} onChange={(event) => patchForm({ gender: event.target.value })}>
                  <option value="">선택</option>
                  <option value="female">여성</option>
                  <option value="male">남성</option>
                  <option value="other">기타/미입력</option>
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-200">
                생년월일
                <input className="h-11 rounded-md border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-amber-200" type="date" value={form.birthDate} onChange={(event) => patchForm({ birthDate: event.target.value })} />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
              <label className="grid gap-1.5 text-sm font-semibold text-slate-200">
                출생시간
                <input className="h-11 rounded-md border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-amber-200 disabled:opacity-50" type="time" value={form.birthTime} disabled={form.birthTimeUnknown} onChange={(event) => patchForm({ birthTime: event.target.value })} />
              </label>
              <label className="flex items-end gap-2 pb-2 text-sm font-semibold text-slate-200">
                <input className="h-4 w-4 accent-amber-300" type="checkbox" checked={form.birthTimeUnknown} onChange={(event) => patchForm({ birthTimeUnknown: event.target.checked })} />
                출생시간 모름
              </label>
            </div>

            <label className="grid gap-1.5 text-sm font-semibold text-slate-200">
              출생지 빠른 선택
              <select className="h-11 rounded-md border border-white/10 bg-[#171b31] px-3 text-white outline-none focus:border-amber-200" value={form.placeKey} onChange={(event) => handlePresetChange(event.target.value)}>
                {PLACE_PRESETS.map((place) => <option key={place.key} value={place.key}>{place.label}</option>)}
                <option value="custom">직접 입력</option>
              </select>
            </label>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-semibold text-slate-200">
                도시
                <input className="h-11 rounded-md border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-amber-200" value={form.city} onChange={(event) => patchForm({ city: event.target.value, placeKey: "custom" })} />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-200">
                국가
                <input className="h-11 rounded-md border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-amber-200" value={form.country} onChange={(event) => patchForm({ country: event.target.value, placeKey: "custom" })} />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="grid gap-1.5 text-sm font-semibold text-slate-200">
                위도
                <input className="h-11 rounded-md border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-amber-200" inputMode="decimal" value={form.latitude} onChange={(event) => patchForm({ latitude: event.target.value, placeKey: "custom" })} />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-200">
                경도
                <input className="h-11 rounded-md border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-amber-200" inputMode="decimal" value={form.longitude} onChange={(event) => patchForm({ longitude: event.target.value, placeKey: "custom" })} />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-200">
                시간대
                <input className="h-11 rounded-md border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-amber-200" value={form.timezone} onChange={(event) => patchForm({ timezone: event.target.value, placeKey: "custom" })} placeholder="Asia/Seoul" />
              </label>
            </div>

            <label className="grid gap-1.5 text-sm font-semibold text-slate-200">
              상담 주제
              <select className="h-11 rounded-md border border-white/10 bg-[#171b31] px-3 text-white outline-none focus:border-amber-200" value={form.topic} onChange={(event) => patchForm({ topic: event.target.value })}>
                {TOPICS.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
              </select>
            </label>

            <label className="grid gap-1.5 text-sm font-semibold text-slate-200">
              현재 가장 궁금한 질문
              <textarea className="min-h-28 rounded-md border border-white/10 bg-white/5 px-3 py-3 text-white outline-none focus:border-amber-200" value={form.userQuestion} onChange={(event) => patchForm({ userQuestion: event.target.value })} maxLength={1200} />
            </label>
          </div>

          <div className="mt-5 grid gap-3">
            <button type="submit" disabled={busy} className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-amber-300 px-4 text-sm font-black text-[#17110a] shadow-lg shadow-amber-950/30 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
              점성술 AI 상담 받기
            </button>
            <button type="button" disabled={busy} onClick={reset} className="h-10 rounded-md border border-white/10 px-3 text-sm font-bold text-slate-200 disabled:opacity-50">
              새 상담 준비
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
            {phase === "payment" ? <WalletCards className="h-4 w-4 text-amber-200" aria-hidden="true" /> : <CalendarDays className="h-4 w-4 text-amber-200" aria-hidden="true" />}
            <span>{phaseText}</span>
          </div>
          {notice && <p className="mt-3 rounded-md border border-amber-200/20 bg-amber-200/10 p-3 text-sm text-amber-50">{notice}</p>}
          {error && <p className="mt-3 rounded-md border border-rose-300/30 bg-rose-400/10 p-3 text-sm text-rose-100">{error}</p>}
        </form>

        <section className="relative overflow-hidden px-5 py-6 sm:px-8 lg:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_10%,rgba(251,191,36,0.16),transparent_28%),radial-gradient(circle_at_75%_24%,rgba(56,189,248,0.12),transparent_32%)]" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-4xl gap-5">
            <div className="rounded-md border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-wrap items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-white/10">
                  <MapPin className="h-5 w-5 text-amber-200" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-100">{form.city || "출생지"} · {form.topic}</p>
                  <p className="text-xs text-slate-300">{phaseText}</p>
                </div>
              </div>
            </div>

            {consultation && (
              <div className="grid gap-5">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {[
                    ["Sun", pointLabel(highlights?.sun)],
                    ["Moon", pointLabel(highlights?.moon)],
                    ["Ascendant", highlights?.ascendant ? pointLabel(highlights.ascendant) : "출생시간 제한"],
                    ["Chart Ruler", highlights?.chartRuler || "제한"],
                    ["상담 키워드", (highlights?.keywords || []).join(" · ")],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-md border border-amber-200/20 bg-[#14182c]/90 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-200">{label}</p>
                      <p className="mt-2 text-sm font-bold text-white">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 xl:grid-cols-3">
                  <SummaryCard title="주요 행성" items={(chart?.planets || []).slice(0, 7).map((planet) => `${planet.label || planet.name} ${planet.signKo || planet.sign}${planet.retrograde ? " R" : ""}`)} />
                  <SummaryCard title="하우스" items={(chart?.houses || []).slice(0, 6).map((house) => `${house.house}하우스 ${house.signKo || house.sign}${house.planets?.length ? ` · ${house.planets.join(", ")}` : ""}`)} />
                  <SummaryCard title="주요 각도" items={(chart?.majorAspects || []).slice(0, 6).map((aspect) => `${aspect.planetA} ${aspectLabel(aspect.aspect)} ${aspect.planetB}`)} />
                </div>

                <div className="grid gap-4">
                  {consultation.messages.map((message, index) => (
                    <article key={`${message.role}-${index}`} className={message.role === "assistant" ? "rounded-md border border-white/10 bg-white/[0.06] p-5" : "ml-auto max-w-2xl rounded-md bg-amber-300 px-4 py-3 text-[#17110a]"}>
                      <p className="whitespace-pre-wrap text-sm leading-7">{message.content}</p>
                    </article>
                  ))}
                </div>

                <div className="flex gap-2 rounded-md border border-white/10 bg-[#101426] p-2">
                  <input className="min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none" value={chatInput} onChange={(event) => setChatInput(event.target.value)} onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSendMessage();
                    }
                  }} placeholder="더 묻고 싶은 흐름을 적어 주세요" />
                  <button type="button" disabled={!assistantMessages.length || busy || chatInput.trim().length < 2} onClick={() => void handleSendMessage()} className="grid h-10 w-10 place-items-center rounded-md bg-amber-300 text-[#17110a] disabled:opacity-50" aria-label="추가 질문 보내기">
                    {phase === "chat" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                  </button>
                </div>
              </div>
            )}

            {!consultation && (
              <div className="grid min-h-[50vh] place-items-center rounded-md border border-white/10 bg-white/[0.035] p-8 text-center">
                <div>
                  <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full border border-amber-200/30 bg-amber-200/10">
                    <Sparkles className="h-8 w-8 text-amber-200" aria-hidden="true" />
                  </div>
                  <p className="text-lg font-black text-white">차트가 열리면 이곳에서 상담이 이어집니다.</p>
                  <p className="mt-2 text-sm text-slate-300">결제나 이용권 확인이 끝나면 자동으로 시작됩니다.</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function SummaryCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-white/10 bg-[#101426]/90 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-200">{title}</p>
      <div className="mt-3 grid gap-2">
        {(items.length ? items : ["입력 정보 기준으로 제한"]).map((item) => (
          <span key={item} className="rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100">{item}</span>
        ))}
      </div>
    </div>
  );
}
