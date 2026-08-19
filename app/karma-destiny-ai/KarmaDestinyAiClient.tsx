"use client";

import { birthDateTextInputProps } from "@/lib/birthDateInputProps";
import { CalendarDays, Clock3, Download, Loader2, MapPin, Maximize2, Moon, Send, Sparkles, WalletCards, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
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
import { DeliverableSpec } from "@/app/components/DeliverableSpec";
import { extractReadableTextFromJsonLike, looksLikeRawJson, toDisplayText } from "@/lib/llm-text";

type AccessType = "pass" | "paid" | "monthly_credit" | "membership_credit" | "subscription" | "admin";
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

type ParsedSection = {
  symbol: string;
  title: string;
  body: string;
};

type SummaryCards = {
  keywords?: string[];
  repeatingPattern?: string;
  currentTask?: string;
};

type IntegratedResult = {
  /** 다섯 렌즈 정본(schemaVersion 2). 각 항목은 { confidence, data, ... } 형태다. */
  lenses?: Record<string, { confidence?: string; data?: Record<string, unknown> | null }> | null;
  /** 구 3체계 이름 별칭 — schemaVersion 1 문서와의 호환을 위해 서버가 함께 내려준다. */
  saju?: Record<string, unknown> | null;
  westernAstrology?: Record<string, unknown> | null;
  vedicAstrology?: Record<string, unknown> | null;
  synthesis?: Record<string, unknown> | null;
};

type ChartDataBlock = {
  key: LensKey;
  label: string;
  title: string;
  summary: string;
  rows: { label: string; value: string }[];
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
  reportId?: string;
  attemptId?: string;
  accessType?: AccessType;
  status?: string;
  integratedResult?: IntegratedResult | null;
  summaryCards?: SummaryCards | null;
  messages?: ChatMessage[];
  reason?: string;
  message?: string;
};

const FEATURE_KEY = "karma-destiny-ai-consultation";
const FEATURE_REASON = "운명의 업 전문가 상담";
const FEATURE_COST = 300;
const FEATURE_AMOUNT_KRW = 30000;
const LOGIN_REQUIRED_MESSAGE = "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.";
const PAYMENT_REQUIRED_MESSAGE = "운명의 업 전문가 상담 이용권이 필요합니다. 결제창을 열어드릴게요.";
const PAYMENT_VERIFY_FAILED_MESSAGE = "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.";
const PAYMENT_CANCELLED_MESSAGE = "결제가 취소되었습니다. 필요할 때 다시 진행할 수 있습니다.";
const SERVER_ERROR_MESSAGE = "상담을 준비하는 중 문제가 발생했습니다. 결제 금액은 차감되지 않았습니다.";
const LLM_ERROR_MESSAGE = "상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동으로 복구됩니다.";
const REQUIRED_INPUT_MESSAGE = "운명의 업 상담에 필요한 정보가 부족해요. 생년월일, 성별, 출생시간 정보를 다시 확인해 주세요.";
const BIRTH_TIME_REQUIRED_MESSAGE = "운명의 업 상담은 출생시간에 따라 해석의 깊이가 달라져요. 출생시간을 입력하거나 ‘출생시간 모름’을 선택해 주세요.";
const CUSTOM_QUESTION_REQUIRED_MESSAGE = "직접 질문을 선택했다면 지금 가장 궁금한 내용을 짧게 적어 주세요.";
const NETWORK_ERROR_MESSAGE = "연결이 불안정해요. 잠시 후 다시 시도해 주세요.";

// 상담문 파싱이 실패했을 때만 쓰이는 폴백 제목. 워커 PREMIUM_CHAPTERS 와 어긋나면
// 사용자가 실제로 받은 것과 다른 제목이 표시되므로 순서·심볼을 그대로 맞춘다.
const KARMA_SECTIONS = [
  { symbol: "業", fallbackTitle: "業 — 운명의 핵심 주제" },
  { symbol: "源", fallbackTitle: "源 — 운명의 근원" },
  { symbol: "流", fallbackTitle: "流 — 현재 삶의 흐름" },
  { symbol: "課", fallbackTitle: "課 — 업의 핵심 과제" },
  { symbol: "緣", fallbackTitle: "緣 — 인간관계의 업" },
  { symbol: "情", fallbackTitle: "情 — 사랑의 업" },
  { symbol: "財", fallbackTitle: "財 — 돈의 업" },
  { symbol: "職", fallbackTitle: "職 — 직업의 업" },
  { symbol: "體", fallbackTitle: "體 — 건강 에너지" },
  { symbol: "才", fallbackTitle: "才 — 숨겨진 재능" },
  { symbol: "轉", fallbackTitle: "轉 — 운명의 전환점" },
  { symbol: "策", fallbackTitle: "策 — 앞으로의 성장 전략" },
  { symbol: "總", fallbackTitle: "總 — 다섯 관점의 종합 결론" },
  { symbol: "句", fallbackTitle: "句 — 운명을 바꾸는 핵심 문장" },
  { symbol: "箋", fallbackTitle: "箋 — 최종 편지" },
] as const;

// 진행 화면 6노드(사주 → 자미두수 → 숙요 → 서양 → 베다 → 종합)와 1:1로 맞춘다.
// 이 화면에는 서버 진행률이 없어 시간 기반으로 넘어간다.
const LOADING_STAGES = [
  { icon: "柱", label: "사주의 기둥을 세우는 중...", duration: 1800 },
  { icon: "紫", label: "자미두수 12궁을 펼치는 중...", duration: 2000 },
  { icon: "宿", label: "숙요 27수의 인연을 잇는 중...", duration: 2000 },
  { icon: "星", label: "별자리의 심리를 읽는 중...", duration: 2000 },
  { icon: "梵", label: "베다의 업을 헤아리는 중...", duration: 2000 },
  { icon: "業", label: "다섯 관점을 하나로 모으는 중...", duration: 2600 },
] as const;

const PREMIUM_VALUE_CARDS = [
  "반복되는 관계의 업",
  "돈과 생존의 패턴",
  "직업과 사명의 방향",
  "원가족과 감정의 빚",
  "앞으로 1년의 해소 흐름",
  "3년 장기 운명 전략",
  "상담가의 최종 편지",
] as const;

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

function applyProfileSeedToForm(form: ConsultationForm, profile: AiPrefillSeed): ConsultationForm {
  if (!profile.name && !profile.gender && !profile.birthDate && !profile.birthTime && !profile.calendarType && !profile.timezone && !profile.city && !profile.country && profile.birthTimeUnknown === undefined && !profile.latitude && !profile.longitude) {
    return form;
  }
  const birthplace = {
    city: profile.city || form.birthPlace.city,
    country: profile.country || form.birthPlace.country,
    latitude: profile.latitude || form.birthPlace.latitude,
    longitude: profile.longitude || form.birthPlace.longitude,
    timezone: profile.timezone || form.birthPlace.timezone,
  };
  const resolvedGender = (profile.gender as GenderType) || form.gender;
  return {
    ...form,
    name: profile.name || form.name,
    gender: resolvedGender,
    birthDate: profile.birthDate || form.birthDate,
    birthTimeUnknown: profile.birthTimeUnknown ?? form.birthTimeUnknown,
    birthTime: profile.birthTimeUnknown === true ? "" : profile.birthTime || form.birthTime,
    calendarType: profile.calendarType || form.calendarType,
    birthPlace: {
      ...form.birthPlace,
      ...birthplace,
    },
  };
}

function buildInitialForm(): ConsultationForm {
  return applyProfileSeedToForm(defaultForm(), readAiProfileSeed());
}

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

type LensKey = "saju" | "ziwei" | "sukuyo" | "westernAstrology" | "vedicAstrology";

const LENS_FALLBACK_SUMMARY: Record<LensKey, string> = {
  saju: "일간과 오행의 균형으로 반복되는 선택 습관을 살핍니다.",
  ziwei: "명궁과 12궁의 배치로 삶의 무대와 사회적 역할을 살핍니다.",
  sukuyo: "본명숙과 27수의 거리로 인연에서 서게 되는 자리를 살핍니다.",
  westernAstrology: "태양과 달의 흐름으로 마음의 반복 방식을 살핍니다.",
  vedicAstrology: "라후와 케투의 축으로 익숙한 습관과 성장 방향을 살핍니다.",
};

/** 다섯 렌즈는 integratedResult.lenses 아래에 있고, 구 3체계는 최상위 별칭으로도 남아 있다. */
function readLensData(result: IntegratedResult | null | undefined, key: LensKey): unknown {
  const lenses = (result as Record<string, unknown> | null | undefined)?.lenses;
  const lensId = key === "westernAstrology" ? "western" : key === "vedicAstrology" ? "vedic" : key;
  const block = lenses && typeof lenses === "object" ? (lenses as Record<string, unknown>)[lensId] : null;
  if (block && typeof block === "object") {
    const data = (block as Record<string, unknown>).data;
    if (data && typeof data === "object") return data;
  }
  return (result as Record<string, unknown> | null | undefined)?.[key];
}

function summarizeSystem(result: IntegratedResult | null | undefined, key: LensKey) {
  const source = readLensData(result, key);
  if (!source || typeof source !== "object") return LENS_FALLBACK_SUMMARY[key];
  const summary = String((source as Record<string, unknown>).patternSummary || "").trim();
  return summary || LENS_FALLBACK_SUMMARY[key];
}

function formatChartDataValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    const primitiveValues = value
      .filter((item) => item !== null && item !== undefined && typeof item !== "object")
      .map((item) => String(item).trim())
      .filter(Boolean);
    if (primitiveValues.length) return primitiveValues.slice(0, 8).join(", ");
    return value.slice(0, 3).map((item) => formatChartDataValue(item)).filter(Boolean).join(" / ");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => [key, formatChartDataValue(item)] as const)
      .filter(([, item]) => item);
    return entries.slice(0, 6).map(([key, item]) => `${key}: ${item}`).join(" · ");
  }
  return "";
}

function formatChartDataLabel(path: string): string {
  return path
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectChartDataRows(source: unknown, prefix = "", limit = 18): { label: string; value: string }[] {
  if (!source || typeof source !== "object") return [];
  const rows: { label: string; value: string }[] = [];
  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    if (rows.length >= limit) break;
    const path = prefix ? `${prefix}.${key}` : key;
    const directValue = formatChartDataValue(value);
    if (directValue && (typeof value !== "object" || Array.isArray(value))) {
      rows.push({ label: formatChartDataLabel(path), value: directValue });
      continue;
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const nested = collectChartDataRows(value, path, limit - rows.length);
      if (nested.length) rows.push(...nested);
      else if (directValue) rows.push({ label: formatChartDataLabel(path), value: directValue });
    } else if (directValue) {
      rows.push({ label: formatChartDataLabel(path), value: directValue });
    }
  }
  return rows.slice(0, limit);
}

function buildChartDataBlocks(result: IntegratedResult | null | undefined): ChartDataBlock[] {
  // 자미 12궁·숙요 27수 관계축은 항목이 많아 기본 limit(18)로는 잘린다.
  const configs = [
    { key: "saju", label: "명리", title: "사주 원국 데이터", limit: 18 },
    { key: "ziwei", label: "자미두수", title: "자미두수 명반 데이터", limit: 30 },
    { key: "sukuyo", label: "숙요", title: "숙요 27수 데이터", limit: 26 },
    { key: "westernAstrology", label: "서양 점성술", title: "서양 점성술 차트 데이터", limit: 22 },
    { key: "vedicAstrology", label: "베다 점성술", title: "베다 점성술 차트 데이터", limit: 22 },
  ] as const;
  return configs
    .map(({ limit, ...config }) => {
      const data = readLensData(result, config.key);
      const rows = collectChartDataRows(data, "", limit).filter((row) => row.value.length <= 260);
      return {
        ...config,
        summary: summarizeSystem(result, config.key),
        rows,
      };
    })
    // 계산되지 않은 렌즈는 빈 카드로 남기지 않고 아예 뺀다("기준" 한 줄짜리 유령 카드 금지).
    .filter((block) => block.rows.length > 0);
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
    deferUsage: true,
    usagePolicy: "apply_after_success",
    cost: toNumber(runtimeGate.cost ?? paymentPayload.cost ?? paymentPayload.coinPrice, FEATURE_COST),
    coinPrice: toNumber(runtimeGate.coinPrice ?? paymentPayload.coinPrice ?? paymentPayload.cost, FEATURE_COST),
    amountKRW: toNumber(runtimeGate.amountKRW ?? paymentPayload.amountKRW ?? paymentPayload.paymentAmount ?? paymentPayload.totalAmount, FEATURE_AMOUNT_KRW),
    membershipCreditCost: toNumber(runtimeGate.membershipCreditCost ?? paymentPayload.membershipCreditCost ?? paymentPayload.cost, FEATURE_COST),
  };
}

function splitAssistantSections(content: string): ParsedSection[] {
  let normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  // 구조화 파싱에 실패한 원시(잘린) JSON은 중괄호째 노출하지 않고 읽을 수 있는 문장만 복원한다.
  if (looksLikeRawJson(normalized)) {
    normalized = extractReadableTextFromJsonLike(normalized);
    if (!normalized) return [];
  }

  const headingPattern = /(?:^|\n)(?:#{1,3}\s*)?(?:[①②③④⑤⑥⑦⑧⑨⑩]\s*)?([命業時情財課箋柱星梵])\s*[—–-]\s*([^\n]+)/g;
  const matches = [...normalized.matchAll(headingPattern)];
  if (matches.length) {
    return matches.map((match, index) => {
      const fallback = KARMA_SECTIONS[index] || KARMA_SECTIONS[KARMA_SECTIONS.length - 1];
      const start = (match.index || 0) + match[0].length;
      const end = matches[index + 1]?.index ?? normalized.length;
      const symbol = match[1] || fallback.symbol;
      return {
        symbol,
        title: `${symbol} — ${match[2].replace(/\*\*/g, "").trim()}`,
        body: normalized.slice(start, end).replace(/^\s+/, "").trim(),
      };
    }).filter((section) => section.body);
  }

  const chunks = normalized.split(/\n{2,}/).map((chunk) => chunk.trim()).filter(Boolean);
  return chunks.map((chunk, index) => {
    const fallback = KARMA_SECTIONS[index] || KARMA_SECTIONS[KARMA_SECTIONS.length - 1];
    const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
    const first = lines[0] || "";
    const headingMatch = first.match(/^(?:#{1,3}\s*)?(?:[①②③④⑤⑥⑦⑧⑨⑩]|\d+[.)])?\s*(.{2,48}?)(?:[:：])?$/);
    const hasHeading = Boolean(headingMatch && lines.length > 1 && first.length <= 54);
    return {
      symbol: fallback.symbol,
      title: hasHeading ? headingMatch?.[1]?.replace(/\*\*/g, "").trim() || fallback.fallbackTitle : fallback.fallbackTitle,
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
          <div className="kdai-result-section__head">
            <span>{section.symbol}</span>
            <h3>{section.title}</h3>
          </div>
          <p>{section.body}</p>
        </section>
      ))}
    </div>
  );
}

function KarmaLoadingScreen({ status }: { status: FlowStatus }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    setStage(status === "reading" ? 1 : 0);
    const timers = LOADING_STAGES.map((item, index) => {
      const delay = LOADING_STAGES.slice(0, index).reduce((total, stageItem) => total + stageItem.duration, 0);
      return window.setTimeout(() => setStage(index), delay);
    });
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [status]);

  const active = LOADING_STAGES[Math.min(stage, LOADING_STAGES.length - 1)];

  return (
    <div className="kdai-loading" role="status" aria-live="polite">
      <div className="kdai-loading__seal" aria-hidden="true">
        <div className="kdai-loading__core">{active.icon}</div>
        <svg viewBox="0 0 128 128">
          <circle cx="64" cy="64" r="58" />
        </svg>
      </div>
      <div className="kdai-loading__text">
        <p>{active.label}</p>
        <div className="kdai-loading__dots" aria-hidden="true">
          {LOADING_STAGES.map((_, index) => (
            <span key={index} data-active={index <= stage} />
          ))}
        </div>
      </div>
    </div>
  );
}

function KarmaResultModal({
  content,
  userData,
  integratedResult,
  onClose,
  onDownloadError,
}: {
  content: string;
  userData: ConsultationForm;
  integratedResult: IntegratedResult | null;
  onClose: () => void;
  onDownloadError: (message: string) => void;
}) {
  const [isDownloading, setIsDownloading] = useState(false);
  const sections = splitAssistantSections(content);
  const chartDataBlocks = buildChartDataBlocks(integratedResult);
  const userName = userData.name.trim() || "당신";
  const birthDate = userData.birthDate || "생년월일 미입력";

  const handleDownload = async () => {
    const element = document.getElementById("karma-result-content");
    if (!element || isDownloading) return;
    setIsDownloading(true);
    try {
      const { exportResultPdf } = await import("@/lib/pdf/export-result-pdf");
      const fileName = `운명의답장_${userName.replace(/[\\/:*?"<>|]/g, "_")}_${new Date().toLocaleDateString("ko-KR").replace(/\./g, "").replace(/\s/g, "")}.pdf`;
      await exportResultPdf({
        captureTargets: ["#karma-result-content [data-kdai-pdf-page]"],
        fileName,
        backgroundColor: "#060412",
        cover: {
          title: `${userName}님의 운명의 업 답장`,
          subtitle: birthDate,
          name: userName,
          date: new Date().toISOString().slice(0, 10),
        },
      });
    } catch {
      onDownloadError("PDF 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="kdai-result-modal" role="dialog" aria-modal="true" aria-label="운명의 답장">
      <header className="kdai-result-modal__bar">
        <div>
          <h2>운명의 답장</h2>
          <p>{userName} · {birthDate}</p>
        </div>
        <div className="kdai-result-modal__actions">
          <button type="button" onClick={handleDownload} disabled={isDownloading}>
            {isDownloading ? <Loader2 size={17} className="kdai-spin" /> : <Download size={17} />}
            <span>{isDownloading ? "저장 중" : "PDF 저장"}</span>
          </button>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>
      </header>

      <div id="karma-result-content" className="kdai-result-document">
        <div className="kdai-result-cover" data-kdai-pdf-page>
          <span aria-hidden="true">☽</span>
          <h2>운명의 답장</h2>
          <p>{userName}님의 명(命) · 업(業) · 시(時)</p>
        </div>

        <section className="kdai-chart-data" data-kdai-pdf-page>
          <div className="kdai-chart-data__head">
            <span>Chart Data</span>
            <h2>상담에 사용된 차트 데이터</h2>
            <p>명리, 서양 점성술, 베다 점성술의 계산값을 함께 담았습니다.</p>
          </div>
          <div className="kdai-chart-data__grid">
            {chartDataBlocks.map((block) => (
              <article key={block.key}>
                <div>
                  <span>{block.label}</span>
                  <h3>{block.title}</h3>
                  <p>{block.summary}</p>
                </div>
                <dl>
                  {block.rows.map((row) => (
                    <div key={`${block.key}-${row.label}`}>
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </section>

        {sections.map((section, index) => (
          <article className="kdai-result-document__section" data-kdai-pdf-page key={`${section.title}-${index}`}>
            <div>
              <span>{section.symbol}</span>
              <h3>{section.title}</h3>
            </div>
            <p>{section.body}</p>
          </article>
        ))}

        <footer data-kdai-pdf-page>Code Destiny · {new Date().toLocaleDateString("ko-KR")}</footer>
      </div>
    </div>
  );
}

export default function KarmaDestinyAiPage() {
  const [form, setForm] = useState<ConsultationForm>(() => buildInitialForm());
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
  const [resultOpen, setResultOpen] = useState(false);
  const startLockRef = useRef(false);
  const idempotencyKeyRef = useRef(createIdempotencyKey());
  const latestOpenedResultRef = useRef("");
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

  const statusText = useMemo(() => {
    if (status === "preparing") return "운명의 기록을 펼치고 있습니다";
    if (status === "payment") return "결제창을 확인해 주세요";
    if (status === "reading") return "삶의 반복 패턴과 업의 흐름을 읽고 있습니다";
    if (status === "ready") return "상담이 이어지고 있습니다";
    return "운명의 실을 펼칠 준비가 되어 있습니다";
  }, [status]);

  const isBusy = status === "preparing" || status === "payment" || status === "reading";
  const canAskFollowUp = Boolean(sessionId && messages.length && !sending && !isBusy);
  const latestAssistantContent = useMemo(() => {
    return [...messages].reverse().find((message) => message.role === "assistant")?.content || "";
  }, [messages]);

  useEffect(() => {
    if (status !== "ready" || !latestAssistantContent) return;
    const resultKey = `${sessionId}:${latestAssistantContent.length}:${latestAssistantContent.slice(0, 48)}`;
    if (latestOpenedResultRef.current === resultKey) return;
    latestOpenedResultRef.current = resultKey;
    setResultOpen(true);
  }, [latestAssistantContent, sessionId, status]);

  const resetAttempt = useCallback(() => {
    // 모든 사용자 입력 핸들러가 이 함수를 거치므로, 여기서 입력 시작 여부를 기록
    formTouchedRef.current = true;
    if (isBusy) return;
    idempotencyKeyRef.current = createIdempotencyKey();
    setSessionId("");
    setAccessType("");
    setMessages([]);
    setSummaryCards(null);
    setIntegratedResult(null);
    setResultOpen(false);
    latestOpenedResultRef.current = "";
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
    // 다음 화면(생성 로딩)이 마운트되는 시점 — 게이트 오버레이 hold를 해제한다.
    releasePaidFeatureGate(idempotencyKey);
    const { payload: result } = await postJson<ConsultationResult>("/api/karma-destiny-ai/start", {
      ...payload,
      ...access,
    }, idempotencyKey);

    if (result.ok && result.sessionId) {
      setSessionId(result.sessionId || "");
      setAccessType(result.accessType || "");
      setMessages(Array.isArray(result.messages) ? result.messages : []);
      setSummaryCards(result.summaryCards || null);
      setIntegratedResult(result.integratedResult || null);
      setNotice("");
      setError("");
      setStatus("reading");
      const target = `/karma-destiny-ai/result?sessionId=${encodeURIComponent(result.sessionId)}${result.status === "completed" ? "" : "&pending=1"}`;
      window.location.assign(target);
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
    const gate = await runBillingCoinGate(billingInput);

    if (!gate.ok || !gate.data) {
      const code = String(gate.error?.code || "").toUpperCase();
      if (code === "AUTH_REQUIRED" || code === "LOGIN_REQUIRED") throw new Error(LOGIN_REQUIRED_MESSAGE);
      if (code === "INSUFFICIENT_COINS") throw new Error(PAYMENT_REQUIRED_MESSAGE);
      if (code === "PAYMENT_CANCELLED") throw new Error(PAYMENT_CANCELLED_MESSAGE);
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
    let paymentAttempted = false;
    setError("");
    setNotice("");
    setStatus("preparing");
    beginPaidFeatureGateCheck({
      featureKey: FEATURE_KEY,
      requestId: idempotencyKey,
      title: "이용권 확인",
      reason: "운명의 업 전문가 상담",
      paymentMode: "MEMBERSHIP_PASS",
    });
    // 이용권 판정(unlock-status)을 아래 ensure-access 왕복과 겹쳐 돌린다 — 결제 게이트가 같은 키로 재사용해 직렬 왕복이 1회 준다.
    void primePaymentEligibility(buildBillingGateInput({}, idempotencyKey));
    // 확인 완료 후 다음 화면(생성 로딩)이 실제로 뜰 때까지 게이트 오버레이를 유지해 "확인 중 → 공백"을 막는다.
    // release는 startConsultation의 setStatus("reading")에서 호출한다(안전장치 상한 8초).
    holdPaidFeatureGateOpen({ requestId: idempotencyKey, maxMs: 8000 });

    try {
      const { payload: access } = await postJson<EnsureAccessResult>("/api/karma-destiny-ai/ensure-access", payload, idempotencyKey);
      if (access.ok) {
        completePaidFeatureGateCheck({
          featureKey: FEATURE_KEY,
          requestId: idempotencyKey,
          title: "이용권 확인 완료",
          reason: "운명의 업 전문가 상담",
          paymentMode: "MEMBERSHIP_PASS",
          message: "이용권 확인이 끝났습니다. 업의 흐름을 읽고 있습니다.",
        });
        await startConsultation(payload, idempotencyKey, { accessToken: access.accessToken });
        return;
      }
      const denied = access as Exclude<EnsureAccessResult, { ok: true }>;
      if (denied.reason === "LOGIN_REQUIRED") throw new Error(LOGIN_REQUIRED_MESSAGE);
      if (denied.reason === "INVALID_INPUT") throw new Error(denied.message);
      // 이용권 확인 앞단의 일시 장애(degraded)면 dead-end 대신 결제창(단건+월정석)을 연다(요구사항: 확인 실패 시 무조건 결제창).
      // runCommonBillingGate가 billing.js coin-gate로 pass를 재검사(재시도 포함)해 보유자면 무료통과, 미커버/장애면 결제창.
      const passGateDegraded = (denied as Record<string, unknown>).retryable === true || String(denied.reason) === "DB_DEGRADED";
      if (denied.reason === "PAYMENT_REQUIRED" || passGateDegraded) {
        paymentAttempted = true;
        setNotice(("message" in denied && denied.message) || PAYMENT_REQUIRED_MESSAGE);
        setStatus("payment");
        const gatePayload = ("paymentPayload" in denied ? denied.paymentPayload : {}) as BillingGatePayload;
        const billingEvidence = await runCommonBillingGate(gatePayload, idempotencyKey);
        await startConsultation(payload, idempotencyKey, billingEvidence);
        return;
      }
      throw new Error("message" in denied ? denied.message || SERVER_ERROR_MESSAGE : SERVER_ERROR_MESSAGE);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : SERVER_ERROR_MESSAGE;
      const paymentCancelled = message === PAYMENT_CANCELLED_MESSAGE;
      setError(
        message === LOGIN_REQUIRED_MESSAGE
          || message === PAYMENT_VERIFY_FAILED_MESSAGE
          || message === PAYMENT_CANCELLED_MESSAGE
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
      failPaidFeatureGateCheck({
        featureKey: FEATURE_KEY,
        requestId: idempotencyKey,
        title: "이용권 확인 실패",
        reason: "운명의 업 전문가 상담",
        paymentMode: "MEMBERSHIP_PASS",
        message,
        cancelled: paymentCancelled,
      });
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
    <main className="kdai-page" data-karma-destiny-ai="v20260629">
      <section className="kdai-hero" aria-label="운명의 업 전문가 상담">
        <div className="kdai-hero__sigil" aria-hidden="true" />
        <div className="kdai-hero__image kdai-hero__image--sigil" data-cd-marker="karma-destiny-ai-css-visual-v20260629" aria-hidden="true">
          <div className="kdai-oracle">
            <span className="kdai-oracle__ring kdai-oracle__ring--outer" />
            <span className="kdai-oracle__ring kdai-oracle__ring--middle" />
            <span className="kdai-oracle__thread kdai-oracle__thread--one" />
            <span className="kdai-oracle__thread kdai-oracle__thread--two" />
            <div className="kdai-oracle__core">
              <span className="kdai-oracle__glyph">業</span>
              <span className="kdai-oracle__axis">命 · 業 · 時</span>
            </div>
            <div className="kdai-oracle__status">{statusText}</div>
            <div className="kdai-oracle__keywords">
              {keywords.map((keyword) => (
                <span className="kdai-oracle__keyword" key={keyword}>{keyword}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="kdai-hero__copy">
          <div className="kdai-kicker"><Moon size={16} /> Karma · Saju · Astrology · Vedic Reading</div>
          <h2>운명의 업 전문가 상담</h2>
          <p>반복되는 인생의 흐름 속에서, 지금 끊어내야 할 패턴과 새롭게 열어야 할 길을 읽어드립니다.</p>
          <div className="kdai-status" data-status={status}>
            {isBusy ? <Loader2 size={16} className="kdai-spin" /> : <Sparkles size={16} />}
            <span>{statusText}</span>
          </div>
          {accessType && <p className="kdai-access">이용 방식: {accessType}</p>}
        </div>
      </section>

      <section className="kdai-premium-map" aria-label="운명의 업 상담 구성">
        <div className="kdai-premium-map__intro">
          <span>Premium Karma Report</span>
          <h2>30,000자 이상으로 여는 운명의 업 리포트</h2>
          <p>5만 원 상담에 맞게 명리, 점성, 베다 상징과 현실 행동 전략을 16장 장문 흐름으로 엮습니다.</p>
        </div>
        <div className="kdai-premium-map__cards">
          {PREMIUM_VALUE_CARDS.map((item) => (
            <article key={item}>
              <Sparkles size={16} />
              <strong>{item}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="kdai-workspace">
        <form className="kdai-form kdai-panel" onSubmit={handleSubmit}>
          <div className="kdai-panel-title kdai-panel-title--split">
            <div>
              <CalendarDays size={18} />
              <h2>운명의 실을 읽기 위한 정보</h2>
            </div>
            <button
              className="kdai-ghost-action"
              type="button"
              onClick={loadFormFromProfileCard}
              aria-label="프로필 카드에서 출생 정보 불러오기"
            >
              <span>프로필 카드에서 불러오기</span>
            </button>
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
              <input {...birthDateTextInputProps(form.birthDate, (nextBirthDate) => { setForm((prev) => ({ ...prev, birthDate: nextBirthDate })); resetAttempt(); })} required />
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
          {/* 5만원이 무엇을 사는지 숫자로 밝힌다. 값은 worker/routes/karma-destiny-ai.js 의
              INITIAL_CONSULTATION_MIN_LENGTH·PREMIUM_CHAPTERS·PREMIUM_REINFORCEMENT_MAX_ATTEMPTS
              가 실제로 강제하는 계약이다. */}
          <DeliverableSpec
            keyPrefix="karmaDestiny.deliverable"
            className="kdai-deliverable"
            titleClassName="kdai-deliverable__title"
            labelClassName="kdai-deliverable__label"
            valueClassName="kdai-deliverable__value"
            noteClassName="kdai-deliverable__note"
          />
          <div className="flex items-center justify-end">
            <PriceBadge featureKey="karma-destiny-ai-consultation" prefix="상담 이용 가격 " />
          </div>
          <button className="kdai-primary" type="submit" disabled={isBusy}>
            {isBusy ? <Loader2 size={18} className="kdai-spin" /> : <WalletCards size={18} />}
            <span>{isBusy ? "운명의 실을 따라가는 중..." : "운명의 업 전문가 상담 받기"}</span>
          </button>
        </form>

        <section className="kdai-result kdai-panel" aria-live="polite">
          <div className="kdai-panel-title kdai-panel-title--split">
            <div>
              <Sparkles size={18} />
              <h2>상담 카드</h2>
            </div>
            {latestAssistantContent && (
              <button className="kdai-ghost-action" type="button" onClick={() => setResultOpen(true)}>
                <Maximize2 size={16} />
                <span>전체화면</span>
              </button>
            )}
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

      {(status === "preparing" || status === "reading") && <KarmaLoadingScreen status={status} />}
      {resultOpen && latestAssistantContent && (
        <KarmaResultModal
          content={latestAssistantContent}
          userData={form}
          integratedResult={integratedResult}
          onClose={() => setResultOpen(false)}
          onDownloadError={setError}
        />
      )}

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

        .kdai-premium-map {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: minmax(240px, 340px) minmax(0, 1fr);
          gap: clamp(14px, 2.5vw, 24px);
          align-items: stretch;
          max-width: 1220px;
          margin: 0 auto clamp(16px, 3vw, 28px);
        }

        .kdai-premium-map__intro,
        .kdai-premium-map__cards article {
          border: 1px solid rgba(239, 204, 137, .2);
          border-radius: 8px;
          background: rgba(9, 8, 24, .7);
          box-shadow: inset 0 1px 0 rgba(255, 247, 223, .08);
        }

        .kdai-premium-map__intro {
          padding: clamp(16px, 2.5vw, 24px);
        }

        .kdai-premium-map__intro span {
          display: block;
          margin-bottom: 8px;
          color: #f8d06f;
          font-size: .76rem;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .kdai-premium-map__intro h2 {
          margin: 0 0 10px;
          color: #fff5d6;
          font-family: CodeDestinyDisplay, serif;
          font-size: clamp(1.35rem, 2vw, 2rem);
          letter-spacing: 0;
        }

        .kdai-premium-map__intro p {
          margin: 0;
          color: rgba(255, 247, 223, .76);
          line-height: 1.72;
        }

        .kdai-premium-map__cards {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .kdai-premium-map__cards article {
          display: flex;
          min-height: 86px;
          flex-direction: column;
          justify-content: space-between;
          padding: 14px;
          color: #f9f0dc;
        }

        .kdai-premium-map__cards svg {
          color: #f8d06f;
        }

        .kdai-premium-map__cards strong {
          font-size: .95rem;
          line-height: 1.42;
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
          display: grid;
          place-items: center;
          min-height: 320px;
          aspect-ratio: 1 / 1;
          border-radius: 8px;
          border: 1px solid rgba(239, 204, 137, .28);
          background:
            linear-gradient(135deg, rgba(255, 247, 223, .12), transparent 33%),
            linear-gradient(28deg, rgba(148, 31, 52, .28), transparent 54%),
            conic-gradient(from 142deg at 50% 52%, rgba(239, 204, 137, .2), rgba(8, 10, 22, .96), rgba(109, 37, 47, .34), rgba(7, 10, 22, .98), rgba(239, 204, 137, .16));
          box-shadow: inset 0 0 0 1px rgba(255, 247, 223, .05);
        }

        .kdai-hero__copy,
        .kdai-form,
        .kdai-result {
          position: relative;
          z-index: 1;
        }

        .kdai-hero__image--sigil::before,
        .kdai-hero__image--sigil::after {
          position: absolute;
          content: "";
          pointer-events: none;
        }

        .kdai-hero__image--sigil::before {
          inset: 18px;
          border: 1px solid rgba(239, 204, 137, .2);
          border-radius: 50%;
          transform: rotate(-8deg);
        }

        .kdai-hero__image--sigil::after {
          inset: 34px 30px;
          border: 1px solid rgba(255, 255, 255, .1);
          border-radius: 8px;
          transform: rotate(8deg);
        }

        .kdai-oracle {
          position: relative;
          display: grid;
          place-items: center;
          width: min(82%, 300px);
          aspect-ratio: 1;
          color: #fff7df;
        }

        .kdai-oracle__ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(239, 204, 137, .32);
          background:
            repeating-conic-gradient(from 18deg, rgba(239, 204, 137, .24) 0 3deg, transparent 3deg 17deg),
            radial-gradient(circle, transparent 0 54%, rgba(239, 204, 137, .12) 55% 57%, transparent 58%);
          animation: kdaiSlowTurn 34s linear infinite;
        }

        .kdai-oracle__ring--outer {
          inset: 0;
        }

        .kdai-oracle__ring--middle {
          inset: 22%;
          background: none;
          border-color: rgba(255, 247, 223, .22);
          animation-duration: 24s;
          animation-direction: reverse;
        }

        .kdai-oracle__thread {
          position: absolute;
          width: 118%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(239, 204, 137, .76), rgba(244, 114, 182, .38), transparent);
          box-shadow: 0 0 18px rgba(239, 204, 137, .22);
        }

        .kdai-oracle__thread--one {
          transform: rotate(-28deg);
        }

        .kdai-oracle__thread--two {
          transform: rotate(32deg);
          opacity: .72;
        }

        .kdai-oracle__core {
          position: relative;
          display: grid;
          place-items: center;
          gap: 10px;
          text-align: center;
        }

        .kdai-oracle__glyph {
          font-family: CodeDestinyDisplay, CodeDestinyBody, serif;
          font-size: 86px;
          font-weight: 900;
          line-height: 1;
          text-shadow: 0 0 30px rgba(239, 204, 137, .5), 0 2px 18px rgba(0, 0, 0, .62);
        }

        .kdai-oracle__axis,
        .kdai-oracle__status,
        .kdai-oracle__keyword {
          border: 1px solid rgba(239, 204, 137, .24);
          border-radius: 999px;
          background: rgba(7, 10, 22, .68);
          color: rgba(255, 247, 223, .82);
          font-size: 12px;
          font-weight: 900;
          line-height: 1.3;
        }

        .kdai-oracle__axis {
          padding: 5px 10px;
          letter-spacing: .08em;
        }

        .kdai-oracle__status {
          position: absolute;
          right: -6%;
          bottom: 20%;
          max-width: 190px;
          padding: 8px 10px;
          overflow-wrap: anywhere;
          text-align: center;
          box-shadow: 0 14px 34px rgba(0, 0, 0, .26);
        }

        .kdai-oracle__keywords {
          position: absolute;
          left: 50%;
          bottom: -8px;
          display: flex;
          width: min(112%, 330px);
          transform: translateX(-50%);
          justify-content: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .kdai-oracle__keyword {
          max-width: 120px;
          padding: 6px 9px;
          overflow-wrap: anywhere;
          text-align: center;
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

        .kdai-hero h2 {
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

        .kdai-panel-title--split {
          display: flex;
          justify-content: space-between;
          width: 100%;
        }

        .kdai-panel-title--split > div,
        .kdai-ghost-action {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .kdai-ghost-action {
          min-height: 34px;
          padding: 0 10px;
          border: 1px solid rgba(239, 204, 137, .26);
          border-radius: 8px;
          color: #ffe4a3;
          background: rgba(255, 252, 243, .08);
          font: inherit;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
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

        .kdai-deliverable {
          display: grid;
          gap: 12px;
          margin-top: 18px;
          padding: 14px;
          border: 1px solid rgba(241, 205, 124, .22);
          border-radius: 10px;
          background: rgba(0, 0, 0, .22);
        }

        @media (min-width: 640px) {
          .kdai-deliverable {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        .kdai-deliverable__title {
          margin: 0;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: .02em;
          color: #f1cd7c;
        }

        .kdai-deliverable__label {
          font-size: 11px;
          font-weight: 700;
          color: #c3ab7d;
        }

        .kdai-deliverable__value {
          margin: 4px 0 0;
          font-size: 14px;
          font-weight: 800;
          line-height: 1.5;
          color: #ffe4a3;
        }

        .kdai-deliverable__note {
          margin: 0;
          font-size: 11px;
          line-height: 1.6;
          color: #c3ab7d;
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
          margin: 0;
          color: #ffe4a3;
          font-size: 15px;
          line-height: 1.35;
          letter-spacing: 0;
        }

        .kdai-result-section__head {
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr);
          gap: 10px;
          align-items: center;
          margin-bottom: 8px;
        }

        .kdai-result-section__head span {
          display: grid;
          place-items: center;
          width: 34px;
          aspect-ratio: 1;
          margin: 0;
          border: 1px solid rgba(239, 204, 137, .28);
          border-radius: 50%;
          color: #f1cd7c;
          font-family: CodeDestinyDisplay, serif;
          font-size: 18px;
        }

        .kdai-result-section p {
          white-space: pre-wrap;
          line-height: 1.8;
          word-break: keep-all;
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

        .kdai-loading,
        .kdai-result-modal {
          position: fixed;
          inset: 0;
          z-index: 90;
          color: #fff7df;
          background: rgba(6, 4, 18, .96);
          backdrop-filter: blur(14px);
        }

        .kdai-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 28px;
          padding: 24px;
        }

        .kdai-loading__seal {
          position: relative;
          display: grid;
          place-items: center;
          width: clamp(112px, 24vw, 144px);
          aspect-ratio: 1;
        }

        .kdai-loading__seal::before {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          content: "";
          background: conic-gradient(from 10deg, rgba(124, 58, 237, .34), rgba(217, 119, 6, .28), rgba(20, 184, 166, .22), rgba(124, 58, 237, .34));
          filter: blur(10px);
          animation: kdaiSlowTurn 8s linear infinite;
        }

        .kdai-loading__core {
          position: relative;
          z-index: 1;
          display: grid;
          place-items: center;
          width: 78%;
          aspect-ratio: 1;
          border: 1px solid rgba(239, 204, 137, .36);
          border-radius: 50%;
          color: #ffe4a3;
          background: linear-gradient(145deg, rgba(44, 24, 84, .92), rgba(10, 8, 21, .94));
          font-size: 42px;
          box-shadow: inset 0 0 28px rgba(255, 252, 243, .08), 0 18px 44px rgba(0, 0, 0, .32);
        }

        .kdai-loading__seal svg {
          position: absolute;
          inset: 0;
          z-index: 2;
          width: 100%;
          height: 100%;
          animation: kdaiSlowTurn 9s linear infinite;
        }

        .kdai-loading__seal circle {
          fill: none;
          stroke: rgba(255, 228, 163, .76);
          stroke-width: 1.4;
          stroke-dasharray: 4 9;
        }

        .kdai-loading__text {
          text-align: center;
        }

        .kdai-loading__text p {
          margin: 0;
          color: #d9c3ff;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: .08em;
        }

        .kdai-loading__dots {
          display: flex;
          justify-content: center;
          gap: 9px;
          margin-top: 16px;
        }

        .kdai-loading__dots span {
          width: 8px;
          aspect-ratio: 1;
          border-radius: 50%;
          background: rgba(255, 255, 255, .22);
          transition: transform .3s ease, background .3s ease;
        }

        .kdai-loading__dots span[data-active="true"] {
          transform: scale(1.35);
          background: #f1cd7c;
        }

        .kdai-result-modal {
          z-index: 100;
          overflow-y: auto;
        }

        .kdai-result-modal__bar {
          position: sticky;
          top: 0;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 14px clamp(16px, 4vw, 28px);
          border-bottom: 1px solid rgba(239, 204, 137, .18);
          background: rgba(10, 8, 21, .9);
          backdrop-filter: blur(16px);
        }

        .kdai-result-modal__bar h2 {
          margin: 0;
          color: #f1cd7c;
          font-family: CodeDestinyDisplay, CodeDestinyBody, serif;
          font-size: 19px;
          letter-spacing: 0;
        }

        .kdai-result-modal__bar p {
          margin: 4px 0 0;
          color: rgba(255, 247, 223, .48);
          font-size: 12px;
        }

        .kdai-result-modal__actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .kdai-result-modal__actions button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 38px;
          padding: 0 12px;
          border: 1px solid rgba(239, 204, 137, .28);
          border-radius: 8px;
          color: #ffe4a3;
          background: rgba(255, 252, 243, .08);
          font: inherit;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .kdai-result-modal__actions button:last-child {
          width: 38px;
          padding: 0;
          color: rgba(255, 247, 223, .78);
        }

        .kdai-result-modal__actions button:disabled {
          cursor: not-allowed;
          opacity: .62;
        }

        .kdai-result-document {
          width: min(100%, 760px);
          margin: 0 auto;
          padding: clamp(28px, 7vw, 58px) clamp(18px, 5vw, 44px) 54px;
          background:
            linear-gradient(180deg, rgba(255, 252, 243, .035), rgba(255, 252, 243, 0)),
            #060412;
        }

        .kdai-result-cover {
          padding: 22px 0 34px;
          border-bottom: 1px solid rgba(239, 204, 137, .22);
          text-align: center;
        }

        .kdai-result-cover span {
          display: block;
          color: #f1cd7c;
          font-size: 54px;
          line-height: 1;
        }

        .kdai-result-cover h2 {
          margin: 12px 0 6px;
          color: #fff7df;
          font-family: CodeDestinyDisplay, CodeDestinyBody, serif;
          font-size: clamp(29px, 7vw, 42px);
          line-height: 1.15;
          letter-spacing: 0;
        }

        .kdai-result-cover p,
        .kdai-result-document footer {
          margin: 0;
          color: rgba(255, 247, 223, .48);
          font-size: 13px;
        }

        .kdai-chart-data {
          padding: clamp(30px, 7vw, 46px) 0;
          border-bottom: 1px solid rgba(239, 204, 137, .12);
        }

        .kdai-chart-data__head {
          margin-bottom: 18px;
        }

        .kdai-chart-data__head span,
        .kdai-chart-data article > div > span {
          display: block;
          margin-bottom: 7px;
          color: rgba(241, 205, 124, .82);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        .kdai-chart-data__head h2 {
          margin: 0 0 8px;
          color: #fff7df;
          font-family: CodeDestinyDisplay, CodeDestinyBody, serif;
          font-size: clamp(22px, 5vw, 30px);
          line-height: 1.22;
          letter-spacing: 0;
        }

        .kdai-chart-data__head p,
        .kdai-chart-data article > div > p {
          margin: 0;
          color: rgba(255, 247, 223, .7);
          font-size: 14px;
          line-height: 1.7;
        }

        .kdai-chart-data__grid {
          display: grid;
          gap: 14px;
        }

        .kdai-chart-data article {
          border: 1px solid rgba(239, 204, 137, .16);
          border-radius: 8px;
          background: rgba(255, 255, 255, .045);
          padding: 18px;
        }

        .kdai-chart-data article h3 {
          margin: 0 0 8px;
          color: #ffe4a3;
          font-size: 18px;
          line-height: 1.35;
          letter-spacing: 0;
        }

        .kdai-chart-data dl {
          display: grid;
          gap: 8px;
          margin: 16px 0 0;
        }

        .kdai-chart-data dl > div {
          display: grid;
          grid-template-columns: minmax(120px, .34fr) minmax(0, 1fr);
          gap: 10px;
          border-top: 1px solid rgba(239, 204, 137, .1);
          padding-top: 8px;
        }

        .kdai-chart-data dt {
          color: rgba(241, 205, 124, .78);
          font-size: 12px;
          font-weight: 900;
          line-height: 1.55;
          word-break: keep-all;
        }

        .kdai-chart-data dd {
          margin: 0;
          color: rgba(255, 247, 223, .78);
          font-size: 12px;
          line-height: 1.65;
          overflow-wrap: anywhere;
        }

        .kdai-result-document__section {
          padding: clamp(30px, 7vw, 46px) 0;
          border-bottom: 1px solid rgba(239, 204, 137, .12);
        }

        .kdai-result-document__section > div {
          display: grid;
          grid-template-columns: 54px minmax(0, 1fr);
          gap: 16px;
          align-items: center;
          margin-bottom: 16px;
        }

        .kdai-result-document__section span {
          display: grid;
          place-items: center;
          width: 54px;
          aspect-ratio: 1;
          border: 1px solid rgba(239, 204, 137, .32);
          border-radius: 50%;
          color: rgba(241, 205, 124, .9);
          font-family: CodeDestinyDisplay, serif;
          font-size: 30px;
        }

        .kdai-result-document__section h3 {
          margin: 0;
          color: #ffe4a3;
          font-size: clamp(18px, 4.4vw, 23px);
          line-height: 1.34;
          letter-spacing: 0;
        }

        .kdai-result-document__section p {
          margin: 0;
          color: rgba(255, 247, 223, .8);
          font-size: 15px;
          line-height: 2.05;
          white-space: pre-wrap;
          word-break: keep-all;
          overflow-wrap: anywhere;
        }

        .kdai-result-document footer {
          padding-top: 30px;
          text-align: center;
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
          .kdai-premium-map,
          .kdai-workspace,
          .kdai-summary,
          .kdai-system-cards {
            grid-template-columns: 1fr;
          }

          .kdai-premium-map__cards {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .kdai-hero__image {
            min-height: 260px;
            max-height: none;
            aspect-ratio: 16 / 9;
          }

          .kdai-oracle {
            width: min(72%, 250px);
          }

          .kdai-oracle__glyph {
            font-size: 64px;
          }

          .kdai-oracle__status {
            right: 50%;
            bottom: 14%;
            max-width: 220px;
            transform: translateX(50%);
          }

          .kdai-oracle__keywords {
            bottom: -4px;
            width: min(118%, 310px);
          }

          .kdai-hero h2 {
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

          .kdai-panel-title--split,
          .kdai-result-modal__bar {
            align-items: flex-start;
            flex-direction: column;
          }

          .kdai-result-modal__actions,
          .kdai-result-modal__actions button:first-child {
            width: 100%;
          }

          .kdai-result-modal__actions button:first-child {
            flex: 1;
          }

          .kdai-result-document__section > div {
            grid-template-columns: 46px minmax(0, 1fr);
            gap: 12px;
          }

          .kdai-result-document__section span {
            width: 46px;
            font-size: 25px;
          }

          .kdai-chart-data dl > div {
            grid-template-columns: 1fr;
            gap: 3px;
          }
        }
      `}</style>
    </main>
  );
}
