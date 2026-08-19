"use client";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { readAiProfileSeed, type AiPrefillSeed } from "@/app/_lib/ai-prefill-seed";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import { PriceBadge } from "@/app/components/PriceBadge";
import { AlertCircle, CalendarDays, CheckCircle2, ExternalLink, Loader2, MapPin, Moon, RotateCcw, Sparkles, Stars, WalletCards } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import AnalysisBasisLoading from "@/components/fortune/AnalysisBasisLoading";
import { fetchAnalysisBasis, type AnalysisBasis } from "@/lib/fortune/analysis-basis";
import { isRetriableResultPollFailure, runAccessCheckWithTransientRetry } from "@/app/_lib/consultationResultPolling";
import { toDisplayText } from "@/lib/llm-text";
import {
  beginPaidFeatureGateCheck,
  completePaidFeatureGateCheck,
  failPaidFeatureGateCheck,
  holdPaidFeatureGateOpen,
  releasePaidFeatureGate,
  runBillingCoinGate,
  primePaymentEligibility,
} from "@/app/_lib/billing-client";

type AccessType = "pass" | "paid" | "subscription" | "admin";
type FlowPhase = "idle" | "access" | "payment" | "reading" | "ready";
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
const FEATURE_TITLE = "점성술 전문가 상담";
// 가격 정본은 worker/lib/paid-feature-registry.js 의 "astrology-ai-consultation"(300코인 / 30,000원).
// 여기 값은 서버가 runtimeGate 로 가격을 실어 주지 못했을 때의 폴백일 뿐인데, 390/39,000 으로 어긋나
// 있어 결제창에 39,000원을 보여 주고 실제로는 30,000원이 청구될 수 있었다. 정본과 어긋나게 두지 말 것.
const FEATURE_COST = 300;
const FEATURE_AMOUNT_KRW = 30000;
const API_ENDPOINTS = {
  ensureAccess: "/api/astrology-ai/ensure-access",
  start: "/api/astrology-ai/start",
  message: "/api/astrology-ai/message",
  basis: "/api/astrology-ai/basis",
} as const;

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
  PAYMENT_REQUIRED: "점성술 전문가 상담 이용권이 필요합니다. 결제창을 열어드릴게요.",
  PAYMENT_VERIFY_FAILED: "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.",
  PAYMENT_CANCELLED: "결제가 취소되었습니다. 필요할 때 다시 진행할 수 있습니다.",
  INVALID_INPUT: "생년월일, 출생시간, 출생지 정보를 다시 확인해 주세요.",
  PLACE_ERROR: "출생지 정보를 확인하지 못했습니다. 도시와 국가를 다시 입력해 주세요.",
  CALCULATION_ERROR: "점성술 차트 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.",
  SERVER_ERROR: "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.",
  LLM_ERROR: "전문가 상담 답변을 생성하지 못했습니다. 이용권 또는 결제 권한은 보존되었으니 다시 시도해 주세요.",
  GENERATION_TIMEOUT: "상담 생성이 평소보다 오래 걸리고 있습니다. 페이지를 닫지 말고 잠시 후 다시 시도해 주세요.",
  RATE_LIMITED: "요청이 잠시 몰렸습니다. 잠시 후 다시 시도해 주세요.",
  TEMPORARY_UNAVAILABLE: "지금 접속이 잠시 불안정합니다. 이용권은 그대로 보존되니, 잠시 후 다시 시도해 주세요.",
};

const PROGRESS_STEPS = [
  { title: "입력값 정렬", description: "생년월일, 출생시간, 출생지 좌표를 상담 가능한 형태로 정리합니다." },
  { title: "권한 확인", description: "이용권, 월정석, 단건결제 권한을 차례로 확인합니다." },
  { title: "차트 계산", description: "별자리 차트를 펼치고 있습니다. 태어난 순간의 태양, 달, 행성, 상승궁과 하우스 축을 계산합니다." },
  { title: "핵심 근거 선별", description: "실제 계산된 행성·하우스·각도만 골라 상담 흐름으로 엮습니다." },
  { title: "상담문 작성", description: "행성과 별자리의 흐름을 읽고 있습니다. 질문에 먼저 닿고, 차트 근거와 현실 조언을 이어갑니다." },
  { title: "결과 준비", description: "새 탭에서 열 수 있는 별자리 상담 전문을 정리합니다." },
];

const FIELD_CLASS = "h-12 rounded-lg border border-white/10 bg-white/[0.065] px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-[#f5d487] focus:bg-white/[0.085] focus:ring-2 focus:ring-[#f5d487]/25 disabled:cursor-not-allowed disabled:opacity-50";
const SELECT_CLASS = "h-12 rounded-lg border border-white/10 bg-[#121735] px-4 text-white outline-none transition focus:border-[#f5d487] focus:ring-2 focus:ring-[#f5d487]/25";
const PANEL_CLASS = "rounded-lg border border-white/10 bg-[#0b1027]/80 p-5 shadow-2xl shadow-black/25 ring-1 ring-white/[0.03] backdrop-blur sm:p-6";
const LABEL_CLASS = "grid gap-2 text-sm font-semibold text-slate-200";

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

const applyProfileSeedToForm = (form: FormState, profile: AiPrefillSeed): FormState => {
  if (!profile.name && !profile.gender && !profile.birthDate && !profile.birthTime && profile.birthTimeUnknown === undefined && !profile.timezone && !profile.city) {
    return form;
  }
  return {
    ...form,
    name: profile.name || form.name,
    gender: profile.gender || form.gender,
    birthDate: profile.birthDate || form.birthDate,
    birthTimeUnknown: profile.birthTimeUnknown ?? form.birthTimeUnknown,
    birthTime:
      profile.birthTimeUnknown === true
        ? ""
        : profile.birthTime || form.birthTime,
    timezone: profile.timezone || form.timezone,
    city: profile.city || form.city,
    country: profile.country || form.country,
    latitude: profile.latitude || form.latitude,
    longitude: profile.longitude || form.longitude,
    placeKey: profile.city ? "custom" : form.placeKey,
  };
};

const buildInitialForm = (): FormState => applyProfileSeedToForm(defaultForm(), readAiProfileSeed());

function makeIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return `astro-ai-${crypto.randomUUID()}`;
  return `astro-ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toText(value: unknown) {
  return toDisplayText(value);
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
  }, { retryOn401: false });
  const data = await response.json().catch(() => ({}));
  return { response, data: data as T };
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

// 생성이 오래 걸릴 때(202) 결과 엔드포인트를 폴링해 수렴시킨다.
// CF rate-limit(10초당 100회) 대비 최대 1req/3~8s, 상한 40회(≈5분, 서버 신선도 창 480s 이내).
// 첫 폴은 빠르게(0.7s) 프로브해 조기 완료를 즉시 잡고, 이후 3~8s로 램프한다.
const RESULT_POLL_BACKOFF_MS = [700, 3000, 5000, 8000];
const RESULT_POLL_MAX_ATTEMPTS = 40;

async function pollAstrologyResult(sessionId: string): Promise<Consultation> {
  for (let attempt = 0; attempt < RESULT_POLL_MAX_ATTEMPTS; attempt += 1) {
    await sleep(RESULT_POLL_BACKOFF_MS[Math.min(attempt, RESULT_POLL_BACKOFF_MS.length - 1)]);
    let response: Response;
    try {
      response = await authFetch(`/api/astrology-ai/result/${encodeURIComponent(sessionId)}`, { method: "GET" }, { retryOn401: false });
    } catch {
      continue;
    }
    if (response.status === 202) continue;
    if (response.status === 429) throw new Error("RATE_LIMITED");
    if (response.status === 404 || response.status === 409) throw new Error("LLM_ERROR");
    if (!response.ok) throw new Error("SERVER_ERROR");
    const data = await response.json().catch(() => ({}));
    return data as Consultation;
  }
  throw new Error("GENERATION_TIMEOUT");
}

function pointLabel(point?: ChartPoint | null) {
  if (!point?.sign) return "제한";
  const degree = Number.isFinite(Number(point.degree)) ? `${Number(point.degree).toFixed(1)}°` : "";
  return `${point.signKo || point.sign} ${degree}`.trim();
}

export default function AstrologyAiClient() {
  const [form, setForm] = useState<FormState>(buildInitialForm);
  const [phase, setPhase] = useState<FlowPhase>("idle");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  // 서버가 계산한 차트 근거 — 대기실이 실제 값을 단계별로 보여 준다.
  const [basis, setBasis] = useState<AnalysisBasis | null>(null);
  const [resultUrl, setResultUrl] = useState("");
  const [resultOpenMessage, setResultOpenMessage] = useState("");
  const [progressIndex, setProgressIndex] = useState(0);
  const lockRef = useRef(false);
  const idempotencyKeyRef = useRef(makeIdempotencyKey());
  const progressTimersRef = useRef<number[]>([]);
  const { seed: profileSeed, seedVersion, reload: reloadProfileSeed } = useAiProfileSeed();
  const formTouchedRef = useRef(false);

  // 서버에서 프로필 카드가 뒤늦게 도착해도, 사용자가 입력을 시작하기 전이라면 폼에 반영
  useEffect(() => {
    if (!profileSeed) return;
    setForm((prev) => (formTouchedRef.current ? prev : applyProfileSeedToForm(prev, profileSeed)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedVersion]);

  function loadFormFromProfileCard() {
    void reloadProfileSeed().then((seed) => {
      if (seed) setForm((prev) => applyProfileSeedToForm(prev, seed));
    });
  }

  const busy = phase === "access" || phase === "payment" || phase === "reading";
  const highlights = consultation?.chartHighlights;

  const phaseText = useMemo(() => {
    if (phase === "access") return "권한 확인 전, 입력값을 차분히 맞추고 있습니다";
    if (phase === "payment") return "결제창을 확인해 주세요";
    if (phase === "reading") return PROGRESS_STEPS[Math.min(progressIndex, PROGRESS_STEPS.length - 1)].description;
    if (phase === "ready") return "결과가 준비되었습니다";
    return "출생 정보와 질문을 입력해 주세요";
  }, [phase, progressIndex]);

  useEffect(() => {
    return () => {
      progressTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      progressTimersRef.current = [];
    };
  }, []);

  function patchForm(patch: Partial<FormState>) {
    formTouchedRef.current = true;
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

  function clearProgressTimers() {
    progressTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    progressTimersRef.current = [];
  }

  function scheduleReadingProgress() {
    clearProgressTimers();
    progressTimersRef.current = [
      window.setTimeout(() => setProgressIndex(3), 1400),
      window.setTimeout(() => setProgressIndex(4), 3600),
      window.setTimeout(() => setProgressIndex(5), 7200),
    ];
  }

  function resultPath(sessionId: string) {
    return `/astrology-ai/result?id=${encodeURIComponent(sessionId)}`;
  }

  function openResultPage(url: string) {
    if (!url || typeof window === "undefined") return;
    console.info("[AstrologyAI] result open requested", { url });
    const opened = window.open(url, "_blank");
    if (opened) {
      opened.opener = null;
      setResultOpenMessage("결과 페이지를 새 탭으로 열었습니다.");
      return;
    }
    setResultOpenMessage("브라우저가 자동 새 탭 열기를 막았습니다. 아래 버튼으로 결과를 열어 주세요.");
  }

  async function startConsultation(idempotencyKey: string, access: Record<string, unknown>) {
    setPhase("reading");
    // 다음 화면(생성 로딩)이 마운트되는 시점 — 게이트 오버레이 hold를 해제한다.
    releasePaidFeatureGate(idempotencyKey);
    setProgressIndex(2);
    scheduleReadingProgress();
    console.info("[AstrologyAI] generation started", { requestId: idempotencyKey });
    type StartResponse = Consultation | { ok?: boolean; reason?: string; message?: string; sessionId?: string; status?: string };
    let response: Response;
    let data: StartResponse;
    try {
      ({ response, data } = await postJson<StartResponse>(API_ENDPOINTS.start, { ...buildPayload(), ...access }, idempotencyKey));
    } catch {
      // 네트워크 순단 시 같은 idempotencyKey로 1회 재시도 — 서버가 이미 생성 중이면 202로 수렴한다.
      ({ response, data } = await postJson<StartResponse>(API_ENDPOINTS.start, { ...buildPayload(), ...access }, idempotencyKey));
    }
    let next: Consultation;
    if (response.status === 202) {
      const pendingSessionId = toText(asRecord(data).sessionId);
      if (!pendingSessionId) throw new Error("SERVER_ERROR");
      console.info("[AstrologyAI] generation pending, polling result", { sessionId: pendingSessionId });
      next = await pollAstrologyResult(pendingSessionId);
    } else {
      if ("ok" in data && data.ok === false) {
        const reason = toText(data.reason || "SERVER_ERROR");
        throw new Error(reason || "SERVER_ERROR");
      }
      next = data as Consultation;
    }
    if (!next?.sessionId || !Array.isArray(next.messages)) throw new Error("SERVER_ERROR");
    const assistantContent = next.messages.find((message) => message.role === "assistant")?.content?.trim() || "";
    if (!assistantContent) {
      console.error("[AstrologyAI] generation empty result", { sessionId: next.sessionId, status: next.status });
      throw new Error("LLM_ERROR");
    }
    const url = resultPath(next.sessionId);
    setConsultation(next);
    setResultUrl(url);
    setProgressIndex(5);
    setPhase("ready");
    setNotice("");
    setError("");
    clearProgressTimers();
    console.info("[AstrologyAI] generation success", { sessionId: next.sessionId });
    openResultPage(url);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || lockRef.current) return;
    console.info("[AstrologyAI] submit started");
    setProgressIndex(0);
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
    setProgressIndex(1);
    // 근거는 결제/생성과 무관한 순수 계산이라 기다리지 않고 병렬로 받는다(실패하면 null이라 흐름을 막지 않는다).
    void fetchAnalysisBasis(API_ENDPOINTS.basis, buildPayload()).then(setBasis);
    beginPaidFeatureGateCheck({
      featureKey: FEATURE_KEY,
      requestId: idempotencyKey,
      title: "이용권 확인",
      reason: FEATURE_TITLE,
      paymentMode: "MEMBERSHIP_PASS",
    });
    // 이용권 판정(unlock-status)을 아래 접근 확인 왕복과 겹쳐 돌린다 — 결제 게이트가 같은 키로 재사용해 직렬 왕복이 1회 준다.
    void primePaymentEligibility({
      featureKey: FEATURE_KEY,
      categoryKey: "premium-consultation",
      subFeatureKey: FEATURE_KEY,
      reason: FEATURE_TITLE,
      cost: FEATURE_COST,
      coinPrice: FEATURE_COST,
      amountKRW: FEATURE_AMOUNT_KRW,
    });
    // 확인 완료 후 다음 화면(생성 로딩)이 실제로 뜰 때까지 게이트 오버레이를 유지해 "확인 중 → 공백"을 막는다.
    // release는 startConsultation의 setPhase("reading")에서 호출한다(안전장치 상한 8초).
    holdPaidFeatureGateOpen({ requestId: idempotencyKey, maxMs: 8000 });
    try {
      console.info("[AstrologyAI] access check started", { requestId: idempotencyKey });
      // 이용권 확인 앞단의 일시적 DB 장애(503 DB_DEGRADED 등)는 재시도로 흡수한다 — 하드 "이용권 확인 실패"로 굳지 않게.
      const { response, data } = await runAccessCheckWithTransientRetry(
        () => postJson<EnsureAccessResult>(API_ENDPOINTS.ensureAccess, buildPayload(), idempotencyKey),
      );
      if (data.ok) {
        console.info("[AstrologyAI] access check success", { requestId: idempotencyKey, accessType: data.accessType });
        completePaidFeatureGateCheck({
          featureKey: FEATURE_KEY,
          requestId: idempotencyKey,
          title: "이용권 확인 완료",
          reason: FEATURE_TITLE,
          paymentMode: "MEMBERSHIP_PASS",
          message: "이용권 확인이 끝났습니다. 별자리 흐름을 읽고 있습니다.",
        });
        await startConsultation(idempotencyKey, { accessToken: data.accessToken, accessType: data.accessType });
        return;
      }
      const accessResult = data as Exclude<EnsureAccessResult, { ok: true }>;
      if (accessResult.reason === "LOGIN_REQUIRED" || response.status === 401) throw new Error("LOGIN_REQUIRED");
      if (accessResult.reason === "INVALID_INPUT") throw new Error("INVALID_INPUT");
      // 재시도를 소진하고도 일시적 장애가 지속되면, dead-end 대신 결제창(단건+월정석)을 연다(요구사항: 이용권 확인
      // 실패 시 무조건 결제창). runBillingCoinGate가 billing.js coin-gate로 pass를 재검사(W2 재시도)해 처리한다.
      const passGateDegraded = isRetriableResultPollFailure(response.status, accessResult);
      if (!passGateDegraded && accessResult.reason !== "PAYMENT_REQUIRED") throw new Error("SERVER_ERROR");

      setNotice(ERROR_TEXT.PAYMENT_REQUIRED);
      setPhase("payment");
      const paymentRequired = accessResult as Extract<EnsureAccessResult, { ok: false; reason: "PAYMENT_REQUIRED" }>;
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
      });
      if (!gate.ok || !gate.data) {
        const code = toText(gate.error?.code || (gate.status === 401 ? "LOGIN_REQUIRED" : "PAYMENT_VERIFY_FAILED")).toUpperCase();
        throw new Error(code === "PAYMENT_CANCELLED" ? "PAYMENT_CANCELLED" : code === "AUTH_REQUIRED" ? "LOGIN_REQUIRED" : "PAYMENT_VERIFY_FAILED");
      }
      console.info("[AstrologyAI] access check success", { requestId: idempotencyKey, accessType: "billing-gate" });
      await startConsultation(idempotencyKey, extractPaymentContext(gate, idempotencyKey));
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "SERVER_ERROR";
      const paymentCancelled = code === "PAYMENT_CANCELLED";
      if (code === "LOGIN_REQUIRED" || code === "PAYMENT_VERIFY_FAILED" || code === "PAYMENT_CANCELLED" || code === "INVALID_INPUT") {
        console.error("[AstrologyAI] access check failed", { requestId: idempotencyKey, code });
      } else {
        console.error("[AstrologyAI] generation empty result", { requestId: idempotencyKey, code });
      }
      // 일시적 접속 장애는 이용권 결함이 아니므로 "이용권 확인 실패"로 표기하지 않는다.
      const isTransient = code === "TEMPORARY_UNAVAILABLE" || code === "RATE_LIMITED";
      setError(ERROR_TEXT[code] || ERROR_TEXT.SERVER_ERROR);
      failPaidFeatureGateCheck({
        featureKey: FEATURE_KEY,
        requestId: idempotencyKey,
        title: isTransient ? "잠시 후 다시 시도" : "이용권 확인 실패",
        reason: FEATURE_TITLE,
        paymentMode: "MEMBERSHIP_PASS",
        message: ERROR_TEXT[code] || ERROR_TEXT.SERVER_ERROR,
        cancelled: paymentCancelled,
      });
      setPhase("idle");
      clearProgressTimers();
    } finally {
      lockRef.current = false;
    }
  }

  function reset() {
    if (busy) return;
    clearProgressTimers();
    idempotencyKeyRef.current = makeIdempotencyKey();
    setConsultation(null);
    setResultUrl("");
    setResultOpenMessage("");
    setNotice("");
    setError("");
    setProgressIndex(0);
    setPhase("idle");
  }

  const activeStep = phase === "ready" ? PROGRESS_STEPS.length - 1 : Math.min(progressIndex, PROGRESS_STEPS.length - 1);
  const progressPercent = phase === "idle" ? 8 : Math.round(((activeStep + 1) / PROGRESS_STEPS.length) * 100);

  return (
    <main className="astro-ai-page relative min-h-screen overflow-hidden bg-[#050816] text-slate-100 [font-family:var(--font-body)]">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,#050816_0%,#0b1028_42%,#050816_100%)]" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-0 opacity-45 [background-image:radial-gradient(#f8e7b0_1px,transparent_1px),radial-gradient(#a9b7ff_1px,transparent_1px)] [background-position:0_0,32px_44px] [background-size:86px_86px,132px_132px]" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f5d487]/60 to-transparent" aria-hidden="true" />

      <section className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-6">
            <header className="overflow-hidden rounded-lg border border-white/10 bg-[#0b1027]/[0.82] p-6 shadow-2xl shadow-black/30 ring-1 ring-white/[0.03] backdrop-blur sm:p-8">
              <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#f5d487]">Western Astrology Salon</p>
                  <h1 className="mt-3 text-4xl font-black leading-tight text-white [font-family:var(--font-premium)] sm:text-5xl">
                    점성술 전문가 상담
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-8 text-slate-200">
                    태어난 순간의 하늘과 지금의 별빛을 한 자리 위에 올려, 질문의 핵심과 선택의 방향을 차분히 비춥니다.
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {["출생 정보", "차트 계산", "상담 전문"].map((label, index) => (
                      <div key={label} className="rounded-lg border border-white/10 bg-white/[0.045] px-4 py-3">
                        <p className="text-xs font-black text-[#f5d487]">0{index + 1}</p>
                        <p className="mt-1 text-sm font-bold text-white">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative mx-auto grid aspect-square w-48 place-items-center sm:w-56 lg:mx-0">
                  <div className="absolute inset-0 rounded-full border border-[#f5d487]/40" />
                  <div className="absolute inset-5 rounded-full border border-white/10" />
                  <div className="absolute inset-10 rounded-full border border-sky-200/20" />
                  <div className="absolute h-px w-full bg-gradient-to-r from-transparent via-[#f5d487]/55 to-transparent" />
                  <div className="absolute h-full w-px bg-gradient-to-b from-transparent via-sky-200/40 to-transparent" />
                  <div className="grid h-24 w-24 place-items-center rounded-full border border-[#f5d487]/35 bg-[#050816]/70 shadow-xl shadow-[#f5d487]/10">
                    <Moon className="h-12 w-12 text-[#f5d487]" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </header>

            <form id="astrology-ai-form" onSubmit={handleSubmit} className="space-y-5">
              <section className={PANEL_CLASS}>
                <div className="mb-5 flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#f5d487]/30 bg-[#f5d487]/10">
                    <CalendarDays className="h-5 w-5 text-[#f5d487]" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-black text-white">출생 정보</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-300">차트의 태양, 달, 상승궁을 세우는 첫 기준입니다.</p>
                  </div>
                  <button
                    type="button"
                    onClick={loadFormFromProfileCard}
                    className="shrink-0 rounded-lg border border-[#f5d487]/35 bg-[#f5d487]/10 px-3 py-2 text-xs font-bold text-[#f5d487] transition hover:bg-[#f5d487]/20"
                    aria-label="프로필 카드에서 출생 정보 불러오기"
                  >
                    프로필 카드에서 불러오기
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={LABEL_CLASS}>
                    이름 또는 닉네임
                    <input className={FIELD_CLASS} value={form.name} onChange={(event) => patchForm({ name: event.target.value })} autoComplete="name" placeholder="예: 지우" />
                  </label>
                  <label className={LABEL_CLASS}>
                    성별
                    <select className={SELECT_CLASS} value={form.gender} onChange={(event) => patchForm({ gender: event.target.value })}>
                      <option value="">선택</option>
                      <option value="female">여성</option>
                      <option value="male">남성</option>
                      <option value="other">기타/미입력</option>
                    </select>
                  </label>
                  <label className={LABEL_CLASS}>
                    생년월일
                    <input className={FIELD_CLASS} {...birthDateTextInputProps(form.birthDate, (nextBirthDate) => patchForm({ birthDate: nextBirthDate }))} />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px]">
                    <label className={LABEL_CLASS}>
                      출생시간
                      <input className={FIELD_CLASS} type="time" value={form.birthTime} disabled={form.birthTimeUnknown} onChange={(event) => patchForm({ birthTime: event.target.value })} />
                    </label>
                    <label className="flex min-h-12 items-end gap-2 pb-3 text-sm font-semibold text-slate-200">
                      <input className="h-4 w-4 accent-[#f5d487]" type="checkbox" checked={form.birthTimeUnknown} onChange={(event) => patchForm({ birthTimeUnknown: event.target.checked })} />
                      <span>시간 모름</span>
                    </label>
                  </div>
                </div>
                {form.birthTimeUnknown && (
                  <p className="mt-4 rounded-lg border border-[#f5d487]/25 bg-[#f5d487]/10 px-4 py-3 text-sm leading-6 text-amber-50">
                    출생시간 미상으로 상승궁과 하우스는 제한적으로 다루고, 태양·달·행성 각도를 중심으로 상담합니다.
                  </p>
                )}
              </section>

              <section className={PANEL_CLASS}>
                <div className="mb-5 flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#f5d487]/30 bg-[#f5d487]/10">
                    <MapPin className="h-5 w-5 text-[#f5d487]" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-white">출생지</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-300">도시와 좌표가 하우스 축과 시간대 계산을 보정합니다.</p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <label className={LABEL_CLASS}>
                    빠른 선택
                    <select className={SELECT_CLASS} value={form.placeKey} onChange={(event) => handlePresetChange(event.target.value)}>
                      {PLACE_PRESETS.map((place) => <option key={place.key} value={place.key}>{place.label}</option>)}
                      <option value="custom">직접 입력</option>
                    </select>
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className={LABEL_CLASS}>
                      도시
                      <input className={FIELD_CLASS} value={form.city} onChange={(event) => patchForm({ city: event.target.value, placeKey: "custom" })} placeholder="예: 서울" />
                    </label>
                    <label className={LABEL_CLASS}>
                      국가
                      <input className={FIELD_CLASS} value={form.country} onChange={(event) => patchForm({ country: event.target.value, placeKey: "custom" })} placeholder="예: 대한민국" />
                    </label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className={LABEL_CLASS}>
                      위도
                      <input className={FIELD_CLASS} inputMode="decimal" value={form.latitude} onChange={(event) => patchForm({ latitude: event.target.value, placeKey: "custom" })} placeholder="37.5665" />
                    </label>
                    <label className={LABEL_CLASS}>
                      경도
                      <input className={FIELD_CLASS} inputMode="decimal" value={form.longitude} onChange={(event) => patchForm({ longitude: event.target.value, placeKey: "custom" })} placeholder="126.9780" />
                    </label>
                    <label className={LABEL_CLASS}>
                      시간대
                      <input className={FIELD_CLASS} value={form.timezone} onChange={(event) => patchForm({ timezone: event.target.value, placeKey: "custom" })} placeholder="Asia/Seoul" />
                    </label>
                  </div>
                </div>
              </section>

              <section className={PANEL_CLASS}>
                <div className="mb-5 flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#f5d487]/30 bg-[#f5d487]/10">
                    <Stars className="h-5 w-5 text-[#f5d487]" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-white">상담 주제</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-300">지금 가장 깊게 보고 싶은 삶의 장면을 고릅니다.</p>
                  </div>
                </div>
                <label className={`${LABEL_CLASS} mb-4`}>
                  상담 주제 선택
                  <select className={SELECT_CLASS} value={form.topic} onChange={(event) => patchForm({ topic: event.target.value })}>
                    {TOPICS.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {TOPICS.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => patchForm({ topic })}
                      className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-bold leading-5 transition focus:outline-none focus:ring-2 focus:ring-[#f5d487]/35 ${form.topic === topic ? "border-[#f5d487] bg-[#f5d487] text-[#161019] shadow-lg shadow-[#f5d487]/15" : "border-white/10 bg-white/[0.045] text-slate-200 hover:border-[#f5d487]/40 hover:bg-white/[0.075]"}`}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </section>

              <section className={PANEL_CLASS}>
                <div className="mb-5 flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#f5d487]/30 bg-[#f5d487]/10">
                    <Sparkles className="h-5 w-5 text-[#f5d487]" aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-white">현재 질문</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-300">구체적인 질문일수록 차트의 근거가 더 선명하게 이어집니다.</p>
                  </div>
                </div>
                <label className={LABEL_CLASS}>
                  지금 가장 묻고 싶은 것
                  <textarea className="min-h-40 rounded-lg border border-white/10 bg-white/[0.065] px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-[#f5d487] focus:bg-white/[0.085] focus:ring-2 focus:ring-[#f5d487]/25" value={form.userQuestion} onChange={(event) => patchForm({ userQuestion: event.target.value })} maxLength={1200} placeholder="예: 올해 이직을 준비해도 괜찮을지, 지금 관계에서 무엇을 보아야 할지 알고 싶어요." />
                </label>
                <p className="mt-2 text-right text-xs font-semibold text-slate-400">{form.userQuestion.length}/1200</p>
              </section>

              <div className="flex items-center justify-end">
                <PriceBadge featureKey="astrology-ai-consultation" prefix="상담 이용 가격 " />
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <button type="submit" disabled={busy} className="group relative inline-flex min-h-14 items-center justify-center gap-2 overflow-hidden rounded-lg bg-[#f5d487] px-6 text-base font-black text-[#161019] shadow-xl shadow-[#f5d487]/20 transition hover:bg-[#ffe6a8] focus:outline-none focus:ring-2 focus:ring-[#f5d487]/40 disabled:cursor-not-allowed disabled:opacity-60">
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
                  <span className="relative inline-flex items-center gap-2">
                    {busy ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Sparkles className="h-5 w-5" aria-hidden="true" />}
                    별빛 상담 시작
                  </span>
                </button>
                <button type="button" disabled={busy} onClick={reset} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/15 px-5 text-sm font-bold text-slate-100 transition hover:border-[#f5d487]/40 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50">
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  새 상담 준비
                </button>
              </div>
            </form>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            <section className="rounded-lg border border-white/10 bg-[#0b1027]/[0.88] p-5 shadow-2xl shadow-black/30 ring-1 ring-white/[0.03] backdrop-blur" aria-live="polite">
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f5d487]">Consultation Flow</p>
                  <h2 className="mt-1 text-lg font-black text-white">상담 진행</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-300">{phaseText}</p>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.055]">
                  {phase === "ready" ? <CheckCircle2 className="h-6 w-6 text-emerald-300" aria-hidden="true" /> : phase === "payment" ? <WalletCards className="h-6 w-6 text-[#f5d487]" aria-hidden="true" /> : <Moon className="h-6 w-6 text-[#f5d487]" aria-hidden="true" />}
                </span>
              </div>

              <div className="mb-5 h-3 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-sky-200 via-[#f5d487] to-emerald-200 transition-all duration-700 motion-reduce:transition-none" style={{ width: `${progressPercent}%` }} />
              </div>

              <div className="grid gap-3">
                {PROGRESS_STEPS.map((step, index) => {
                  const done = phase === "ready" || index < activeStep;
                  const active = index === activeStep && phase !== "idle";
                  return (
                    <div key={step.title} className={`rounded-lg border p-3 transition ${active ? "border-[#f5d487]/70 bg-[#f5d487]/10" : done ? "border-emerald-300/25 bg-emerald-300/5" : "border-white/10 bg-white/[0.035]"}`}>
                      <div className="flex items-start gap-3">
                        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${done ? "bg-emerald-300 text-[#07131a]" : active ? "bg-[#f5d487] text-[#161019]" : "bg-white/10 text-slate-300"}`}>
                          {done ? "✓" : index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-black text-white">{step.title}</p>
                          <p className="mt-1 text-xs leading-5 text-slate-300">{step.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-lg border border-white/10 bg-[#0b1027]/[0.88] p-5 shadow-2xl shadow-black/30 ring-1 ring-white/[0.03] backdrop-blur">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#f5d487]/30 bg-[#f5d487]/10">
                  <Sparkles className="h-5 w-5 text-[#f5d487]" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-lg font-black text-white">{phase === "ready" ? "결과가 준비되었습니다" : "상담소 대기실"}</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-300">
                    {phase === "ready" ? "상담 전문은 별도 결과 페이지에서 보여드립니다. 저장된 결과는 같은 링크로 다시 열 수 있습니다." : "입력값과 권한 확인이 끝나면 차트 계산과 상담문 작성이 이어집니다."}
                  </p>
                </div>
              </div>

              {/* 기다리는 동안 실제로 계산된 차트 값을 단계별로 드러낸다. 근거 조회가 실패하면
                  기존 진행 단계 문구로 되돌아갈 뿐, 생성 흐름에는 영향을 주지 않는다. */}
              {busy && !consultation && (
                <div className="mt-5 text-slate-200 [--cd-basis-popover-bg:#0b1027]">
                  <AnalysisBasisLoading
                    basis={basis}
                    fallbackLabel={PROGRESS_STEPS[Math.min(progressIndex, PROGRESS_STEPS.length - 1)].title}
                    fallbackDetail={PROGRESS_STEPS[Math.min(progressIndex, PROGRESS_STEPS.length - 1)].description}
                  />
                </div>
              )}

              {consultation && resultUrl && (
                <div className="mt-5 grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <SummaryCard title="태양" items={[pointLabel(highlights?.sun)]} />
                    <SummaryCard title="달" items={[pointLabel(highlights?.moon)]} />
                  </div>
                  <SummaryCard title="상승궁" items={[highlights?.ascendant ? pointLabel(highlights.ascendant) : "출생시간 미상으로 제한적 해석"]} />
                  <button type="button" onClick={() => openResultPage(resultUrl)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#f5d487] px-4 text-sm font-black text-[#161019] transition hover:bg-[#ffe6a8] focus:outline-none focus:ring-2 focus:ring-[#f5d487]/40">
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    새창에서 결과 보기
                  </button>
                  {resultOpenMessage && <p className="text-sm leading-6 text-slate-300">{resultOpenMessage}</p>}
                </div>
              )}

              {notice && <p className="mt-4 rounded-lg border border-[#f5d487]/25 bg-[#f5d487]/10 p-3 text-sm leading-6 text-amber-50">{notice}</p>}
              {error && (
                <div className="mt-4 rounded-lg border border-rose-300/30 bg-rose-400/10 p-4 text-sm text-rose-50">
                  <div className="flex gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <p className="leading-6">{error}</p>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                    <button type="submit" form="astrology-ai-form" className="min-h-10 rounded-lg bg-rose-100 px-3 font-bold text-rose-950">
                      다시 시도
                    </button>
                    <button type="button" onClick={reset} className="min-h-10 rounded-lg border border-white/15 px-3 font-bold text-white">
                      새 상담 준비
                    </button>
                  </div>
                </div>
              )}
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.045] p-4">
      <p className="text-xs font-black uppercase text-[#f5d487]">{title}</p>
      <div className="mt-3 grid gap-2">
        {(items.length ? items : ["입력 정보 기준으로 제한"]).map((item) => (
          <span key={item} className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-slate-100">{item}</span>
        ))}
      </div>
    </div>
  );
}
