"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { m, useReducedMotion } from "framer-motion";
import { CalendarDays, Download, HeartHandshake, Loader2, Moon, Orbit, Sparkles, X } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { isRetriableResultPollFailure, runAccessCheckWithTransientRetry } from "@/app/_lib/consultationResultPolling";
import { useBodyScrollLock } from "@/app/_lib/body-scroll-lock";
import { extractReadableTextFromJsonLike, looksLikeRawJson, toDisplayText } from "@/lib/llm-text";
import AiResultProse from "@/components/fortune/AiResultProse";
import AnalysisBasisLoading from "@/components/fortune/AnalysisBasisLoading";
import AnalysisBasisPanel from "@/components/fortune/AnalysisBasisPanel";
import { fetchAnalysisBasis, type AnalysisBasis } from "@/lib/fortune/analysis-basis";
import PagedResultViewer, { usePagedViewerMode, type ResultViewerPage } from "@/components/fortune/PagedResultViewer";
import {
  beginPaidFeatureGateCheck,
  completePaidFeatureGateCheck,
  failPaidFeatureGateCheck,
  runBillingCoinGate,
  primePaymentEligibility,
} from "@/app/_lib/billing-client";
import { readAiProfileSeed, type AiPrefillSeed } from "@/app/_lib/ai-prefill-seed";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import { PriceBadge } from "@/app/components/PriceBadge";
import { readDevPreviewState } from "@/lib/dev-preview/core";
import { buildSukuyoCompatibilityPreviewPayload } from "@/lib/dev-preview/fixtures/sukuyo-compatibility";
import SukuyoWheel from "@/components/fortune/SukuyoWheel";
import { pickWelcomeQuote } from "./_data/welcomeQuotes";
import styles from "./SukuyoCompatibilityAiClient.module.css";

const QUOTE_SEEN_STORAGE_KEY = "cd:sukuyo-compat-result:quote-seen:v1";

type CalendarType = "solar" | "lunar";
type ConsultationType = "personal" | "compatibility";
type PersonForm = {
  name: string;
  gender: string;
  birthDate: string;
  birthTime: string;
  birthTimeUnknown: boolean;
  calendarType: CalendarType;
};
type ConsultationMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};
type Consultation = {
  id: string;
  consultationType?: ConsultationType;
  personA: { name?: string; shuku?: string };
  personB: { name?: string; shuku?: string };
  sukuyoResult: {
    personAShuku?: string;
    personBShuku?: string;
    relationType?: string;
    distance?: "near" | "middle" | "far" | "";
    distanceLabel?: string;
    direction?: string;
  };
  analysisBasis?: AnalysisBasis | null;
  relationshipType: string;
  topic: string;
  messages: ConsultationMessage[];
};
type ScoreKey = "destiny" | "harmony" | "emotion" | "growth" | "stability";
type CompatPersonMeta = {
  name: string;
  sukuyo: string;
  sukuyo_hanja: string;
  group: string;
  element: string;
  yin_yang: string;
  guardian: string;
  keyword: string;
};
type AxisKey =
  | "emotionBond" | "trust" | "dialogue" | "longevity"
  | "marriage" | "conflictRisk" | "growth" | "karmaBond";
type CompatAxis = { score: number; label?: string; polarity?: "positive" | "inverse" };
type CompatResult = {
  meta: {
    person_a: CompatPersonMeta;
    person_b: CompatPersonMeta;
    relation: {
      type_a_to_b: string;
      type_b_to_a: string;
      distance: number;
      intensity: string;
    };
    scores: Record<ScoreKey, number> & { total: number };
    // 별점 8축. 이 필드가 없는 과거 상담이 그대로 남아 있으므로 전부 옵셔널이다.
    axes?: Partial<Record<AxisKey, CompatAxis>>;
    axesTotal?: number;
  };
  headline?: string;
  insight?: string;
  scoreNotes?: Partial<Record<AxisKey, string>>;
  sections: Record<string, { title: string; body: string }>;
};
type EnsureAccessResult =
  | { ok: true; accessToken: string; accessType: "pass" | "paid" | "subscription" | "admin" }
  | { ok: false; reason: "PAYMENT_REQUIRED"; paymentPayload: Record<string, unknown> }
  | { ok: false; reason: "LOGIN_REQUIRED" }
  | { ok: false; reason: "INVALID_INPUT"; message: string }
  | { ok: false; reason?: string; message?: string };

const FEATURE_KEY = "sukuyo-compatibility-ai";
const FEATURE_REASON = "숙요점 궁합 전문가 상담";
const FEATURE_COST = 300;
const FEATURE_AMOUNT_KRW = 30000;
const FEATURE_MEMBERSHIP_CREDIT_COST = 3000;
const CONSULTATION_VALUES = [
  { title: "관계의 핵심", text: "두 사람을 잇는 27숙의 자리와 그 의미" },
  { title: "감정의 흐름", text: "누가 표현하고 누가 기다리는지, 감정의 방향" },
  { title: "장기 궁합", text: "결혼·동거·사업·친구·직장 다섯 영역별 적합도" },
  { title: "인연의 목적", text: "이번 생에 왜 만났는지 — 카르마 해석" },
];
const CONSULTATION_CARDS = [
  { icon: Orbit, title: "본명숙", text: "태어난 달의 자리로 보는 마음의 기본 결" },
  { icon: CalendarDays, title: "관계 거리", text: "가까움과 멀어짐의 리듬을 읽는 숙요점 핵심" },
  { icon: HeartHandshake, title: "궁합 해석", text: "끌림, 갈등, 오래가는 방식까지 전문가 상담으로 정리" },
];
const LUNAR_SCENE_PETALS = [
  { x: 128, y: 360, rx: 30, ry: 10, rotate: -16, opacity: 0.66, driftX: 7, driftY: -5, delay: 0 },
  { x: 192, y: 330, rx: 24, ry: 8, rotate: 15, opacity: 0.46, driftX: -5, driftY: -7, delay: 0.35 },
  { x: 296, y: 270, rx: 18, ry: 7, rotate: -34, opacity: 0.42, driftX: 4, driftY: -4, delay: 0.7 },
  { x: 438, y: 224, rx: 22, ry: 8, rotate: 24, opacity: 0.52, driftX: -6, driftY: -5, delay: 1.05 },
  { x: 560, y: 206, rx: 16, ry: 6, rotate: -20, opacity: 0.36, driftX: 4, driftY: -3, delay: 1.4 },
  { x: 708, y: 250, rx: 19, ry: 7, rotate: 22, opacity: 0.5, driftX: -5, driftY: 4, delay: 1.75 },
  { x: 782, y: 328, rx: 26, ry: 9, rotate: -12, opacity: 0.44, driftX: 6, driftY: -4, delay: 2.1 },
];
const LUNAR_SCENE_STARS = [
  { x: 166, y: 92, r: 1.4, opacity: 0.48, delay: 0.2 },
  { x: 236, y: 146, r: 1.8, opacity: 0.28, delay: 0.8 },
  { x: 342, y: 88, r: 1.2, opacity: 0.42, delay: 1.3 },
  { x: 474, y: 126, r: 1.6, opacity: 0.36, delay: 1.7 },
  { x: 612, y: 72, r: 1.3, opacity: 0.5, delay: 0.5 },
  { x: 792, y: 112, r: 1.7, opacity: 0.34, delay: 1.1 },
  { x: 812, y: 412, r: 1.2, opacity: 0.36, delay: 1.9 },
  { x: 88, y: 218, r: 1.5, opacity: 0.3, delay: 1.5 },
];
// 옛 상담(influence_factors·timing·treasure·crisis·moonLetter)도 다시 열리므로 그 키의 글자도 남겨 둔다.
const SECTION_ICONS: Record<string, string> = {
  overview: "☯",
  twoStars: "☽",
  evidence_basis: "◆",
  attraction: "✦",
  emotionalDirection: "⇄",
  communication: "🗣",
  energyFlow: "⟳",
  conflict: "〜",
  caution: "⚠",
  karma: "☸",
  mutualGrowth: "🌙",
  radiantMoment: "✨",
  domains: "💞",
  outlook: "🔭",
  closingLetter: "💌",
  influence_factors: "◇",
  timing: "◎",
  treasure: "◈",
  crisis: "🌪",
  moonLetter: "♡",
};
// 챕터 진입 시 숙요 역술가 보이스 로딩 카피

const SCORE_AXES: { key: ScoreKey; label: string; angle: number }[] = [
  { key: "destiny", label: "운명 인연", angle: -90 },
  { key: "harmony", label: "기질 조화", angle: -18 },
  { key: "emotion", label: "감정 공명", angle: 54 },
  { key: "growth", label: "성장 시너지", angle: 126 },
  { key: "stability", label: "장기 안정", angle: 198 },
];
const BAR_LABELS: Record<ScoreKey, string> = {
  destiny: "운명 인연도",
  harmony: "기질 조화도",
  emotion: "감정 공명도",
  growth: "성장 시너지",
  stability: "장기 안정도",
};
type ScoreTier = "good" | "normal" | "caution";
const SCORE_TIER_LABEL: Record<ScoreTier, string> = { good: "좋음", normal: "보통", caution: "가꾸는 중" };
function scoreStatus(score: number): ScoreTier {
  if (score >= 16) return "good";
  if (score >= 14) return "normal";
  return "caution";
}

// 별점 8축. 순서는 화면에 보이는 순서다. 서버 SUKUYO_AXIS_SPECS 와 키가 일치해야 한다.
const AXIS_ROWS: { key: AxisKey; label: string; hint: string }[] = [
  { key: "emotionBond", label: "감정 궁합", hint: "마음이 닿는 속도" },
  { key: "trust", label: "신뢰", hint: "믿고 기댈 수 있는 정도" },
  { key: "dialogue", label: "대화", hint: "말이 통하는 결" },
  { key: "longevity", label: "장기 지속성", hint: "오래 이어질 힘" },
  { key: "marriage", label: "결혼 적합도", hint: "생활을 함께할 궁합" },
  { key: "conflictRisk", label: "갈등 위험도", hint: "낮을수록 좋아요" },
  { key: "growth", label: "상호 성장", hint: "서로를 키우는 힘" },
  { key: "karmaBond", label: "카르마 연결", hint: "인연의 깊이" },
];
/** master-love-codex codexScoreStars 와 같은 식 — 0~100 을 별 1~5 개로. */
function scoreStars(score: number) {
  return Math.max(1, Math.min(5, Math.round((Number(score) || 0) / 20)));
}
const MOON_PARTICLES = [
  { top: 12, left: 18, delay: 0.2, opacity: 0.68 },
  { top: 22, left: 74, delay: 1.1, opacity: 0.44 },
  { top: 34, left: 14, delay: 2.6, opacity: 0.5 },
  { top: 18, left: 48, delay: 3.2, opacity: 0.72 },
  { top: 42, left: 86, delay: 1.8, opacity: 0.36 },
  { top: 58, left: 22, delay: 0.7, opacity: 0.58 },
  { top: 64, left: 66, delay: 2.2, opacity: 0.62 },
  { top: 76, left: 38, delay: 3.7, opacity: 0.46 },
  { top: 82, left: 82, delay: 1.4, opacity: 0.55 },
  { top: 8, left: 88, delay: 2.9, opacity: 0.4 },
  { top: 48, left: 52, delay: 0.4, opacity: 0.64 },
  { top: 70, left: 8, delay: 3.4, opacity: 0.34 },
];

const EMPTY_PERSON: PersonForm = {
  name: "",
  gender: "unknown",
  birthDate: "",
  birthTime: "",
  birthTimeUnknown: false,
  calendarType: "solar",
};

function LunarBotanicalScene({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <m.svg
      className={styles.lunarBotanicalScene}
      viewBox="0 0 900 520"
      aria-hidden="true"
      focusable="false"
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <defs>
        <radialGradient id="sukuyoSceneMoonAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE8B6" stopOpacity="0.55" />
          <stop offset="42%" stopColor="#F7DFA3" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#C8A8FF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sukuyoSceneMoon" cx="34%" cy="28%" r="70%">
          <stop offset="0%" stopColor="#FFFDF3" />
          <stop offset="45%" stopColor="#FFE8B6" />
          <stop offset="78%" stopColor="#D3BE91" />
          <stop offset="100%" stopColor="#8F7E6D" />
        </radialGradient>
        <linearGradient id="sukuyoPetal" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#FFD6E7" stopOpacity="0.86" />
          <stop offset="54%" stopColor="#F6B7D2" stopOpacity="0.46" />
          <stop offset="100%" stopColor="#C8A8FF" stopOpacity="0.24" />
        </linearGradient>
        <linearGradient id="sukuyoOrbit" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="#C8A8FF" stopOpacity="0" />
          <stop offset="36%" stopColor="#C8A8FF" stopOpacity="0.32" />
          <stop offset="68%" stopColor="#FFE8B6" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#FFE8B6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <m.circle
        className={styles.sceneMoonAura}
        cx="684"
        cy="138"
        r="150"
        fill="url(#sukuyoSceneMoonAura)"
        animate={reduceMotion ? undefined : { scale: [1, 1.035, 1], opacity: [0.76, 1, 0.82] }}
        transition={{ duration: 6.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <m.circle
        className={styles.sceneMoon}
        cx="684"
        cy="138"
        r="72"
        fill="url(#sukuyoSceneMoon)"
        animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
        transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <path className={styles.sceneOrbit} d="M96 360C240 260 432 206 704 244C784 255 842 286 874 320" stroke="url(#sukuyoOrbit)" />
      <path className={styles.sceneOrbitSoft} d="M156 402C280 318 420 276 592 300C706 316 786 366 836 424" stroke="url(#sukuyoOrbit)" />
      <m.g
        className={styles.sceneLotus}
        animate={reduceMotion ? undefined : { y: [0, -5, 0], opacity: [0.78, 0.96, 0.82] }}
        transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <ellipse cx="180" cy="402" rx="78" ry="16" fill="#F6B7D2" opacity="0.16" />
        <ellipse cx="156" cy="386" rx="58" ry="18" fill="url(#sukuyoPetal)" opacity="0.38" transform="rotate(-12 156 386)" />
        <ellipse cx="204" cy="386" rx="58" ry="18" fill="url(#sukuyoPetal)" opacity="0.32" transform="rotate(12 204 386)" />
        <ellipse cx="180" cy="370" rx="42" ry="26" fill="url(#sukuyoPetal)" opacity="0.42" />
        <path d="M124 414C160 428 206 430 244 414" fill="none" stroke="#FFE8B6" strokeOpacity="0.22" strokeWidth="1.2" />
      </m.g>
      <g className={styles.scenePetalLayer}>
        {LUNAR_SCENE_PETALS.map((petal) => (
          <m.g
            key={`${petal.x}-${petal.y}`}
            animate={reduceMotion ? undefined : { x: [0, petal.driftX, 0], y: [0, petal.driftY, 0] }}
            transition={{ duration: 7.8, repeat: Infinity, ease: "easeInOut", delay: petal.delay }}
          >
            <ellipse
              className={styles.scenePetal}
              cx={petal.x}
              cy={petal.y}
              rx={petal.rx}
              ry={petal.ry}
              fill="url(#sukuyoPetal)"
              opacity={petal.opacity}
              transform={`rotate(${petal.rotate} ${petal.x} ${petal.y})`}
            />
          </m.g>
        ))}
      </g>
      <g className={styles.sceneStars}>
        {LUNAR_SCENE_STARS.map((star) => (
          <m.circle
            key={`${star.x}-${star.y}`}
            cx={star.x}
            cy={star.y}
            r={star.r}
            fill="#FFF7E8"
            opacity={star.opacity}
            animate={reduceMotion ? undefined : { opacity: [star.opacity * 0.45, star.opacity, star.opacity * 0.55] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: star.delay }}
          />
        ))}
      </g>
    </m.svg>
  );
}

function LoadingBotanicalScene({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <m.svg
      className={styles.loadingBotanicalScene}
      viewBox="0 0 200 200"
      aria-hidden="true"
      focusable="false"
      animate={reduceMotion ? undefined : { rotate: 360 }}
      transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
    >
      <defs>
        <linearGradient id="sukuyoLoadingPetal" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#FFD6E7" stopOpacity="0.9" />
          <stop offset="56%" stopColor="#F6B7D2" stopOpacity="0.52" />
          <stop offset="100%" stopColor="#C8A8FF" stopOpacity="0.24" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="24" rx="18" ry="7" fill="url(#sukuyoLoadingPetal)" opacity="0.72" transform="rotate(18 100 24)" />
      <ellipse cx="174" cy="100" rx="18" ry="7" fill="url(#sukuyoLoadingPetal)" opacity="0.5" transform="rotate(92 174 100)" />
      <ellipse cx="100" cy="176" rx="18" ry="7" fill="url(#sukuyoLoadingPetal)" opacity="0.66" transform="rotate(190 100 176)" />
      <ellipse cx="26" cy="100" rx="18" ry="7" fill="url(#sukuyoLoadingPetal)" opacity="0.44" transform="rotate(278 26 100)" />
      <path d="M34 112C72 150 132 150 168 112" fill="none" stroke="#FFE8B6" strokeOpacity="0.22" strokeWidth="1" />
    </m.svg>
  );
}

function applyProfileSeedToPerson(person: PersonForm, profile: AiPrefillSeed): PersonForm {
  if (!profile.name && !profile.gender && !profile.birthDate && !profile.birthTime && !profile.calendarType) {
    return person;
  }
  const birthTimeUnknown = profile.birthTimeUnknown === true;
  return {
    ...person,
    name: profile.name || person.name,
    gender: (profile.gender as PersonForm["gender"]) || person.gender,
    birthDate: profile.birthDate || person.birthDate,
    birthTime: birthTimeUnknown ? "" : profile.birthTime || person.birthTime,
    birthTimeUnknown: birthTimeUnknown || person.birthTimeUnknown,
    calendarType: profile.calendarType || person.calendarType,
  };
}

function buildInitialPersonA(): PersonForm {
  return applyProfileSeedToPerson({ ...EMPTY_PERSON }, readAiProfileSeed());
}

const ERROR_TEXT: Record<string, string> = {
  LOGIN_REQUIRED: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  PAYMENT_REQUIRED: "숙요점 궁합 전문가 상담 이용권이 필요합니다. 결제창을 열어드릴게요.",
  PAYMENT_VERIFY_FAILED: "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.",
  PAYMENT_CANCELLED: "결제가 취소되었습니다. 필요할 때 다시 진행할 수 있습니다.",
  INVALID_INPUT: "상담에 필요한 정보가 부족해요. 두 사람의 생년월일과 달력 기준을 다시 확인해 주세요.",
  CALCULATION_FAILED: "숙요점 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.",
  SERVER_ERROR: "상담 준비 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.",
  LLM_FAILED: "전문가 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동 복구됩니다.",
  NETWORK_ERROR: "연결이 불안정해요. 잠시 후 다시 시도해 주세요.",
  TEMPORARY_UNAVAILABLE: "지금 접속이 잠시 불안정해요. 이용권은 그대로 보존되니, 잠시 후 다시 시도해 주세요.",
};

function makeIdempotencyKey() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `sukuyo-ai-${crypto.randomUUID()}`;
  }
  return `sukuyo-ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
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
    payment: { ...payment, paymentId, requestId: fallbackRequestId },
    accessGrant,
    consume,
  };
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
    productId: toText(runtimeGate.productId ?? paymentPayload.productId) || FEATURE_KEY,
    productType: toText(runtimeGate.productType ?? paymentPayload.productType) || FEATURE_KEY,
    serviceType: toText(runtimeGate.serviceType ?? paymentPayload.serviceType) || "sukyo-ai-consultation",
    deferUsage: true,
    usagePolicy: "apply_after_success",
    executionKey: `${FEATURE_KEY}:${idempotencyKey}`,
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

async function postJson<T>(path: string, body: Record<string, unknown>, idempotencyKey?: string) {
  const response = await authFetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
  }, { retryOn401: false });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data: data as T };
}

function distanceLabel(value?: string) {
  if (value === "near") return "근거리";
  if (value === "middle") return "중거리";
  if (value === "far") return "원거리";
  return "";
}

function parseCompatResult(content: string): CompatResult | null {
  const source = content.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(source.slice(start, end + 1)) as CompatResult;
    if (!parsed?.meta?.person_a || !parsed?.meta?.person_b || !parsed?.meta?.scores || !parsed?.sections) return null;
    return parsed;
  } catch {
    return null;
  }
}

function latestAssistantJson(consultation: Consultation | null) {
  const message = [...(consultation?.messages || [])].reverse().find((item) => item.role === "assistant");
  return message ? parseCompatResult(message.content) : null;
}

// 구조화 파싱이 실패한(잘린/부분) assistant 원문을 사용자에게 읽을 수 있는 문장으로 복구한다.
// 원문 JSON 중괄호를 그대로 노출하지 않기 위해 looksLikeRawJson이면 한국어 문장만 추출한다.
function toReadableAssistantText(content: string): string {
  const text = toDisplayText(content) || content || "";
  if (looksLikeRawJson(text)) {
    const recovered = extractReadableTextFromJsonLike(text);
    if (recovered) return recovered;
  }
  return text;
}

// 구조화 파싱이 실패한 폴백 원문을 소제목 없는 장문 상담으로 보고, 문단을 묶어 책장 페이지로 나눈다.
// 각 페이지 본문은 정상 챕터와 동일한 .readingBody 타이포(볼드=골드)로 렌더한다.
const FALLBACK_PARAGRAPHS_PER_PAGE = 4;

function buildFallbackReadingPages(consultation: Consultation): ResultViewerPage[] {
  const assistantText = consultation.messages
    .filter((item) => item.role === "assistant")
    .map((item) => toReadableAssistantText(item.content))
    .filter(Boolean)
    .join("\n\n");
  // 원문 문단 경계(\n\n)로만 나눈다 — 긴 문단의 문장 청킹·볼드·번호목록은 AiResultProse가 처리한다.
  const paragraphs = assistantText.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const source = paragraphs.length ? paragraphs : (assistantText.trim() ? [assistantText.trim()] : []);
  if (!source.length) return [];
  const pages: ResultViewerPage[] = [];
  for (let index = 0; index < source.length; index += FALLBACK_PARAGRAPHS_PER_PAGE) {
    const slice = source.slice(index, index + FALLBACK_PARAGRAPHS_PER_PAGE);
    pages.push({
      id: `sukuyo-reading-${index}`,
      label: `${pages.length + 1}장`,
      content: (
        <div className={styles.readingBody}>
          <AiResultProse value={slice.join("\n\n")} />
        </div>
      ),
    });
  }
  return pages;
}

function MoonLoadingScreen({ basis }: { basis: AnalysisBasis | null }) {
  const reduceMotion = useReducedMotion() === true;
  useBodyScrollLock(true);

  return (
    <div className={styles.loadingScreen} role="status" aria-live="polite">
      <div className={styles.loadingAura} aria-hidden="true" />
      <div className={styles.loadingStars} aria-hidden="true">
        {MOON_PARTICLES.map((particle, index) => (
          <span
            key={index}
            style={{
              top: `${particle.top}%`,
              left: `${particle.left}%`,
              animationDelay: `${particle.delay}s`,
              opacity: particle.opacity,
            }}
          />
        ))}
      </div>
      <div className={styles.loadingMoonWrap}>
        <LoadingBotanicalScene reduceMotion={reduceMotion} />
        <div className={styles.loadingMoon} aria-hidden="true">
          <span />
        </div>
        <svg className={styles.loadingRing} viewBox="0 0 160 160" aria-hidden="true">
          <circle cx="80" cy="80" r="72" fill="none" stroke="url(#moonRing)" strokeWidth="1" strokeDasharray="3 12" />
          <defs>
            <linearGradient id="moonRing" gradientTransform="rotate(90)">
              <stop offset="0%" stopColor="#F4D98B" stopOpacity="0.62" />
              <stop offset="50%" stopColor="#AFA4FF" stopOpacity="0.34" />
              <stop offset="100%" stopColor="#F4D98B" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {/* 달 애니메이션은 그대로 두고, 문구 자리는 서버가 실제로 계산한 두 본명숙과 방위 관계로 채운다.
          🔴 시간만 흐르는 가짜 단계 라벨을 여기에 두지 말 것 — AnalysisBasisLoading 이 실제 계산값을
          단계별로 드러내는 것이 이 프로젝트의 정본이다(components/fortune/AnalysisBasisLoading.tsx). */}
      <div className={styles.loadingText}>
        <AnalysisBasisLoading
          basis={basis}
          fallbackLabel="두 사람의 별자리를 맞춰보고 있어요."
          fallbackDetail="본명숙과 관계 거리 계산"
        />
      </div>
      <div className={styles.loadingBar}>
        <span />
      </div>
      <p className={styles.loadingFoot}>
        열다섯 장을 한꺼번에 나눠 쓰느라 40초에서 길게는 1분쯤 걸려요. 화면을 닫지 말고 편히 기다려 주세요.
      </p>
    </div>
  );
}

function StarCard({ person }: { person: CompatPersonMeta }) {
  return (
    <div className={styles.starCard}>
      <span>{person.name}</span>
      <strong>{person.sukuyo}</strong>
      <em>{person.sukuyo_hanja}</em>
      <p>{person.keyword}</p>
    </div>
  );
}

function ScoreRadarChart({ scores }: { scores: CompatResult["meta"]["scores"] }) {
  const radius = 100;
  const cx = 160;
  const cy = 160;
  const toXY = (angle: number, r: number) => ({
    x: cx + r * Math.cos((angle * Math.PI) / 180),
    y: cy + r * Math.sin((angle * Math.PI) / 180),
  });
  const dataPoints = SCORE_AXES.map((axis) => toXY(axis.angle, radius * ((scores[axis.key] || 0) / 20)));
  const dataPath = `${dataPoints.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ")} Z`;

  return (
    <svg viewBox="0 0 320 320" className={styles.radarChart} aria-label="궁합 분석 차트">
      {[0.25, 0.5, 0.75, 1].map((ratio) => {
        const points = SCORE_AXES.map((axis) => toXY(axis.angle, radius * ratio));
        return <polygon key={ratio} points={points.map((point) => `${point.x},${point.y}`).join(" ")} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />;
      })}
      {SCORE_AXES.map((axis) => {
        const end = toXY(axis.angle, radius);
        return <line key={axis.key} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />;
      })}
      <path d={dataPath} fill="rgba(124,58,237,0.22)" stroke="rgba(167,139,250,0.78)" strokeWidth="1.5" />
      {dataPoints.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="3" fill="#a78bfa" />)}
      {SCORE_AXES.map((axis) => {
        const pos = toXY(axis.angle, radius + 22);
        return (
          <text key={axis.key} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="rgba(255,255,255,0.72)">
            {axis.label}
          </text>
        );
      })}
    </svg>
  );
}

function ScoreBarChart({ scores }: { scores: CompatResult["meta"]["scores"] }) {
  return (
    <div className={styles.scoreBars}>
      {(Object.entries(BAR_LABELS) as [ScoreKey, string][]).map(([key, label]) => {
        const score = scores[key] || 0;
        const tier = scoreStatus(score);
        return (
          <div key={key} className={styles.scoreBarRow}>
            <div>
              <span>{label}</span>
              <span className={styles.scoreBadge} data-tier={tier}>{SCORE_TIER_LABEL[tier]}</span>
              <strong>{score} / 20</strong>
            </div>
            <i><b style={{ width: `${(score / 20) * 100}%` }} /></i>
          </div>
        );
      })}
    </div>
  );
}

function TraitCompareTable({ a, b }: { a: CompatPersonMeta; b: CompatPersonMeta }) {
  const rows = [
    { label: "본명숙", va: `${a.sukuyo} ${a.sukuyo_hanja}`, vb: `${b.sukuyo} ${b.sukuyo_hanja}` },
    { label: "숙 그룹", va: a.group, vb: b.group },
    { label: "오행", va: a.element, vb: b.element },
    { label: "음양", va: a.yin_yang, vb: b.yin_yang },
    { label: "수호신", va: a.guardian, vb: b.guardian },
    { label: "핵심 기질", va: a.keyword, vb: b.keyword },
  ];
  return (
    <div className={styles.traitTable}>
      <div className={styles.traitHead}>
        <span>{a.name}</span>
        <span>구분</span>
        <span>{b.name}</span>
      </div>
      {rows.map((row) => (
        <div key={row.label} className={styles.traitRow}>
          <span>{row.va}</span>
          <em>{row.label}</em>
          <strong>{row.vb}</strong>
        </div>
      ))}
    </div>
  );
}

function chunkReadingSections(sections: Record<string, { title: string; body: string }>) {
  return Object.entries(sections).map((entry) => [entry]);
}

// 요약 헤더: 두 별을 잇는 별자리 라인 + 궁합 게이지 + "운명적 끌림 vs 현실적 조율" 듀얼 미터
function CompatSummaryHeader({ meta }: { meta: CompatResult["meta"] }) {
  const pull = Math.round(((meta.scores.destiny + meta.scores.emotion) / 40) * 100);
  const tune = Math.round(((meta.scores.stability + meta.scores.harmony) / 40) * 100);
  return (
    <section className={styles.summaryHeaderCard} aria-label="궁합 요약">
      <SukuyoWheel
        myHanja={meta.person_a.sukuyo_hanja}
        partnerHanja={meta.person_b.sukuyo_hanja}
        relationLabel={`${meta.relation.type_a_to_b} · ${meta.relation.intensity} · 거리 ${meta.relation.distance}숙`}
        className={styles.starLineSvg}
      />
      <div className={styles.summaryGauge}>
        <div className={styles.gaugeCircle} role="img" aria-label={`종합 궁합 ${meta.scores.total}점`} style={{ background: `conic-gradient(#FFE8B6 ${meta.scores.total * 3.6}deg, rgba(255,255,255,0.08) 0deg)` }}>
          <span><strong>{meta.scores.total}</strong><small>/100</small></span>
        </div>
        <div className={styles.dualMeter}>
          <div>
            <span>운명적 끌림</span>
            <i><b style={{ width: `${pull}%` }} /></i>
            <em>{pull}%</em>
          </div>
          <div>
            <span>현실적 조율</span>
            <i data-tone="tune"><b style={{ width: `${tune}%` }} /></i>
            <em>{tune}%</em>
          </div>
        </div>
      </div>
    </section>
  );
}

function ChapterReadingArticle({ sectionKey, section }: { sectionKey: string; section: { title: string; body: string } }) {
  return (
    <article className={styles.readingSection}>
      <div>
        <span>{SECTION_ICONS[sectionKey] || "✦"}</span>
        <h3>{section.title}</h3>
      </div>
      <div className={styles.readingBody}><AiResultProse value={section.body} /></div>
    </article>
  );
}

function ScoreDetailSection({ scores }: { scores: CompatResult["meta"]["scores"] }) {
  const entries = (Object.entries(BAR_LABELS) as [ScoreKey, string][]).map(([key, label]) => ({
    key,
    label,
    score: scores[key] || 0,
  }));
  const top = entries.reduce((best, item) => (item.score > best.score ? item : best));
  const bottom = entries.reduce((worst, item) => (item.score < worst.score ? item : worst));
  return (
    <section className={styles.scoreDetailSection} aria-label="항목별 지표">
      <h2>항목별 지표</h2>
      <div className={styles.chartGrid}>
        <ScoreRadarChart scores={scores} />
        <ScoreBarChart scores={scores} />
      </div>
      <p className={styles.sectionCaption}>최고 지표 {top.label} {top.score}점 · 보완 지표 {bottom.label} {bottom.score}점</p>
    </section>
  );
}

function CompareSection({ a, b }: { a: CompatPersonMeta; b: CompatPersonMeta }) {
  const compareKeys: (keyof CompatPersonMeta)[] = ["sukuyo", "group", "element", "yin_yang", "guardian", "keyword"];
  const sameCount = compareKeys.filter((key) => a[key] === b[key]).length;
  return (
    <section className={styles.compareSection} aria-label="두 사람 비교">
      <h2>두 사람 비교</h2>
      <TraitCompareTable a={a} b={b} />
      <p className={styles.sectionCaption}>{compareKeys.length}개 항목 중 {sameCount}개 일치</p>
    </section>
  );
}

/**
 * 스크롤에 따라 부드럽게 등장. master-love-codex 의 CodexReveal 과 같은 규약이다.
 *
 * 🔴 PDF 캡처 안전장치: forceVisible 을 주지 않으면 아직 화면에 안 들어온 섹션이 opacity 0 인 채로
 * 캡처돼 그 페이지가 백지로 저장된다.
 */
function SukuyoReveal({ children, index = 0, forceVisible = false, className }: {
  children: ReactNode;
  index?: number;
  forceVisible?: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion() === true;
  const skip = forceVisible || reduceMotion;
  if (skip) return <div className={className}>{children}</div>;
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.36, delay: Math.min(index * 0.06, 0.36), ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </m.div>
  );
}

/** ① 관계 한 줄 요약 — 큰 타이포, 가운데. */
function HeadlineSection({ headline, meta }: { headline: string; meta: CompatResult["meta"] }) {
  return (
    <section className={styles.headlineSection} aria-label="관계 한 줄 요약">
      <span className={styles.headlineEyebrow}>
        {meta.person_a.sukuyo} ✦ {meta.person_b.sukuyo} · {meta.relation.type_a_to_b}
      </span>
      <h2 className={styles.headlineText}>{headline}</h2>
    </section>
  );
}

/**
 * ② 관계 점수 8축.
 *
 * 별점만 나열하면 근거 없는 숫자가 된다 — 축마다 서버가 계산한 점수의 "왜"를 한 줄로 함께 놓는다.
 * 갈등 위험도(polarity: inverse)는 별이 많을수록 나쁘므로 톤과 캡션을 반대로 준다.
 */
function AxisStarSection({ axes, notes, forceVisible = false }: {
  axes: NonNullable<CompatResult["meta"]["axes"]>;
  notes: CompatResult["scoreNotes"];
  forceVisible?: boolean;
}) {
  const rows = AXIS_ROWS.filter((row) => Number.isFinite(Number(axes[row.key]?.score)));
  if (!rows.length) return null;
  return (
    <section className={styles.axisSection} aria-label="관계 점수">
      <h2>관계 점수</h2>
      <ul className={styles.axisList}>
        {rows.map((row, index) => {
          const axis = axes[row.key] as CompatAxis;
          const stars = scoreStars(axis.score);
          const inverse = axis.polarity === "inverse";
          return (
            <SukuyoReveal key={row.key} index={index} forceVisible={forceVisible}>
              <li className={styles.axisRow} data-polarity={inverse ? "inverse" : "positive"}>
                <div className={styles.axisHead}>
                  <strong>{row.label}</strong>
                  <span className={styles.axisStars} aria-hidden="true">
                    {"★".repeat(stars)}{"☆".repeat(5 - stars)}
                  </span>
                  <span className="sr-only">{`5점 만점에 ${stars}점${inverse ? " — 높을수록 갈등 위험이 큽니다" : ""}`}</span>
                  <em>{row.hint}</em>
                </div>
                {notes?.[row.key] && <p className={styles.axisNote}>{notes[row.key]}</p>}
              </li>
            </SukuyoReveal>
          );
        })}
      </ul>
    </section>
  );
}

/** ③ AI 핵심 인사이트 — 이 관계의 본질 한 문단. */
function InsightSection({ insight }: { insight: string }) {
  return (
    <section className={styles.insightSection} aria-label="핵심 인사이트">
      <h2>이 관계의 본질</h2>
      <div className={styles.insightBody}><AiResultProse value={insight} /></div>
    </section>
  );
}

function QuoteWelcomeCard({ quote }: { quote: string }) {
  return (
    <section className={styles.welcomeQuoteCard} aria-label="첫 방문 환영 문구">
      <span aria-hidden="true">☾</span>
      <p>{quote}</p>
    </section>
  );
}

function CompatResultModal({ result, onClose, onDownloadError, basis = null }: { result: CompatResult; onClose: () => void; onDownloadError: (message: string) => void; basis?: AnalysisBasis | null }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { meta, sections } = result;
  const readingPages = useMemo(() => chunkReadingSections(sections), [sections]);
  const chapterEntries = useMemo(() => Object.entries(sections), [sections]);
  const [activeChapter, setActiveChapter] = useState(0);
  const [chapterViewAll, setChapterViewAll] = usePagedViewerMode("sukuyoCompatChapterViewerV1");
  const [detailOpen, setDetailOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hasSeenQuote, setHasSeenQuote] = useState(false);
  const initialSeenRef = useRef<boolean | null>(null);
  useBodyScrollLock(true);

  useEffect(() => {
    // StrictMode 등으로 effect가 두 번 실행돼도, 최초 1회 판정한 값을 ref에 고정해
    // 두 번째 실행이 "방금 자신이 쓴 값"을 다시 읽어 뒤집는 것을 방지한다.
    if (initialSeenRef.current === null) {
      let seen = false;
      try {
        seen = window.localStorage.getItem(QUOTE_SEEN_STORAGE_KEY) === "true";
      } catch {
        // 저장소 접근 불가 시 매번 카드 노출(기본값) 유지
      }
      initialSeenRef.current = seen;
      if (!seen) {
        try {
          window.localStorage.setItem(QUOTE_SEEN_STORAGE_KEY, "true");
        } catch {
          // best-effort
        }
      }
    }
    setHasSeenQuote(initialSeenRef.current);
    setMounted(true);
  }, []);

  const openChapter = (index: number) => {
    if (index < 0 || index >= chapterEntries.length) return;
    setActiveChapter(index);
  };

  const handlePDF = async () => {
    const element = document.getElementById("compat-result-body");
    if (!element || isDownloading) return;
    setIsDownloading(true);
    try {
      const { exportResultPdf } = await import("@/lib/pdf/export-result-pdf");
      const fileName = `달빛궁합_${meta.person_a.name}_${meta.person_b.name}_${new Date().toLocaleDateString("ko-KR").replace(/\./g, "").replace(/ /g, "")}.pdf`.replace(/[\\/:*?"<>|]/g, "_");
      await exportResultPdf({
        captureTargets: ["#compat-result-body [data-pdf-section]"],
        fileName,
        backgroundColor: "#060412",
      });
    } catch {
      onDownloadError("PDF 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={styles.resultModal} role="dialog" aria-modal="true" aria-label="달빛 궁합 답장">
      <header className={styles.modalHeader}>
        <div>
          <h2>달빛 궁합 답장</h2>
          <p>
            {meta.person_a.name} · {meta.person_a.sukuyo}
            <span>✦</span>
            {meta.person_b.name} · {meta.person_b.sukuyo}
          </p>
        </div>
        <div className={styles.modalActions}>
          <button type="button" onClick={handlePDF} disabled={isDownloading}>
            {isDownloading ? <Loader2 size={16} className={styles.spin} /> : <Download size={16} />}
            PDF 저장
          </button>
          <button type="button" onClick={onClose} aria-label="결과 닫기">
            <X size={16} />
            닫기
          </button>
        </div>
      </header>

      <div className={styles.modalBody}>
        {mounted && !hasSeenQuote && (
          <QuoteWelcomeCard quote={pickWelcomeQuote(meta.person_a.name, meta.person_b.name)} />
        )}
        {/* ① 한 줄 요약 → ② 8축 별점 → ③ 핵심 인사이트 → ④ 기존 지표·비교 → ⑤ 근거 → ⑥ 전체 해설 */}
        {result.headline && <HeadlineSection headline={result.headline} meta={meta} />}
        <CompatSummaryHeader meta={meta} />
        {meta.axes && <AxisStarSection axes={meta.axes} notes={result.scoreNotes} />}
        {result.insight && (
          <SukuyoReveal><InsightSection insight={result.insight} /></SukuyoReveal>
        )}
        {basis && (
          <section className={styles.basisPane}>
            <AnalysisBasisPanel basis={basis} />
          </section>
        )}
        <ScoreDetailSection scores={meta.scores} />
        <CompareSection a={meta.person_a} b={meta.person_b} />
        <section className={styles.detailDisclosure} aria-label="상세 해설">
          <button
            type="button"
            aria-expanded={detailOpen}
            aria-controls="compat-detail-panel"
            className={styles.detailToggleButton}
            onClick={() => setDetailOpen((prev) => !prev)}
          >
            {detailOpen ? "상세 해설 접기" : `자세히 보기 · ${chapterEntries.length}장 전체 해설`}
          </button>
          {!detailOpen && (
            <nav className={styles.chapterNav} aria-label={`${chapterEntries.length}장 미리보기 — 눌러서 펼치기`}>
              {chapterEntries.map(([key, section], index) => (
                <button
                  key={key}
                  type="button"
                  className={styles.chapterChip}
                  onClick={() => { setDetailOpen(true); openChapter(index); }}
                  aria-label={`${index + 1}장 ${section.title} 펼치기`}
                >
                  <span aria-hidden="true">{SECTION_ICONS[key] || "✦"}</span>
                  {index + 1}장
                </button>
              ))}
            </nav>
          )}
          <div id="compat-detail-panel" hidden={!detailOpen}>
            <nav className={styles.chapterNav} aria-label="궁합 리포트 목차 — 장을 눌러 이동">
              {chapterEntries.map(([key, section], index) => (
                <button
                  key={key}
                  type="button"
                  className={`${styles.chapterChip}${index === activeChapter ? ` ${styles.chapterChipActive}` : ""}`}
                  onClick={() => openChapter(index)}
                  aria-current={index === activeChapter ? "true" : undefined}
                  aria-label={`${index + 1}장 ${section.title}`}
                >
                  <span aria-hidden="true">{SECTION_ICONS[key] || "✦"}</span>
                  {index + 1}장
                </button>
              ))}
            </nav>
            <PagedResultViewer
              pages={chapterEntries.map(([key, section], index) => ({
                id: key,
                label: `${index + 1}장`,
                content: <ChapterReadingArticle sectionKey={key} section={section} />,
              }))}
              deckLabel={`달빛 궁합 ${chapterEntries.length}장 해설`}
              className={styles.pagedViewer}
              pageClassName={styles.pagedPage}
              viewAll={chapterViewAll}
              onViewAllChange={setChapterViewAll}
              activePage={activeChapter}
              onPageChange={setActiveChapter}
            />
          </div>
        </section>
      </div>

      {/* PDF 저장용 전체 렌더 — 화면 밖에 배치해 html2canvas 캡처에만 사용 */}
      <div id="compat-result-body" className={styles.pdfSource} aria-hidden="true">
        <section className={`${styles.coverSection} ${styles.pdfPage} ${styles.pdfCoverPage}`} data-pdf-section>
          <div className={styles.pdfMoonImage} aria-hidden="true">
            <span />
          </div>
          <div className={styles.pdfCoverDate}>{new Date().toLocaleDateString("ko-KR")}</div>
          <div className={styles.starPair}>
            <StarCard person={meta.person_a} />
            <div className={styles.relationBridge}>
              <span>{meta.relation.type_a_to_b.match(/\((.)\)/)?.[1] || "合"}</span>
              <em>{meta.relation.type_a_to_b}</em>
            </div>
            <StarCard person={meta.person_b} />
          </div>
          <div className={styles.pdfCoverScore}>
            <span>종합 궁합</span>
            <strong>{meta.scores.total}</strong>
            <em>/ 100</em>
          </div>
        </section>

        {/* 🔴 PDF 캡처 경로에는 forceVisible 을 준다 — 안 그러면 리빌 섹션이 백지로 저장된다. */}
        {(result.headline || meta.axes || result.insight) && (
          <section className={`${styles.chartSection} ${styles.pdfPage}`} data-pdf-section>
            {result.headline && <HeadlineSection headline={result.headline} meta={meta} />}
            {meta.axes && <AxisStarSection axes={meta.axes} notes={result.scoreNotes} forceVisible />}
            {result.insight && <InsightSection insight={result.insight} />}
          </section>
        )}

        <section className={`${styles.chartSection} ${styles.pdfPage}`} data-pdf-section>
          <h2>궁합 분석 차트</h2>
          <ScoreRadarChart scores={meta.scores} />
          <div className={styles.totalBadge}>
            <span>종합 궁합</span>
            <strong>{meta.scores.total}</strong>
            <em>/ 100</em>
          </div>
          <ScoreBarChart scores={meta.scores} />
          <TraitCompareTable a={meta.person_a} b={meta.person_b} />
        </section>

        {readingPages.map((group, pageIndex) => (
          <section key={pageIndex} className={`${styles.pdfPage} ${styles.pdfReadingPage}`} data-pdf-section>
            {group.map(([key, section]) => (
              <ChapterReadingArticle key={key} sectionKey={key} section={section} />
            ))}
          </section>
        ))}

        <footer className={`${styles.modalFooter} ${styles.pdfPage} ${styles.pdfFooterPage}`} data-pdf-section>
          <strong>Code Destiny</strong>
          <span>숙요점 궁합 · {new Date().toLocaleDateString("ko-KR")}</span>
          <p>이 해석은 숙요점 상징 체계를 바탕으로 관계의 흐름을 비추는 참고용 상담입니다. 현실의 선택, 동의, 경계, 건강과 법률·재정 판단은 당사자의 충분한 대화와 전문 검토를 함께 따라야 합니다.</p>
        </footer>
      </div>
    </div>
  );
}

function countFilledPersonFields(value: PersonForm) {
  return [value.birthDate, value.gender, value.calendarType].filter(Boolean).length;
}

function FormProgressIndicator({ filled, total }: { filled: number; total: number }) {
  const percent = Math.round((filled / total) * 100);
  return (
    <div className={styles.progressBar} role="status" aria-live="polite">
      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ transform: `scaleX(${percent / 100})` }} />
      </div>
      <span className={styles.progressLabel}>{filled}/{total}개 항목 입력됨</span>
    </div>
  );
}

type RecentConsultation = {
  id: string;
  personAName: string;
  personAShuku: string;
  personBName: string;
  personBShuku: string;
  relationType: string;
  updatedAt?: string;
};

export default function SukuyoCompatibilityAiClient() {
  const reduceMotion = useReducedMotion() === true;
  const [personA, setPersonA] = useState<PersonForm>(() => buildInitialPersonA());
  const [personB, setPersonB] = useState<PersonForm>({ ...EMPTY_PERSON });
  const relationshipType = "연인";
  const topic = "전체 궁합";
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  // 서버가 계산한 두 별의 근거 — 대기 화면이 실제 값을 단계별로 보여 준다.
  const [basis, setBasis] = useState<AnalysisBasis | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [recentList, setRecentList] = useState<RecentConsultation[]>([]);
  const [phase, setPhase] = useState<"idle" | "access" | "payment" | "start" | "chat">("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const submitKeyRef = useRef("");
  // busy 는 phase 파생값이라 React state 갱신 전에 같은 틱의 두 번째 클릭이 그대로 통과한다.
  // 그러면 생성 요청이 두 번 나가고, 서버의 startLocks 는 인메모리라 다른 isolate 로 갈리면
  // 그룹 6개 생성이 통째로 두 번 돈다. 다른 AI 클라이언트가 쓰는 ref 락 패턴을 맞춘다.
  const submitLockRef = useRef(false);
  const { seed: profileSeed, seedVersion, reload: reloadProfileSeed } = useAiProfileSeed();
  const formTouchedRef = useRef(false);

  // 서버에서 프로필 카드가 뒤늦게 도착해도, 사용자가 입력을 시작하기 전이라면 본인(나의 별) 폼에 반영
  useEffect(() => {
    if (!profileSeed) return;
    setPersonA((prev) => (formTouchedRef.current ? prev : applyProfileSeedToPerson(prev, profileSeed)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedVersion]);

  function loadPersonAFromProfileCard() {
    void reloadProfileSeed().then((seed) => {
      if (seed) setPersonA((prev) => applyProfileSeedToPerson(prev, seed));
    });
  }

  const busy = phase === "access" || phase === "payment" || phase === "start";
  const consultationType: ConsultationType = "compatibility";
  const result = useMemo(() => latestAssistantJson(consultation), [consultation]);
  const [fallbackViewAll, setFallbackViewAll] = usePagedViewerMode("sukuyoCompatFallbackViewerV1");
  const fallbackPages = useMemo<ResultViewerPage[]>(
    () => (consultation && !result ? buildFallbackReadingPages(consultation) : []),
    [consultation, result],
  );

  useEffect(() => {
    if (result) setResultOpen(true);
  }, [result]);

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

  // 재열람: ?cid= 복원 + 지난 궁합 목록
  useEffect(() => {
    let cancelled = false;
    const cid = new URLSearchParams(window.location.search).get("cid");
    (async () => {
      if (cid) {
        try {
          const response = await authFetch(`/api/sukuyo-compatibility-ai/result?id=${encodeURIComponent(cid)}`);
          const data = await response.json().catch(() => ({}));
          if (!cancelled && data?.ok && data.consultation) setConsultation(data.consultation as Consultation);
        } catch {
          // 재열람 실패는 조용히 무시
        }
      }
      try {
        const response = await authFetch("/api/sukuyo-compatibility-ai/result");
        if (!response.ok) return;
        const data = await response.json().catch(() => ({}));
        if (!cancelled && Array.isArray(data?.consultations)) setRecentList(data.consultations);
      } catch {
        // 목록 조회 실패는 무시
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 궁합 초대(?cp=) — 공유자(A)의 생일을 상대 칸(personB)에 자동 채움. base64url(JSON), share.js 인코드와 대칭.
  useEffect(() => {
    let cp = "";
    try {
      cp = new URLSearchParams(window.location.search).get("cp") || "";
    } catch {
      return;
    }
    if (!cp) return;
    try {
      let s = cp.replace(/-/g, "+").replace(/_/g, "/");
      while (s.length % 4) s += "=";
      const inv = JSON.parse(decodeURIComponent(escape(atob(s)))) as {
        n?: string; y?: number; m?: number; d?: number; h?: number; mi?: number; c?: string;
      };
      if (!inv || !inv.y || !inv.m || !inv.d) return;
      const pad = (n: number) => String(n).padStart(2, "0");
      const hasTime = inv.h != null && inv.mi != null;
      setPersonB((prev) => ({
        ...prev,
        name: inv.n ? String(inv.n).slice(0, 20) : prev.name,
        birthDate: `${inv.y}-${pad(Number(inv.m))}-${pad(Number(inv.d))}`,
        birthTime: hasTime ? `${pad(Number(inv.h))}:${pad(Number(inv.mi))}` : prev.birthTime,
        birthTimeUnknown: hasTime ? false : prev.birthTimeUnknown,
        calendarType: (inv.c === "lunar" || inv.c === "lunar_leap" ? "lunar" : "solar") as CalendarType,
      }));
    } catch {
      // 초대 파싱 실패는 조용히 무시
    }
  }, []);

  async function loadRecentConsultation(id: string) {
    try {
      const response = await authFetch(`/api/sukuyo-compatibility-ai/result?id=${encodeURIComponent(id)}`);
      const data = await response.json().catch(() => ({}));
      if (data?.ok && data.consultation) {
        setConsultation(data.consultation as Consultation);
        rememberConsultationUrl(id);
        return;
      }
      setError("상담 내역을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
    } catch {
      setError(ERROR_TEXT.NETWORK_ERROR);
    }
  }

  useEffect(() => {
    document.body.classList.add(styles.fullscreenBody);
    return () => document.body.classList.remove(styles.fullscreenBody);
  }, []);

  const phaseText = useMemo(() => {
    if (phase === "access") return "달빛 상담 준비를 확인하고 있습니다";
    if (phase === "payment") return "결제창을 확인해 주세요";
    if (phase === "start") return "숙요점 상담문을 생성하고 있습니다";
    return "";
  }, [phase]);

  const hiddenQuestion = useMemo(() => {
    const a = personA.name.trim() || "나";
    const b = personB.name.trim() || "상대";
    return `${a}와 ${b}의 숙요점 궁합을 본명숙, 관계 유형, 갈등, 시기, 관계 처방까지 전체적으로 읽어 주세요.`;
  }, [personA.name, personB.name]);

  const payload = useMemo(() => ({
    consultationType,
    userName: personA.name,
    gender: personA.gender,
    birthDate: personA.birthDate,
    birthTime: personA.birthTimeUnknown ? "" : personA.birthTime,
    calendarType: personA.calendarType,
    partnerName: consultationType === "compatibility" ? personB.name : "",
    partnerGender: consultationType === "compatibility" ? personB.gender : "",
    partnerBirthDate: consultationType === "compatibility" ? personB.birthDate : "",
    partnerBirthTime: consultationType === "compatibility" ? (personB.birthTimeUnknown ? "" : personB.birthTime) : "",
    partnerCalendarType: consultationType === "compatibility" ? personB.calendarType : "",
    relationshipType,
    topic,
    question: hiddenQuestion,
    locale: "ko",
    serviceType: "sukyo-ai-consultation",
  }), [consultationType, personA, personB, relationshipType, topic, hiddenQuestion]);

  function resetAttempt() {
    if (busy) return;
    submitKeyRef.current = "";
    setError("");
    setNotice("");
    setConsultation(null);
  }

  function updatePerson(target: "a" | "b", patch: Partial<PersonForm>) {
    formTouchedRef.current = true;
    resetAttempt();
    if (target === "a") setPersonA((current) => ({ ...current, ...patch }));
    if (target === "b") setPersonB((current) => ({ ...current, ...patch }));
  }

  function validatePayload() {
    if (!personA.birthDate || !personA.gender || !personA.calendarType) return false;
    if (consultationType === "compatibility" && (!personB.birthDate || !personB.gender || !personB.calendarType)) return false;
    return Boolean(topic && (consultationType === "personal" || relationshipType));
  }

  function getPersonValidationMessage(target: "a" | "b", value: PersonForm) {
    const owner = target === "a" ? "내" : "상대의";
    if (!value.birthDate) return `${owner} 생년월일을 입력해 주세요.`;
    if (!value.gender) return `${owner} 성별을 선택해 주세요.`;
    if (!value.calendarType) return `${owner} 달력 기준을 선택해 주세요.`;
    return "";
  }

  function getPayloadValidationMessage() {
    return getPersonValidationMessage("a", personA) || getPersonValidationMessage("b", personB) || ERROR_TEXT.INVALID_INPUT;
  }

  const personAComplete = !getPersonValidationMessage("a", personA);
  const personBComplete = !getPersonValidationMessage("b", personB);
  const bothComplete = personAComplete && personBComplete;
  const filledCount = countFilledPersonFields(personA) + countFilledPersonFields(personB);
  const filledPercent = Math.round((filledCount / 6) * 100);

  async function startConsultation(idempotencyKey: string, access: Record<string, unknown>, paymentWasRequired = false) {
    setPhase("start");
    const { status, data } = await postJson<{ ok?: boolean; reason?: string; message?: string; consultation?: Consultation }>(
      "/api/sukuyo-compatibility-ai/generate",
      { ...payload, ...access, idempotencyKey },
      idempotencyKey,
    );
    if (data.ok && data.consultation) {
      setConsultation(data.consultation);
      if (data.consultation.id) rememberConsultationUrl(data.consultation.id);
      setError("");
      setNotice("");
      setPhase("idle");
      submitKeyRef.current = "";
      return;
    }
    if (status === 402 && paymentWasRequired) throw new Error("PAYMENT_VERIFY_FAILED");
    if (data.reason === "LLM_FAILED") throw new Error("LLM_FAILED");
    if (data.reason === "CALCULATION_FAILED") throw new Error("CALCULATION_FAILED");
    if (data.reason === "INVALID_INPUT") throw new Error("INVALID_INPUT");
    throw new Error(toText(data.reason) || (status === 401 ? "LOGIN_REQUIRED" : "SERVER_ERROR"));
  }

  async function handleSubmit() {
    if (submitLockRef.current || busy) return;
    submitLockRef.current = true;
    try {
      await runSubmit();
    } finally {
      submitLockRef.current = false;
    }
  }

  async function runSubmit() {
    const previewState = readDevPreviewState();
    if (previewState) {
      setPhase("start");
      const preview = buildSukuyoCompatibilityPreviewPayload(previewState);
      if (preview.ok) {
        setConsultation(preview.consultation as Consultation);
        if (preview.consultation.id) rememberConsultationUrl(preview.consultation.id);
        setError("");
        setNotice("");
      } else {
        setError(ERROR_TEXT[preview.reason] || ERROR_TEXT.LLM_FAILED);
      }
      setPhase("idle");
      return;
    }
    if (!validatePayload()) {
      setError(getPayloadValidationMessage());
      return;
    }
    const idempotencyKey = submitKeyRef.current || makeIdempotencyKey();
    submitKeyRef.current = idempotencyKey;
    setError("");
    setNotice("");
    setPhase("access");
    // 근거는 결제/생성과 무관한 순수 계산이라 기다리지 않고 병렬로 받는다(실패하면 null이라 흐름을 막지 않는다).
    void fetchAnalysisBasis("/api/sukuyo-compatibility-ai/basis", payload).then(setBasis);
    beginPaidFeatureGateCheck({
      featureKey: FEATURE_KEY,
      requestId: idempotencyKey,
      title: "이용권 확인",
      reason: "숙요점 궁합 전문가 상담",
      paymentMode: "MEMBERSHIP_PASS",
    });
    // 이용권 판정(unlock-status)을 아래 접근 확인 왕복과 겹쳐 돌린다 — 결제 게이트가 같은 키로 재사용해 직렬 왕복이 1회 준다.
    void primePaymentEligibility(buildBillingGateInput({}, idempotencyKey));
    try {
      // 이용권 확인 앞단의 일시적 DB 장애(503 DB_DEGRADED 등)는 재시도로 흡수한다 — 하드 실패로 굳지 않게.
      const { status, data } = await runAccessCheckWithTransientRetry(
        () => postJson<EnsureAccessResult>(
          "/api/sukuyo-compatibility-ai/prepare",
          { ...payload, idempotencyKey },
          idempotencyKey,
        ),
        { onRetry: () => setNotice("연결이 잠시 불안정해요. 이용권을 다시 확인하는 중입니다.") },
      );
      if (data.ok) {
        completePaidFeatureGateCheck({
          featureKey: FEATURE_KEY,
          requestId: idempotencyKey,
          title: "이용권 확인 완료",
          reason: "숙요점 궁합 전문가 상담",
          paymentMode: "MEMBERSHIP_PASS",
          message: "이용권 확인이 끝났습니다. 인연의 흐름을 읽고 있습니다.",
        });
        await startConsultation(idempotencyKey, { accessToken: data.accessToken, accessType: data.accessType });
        return;
      }
      const denied = data as Exclude<EnsureAccessResult, { ok: true }>;
      if (denied.reason === "LOGIN_REQUIRED") throw new Error("LOGIN_REQUIRED");
      if (denied.reason === "INVALID_INPUT") throw new Error("INVALID_INPUT");
      // 재시도를 소진하고도 일시적 장애가 지속되면, dead-end 대신 결제창(단건+월정석)을 연다(요구사항: 이용권 확인
      // 실패 시 무조건 결제창). runBillingCoinGate가 billing.js coin-gate로 pass를 재검사(W2 재시도)해 처리한다.
      const passGateDegraded = isRetriableResultPollFailure(status, denied);
      if (!passGateDegraded && denied.reason !== "PAYMENT_REQUIRED") throw new Error(toText(denied.reason) || "SERVER_ERROR");
      setNotice(ERROR_TEXT.PAYMENT_REQUIRED);
      setPhase("payment");
      const paymentPayload = asRecord("paymentPayload" in denied ? denied.paymentPayload : {});
      const runtimeResult = await runBillingCoinGate(buildBillingGateInput(paymentPayload, idempotencyKey));
      if (!isPaymentGranted(runtimeResult)) {
        const runtimeCode = String(runtimeResult.error?.code || "").toUpperCase();
        if (runtimeCode === "PAYMENT_CANCELLED") throw new Error("PAYMENT_CANCELLED");
        throw new Error("PAYMENT_VERIFY_FAILED");
      }
      const payment = extractPayment(runtimeResult, idempotencyKey);
      await startConsultation(idempotencyKey, { ...payment, billingGate: asRecord(runtimeResult.data) }, true);
    } catch (caught) {
      const code = caught instanceof TypeError ? "NETWORK_ERROR" : caught instanceof Error ? caught.message : "SERVER_ERROR";
      const paymentCancelled = code === "PAYMENT_CANCELLED";
      // 이용권/결제 단계 실패에만 "이용권" 제목을 쓴다 — LLM/서버 오류까지 이용권 실패로 보이던 오표기 방지.
      const entitlementFailure = paymentCancelled || code === "PAYMENT_VERIFY_FAILED" || code === "PAYMENT_REQUIRED" || code === "LOGIN_REQUIRED";
      // 일시적 접속 장애는 이용권/생성 결함이 아니므로 별도 문구로 안내한다.
      const isTransient = code === "TEMPORARY_UNAVAILABLE" || code === "NETWORK_ERROR";
      setError(ERROR_TEXT[code] || ERROR_TEXT.SERVER_ERROR);
      failPaidFeatureGateCheck({
        featureKey: FEATURE_KEY,
        requestId: idempotencyKey,
        title: isTransient ? "잠시 후 다시 시도" : entitlementFailure ? "이용권 확인 실패" : "상담 생성 실패",
        reason: "숙요점 궁합 전문가 상담",
        paymentMode: "MEMBERSHIP_PASS",
        message: ERROR_TEXT[code] || ERROR_TEXT.SERVER_ERROR,
        cancelled: paymentCancelled,
      });
      setPhase("idle");
    }
  }

  const renderPersonFields = (target: "a" | "b", value: PersonForm) => {
    const prefix = target === "a" ? "self" : "partner";
    const owner = target === "a" ? "내" : "상대의";
    return (
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label htmlFor={`${prefix}-name`}>이름 또는 닉네임</label>
          <input
            id={`${prefix}-name`}
            value={value.name}
            onChange={(event) => updatePerson(target, { name: event.target.value })}
            maxLength={80}
            disabled={busy}
            placeholder={target === "a" ? "나를 부르는 이름" : "상대를 부르는 이름"}
            autoComplete="name"
          />
          <span className={styles.fieldHint}>이름을 입력하면 상담 문장이 더 자연스러워져요.</span>
        </div>
        <div className={styles.field}>
          <label htmlFor={`${prefix}-gender`}>성별</label>
          <select id={`${prefix}-gender`} value={value.gender} onChange={(event) => updatePerson(target, { gender: event.target.value })} disabled={busy}>
            <option value="">선택</option>
            <option value="female">여성</option>
            <option value="male">남성</option>
            <option value="unknown">비공개</option>
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor={`${prefix}-birth-date`}>생년월일</label>
          <input id={`${prefix}-birth-date`} type="date" value={value.birthDate} onChange={(event) => updatePerson(target, { birthDate: event.target.value })} disabled={busy} />
          {!value.birthDate && <span className={styles.fieldHint}>{owner} 생년월일을 입력해 주세요.</span>}
        </div>
        <div className={styles.field}>
          <label htmlFor={`${prefix}-birth-time`}>
            출생시간 <span className={styles.labelOptional}>선택</span>
          </label>
          <div className={styles.segmented} role="group" aria-label={`${owner} 출생시간 인지 여부`}>
            <button
              type="button"
              className={value.birthTimeUnknown ? styles.segment : styles.segmentActive}
              onClick={() => updatePerson(target, { birthTimeUnknown: false })}
              disabled={busy}
              aria-pressed={!value.birthTimeUnknown}
            >
              시간 알아요
            </button>
            <button
              type="button"
              className={value.birthTimeUnknown ? styles.segmentActive : styles.segment}
              onClick={() => updatePerson(target, { birthTimeUnknown: true, birthTime: "" })}
              disabled={busy}
              aria-pressed={value.birthTimeUnknown}
            >
              시간 몰라요
            </button>
          </div>
          {!value.birthTimeUnknown && (
            <input
              id={`${prefix}-birth-time`}
              type="time"
              value={value.birthTime}
              onChange={(event) => updatePerson(target, { birthTime: event.target.value })}
              disabled={busy}
              className={styles.timeInputStandalone}
            />
          )}
          <span className={styles.fieldHint}>숙요점은 시간 없이도 봐요. 알면 조금 더 정밀해져요.</span>
        </div>
        <div className={styles.fieldWide}>
          <span>달력 기준</span>
          <div className={styles.segmented} role="group" aria-label={`${owner} 달력 기준`}>
            {(["solar", "lunar"] as CalendarType[]).map((calendarType) => (
              <button
                key={calendarType}
                type="button"
                className={value.calendarType === calendarType ? styles.segmentActive : styles.segment}
                onClick={() => updatePerson(target, { calendarType })}
                disabled={busy}
                aria-pressed={value.calendarType === calendarType}
              >
                {calendarType === "solar" ? "양력" : "음력"}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className={styles.screen} data-sukuyo-ai-consultation>
      <div className={styles.threadLine} />
      <div className={styles.starField} aria-hidden="true" />
      <section className={`${styles.shell} mx-auto w-full`}>
        <m.aside
          className={styles.visualPanel}
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className={styles.visualVeil} aria-hidden="true">
            <LunarBotanicalScene reduceMotion={reduceMotion} />
          </div>
          <m.div
            className={styles.visualCopy}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className={styles.eyebrow}><Moon size={15} /> ☾ 27숙 달빛 궁합</p>
            <h2>두 사람의 달빛 자리를 엽니다</h2>
            <p>본명숙과 관계 거리를 바탕으로 끌림, 갈등, 오래 머무는 마음의 리듬을 차분히 풀어드립니다.</p>
            <div className={styles.heroMeta} aria-label="상담 기준">
              <span><Orbit size={14} /> 27숙 본명숙</span>
              <span><CalendarDays size={14} /> 관계 거리</span>
              <span><HeartHandshake size={14} /> 인연 리듬</span>
              <span><Sparkles size={14} /> 전문가 상담문</span>
            </div>
            <div className={styles.insightCards} aria-label="숙요점 궁합 상담 구성">
              {CONSULTATION_CARDS.map(({ icon: Icon, title, text }, index) => (
                <m.article
                  key={title}
                  className={styles.insightCard}
                  initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, delay: 0.16 + index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                >
                  <Icon size={18} aria-hidden="true" />
                  <strong>{title}</strong>
                  <span>{text}</span>
                </m.article>
              ))}
            </div>
          </m.div>
        </m.aside>

        <section className={`${styles.workPanel}${!consultation ? ` ${styles.workPanelWithCta}` : ""}`}>
          {!consultation ? (
            <>
              <div className={styles.panelHeader}>
                <p><Sparkles size={15} /> Moonlight Compatibility</p>
                <h2>나와 상대의 별자리를 채워주세요</h2>
                <span>생년월일, 성별, 달력 기준만 있으면 시작할 수 있어요. 출생시간은 몰라도 괜찮아요.</span>
              </div>
              <FormProgressIndicator filled={filledCount} total={6} />
              <div className={styles.duoGrid}>
                <div className={`${styles.duoCard}${personAComplete ? ` ${styles.duoCardComplete}` : ""}`}>
                  <header className={styles.duoCardHead}>
                    <span aria-hidden="true">☾</span>
                    <strong className="min-w-0 flex-1">나의 별</strong>
                    <button
                      type="button"
                      onClick={loadPersonAFromProfileCard}
                      className="shrink-0 rounded-lg border border-[#ffe8b6]/30 bg-[#ffe8b6]/10 px-2 py-1 text-xs font-bold text-[#ffe8b6] transition hover:bg-[#ffe8b6]/20"
                      aria-label="프로필 카드에서 출생 정보 불러오기"
                    >
                      프로필 카드에서 불러오기
                    </button>
                    <em>{personAComplete ? "자리 완성" : "채우는 중"}</em>
                  </header>
                  {renderPersonFields("a", personA)}
                </div>
                <div className={styles.duoBridge} aria-hidden="true">
                  <span>✦</span>
                  <i />
                </div>
                <div className={`${styles.duoCard} ${styles.duoCardPartner}${personBComplete ? ` ${styles.duoCardComplete}` : ""}`}>
                  <header className={styles.duoCardHead}>
                    <span aria-hidden="true">☆</span>
                    <strong>상대의 별</strong>
                    <em>{personBComplete ? "자리 완성" : "채우는 중"}</em>
                  </header>
                  {renderPersonFields("b", personB)}
                </div>
              </div>

              <m.div
                className={`${styles.resultTeaser}${bothComplete ? ` ${styles.resultTeaserReady}` : ""}`}
                animate={reduceMotion ? undefined : { scale: bothComplete ? [1, 1.03, 1] : 1 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className={styles.teaserTop} aria-hidden="true">
                  <div className={styles.teaserGauge}>
                    <span style={{ background: `conic-gradient(#ffe8b6 ${filledPercent * 3.6}deg, rgba(255,255,255,.08) 0deg)` }} />
                    <em>{filledCount}/6 · {filledPercent}%</em>
                  </div>
                  <div className={styles.teaserLine}>
                    <i className={personAComplete ? styles.teaserDotReady : undefined} />
                    <b />
                    <i className={personBComplete ? styles.teaserDotReady : undefined} />
                  </div>
                </div>
                {/* 폼 진행률 옆에는 "곧 선명해진다"는 예고가 아니라, 실제로 무엇을 받는지를 둔다. */}
                <ul className={styles.valueList} aria-label="이 상담에서 받는 것">
                  {CONSULTATION_VALUES.map((item) => (
                    <li key={item.title}>
                      <span aria-hidden="true">✔</span>
                      <strong>{item.title}</strong>
                      <em>{item.text}</em>
                    </li>
                  ))}
                </ul>
              </m.div>

              <div className={styles.actions}>
                <PriceBadge featureKey="sukuyo-compatibility-ai" prefix="상담 이용 가격 " className={styles.priceBadgeInline} />
                <button type="button" className={styles.primaryButton} onClick={handleSubmit} disabled={busy || !bothComplete}>
                  {busy ? <Loader2 size={18} className={styles.spin} /> : <Sparkles size={18} />}
                  달빛 궁합 열기
                </button>
              </div>

              {/* 모바일 전용 하단 고정 CTA. 이 화면은 전역 하단 네비를 숨기므로(.fullscreenBody) 겹칠 상대가 없다.
                  가격은 반드시 PriceBadge(서버 조회)로만 — 숫자를 직접 렌더하지 않는다. */}
              <div className={styles.mobileCta}>
                <PriceBadge featureKey="sukuyo-compatibility-ai" prefix="" className={styles.mobileCtaPrice} />
                <button type="button" onClick={handleSubmit} disabled={busy || !bothComplete}>
                  {busy ? <Loader2 size={16} className={styles.spin} /> : <Sparkles size={16} />}
                  달빛 궁합 열기
                </button>
              </div>

              {recentList.length > 0 && (
                <div className={styles.recentBox} aria-label="지난 궁합 다시 보기">
                  <strong>지난 달빛 궁합 다시 보기</strong>
                  {recentList.slice(0, 5).map((item) => (
                    <button key={item.id} type="button" className={styles.recentItem} onClick={() => void loadRecentConsultation(item.id)} disabled={busy}>
                      <span>{item.personAName} ✦ {item.personBName}</span>
                      <small>{[item.personAShuku && `${item.personAShuku}·${item.personBShuku}`, item.relationType].filter(Boolean).join(" · ")}</small>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : !result ? (
            <div className={styles.resultPanel}>
              <div className={styles.resultHeader}>
                <p><Moon size={15} /> 상담실이 열렸습니다</p>
                <h2>두 사람의 달빛 결을 이어 읽습니다</h2>
              </div>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <span>{consultation.personA?.name || "나"}</span>
                  <strong>{consultation.sukuyoResult?.personAShuku || consultation.personA?.shuku || "-"}</strong>
                </div>
                <div className={styles.summaryCard}>
                  <span>{consultation.consultationType === "personal" ? "오늘의 달빛 결론" : `${consultation.relationshipType} · ${consultation.topic}`}</span>
                  <strong>{consultation.sukuyoResult?.relationType || "-"}</strong>
                  <em>{consultation.sukuyoResult?.distanceLabel || distanceLabel(consultation.sukuyoResult?.distance) || "출생 정보 기준으로 본 흐름"}</em>
                </div>
                {consultation.consultationType !== "personal" && (
                  <div className={styles.summaryCard}>
                    <span>{consultation.personB?.name || "상대"}</span>
                    <strong>{consultation.sukuyoResult?.personBShuku || consultation.personB?.shuku || "-"}</strong>
                  </div>
                )}
              </div>

              {fallbackPages.length > 0 && (
                <PagedResultViewer
                  pages={fallbackPages}
                  deckLabel="달빛 상담문"
                  className={styles.pagedViewer}
                  pageClassName={styles.pagedPage}
                  viewAll={fallbackViewAll}
                  onViewAllChange={setFallbackViewAll}
                />
              )}
            </div>
          ) : (
            <div className={styles.resultPanel}>
              <div className={styles.resultHeader}>
                <p><Moon size={15} /> 달빛 답장이 완성되었습니다</p>
                <h2>결과 레이어에서 궁합을 확인하고 PDF로 저장할 수 있습니다</h2>
              </div>
              <div className={styles.actions}>
                <button type="button" className={styles.primaryButton} onClick={() => setResultOpen(true)}>
                  <Moon size={18} />
                  달빛 답장 다시 열기
                </button>
                <button
                  type="button"
                  className={styles.ghostButton}
                  onClick={() => {
                    setConsultation(null);
                    setResultOpen(false);
                    submitKeyRef.current = "";
                  }}
                >
                  새 궁합 보기
                </button>
              </div>
            </div>
          )}

          {(phaseText || notice || error) && (
            <div className={error ? styles.statusError : styles.statusInfo} role="status">
              {phaseText && <span><HeartHandshake size={16} /> {phaseText}</span>}
              {!phaseText && notice && <span>{notice}</span>}
              {error && <span>{error}</span>}
            </div>
          )}
        </section>
      </section>
      {phase === "start" && <MoonLoadingScreen basis={basis} />}
      {result && resultOpen && (
        <CompatResultModal
          result={result}
          onClose={() => setResultOpen(false)}
          onDownloadError={setError}
          basis={consultation?.analysisBasis || basis}
        />
      )}
    </main>
  );
}
