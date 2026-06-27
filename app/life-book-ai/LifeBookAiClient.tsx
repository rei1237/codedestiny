"use client";

import {
  BookOpen,
  CalendarDays,
  Clock3,
  Feather,
  Loader2,
  Moon,
  Send,
  Sparkles,
  Stars,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { openPaidFeatureGate, runBillingCoinGate } from "@/app/_lib/billing-client";

type AccessType = "pass" | "paid" | "subscription" | "admin";
type CalendarType = "solar" | "lunar";
type GenderType = "male" | "female" | "unknown" | "";
type FocusAreaType = "overall" | "love" | "money" | "career" | "relationship" | "family" | "lifePurpose" | "turningPoint" | "custom";
type FlowStatus = "idle" | "opening" | "payment" | "reading" | "ready" | "error";

type ConsultationForm = {
  name: string;
  gender: GenderType;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  calendarType: CalendarType;
  focusArea: FocusAreaType;
  question: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
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
  title?: string;
  keywords?: string[];
  messages?: ChatMessage[];
  reason?: string;
  message?: string;
};

type ChapterSection = {
  title: string;
  content: string;
};

const FEATURE_KEY = "life-book-ai-consultation";
const FEATURE_COST = 500;
const FEATURE_AMOUNT_KRW = 50000;
const FEATURE_MEMBERSHIP_CREDIT_COST = 5000;
const FEATURE_REASON = "인생의 책 AI 상담";
const ROUTE = "/life-book-ai";

const FOCUS_OPTIONS: Array<{ value: FocusAreaType; label: string; hint: string }> = [
  { value: "overall", label: "전체 인생 흐름", hint: "삶 전체의 반복 장면과 방향" },
  { value: "love", label: "사랑", hint: "마음이 열리고 닫히는 방식" },
  { value: "money", label: "재물", hint: "돈의 흐름과 쌓이는 힘" },
  { value: "career", label: "일과 커리어", hint: "역할, 재능, 사회적 방향" },
  { value: "relationship", label: "인간관계", hint: "사람 사이에서 반복되는 결" },
  { value: "family", label: "가족과 인연", hint: "가까운 인연과 오래된 마음" },
  { value: "lifePurpose", label: "삶의 목적", hint: "내가 오래 쓰게 될 문장" },
  { value: "turningPoint", label: "전환점", hint: "다음 장으로 넘어가는 시기" },
  { value: "custom", label: "직접 질문", hint: "지금 가장 묻고 싶은 한 가지" },
];

const FOCUS_TOPIC: Record<FocusAreaType, string> = {
  overall: "전체 인생 흐름",
  love: "사랑과 관계의 흐름",
  money: "재물과 안정의 흐름",
  career: "일과 커리어의 방향",
  relationship: "인간관계의 반복 장면",
  family: "가족과 인연의 장",
  lifePurpose: "삶의 목적과 사명",
  turningPoint: "전환점과 기회의 장",
  custom: "사용자의 직접 질문",
};

const ACCESS_LABELS: Record<AccessType, string> = {
  pass: "이용권",
  paid: "단건 결제",
  subscription: "월정석",
  admin: "관리자",
};

const CHAPTER_TITLES = [
  "첫 문장",
  "주인공의 기질",
  "반복되는 장면",
  "사랑과 관계",
  "일과 재물",
  "가족과 인연",
  "전환점",
  "넘겨야 할 오래된 페이지",
  "새롭게 써야 할 다음 장",
  "오늘의 행동 처방",
  "마지막 문장",
];

const LOADING_LINES = [
  "첫 페이지를 펼치는 중...",
  "당신의 삶에 반복된 문장을 찾는 중...",
  "다음 장으로 넘어갈 단서를 정리하는 중...",
  "인생의 책 상담문을 완성하는 중...",
];

const LOGIN_REQUIRED_MESSAGE = "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.";
const PAYMENT_REQUIRED_MESSAGE = "이용권 또는 결제가 필요한 상담입니다. 결제 정보를 확인해 주세요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.";
const INVALID_INPUT_MESSAGE = "인생의 책 상담에 필요한 정보가 부족해요. 생년월일, 성별, 상담 주제를 다시 확인해 주세요.";
const BIRTH_TIME_REQUIRED_MESSAGE = "출생시간을 입력하거나 출생시간 모름을 선택해 주세요.";
const CUSTOM_QUESTION_REQUIRED_MESSAGE = "직접 질문을 선택했다면 궁금한 내용을 짧게 적어 주세요.";
const SERVER_ERROR_MESSAGE = "인생의 책 상담을 준비하는 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.";
const LLM_ERROR_MESSAGE = "AI 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동으로 복구됩니다.";
const NETWORK_ERROR_MESSAGE = "연결이 불안정해요. 잠시 후 다시 시도해 주세요.";

const defaultForm = (): ConsultationForm => ({
  name: "",
  gender: "",
  birthDate: "",
  birthTime: "",
  birthTimeUnknown: false,
  calendarType: "solar",
  focusArea: "overall",
  question: "",
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

function buildConsultationPayload(form: ConsultationForm, requestId: string) {
  const question = form.question.trim();
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
    question,
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
    userQuestion: question,
  };
}

function validateForm(form: ConsultationForm) {
  if (!form.gender || !form.birthDate || !form.calendarType || !form.focusArea) return INVALID_INPUT_MESSAGE;
  if (!form.birthTimeUnknown && !form.birthTime) return BIRTH_TIME_REQUIRED_MESSAGE;
  if (!form.birthTimeUnknown && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(form.birthTime)) return BIRTH_TIME_REQUIRED_MESSAGE;
  if (form.focusArea === "custom" && form.question.trim().length < 2) return CUSTOM_QUESTION_REQUIRED_MESSAGE;
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

function firstAssistantMessage(messages: ChatMessage[]) {
  return messages.find((message) => message.role === "assistant")?.content || "";
}

function fallbackTitle(name: string) {
  return `${name.trim() || "당신"}의 인생의 책`;
}

function compactLines(content: string) {
  return String(content || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
}

function normalizeChapterTitle(line: string, fallback: string) {
  const cleanLine = line
    .replace(/^#{1,4}\s*/, "")
    .replace(/^\d{1,2}[.)]\s*/, "")
    .replace(/^[「『"']|[」』"']$/g, "")
    .replace(/[:：]\s*$/, "")
    .trim();
  const matched = CHAPTER_TITLES.find((title) => cleanLine.includes(title));
  return matched || (cleanLine.length <= 28 ? cleanLine : fallback);
}

function splitLifeBookSections(content: string): ChapterSection[] {
  const lines = String(content || "").replace(/\r\n/g, "\n").split("\n");
  const sections: ChapterSection[] = [];
  let current: ChapterSection | null = null;
  const headingPattern = /^(?:#{1,4}\s*)?(?:\d{1,2}[.)]\s*)?(인생의 책이 여는 첫 문장|첫 문장|당신이라는 주인공의 기질|주인공의 기질|지금 인생에서 반복되는 장면|반복되는 장면|사랑과 관계의 장|사랑과 관계|일과 재물의 장|일과 재물|가족과 인연의 장|가족과 인연|전환점과 기회의 장|전환점|지금 넘겨야 할 오래된 페이지|넘겨야 할 오래된 페이지|새롭게 써야 할 다음 장|오늘의 행동 처방|인생의 책 마지막 문장|마지막 문장)\s*[:：]?/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const heading = line.match(headingPattern);
    if (heading) {
      if (current && current.content.trim()) sections.push({ ...current, content: current.content.trim() });
      current = { title: normalizeChapterTitle(line, CHAPTER_TITLES[sections.length] || "다음 장"), content: line.replace(headingPattern, "").trim() };
      continue;
    }
    if (!current) current = { title: CHAPTER_TITLES[0], content: "" };
    current.content += `${current.content ? "\n" : ""}${line}`;
  }

  if (current && current.content.trim()) sections.push({ ...current, content: current.content.trim() });
  if (sections.length >= 3) return sections.slice(0, 12);

  const paragraphs = String(content || "").split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  if (paragraphs.length) {
    return paragraphs.slice(0, 11).map((paragraph, index) => ({
      title: CHAPTER_TITLES[index] || `장 ${index + 1}`,
      content: paragraph,
    }));
  }
  return [];
}

export default function LifeBookAiClient() {
  const [form, setForm] = useState<ConsultationForm>(() => defaultForm());
  const [status, setStatus] = useState<FlowStatus>("idle");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [accessType, setAccessType] = useState<AccessType | "">("");
  const [title, setTitle] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [followUp, setFollowUp] = useState("");
  const [sending, setSending] = useState(false);
  const startLockRef = useRef(false);
  const idempotencyKeyRef = useRef(createIdempotencyKey());

  useEffect(() => {
    console.info("[LifeBook AI Page Enter]", { route: ROUTE });
    console.info("[LifeBook AI Initial Render Success]", { route: ROUTE, serviceType: FEATURE_KEY });
  }, []);

  const statusText = useMemo(() => {
    if (status === "opening") return "인생의 책 상담을 준비하는 중...";
    if (status === "payment") return "결제 정보를 확인하는 중...";
    if (status === "reading") return "당신의 인생 페이지를 읽는 중...";
    if (status === "ready") return "인생의 책 상담문이 열렸습니다";
    if (status === "error") return "상담 흐름을 다시 확인해 주세요";
    return "아직 펼쳐지지 않은 책이 기다리고 있습니다";
  }, [status]);

  const isBusy = status === "opening" || status === "payment" || status === "reading";
  const canAskFollowUp = Boolean(sessionId && messages.length && !sending && !isBusy);
  const assistantText = firstAssistantMessage(messages);
  const chapters = useMemo(() => splitLifeBookSections(assistantText), [assistantText]);
  const displayTitle = title || fallbackTitle(form.name);
  const displayKeywords = keywords.length
    ? keywords
    : [FOCUS_TOPIC[form.focusArea], "자기 이해", "전환점"].slice(0, 3);
  const loadingLine = LOADING_LINES[status === "opening" ? 0 : status === "payment" ? 1 : status === "reading" ? 3 : 2];

  const resetAttempt = useCallback(() => {
    if (isBusy) return;
    idempotencyKeyRef.current = createIdempotencyKey();
    setSessionId("");
    setAccessType("");
    setTitle("");
    setKeywords([]);
    setMessages([]);
    setError("");
    setNotice("");
    setStatus("idle");
  }, [isBusy]);

  const updateField = (field: keyof ConsultationForm) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = field === "birthTimeUnknown"
      ? (event.target as HTMLInputElement).checked
      : event.target.value;
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "birthTimeUnknown" && value === true ? { birthTime: "" } : {}),
    }));
    resetAttempt();
  };

  const generateConsultation = useCallback(async (
    payload: ReturnType<typeof buildConsultationPayload>,
    idempotencyKey: string,
    access: { accessToken?: string; billingGate?: Record<string, unknown> },
  ) => {
    setStatus("reading");
    const { payload: result } = await postJson<ConsultationResult>("/api/life-book-ai/generate", {
      ...payload,
      ...access,
    }, idempotencyKey);

    if (result.ok && Array.isArray(result.messages) && result.messages.length) {
      setSessionId(result.sessionId || result.consultationId || "");
      setAccessType(result.accessType || "");
      setTitle(result.title || fallbackTitle(form.name));
      setKeywords(Array.isArray(result.keywords) ? result.keywords.slice(0, 3) : []);
      setMessages(result.messages);
      setStatus("ready");
      setNotice("");
      setError("");
      return;
    }

    if (result.status === "generating") {
      setNotice("인생의 책 상담문을 완성하는 중입니다. 잠시 후 다시 확인해 주세요.");
      return;
    }

    const reason = String(result.reason || "");
    if (reason === "LLM_ERROR") throw new Error(LLM_ERROR_MESSAGE);
    if (reason === "PAYMENT_VERIFY_FAILED") throw new Error(PAYMENT_VERIFY_FAILED_MESSAGE);
    throw new Error(result.message || LLM_ERROR_MESSAGE);
  }, [form.name]);

  const submit = useCallback(async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    if (startLockRef.current || isBusy) return;

    const requestId = idempotencyKeyRef.current;
    const validationMessage = validateForm(form);
    console.info("[LifeBook AI Submit Start]", {
      route: ROUTE,
      requestId,
      serviceType: FEATURE_KEY,
      focusArea: form.focusArea,
      validation: validationMessage ? "failed" : "passed",
      birthDate: maskBirthDate(form.birthDate),
      questionLength: form.question.trim().length,
    });

    if (validationMessage) {
      setError(validationMessage);
      setStatus("error");
      return;
    }

    startLockRef.current = true;
    const payload = buildConsultationPayload(form, requestId);
    setError("");
    setNotice("");
    setStatus("opening");

    try {
      const { payload: access } = await postJson<PrepareResult>("/api/life-book-ai/prepare", payload, requestId);
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
        const paymentPayload = "paymentPayload" in denied ? denied.paymentPayload : undefined;
        const billingInput = buildBillingGateInput(asRecord(paymentPayload), requestId);
        openPaidFeatureGate({
          featureKey: billingInput.featureKey,
          requestId,
          cost: billingInput.cost,
          paymentMode: "pass",
          message: PAYMENT_REQUIRED_MESSAGE,
        });
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
  }, [form, generateConsultation, isBusy]);

  const sendFollowUp = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = followUp.trim();
    if (!canAskFollowUp || content.length < 2) return;
    setSending(true);
    setError("");
    try {
      const idempotencyKey = `${idempotencyKeyRef.current}:msg:${Date.now().toString(36)}`;
      const { payload } = await postJson<ConsultationResult>("/api/life-book-ai/message", {
        sessionId,
        message: content,
        serviceType: FEATURE_KEY,
        consultationType: "lifeBook",
      }, idempotencyKey);
      if (!payload.ok) throw new Error(payload.message || LLM_ERROR_MESSAGE);
      if (Array.isArray(payload.messages)) setMessages(payload.messages);
      setFollowUp("");
    } catch (err) {
      setError(err instanceof TypeError ? NETWORK_ERROR_MESSAGE : err instanceof Error ? err.message : LLM_ERROR_MESSAGE);
    } finally {
      setSending(false);
    }
  }, [canAskFollowUp, followUp, sessionId]);

  return (
    <main
      className="min-h-screen bg-[#080b16] text-[#fff8ea]"
      style={{
        backgroundImage: "radial-gradient(circle at 18% 8%, rgba(236,188,92,.24), transparent 28%), radial-gradient(circle at 84% 16%, rgba(151,112,219,.16), transparent 24%), radial-gradient(circle at 48% 90%, rgba(255,223,150,.16), transparent 32%), linear-gradient(135deg,#070b16 0%,#171225 46%,#25170f 100%)",
      }}
    >
      <section className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(90deg,rgba(255,232,173,.08)_1px,transparent_1px),linear-gradient(rgba(255,232,173,.05)_1px,transparent_1px)] [background-size:54px_54px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#ffd98c24] to-transparent" />
        <div className="relative mx-auto grid min-h-[calc(100vh-48px)] w-full max-w-7xl gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="flex min-h-[520px] flex-col justify-between overflow-hidden rounded-[8px] border border-[#f4d27a36] bg-[#100c15cc] p-5 shadow-2xl shadow-black/35 backdrop-blur sm:p-7">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#e8c67538] bg-[#f7d99014] px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-[#f5d589]">
                <Stars size={15} />
                Book of Life · AI Destiny Reading
              </div>
              <h1 className="max-w-[12ch] text-4xl font-black leading-tight tracking-normal text-[#fff2ca] sm:text-5xl">
                인생의 책 AI 상담
              </h1>
              <p className="mt-4 max-w-xl text-base leading-7 text-[#eadbb9]">
                당신의 삶에 반복해서 등장한 장면과 앞으로 써 내려갈 다음 장을 조용히 읽어드립니다.
              </p>
            </div>
            <div className="mt-8 overflow-hidden rounded-[8px] border border-[#f4d27a2b] bg-[#080b16] shadow-inner shadow-[#f6c76d14]">
              <img
                src="/fuctionassets/lifebook.webp"
                alt="황금빛 인생의 책"
                className="h-auto w-full object-cover opacity-90"
                loading="eager"
                decoding="async"
              />
              <div className="border-t border-[#f4d27a22] bg-[#1d120acc] p-4 text-sm leading-7 text-[#eadbb9]">
                입력한 정보를 기준으로 삶의 흐름과 지금의 질문을 한 권의 책처럼 정리합니다.
              </div>
            </div>
          </aside>

          <section className="grid gap-4">
            <form onSubmit={submit} className="rounded-[8px] border border-[#f4d27a36] bg-[#fff7e814] p-4 shadow-2xl shadow-black/25 backdrop-blur sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f5d589]">Golden Life Book</p>
                  <h2 className="mt-1 text-2xl font-black text-[#fff2ca]">인생의 책을 열기 위한 정보</h2>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-[#ffe5a8]">
                  {isBusy ? <Loader2 size={18} className="animate-spin" /> : <BookOpen size={18} />}
                  <span>{statusText}</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold">
                  <span className="flex items-center gap-2 text-[#f6e6c4]"><UserRound size={16} /> 이름 또는 닉네임</span>
                  <input value={form.name} onChange={updateField("name")} className="min-h-11 rounded-[8px] border border-[#fff1c626] bg-[#0b1020cc] px-3 text-[#fff8ed] outline-none transition focus:border-[#f6cf7a] focus:ring-2 focus:ring-[#f6cf7a33]" placeholder="이름" />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  <span className="text-[#f6e6c4]">성별</span>
                  <select value={form.gender} onChange={updateField("gender")} className="min-h-11 rounded-[8px] border border-[#fff1c626] bg-[#0b1020cc] px-3 text-[#fff8ed] outline-none transition focus:border-[#f6cf7a] focus:ring-2 focus:ring-[#f6cf7a33]">
                    <option value="">선택</option>
                    <option value="female">여성</option>
                    <option value="male">남성</option>
                    <option value="unknown">비공개</option>
                  </select>
                </label>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold">
                  <span className="flex items-center gap-2 text-[#f6e6c4]"><CalendarDays size={16} /> 생년월일</span>
                  <input type="date" value={form.birthDate} onChange={updateField("birthDate")} className="min-h-11 rounded-[8px] border border-[#fff1c626] bg-[#0b1020cc] px-3 text-[#fff8ed] outline-none transition focus:border-[#f6cf7a] focus:ring-2 focus:ring-[#f6cf7a33]" />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  <span className="flex items-center gap-2 text-[#f6e6c4]"><Moon size={16} /> 달력 기준</span>
                  <select value={form.calendarType} onChange={updateField("calendarType")} className="min-h-11 rounded-[8px] border border-[#fff1c626] bg-[#0b1020cc] px-3 text-[#fff8ed] outline-none transition focus:border-[#f6cf7a] focus:ring-2 focus:ring-[#f6cf7a33]">
                    <option value="solar">양력</option>
                    <option value="lunar">음력</option>
                  </select>
                </label>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="grid gap-2 text-sm font-bold">
                  <span className="flex items-center gap-2 text-[#f6e6c4]"><Clock3 size={16} /> 출생시간</span>
                  <input type="time" value={form.birthTime} onChange={updateField("birthTime")} disabled={form.birthTimeUnknown} className="min-h-11 rounded-[8px] border border-[#fff1c626] bg-[#0b1020cc] px-3 text-[#fff8ed] outline-none transition focus:border-[#f6cf7a] focus:ring-2 focus:ring-[#f6cf7a33] disabled:opacity-50" />
                </label>
                <label className="flex min-h-11 items-center gap-2 rounded-[8px] border border-[#fff1c626] bg-[#0b1020cc] px-3 text-sm font-bold text-[#eadfc9]">
                  <input type="checkbox" checked={form.birthTimeUnknown} onChange={updateField("birthTimeUnknown")} className="h-4 w-4 accent-[#e7bd62]" />
                  출생시간 모름
                </label>
              </div>

              <label className="mt-3 grid gap-2 text-sm font-bold">
                <span className="text-[#f6e6c4]">상담 주제</span>
                <select value={form.focusArea} onChange={updateField("focusArea")} className="min-h-11 rounded-[8px] border border-[#fff1c626] bg-[#0b1020cc] px-3 text-[#fff8ed] outline-none transition focus:border-[#f6cf7a] focus:ring-2 focus:ring-[#f6cf7a33]">
                  {FOCUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <span className="text-xs font-medium text-[#d8c6a7]">{FOCUS_OPTIONS.find((option) => option.value === form.focusArea)?.hint}</span>
              </label>

              <label className="mt-3 grid gap-2 text-sm font-bold">
                <span className="flex items-center gap-2 text-[#f6e6c4]"><Feather size={16} /> 자유 질문</span>
                <textarea value={form.question} onChange={updateField("question")} className="min-h-[96px] resize-y rounded-[8px] border border-[#fff1c626] bg-[#0b1020cc] px-3 py-3 leading-6 text-[#fff8ed] outline-none transition placeholder:text-[#bba77d] focus:border-[#f6cf7a] focus:ring-2 focus:ring-[#f6cf7a33]" placeholder="지금 가장 묻고 싶은 질문을 적어 주세요." />
              </label>

              <button type="submit" disabled={isBusy} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[#e8bd64] px-5 font-black text-[#171007] shadow-lg shadow-[#f0c66a22] transition hover:bg-[#ffd98e] hover:shadow-[#f0c66a40] disabled:cursor-not-allowed disabled:opacity-60">
                {isBusy ? <Loader2 size={18} className="animate-spin" /> : <WalletCards size={18} />}
                {isBusy ? "당신의 인생 페이지를 읽는 중..." : "인생의 책 AI 상담 받기"}
              </button>

              {(notice || error) && (
                <div className={`mt-4 rounded-[8px] border px-4 py-3 text-sm font-semibold ${error ? "border-[#fb718540] bg-[#3b111bcc] text-[#fecdd3]" : "border-[#f4d27a38] bg-[#302513cc] text-[#ffe8b0]"}`}>
                  {error || notice}
                </div>
              )}
            </form>

            <div className="min-h-[360px] rounded-[8px] border border-[#f4d27a30] bg-[#fff7e812] p-4 shadow-2xl shadow-black/20 backdrop-blur sm:p-5">
              {messages.length === 0 ? (
                <div className="grid h-full min-h-[320px] place-items-center rounded-[8px] border border-[#f4d27a22] bg-[#0b1020aa] p-8 text-center">
                  <div>
                    <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[#f4d27a40] bg-[#f4d27a12] text-[#f5d589] shadow-lg shadow-[#f4d27a18]">
                      {isBusy ? <Loader2 size={34} className="animate-spin" /> : <Sparkles size={34} />}
                    </div>
                    <h3 className="mt-5 text-2xl font-black text-[#fff2ca]">{isBusy ? loadingLine : "아직 펼쳐지지 않은 책이 기다리고 있습니다."}</h3>
                    <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[#dfcfad]">
                      입력한 정보를 기준으로 당신의 인생 흐름과 지금의 질문을 한 권의 책처럼 정리해 드립니다.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  <div className="rounded-[8px] border border-[#f4d27a36] bg-[#0b1020cc] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f5d589]">Your Golden Manuscript</p>
                        <h2 className="mt-2 text-2xl font-black leading-tight text-[#fff2ca]">{displayTitle}</h2>
                      </div>
                      {accessType && <span className="rounded-full border border-[#f4d27a36] px-3 py-1 text-xs font-bold text-[#ffe5a8]">{ACCESS_LABELS[accessType]}</span>}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {displayKeywords.map((keyword) => (
                        <span key={keyword} className="rounded-full border border-[#f4d27a30] bg-[#f4d27a12] px-3 py-1 text-xs font-bold text-[#ffe3a5]">{keyword}</span>
                      ))}
                    </div>
                  </div>

                  <div className="grid max-h-[62vh] gap-3 overflow-y-auto pr-1">
                    {chapters.map((chapter, index) => (
                      <article key={`${chapter.title}-${index}`} className="rounded-[8px] border border-[#f4d27a2f] bg-[#fff8ed12] p-4 text-[#fff8ed] shadow-inner shadow-[#f6cf7a0f]">
                        <div className="mb-3 flex items-center gap-2 text-[#f5d589]">
                          <BookOpen size={16} />
                          <h3 className="text-base font-black">{chapter.title}</h3>
                        </div>
                        <div className="space-y-2 text-sm leading-7 text-[#efe0c0]">
                          {compactLines(chapter.content).map((line, lineIndex) => (
                            <p key={lineIndex}>{line.replace(/^[-*]\s*/, "")}</p>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>

                  <form onSubmit={sendFollowUp} className="flex gap-2">
                    <input value={followUp} onChange={(event) => setFollowUp(event.target.value)} disabled={!canAskFollowUp} className="min-h-12 min-w-0 flex-1 rounded-[8px] border border-[#fff1c626] bg-[#0b1020cc] px-3 text-[#fff8ed] outline-none transition placeholder:text-[#bba77d] focus:border-[#f6cf7a] focus:ring-2 focus:ring-[#f6cf7a33] disabled:opacity-50" placeholder="지금 마음에 남은 질문을 적어 주세요." />
                    <button type="submit" disabled={!canAskFollowUp || sending} className="grid min-h-12 w-12 place-items-center rounded-[8px] bg-[#e8bd64] text-[#171007] transition hover:bg-[#ffd98e] disabled:cursor-not-allowed disabled:opacity-50" aria-label="추가 질문 보내기">
                      {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
