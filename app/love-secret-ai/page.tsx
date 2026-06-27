"use client";

import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Heart,
  Loader2,
  Moon,
  Sparkles,
  Star,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { authFetch } from "@/app/_lib/auth-client";
import { runBillingCoinGate } from "@/app/_lib/billing-client";
import {
  getActivePaidAttemptSession,
  markPaidAttemptFailed,
  markPaidAttemptGenerationCompleted,
  markPaidAttemptGenerationStarted,
} from "@/app/_lib/paid-attempt-session";

type AccessType = "pass" | "paid" | "subscription" | "admin";
type CalendarType = "solar" | "lunar";
type GenderType = "male" | "female" | "unknown" | "";
type Phase = "idle" | "reading" | "payment" | "generating" | "ready" | "error";
type RelationshipStatus = "single" | "crush" | "dating" | "breakup" | "reunion" | "marriage" | "complicated" | "custom";
type FocusArea = "relationshipFlow" | "distance" | "reunion" | "longTerm" | "intimacy" | "timing" | "pattern" | "custom";

type PersonInfo = {
  name: string;
  gender: GenderType;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  calendarType: CalendarType;
};

type ConsultationForm = {
  myInfo: PersonInfo;
  partnerInfo: PersonInfo;
  relationshipStatus: RelationshipStatus | "";
  focusArea: FocusArea;
  question: string;
};

type ResultSection = { title: string; body: string };
type ChatMessage = { role: "user" | "assistant"; content: string; createdAt?: string };

type BillingPaymentPayload = {
  storeId: string;
  channelKey: string;
  paymentId?: string;
  merchantUid?: string;
  orderName: string;
  totalAmount?: number;
  paymentAmount?: number;
  amountKRW?: number;
  coinPrice?: number;
  membershipCreditCost?: number;
  currency?: string;
  payMethod?: string;
  customer?: Record<string, unknown>;
  customData?: Record<string, unknown>;
  noticeUrl?: string;
  noticeUrls?: string[];
  runtimeGate?: Record<string, unknown>;
};

type EnsureAccessResult =
  | { ok: true; accessToken: string; accessType: AccessType }
  | { ok: false; reason: "PAYMENT_REQUIRED"; paymentPayload: BillingPaymentPayload }
  | { ok: false; reason: "LOGIN_REQUIRED"; message?: string }
  | { ok: false; reason: "INVALID_INPUT"; message: string }
  | { ok: false; reason?: string; message?: string };

type ConsultationResult = {
  ok: boolean;
  sessionId?: string;
  accessType?: AccessType;
  status?: string;
  keywords?: string[];
  strategy?: string;
  sections?: ResultSection[];
  finalLine?: string;
  messages?: ChatMessage[];
  reason?: string;
  message?: string;
};

const SERVICE_TYPE = "love-secret-ai-consultation";
const CONSULTATION_TYPE = "loveSecret";

const RELATIONSHIP_STATUSES: Array<{ value: RelationshipStatus; label: string }> = [
  { value: "single", label: "솔로" },
  { value: "crush", label: "짝사랑" },
  { value: "dating", label: "연애 중" },
  { value: "breakup", label: "이별 직후" },
  { value: "reunion", label: "재회 고민" },
  { value: "marriage", label: "결혼 고민" },
  { value: "complicated", label: "관계가 복잡한 상태" },
  { value: "custom", label: "상대방 마음이 궁금한 상태" },
];

const FOCUS_AREAS: Array<{ value: FocusArea; label: string; desc: string }> = [
  { value: "relationshipFlow", label: "현재 관계가 어디로 흘러갈지", desc: "지금 흐름과 다음 선택을 봅니다." },
  { value: "distance", label: "상대의 마음과 거리감", desc: "가까움과 물러섬의 이유를 읽습니다." },
  { value: "reunion", label: "재회 가능성", desc: "다시 닿을 수 있는 온도를 살핍니다." },
  { value: "longTerm", label: "결혼/장기 관계 가능성", desc: "오래 가는 안정감을 봅니다." },
  { value: "intimacy", label: "속궁합과 친밀감 리듬", desc: "조후로 감정 온도와 친밀감을 풉니다." },
  { value: "timing", label: "연락/고백/대화 타이밍", desc: "말을 꺼낼 때와 방식을 정리합니다." },
  { value: "pattern", label: "내가 바꿔야 할 연애 패턴", desc: "반복되는 마음의 습관을 짚습니다." },
  { value: "custom", label: "직접 입력", desc: "지금 가장 아픈 질문을 그대로 적습니다." },
];

const GENERATING_STEPS = [
  "입력한 생년월일과 관계 정보를 정리하고 있어요",
  "사주의 오행 균형과 조후를 살피고 있어요",
  "두 사람의 애정 표현 방식과 관계 리듬을 비교하고 있어요",
  "궁합과 속궁합의 온도 차이를 해석하고 있어요",
  "지금 필요한 현실적인 연애 조언을 정리하고 있어요",
  "상담 리포트를 새 창에서 열 준비를 하고 있어요",
];

const ANALYSIS_ITEMS = [
  "사주 오행 균형",
  "일간/일지 관계",
  "십성 기반 애정 표현 방식",
  "조후와 감정 온도",
  "두 사람의 관계 흐름",
  "현실 조언",
];

const LOGIN_REQUIRED_MESSAGE = "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.";
const PAYMENT_REQUIRED_MESSAGE = "연애 비책 AI 상담 이용권이 필요합니다. 결제창을 열어드릴게요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.";
const INVALID_INPUT_MESSAGE = "연애 비책 상담에 필요한 정보가 부족해요. 생년월일, 성별, 연애 상황을 다시 확인해 주세요.";
const QUESTION_REQUIRED_MESSAGE = "지금 가장 궁금한 연애 질문을 한 줄이라도 적어주세요.";
const BIRTH_TIME_MESSAGE = "출생시간을 입력하거나 출생시간 모름을 선택해 주세요.";
const SERVER_ERROR_MESSAGE = "연애 비책 상담을 준비하는 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.";
const LLM_ERROR_MESSAGE = "AI 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동으로 복구됩니다.";
const NETWORK_ERROR_MESSAGE = "연결이 불안정해요. 잠시 후 다시 시도해 주세요.";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

const emptyPerson = (): PersonInfo => ({
  name: "",
  gender: "",
  birthDate: "",
  birthTime: "",
  birthTimeUnknown: false,
  calendarType: "solar",
});

const defaultForm = (): ConsultationForm => ({
  myInfo: emptyPerson(),
  partnerInfo: emptyPerson(),
  relationshipStatus: "single",
  focusArea: "relationshipFlow",
  question: "",
});

function createIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return `lsai-${crypto.randomUUID()}`;
  return `lsai-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function hasPartnerInfo(partner: PersonInfo) {
  return Boolean(partner.name.trim() || partner.gender || partner.birthDate || partner.birthTime || partner.birthTimeUnknown);
}

function labelFor<T extends string>(options: Array<{ value: T; label: string }>, value: T | "") {
  return options.find((item) => item.value === value)?.label || "";
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

function activeAttemptId() {
  const active = getActivePaidAttemptSession();
  if (!active || active.featureKey !== SERVICE_TYPE) return "";
  return active.attemptId;
}

function buildResultUrl(params: { sessionId?: string; requestId?: string; attemptId?: string; pending?: boolean }) {
  const query = new URLSearchParams();
  if (params.pending) query.set("pending", "1");
  if (params.sessionId) query.set("sessionId", params.sessionId);
  if (params.requestId) query.set("requestId", params.requestId);
  if (params.attemptId) query.set("attemptId", params.attemptId);
  return `/love-secret-ai/result?${query.toString()}`;
}

function buildPayload(form: ConsultationForm, requestId: string) {
  const question = form.question.trim();
  const partnerInfo = hasPartnerInfo(form.partnerInfo)
    ? {
      ...form.partnerInfo,
      name: form.partnerInfo.name.trim(),
      birthTime: form.partnerInfo.birthTimeUnknown ? "" : form.partnerInfo.birthTime,
    }
    : undefined;
  const topic = labelFor(FOCUS_AREAS, form.focusArea);
  return {
    serviceType: SERVICE_TYPE,
    consultationType: CONSULTATION_TYPE,
    userName: form.myInfo.name.trim() || undefined,
    gender: form.myInfo.gender || "unknown",
    birthDate: form.myInfo.birthDate,
    birthTime: form.myInfo.birthTimeUnknown ? "" : form.myInfo.birthTime,
    birthTimeUnknown: form.myInfo.birthTimeUnknown,
    calendarType: form.myInfo.calendarType,
    relationshipStatus: form.relationshipStatus,
    relationshipStatusLabel: labelFor(RELATIONSHIP_STATUSES, form.relationshipStatus),
    focusArea: form.focusArea,
    focusAreaLabel: topic,
    question,
    partnerName: partnerInfo?.name || undefined,
    partnerGender: partnerInfo?.gender || undefined,
    partnerBirthDate: partnerInfo?.birthDate || undefined,
    partnerBirthTime: partnerInfo?.birthTime || undefined,
    partnerBirthTimeUnknown: partnerInfo?.birthTimeUnknown,
    partnerCalendarType: partnerInfo?.calendarType,
    locale: "ko",
    requestId,
    idempotencyKey: requestId,
    attemptId: activeAttemptId() || undefined,
    myInfo: {
      ...form.myInfo,
      name: form.myInfo.name.trim(),
      birthTime: form.myInfo.birthTimeUnknown ? "" : form.myInfo.birthTime,
    },
    partnerInfo,
    topic,
    userQuestion: question,
  };
}

async function postJson<T>(path: string, body: Record<string, unknown>, idempotencyKey?: string): Promise<{ response: Response; payload: T }> {
  const response = await authFetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(idempotencyKey ? { ...body, idempotencyKey } : body),
  });
  const payload = await response.json().catch(() => ({})) as T;
  return { response, payload };
}

async function getJson<T>(path: string): Promise<{ response: Response; payload: T }> {
  const response = await authFetch(path);
  const payload = await response.json().catch(() => ({})) as T;
  return { response, payload };
}

function isPaymentRequiredResult(result: EnsureAccessResult): result is Extract<EnsureAccessResult, { reason: "PAYMENT_REQUIRED" }> {
  return !result.ok && result.reason === "PAYMENT_REQUIRED" && "paymentPayload" in result;
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
    || Object.keys(asRecord(payload.consume)).length,
  );
}

function extractPayment(result: unknown, fallbackRequestId: string) {
  const record = asRecord(result);
  const payload = runtimePayload(result);
  const payment = asRecord(payload.payment);
  const accessGrant = asRecord(payload.accessGrant);
  const consume = asRecord(payload.consume);
  const transactionId = toText(record.transactionId || payload.transactionId || accessGrant.transactionId || consume.transactionId);
  const purchaseId = toText(record.purchaseId || payload.purchaseId || accessGrant.purchaseId || consume.purchaseId);
  const ledgerId = toText(record.ledgerId || payload.ledgerId || accessGrant.ledgerId || consume.ledgerId);
  const paymentId = toText(
    record.paymentId
    || transactionId
    || purchaseId
    || payload.paymentId
    || payment.paymentId
    || payment.impUid
    || payment.merchantUid
    || accessGrant.paymentId
    || ledgerId
    || fallbackRequestId,
  );
  return {
    paymentId,
    transactionId,
    purchaseId,
    ledgerId,
    requestId: fallbackRequestId,
    attemptId: activeAttemptId() || undefined,
    payment: { ...payment, paymentId, requestId: fallbackRequestId },
    accessGrant,
    consume,
  };
}

async function runLoveSecretPaymentGate(paymentPayload: BillingPaymentPayload, idempotencyKey: string) {
  const runtimeGate = asRecord(paymentPayload.runtimeGate);
  const gateResult = await runBillingCoinGate({
    categoryKey: toText(runtimeGate.categoryKey) || "premium-consultation",
    subFeatureKey: SERVICE_TYPE,
    featureKey: SERVICE_TYPE,
    reason: toText(runtimeGate.reason || paymentPayload.orderName) || "연애 비책 AI 상담",
    forceDeduct: true,
    requestId: idempotencyKey,
    idempotencyKey,
    cost: toNumber(runtimeGate.cost ?? runtimeGate.coinPrice, 300),
    coinPrice: toNumber(runtimeGate.coinPrice ?? runtimeGate.cost, 300),
    amountKRW: toNumber(runtimeGate.amountKRW ?? paymentPayload.amountKRW ?? paymentPayload.paymentAmount, 30000),
    membershipCreditCost: toNumber(runtimeGate.membershipCreditCost, 3000),
    productId: toText(runtimeGate.productId) || "love-secret-ai",
    productType: toText(runtimeGate.productType) || "love-secret-ai",
    serviceType: toText(runtimeGate.serviceType) || "love-secret-ai",
  });
  if (!isPaymentGranted(gateResult)) throw new Error(PAYMENT_VERIFY_FAILED_MESSAGE);
  return extractPayment(gateResult, idempotencyKey);
}

export default function LoveSecretAiPage() {
  const [form, setForm] = useState<ConsultationForm>(() => defaultForm());
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [resultOpenMessage, setResultOpenMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [progressIndex, setProgressIndex] = useState(0);
  const startLockRef = useRef(false);
  const resultWindowRef = useRef<Window | null>(null);
  const idempotencyKeyRef = useRef(createIdempotencyKey());

  const busy = phase === "reading" || phase === "payment" || phase === "generating";
  const selectedTopic = useMemo(() => FOCUS_AREAS.find((item) => item.value === form.focusArea) || FOCUS_AREAS[0], [form.focusArea]);
  const phaseText = useMemo(() => {
    if (phase === "reading") return "입력한 마음의 단서를 정리하고 있어요";
    if (phase === "payment") return "이용권과 결제 권한을 확인하고 있어요";
    if (phase === "generating") return GENERATING_STEPS[progressIndex] || GENERATING_STEPS[0];
    if (phase === "ready") return "상담 리포트가 준비되었습니다";
    return "연애 비책을 펼칠 준비가 되어 있습니다";
  }, [phase, progressIndex]);

  useEffect(() => {
    console.info("[LoveSecret AI Page Enter]", { route: "/love-secret-ai" });
    try {
      const params = new URL(window.location.href).searchParams;
      const attemptId = params.get("attemptId") || "";
      if (attemptId) {
        const url = buildResultUrl({ attemptId });
        setResultUrl(url);
        setNotice("이미 진행 중인 상담이 있다면 결과 페이지에서 이어서 확인할 수 있습니다.");
      }
    } catch (caught) {
      console.info("[LoveSecret AI Attempt Restore Skipped]", { message: caught instanceof Error ? caught.message : String(caught) });
    }
  }, []);

  useEffect(() => {
    if (!busy) {
      if (phase === "ready") setProgress(100);
      if (phase === "idle" || phase === "error") setProgress(0);
      return;
    }
    const base = phase === "reading" ? 14 : phase === "payment" ? 28 : 40;
    setProgress((current) => Math.max(current, base));
    const progressTimer = window.setInterval(() => {
      setProgress((current) => {
        const ceiling = phase === "generating" ? 95 : phase === "payment" ? 42 : 32;
        if (current >= ceiling) return ceiling;
        return Math.min(ceiling, current + (phase === "generating" ? 3 : 2));
      });
    }, 700);
    const stepTimer = window.setInterval(() => {
      if (phase === "generating") setProgressIndex((current) => Math.min(GENERATING_STEPS.length - 1, current + 1));
    }, 1800);
    return () => {
      window.clearInterval(progressTimer);
      window.clearInterval(stepTimer);
    };
  }, [busy, phase]);

  const resetAttempt = useCallback(() => {
    if (busy) return;
    idempotencyKeyRef.current = createIdempotencyKey();
    setResultUrl("");
    setResultOpenMessage("");
    setNotice("");
    setError("");
    setPhase("idle");
    setProgress(0);
    setProgressIndex(0);
  }, [busy]);

  function setPersonField(target: "myInfo" | "partnerInfo", field: keyof PersonInfo, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [target]: {
        ...current[target],
        [field]: value,
        ...(field === "birthTimeUnknown" && value === true ? { birthTime: "" } : {}),
      },
    }));
    resetAttempt();
  }

  function setTopic(value: FocusArea) {
    setForm((current) => ({ ...current, focusArea: value }));
    resetAttempt();
  }

  function validateForm() {
    if (!form.myInfo.gender || !form.myInfo.birthDate || !form.myInfo.calendarType || !form.relationshipStatus) return INVALID_INPUT_MESSAGE;
    if (!form.myInfo.birthTimeUnknown && !form.myInfo.birthTime) return BIRTH_TIME_MESSAGE;
    if (form.focusArea === "custom" && form.question.trim().length < 2) return QUESTION_REQUIRED_MESSAGE;
    return "";
  }

  function validateCurrentStep() {
    if (step === 0) return Boolean(form.myInfo.gender && form.myInfo.birthDate && form.myInfo.calendarType && (form.myInfo.birthTimeUnknown || form.myInfo.birthTime));
    if (step === 1) return true;
    return Boolean(form.relationshipStatus && form.focusArea && (form.focusArea !== "custom" || form.question.trim().length >= 2));
  }

  function currentStepError() {
    if (step === 0 && !form.myInfo.birthTimeUnknown && !form.myInfo.birthTime) return BIRTH_TIME_MESSAGE;
    if (step === 2 && form.focusArea === "custom" && form.question.trim().length < 2) return QUESTION_REQUIRED_MESSAGE;
    return INVALID_INPUT_MESSAGE;
  }

  function openPendingResultWindow(requestId: string) {
    const url = buildResultUrl({ pending: true, requestId, attemptId: activeAttemptId() || undefined });
    setResultUrl(url);
    if (typeof window === "undefined") return;
    const opened = window.open(url, "_blank");
    if (opened) {
      opened.opener = null;
      resultWindowRef.current = opened;
      setResultOpenMessage("결과 페이지를 새 창으로 준비하고 있습니다.");
      return;
    }
    setResultOpenMessage("브라우저가 자동 새 창 열기를 막았습니다. 아래 버튼으로 결과를 열어 주세요.");
  }

  function moveResultWindow(url: string) {
    setResultUrl(url);
    if (!resultWindowRef.current || resultWindowRef.current.closed) {
      setResultOpenMessage("상담 리포트가 준비되었습니다. 아래 버튼으로 결과를 열어 주세요.");
      return;
    }
    try {
      resultWindowRef.current.location.replace(url);
      setResultOpenMessage("상담 리포트를 새 창에서 열었습니다.");
    } catch (_) {
      setResultOpenMessage("상담 리포트가 준비되었습니다. 아래 버튼으로 결과를 열어 주세요.");
    }
  }

  async function pollResult(requestId: string) {
    const attemptId = activeAttemptId();
    const query = new URLSearchParams({ requestId });
    if (attemptId) query.set("attemptId", attemptId);
    for (let count = 0; count < 35; count += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, count < 5 ? 1300 : 2200));
      const { response, payload } = await getJson<ConsultationResult>(`/api/love-secret-ai/result?${query.toString()}`);
      if (response.status === 202) continue;
      if (payload?.ok && payload.sessionId) return payload;
      if (!response.ok || payload?.ok === false) throw new Error(payload?.message || LLM_ERROR_MESSAGE);
    }
    throw new Error("상담 결과 생성이 예상보다 오래 걸리고 있어요. 결과 페이지에서 잠시 후 다시 확인해 주세요.");
  }

  async function startConsultation(
    payload: ReturnType<typeof buildPayload>,
    idempotencyKey: string,
    access: Record<string, unknown>,
  ) {
    setPhase("generating");
    setProgressIndex(0);
    markPaidAttemptGenerationStarted("love_secret_ai_generate_start");
    const attemptId = activeAttemptId();
    const { payload: result } = await postJson<ConsultationResult>("/api/love-secret-ai/generate", {
      ...payload,
      ...access,
      attemptId: attemptId || payload.attemptId,
    }, idempotencyKey);

    const completed = result.ok && Array.isArray(result.messages) && result.messages.length
      ? result
      : result.ok && result.status === "generating"
        ? await pollResult(idempotencyKey)
        : null;

    if (completed?.ok && completed.sessionId) {
      const url = buildResultUrl({ sessionId: completed.sessionId, attemptId: attemptId || undefined });
      setProgress(100);
      setNotice("");
      setError("");
      setPhase("ready");
      markPaidAttemptGenerationCompleted();
      moveResultWindow(url);
      return;
    }

    if (result.reason === "PAYMENT_VERIFY_FAILED") throw new Error(PAYMENT_VERIFY_FAILED_MESSAGE);
    if (result.reason === "LLM_ERROR") throw new Error(LLM_ERROR_MESSAGE);
    throw new Error(result.message || SERVER_ERROR_MESSAGE);
  }

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (startLockRef.current || busy) return;
    const validationMessage = validateForm();
    if (validationMessage) {
      setNotice("");
      setError(validationMessage);
      setPhase("error");
      return;
    }
    startLockRef.current = true;
    const idempotencyKey = idempotencyKeyRef.current;
    openPendingResultWindow(idempotencyKey);
    const payload = buildPayload(form, idempotencyKey);
    console.info("[LoveSecret AI Submit Start]", {
      route: "/love-secret-ai",
      requestId: idempotencyKey,
      serviceType: SERVICE_TYPE,
      focusArea: payload.focusArea,
      relationshipStatus: payload.relationshipStatus,
      questionLength: payload.question.length,
    });
    setError("");
    setNotice("");
    setPhase("reading");
    setProgressIndex(0);

    try {
      const { payload: access } = await postJson<EnsureAccessResult>("/api/love-secret-ai/prepare", payload, idempotencyKey);
      if (access.ok) {
        await startConsultation(payload, idempotencyKey, { accessToken: access.accessToken });
        return;
      }
      if (access.reason === "LOGIN_REQUIRED") throw new Error(LOGIN_REQUIRED_MESSAGE);
      if (access.reason === "INVALID_INPUT") throw new Error(access.message || INVALID_INPUT_MESSAGE);
      if (isPaymentRequiredResult(access)) {
        setNotice(PAYMENT_REQUIRED_MESSAGE);
        setPhase("payment");
        const payment = await runLoveSecretPaymentGate(access.paymentPayload, idempotencyKey);
        await startConsultation(buildPayload(form, idempotencyKey), idempotencyKey, payment);
        return;
      }
      throw new Error(("message" in access && access.message) || SERVER_ERROR_MESSAGE);
    } catch (caught) {
      const message = caught instanceof TypeError ? NETWORK_ERROR_MESSAGE : caught instanceof Error ? caught.message : SERVER_ERROR_MESSAGE;
      markPaidAttemptFailed(message || "love_secret_ai_generate_failed");
      setError(message || SERVER_ERROR_MESSAGE);
      setPhase("error");
      setResultOpenMessage("상담 생성이 완료되지 않았습니다. 입력 화면에서 다시 시도해 주세요.");
    } finally {
      startLockRef.current = false;
    }
  }

  function goNext() {
    if (!validateCurrentStep()) {
      setError(currentStepError());
      return;
    }
    setError("");
    setStep((current) => Math.min(2, current + 1));
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#140014] text-[#fff8ef] [font-family:var(--font-body)]" data-cd-marker="love-secret-ai-page-v20260627">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(251,207,232,0.24),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(250,204,21,0.16),transparent_26%),radial-gradient(circle_at_60%_88%,rgba(159,18,57,0.28),transparent_36%),linear-gradient(135deg,#140014_0%,#4a0b25_42%,#160f2d_100%)]" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-0 opacity-70 [background-image:radial-gradient(#fff8ef_1px,transparent_1px),radial-gradient(#f9a8d4_1px,transparent_1px)] [background-position:0_0,42px_58px] [background-size:96px_96px,132px_132px]" aria-hidden="true" />
      <div className="pointer-events-none fixed left-[-10%] right-[-10%] top-56 h-28 rotate-[-4deg] bg-[linear-gradient(92deg,transparent_0_14%,rgba(244,114,182,0.34)_16%,rgba(250,204,21,0.18)_46%,rgba(244,114,182,0.3)_78%,transparent_88%)] blur-xl" aria-hidden="true" />

      <section className="relative mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <LoveSecretHero phase={phase} phaseText={phaseText} busy={busy} />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <form onSubmit={handleSubmit} className="rounded-3xl border border-white/15 bg-white/10 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-6">
            <LoveSecretStepper step={step} />

            <div className="mt-5 rounded-3xl border border-white/10 bg-black/15 p-4 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-300/15 text-rose-100 ring-1 ring-rose-200/20">
                  <CalendarDays className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">Step {step + 1}</p>
                  <h2 className="text-xl font-black text-white sm:text-2xl">
                    {step === 0 ? "내 정보" : step === 1 ? "상대방 정보" : "상담 주제"}
                  </h2>
                </div>
              </div>

              {step === 0 && (
                <PersonFields
                  label="내"
                  value={form.myInfo}
                  required
                  disabled={busy}
                  onChange={(field, value) => setPersonField("myInfo", field, value)}
                />
              )}

              {step === 1 && (
                <PersonFields
                  label="상대방"
                  value={form.partnerInfo}
                  disabled={busy}
                  onChange={(field, value) => setPersonField("partnerInfo", field, value)}
                />
              )}

              {step === 2 && (
                <LoveSecretTopicSelector
                  relationshipStatus={form.relationshipStatus}
                  focusArea={form.focusArea}
                  question={form.question}
                  disabled={busy}
                  onRelationshipChange={(value) => {
                    setForm((current) => ({ ...current, relationshipStatus: value }));
                    resetAttempt();
                  }}
                  onTopicChange={setTopic}
                  onQuestionChange={(value) => {
                    setForm((current) => ({ ...current, question: value }));
                    resetAttempt();
                  }}
                />
              )}
            </div>

            {(notice || error) && (
              <div className={cx(
                "mt-4 flex gap-3 rounded-2xl border p-4 text-sm leading-6",
                error ? "border-rose-200/30 bg-rose-500/15 text-rose-50" : "border-amber-200/25 bg-amber-300/10 text-amber-50",
              )}>
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>{error || notice}</p>
              </div>
            )}

            {busy && <LoveSecretGeneratingCard phase={phase} text={phaseText} progress={progress} progressIndex={progressIndex} />}

            <div className="sticky bottom-3 z-10 mt-5 flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-[#22061a]/90 p-3 shadow-2xl shadow-black/35 backdrop-blur-xl">
              <button
                type="button"
                className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/15 px-4 text-sm font-bold text-white transition hover:border-rose-200/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                disabled={busy || step === 0}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                이전
              </button>
              {step < 2 ? (
                <button
                  type="button"
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-300 via-pink-200 to-amber-200 px-5 text-sm font-black text-[#35101e] shadow-lg shadow-rose-950/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
                  onClick={goNext}
                  disabled={busy}
                >
                  다음
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-300 via-pink-200 to-amber-200 px-5 text-sm font-black text-[#35101e] shadow-lg shadow-rose-950/30 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={busy}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <WalletCards className="h-4 w-4" aria-hidden="true" />}
                  {busy ? phaseText : "연애 비책 상담 시작하기"}
                </button>
              )}
            </div>
          </form>

          <aside className="space-y-5">
            <LoveSecretReadyCard form={form} topic={selectedTopic.label} />
            {(resultUrl || resultOpenMessage) && (
              <section className="rounded-3xl border border-amber-200/20 bg-white/10 p-5 shadow-2xl shadow-black/25 backdrop-blur-xl">
                <p className="text-sm font-bold text-amber-100">{resultOpenMessage || "결과 페이지를 열 수 있습니다."}</p>
                {resultUrl && (
                  <a
                    href={resultUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-amber-200 px-4 text-sm font-black text-[#35101e] transition hover:bg-amber-100"
                  >
                    결과 새 창 열기
                  </a>
                )}
              </section>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

function LoveSecretHero({ phase, phaseText, busy }: { phase: Phase; phaseText: string; busy: boolean }) {
  return (
    <header className="grid gap-5 rounded-3xl border border-white/10 bg-white/[0.07] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl lg:grid-cols-[minmax(220px,340px)_minmax(0,1fr)] lg:p-6">
      <div className="relative min-h-[240px] overflow-hidden rounded-3xl border border-rose-100/20 bg-[#2b071d]">
        <img src="/fuctionassets/lovebible.webp" alt="연애 비책 AI 상담" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#160014]/80 via-[#160014]/20 to-transparent" />
        <div className="absolute left-5 top-5 h-24 w-24 rounded-full bg-amber-100/30 blur-2xl" aria-hidden="true" />
      </div>
      <div className="relative flex flex-col justify-center py-2">
        <p className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200/25 bg-amber-100/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-amber-100">
          <Moon className="h-4 w-4" aria-hidden="true" />
          Love Secret · AI Romance Reading
        </p>
        <h1 className="mt-4 text-4xl font-black leading-tight text-white [font-family:var(--font-display)] sm:text-6xl">
          연애 비책 AI 상담
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-rose-50/85 sm:text-lg">
          마음의 온도, 사주의 균형, 두 사람의 리듬을 함께 읽어 지금 가장 필요한 연애의 한 수를 전해드립니다.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {["사주 기반 연애 성향", "궁합과 관계 흐름", "조후로 보는 친밀감 리듬", "현실적인 연애 조언"].map((item) => (
            <span key={item} className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-bold text-rose-50">
              {item}
            </span>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm font-bold text-rose-50" data-phase={phase}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin text-amber-200 motion-reduce:animate-none" aria-hidden="true" /> : <Sparkles className="h-4 w-4 text-amber-200" aria-hidden="true" />}
          <span>{phaseText}</span>
        </div>
      </div>
    </header>
  );
}

function LoveSecretStepper({ step }: { step: number }) {
  const labels = ["내 정보", "상대방 정보", "상담 주제"];
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {labels.map((label, index) => {
        const active = step === index;
        const done = step > index;
        return (
          <div
            key={label}
            className={cx(
              "flex items-center gap-3 rounded-2xl border p-3 transition",
              active ? "border-amber-200/45 bg-rose-300/15 shadow-lg shadow-rose-950/25" : done ? "border-rose-100/25 bg-white/10" : "border-white/10 bg-white/[0.04]",
            )}
          >
            <span className={cx(
              "grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-black",
              active ? "bg-amber-200 text-[#35101e]" : done ? "bg-rose-200 text-[#35101e]" : "bg-white/10 text-rose-50",
            )}>
              {done ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
            </span>
            <span className="text-sm font-black text-white">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function PersonFields({
  label,
  value,
  required = false,
  disabled,
  onChange,
}: {
  label: string;
  value: PersonInfo;
  required?: boolean;
  disabled: boolean;
  onChange: (field: keyof PersonInfo, value: string | boolean) => void;
}) {
  return (
    <div className="grid gap-4">
      <label className="grid gap-2">
        <span className="text-sm font-bold text-rose-50">{label} 이름 또는 별칭{required ? "" : " · 선택"}</span>
        <input
          value={value.name}
          onChange={(event) => onChange("name", event.target.value)}
          maxLength={80}
          disabled={disabled}
          className="min-h-12 rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none transition placeholder:text-rose-100/40 focus:border-amber-200/50 focus:ring-2 focus:ring-amber-200/20 disabled:opacity-55"
          placeholder={required ? "이름을 입력해 주세요" : "상대방을 부르는 이름"}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <FieldGroup label={`${label} 성별${required ? "" : " · 선택"}`}>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["female", "여성"],
              ["male", "남성"],
              ["unknown", "비공개"],
            ].map(([option, text]) => (
              <button
                key={option}
                type="button"
                disabled={disabled}
                onClick={() => onChange("gender", option)}
                className={cx(
                  "min-h-11 rounded-2xl border px-3 text-sm font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/40 disabled:opacity-55",
                  value.gender === option ? "border-amber-200 bg-amber-100 text-[#35101e]" : "border-white/10 bg-white/10 text-rose-50 hover:border-rose-100/35",
                )}
              >
                {text}
              </button>
            ))}
          </div>
        </FieldGroup>
        <FieldGroup label={`${label} 양력/음력`}>
          <div className="grid grid-cols-2 rounded-2xl border border-white/10 bg-black/15 p-1">
            {[
              ["solar", "양력"],
              ["lunar", "음력"],
            ].map(([option, text]) => (
              <button
                key={option}
                type="button"
                disabled={disabled}
                onClick={() => onChange("calendarType", option)}
                className={cx(
                  "min-h-10 rounded-xl text-sm font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/40 disabled:opacity-55",
                  value.calendarType === option ? "bg-rose-100 text-[#35101e]" : "text-rose-50 hover:bg-white/10",
                )}
              >
                {text}
              </button>
            ))}
          </div>
        </FieldGroup>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-rose-50">{label} 생년월일{required ? "" : " · 선택"}</span>
          <input
            type="date"
            value={value.birthDate}
            onChange={(event) => onChange("birthDate", event.target.value)}
            disabled={disabled}
            className="min-h-12 rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none transition focus:border-amber-200/50 focus:ring-2 focus:ring-amber-200/20 disabled:opacity-55"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-rose-50">{label} 출생시간{required ? "" : " · 선택"}</span>
          <input
            type="time"
            value={value.birthTime}
            onChange={(event) => onChange("birthTime", event.target.value)}
            disabled={disabled || value.birthTimeUnknown}
            className="min-h-12 rounded-2xl border border-white/10 bg-white/10 px-4 text-white outline-none transition focus:border-amber-200/50 focus:ring-2 focus:ring-amber-200/20 disabled:opacity-55"
          />
        </label>
      </div>

      <label className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/10 px-4 text-sm font-bold text-rose-50">
        <span>출생시간 모름</span>
        <input
          type="checkbox"
          checked={value.birthTimeUnknown}
          onChange={(event) => onChange("birthTimeUnknown", event.target.checked)}
          disabled={disabled}
          className="h-5 w-5 rounded border-white/20 bg-white/10 accent-rose-200"
        />
      </label>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <span className="text-sm font-bold text-rose-50">{label}</span>
      {children}
    </div>
  );
}

function LoveSecretTopicSelector({
  relationshipStatus,
  focusArea,
  question,
  disabled,
  onRelationshipChange,
  onTopicChange,
  onQuestionChange,
}: {
  relationshipStatus: RelationshipStatus | "";
  focusArea: FocusArea;
  question: string;
  disabled: boolean;
  onRelationshipChange: (value: RelationshipStatus) => void;
  onTopicChange: (value: FocusArea) => void;
  onQuestionChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-5">
      <FieldGroup label="현재 관계 상태">
        <div className="flex flex-wrap gap-2">
          {RELATIONSHIP_STATUSES.map((item) => (
            <button
              key={item.value}
              type="button"
              disabled={disabled}
              onClick={() => onRelationshipChange(item.value)}
              className={cx(
                "min-h-10 rounded-full border px-4 text-sm font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/40 disabled:opacity-55",
                relationshipStatus === item.value ? "border-amber-200 bg-amber-100 text-[#35101e]" : "border-white/10 bg-white/10 text-rose-50 hover:border-rose-100/35",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </FieldGroup>

      <FieldGroup label="상담 주제">
        <div className="grid gap-3 sm:grid-cols-2">
          {FOCUS_AREAS.map((item) => (
            <button
              key={item.value}
              type="button"
              disabled={disabled}
              onClick={() => onTopicChange(item.value)}
              className={cx(
                "rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/40 disabled:opacity-55",
                focusArea === item.value ? "border-amber-200/70 bg-rose-200/18 shadow-lg shadow-rose-950/25" : "border-white/10 bg-white/10 hover:border-rose-100/35",
              )}
            >
              <span className="block text-sm font-black text-white">{item.label}</span>
              <span className="mt-2 block text-xs leading-5 text-rose-50/70">{item.desc}</span>
            </button>
          ))}
        </div>
      </FieldGroup>

      <label className="grid gap-2">
        <span className="text-sm font-bold text-rose-50">추가 질문</span>
        <textarea
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
          maxLength={1200}
          disabled={disabled}
          placeholder={focusArea === "custom" ? "지금 가장 궁금한 연애 질문을 한 줄이라도 적어주세요." : "비워두어도 상담은 가능하지만, 지금의 마음과 상황을 적으면 더 섬세하게 읽어드립니다."}
          className="min-h-[140px] resize-y rounded-3xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none transition placeholder:text-rose-100/40 focus:border-amber-200/50 focus:ring-2 focus:ring-amber-200/20 disabled:opacity-55"
        />
      </label>
    </div>
  );
}

function LoveSecretReadyCard({ form, topic }: { form: ConsultationForm; topic: string }) {
  const mySummary = [
    form.myInfo.name || "나",
    form.myInfo.birthDate || "생년월일 미입력",
    form.myInfo.birthTimeUnknown ? "출생시간 모름" : form.myInfo.birthTime || "출생시간 미입력",
  ].join(" · ");
  const partnerSummary = hasPartnerInfo(form.partnerInfo)
    ? [form.partnerInfo.name || "상대방", form.partnerInfo.birthDate || "생년월일 미입력", form.partnerInfo.birthTimeUnknown ? "출생시간 모름" : form.partnerInfo.birthTime || "출생시간 미입력"].join(" · ")
    : "상대방 정보 없이 내 연애 흐름 중심";

  return (
    <section className="rounded-3xl border border-white/15 bg-white/10 p-5 shadow-2xl shadow-black/25 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-100/15 text-amber-100 ring-1 ring-amber-100/20">
          <Heart className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-100">Ready</p>
          <h2 className="mt-1 text-xl font-black text-white">연애 비책을 펼칠 준비가 되었습니다</h2>
        </div>
      </div>
      <div className="mt-5 grid gap-3 text-sm leading-6">
        <InfoLine title="내 정보" value={mySummary} />
        <InfoLine title="상대방 정보" value={partnerSummary} />
        <InfoLine title="상담 주제" value={topic} />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        {ANALYSIS_ITEMS.map((item) => (
          <span key={item} className="rounded-2xl border border-white/10 bg-black/15 px-3 py-2 text-xs font-bold text-rose-50">
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}

function InfoLine({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
      <p className="text-xs font-black text-amber-100">{title}</p>
      <p className="mt-1 break-words text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function LoveSecretGeneratingCard({ phase, text, progress, progressIndex }: { phase: Phase; text: string; progress: number; progressIndex: number }) {
  return (
    <section className="mt-4 rounded-3xl border border-rose-100/20 bg-white/10 p-5 backdrop-blur-xl" aria-live="polite">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-200/15 text-amber-100 ring-1 ring-amber-100/20">
          {phase === "payment" ? <WalletCards className="h-5 w-5" aria-hidden="true" /> : <Clock3 className="h-5 w-5" aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-black text-white">두 사람의 마음의 온도를 읽는 중입니다</h3>
          <p className="mt-1 text-sm leading-6 text-rose-50/80">{text}</p>
        </div>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/25">
        <div className="h-full rounded-full bg-gradient-to-r from-rose-300 via-pink-200 to-amber-200 transition-all duration-700" style={{ width: `${Math.max(5, Math.min(100, progress))}%` }} />
      </div>
      <div className="mt-4 grid gap-2">
        {GENERATING_STEPS.slice(0, 3).map((item, index) => (
          <div key={item} className={cx(
            "flex items-center gap-3 rounded-2xl border px-3 py-2 text-xs font-bold",
            progressIndex >= index ? "border-amber-200/25 bg-amber-100/10 text-amber-50" : "border-white/10 bg-white/5 text-rose-50/55",
          )}>
            {progressIndex >= index ? <Check className="h-4 w-4 text-amber-100" aria-hidden="true" /> : <Star className="h-4 w-4" aria-hidden="true" />}
            <span>{item}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-16 animate-pulse rounded-2xl border border-white/10 bg-white/10 motion-reduce:animate-none" />
        ))}
      </div>
    </section>
  );
}
