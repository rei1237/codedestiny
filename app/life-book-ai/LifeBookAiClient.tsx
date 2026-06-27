"use client";

import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  Moon,
  Sparkles,
  Stars,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { runBillingCoinGate } from "@/app/_lib/billing-client";

type AccessType = "pass" | "paid" | "subscription" | "admin";
type CalendarType = "solar" | "lunar";
type GenderType = "male" | "female" | "unknown" | "";
type FocusAreaType = "overall" | "love" | "money" | "career" | "relationship" | "family" | "lifePurpose" | "turningPoint";
type FlowStatus = "idle" | "opening" | "payment" | "generating" | "completed" | "error";

type ConsultationForm = {
  name: string;
  gender: GenderType;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  calendarType: CalendarType;
  focusArea: FocusAreaType;
};

type PrepareResult =
  | { ok: true; accessToken: string; accessType: AccessType }
  | { ok: false; reason: "PAYMENT_REQUIRED"; paymentPayload?: Record<string, unknown> }
  | { ok: false; reason: "LOGIN_REQUIRED"; message?: string }
  | { ok: false; reason: "INVALID_INPUT"; message: string }
  | { ok: false; reason?: string; message?: string };

type ConsultationResult = {
  ok: boolean;
  sessionId?: string;
  consultationId?: string;
  accessType?: AccessType;
  status?: string;
  reason?: string;
  message?: string;
};

const FEATURE_KEY = "life-book-ai-consultation";
const FEATURE_COST = 500;
const FEATURE_AMOUNT_KRW = 50000;
const FEATURE_MEMBERSHIP_CREDIT_COST = 5000;
const FEATURE_REASON = "인생의 책 AI 상담";
const ROUTE = "/life-book-ai";

const FOCUS_OPTIONS: Array<{ value: FocusAreaType; label: string; hint: string }> = [
  { value: "overall", label: "전체 인생 흐름", hint: "삶 전체의 큰 장면을 넓게 읽습니다." },
  { value: "love", label: "사랑과 인연", hint: "마음이 열리고 이어지는 방식을 깊게 봅니다." },
  { value: "money", label: "재물과 현실", hint: "돈과 안정이 쌓이는 흐름을 살핍니다." },
  { value: "career", label: "일과 재능", hint: "타고난 역할과 성취의 방향을 봅니다." },
  { value: "relationship", label: "인간관계", hint: "사람 사이에서 반복되는 결을 정리합니다." },
  { value: "family", label: "가족과 뿌리", hint: "가까운 인연과 오래된 마음을 읽습니다." },
  { value: "lifePurpose", label: "삶의 목적", hint: "오래 붙잡아야 할 태도를 비춥니다." },
  { value: "turningPoint", label: "인생 전환점", hint: "다음 장으로 넘어가는 시기를 살핍니다." },
];

const FOCUS_TOPIC: Record<FocusAreaType, string> = {
  overall: "전체 인생 흐름",
  love: "사랑과 인연",
  money: "재물과 현실 기반",
  career: "일과 재능",
  relationship: "인간관계",
  family: "가족과 뿌리",
  lifePurpose: "삶의 목적",
  turningPoint: "인생 전환점",
};

const PREVIEW_CHAPTERS = [
  "제1장 타고난 사주의 원형",
  "제2장 성격과 기질",
  "제3장 재능과 일의 방향",
  "제4장 사랑과 인연",
  "제5장 재물과 현실 기반",
  "제6장 인간관계와 가족의 장",
  "제7장 건강과 조후의 균형",
  "제8장 대운으로 보는 인생의 큰 장면",
  "제9장 가까운 시기의 세운 조언",
  "제10장 인생의 책 마지막 문장",
];

const GENERATION_STEPS = [
  "명식의 기본 구조를 계산하고 있어요",
  "타고난 오행과 십성의 균형을 살피고 있어요",
  "조후와 삶의 온도를 해석하고 있어요",
  "성격, 재능, 관계의 반복 패턴을 정리하고 있어요",
  "대운과 세운의 큰 흐름을 읽고 있어요",
  "사랑, 일, 재물, 인연의 장을 집필하고 있어요",
  "마지막 조언과 PDF용 원고를 정리하고 있어요",
  "완성된 책을 새 창에서 열 준비를 하고 있어요",
];

const HERO_BADGES = ["타고난 사주", "대운과 세운", "사랑과 인연", "재물과 직업", "삶의 목적", "인생 전환점"];

const LOGIN_REQUIRED_MESSAGE = "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.";
const PAYMENT_REQUIRED_MESSAGE = "이 리포트는 이용권 또는 결제 확인 후 생성됩니다. 결제창을 확인해 주세요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.";
const INVALID_INPUT_MESSAGE = "인생의 책을 열기 위한 정보가 부족합니다. 생년월일과 성별을 다시 확인해 주세요.";
const BIRTH_TIME_REQUIRED_MESSAGE = "출생시간을 입력하거나 출생시간 모름을 선택해 주세요.";
const SERVER_ERROR_MESSAGE = "인생의 책을 준비하는 중 문제가 발생했습니다. 결제나 이용권은 차감되지 않았습니다.";
const LLM_ERROR_MESSAGE = "인생의 책을 완성하는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.";
const NETWORK_ERROR_MESSAGE = "연결이 불안정해 결과를 불러오지 못했습니다. 새로고침 후 다시 확인해 주세요.";

const defaultForm = (): ConsultationForm => ({
  name: "",
  gender: "",
  birthDate: "",
  birthTime: "",
  birthTimeUnknown: false,
  calendarType: "solar",
  focusArea: "overall",
});

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `lbai-${crypto.randomUUID()}`;
  return `lbai-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toText(value: unknown) {
  return String(value || "").trim();
}

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function maskBirthDate(value: string) {
  const year = value.match(/^(\d{4})-/)?.[1];
  return year ? `${year}-**-**` : "";
}

function formatGender(value: GenderType) {
  if (value === "female") return "여성";
  if (value === "male") return "남성";
  if (value === "unknown") return "비공개";
  return "미선택";
}

function buildResultUrl(attemptId: string, pending = false) {
  const params = new URLSearchParams({ attemptId });
  if (pending) params.set("pending", "1");
  return `/life-book-ai/result?${params.toString()}`;
}

function buildConsultationPayload(form: ConsultationForm, requestId: string) {
  const topic = FOCUS_TOPIC[form.focusArea];
  return {
    serviceType: FEATURE_KEY,
    consultationType: "lifeBook",
    userName: form.name.trim(),
    gender: form.gender || "unknown",
    birthDate: form.birthDate,
    birthTime: form.birthTimeUnknown ? "" : form.birthTime,
    birthTimeUnknown: form.birthTimeUnknown,
    calendarType: form.calendarType,
    focusArea: form.focusArea,
    locale: "ko",
    requestId,
    idempotencyKey: requestId,
    birthInfo: {
      name: form.name.trim(),
      gender: form.gender || "unknown",
      birthDate: form.birthDate,
      birthTime: form.birthTimeUnknown ? "" : form.birthTime,
      birthTimeUnknown: form.birthTimeUnknown,
      calendarType: form.calendarType,
    },
    topic,
  };
}

function validateForm(form: ConsultationForm) {
  if (!form.gender || !form.birthDate || !form.calendarType || !form.focusArea) return INVALID_INPUT_MESSAGE;
  if (!form.birthTimeUnknown && !form.birthTime) return BIRTH_TIME_REQUIRED_MESSAGE;
  if (!form.birthTimeUnknown && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(form.birthTime)) return BIRTH_TIME_REQUIRED_MESSAGE;
  return "";
}

function buildBillingGateInput(paymentPayload: Record<string, unknown>, idempotencyKey: string) {
  const runtimeGate = asRecord(paymentPayload.runtimeGate);
  const cost = toNumber(runtimeGate.cost ?? runtimeGate.coinPrice ?? paymentPayload.cost ?? paymentPayload.coinPrice, FEATURE_COST);
  const amountKRW = toNumber(runtimeGate.amountKRW ?? runtimeGate.amountKrw ?? paymentPayload.amountKRW ?? paymentPayload.amountKrw ?? paymentPayload.paymentAmount, FEATURE_AMOUNT_KRW);
  return {
    categoryKey: toText(runtimeGate.categoryKey ?? paymentPayload.categoryKey) || "premium-consultation",
    subFeatureKey: toText(runtimeGate.subFeatureKey ?? paymentPayload.subFeatureKey) || FEATURE_KEY,
    featureKey: toText(runtimeGate.featureKey ?? paymentPayload.featureKey) || FEATURE_KEY,
    reason: toText(runtimeGate.reason ?? paymentPayload.reason) || FEATURE_REASON,
    productId: toText(runtimeGate.productId ?? paymentPayload.productId) || "life-book-ai",
    productType: toText(runtimeGate.productType ?? paymentPayload.productType) || "life-book-ai",
    serviceType: toText(runtimeGate.serviceType ?? paymentPayload.serviceType) || FEATURE_KEY,
    forceDeduct: true,
    deferUsage: true,
    usagePolicy: "apply_after_success",
    executionKey: `life-book-ai:${idempotencyKey}`,
    requestId: idempotencyKey,
    idempotencyKey,
    cost,
    coinPrice: cost,
    amountKRW,
    amountKrw: amountKRW,
    paymentAmount: amountKRW,
    membershipCreditCost: toNumber(runtimeGate.membershipCreditCost ?? paymentPayload.membershipCreditCost, FEATURE_MEMBERSHIP_CREDIT_COST),
  };
}

async function postJson<T>(path: string, body: Record<string, unknown>, idempotencyKey?: string): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    credentials: "include",
    body: JSON.stringify(idempotencyKey ? { ...body, idempotencyKey } : body),
  });
  return await response.json().catch(() => ({})) as T;
}

export default function LifeBookAiClient() {
  const [form, setForm] = useState<ConsultationForm>(() => defaultForm());
  const [status, setStatus] = useState<FlowStatus>("idle");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [progressTick, setProgressTick] = useState(0);
  const startLockRef = useRef(false);
  const resultWindowRef = useRef<Window | null>(null);
  const idempotencyKeyRef = useRef(createIdempotencyKey());

  useEffect(() => {
    console.info("[LifeBook AI Page Enter]", { route: ROUTE });
    console.info("[LifeBook AI Initial Render Success]", { route: ROUTE, serviceType: FEATURE_KEY });
  }, []);

  const isBusy = status === "opening" || status === "payment" || status === "generating";
  const validationMessage = useMemo(() => validateForm(form), [form]);
  const isReadyToGenerate = !validationMessage;
  const activeStep = Math.min(progressTick % GENERATION_STEPS.length, GENERATION_STEPS.length - 1);
  const progress = status === "completed"
    ? 100
    : isBusy
      ? Math.min(95, 16 + activeStep * 10 + Math.min(9, progressTick))
      : 0;

  useEffect(() => {
    if (!isBusy) return;
    const timer = window.setInterval(() => setProgressTick((prev) => prev + 1), 1400);
    return () => window.clearInterval(timer);
  }, [isBusy]);

  const resetAttempt = useCallback(() => {
    if (isBusy) return;
    idempotencyKeyRef.current = createIdempotencyKey();
    resultWindowRef.current = null;
    setResultUrl("");
    setPopupBlocked(false);
    setProgressTick(0);
    setError("");
    setNotice("");
    setStatus("idle");
  }, [isBusy]);

  const updateField = useCallback(<K extends keyof ConsultationForm>(field: K, value: ConsultationForm[K]) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "birthTimeUnknown" && value === true ? { birthTime: "" } : {}),
    }));
    resetAttempt();
  }, [resetAttempt]);

  const openPendingResultWindow = useCallback((attemptId: string) => {
    const pendingUrl = buildResultUrl(attemptId, true);
    setResultUrl(buildResultUrl(attemptId));
    setPopupBlocked(false);
    if (typeof window === "undefined") return null;
    const nextWindow = window.open(pendingUrl, "_blank");
    if (!nextWindow) {
      setPopupBlocked(true);
      return null;
    }
    resultWindowRef.current = nextWindow;
    return nextWindow;
  }, []);

  const openCompletedResult = useCallback((attemptId: string) => {
    const finalUrl = buildResultUrl(attemptId);
    setResultUrl(finalUrl);
    if (resultWindowRef.current && !resultWindowRef.current.closed) {
      resultWindowRef.current.location.href = finalUrl;
      resultWindowRef.current.focus();
      return;
    }
    setPopupBlocked(true);
  }, []);

  const generateConsultation = useCallback(async (
    payload: ReturnType<typeof buildConsultationPayload>,
    idempotencyKey: string,
    access: { accessToken?: string; billingGate?: Record<string, unknown> },
  ) => {
    setStatus("generating");
    const result = await postJson<ConsultationResult>("/api/life-book-ai/generate", {
      ...payload,
      ...access,
    }, idempotencyKey);

    if (result.ok && result.status === "completed") {
      setStatus("completed");
      setNotice("완성된 인생의 책을 새 창에서 열고 있습니다.");
      setError("");
      setProgressTick(GENERATION_STEPS.length);
      openCompletedResult(idempotencyKey);
      return;
    }

    if (result.ok && result.status === "generating") {
      setNotice("인생의 책을 완성하는 중입니다. 열린 결과 창에서 진행 상태를 확인해 주세요.");
      return;
    }

    const reason = String(result.reason || "");
    if (reason === "LLM_ERROR") throw new Error(LLM_ERROR_MESSAGE);
    if (reason === "PAYMENT_VERIFY_FAILED") throw new Error(PAYMENT_VERIFY_FAILED_MESSAGE);
    throw new Error(result.message || LLM_ERROR_MESSAGE);
  }, [openCompletedResult]);

  const submit = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (startLockRef.current || isBusy) return;

    const requestId = idempotencyKeyRef.current;
    const currentValidation = validateForm(form);
    console.info("[LifeBook AI Submit Start]", {
      route: ROUTE,
      requestId,
      serviceType: FEATURE_KEY,
      focusArea: form.focusArea,
      validation: currentValidation ? "failed" : "passed",
      birthDate: maskBirthDate(form.birthDate),
    });

    if (currentValidation) {
      setError(currentValidation);
      setStatus("error");
      return;
    }

    startLockRef.current = true;
    openPendingResultWindow(requestId);
    const payload = buildConsultationPayload(form, requestId);
    setError("");
    setNotice("");
    setProgressTick(0);
    setStatus("opening");

    try {
      const access = await postJson<PrepareResult>("/api/life-book-ai/prepare", payload, requestId);
      if (access.ok) {
        await generateConsultation(payload, requestId, { accessToken: access.accessToken });
        return;
      }

      const denied = access as Exclude<PrepareResult, { ok: true }>;
      if (denied.reason === "LOGIN_REQUIRED") {
        setError(denied.message || LOGIN_REQUIRED_MESSAGE);
        setStatus("error");
        return;
      }
      if (denied.reason === "INVALID_INPUT") {
        setError(denied.message || INVALID_INPUT_MESSAGE);
        setStatus("error");
        return;
      }
      if (denied.reason === "PAYMENT_REQUIRED") {
        setNotice(PAYMENT_REQUIRED_MESSAGE);
        setStatus("payment");
        const billingInput = buildBillingGateInput(asRecord("paymentPayload" in denied ? denied.paymentPayload : undefined), requestId);
        const gate = await runBillingCoinGate(billingInput);
        if (!gate.ok || !gate.data) {
          const code = String(gate.error?.code || "").toUpperCase();
          if (code === "AUTH_REQUIRED" || code === "LOGIN_REQUIRED") throw new Error(LOGIN_REQUIRED_MESSAGE);
          throw new Error(PAYMENT_VERIFY_FAILED_MESSAGE);
        }
        console.info("[LifeBook AI Payment Success]", {
          route: ROUTE,
          requestId,
          serviceType: FEATURE_KEY,
          focusArea: form.focusArea,
        });
        await generateConsultation(payload, requestId, { billingGate: gate.data as Record<string, unknown> });
        return;
      }
      throw new Error(("message" in denied && denied.message) ? denied.message : SERVER_ERROR_MESSAGE);
    } catch (err) {
      const message = err instanceof TypeError
        ? NETWORK_ERROR_MESSAGE
        : err instanceof Error
          ? err.message
          : SERVER_ERROR_MESSAGE;
      setError(message);
      setStatus("error");
    } finally {
      startLockRef.current = false;
    }
  }, [form, generateConsultation, isBusy, openPendingResultWindow]);

  const statusLabel = useMemo(() => {
    if (status === "opening") return "권한을 확인하고 있습니다";
    if (status === "payment") return "결제 상태를 확인하고 있습니다";
    if (status === "generating") return "당신의 인생의 책을 집필하는 중입니다";
    if (status === "completed") return "인생의 책이 완성되었습니다";
    if (status === "error") return "흐름을 다시 확인해 주세요";
    return "아직 쓰이지 않은 다음 장이 기다리고 있습니다";
  }, [status]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#050407] text-amber-50 [font-family:var(--font-body)]">
      <section className="relative min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(244,198,98,0.26),transparent_32%),radial-gradient(circle_at_16%_26%,rgba(120,43,38,0.20),transparent_30%),linear-gradient(135deg,#1b120b,#2a1a10_44%,#050407)]" />
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(250,226,169,.62)_1px,transparent_1px),radial-gradient(rgba(255,255,255,.16)_1px,transparent_1px)] [background-position:0_0,38px_46px] [background-size:96px_96px,138px_138px]" />

        <div className="relative mx-auto grid w-full max-w-7xl gap-5 lg:grid-cols-[0.92fr_1.08fr]">
          <aside className="flex min-h-[calc(100vh-48px)] flex-col justify-between overflow-hidden rounded-3xl border border-amber-200/20 bg-white/[0.08] p-5 shadow-2xl shadow-black/35 backdrop-blur-xl sm:p-7">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/25 bg-amber-50/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-200">
                <Stars className="h-4 w-4" aria-hidden="true" />
                Book of Life · AI Destiny Reading
              </div>
              <h1 className="mt-5 max-w-[12ch] text-4xl font-black leading-tight tracking-normal text-amber-50 sm:text-5xl">
                인생의 책 AI 상담
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#f0dec0]">
                당신이 타고난 사주의 문장과 지나온 시간의 결을 엮어, 앞으로 펼쳐질 인생의 장면을 한 권의 책처럼 읽어드립니다.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {HERO_BADGES.map((badge) => (
                  <span key={badge} className="rounded-full border border-amber-200/20 bg-amber-50/10 px-3 py-1 text-xs font-bold text-amber-100">
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-8 overflow-hidden rounded-3xl border border-amber-200/20 bg-[#100a08] shadow-inner shadow-amber-200/10">
              <img
                src="/fuctionassets/lifebook.webp"
                alt="황금빛 인생의 책"
                className="aspect-[4/3] w-full object-cover opacity-95"
                loading="eager"
                decoding="async"
              />
              <div className="border-t border-amber-200/15 bg-[#1d120acc] p-4 text-sm leading-7 text-[#eadbb9]">
                질문에 답하는 상담이 아니라, 입력한 사주 정보로 한 권의 챕터형 인생 해석서를 완성합니다.
              </div>
            </div>
          </aside>

          <section className="grid content-start gap-4">
            <form onSubmit={submit} className="rounded-3xl border border-amber-200/20 bg-amber-50/10 p-4 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">Golden Life Book</p>
                  <h2 className="mt-1 text-2xl font-black text-amber-50">인생의 책을 열기 위한 정보</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#e7d2b5]">
                    이 정보는 한 권의 인생 해석서를 구성하기 위한 기본 명식 계산에 사용됩니다.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-black/20 px-3 py-1 text-sm font-bold text-amber-100">
                  {isBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <BookOpen className="h-4 w-4" aria-hidden="true" />}
                  {statusLabel}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold">
                  <span className="flex items-center gap-2 text-[#f6e6c4]"><UserRound className="h-4 w-4" aria-hidden="true" /> 이름 또는 닉네임</span>
                  <input value={form.name} onChange={(event) => updateField("name", event.target.value)} className="min-h-11 rounded-2xl border border-amber-100/15 bg-[#0b1020cc] px-3 text-[#fff8ed] outline-none transition focus:border-[#f6cf7a] focus:ring-2 focus:ring-[#f6cf7a33]" placeholder="이름" />
                </label>

                <div className="grid gap-2 text-sm font-bold">
                  <span className="text-[#f6e6c4]">성별</span>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ["female", "여성"],
                      ["male", "남성"],
                      ["unknown", "비공개"],
                    ] as const).map(([value, label]) => (
                      <button key={value} type="button" onClick={() => updateField("gender", value)} className={`min-h-11 rounded-full border px-3 text-sm font-black transition ${form.gender === value ? "border-amber-200 bg-amber-200 text-[#160e08]" : "border-amber-100/15 bg-[#0b1020cc] text-[#f4dfbd] hover:border-amber-200/45"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold">
                  <span className="flex items-center gap-2 text-[#f6e6c4]"><CalendarDays className="h-4 w-4" aria-hidden="true" /> 생년월일</span>
                  <input type="date" value={form.birthDate} onChange={(event) => updateField("birthDate", event.target.value)} className="min-h-11 rounded-2xl border border-amber-100/15 bg-[#0b1020cc] px-3 text-[#fff8ed] outline-none transition focus:border-[#f6cf7a] focus:ring-2 focus:ring-[#f6cf7a33]" />
                </label>

                <div className="grid gap-2 text-sm font-bold">
                  <span className="flex items-center gap-2 text-[#f6e6c4]"><Moon className="h-4 w-4" aria-hidden="true" /> 달력 기준</span>
                  <div className="grid grid-cols-2 rounded-full border border-amber-100/15 bg-[#0b1020cc] p-1">
                    {([
                      ["solar", "양력"],
                      ["lunar", "음력"],
                    ] as const).map(([value, label]) => (
                      <button key={value} type="button" onClick={() => updateField("calendarType", value)} className={`min-h-9 rounded-full text-sm font-black transition ${form.calendarType === value ? "bg-amber-200 text-[#160e08]" : "text-[#f4dfbd] hover:bg-amber-50/10"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="grid gap-2 text-sm font-bold">
                  <span className="flex items-center gap-2 text-[#f6e6c4]"><Clock3 className="h-4 w-4" aria-hidden="true" /> 출생시간</span>
                  <input type="time" value={form.birthTime} onChange={(event) => updateField("birthTime", event.target.value)} disabled={form.birthTimeUnknown} className="min-h-11 rounded-2xl border border-amber-100/15 bg-[#0b1020cc] px-3 text-[#fff8ed] outline-none transition focus:border-[#f6cf7a] focus:ring-2 focus:ring-[#f6cf7a33] disabled:opacity-50" />
                </label>
                <label className="flex min-h-11 items-center gap-3 rounded-full border border-amber-100/15 bg-[#0b1020cc] px-4 text-sm font-bold text-[#eadfc9]">
                  <input type="checkbox" checked={form.birthTimeUnknown} onChange={(event) => updateField("birthTimeUnknown", event.target.checked)} className="h-4 w-4 accent-[#e7bd62]" />
                  출생시간 모름
                </label>
              </div>

              <div className="mt-4 grid gap-2">
                <span className="text-sm font-bold text-[#f6e6c4]">리포트 강조 영역</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {FOCUS_OPTIONS.map((option) => (
                    <button key={option.value} type="button" onClick={() => updateField("focusArea", option.value)} className={`rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${form.focusArea === option.value ? "border-amber-200/55 bg-amber-100/15 shadow-lg shadow-amber-200/10" : "border-amber-100/15 bg-[#0b1020aa]"}`}>
                      <span className="block text-sm font-black text-amber-50">{option.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-[#d8c6a7]">{option.hint}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={isBusy} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#c68d31] via-[#f2d07a] to-[#b47b25] px-5 font-black text-[#171007] shadow-lg shadow-[#f0c66a22] transition hover:-translate-y-0.5 hover:shadow-[#f0c66a40] disabled:cursor-not-allowed disabled:opacity-60">
                {isBusy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <WalletCards className="h-5 w-5" aria-hidden="true" />}
                {isBusy ? "인생의 책을 여는 중..." : "인생의 책 펼치기"}
              </button>

              {(notice || error) && (
                <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${error ? "border-[#fb718540] bg-[#3b111bcc] text-[#fecdd3]" : "border-[#f4d27a38] bg-[#302513cc] text-[#ffe8b0]"}`}>
                  {error || notice}
                </div>
              )}
            </form>

            {!isBusy && status !== "completed" && (
              <section className="rounded-3xl border border-amber-200/20 bg-white/[0.08] p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">Table of Contents</p>
                    <h2 className="mt-1 text-2xl font-black text-amber-50">아직 쓰이지 않은 다음 장이 기다리고 있습니다</h2>
                  </div>
                  {isReadyToGenerate && <CheckCircle2 className="h-6 w-6 text-amber-200" aria-hidden="true" />}
                </div>

                <div className="mt-4 grid gap-2 rounded-2xl border border-amber-200/15 bg-black/20 p-4 text-sm text-[#eadbb9] sm:grid-cols-2">
                  <span>이름: {form.name.trim() || "이름 미입력"}</span>
                  <span>성별: {formatGender(form.gender)}</span>
                  <span>생년월일: {form.birthDate || "미입력"}</span>
                  <span>달력 기준: {form.calendarType === "lunar" ? "음력" : "양력"}</span>
                  <span>출생시간: {form.birthTimeUnknown ? "모름" : form.birthTime || "미입력"}</span>
                  <span>강조 영역: {FOCUS_TOPIC[form.focusArea]}</span>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {PREVIEW_CHAPTERS.map((chapter, index) => (
                    <div key={chapter} className="rounded-2xl border border-amber-200/15 bg-amber-50/[0.06] px-4 py-3 text-sm font-bold text-[#f5dfb7]">
                      <span className="mr-2 text-amber-200">{String(index + 1).padStart(2, "0")}</span>
                      {chapter}
                    </div>
                  ))}
                </div>

                <button type="button" onClick={() => void submit()} disabled={!isReadyToGenerate || isBusy} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-amber-200/35 bg-amber-50/10 px-5 font-black text-amber-50 transition hover:-translate-y-0.5 hover:bg-amber-100/20 disabled:cursor-not-allowed disabled:opacity-50">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                  인생의 책 생성하기
                </button>
              </section>
            )}

            {isBusy && (
              <section className="rounded-3xl border border-amber-200/20 bg-white/[0.08] p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">Writing in Progress</p>
                <h2 className="mt-1 text-2xl font-black text-amber-50">당신의 인생의 책을 집필하는 중입니다</h2>
                <p className="mt-2 text-sm leading-6 text-[#e7d2b5]">
                  사주의 뼈대와 시간의 흐름을 엮어 각 장을 차례로 완성하고 있습니다.
                </p>

                <div className="mt-5 overflow-hidden rounded-full border border-amber-200/20 bg-black/30">
                  <div className="h-3 rounded-full bg-gradient-to-r from-[#9f6b24] via-[#f2d07a] to-[#fff3b0] transition-all duration-700" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-bold text-amber-100">
                  <span>{GENERATION_STEPS[activeStep]}</span>
                  <span>{progress}%</span>
                </div>

                <div className="mt-5 grid gap-3">
                  {GENERATION_STEPS.slice(0, 4).map((step, index) => (
                    <div key={step} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${index <= activeStep ? "border-amber-200/30 bg-amber-50/10 text-amber-50" : "border-amber-100/10 bg-black/20 text-[#bda988]"}`}>
                      <span className="grid h-7 w-7 place-items-center rounded-full border border-amber-200/25 text-xs">{index + 1}</span>
                      {step}
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="h-28 animate-pulse rounded-2xl border border-amber-200/15 bg-gradient-to-br from-amber-100/15 to-black/20" />
                  ))}
                </div>
              </section>
            )}

            {status === "completed" && resultUrl && (
              <section className="rounded-3xl border border-amber-200/25 bg-amber-50/10 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">Completed</p>
                <h2 className="mt-1 text-2xl font-black text-amber-50">완성된 인생의 책이 열렸습니다</h2>
                <p className="mt-2 text-sm leading-6 text-[#e7d2b5]">
                  새 창이 열리지 않았다면 아래 버튼으로 전용 결과 페이지를 열어 주세요.
                </p>
                <a href={resultUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-amber-200 px-5 font-black text-[#171007] transition hover:-translate-y-0.5">
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  완성된 인생의 책 열기
                </a>
              </section>
            )}

            {popupBlocked && resultUrl && status !== "completed" && (
              <a href={resultUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-amber-200/30 bg-black/20 px-5 text-sm font-black text-amber-100 transition hover:bg-amber-50/10">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                결과 창 다시 열기
              </a>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
