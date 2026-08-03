"use client";

import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Heart,
  Loader2,
  MessageCircleHeart,
  Moon,
  Sparkles,
  Star,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { authFetch } from "@/app/_lib/auth-client";
import theme from "./love-secret-theme.module.css";
import styles from "./LoveSecretAiClient.module.css";
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
import { readAiProfileSeed, type AiPrefillSeed } from "@/app/_lib/ai-prefill-seed";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import { PriceBadge } from "@/app/components/PriceBadge";
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
type RelationshipStatus = "single" | "crush" | "some" | "dating" | "breakup" | "reunion" | "marriage" | "complicated" | "custom";
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
  { value: "some", label: "썸 타는 중" },
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

const FORM_ANCHOR_ID = "love-secret-form";

const HERO_PROMISES = ["사주 명식 기반", "연애 심리 분석", "오늘 할 행동까지"];

/**
 * 입력 스텝.
 * ① 질문과 ③ 상담 스타일을 한 스텝에 둔 이유: focusArea === "custom" 일 때만 question 이
 * 필수라, 둘을 다른 스텝으로 나누면 "뒤 스텝의 선택이 앞 스텝의 필수 여부를 바꾸는" 검증 버그가
 * 구조적으로 생긴다. ④ 결과 생성은 스텝이 아니라 phase 상태 머신이 담당한다.
 */
const STEPS = [
  {
    id: "status",
    title: "지금의 연애 상태",
    helper: "어디쯤 서 있는지부터 알려 주세요. 조언의 온도가 여기서 정해집니다.",
    Icon: Heart,
    valid: (form: ConsultationForm) => Boolean(form.relationshipStatus),
    error: () => INVALID_INPUT_MESSAGE,
  },
  {
    id: "focus",
    title: "상담 스타일과 질문",
    helper: "가장 듣고 싶은 이야기를 고르고, 궁금한 질문을 그대로 적어 주세요.",
    Icon: MessageCircleHeart,
    valid: (form: ConsultationForm) => Boolean(form.focusArea) && (form.focusArea !== "custom" || form.question.trim().length >= 2),
    error: () => QUESTION_REQUIRED_MESSAGE,
  },
  {
    id: "me",
    title: "내 정보",
    helper: "명식을 세우기 위한 생년 정보입니다. 프로필 카드가 있으면 자동으로 채워집니다.",
    Icon: UserRound,
    valid: (form: ConsultationForm) => Boolean(
      form.myInfo.gender && form.myInfo.birthDate && form.myInfo.calendarType
      && (form.myInfo.birthTimeUnknown || form.myInfo.birthTime),
    ),
    error: (form: ConsultationForm) => (!form.myInfo.birthTimeUnknown && !form.myInfo.birthTime ? BIRTH_TIME_MESSAGE : INVALID_INPUT_MESSAGE),
  },
  {
    id: "partner",
    title: "상대방 정보 · 확인",
    helper: "상대 정보는 선택입니다. 없으면 내 연애 흐름 중심으로 읽어 드립니다.",
    Icon: Users,
    valid: () => true,
    error: () => INVALID_INPUT_MESSAGE,
  },
] as const;

const LAST_STEP = STEPS.length - 1;

// 응답은 요청 안에서 완결되며 최대 90초까지 걸린다(섹션 6개 동시 생성). 문구도 그 길이에 맞춘다.
const GENERATING_STEPS = [
  "생년 정보로 명식을 세우고 있어요",
  "오행·조후·십성과 신살을 살피고 있어요",
  "대운과 올해 흐름, 좋은 날짜를 계산하고 있어요",
  "여섯 갈래의 상담을 동시에 쓰고 있어요",
  "근거가 빠진 대목이 없는지 다시 읽고 있어요",
  "상담 리포트를 새 창에서 열 준비를 하고 있어요",
];

const ANALYSIS_ITEMS = [
  "핵심 연애운과 명식이 그리는 결",
  "연애 장점·약점과 반복되는 패턴",
  "상대의 마음, 궁합, 이상형",
  "갈등·바람기·재회 가능성",
  "결혼운과 올해 좋은 달",
  "계산된 일진으로 고른 좋은 날짜",
  "썸 전략·대화 문장·매력 연출",
  "오늘부터 할 행동과 7일 가이드",
];

const LOGIN_REQUIRED_MESSAGE = "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.";
const PAYMENT_REQUIRED_MESSAGE = "연애 비책 전문가 상담 이용권이 필요합니다. 결제창을 열어드릴게요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.";
const PAYMENT_CANCELLED_MESSAGE = "결제가 취소되었습니다. 필요할 때 다시 진행할 수 있습니다.";
const INVALID_INPUT_MESSAGE = "연애 비책 상담에 필요한 정보가 부족해요. 생년월일, 성별, 연애 상황을 다시 확인해 주세요.";
const QUESTION_REQUIRED_MESSAGE = "지금 가장 궁금한 연애 질문을 한 줄이라도 적어주세요.";
const BIRTH_TIME_MESSAGE = "출생시간을 입력하거나 출생시간 모름을 선택해 주세요.";
const SERVER_ERROR_MESSAGE = "연애 비책 상담을 준비하는 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.";
const LLM_ERROR_MESSAGE = "전문가 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동으로 복구됩니다.";
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

function applyProfileSeedToForm(form: ConsultationForm, profile: AiPrefillSeed): ConsultationForm {
  if (!profile.name && !profile.gender && !profile.birthDate && !profile.birthTime && !profile.calendarType) {
    return form;
  }
  const person = form.myInfo;
  return {
    ...form,
    myInfo: {
      ...person,
      name: profile.name || person.name,
      gender: (profile.gender as PersonInfo["gender"]) || person.gender,
      birthDate: profile.birthDate || person.birthDate,
      birthTimeUnknown: profile.birthTimeUnknown ?? person.birthTimeUnknown,
      birthTime: profile.birthTimeUnknown ? "" : profile.birthTime || person.birthTime,
      calendarType: profile.calendarType || person.calendarType,
    },
  };
}

function buildInitialForm(): ConsultationForm {
  return applyProfileSeedToForm(defaultForm(), readAiProfileSeed());
}

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
  return toDisplayText(value);
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
  }, { retryOn401: false });
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
    reason: toText(runtimeGate.reason || paymentPayload.orderName) || "연애 비책 전문가 상담",
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
  if (!isPaymentGranted(gateResult)) {
    const code = String(gateResult.error?.code || "").toUpperCase();
    if (code === "PAYMENT_CANCELLED") throw new Error(PAYMENT_CANCELLED_MESSAGE);
    throw new Error(PAYMENT_VERIFY_FAILED_MESSAGE);
  }
  return extractPayment(gateResult, idempotencyKey);
}

export default function LoveSecretAiPage() {
  const [form, setForm] = useState<ConsultationForm>(() => buildInitialForm());
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
    // 모든 사용자 입력 핸들러가 이 함수를 거치므로, 여기서 입력 시작 여부를 기록
    formTouchedRef.current = true;
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
    return STEPS[step].valid(form);
  }

  function currentStepError() {
    return STEPS[step].error(form);
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
    } catch {
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
    // 다음 화면(생성 중 상태)이 마운트되는 시점 — 게이트 오버레이 hold를 해제한다.
    releasePaidFeatureGate(idempotencyKey);
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
    beginPaidFeatureGateCheck({
      featureKey: SERVICE_TYPE,
      requestId: idempotencyKey,
      title: "이용권 확인",
      reason: "연애 비책 전문가 상담",
      paymentMode: "MEMBERSHIP_PASS",
    });
    // 이용권 판정(unlock-status)을 아래 prepare 왕복과 겹쳐 돌린다 — 결제 게이트가 같은 키로 재사용해 직렬 왕복이 1회 준다.
    void primePaymentEligibility({
      categoryKey: "premium-consultation",
      subFeatureKey: SERVICE_TYPE,
      featureKey: SERVICE_TYPE,
      reason: "연애 비책 전문가 상담",
      productId: "love-secret-ai",
      productType: "love-secret-ai",
      serviceType: "love-secret-ai",
      cost: 300,
      coinPrice: 300,
      amountKRW: 30000,
    });
    // 확인 완료 후 다음 화면(생성 중 상태)이 실제로 뜰 때까지 게이트 오버레이를 유지해 "확인 중 → 공백"을 막는다.
    // release는 startConsultation의 setPhase("generating")에서 호출한다(안전장치 상한 8초).
    holdPaidFeatureGateOpen({ requestId: idempotencyKey, maxMs: 8000 });

    try {
      const { payload: access } = await postJson<EnsureAccessResult>("/api/love-secret-ai/prepare", payload, idempotencyKey);
      if (access.ok) {
        completePaidFeatureGateCheck({
          featureKey: SERVICE_TYPE,
          requestId: idempotencyKey,
          title: "이용권 확인 완료",
          reason: "연애 비책 전문가 상담",
          paymentMode: "MEMBERSHIP_PASS",
          message: "이용권 확인이 끝났습니다. 마음의 흐름을 읽고 있습니다.",
        });
        await startConsultation(payload, idempotencyKey, { accessToken: access.accessToken });
        return;
      }
      if (access.reason === "LOGIN_REQUIRED") throw new Error(LOGIN_REQUIRED_MESSAGE);
      if (access.reason === "INVALID_INPUT") throw new Error(access.message || INVALID_INPUT_MESSAGE);
      // 이용권 확인 앞단의 일시 장애(degraded)면 dead-end 대신 결제창(단건+월정석)을 연다(요구사항: 확인 실패 시 무조건 결제창).
      // runLoveSecretPaymentGate가 billing.js coin-gate로 pass를 재검사(재시도 포함)해 보유자면 무료통과, 미커버/장애면 결제창.
      const passGateDegraded = (access as Record<string, unknown>).retryable === true || String(access.reason) === "DB_DEGRADED";
      if (isPaymentRequiredResult(access) || passGateDegraded) {
        setNotice(PAYMENT_REQUIRED_MESSAGE);
        setPhase("payment");
        const gatePayload = (isPaymentRequiredResult(access) ? access.paymentPayload : {}) as BillingPaymentPayload;
        const payment = await runLoveSecretPaymentGate(gatePayload, idempotencyKey);
        await startConsultation(buildPayload(form, idempotencyKey), idempotencyKey, payment);
        return;
      }
      throw new Error(("message" in access && access.message) || SERVER_ERROR_MESSAGE);
    } catch (caught) {
      const message = caught instanceof TypeError ? NETWORK_ERROR_MESSAGE : caught instanceof Error ? caught.message : SERVER_ERROR_MESSAGE;
      const paymentCancelled = message === PAYMENT_CANCELLED_MESSAGE;
      markPaidAttemptFailed(message || "love_secret_ai_generate_failed");
      setError(message || SERVER_ERROR_MESSAGE);
      setPhase("error");
      failPaidFeatureGateCheck({
        featureKey: SERVICE_TYPE,
        requestId: idempotencyKey,
        title: "이용권 확인 실패",
        reason: "연애 비책 전문가 상담",
        paymentMode: "MEMBERSHIP_PASS",
        message: message || SERVER_ERROR_MESSAGE,
        cancelled: paymentCancelled,
      });
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
    setStep((current) => Math.min(LAST_STEP, current + 1));
  }

  function focusFirstStepField() {
    setStep(0);
    if (typeof window === "undefined") return;
    const target = document.getElementById(FORM_ANCHOR_ID);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => target?.querySelector<HTMLButtonElement>("button")?.focus(), 420);
  }

  const stepPercent = busy ? Math.max(5, Math.min(100, progress)) : Math.round(((step + 1) / STEPS.length) * 100);
  const activeStep = STEPS[step];

  return (
    <main
      className={`${theme.theme} relative min-h-screen overflow-hidden text-[var(--ls-text)] [font-family:var(--font-body)]`}
      data-cd-marker="love-secret-ai-page-v20260627"
    >
      <div className={`pointer-events-none fixed inset-0 ${theme.pageBg}`} aria-hidden="true" />
      <div className={`pointer-events-none fixed inset-0 ${theme.pageGlow}`} aria-hidden="true" />
      <div className={`pointer-events-none fixed inset-0 ${styles.petalTexture}`} aria-hidden="true" />

      <section className="relative mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-10 pt-16 sm:px-6 sm:pt-14 lg:px-8">
        <LoveSecretHero onStart={focusFirstStepField} busy={busy} />

        <LoveSecretProgressRail
          mode={busy ? "generating" : "form"}
          label={busy ? phaseText : `${step + 1}단계 · ${activeStep.title}`}
          percent={stepPercent}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <form onSubmit={handleSubmit} id={FORM_ANCHOR_ID} className="min-w-0">
            <div
              key={busy ? "busy" : activeStep.id}
              className={`${styles.stepEnter} rounded-[28px] border border-[var(--ls-line)] bg-[var(--ls-surface)] p-5 shadow-[var(--ls-glow)] sm:p-7`}
            >
              {busy ? (
                <LoveSecretGeneratingCard phase={phase} text={phaseText} progress={progress} progressIndex={progressIndex} />
              ) : (
                <>
                  <header className="mb-6 flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--ls-surface-sunken)] text-[var(--ls-accent)] ring-1 ring-[var(--ls-line)]">
                      <activeStep.Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black tracking-[0.14em] text-[var(--ls-accent)]">
                        STEP {step + 1} / {STEPS.length}
                      </p>
                      <h2 className="mt-1 break-keep text-xl font-black text-[var(--ls-text)] [font-family:var(--font-display)] sm:text-2xl">
                        {activeStep.title}
                      </h2>
                      <p className="mt-1.5 text-sm leading-6 text-[var(--ls-text-muted)]">{activeStep.helper}</p>
                    </div>
                    {activeStep.id === "me" && (
                      <button
                        type="button"
                        onClick={loadFormFromProfileCard}
                        className={`${theme.focusRing} shrink-0 rounded-xl border border-[var(--ls-line-control)] px-3 py-2 text-xs font-bold text-[var(--ls-accent)] transition hover:bg-[var(--ls-surface-sunken)]`}
                        aria-label="프로필 카드에서 출생 정보 불러오기"
                      >
                        프로필 카드에서 불러오기
                      </button>
                    )}
                  </header>

                  {activeStep.id === "status" && (
                    <LoveSecretStatusPicker
                      value={form.relationshipStatus}
                      disabled={busy}
                      onChange={(value) => {
                        setForm((current) => ({ ...current, relationshipStatus: value }));
                        resetAttempt();
                      }}
                    />
                  )}

                  {activeStep.id === "focus" && (
                    <LoveSecretTopicSelector
                      focusArea={form.focusArea}
                      question={form.question}
                      disabled={busy}
                      onTopicChange={setTopic}
                      onQuestionChange={(value) => {
                        setForm((current) => ({ ...current, question: value }));
                        resetAttempt();
                      }}
                    />
                  )}

                  {activeStep.id === "me" && (
                    <>
                      {profileSeed && !formTouchedRef.current && (
                        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--ls-surface-sunken)] px-3 py-1.5 text-xs font-bold text-[var(--ls-accent)]">
                          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                          프로필 카드에서 자동으로 채웠어요
                        </p>
                      )}
                      <PersonFields
                        label="내"
                        value={form.myInfo}
                        required
                        disabled={busy}
                        onChange={(field, value) => setPersonField("myInfo", field, value)}
                      />
                    </>
                  )}

                  {activeStep.id === "partner" && (
                    <div className="grid gap-6">
                      <PersonFields
                        label="상대방"
                        value={form.partnerInfo}
                        disabled={busy}
                        onChange={(field, value) => setPersonField("partnerInfo", field, value)}
                      />
                      <LoveSecretReadyCard form={form} topic={selectedTopic.label} />
                    </div>
                  )}
                </>
              )}
            </div>

            {(notice || error) && (
              <div
                role={error ? "alert" : undefined}
                className={cx(
                  "mt-4 flex gap-3 rounded-2xl border p-4 text-sm leading-6",
                  error
                    ? "border-[var(--ls-accent)] bg-[var(--ls-surface-sunken)] text-[var(--ls-text)]"
                    : "border-[var(--ls-line-control)] bg-[var(--ls-surface-2)] text-[var(--ls-text-muted)]",
                )}
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ls-accent)]" aria-hidden="true" />
                <p>{error || notice}</p>
              </div>
            )}

            <div className="sticky bottom-3 z-10 mt-5 rounded-[22px] border border-[var(--ls-line)] bg-[var(--ls-veil)] p-3 shadow-[var(--ls-glow)] backdrop-blur-xl [padding-bottom:calc(0.75rem+env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  className={`${theme.focusRing} inline-flex min-h-12 items-center gap-2 rounded-2xl border border-[var(--ls-line-control)] px-4 text-sm font-bold text-[var(--ls-text)] transition hover:bg-[var(--ls-surface-sunken)] disabled:cursor-not-allowed disabled:opacity-45`}
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                  disabled={busy || step === 0}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  이전
                </button>
                {step < LAST_STEP ? (
                  <button
                    type="button"
                    className={`${theme.focusRing} inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[image:var(--ls-cta)] px-5 text-sm font-black text-[var(--ls-cta-ink)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55`}
                    onClick={goNext}
                    disabled={busy}
                  >
                    다음
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className={`${theme.focusRing} inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[image:var(--ls-cta)] px-5 text-sm font-black text-[var(--ls-cta-ink)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55`}
                    disabled={busy}
                  >
                    {busy
                      ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      : <Heart className="h-4 w-4 fill-current" aria-hidden="true" />}
                    {busy ? phaseText : "❤️ 연애 비책 상담 시작하기"}
                  </button>
                )}
              </div>
              {step === LAST_STEP && !busy && (
                <div className="mt-3 flex items-center justify-end border-t border-[var(--ls-line)] pt-3">
                  <PriceBadge
                    featureKey="love-secret-ai-consultation"
                    prefix="상담 이용 가격 "
                    className="text-sm font-bold text-[var(--ls-text-muted)]"
                  />
                </div>
              )}
            </div>
          </form>

          <aside className="space-y-5">
            <LoveSecretPromiseCard />
            {(resultUrl || resultOpenMessage) && (
              <section className="rounded-3xl border border-[var(--ls-line-control)] bg-[var(--ls-surface)] p-5 shadow-[var(--ls-glow)]">
                <p className="text-sm font-bold text-[var(--ls-text)]">{resultOpenMessage || "결과 페이지를 열 수 있습니다."}</p>
                {resultUrl && (
                  <a
                    href={resultUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`${theme.focusRing} mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-[image:var(--ls-cta)] px-4 text-sm font-black text-[var(--ls-cta-ink)] transition hover:-translate-y-0.5`}
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

function LoveSecretHero({ onStart, busy }: { onStart: () => void; busy: boolean }) {
  return (
    <header className="relative overflow-hidden rounded-[32px] border border-[var(--ls-line)] bg-[var(--ls-surface)] px-5 py-9 text-center shadow-[var(--ls-glow)] sm:px-8 sm:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover bg-right opacity-45"
        style={{ backgroundImage: "url('/fuctionassets/love-secret-reading-room-v1.webp')" }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(38,16,28,.98)_0%,rgba(38,16,28,.82)_48%,rgba(38,16,28,.16)_100%)]" />
      <div className={`pointer-events-none absolute inset-0 ${styles.petalTexture}`} aria-hidden="true" />
      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-start text-left">
        <span className={`${styles.heroRing} relative grid h-16 w-16 place-items-center rounded-full bg-[var(--ls-surface-sunken)]`}>
          <Heart className={`${styles.heroHeart} h-8 w-8 fill-[var(--ls-accent)] text-[var(--ls-accent)]`} aria-hidden="true" />
        </span>
        <h1 className="mt-8 break-keep text-[clamp(2.1rem,7vw,3.4rem)] font-black leading-[1.12] tracking-[-0.02em] text-[var(--ls-text)] [font-family:var(--font-display)]">
          연애 비책 AI
        </h1>
        <p className="mt-4 break-keep text-lg font-bold leading-8 text-[var(--ls-accent)] sm:text-xl">
          당신만을 위한 연애 컨설턴트
        </p>
        <p className="mt-3 max-w-xl break-keep text-[0.95rem] leading-7 text-[var(--ls-text-muted)]">
          사주 명식과 연애 심리를 함께 읽어, 오늘 무엇을 하고 무엇을 미뤄야 하는지까지 짚어 드립니다.
        </p>
        <button
          type="button"
          onClick={onStart}
          disabled={busy}
          className={`${theme.focusRing} mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-[image:var(--ls-cta)] px-7 text-sm font-black text-[var(--ls-cta-ink)] shadow-[var(--ls-glow)] transition hover:-translate-y-0.5 disabled:opacity-55`}
        >
          <Heart className="h-4 w-4 fill-current" aria-hidden="true" />
          상담 시작하기
        </button>
        <ul className="mt-8 flex flex-wrap justify-center gap-2">
          {HERO_PROMISES.map((item) => (
            <li
              key={item}
              className="rounded-full border border-[var(--ls-line)] bg-[var(--ls-surface-2)] px-3.5 py-1.5 text-xs font-bold text-[var(--ls-text-muted)]"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}

function LoveSecretProgressRail({ mode, label, percent }: { mode: "form" | "generating"; label: string; percent: number }) {
  return (
    <div className="rounded-2xl border border-[var(--ls-line)] bg-[var(--ls-surface)] px-4 py-3">
      <div className="flex items-center justify-between gap-3 text-xs font-black">
        <span className="min-w-0 truncate text-[var(--ls-text)]">{label}</span>
        <span className="shrink-0 text-[var(--ls-accent)]">{percent}%</span>
      </div>
      {/* 접근 가능한 진행 안내는 생성 카드의 aria-live 가 담당한다. 여기서 또 알리면 중복 낭독이 된다. */}
      <div className={`mt-2 h-2 overflow-hidden rounded-full ${styles.railTrack}`} aria-hidden="true">
        <div
          className={`h-full rounded-full ${styles.railFill}`}
          style={{ "--ls-progress": percent / 100 } as CSSProperties}
        />
      </div>
      <span className="sr-only">{mode === "generating" ? "상담 생성 진행률" : "입력 진행률"} {percent}퍼센트</span>
    </div>
  );
}

function LoveSecretStatusPicker({
  value,
  disabled,
  onChange,
}: {
  value: RelationshipStatus | "";
  disabled: boolean;
  onChange: (value: RelationshipStatus) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {RELATIONSHIP_STATUSES.map((item) => (
        <button
          key={item.value}
          type="button"
          disabled={disabled}
          aria-pressed={value === item.value}
          onClick={() => onChange(item.value)}
          className={cx(
            theme.focusRing,
            "min-h-11 rounded-full border px-4 text-sm font-black transition disabled:opacity-55",
            value === item.value
              ? "border-[var(--ls-accent)] bg-[var(--ls-accent)] text-[var(--ls-accent-ink)]"
              : "border-[var(--ls-line-control)] bg-[var(--ls-surface-2)] text-[var(--ls-text)] hover:bg-[var(--ls-surface-sunken)]",
          )}
        >
          {item.label}
        </button>
      ))}
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
  const inputClass = `${theme.focusRing} min-h-12 rounded-2xl border border-[var(--ls-line-control)] bg-[var(--ls-surface-2)] px-4 text-[var(--ls-text)] outline-none transition placeholder:text-[var(--ls-text-muted)] disabled:opacity-55`;
  return (
    <div className="grid gap-5">
      <label className="grid gap-2">
        <span className="text-sm font-bold text-[var(--ls-text)]">{label} 이름 또는 별칭{required ? "" : " · 선택"}</span>
        <input
          value={value.name}
          onChange={(event) => onChange("name", event.target.value)}
          maxLength={80}
          disabled={disabled}
          className={inputClass}
          placeholder={required ? "이름을 입력해 주세요" : "상대방을 부르는 이름"}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
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
                aria-pressed={value.gender === option}
                onClick={() => onChange("gender", option)}
                className={cx(
                  theme.focusRing,
                  "min-h-11 rounded-2xl border px-3 text-sm font-black transition disabled:opacity-55",
                  value.gender === option
                    ? "border-[var(--ls-accent)] bg-[var(--ls-accent)] text-[var(--ls-accent-ink)]"
                    : "border-[var(--ls-line-control)] bg-[var(--ls-surface-2)] text-[var(--ls-text)] hover:bg-[var(--ls-surface-sunken)]",
                )}
              >
                {text}
              </button>
            ))}
          </div>
        </FieldGroup>
        <FieldGroup label={`${label} 양력/음력`}>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["solar", "양력"],
              ["lunar", "음력"],
            ].map(([option, text]) => (
              <button
                key={option}
                type="button"
                disabled={disabled}
                aria-pressed={value.calendarType === option}
                onClick={() => onChange("calendarType", option)}
                className={cx(
                  theme.focusRing,
                  "min-h-11 rounded-2xl border text-sm font-black transition disabled:opacity-55",
                  value.calendarType === option
                    ? "border-[var(--ls-accent)] bg-[var(--ls-accent)] text-[var(--ls-accent-ink)]"
                    : "border-[var(--ls-line-control)] bg-[var(--ls-surface-2)] text-[var(--ls-text)] hover:bg-[var(--ls-surface-sunken)]",
                )}
              >
                {text}
              </button>
            ))}
          </div>
        </FieldGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-bold text-[var(--ls-text)]">{label} 생년월일{required ? "" : " · 선택"}</span>
          <input
            type="date"
            value={value.birthDate}
            onChange={(event) => onChange("birthDate", event.target.value)}
            disabled={disabled}
            className={inputClass}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-bold text-[var(--ls-text)]">{label} 출생시간{required ? "" : " · 선택"}</span>
          <input
            type="time"
            value={value.birthTime}
            onChange={(event) => onChange("birthTime", event.target.value)}
            disabled={disabled || value.birthTimeUnknown}
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-[var(--ls-line-control)] bg-[var(--ls-surface-2)] px-4 text-sm font-bold text-[var(--ls-text)]">
        <span>출생시간 모름</span>
        <input
          type="checkbox"
          checked={value.birthTimeUnknown}
          onChange={(event) => onChange("birthTimeUnknown", event.target.checked)}
          disabled={disabled}
          className="h-5 w-5 rounded accent-[var(--ls-accent)]"
        />
      </label>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <span className="text-sm font-bold text-[var(--ls-text)]">{label}</span>
      {children}
    </div>
  );
}

function LoveSecretTopicSelector({
  focusArea,
  question,
  disabled,
  onTopicChange,
  onQuestionChange,
}: {
  focusArea: FocusArea;
  question: string;
  disabled: boolean;
  onTopicChange: (value: FocusArea) => void;
  onQuestionChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-6">
      <FieldGroup label="상담 스타일">
        <div className="grid gap-3 sm:grid-cols-2">
          {FOCUS_AREAS.map((item) => (
            <button
              key={item.value}
              type="button"
              disabled={disabled}
              aria-pressed={focusArea === item.value}
              onClick={() => onTopicChange(item.value)}
              className={cx(
                theme.focusRing,
                "rounded-3xl border p-4 text-left transition hover:-translate-y-0.5 disabled:opacity-55",
                focusArea === item.value
                  ? "border-[var(--ls-accent)] bg-[var(--ls-surface-sunken)] shadow-[var(--ls-glow)]"
                  : "border-[var(--ls-line-control)] bg-[var(--ls-surface-2)] hover:bg-[var(--ls-surface-sunken)]",
              )}
            >
              <span className="block text-sm font-black text-[var(--ls-text)]">{item.label}</span>
              <span className="mt-2 block text-xs leading-5 text-[var(--ls-text-muted)]">{item.desc}</span>
            </button>
          ))}
        </div>
      </FieldGroup>

      <label className="grid gap-2">
        <span className="text-sm font-bold text-[var(--ls-text)]">
          지금 가장 궁금한 질문{focusArea === "custom" ? "" : " · 선택"}
        </span>
        <textarea
          value={question}
          onChange={(event) => onQuestionChange(event.target.value)}
          maxLength={1200}
          disabled={disabled}
          placeholder={focusArea === "custom"
            ? "지금 가장 궁금한 연애 질문을 한 줄이라도 적어주세요."
            : "비워두어도 상담은 가능하지만, 지금의 마음과 상황을 적으면 더 섬세하게 읽어드립니다."}
          className={`${theme.focusRing} min-h-[140px] resize-y rounded-3xl border border-[var(--ls-line-control)] bg-[var(--ls-surface-2)] px-4 py-3 text-[var(--ls-text)] outline-none transition placeholder:text-[var(--ls-text-muted)] disabled:opacity-55`}
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
    <section className="rounded-3xl border border-[var(--ls-gold)] bg-[var(--ls-surface-sunken)] p-5">
      <div className="flex items-center gap-2 text-[var(--ls-accent)]">
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        <h3 className="text-base font-black text-[var(--ls-text)]">이대로 상담을 시작합니다</h3>
      </div>
      <div className="mt-4 grid gap-2.5 text-sm leading-6">
        <InfoLine title="내 정보" value={mySummary} />
        <InfoLine title="상대방 정보" value={partnerSummary} />
        <InfoLine title="상담 스타일" value={topic} />
      </div>
    </section>
  );
}

function InfoLine({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--ls-line)] bg-[var(--ls-surface)] p-3">
      <p className="text-xs font-black text-[var(--ls-accent)]">{title}</p>
      <p className="mt-1 break-words text-sm font-bold text-[var(--ls-text)]">{value}</p>
    </div>
  );
}

function LoveSecretPromiseCard() {
  return (
    <section className="rounded-3xl border border-[var(--ls-line)] bg-[var(--ls-surface)] p-5 shadow-[var(--ls-glow)]">
      <div className="flex items-center gap-2 text-[var(--ls-accent)]">
        <Moon className="h-4 w-4" aria-hidden="true" />
        <h2 className="text-base font-black text-[var(--ls-text)]">상담에서 읽어 드리는 것</h2>
      </div>
      <ul className="mt-4 grid gap-2">
        {ANALYSIS_ITEMS.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-[var(--ls-text-muted)]">
            <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-[var(--ls-accent)]" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <p className="mt-5 border-t border-[var(--ls-line)] pt-4 text-xs leading-6 text-[var(--ls-text-muted)]">
        계산된 명식과 일진 안에서만 해석합니다. 근거 없는 단정이나 지어낸 날짜는 쓰지 않습니다.
      </p>
    </section>
  );
}

function LoveSecretGeneratingCard({ phase, text, progress, progressIndex }: { phase: Phase; text: string; progress: number; progressIndex: number }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-[var(--ls-surface-sunken)] p-6" aria-live="polite">
      <div className={`${styles.petalField} ${styles.sparkleField}`} aria-hidden="true">
        {Array.from({ length: 14 }, (_, index) => (
          <span key={index} className={styles.petal} />
        ))}
      </div>

      <div className="relative flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--ls-surface)] text-[var(--ls-accent)] ring-1 ring-[var(--ls-line)]">
          {phase === "payment"
            ? <WalletCards className="h-5 w-5" aria-hidden="true" />
            : <Clock3 className="h-5 w-5" aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="break-keep text-lg font-black text-[var(--ls-text)] [font-family:var(--font-display)]">
            마음의 온도를 읽는 중입니다
          </h3>
          <p className="mt-1.5 text-sm leading-6 text-[var(--ls-text-muted)]">{text}</p>
          <p className="mt-1 text-xs text-[var(--ls-text-muted)]">보통 1분 30초 안에 끝나요. 창을 닫지 말고 잠시만 기다려 주세요.</p>
        </div>
      </div>

      <div className="relative mt-5 h-2.5 overflow-hidden rounded-full bg-[var(--ls-surface)]" aria-hidden="true">
        <div
          className={`h-full rounded-full ${styles.railFill}`}
          style={{ "--ls-progress": Math.max(5, Math.min(100, progress)) / 100 } as CSSProperties}
        />
      </div>

      <ul className="relative mt-5 grid gap-2">
        {GENERATING_STEPS.map((item, index) => (
          <li
            key={item}
            className={cx(
              "flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-xs font-bold transition",
              progressIndex >= index
                ? "border-[var(--ls-line-control)] bg-[var(--ls-surface)] text-[var(--ls-text)]"
                : "border-[var(--ls-line)] bg-transparent text-[var(--ls-text-muted)]",
            )}
          >
            {progressIndex >= index
              ? <Check className="h-4 w-4 shrink-0 text-[var(--ls-accent)]" aria-hidden="true" />
              : <Star className="h-4 w-4 shrink-0" aria-hidden="true" />}
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
