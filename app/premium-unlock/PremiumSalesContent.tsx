"use client";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { BookOpen, Download, Loader2, RefreshCcw, ShieldCheck, Sparkles } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { friendlyErrorMessage } from "@/app/_lib/friendly-error";
import { runGenerateWave } from "@/app/life-book-ai/lifeBookApi";
import {
  beginPaidFeatureGateCheck,
  completePaidFeatureGateCheck,
  failPaidFeatureGateCheck,
  runBillingCoinGate,
} from "@/app/_lib/billing-client";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import { readAiProfileSeed, type AiPrefillSeed } from "@/app/_lib/ai-prefill-seed";
import { DeliverableSpec } from "@/app/components/DeliverableSpec";

type GenderType = "female" | "male" | "unknown" | "";
type CalendarType = "solar" | "lunar";
type GenerationStatus = "idle" | "checking" | "payment" | "generating" | "completed" | "error";

type LifeFortuneForm = {
  name: string;
  gender: GenderType;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  calendarType: CalendarType;
};

type PaymentPayload = Record<string, unknown>;

type PrepareResult =
  | { ok: true; accessToken: string; accessType?: string; status?: string }
  | { ok?: false; reason?: string; message?: string; paymentPayload?: PaymentPayload };

type ConsultationResult = {
  ok?: boolean;
  sessionId?: string;
  consultationId?: string;
  idempotencyKey?: string;
  accessType?: string;
  status?: string;
  title?: string;
  topic?: string;
  birthInfo?: LifeFortuneForm | null;
  messages?: { role?: string; content?: string; createdAt?: string }[];
  reportJson?: LifeFortuneReport | null;
  generationError?: unknown;
  createdAt?: string;
  updatedAt?: string;
  message?: string;
  reason?: string;
};

type LifeFortuneChapter = {
  chapterNumber?: number;
  title?: string;
  summary?: string;
  content?: string;
  advice?: string[];
};

type LifeFortuneExpertReading = {
  title?: string;
  content?: string;
  guidance?: string[];
};

type LifeFortuneReport = {
  title?: string;
  subtitle?: string;
  coreSummary?: {
    oneLine?: string;
    lifeTheme?: string;
    strongestElement?: string;
    neededBalance?: string;
  } | null;
  chapters?: LifeFortuneChapter[];
  expertReadings?: LifeFortuneExpertReading[];
  finalMessage?: string;
};

// 인생 총운은 2026-08-01 부터 인생의 책과 별도 SKU(50,000원). 구 SKU 결제 증거는 워커가 계속 인정한다.
const FEATURE_KEY = "life-fortune-ai-consultation";
const FEATURE_TITLE = "인생 총운 전문가 상담";
const CONSULTATION_TYPE = "lifeFortune";
const TOPIC = "전체 인생 총운";
const STORAGE_KEY = "code-destiny-life-fortune-attempt";
const FALLBACK_RESULT_TITLE = "인생 총운 상담";
const FALLBACK_SUBTITLE = "타고난 명식과 시간의 흐름으로 읽는 삶의 큰 방향";
const LIFE_FORTUNE_IMAGE_SRC = "https://assets.code-destiny.com/%EC%9D%B8%EC%83%9D%20%EC%B4%9D%EB%9E%8C.webp";
const POLL_INTERVAL_MS = 3200;
const EXTENDED_POLL_INTERVAL_MS = 6000;
const MAX_POLL_DURATION_MS = 8 * 60 * 1000;
const LONG_GENERATION_NOTICE_MS = 90 * 1000;
// 총운 15섹션 ÷ 웨이브당 4 = 4웨이브 + 재시도 여유(서버 MAX_GENERATION_WAVES 는 8).
const MAX_GENERATE_WAVES = 12;
const WAVE_LOCK_RETRY_DELAY_MS = 4000;
const MIN_BIRTH_DATE = "1900-01-01";
const MAX_BIRTH_DATE = "2100-12-31";
const PRICE_NOT_FOUND_MESSAGE = "가격 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "인생 총운을 여는 과정이 완료되지 않았습니다.";
const PAYMENT_CANCELLED_MESSAGE = "선택이 취소되었습니다.";
const LOGIN_REQUIRED_MESSAGE = "로그인 후 인생 총운을 열 수 있습니다.";

const FALLBACK_CHAPTERS = [
  "타고난 명식의 중심",
  "성격과 마음의 결",
  "재능과 일의 방향",
  "재물과 생활 기반",
  "사랑과 인연의 흐름",
  "관계와 가족의 장",
  "건강과 생활 리듬",
  "대운으로 보는 큰 전환",
  "가까운 세운의 흐름",
  "앞으로 열릴 선택",
];

const LIFE_JOURNEY_LOADING_MESSAGES = [
  "태어난 연·월·일·시로 당신의 사주 명식을 다시 세우고 있어요.",
  "일간을 중심으로 오행의 균형과 십신의 자리를 짚어가는 중이에요.",
  "지나온 대운과 다가올 세운이 맞물리는 지점을 찾고 있어요.",
  "당신의 명식 위에 흐르는 인생의 결을 따라가고 있어요.",
  "용신과 기신의 목소리에 차분히 귀 기울이는 중이에요.",
  "조금만 더 기다려주세요, 당신의 인생 지도가 완성되고 있어요.",
];

const HERO_JOURNEY_POINTS = [
  "일간과 오행의 균형을 짚어 삶의 큰 물줄기를 읽습니다.",
  "타고난 명식에서 현재의 선택까지 이어진 시간의 결을 비춥니다.",
  "대운과 세운으로 열릴 전환점과 오래 지켜야 할 중심이 차분히 드러납니다.",
];

const initialForm: LifeFortuneForm = {
  name: "",
  gender: "",
  birthDate: "",
  birthTime: "12:00",
  birthTimeUnknown: false,
  calendarType: "solar",
};

function applyProfileSeedToForm(form: LifeFortuneForm, profile: AiPrefillSeed): LifeFortuneForm {
  if (!profile.name && !profile.gender && !profile.birthDate && !profile.birthTime && !profile.calendarType && profile.birthTimeUnknown === undefined) {
    return form;
  }
  const gender: GenderType = profile.gender === "male" || profile.gender === "female" ? profile.gender : form.gender;
  return {
    ...form,
    name: profile.name || form.name,
    gender,
    birthDate: profile.birthDate || form.birthDate,
    birthTimeUnknown: profile.birthTimeUnknown ?? form.birthTimeUnknown,
    birthTime: profile.birthTimeUnknown === true ? "" : profile.birthTime || form.birthTime,
    calendarType: profile.calendarType || form.calendarType,
  };
}

function buildInitialForm(): LifeFortuneForm {
  return applyProfileSeedToForm(initialForm, readAiProfileSeed());
}

function toText(value: unknown) {
  return String(value || "").trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function buildAttemptId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `life-fortune:${crypto.randomUUID()}`;
  }
  return `life-fortune:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 10)}`;
}

function buildConsultationPayload(form: LifeFortuneForm, requestId: string) {
  return {
    serviceType: FEATURE_KEY,
    featureKey: FEATURE_KEY,
    consultationType: CONSULTATION_TYPE,
    focusArea: "overall",
    topic: TOPIC,
    consultationTopic: TOPIC,
    userName: form.name.trim(),
    name: form.name.trim(),
    gender: form.gender,
    birthDate: form.birthDate,
    birthTime: form.birthTimeUnknown ? "" : form.birthTime,
    birthTimeUnknown: form.birthTimeUnknown,
    calendarType: form.calendarType,
    locale: "ko",
    requestId,
    idempotencyKey: requestId,
  };
}

async function postApi<T>(
  path: string,
  body: Record<string, unknown>,
  idempotencyKey: string,
  options: { allowExpectedReasons?: string[] } = {},
): Promise<T> {
  const response = await authFetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  }, { retryOn401: false });
  const payload = await response.json().catch(() => ({}));
  const reason = toText(payload?.reason);
  if (!response.ok && !options.allowExpectedReasons?.includes(reason)) {
    throw new Error(toText(payload?.message) || "상담을 열지 못했습니다.");
  }
  return payload as T;
}

function postPrepare(body: Record<string, unknown>, idempotencyKey: string) {
  return postApi<PrepareResult>("/api/life-book-ai/prepare", body, idempotencyKey, {
    allowExpectedReasons: ["PAYMENT_REQUIRED", "LOGIN_REQUIRED"],
  });
}

async function fetchStoredResult(attemptId: string): Promise<ConsultationResult | null> {
  const response = await authFetch(`/api/life-book-ai/result?attemptId=${encodeURIComponent(attemptId)}`, {
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as ConsultationResult;
  if (response.status === 404) return null;
  if (!response.ok && response.status !== 202) {
    throw new Error(toText(payload.message) || "저장된 상담을 불러오지 못했습니다.");
  }
  return payload;
}

function buildBillingGateInput(paymentPayload: PaymentPayload, requestId: string) {
  const runtimeGate = asRecord(paymentPayload.runtimeGate);
  const inputHash = toText(runtimeGate.inputHash ?? paymentPayload.inputHash);
  const cost = toNumber(runtimeGate.cost ?? runtimeGate.coinPrice ?? paymentPayload.cost ?? paymentPayload.coinPrice, 0);
  const amountKRW = toNumber(runtimeGate.amountKRW ?? runtimeGate.amountKrw ?? paymentPayload.amountKRW ?? paymentPayload.amountKrw ?? paymentPayload.paymentAmount, 0);
  const membershipCreditCost = toNumber(runtimeGate.membershipCreditCost ?? paymentPayload.membershipCreditCost, 0);
  if (cost <= 0 || amountKRW <= 0 || membershipCreditCost <= 0) {
    throw new Error(PRICE_NOT_FOUND_MESSAGE);
  }
  return {
    categoryKey: toText(runtimeGate.categoryKey ?? paymentPayload.categoryKey) || "premium-consultation",
    subFeatureKey: toText(runtimeGate.subFeatureKey ?? paymentPayload.subFeatureKey) || FEATURE_KEY,
    featureKey: toText(runtimeGate.featureKey ?? paymentPayload.featureKey) || FEATURE_KEY,
    reason: toText(runtimeGate.reason ?? paymentPayload.reason) || FEATURE_TITLE,
    productId: toText(runtimeGate.productId ?? paymentPayload.productId) || "life-book-ai",
    productType: toText(runtimeGate.productType ?? paymentPayload.productType) || "life-book-ai",
    serviceType: toText(runtimeGate.serviceType ?? paymentPayload.serviceType) || FEATURE_KEY,
    deferUsage: true,
    usagePolicy: "apply_after_success",
    executionKey: `life-fortune:${requestId}`,
    requestId,
    idempotencyKey: requestId,
    payloadHash: inputHash,
    cost,
    coinPrice: cost,
    amountKRW,
    amountKrw: amountKRW,
    paymentAmount: amountKRW,
    membershipCreditCost,
    consultationType: CONSULTATION_TYPE,
  };
}

async function openPaidGate(paymentPayload: PaymentPayload, requestId: string) {
  const runtimeGate = asRecord(paymentPayload.runtimeGate);
  const gate = await runBillingCoinGate(buildBillingGateInput(paymentPayload, requestId));
  if (!gate.ok || !gate.data) {
    const code = toText(gate.error?.code).toUpperCase();
    if (code === "AUTH_REQUIRED" || code === "LOGIN_REQUIRED") throw new Error(LOGIN_REQUIRED_MESSAGE);
    if (code === "PAYMENT_CANCELLED" || code === "CANCELLED") throw new Error(PAYMENT_CANCELLED_MESSAGE);
    throw new Error(PAYMENT_VERIFY_FAILED_MESSAGE);
  }
  const record = asRecord(gate.data);
  return {
    billingGate: record,
    consume: asRecord(record.consume),
    accessGrant: asRecord(record.accessGrant || record.accessGateResult || record.licensePass || record.membershipPass),
    payment: asRecord(record.payment),
    pricing: asRecord(record.pricing),
    requestId,
    idempotencyKey: requestId,
    inputHash: toText(runtimeGate.inputHash ?? paymentPayload.inputHash),
    consultationType: CONSULTATION_TYPE,
    orderName: FEATURE_TITLE,
  };
}

function getAssistantContent(result: ConsultationResult | null) {
  return result?.messages?.find((message) => message.role === "assistant")?.content?.trim() || "";
}

function extractJsonReport(content: string): LifeFortuneReport | null {
  const raw = content.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as LifeFortuneReport;
  } catch {
    return null;
  }
}

function splitMarkdownChapters(content: string): LifeFortuneChapter[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const chapters: LifeFortuneChapter[] = [];
  let current: LifeFortuneChapter | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const heading = line.match(/^#{2,4}\s+(.+)$/) || line.match(/^제\s*\d{1,2}\s*장[.)]?\s*(.+)$/);
    if (heading) {
      if (current?.content?.trim()) chapters.push({ ...current, content: current.content.trim() });
      current = { chapterNumber: chapters.length + 1, title: toText(heading[1]) || FALLBACK_CHAPTERS[chapters.length], content: "" };
      continue;
    }
    if (!current && line) current = { chapterNumber: 1, title: FALLBACK_CHAPTERS[0], content: "" };
    if (current) current.content = `${current.content || ""}${current.content ? "\n" : ""}${line}`;
  }

  const trailingChapter = current as LifeFortuneChapter | null;
  if (trailingChapter?.content?.trim()) chapters.push({ ...trailingChapter, content: trailingChapter.content.trim() });
  return chapters.length >= 3 ? chapters : content.split(/\n{2,}/).map((paragraph, index) => ({
    chapterNumber: index + 1,
    title: FALLBACK_CHAPTERS[index] || `인생의 장 ${index + 1}`,
    content: paragraph.trim(),
  })).filter((chapter) => chapter.content);
}

function buildReport(result: ConsultationResult | null) {
  const content = getAssistantContent(result);
  const parsed = result?.reportJson || extractJsonReport(content);
  const chapters = parsed?.chapters?.length
    ? parsed.chapters.map((chapter, index) => ({
      ...chapter,
      chapterNumber: chapter.chapterNumber || index + 1,
      title: chapter.title || FALLBACK_CHAPTERS[index] || `인생의 장 ${index + 1}`,
      content: chapter.content || chapter.summary || "",
    }))
    : splitMarkdownChapters(content);

  return {
    title: parsed?.title || result?.title || FALLBACK_RESULT_TITLE,
    subtitle: parsed?.subtitle || FALLBACK_SUBTITLE,
    coreSummary: parsed?.coreSummary || null,
    chapters,
    expertReadings: Array.isArray(parsed?.expertReadings)
      ? parsed.expertReadings.filter((reading) => toText(reading?.title || reading?.content))
      : [],
    finalMessage: parsed?.finalMessage || "",
  };
}

function compactLines(value: string) {
  return value.split(/\n+/).map((line) => line.trim()).filter(Boolean);
}

function validateForm(form: LifeFortuneForm) {
  if (!form.gender) return "성별을 선택해 주세요.";
  if (form.gender === "unknown") return "대운 흐름을 정확히 계산하려면 성별을 선택해 주세요.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.birthDate)) return "생년월일을 확인해 주세요.";
  if (form.birthDate < MIN_BIRTH_DATE || form.birthDate > MAX_BIRTH_DATE) return "생년월일은 1900년부터 2100년 사이로 입력해 주세요.";
  if (!form.birthTimeUnknown && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(form.birthTime)) return "출생시간을 확인해 주세요.";
  return "";
}

function statusText(status: GenerationStatus) {
  if (status === "checking" || status === "payment") return "운명의 문을 여는 중입니다.";
  if (status === "generating") return "당신의 인생 지도가 열리고 있습니다.";
  if (status === "completed") return "인생 총운이 열렸습니다.";
  return "";
}

function buildSafeFileSegment(value: string) {
  return (value || "인생총운")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 60);
}

export default function PremiumSalesContent() {
  const [form, setForm] = useState<LifeFortuneForm>(buildInitialForm);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [attemptId, setAttemptId] = useState("");
  const [result, setResult] = useState<ConsultationResult | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [progressTick, setProgressTick] = useState(0);
  const pollTimerRef = useRef<number | null>(null);
  const resultDocumentRef = useRef<HTMLElement | null>(null);
  const startLockRef = useRef(false);
  const { seed: profileSeed, seedVersion, reload: reloadProfileSeed } = useAiProfileSeed();
  const formTouchedRef = useRef(false);

  // 서버에서 프로필 카드가 뒤늦게 도착해도, 사용자가 입력을 시작하기 전이라면 폼에 반영
  useEffect(() => {
    if (!profileSeed) return;
    setForm((prev) => (formTouchedRef.current ? prev : applyProfileSeedToForm(prev, profileSeed)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedVersion]);

  const loadFormFromProfileCard = useCallback(() => {
    void reloadProfileSeed().then((seed) => {
      if (seed) setForm((prev) => applyProfileSeedToForm(prev, seed));
    });
  }, [reloadProfileSeed]);

  const isChecking = status === "checking" || status === "payment";
  const isGenerating = status === "generating";
  const isBusy = isChecking || isGenerating;
  const report = useMemo(() => buildReport(result), [result]);
  const activeLoadingIndex = isGenerating ? progressTick % LIFE_JOURNEY_LOADING_MESSAGES.length : 0;
  const progressPercent = status === "completed" ? 100 : isGenerating ? Math.min(94, 18 + progressTick * 6) : 0;

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current) {
      window.clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isGenerating) return;
    const timer = window.setInterval(() => {
      setProgressTick((value) => value + 1);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [isGenerating]);

  const updateForm = useCallback(<K extends keyof LifeFortuneForm>(key: K, value: LifeFortuneForm[K]) => {
    formTouchedRef.current = true;
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "birthTimeUnknown" && value === true ? { birthTime: "" } : {}),
      ...(key === "birthTimeUnknown" && value === false && !prev.birthTime ? { birthTime: "12:00" } : {}),
    }));
  }, []);

  const pollResult = useCallback((nextAttemptId: string, startedAt = Date.now()) => {
    clearPollTimer();
    const elapsed = Date.now() - startedAt;
    const interval = elapsed >= LONG_GENERATION_NOTICE_MS ? EXTENDED_POLL_INTERVAL_MS : POLL_INTERVAL_MS;
    pollTimerRef.current = window.setTimeout(async () => {
      try {
        const payload = await fetchStoredResult(nextAttemptId);
        if (payload?.status === "completed") {
          setResult(payload);
          setStatus("completed");
          setNotice("인생 총운이 차분히 펼쳐졌습니다.");
          clearPollTimer();
          return;
        }
        if (Date.now() - startedAt < MAX_POLL_DURATION_MS) {
          if (Date.now() - startedAt >= LONG_GENERATION_NOTICE_MS) {
            setNotice("장문 상담문을 계속 완성하고 있습니다. 페이지를 닫아도 같은 상담을 다시 불러올 수 있습니다.");
          }
          pollResult(nextAttemptId, startedAt);
          return;
        }
        setNotice("상담문을 조금 더 다듬고 있습니다. 잠시 후 새로고침하면 이어서 확인할 수 있습니다.");
      } catch (caught) {
        setError(friendlyErrorMessage(caught, "상담을 불러오지 못했습니다."));
        setStatus("error");
      }
    }, interval);
  }, [clearPollTimer]);

  useEffect(() => {
    const storedAttemptId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) || "" : "";
    if (!storedAttemptId) return;
    setAttemptId(storedAttemptId);
    fetchStoredResult(storedAttemptId)
      .then((payload) => {
        if (!payload) return;
        setResult(payload);
        if (payload.status === "completed") {
          setStatus("completed");
        } else if (payload.status === "generating") {
          setStatus("generating");
          pollResult(storedAttemptId);
        }
      })
      .catch(() => {});
    return clearPollTimer;
  }, [clearPollTimer, pollResult]);

  async function startGeneration(payload: Record<string, unknown>, requestId: string, accessEvidence: Record<string, unknown>) {
    setStatus("generating");
    setProgressTick(0);
    setNotice("");

    // 🔴 워커는 한 요청에 한 웨이브(섹션 4개)만 돌린다 — 클라가 반복 호출해야 생성이 끝까지 간다.
    //    매 호출이 같은 requestId 를 쓰므로 중복 결제·중복 생성은 워커의 멱등 인덱스와 락이 막는다.
    for (let wave = 0; wave < MAX_GENERATE_WAVES; wave += 1) {
      const outcome = await runGenerateWave(payload, requestId, accessEvidence);
      if (outcome.status === "completed") {
        setResult(outcome.data as ConsultationResult);
        setStatus("completed");
        setNotice("인생 총운이 차분히 펼쳐졌습니다.");
        return;
      }
      if (outcome.status === "failed") {
        throw new Error(toText(outcome.message) || "인생 총운을 열지 못했습니다.");
      }
      setResult(outcome.data as ConsultationResult);
      if (outcome.progress) {
        setNotice(`인생 총운을 ${outcome.progress.completed}/${outcome.progress.total}장까지 완성했습니다.`);
      }
      if (outcome.httpStatus === 409) {
        await new Promise((resolve) => setTimeout(resolve, WAVE_LOCK_RETRY_DELAY_MS));
      }
    }
    // 상한을 다 써도 안 끝났으면 폴링이 이어받는다(서버가 stale 을 확정 실패로 승격한다).
    pollResult(requestId);
  }

  async function handleGenerateClick(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (startLockRef.current || isBusy) return;
    const validationMessage = validateForm(form);
    if (validationMessage) {
      setError(validationMessage);
      setStatus("error");
      return;
    }

    startLockRef.current = true;
    const requestId = buildAttemptId();
    const payload = buildConsultationPayload(form, requestId);
    setAttemptId(requestId);
    setResult(null);
    setError("");
    setNotice("");
    setProgressTick(0);
    setStatus("checking");
    localStorage.setItem(STORAGE_KEY, requestId);
    beginPaidFeatureGateCheck({
      featureKey: FEATURE_KEY,
      requestId,
      title: "운명의 문 준비",
      reason: FEATURE_TITLE,
      paymentMode: "MEMBERSHIP_PASS",
      message: "명식의 첫 문을 열고 있습니다.",
    });

    try {
      const access = await postPrepare(payload, requestId);
      let accessEvidence: Record<string, unknown>;

      if (access.ok === true) {
        completePaidFeatureGateCheck({
          featureKey: FEATURE_KEY,
          requestId,
          title: "운명의 문 열림",
          reason: FEATURE_TITLE,
          paymentMode: "MEMBERSHIP_PASS",
          message: "당신의 명식 위로 인생의 큰 흐름이 떠오릅니다.",
        });
        accessEvidence = { accessToken: access.accessToken };
      } else if (access.reason === "PAYMENT_REQUIRED" && access.paymentPayload) {
        setStatus("payment");
        accessEvidence = await openPaidGate(access.paymentPayload, requestId);
        completePaidFeatureGateCheck({
          featureKey: FEATURE_KEY,
          requestId,
          title: "운명의 문 열림",
          reason: FEATURE_TITLE,
          paymentMode: "MEMBERSHIP_PASS",
          message: "당신의 명식 위로 인생의 큰 흐름이 떠오릅니다.",
        });
      } else if (access.reason === "LOGIN_REQUIRED") {
        throw new Error(access.message || LOGIN_REQUIRED_MESSAGE);
      } else {
        throw new Error(access.message || "인생 총운을 열지 못했습니다.");
      }

      await startGeneration(payload, requestId, accessEvidence);
    } catch (caught) {
      const message = friendlyErrorMessage(caught, "인생 총운을 열지 못했습니다.");
      setError(message);
      setStatus("error");
      failPaidFeatureGateCheck({
        featureKey: FEATURE_KEY,
        requestId,
        title: "운명의 문이 열리지 않았습니다",
        reason: FEATURE_TITLE,
        paymentMode: "MEMBERSHIP_PASS",
        message,
        cancelled: message === PAYMENT_CANCELLED_MESSAGE,
      });
    } finally {
      startLockRef.current = false;
    }
  }

  async function handleDownloadPdf() {
    if (!resultDocumentRef.current || pdfLoading) return;
    setPdfLoading(true);
    setError("");
    try {
      const [{ default: html2canvas }, jsPdfModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const JsPDF = jsPdfModule.default || jsPdfModule.jsPDF;
      const pdf = new JsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;
      const sections = Array.from(resultDocumentRef.current.querySelectorAll<HTMLElement>("[data-pdf-section]"));
      if (!sections.length) throw new Error("PDF 저장 대상 없음");

      let hasPage = false;
      for (const section of sections) {
        const canvas = await html2canvas(section, {
          backgroundColor: "#100d0a",
          scale: Math.min(window.devicePixelRatio || 2, 2),
          useCORS: true,
          logging: false,
        });
        if (!canvas.width || !canvas.height) continue;
        const sliceHeightPx = Math.max(1, Math.floor((contentHeight * canvas.width) / contentWidth));
        for (let offsetY = 0; offsetY < canvas.height; offsetY += sliceHeightPx) {
          const sliceHeight = Math.min(sliceHeightPx, canvas.height - offsetY);
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceHeight;
          const context = sliceCanvas.getContext("2d");
          if (!context) throw new Error("PDF 캔버스 생성 실패");
          context.drawImage(canvas, 0, offsetY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
          if (hasPage) pdf.addPage();
          hasPage = true;
          const sliceHeightMm = (sliceHeight * contentWidth) / canvas.width;
          pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, margin, contentWidth, Math.min(contentHeight, sliceHeightMm));
        }
      }

      if (!hasPage) throw new Error("PDF 캡처 실패");
      const stamp = new Date().toLocaleDateString("ko-KR").replace(/\./g, "").replace(/\s+/g, "");
      pdf.save(`인생총운_${buildSafeFileSegment(form.name || report.title)}_${stamp}.pdf`);
    } catch {
      setError("PDF 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPdfLoading(false);
    }
  }

  function handleReset() {
    clearPollTimer();
    setStatus("idle");
    setNotice("");
    setError("");
    setResult(null);
    setAttemptId("");
    setProgressTick(0);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <main
      data-ui-marker="life-fortune-premium-ui-v20260703"
      className="relative isolate min-h-screen overflow-hidden bg-[#050607] text-[#f7efe2]"
      style={{ fontFamily: "CodeDestinyBody, CodeDestinyPremium, 'Noto Sans KR', sans-serif" }}
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <img
          src={LIFE_FORTUNE_IMAGE_SRC}
          alt=""
          className="h-full w-full object-cover opacity-28"
          aria-hidden="true"
          loading="eager"
          decoding="async"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(242,207,130,0.18),transparent_32%),linear-gradient(115deg,rgba(5,6,7,0.94)_0%,rgba(16,13,10,0.86)_48%,rgba(6,37,27,0.82)_100%)]" />
      </div>
      <section className="mx-auto grid min-h-screen w-full max-w-7xl gap-6 px-4 py-6 md:grid-cols-[minmax(320px,430px)_1fr] md:px-6 lg:px-8">
        <form onSubmit={handleGenerateClick} className="self-start rounded-lg border border-[#d8b56d]/25 bg-[#12172b]/90 p-5 shadow-2xl shadow-black/30 backdrop-blur md:sticky md:top-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[#f2cf82]">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
              <p className="text-sm font-bold">인생 총운 사주</p>
            </div>
            <button
              type="button"
              onClick={loadFormFromProfileCard}
              className="shrink-0 rounded-lg border border-[#f2cf82]/35 bg-[#f2cf82]/10 px-3 py-2 text-xs font-bold text-[#f2cf82] transition hover:bg-[#f2cf82]/20"
              aria-label="프로필 카드에서 출생 정보 불러오기"
            >
              프로필 카드에서 불러오기
            </button>
          </div>
          <h1 className="mt-4 text-3xl font-black leading-tight md:text-4xl" style={{ fontFamily: "CodeDestinyDisplay, CodeDestinyPremium, serif" }}>
            사주 명리가 비추는 삶의 큰 흐름
          </h1>
          <p className="mt-3 text-sm leading-7 text-[#dcc7a3]">
            타고난 명식과 대운·세운의 흐름을 따라, 지금까지 이어진 길과 앞으로 열릴 장면을 차분히 들여다봅니다.
          </p>
          <div className="mt-5 overflow-hidden rounded-lg border border-[#d8b56d]/25 bg-black/30">
            <img
              src={LIFE_FORTUNE_IMAGE_SRC}
              alt="인생 총람"
              className="h-52 w-full object-cover"
              loading="eager"
              decoding="async"
              onError={(event) => { event.currentTarget.style.display = "none"; }}
            />
          </div>

          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-[#f4dfb7]">
              이름
              <input
                value={form.name}
                onChange={(event) => updateForm("name", event.target.value)}
                className="min-h-11 border border-[#d8b56d]/25 bg-black/25 px-3 text-base text-[#fff8ed] outline-none transition focus:border-[#f2cf82]"
                placeholder="이름 또는 별명"
                maxLength={40}
              />
            </label>

            <div className="grid gap-2 text-sm font-bold text-[#f4dfb7]">
              성별
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["female", "여성"],
                  ["male", "남성"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateForm("gender", value as GenderType)}
                    className={`min-h-11 border px-2 text-sm font-black transition ${form.gender === value ? "border-[#f2cf82] bg-[#f2cf82] text-[#171007]" : "border-[#d8b56d]/25 bg-black/20 text-[#f4dfb7] hover:border-[#f2cf82]/60"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-2 text-sm font-bold text-[#f4dfb7]">
                생년월일
                <input {...birthDateTextInputProps(form.birthDate, (nextBirthDate) => updateForm("birthDate", nextBirthDate))} min={MIN_BIRTH_DATE} max={MAX_BIRTH_DATE} className="min-h-11 border border-[#d8b56d]/25 bg-black/25 px-3 text-base text-[#fff8ed] outline-none transition focus:border-[#f2cf82]" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-[#f4dfb7]">
                출생시간
                <input
                  type="time"
                  value={form.birthTime}
                  onChange={(event) => updateForm("birthTime", event.target.value)}
                  disabled={form.birthTimeUnknown}
                  className="min-h-11 border border-[#d8b56d]/25 bg-black/25 px-3 text-base text-[#fff8ed] outline-none transition focus:border-[#f2cf82] disabled:opacity-45"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                ["solar", "양력"],
                ["lunar", "음력"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateForm("calendarType", value as CalendarType)}
                  className={`min-h-11 border px-3 text-sm font-black transition ${form.calendarType === value ? "border-[#a7f3d0] bg-[#a7f3d0] text-[#06251b]" : "border-[#d8b56d]/25 bg-black/20 text-[#f4dfb7] hover:border-[#a7f3d0]/60"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="flex min-h-11 items-center gap-3 border border-[#d8b56d]/25 bg-black/20 px-3 text-sm font-bold text-[#f4dfb7]">
              <input
                type="checkbox"
                checked={form.birthTimeUnknown}
                onChange={(event) => updateForm("birthTimeUnknown", event.target.checked)}
                className="h-4 w-4 accent-[#f2cf82]"
              />
              출생시간을 모릅니다
            </label>
          </div>

          {error && <p className="mt-4 border border-[#fb7185]/35 bg-[#7f1d1d]/25 p-3 text-sm leading-6 text-[#fecdd3]">{error}</p>}
          {notice && <p className="mt-4 border border-[#a7f3d0]/25 bg-[#063f31]/25 p-3 text-sm leading-6 text-[#c6f7e2]">{notice}</p>}

          <div className="mt-5 grid gap-2">
            <button
              type="submit"
              disabled={isBusy}
              className="group relative inline-flex min-h-12 items-center justify-center gap-2 overflow-hidden border border-[#ffe0a3] bg-gradient-to-r from-[#f2cf82] via-[#ffd98a] to-[#b88933] px-4 text-sm font-black text-[#171007] shadow-[0_0_28px_rgba(242,207,130,0.24)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-65 sm:text-base"
            >
              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.36),transparent_34%)] opacity-0 transition duration-500 group-hover:opacity-40" aria-hidden="true" />
              {isBusy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <BookOpen className="h-5 w-5" aria-hidden="true" />}
              <span>{isChecking ? "운명의 문을 여는 중" : isGenerating ? "인생 지도를 그리는 중" : "운명을 펼쳐보기"}</span>
            </button>
            {attemptId && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#d8b56d]/25 bg-black/20 px-4 text-sm font-bold text-[#f4dfb7] transition hover:border-[#f2cf82]/60"
              >
                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                새 상담 열기
              </button>
            )}
          </div>

          <div className="mt-5 grid gap-2 text-xs leading-5 text-[#bda986]">
            {HERO_JOURNEY_POINTS.map((point) => (
              <p key={point} className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#a7f3d0]" aria-hidden="true" />
                <span>{point}</span>
              </p>
            ))}
          </div>

          {/* 받는 것을 숫자로 못박는다. 값은 서버가 실제로 강제하는 계약이며(worker/routes/life-book-ai.js
              의 LIFE_FORTUNE_* 상수), 미달이면 생성이 실패로 돌아 재시도·환불 경로를 탄다. */}
          <DeliverableSpec
            keyPrefix="premiumUnlock.deliverable"
            className="mt-5 grid gap-3 border border-[#d8b56d]/20 bg-black/20 p-4 sm:grid-cols-3"
            titleClassName="text-xs font-black tracking-wide text-[#f2cf82]"
            labelClassName="text-[11px] font-bold text-[#bda986]"
            valueClassName="mt-1 text-sm font-black leading-6 text-[#f4dfb7]"
            noteClassName="text-[11px] leading-5 text-[#bda986]"
          />
        </form>

        <section className="min-h-[70vh] rounded-lg border border-[#d8b56d]/20 bg-[#100d0a]/90 p-4 shadow-2xl shadow-black/25 backdrop-blur md:p-6">
          {status === "completed" && result ? (
            <>
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={pdfLoading || !report.chapters.length}
                className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#f2cf82]/50 bg-[#f2cf82]/10 px-4 text-sm font-black text-[#f8dda0] transition hover:border-[#f2cf82] hover:bg-[#f2cf82]/18 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                {pdfLoading ? "PDF 저장 중" : "PDF 저장"}
              </button>
            </div>
            <article ref={resultDocumentRef} className="grid gap-5">
              <header className="border border-[#d8b56d]/20 bg-black/20 p-5" data-pdf-section>
                <div className="mb-5 overflow-hidden border border-[#d8b56d]/20 bg-black/30">
                  <img
                    src={LIFE_FORTUNE_IMAGE_SRC}
                    alt="인생 총람"
                    className="h-56 w-full object-cover"
                    loading="lazy"
                    decoding="async"
                    onError={(event) => { event.currentTarget.style.display = "none"; }}
                  />
                </div>
                <p className="text-sm font-bold text-[#f2cf82]">사주 명리로 읽은 큰 흐름</p>
                <h2 className="mt-3 text-3xl font-black leading-tight md:text-5xl">{report.title}</h2>
                <p className="mt-3 max-w-3xl text-base leading-7 text-[#dcc7a3]">{report.subtitle}</p>
                {report.coreSummary && (
                  <div className="mt-5 grid gap-2 text-sm text-[#f4dfb7] md:grid-cols-2">
                    <p className="border border-[#d8b56d]/15 bg-black/20 p-3">{report.coreSummary.oneLine || "삶의 중심 흐름이 드러납니다."}</p>
                    <p className="border border-[#d8b56d]/15 bg-black/20 p-3">보완의 결: {report.coreSummary.neededBalance || "생활 리듬과 선택의 순서"}</p>
                  </div>
                )}
              </header>

              <div className="grid gap-4">
                {report.chapters.map((chapter, index) => (
                  <section key={`${chapter.title}-${index}`} className="border border-[#d8b56d]/20 bg-[#17120d] p-5" data-pdf-section>
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center border border-[#f2cf82]/40 bg-black/20 text-sm font-black text-[#f2cf82]">
                        {String(chapter.chapterNumber || index + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <h3 className="text-xl font-black text-[#fff8ed]">{chapter.title}</h3>
                        {chapter.summary && <p className="mt-2 text-sm leading-6 text-[#f2dcae]">{chapter.summary}</p>}
                      </div>
                    </div>
                    <div className="mt-4 space-y-3 text-[15px] leading-8 text-[#f4e6cb]">
                      {compactLines(chapter.content || "").map((line, lineIndex) => (
                        <p key={lineIndex}>{line.replace(/^[-*]\s*/, "")}</p>
                      ))}
                    </div>
                    {!!chapter.advice?.length && (
                      <div className="mt-4 grid gap-2">
                        {chapter.advice.map((advice, adviceIndex) => (
                          <p key={adviceIndex} className="border border-[#a7f3d0]/20 bg-[#052e24]/25 p-3 text-sm leading-6 text-[#d7fbe8]">{advice}</p>
                        ))}
                      </div>
                    )}
                  </section>
                ))}
              </div>

              {!!report.expertReadings.length && (
                <section className="border border-[#d8b56d]/20 bg-black/20 p-5" data-pdf-section>
                  <h3 className="text-xl font-black text-[#f2cf82]">명식의 깊은 판독</h3>
                  <div className="mt-4 grid gap-4">
                    {report.expertReadings.map((reading, index) => (
                      <article key={`${reading.title || "reading"}-${index}`} className="border border-[#d8b56d]/15 bg-[#17120d] p-4">
                        <h4 className="text-lg font-black text-[#fff8ed]">{reading.title || `깊은 판독 ${index + 1}`}</h4>
                        <div className="mt-3 space-y-3 text-[15px] leading-8 text-[#f4e6cb]">
                          {compactLines(reading.content || "").map((line, lineIndex) => (
                            <p key={lineIndex}>{line.replace(/^[-*]\s*/, "")}</p>
                          ))}
                        </div>
                        {!!reading.guidance?.length && (
                          <div className="mt-4 grid gap-2">
                            {reading.guidance.map((item, itemIndex) => (
                              <p key={itemIndex} className="border border-[#f2cf82]/20 bg-black/20 p-3 text-sm leading-6 text-[#f2dfba]">{item}</p>
                            ))}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {report.finalMessage && (
                <footer className="border border-[#f2cf82]/25 bg-[#20160c] p-5 text-base leading-8 text-[#fff3d0]" data-pdf-section>
                  {report.finalMessage}
                </footer>
              )}
            </article>
            </>
          ) : (
            <div className="grid min-h-[70vh] content-center gap-5">
              <div className="relative min-h-[420px] overflow-hidden rounded-lg border border-[#d8b56d]/25 bg-[#080d20]">
                <img
                  src={LIFE_FORTUNE_IMAGE_SRC}
                  alt="인생 총람"
                  className="absolute inset-0 h-full w-full object-cover opacity-35"
                  loading="eager"
                  decoding="async"
                  onError={(event) => { event.currentTarget.style.display = "none"; }}
                />
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(6,11,31,0.94)_0%,rgba(18,23,43,0.74)_48%,rgba(83,55,18,0.46)_100%)]" />
                <svg
                  viewBox="0 0 900 440"
                  role="img"
                  aria-label="탄생에서 현재와 미래로 흐르는 금빛 인생 궤적"
                  className="absolute inset-0 h-full w-full"
                  preserveAspectRatio="xMidYMid slice"
                >
                  <defs>
                    <linearGradient id="lifeTimelineGold" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0%" stopColor="#8f6b2e" stopOpacity="0.35" />
                      <stop offset="42%" stopColor="#f2cf82" />
                      <stop offset="100%" stopColor="#fff1b8" stopOpacity="0.82" />
                    </linearGradient>
                    <filter id="lifeTimelineGlow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <path
                    d="M-40 340 C130 220 210 390 350 248 C470 126 560 302 700 178 C780 108 850 134 940 74"
                    fill="none"
                    stroke="#f2cf82"
                    strokeOpacity="0.16"
                    strokeWidth="18"
                  />
                  <path
                    className="life-timeline-draw"
                    d="M-40 340 C130 220 210 390 350 248 C470 126 560 302 700 178 C780 108 850 134 940 74"
                    fill="none"
                    filter="url(#lifeTimelineGlow)"
                    stroke="url(#lifeTimelineGold)"
                    strokeLinecap="round"
                    strokeWidth="3"
                  />
                  {[128, 350, 700, 842].map((cx, index) => (
                    <g key={cx} className="life-star-point" style={{ animationDelay: `${index * 0.42}s` }}>
                      <circle cx={cx} cy={[265, 248, 178, 102][index]} r="5" fill="#fff1b8" />
                      <circle cx={cx} cy={[265, 248, 178, 102][index]} r="14" fill="none" stroke="#f2cf82" strokeOpacity="0.28" />
                    </g>
                  ))}
                  <path d="M92 96h72M124 60v72M752 320h96M800 272v96" stroke="#f2cf82" strokeOpacity="0.22" strokeLinecap="round" />
                </svg>
                <div className="relative flex min-h-[420px] flex-col justify-end p-5 md:p-8">
                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#f2cf82]/35 bg-black/35 px-3 py-1 text-xs font-black text-[#f2cf82]">
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                    {isGenerating ? "인생 지도를 그리는 중" : "인생 총운 전문가 상담"}
                  </div>
                  <h2 className="mt-4 max-w-2xl text-3xl font-black leading-tight md:text-5xl" style={{ fontFamily: "CodeDestinyDisplay, CodeDestinyPremium, serif" }}>
                    {isGenerating ? statusText(status) : "삶의 강은 타고난 명식을 따라 천천히 방향을 드러냅니다."}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[#f5dfba]">
                    {isGenerating
                      ? LIFE_JOURNEY_LOADING_MESSAGES[activeLoadingIndex]
                      : "탄생의 자리에서 현재의 선택, 그리고 다가오는 전환까지 이어지는 시간의 선을 따라 당신의 인생 총운을 펼칩니다."}
                  </p>
                </div>
              </div>

              {isGenerating ? (
                <div className="rounded-lg border border-[#d8b56d]/20 bg-black/25 p-5" aria-live="polite">
                  <div className="flex items-center justify-between gap-3 text-sm font-black text-[#f2cf82]">
                    <span key={activeLoadingIndex} className="life-message-fade">
                      {LIFE_JOURNEY_LOADING_MESSAGES[activeLoadingIndex]}
                    </span>
                    <span>{progressPercent}%</span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#2a2118]">
                    <div className="h-full rounded-full bg-[#a7f3d0] transition-all duration-700" style={{ width: `${progressPercent}%` }} />
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[#f4dfb7]">연이가 명식의 결을 따라 당신의 서사를 한 장씩 이어가고 있어요.</p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-3">
                  {HERO_JOURNEY_POINTS.map((point, index) => (
                    <div key={point} className="rounded-lg border border-[#d8b56d]/20 bg-black/25 p-4 text-sm leading-6 text-[#e8d4b0]">
                      <p className="text-xs font-black text-[#f2cf82]">{String(index + 1).padStart(2, "0")}</p>
                      <p className="mt-2">{point}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </section>
      <style>{`
        .life-timeline-draw {
          stroke-dasharray: 1080;
          stroke-dashoffset: 1080;
          animation: lifeTimelineReveal 4.8s ease-out forwards;
        }

        .life-star-point {
          opacity: 0;
          animation: lifeStarRise 2.8s ease-out forwards;
        }

        .life-message-fade {
          display: inline-block;
          animation: lifeMessageFade 3.6s ease-in-out;
        }

        @keyframes lifeTimelineReveal {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes lifeStarRise {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes lifeMessageFade {
          0%,
          100% {
            opacity: 0.48;
          }
          18%,
          82% {
            opacity: 1;
          }
        }

        @supports (animation-timeline: view()) {
          .life-timeline-draw {
            animation-timeline: view();
            animation-range: entry 12% cover 58%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .life-timeline-draw,
          .life-star-point,
          .life-message-fade {
            animation: none;
            opacity: 1;
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </main>
  );
}
