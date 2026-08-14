"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock3, Compass, Download, Loader2, MapPin, Moon, Sparkles, Star } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import AnalysisBasisLoading from "@/components/fortune/AnalysisBasisLoading";
import AnalysisBasisPanel from "@/components/fortune/AnalysisBasisPanel";
import { fetchAnalysisBasis, type AnalysisBasis } from "@/lib/fortune/analysis-basis";
import { isRetriableResultPollFailure, runAccessCheckWithTransientRetry } from "@/app/_lib/consultationResultPolling";
import { extractReadableTextFromJsonLike, looksLikeRawJson, splitIntoParagraphs, toDisplayText } from "@/lib/llm-text";
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
import { DashaProgressRing, DashaTimeline, getGrahaMeta, GrahaNatureDot, HeroChartPreview, NorthIndianChart } from "./VedicChartVisuals";
import styles from "./VedicAiClient.module.css";

type Gender = "male" | "female" | "unknown" | "";
type CalendarType = "solar" | "lunar" | "";
type FocusArea = "overall" | "love" | "money" | "career" | "health" | "relationship" | "spirituality" | "custom";
type Phase = "idle" | "access" | "payment" | "start";
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
  strongGrahas?: string[];
  majorBhavas?: string[];
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
  analysisBasis?: AnalysisBasis | null;
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
  sessionId?: string;
  status?: string;
  consultation?: Consultation;
};
type PendingAccess = {
  requestId: string;
  access: Record<string, unknown>;
  paymentWasRequired: boolean;
};
type GeocodeState = {
  lat: string;
  lng: string;
  name: string;
  fallback: boolean;
};

const FEATURE_KEY = "vedic-ai-consultation";
const CONSULTATION_TYPE = "vedic";
const FEATURE_COST = 300;
const AMOUNT_KRW = 30000;
const MEMBERSHIP_CREDIT_COST = 3000;
const REASON = "베다점 전문가 상담";

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

const TIMEZONE_OPTIONS = [
  { value: "Asia/Seoul", label: "한국 (KST +9)" },
  { value: "Asia/Shanghai", label: "중국/싱가포르 (CST +8)" },
  { value: "Asia/Kolkata", label: "인도 (IST +5:30)" },
  { value: "Europe/London", label: "영국 (GMT 0)" },
  { value: "America/New_York", label: "미국 동부 (EST -5)" },
  { value: "America/Los_Angeles", label: "미국 서부 (PST -8)" },
];

const COSMOS_STAGES = [
  { glyph: "ॐ", label: "출생 좌표를 우주 시간으로 변환하는 중", sub: "Julian Day 계산" },
  { glyph: "☉", label: "태양의 항로를 추적하는 중", sub: "Surya 황경 계산" },
  { glyph: "☽", label: "달의 나크샤트라를 찾는 중", sub: "Chandra Nakshatra" },
  { glyph: "↑", label: "어센던트를 세우는 중", sub: "Lagna 계산" },
  { glyph: "★", label: "다샤의 흐름을 읽는 중", sub: "Vimshottari Dasha" },
  { glyph: "✦", label: "조티시 해석을 완성하는 중", sub: "AI 서사 생성" },
];

const COSMOS_ORBITS = [
  { r: 56, speed: 1, color: "rgba(251,191,36,0.9)", size: 6 },
  { r: 78, speed: 0.6, color: "rgba(196,181,253,0.9)", size: 5 },
  { r: 100, speed: 0.4, color: "rgba(251,113,133,0.7)", size: 4 },
  { r: 122, speed: 0.25, color: "rgba(134,239,172,0.7)", size: 4 },
  { r: 144, speed: 0.15, color: "rgba(148,163,184,0.6)", size: 3 },
];

const COSMOS_STARS = Array.from({ length: 90 }, (_, index) => ({
  top: `${(index * 37) % 100}%`,
  left: `${(index * 61) % 100}%`,
  size: `${0.5 + (index % 3) * 0.45}px`,
  opacity: 0.18 + (index % 7) * 0.08,
  delay: `${(index % 9) * 0.35}s`,
}));

const SCORE_LABELS: Record<string, string> = {
  dharma: "다르마",
  artha: "아르타",
  kama: "카마",
  moksha: "목샤",
};

const SECTION_GLYPHS: Record<string, string> = {
  lagna: "↑",
  rashi: "R",
  graha: "G",
  bhava: "B",
  nakshatra: "☽",
  dasha: "★",
  vimshottari_dasha: "V",
};

const ERROR_TEXT: Record<string, string> = {
  INPUT_MISSING: "베다점 상담에 필요한 정보가 부족해요. 생년월일, 성별, 출생시간 정보를 다시 확인해 주세요.",
  BIRTH_TIME_MISSING: "베다점은 출생시간이 중요해요. 출생시간을 입력하거나 ‘출생시간 모름’을 선택해 주세요.",
  CUSTOM_QUESTION_MISSING: "직접 질문을 선택했다면 지금 가장 궁금한 내용을 함께 적어 주세요.",
  BIRTH_PLACE_INVALID: "라그나와 바바 계산에는 출생지 좌표가 필요해요. 도시명을 다시 확인해 주세요.",
  LOGIN_REQUIRED: "로그인이 필요한 상담입니다. 로그인 후 다시 시도해 주세요.",
  PAYMENT_REQUIRED: "이용권 또는 결제가 필요한 상담입니다. 결제 정보를 확인해 주세요.",
  PAYMENT_VERIFY_FAILED: "결제 정보를 확인하지 못했어요. 결제나 이용권은 차감되지 않았습니다.",
  PAYMENT_CANCELLED: "결제가 취소되었습니다. 필요할 때 다시 진행할 수 있습니다.",
  PREPARE_FAILED: "베다점 상담을 준비하는 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.",
  CHART_CALCULATION_FAILED: "베다 차트를 계산하는 중 문제가 발생했어요. 입력한 출생 정보를 다시 확인해 주세요.",
  LLM_FAILED: "전문가 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동으로 복구됩니다.",
  NETWORK_ERROR: "연결이 불안정해요. 잠시 후 다시 시도해 주세요.",
  SERVER_ERROR: "베다점 상담을 준비하는 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.",
  GENERATION_TIMEOUT: "상담 생성이 평소보다 오래 걸리고 있습니다. 페이지를 닫지 말고 잠시 후 다시 시도해 주세요.",
  TEMPORARY_UNAVAILABLE: "지금 접속이 잠시 불안정해요. 이용권은 그대로 보존되니, 잠시 후 다시 시도해 주세요.",
};

// 상담문은 삶의 주제 네 갈래로 온다. 구 7섹션 제목은 지우지 않는다 —
// 이 배열은 구조화 파싱에 실패한 옛 상담문에서 문단 제목을 되찾는 폴백으로도 쓰인다.
const SECTION_TITLES = [
  "카르마의 기원",
  "물질적 성취와 다르마",
  "인연과 영혼의 파트너",
  "현재의 다샤 흐름과 우파야",
  "라그나, Lagna",
  "라시, Rashi",
  "그라하, Graha",
  "바바, Bhava",
  "나크샤트라, Nakshatra",
  "다샤, Dasha",
  "빈쇼타리 다샤, Vimshottari Dasha",
];

// 결과 카드의 표시 순서. LLM이 내보낸 키 순서를 그대로 믿으면 근거 섹션이 본문 앞에 끼어들고,
// 구 7섹션 상담은 아예 다른 순서로 열린다. 여기 없는 키(근거 섹션 등)는 원래 순서를 유지한 채 뒤에 붙는다.
const ORDERED_SECTION_KEYS = [
  "karma_origin",
  "dharma_artha",
  "relationship_soul",
  "dasha_upaya",
  // 아래는 이 개편 이전에 저장된 상담을 그대로 열기 위한 구버전 키다. 지우지 말 것.
  "lagna",
  "rashi",
  "graha",
  "bhava",
  "nakshatra",
  "dasha",
  "vimshottari_dasha",
];

function orderReadingSections(sections: Record<string, unknown>) {
  const entries = Object.entries(sections);
  const rank = (key: string) => {
    const index = ORDERED_SECTION_KEYS.indexOf(key);
    return index === -1 ? ORDERED_SECTION_KEYS.length : index;
  };
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => rank(a.entry[0]) - rank(b.entry[0]) || a.index - b.index)
    .map((item) => item.entry);
}

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

function applyProfileSeedToForm(form: FormState, profile: AiPrefillSeed): FormState {
  if (!profile.name && !profile.gender && !profile.birthDate && !profile.birthTime && !profile.calendarType && profile.birthTimeUnknown === undefined && !profile.timezone && !profile.city && !profile.country && !profile.latitude && !profile.longitude) {
    return form;
  }
  const birthplace = [profile.city, profile.country].filter(Boolean).join(", ");
  return {
    ...form,
    userName: profile.name || form.userName,
    gender: (profile.gender as FormState["gender"]) || form.gender,
    birthDate: profile.birthDate || form.birthDate,
    birthTimeUnknown: profile.birthTimeUnknown ?? form.birthTimeUnknown,
    birthTime:
      profile.birthTimeUnknown === true
        ? ""
        : profile.birthTime || form.birthTime,
    calendarType: profile.calendarType || form.calendarType,
    birthPlace: birthplace || profile.region || form.birthPlace,
    latitude: profile.latitude || form.latitude,
    longitude: profile.longitude || form.longitude,
    timezone: profile.timezone || form.timezone,
  };
}

function buildInitialForm(): FormState {
  return applyProfileSeedToForm(initialForm, readAiProfileSeed());
}

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
  return toDisplayText(value);
}

function safeFilePart(value: string) {
  return (value || "guest").replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "-").slice(0, 48);
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
    }, { retryOn401: false });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data: data as T };
  } catch {
    throw new Error("NETWORK_ERROR");
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

// 생성이 오래 걸릴 때(202) 결과 엔드포인트를 폴링해 수렴시킨다.
// CF rate-limit(10초당 100회) 대비 최대 1req/3~8s, 상한 40회(≈5분, 서버 신선도 창 420s 이내).
// 첫 폴은 빠르게(0.7s) 프로브해 조기 완료를 즉시 잡고, 이후 3~8s로 램프한다.
const RESULT_POLL_BACKOFF_MS = [700, 3000, 5000, 8000];
const RESULT_POLL_MAX_ATTEMPTS = 40;

async function pollVedicResult(sessionId: string): Promise<StartResult> {
  for (let attempt = 0; attempt < RESULT_POLL_MAX_ATTEMPTS; attempt += 1) {
    await sleep(RESULT_POLL_BACKOFF_MS[Math.min(attempt, RESULT_POLL_BACKOFF_MS.length - 1)]);
    let response: Response;
    try {
      response = await authFetch(`/api/vedic-ai/result?id=${encodeURIComponent(sessionId)}`, { method: "GET" }, { retryOn401: false });
    } catch {
      continue;
    }
    if (response.status === 202) continue;
    if (response.status === 429) throw new Error("SERVER_ERROR");
    const data = (await response.json().catch(() => ({}))) as StartResult;
    if (!response.ok) throw new Error(toText(data.reason) || "SERVER_ERROR");
    return data;
  }
  throw new Error("GENERATION_TIMEOUT");
}

function validateForm(form: FormState) {
  if (!form.birthDate || !form.gender || !form.calendarType) return ERROR_TEXT.INPUT_MISSING;
  if (!form.birthTimeUnknown && !form.birthTime) return ERROR_TEXT.BIRTH_TIME_MISSING;
  if (!form.birthPlace.trim()) return ERROR_TEXT.BIRTH_PLACE_INVALID;
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

const PLANET_LABELS: Record<string, string> = {
  Sun: "태양",
  Moon: "달",
  Mars: "화성",
  Mercury: "수성",
  Jupiter: "목성",
  Venus: "금성",
  Saturn: "토성",
  Rahu: "라후",
  Ketu: "케투",
};

function chartDisplayValue(...values: unknown[]) {
  for (const value of values) {
    const text = toText(value);
    if (text && text !== "-" && text !== "[object Object]") return text;
  }
  return "-";
}

function joinChartValues(...values: unknown[]) {
  const tokens = values
    .map((value) => chartDisplayValue(value))
    .filter((value) => value && value !== "-");
  return tokens.length ? tokens.join(" · ") : "-";
}

function chartPointSign(point: Record<string, unknown>) {
  return chartDisplayValue(point.rashiKo, point.rashi, point.signKo, point.sign, asRecord(point.rashi).name);
}

function chartPointNakshatra(point: Record<string, unknown>) {
  return chartDisplayValue(asRecord(point.nakshatra).name, point.nakshatra);
}

function planetRows(chart: Record<string, unknown>) {
  const planets = Array.isArray(chart.grahas)
    ? chart.grahas.map(asRecord)
    : (Array.isArray(chart.planets) ? chart.planets.map(asRecord) : []);
  const byName = new Map(planets.map((planet) => [toText(planet.nameEn || planet.name), planet]));
  return Object.keys(PLANET_LABELS).map((name) => {
    const planet = byName.get(name) || {};
    return {
      name,
      label: chartDisplayValue(planet.nameKo, PLANET_LABELS[name]),
      sign: chartPointSign(planet),
      degree: chartDisplayValue(planet.degreeInRashi, planet.degree),
      house: planet.bhava || planet.house ? `${toText(planet.bhava || planet.house)}H` : "-",
      nakshatra: chartPointNakshatra(planet),
      pada: chartDisplayValue(asRecord(planet.nakshatra).pada, planet.pada),
      keywords: Array.isArray(planet.interpretationKeywords) ? planet.interpretationKeywords.map(toText).filter(Boolean).join(", ") : "",
    };
  }).filter((row) => row.sign !== "-" || row.house !== "-" || row.nakshatra !== "-");
}

function rashiRows(chart: Record<string, unknown>) {
  return Array.isArray(chart.rashis) ? chart.rashis.map(asRecord) : [];
}

function bhavaRows(chart: Record<string, unknown>) {
  const rows = Array.isArray(chart.bhavas)
    ? chart.bhavas.map(asRecord)
    : (Array.isArray(chart.houses) ? chart.houses.map(asRecord) : []);
  return rows.map((row) => ({
    house: chartDisplayValue(row.house),
    rashi: chartDisplayValue(row.rashiKo, row.rashi, row.signKo, row.sign),
    meaning: chartDisplayValue(row.meaning),
    grahas: Array.isArray(row.grahas)
      ? row.grahas.map(toText).filter(Boolean).join(", ")
      : (Array.isArray(row.planets) ? row.planets.map(toText).filter(Boolean).join(", ") : ""),
  }));
}

function dashaRows(chart: Record<string, unknown>) {
  const vimshottari = asRecord(chart.vimshottariDasha);
  const legacyDasha = asRecord(chart.dasha);
  const periods = Array.isArray(vimshottari.periods)
    ? vimshottari.periods.map(asRecord)
    : (Array.isArray(legacyDasha.periods) ? legacyDasha.periods.map(asRecord) : []);
  return periods.slice(0, 10).map((period) => ({
    lord: chartDisplayValue(period.lord),
    startDate: chartDisplayValue(period.startDate, String(period.start || "").slice(0, 10)),
    endDate: chartDisplayValue(period.endDate, String(period.end || "").slice(0, 10)),
    durationYears: chartDisplayValue(period.durationYears, period.years),
  }));
}

function BasicVedicChartData({ chart }: { chart: Record<string, unknown> }) {
  const lagna = chartPoint(chart, "lagna");
  const moon = chartPoint(chart, "moon");
  const dasha = asRecord(chart.dasha);
  const config = asRecord(chart.calculationConfig);
  const moonNakshatra = asRecord(chart.moonNakshatra);
  const vimshottari = asRecord(chart.vimshottariDasha);
  const currentMahadasha = asRecord(vimshottari.currentMahadasha);
  const hasLagna = Boolean(chart.lagna && typeof chart.lagna === "object");
  const rows = [
    ["Zodiac", chartDisplayValue(config.zodiac, "sidereal")],
    ["Ayanamsa", chartDisplayValue(config.ayanamsa, chart.ayanamsa)],
    ["Bhava", chartDisplayValue(config.bhavaSystem, "whole-sign")],
    ["라그나, Lagna", hasLagna ? joinChartValues(chartPointSign(lagna), lagna.degreeInRashi || lagna.degree, lagna.nakshatra, lagna.pada ? `${lagna.pada}파다` : "") : "출생시간 필요"],
    ["달의 나크샤트라, Moon Nakshatra", joinChartValues(moonNakshatra.name || chartPointNakshatra(moon), moonNakshatra.pada ? `${moonNakshatra.pada}파다` : moon.pada ? `${moon.pada}파다` : "", moonNakshatra.lord)],
    ["현재 다샤, Current Dasha", chartDisplayValue(currentMahadasha.lord, dasha.currentLord, dasha.currentMahadasha)],
  ];
  const planets = planetRows(chart);
  const rashis = rashiRows(chart);
  const bhavas = bhavaRows(chart);
  const dashas = dashaRows(chart);
  // vimshottariDasha.currentMahadasha에 시작/종료 날짜가 없을 때(레거시 저장분 등),
  // 같은 다샤 목(lord)의 상세 기간 행에서 날짜를 대신 가져온다.
  const currentDashaLord = chartDisplayValue(currentMahadasha.lord, dasha.currentLord, dasha.currentMahadasha);
  const currentDashaRow = dashas.find((row) => row.lord === currentDashaLord);

  return (
    <section className={styles.basicChartData} aria-label="베다점 계산 상세">
      <div className={styles.basicChartHeader}>
        <span>베다점 계산 상세</span>
        <strong>VedicChartResult</strong>
      </div>
      {!hasLagna ? (
        <p className={styles.chartNotice}>출생시간이 없어 라그나와 바바는 임의 계산하지 않았습니다. 달, 라시, 나크샤트라, 빈쇼타리 다샤를 중심으로 읽습니다.</p>
      ) : null}
      <dl className={styles.chartDataGrid}>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <details className={styles.chartDetail} open>
        <summary>라그나, Lagna</summary>
        <dl className={styles.chartDataGrid}>
          {[
            ["라그나 라시", chartDisplayValue(lagna.rashiKo, lagna.rashi, lagna.signKo, lagna.sign)],
            ["라그나 도수", chartDisplayValue(lagna.degreeInRashi, lagna.degree)],
            ["라그나 나크샤트라", chartDisplayValue(lagna.nakshatra)],
            ["라그나 파다", lagna.pada ? `${toText(lagna.pada)}파다` : "-"],
            ["라그나 기준 1하우스 시작 라시", chartDisplayValue(lagna.firstHouseRashiKo, lagna.firstHouseRashi)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{hasLagna ? value : "출생시간 필요"}</dd>
            </div>
          ))}
        </dl>
      </details>
      <details className={styles.chartDetail}>
        <summary>라시, Rashi</summary>
        <div className={styles.rashiList}>
          {rashis.map((rashi) => (
            <span key={toText(rashi.nameEn)}>{chartDisplayValue(rashi.nameKo, rashi.nameEn)}</span>
          ))}
        </div>
      </details>
      {planets.length ? (
        <details className={styles.chartDetail} open>
          <summary>그라하, Graha</summary>
          <div className={styles.planetTableWrap}>
          <table className={styles.planetTable}>
            <thead>
              <tr>
                <th>그라하</th>
                <th>라시</th>
                <th>도수</th>
                <th>바바</th>
                <th>나크샤트라</th>
                <th>파다</th>
                <th>해석 키워드</th>
              </tr>
            </thead>
            <tbody>
              {planets.map((row) => (
                <tr key={row.name}>
                  <td>{row.label}</td>
                  <td>{row.sign}</td>
                  <td>{row.degree}</td>
                  <td>{row.house}</td>
                  <td>{row.nakshatra}</td>
                  <td>{row.pada}</td>
                  <td>{row.keywords || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </details>
      ) : null}
      <details className={styles.chartDetail}>
        <summary>바바, Bhava</summary>
        {bhavas.length ? (
          <div className={styles.planetTableWrap}>
            <table className={styles.planetTable}>
              <thead><tr><th>바바</th><th>라시</th><th>의미</th><th>그라하</th></tr></thead>
              <tbody>
                {bhavas.map((row) => (
                  <tr key={row.house}>
                    <td>{row.house}H</td>
                    <td>{row.rashi}</td>
                    <td>{row.meaning}</td>
                    <td>{row.grahas || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className={styles.chartNotice}>정확한 바바 계산에는 출생시간과 출생지 좌표가 필요합니다.</p>}
      </details>
      <details className={styles.chartDetail}>
        <summary>나크샤트라, Nakshatra</summary>
        <p className={styles.chartNotice}>
          달의 나크샤트라: {joinChartValues(moonNakshatra.name || chartPointNakshatra(moon), moonNakshatra.pada ? `${moonNakshatra.pada}파다` : "", moonNakshatra.lord)}
        </p>
      </details>
      <details className={styles.chartDetail}>
        <summary>다샤, Dasha</summary>
        <p className={styles.chartNotice}>빈쇼타리 다샤, Vimshottari Dasha: {chartDisplayValue(currentMahadasha.lord, dasha.currentMahadasha)} · {chartDisplayValue(currentMahadasha.startDate, currentDashaRow?.startDate)} ~ {chartDisplayValue(currentMahadasha.endDate, currentDashaRow?.endDate)}</p>
      </details>
      <details className={styles.chartDetail}>
        <summary>빈쇼타리 다샤, Vimshottari Dasha</summary>
        <div className={styles.planetTableWrap}>
          <table className={styles.planetTable}>
            <thead><tr><th>Lord</th><th>시작</th><th>종료</th><th>기간</th></tr></thead>
            <tbody>
              {dashas.map((row) => (
                <tr key={`${row.lord}-${row.startDate}`}>
                  <td>{row.lord}</td>
                  <td>{row.startDate}</td>
                  <td>{row.endDate}</td>
                  <td>{row.durationYears}년</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function sectionHeading(line: string) {
  const text = line.replace(/^#{1,4}\s*/, "").replace(/^\d+[\).]\s*/, "").replace(/[:：]\s*$/, "").trim();
  return SECTION_TITLES.find((title) => text.includes(title) || title.includes(text)) || "";
}

export function splitAssistantSections(content: string) {
  // 구조화 파싱에 실패한 원시(잘린) JSON은 중괄호째 노출하지 않고 읽을 수 있는 문장만 복원한다.
  const proseSource = looksLikeRawJson(content) ? extractReadableTextFromJsonLike(content) : content;
  const lines = proseSource.split(/\n+/).map((line) => line.trim()).filter(Boolean);
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

  // 위에서 복원한 proseSource를 써야 한다 — 원본 content(원시 JSON)를 다시 쓰면 복구가 무효화되어
  // 잘린 JSON이 그대로 화면에 노출된다.
  const paragraphs = proseSource.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  if (paragraphs.length <= 1) return [{ title: SECTION_TITLES[0], body: proseSource.trim() }];
  return paragraphs.slice(0, SECTION_TITLES.length).map((body, index) => ({
    title: SECTION_TITLES[index] || `별빛 조언 ${index + 1}`,
    body,
  }));
}

export function parseStructuredReading(content: string) {
  const text = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  if (!text.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(text);
    const scores = asRecord(parsed.scores);
    const sections = asRecord(parsed.sections);
    return Object.keys(scores).length && Object.keys(sections).length ? { scores, sections } : null;
  } catch {
    return null;
  }
}

function scoreValue(value: unknown) {
  return Math.max(0, Math.min(100, toNumber(value, 0)));
}

function CosmosLoadingScreen({ fallbackText, basis }: { fallbackText: string; basis: AnalysisBasis | null }) {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const durations = [2000, 3000, 3000, 3000, 4000, 8000];
    let acc = 0;
    const timers = durations.map((duration, index) => {
      const timer = window.setTimeout(() => setStage(index), acc);
      acc += duration;
      return timer;
    });
    const progressTimer = window.setInterval(() => setProgress((current) => Math.min(current + 0.35, 95)), 80);
    return () => {
      timers.forEach(window.clearTimeout);
      window.clearInterval(progressTimer);
    };
  }, []);

  const activeStage = COSMOS_STAGES[stage] || COSMOS_STAGES[0];

  return (
    <div className={styles.cosmosLoading} aria-live="polite">
      <div className={styles.cosmosStars} aria-hidden="true">
        {COSMOS_STARS.map((star, index) => (
          <span
            key={`${star.top}-${star.left}-${index}`}
            style={{
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
              animationDelay: star.delay,
            }}
          />
        ))}
      </div>

      <div className={styles.cosmosOrbitStage}>
        <svg viewBox="0 0 320 320" className={styles.cosmosOrbitSvg} aria-hidden="true">
          {COSMOS_ORBITS.map((orbit) => (
            <circle key={orbit.r} cx="160" cy="160" r={orbit.r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          ))}
          {COSMOS_ORBITS.map((orbit, index) => {
            // 초기 각도 오프셋(index*60°)만 정적으로 배치하고, 실제 공전은 CSS로 각 궤도를 회전시킨다.
            const theta = (index * 60) * Math.PI / 180;
            const px = 160 + orbit.r * Math.cos(theta);
            const py = 160 + orbit.r * Math.sin(theta);
            return (
              <g
                key={`${orbit.r}-${index}`}
                className={styles.cosmosOrbitSpin}
                style={{ animationDuration: `${(19.2 / orbit.speed).toFixed(1)}s` }}
              >
                <circle
                  cx={px}
                  cy={py}
                  r={orbit.size / 2}
                  fill={orbit.color}
                  style={{ filter: `drop-shadow(0 0 5px ${orbit.color})` }}
                />
              </g>
            );
          })}
          <circle cx="160" cy="160" r="28" fill="rgba(124,58,237,0.14)" stroke="rgba(139,92,246,0.32)" strokeWidth="1" />
        </svg>
        <span className={styles.cosmosOrbitGlyph}>{activeStage.glyph}</span>
      </div>

      {/* 궤도 애니메이션은 그대로 두고, 문구 자리만 실제 계산된 차트 값으로 바꾼다.
          근거가 아직 없거나 조회에 실패하면 기존 단계 문구로 되돌아간다. */}
      <div className={styles.cosmosLoadingText}>
        <AnalysisBasisLoading
          basis={basis}
          fallbackLabel={activeStage.label || fallbackText}
          fallbackDetail={activeStage.sub}
        />
      </div>

      {!basis?.stages?.length && (
        <div className={styles.cosmosStageDots}>
          {COSMOS_STAGES.map((item, index) => (
            <i key={item.sub} className={index <= stage ? styles.activeCosmosDot : ""}>{item.glyph}</i>
          ))}
        </div>
      )}

      <div className={styles.cosmosProgress}>
        <span style={{ transform: `scaleX(${progress / 100})` }} />
      </div>
      <p>행성들이 자리를 잡고 있습니다</p>
    </div>
  );
}

// "라그나, Lagna"처럼 "한글, 산스크리트" 한 덩어리로 온 라벨을 한글 주 라벨 + 산스크리트 캡션으로 분리.
function splitBilingual(label: string): { ko: string; sans: string } {
  const raw = String(label ?? "").trim();
  const comma = raw.indexOf(",");
  if (comma === -1) return { ko: raw, sans: "" };
  return { ko: raw.slice(0, comma).trim(), sans: raw.slice(comma + 1).trim() };
}

// LLM 본문은 핵심 문구를 **굵게**로 반환한다(worker/routes/vedic-ai.js 시스템 프롬프트).
// 인라인 **...** 마크만 <strong>으로 렌더링해 훑어보기 쉽게 한다.
function renderRichText(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    return bold ? <strong key={index}>{bold[1]}</strong> : <span key={index}>{part}</span>;
  });
}

// 요약 메달리온 카드의 라인 글리프 아이콘 (currentColor 골드 stroke).
function SummaryGlyph({ kind }: { kind: "lagna" | "rashi" | "nakshatra" }) {
  const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "aria-hidden": true as const, className: styles.medallionGlyph };
  if (kind === "lagna") {
    // 떠오르는 태양선
    return (
      <svg {...common}>
        <line x1="3" y1="18" x2="21" y2="18" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M7.5 18a4.5 4.5 0 0 1 9 0" strokeWidth="1.3" strokeLinecap="round" />
        <line x1="12" y1="5" x2="12" y2="7.2" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="5.4" y1="7.6" x2="6.8" y2="9" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="18.6" y1="7.6" x2="17.2" y2="9" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "rashi") {
    // 별자리 기호 (연결된 별점)
    return (
      <svg {...common}>
        <polyline points="4,9 10,15 15,7 20,12" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="4" cy="9" r="1.4" strokeWidth="1.1" />
        <circle cx="10" cy="15" r="1.4" strokeWidth="1.1" />
        <circle cx="15" cy="7" r="1.4" strokeWidth="1.1" />
        <circle cx="20" cy="12" r="1.4" strokeWidth="1.1" />
      </svg>
    );
  }
  // nakshatra — 별무리
  return (
    <svg {...common}>
      <path d="M9 4l.9 2.1L12 7l-2.1.9L9 10l-.9-2.1L6 7l2.1-.9z" strokeWidth="1" strokeLinejoin="round" />
      <path d="M17 9l.7 1.6 1.6.7-1.6.7L17 14l-.7-1.6-1.6-.7 1.6-.7z" strokeWidth="1" strokeLinejoin="round" />
      <path d="M11 15l.6 1.4 1.4.6-1.4.6L11 20l-.6-1.4-1.4-.6 1.4-.6z" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

export function StructuredReadingResult({
  reading,
  chart,
  name,
  basis = null,
}: {
  reading: { scores: Record<string, unknown>; sections: Record<string, unknown> };
  chart: Record<string, unknown>;
  name: string;
  basis?: AnalysisBasis | null;
}) {
  const lagna = chartPoint(chart, "lagna");
  const sun = chartPoint(chart, "sun");
  const moon = chartPoint(chart, "moon");
  const dasha = asRecord(chart.dasha);
  const moonNakshatra = asRecord(chart.moonNakshatra);
  const vimshottari = asRecord(chart.vimshottariDasha);
  const currentMahadasha = asRecord(vimshottari.currentMahadasha);
  const sectionEntries = orderReadingSections(reading.sections);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  async function handlePdfDownload() {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const { exportResultPdf } = await import("@/lib/pdf/export-result-pdf");
      await exportResultPdf({
        captureTargets: ["#vedic-result-body"],
        fileName: `vedic-reading-${safeFilePart(name || "result")}.pdf`,
        backgroundColor: "#0a0818",
        cover: {
          title: `${name || "상담자"}님의 별의 지도`,
          subtitle: "Jyotish · 조티시 베다 점성술",
          date: new Date().toISOString().slice(0, 10),
        },
      });
    } catch (error) {
      console.error("[VedicAI] pdf download failed", error);
    } finally {
      setIsExportingPdf(false);
    }
  }

  const dashaLord = chartDisplayValue(currentMahadasha.lord, dasha.currentLord, dasha.currentMahadasha);
  const dashaStart = chartDisplayValue(currentMahadasha.startDate);
  const dashaEnd = chartDisplayValue(currentMahadasha.endDate);
  const dashaMeta = getGrahaMeta(String(currentMahadasha.lord || dasha.currentLord || ""));

  return (
    <div className={styles.structuredResult} id="vedic-result-body">
      <div className={styles.structuredHeader}>
        <div className={styles.structuredHeaderTitle}>
          <p>Jyotish · 조티시 베다 점성술</p>
          <h2>{name || "상담자"}님의 별의 지도</h2>
        </div>
        <button type="button" className={styles.pdfButton} onClick={() => void handlePdfDownload()} disabled={isExportingPdf} aria-label="PDF로 저장">
          {isExportingPdf ? <Loader2 className={styles.spin} size={16} aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
          <span>{isExportingPdf ? "저장 중…" : "PDF 저장"}</span>
        </button>
      </div>

      {basis && (
        <section className={styles.revealItem} style={{ animationDelay: "0ms" }}>
          <AnalysisBasisPanel basis={basis} />
        </section>
      )}

      <section className={`${styles.chartSummaryCard} ${styles.revealItem}`} style={{ animationDelay: "0ms" }} aria-label="라그나·라시·나크샤트라 요약">
        <article className={styles.medallion}>
          <span className={styles.medallionRing}><SummaryGlyph kind="lagna" /></span>
          <span className={styles.medallionKo}>라그나</span>
          <em className={styles.medallionSans}>Lagna</em>
          <strong>{chartDisplayValue(lagna.rashiKo, lagna.rashi, lagna.signKo, lagna.sign)}</strong>
          <small>{joinChartValues(lagna.degreeInRashi || lagna.degree, lagna.nakshatra, lagna.pada ? `${lagna.pada}파다` : "")}</small>
        </article>
        <article className={styles.medallion}>
          <span className={styles.medallionRing}><SummaryGlyph kind="rashi" /></span>
          <span className={styles.medallionKo}>라시</span>
          <em className={styles.medallionSans}>Rashi</em>
          <strong>{joinChartValues(chartPointSign(sun), chartPointSign(moon))}</strong>
          <small>Sun · Moon</small>
        </article>
        <article className={styles.medallion}>
          <span className={styles.medallionRing}><SummaryGlyph kind="nakshatra" /></span>
          <span className={styles.medallionKo}>나크샤트라</span>
          <em className={styles.medallionSans}>Nakshatra</em>
          <strong>{chartDisplayValue(moonNakshatra.name, moon.nakshatra)}</strong>
          <small>{joinChartValues(moonNakshatra.pada ? `${moonNakshatra.pada}파다` : moon.pada ? `${moon.pada}파다` : "", moonNakshatra.lord)}</small>
        </article>
      </section>

      <div className={`${styles.dashaBanner} ${styles.revealItem}`} style={{ animationDelay: "70ms" }}>
        <div className={styles.dashaBannerLabel}>
          <span className={styles.cardLabelKo}>다샤</span>
          <em className={styles.cardLabelSans}>Vimshottari Dasha</em>
        </div>
        <div className={styles.dashaBannerBody}>
          <DashaProgressRing lord={dashaLord} startDate={dashaStart} endDate={dashaEnd} />
          <div className={styles.dashaBannerText}>
            <strong>
              <GrahaNatureDot nature={dashaMeta.nature} />
              {dashaLord} 마하다샤
            </strong>
            <small>{dashaStart} ~ {dashaEnd}</small>
          </div>
        </div>
      </div>

      <div className={styles.revealItem} style={{ animationDelay: "140ms" }}>
        <NorthIndianChart chart={chart} />
      </div>
      <div className={styles.revealItem} style={{ animationDelay: "210ms" }}>
        <DashaTimeline chart={chart} />
      </div>

      <div className={styles.revealItem} style={{ animationDelay: "280ms" }}>
        <BasicVedicChartData chart={chart} />
      </div>

      <section className={`${styles.scorePanel} ${styles.revealItem}`} style={{ animationDelay: "350ms" }}>
        {Object.entries(SCORE_LABELS).map(([key, label]) => (
          <div key={key}>
            <span>{label}({key})</span>
            <strong>{scoreValue(reading.scores[key])}</strong>
            <i><b style={{ transform: `scaleX(${scoreValue(reading.scores[key]) / 100})` }} /></i>
          </div>
        ))}
      </section>

      {sectionEntries.map(([key, rawSection], index) => {
        const section = asRecord(rawSection);
        const { ko, sans } = splitBilingual(toText(section.title) || key);
        return (
          <article className={`${styles.structuredSection} ${styles.revealItem}`} style={{ animationDelay: `${420 + index * 70}ms` }} key={key}>
            <div className={styles.structuredSectionHead}>
              <span className={styles.sectionBadge} aria-hidden="true">{SECTION_GLYPHS[key] || "✦"}</span>
              <h3>
                <span className={styles.sectionTitleKo}>{ko}</span>
                {sans ? <em className={styles.sectionTitleSans}>{sans}</em> : null}
              </h3>
            </div>
            {splitIntoParagraphs(toText(section.body)).map((paragraph, paragraphIndex) => (
              <p key={paragraphIndex}>{renderRichText(paragraph)}</p>
            ))}
          </article>
        );
      })}
    </div>
  );
}

export default function VedicAiClient() {
  const [form, setForm] = useState<FormState>(() => buildInitialForm());
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  // 서버가 계산한 조티시 차트 근거 — 대기 화면이 실제 값을 단계별로 보여 준다.
  const [basis, setBasis] = useState<AnalysisBasis | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [geocode, setGeocode] = useState<GeocodeState>(() => {
    const initial = buildInitialForm();
    return {
      lat: initial.latitude || PLACE_PRESETS[0].latitude,
      lng: initial.longitude || PLACE_PRESETS[0].longitude,
      name: initial.birthPlace || PLACE_PRESETS[0].label,
      fallback: false,
    };
  });
  const requestIdRef = useRef("");
  const pendingAccessRef = useRef<PendingAccess | null>(null);
  const submitBusyRef = useRef(false);
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

  // 재열람: 완료된 상담은 ?cid=로 다시 열 수 있다 (결제 없이 조회만)
  useEffect(() => {
    const cid = new URLSearchParams(window.location.search).get("cid");
    if (!cid) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await authFetch(`/api/vedic-ai/result?id=${encodeURIComponent(cid)}`);
        const data = await response.json().catch(() => ({}));
        if (!cancelled && data?.ok && data.consultation) setConsultation(data.consultation as Consultation);
      } catch {
        // 재열람 실패는 조용히 무시 — 새 상담은 그대로 시작할 수 있다
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function rememberConsultationUrl(id: string) {
    if (!id || typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("cid", id);
      window.history.replaceState(null, "", url.toString());
    } catch {
      // URL 갱신 실패는 무시
    }
  }

  const busy = phase === "access" || phase === "payment" || phase === "start";
  const validationMessage = validateForm(form);

  const phaseText = useMemo(() => {
    if (phase === "access") return "이용권을 확인하는 중...";
    if (phase === "payment") return "결제 정보를 확인하는 중...";
    if (phase === "start") return "차트를 분석하는 중...";
    return "";
  }, [phase]);

  function updateForm(patch: Partial<FormState>) {
    formTouchedRef.current = true;
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
    setGeocode({ lat: preset.latitude, lng: preset.longitude, name: preset.label, fallback: false });
  }

  async function handlePlaceBlur() {
    const place = form.birthPlace.trim();
    if (!place || PLACE_PRESETS.some((preset) => preset.label === place) || geocoding) return;

    setGeocoding(true);
    try {
      const response = await fetch(`/api/geocode?place=${encodeURIComponent(place)}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      const lat = toText(data.lat);
      const lng = toText(data.lng);
      if (!lat || !lng) return;

      const name = toText(data.name) || place;
      updateForm({
        latitude: lat,
        longitude: lng,
        timezone: toText(data.timezone) || form.timezone || "Asia/Seoul",
      });
      setGeocode({ lat, lng, name, fallback: data.fallback === true });
      setNotice(data.fallback === true ? "출생지를 찾지 못해 서울 기준으로 계산합니다." : "");
    } catch {
      setNotice("위치 확인이 잠시 불안정해 서울 기준으로 계산합니다.");
      updateForm({ latitude: "37.5665", longitude: "126.9780", timezone: form.timezone || "Asia/Seoul" });
      setGeocode({ lat: "37.5665", lng: "126.9780", name: "서울 (기본값)", fallback: true });
    } finally {
      setGeocoding(false);
    }
  }

  async function startConsultation(requestId: string, access: Record<string, unknown>, paymentWasRequired = false) {
    setPhase("start");
    // 다음 화면(생성 로딩)이 마운트되는 시점 — 게이트 오버레이 hold를 해제한다.
    releasePaidFeatureGate(requestId);
    // 근거 계산은 이용권 확인·결제를 통과한 뒤에만 시작한다 — 확인 단계에서 라그나·나크샤트라가
    // 먼저 노출되면 "확인도 전에 결과를 만든다"로 읽히고, 결제 전 계산값이 새어 나간다.
    // 순수 계산이라 기다리지 않고 병렬로 받는다(실패하면 null이라 생성 흐름을 막지 않는다).
    void fetchAnalysisBasis("/api/vedic-ai/basis", buildPayload(form, requestId)).then(setBasis);
    const { status, data } = await postJson<StartResult>(
      "/api/vedic-ai/start",
      { ...buildPayload(form, requestId), ...access, idempotencyKey: requestId },
      requestId,
    );
    if (data.ok && data.consultation) {
      setConsultation(data.consultation);
      rememberConsultationUrl(data.consultation.id);
      setError("");
      setNotice("");
      requestIdRef.current = "";
      pendingAccessRef.current = null;
      return;
    }
    if (status === 202 && data.sessionId) {
      // 생성이 진행 중(중복 제출 등) — 결과 엔드포인트를 폴링해 완료까지 수렴시킨다.
      setNotice("나크샤트라의 빛을 읽고 있습니다. 잠시만 기다려 주세요.");
      const resolved = await pollVedicResult(data.sessionId);
      if (resolved.ok && resolved.consultation) {
        setConsultation(resolved.consultation);
        rememberConsultationUrl(resolved.consultation.id);
        setError("");
        setNotice("");
        requestIdRef.current = "";
        pendingAccessRef.current = null;
        return;
      }
      throw new Error(toText(resolved.reason) || "SERVER_ERROR");
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
    let gateStarted = false;

    try {
      const pending = pendingAccessRef.current;
      if (pending && pending.requestId === requestId) {
        await startConsultation(requestId, pending.access, pending.paymentWasRequired);
        return;
      }

      setPhase("access");
      beginPaidFeatureGateCheck({
        featureKey: FEATURE_KEY,
        requestId,
        title: "이용권 확인",
        reason: "베다 점성술 전문가 상담",
        paymentMode: "MEMBERSHIP_PASS",
      });
      // 이용권 판정(unlock-status)을 아래 접근 확인 왕복과 겹쳐 돌린다 — 결제 게이트가 같은 키로 재사용해 직렬 왕복이 1회 준다.
      void primePaymentEligibility(buildBillingGateInput({}, requestId));
      gateStarted = true;
      // 확인 완료 후 다음 화면(생성 로딩 또는 결과)이 실제로 뜰 때까지 게이트 오버레이를 유지해 "확인 중 → 공백"을 막는다.
      // release는 startConsultation의 setPhase("start") 및 결과 직접 렌더 지점에서 호출한다(안전장치 상한 8초).
      holdPaidFeatureGateOpen({ requestId, maxMs: 8000 });
      // 이용권 확인 앞단의 일시적 DB 장애(503 DB_DEGRADED 등)는 재시도로 흡수한다 — 하드 실패·결제창 오노출로 굳지 않게.
      const { status, data } = await runAccessCheckWithTransientRetry(
        () => postJson<EnsureAccessResult>(
          "/api/vedic-ai/ensure-access",
          { ...buildPayload(form, requestId), idempotencyKey: requestId },
          requestId,
        ),
        { onRetry: () => setNotice("연결이 잠시 불안정해요. 이용권을 다시 확인하는 중입니다.") },
      );

      if (data.ok) {
        completePaidFeatureGateCheck({
          featureKey: FEATURE_KEY,
          requestId,
          title: "이용권 확인 완료",
          reason: "베다 점성술 전문가 상담",
          paymentMode: "MEMBERSHIP_PASS",
          message: "이용권 확인이 끝났습니다. 별빛의 흐름을 읽고 있습니다.",
        });
        if (data.consultation) {
          setConsultation(data.consultation);
          rememberConsultationUrl(data.consultation.id);
          // 결과 화면이 곧바로 마운트되는 시점 — 게이트 오버레이 hold를 해제한다.
          releasePaidFeatureGate(requestId);
          requestIdRef.current = "";
          pendingAccessRef.current = null;
          return;
        }
        await startConsultation(requestId, { accessToken: data.accessToken, accessType: data.accessType });
        return;
      }

      if (data.reason === "LOGIN_REQUIRED") throw new Error("LOGIN_REQUIRED");
      if (data.reason === "INVALID_INPUT") throw new Error("PREPARE_FAILED");
      // 가드 신설: 일시적 503/DB_DEGRADED가 빈 paymentPayload로 결제창에 오낙하하지 않도록,
      // PAYMENT_REQUIRED가 아닌 일시적 실패는 과금 없이 소프트 종료한다.
      if (data.reason !== "PAYMENT_REQUIRED" && isRetriableResultPollFailure(status, data)) {
        throw new Error("TEMPORARY_UNAVAILABLE");
      }
      if (data.reason !== "PAYMENT_REQUIRED") throw new Error("PREPARE_FAILED");

      setNotice(ERROR_TEXT.PAYMENT_REQUIRED);
      setPhase("payment");
      const paymentPayload = asRecord(data.paymentPayload);
      const gate = await runBillingCoinGate(buildBillingGateInput(paymentPayload, requestId));
      if (!isPaymentGranted(gate)) {
        const code = String(gate.error?.code || "").toUpperCase();
        if (code === "PAYMENT_CANCELLED") throw new Error("PAYMENT_CANCELLED");
        throw new Error("PAYMENT_VERIFY_FAILED");
      }

      const access = extractPayment(gate, requestId);
      pendingAccessRef.current = { requestId, access, paymentWasRequired: true };
      await startConsultation(requestId, access, true);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "SERVER_ERROR";
      const paymentCancelled = code === "PAYMENT_CANCELLED";
      const clearPrepaid = ["LLM_FAILED", "CHART_CALCULATION_FAILED", "BIRTH_PLACE_INVALID", "PAYMENT_VERIFY_FAILED", "PAYMENT_CANCELLED", "LOGIN_REQUIRED", "PREPARE_FAILED"].includes(code);
      if (clearPrepaid) {
        pendingAccessRef.current = null;
        requestIdRef.current = "";
      }
      // 일시적 접속 장애는 이용권 결함이 아니므로 "이용권 확인 실패"로 표기하지 않는다.
      const isTransient = code === "TEMPORARY_UNAVAILABLE" || code === "NETWORK_ERROR";
      setError(ERROR_TEXT[code] || ERROR_TEXT.SERVER_ERROR);
      if (gateStarted) {
        failPaidFeatureGateCheck({
          featureKey: FEATURE_KEY,
          requestId,
          title: isTransient ? "잠시 후 다시 시도" : "이용권 확인 실패",
          reason: "베다 점성술 전문가 상담",
          paymentMode: "MEMBERSHIP_PASS",
          message: ERROR_TEXT[code] || ERROR_TEXT.SERVER_ERROR,
          cancelled: paymentCancelled,
        });
      }
    } finally {
      submitBusyRef.current = false;
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
            <span className={styles.eyebrow}><Sparkles size={16} /> Jyotish · Vedic Star Counsel</span>
            <h2>베다점 전문가 상담</h2>
            <p>나크샤트라와 행성의 흐름, 다샤의 리듬 위로 지금의 질문이 조용히 비춥니다.</p>
            <div className={styles.heroMeta}>
              <span>30,000원</span>
              <span>다샤 흐름</span>
            </div>
          </div>
          <div className={styles.mandalaStage} aria-hidden="true">
            <div className={styles.mandalaCore} />
            <div className={styles.orbitOne} />
            <div className={styles.orbitTwo} />
            <HeroChartPreview />
          </div>
        </div>
      </section>

      <section className={styles.workspace}>
        <form className={styles.formPanel} onSubmit={(event) => { event.preventDefault(); void handleSubmit(); }}>
          <div className={`${styles.panelHeader} flex-wrap`}>
            <span className="min-w-0 flex-1"><Star size={18} /> 별의 지도를 열기 위한 정보</span>
            <strong>Vedic AI</strong>
            <button
              type="button"
              onClick={loadFormFromProfileCard}
              className="shrink-0 rounded-lg border border-[#f6d67e]/35 bg-[#f6d67e]/10 px-3 py-2 text-xs font-bold text-[#f6d67e] transition hover:bg-[#f6d67e]/20"
              aria-label="프로필 카드에서 출생 정보 불러오기"
            >
              프로필 카드에서 불러오기
            </button>
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
              <select value={form.timezone} onChange={(event) => updateForm({ timezone: event.target.value })} disabled={busy}>
                {TIMEZONE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
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
                onBlur={() => void handlePlaceBlur()}
                disabled={busy}
                placeholder="예: 서울, 부산 해운대구, Tokyo, New York"
              />
              <datalist id="vedic-place-presets">
                {PLACE_PRESETS.map((place) => <option key={place.label} value={place.label} />)}
              </datalist>
              <small className={styles.geoStatus}>
                {geocoding ? "위치 확인 중..." : geocode.name ? `✓ ${geocode.name.slice(0, 42)}` : "출생지를 적으면 별의 기준 좌표를 맞춥니다."}
              </small>
            </label>
            <label>
              <span>지금 비출 주제</span>
              <select value={form.focusArea} onChange={(event) => updateForm({ focusArea: event.target.value as FocusArea })} disabled={busy}>
                {FOCUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
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

          <div className="flex items-center justify-end">
            <PriceBadge featureKey="vedic-ai-consultation" prefix="상담 이용 가격 " />
          </div>
          <button type="submit" className={styles.primaryButton} disabled={busy} aria-busy={busy}>
            {busy ? <Loader2 className={styles.spin} size={18} /> : <Moon size={18} />}
            {busy ? phaseText : "베다점 전문가 상담 받기"}
          </button>
        </form>

        <section className={styles.resultPanel}>
          {/* 생성 대기 화면은 이용권 확인·결제를 통과한 뒤에만 띄운다.
              확인 단계에 띄우면 "확인도 전에 결과를 만든다"로 읽히고,
              결제 단계에 띄우면 결제창 뒤에 대기 UI가 깔려 결제 흐름을 가린다. */}
          {phase === "start" && <CosmosLoadingScreen fallbackText={phaseText || "라시 차트를 정렬하는 중..."} basis={basis} />}

          {!consultation ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyMandala} aria-hidden="true" />
              <h2>별의 지도가 조용히 열릴 준비가 되어 있습니다.</h2>
              <p>출생의 순간과 지금의 질문이 만나는 자리에서 흐름을 살피겠습니다.</p>
              <Link href="/vedic-ai/result/" className={styles.resultListItem}>
                <strong>지난 상담 다시 보기</strong>
                <small>완료된 베다점 상담은 언제든 다시 열 수 있습니다.</small>
              </Link>
            </div>
          ) : (
            <>
              <div className={styles.summaryHeader}>
                <span>베다점 핵심 지표</span>
              </div>
              <div className={`${styles.summaryGrid} ${styles.revealItem}`} style={{ animationDelay: "0ms" }}>
                <article><span>라그나, Lagna</span><strong>{summary.lagna || toText(lagna.signKo || lagna.sign) || "출생시간 필요"}</strong></article>
                <article><span>달의 나크샤트라, Moon Nakshatra</span><strong>{summary.nakshatra || toText(moon.nakshatra) || "-"}</strong></article>
                <article><span>현재 다샤, Current Dasha</span><strong>{summary.currentDasha || "-"}</strong></article>
                <article><span>강하게 작동하는 그라하</span><strong>{summary.strongGrahas?.length ? summary.strongGrahas.join(", ") : "-"}</strong></article>
                <article><span>주요 바바</span><strong>{summary.majorBhavas?.length ? summary.majorBhavas.join(", ") : "-"}</strong></article>
              </div>

              <div className={`${styles.keywordRow} ${styles.revealItem}`} style={{ animationDelay: "70ms" }}>
                {(summary.keywords || []).slice(0, 4).map((keyword) => <span key={keyword}>{keyword}</span>)}
              </div>

              <div className={`${styles.chartCards} ${styles.revealItem}`} style={{ animationDelay: "140ms" }}>
                <article>
                  <span>D1 Rashi</span>
                  <strong>{planetSummary(chart, "Sun") || "태양의 흐름"}</strong>
                  <p>{planetSummary(chart, "Rahu") || "라후와 케투의 축이 머무는 긴장을 함께 비춥니다."}</p>
                </article>
                <article>
                  <span>D9 Navamsa</span>
                  <strong>{toText(asRecord(asRecord(summary.d9).Venus).sign) || vargaPlanetSign(chart, "d9", "Venus") || "내면의 성숙"}</strong>
                  <p>관계와 약속, 오래 남는 선택의 질감을 함께 살핍니다.</p>
                </article>
              </div>

              <div className={styles.chatList}>
                {consultation.messages.map((message, index) => {
                  const structured = message.role === "assistant" ? parseStructuredReading(message.content) : null;
                  if (structured) {
                    return (
                      <StructuredReadingResult
                        key={`${message.role}-${index}`}
                        reading={structured}
                        chart={chart}
                        name={toText(consultation.birthInfo?.name) || form.userName}
                        basis={consultation.analysisBasis || basis}
                      />
                    );
                  }
                  return message.role === "assistant" ? (
                    <div className={styles.sectionGrid} key={`${message.role}-${index}`}>
                      {splitAssistantSections(message.content).map((section, sectionIndex) => (
                        <article className={styles.sectionCard} key={`${section.title}-${sectionIndex}`}>
                          <span>{section.title}</span>
                          {splitIntoParagraphs(section.body).map((paragraph, paragraphIndex) => (
                            <p key={paragraphIndex}>{paragraph}</p>
                          ))}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <article className={styles.userMsg} key={`${message.role}-${index}`}>
                      <span>나의 질문</span>
                      <p>{message.content}</p>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  );
}
