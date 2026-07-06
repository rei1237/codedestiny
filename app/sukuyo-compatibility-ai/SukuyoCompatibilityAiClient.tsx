"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { m, useReducedMotion } from "framer-motion";
import { CalendarDays, Download, HeartHandshake, Loader2, Moon, Orbit, Sparkles, X } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";
import { toDisplayText } from "@/lib/llm-text";
import {
  beginPaidFeatureGateCheck,
  completePaidFeatureGateCheck,
  failPaidFeatureGateCheck,
  runBillingCoinGate,
} from "@/app/_lib/billing-client";
import { readAiProfileSeed, type AiPrefillSeed } from "@/app/_lib/ai-prefill-seed";
import { useAiProfileSeed } from "@/app/hooks/useAiProfileSeed";
import { PriceBadge } from "@/app/components/PriceBadge";
import styles from "./SukuyoCompatibilityAiClient.module.css";

type CalendarType = "solar" | "lunar";
type ConsultationType = "personal" | "compatibility";
type PersonForm = {
  name: string;
  gender: string;
  birthDate: string;
  birthTime: string;
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
  };
  sections: Record<string, { title: string; body: string }>;
};
type EnsureAccessResult =
  | { ok: true; accessToken: string; accessType: "pass" | "paid" | "subscription" | "admin" }
  | { ok: false; reason: "PAYMENT_REQUIRED"; paymentPayload: Record<string, unknown> }
  | { ok: false; reason: "LOGIN_REQUIRED" }
  | { ok: false; reason: "INVALID_INPUT"; message: string }
  | { ok: false; reason?: string; message?: string };

const FEATURE_KEY = "sukuyo-compatibility-ai";
const FEATURE_REASON = "숙요점 궁합 AI 상담";
const FEATURE_COST = 300;
const FEATURE_AMOUNT_KRW = 30000;
const FEATURE_MEMBERSHIP_CREDIT_COST = 3000;
const LOADING_STAGES = [
  { phase: "1", label: "두 사람의 달빛 자리를 맞춰보고 있어요.", sub: "생년 정보 확인" },
  { phase: "2", label: "본명숙과 관계 거리의 흐름을 차분히 읽는 중입니다.", sub: "본명숙 계산" },
  { phase: "3", label: "끌림과 갈등이 머무는 자리를 살피고 있어요.", sub: "관계 거리 해석" },
  { phase: "4", label: "두 사람에게 전할 상담문을 고요히 정리합니다.", sub: "AI 상담문 생성" },
];
const CONSULTATION_CARDS = [
  { icon: Orbit, title: "본명숙", text: "태어난 달의 자리로 보는 마음의 기본 결" },
  { icon: CalendarDays, title: "관계 거리", text: "가까움과 멀어짐의 리듬을 읽는 숙요점 핵심" },
  { icon: HeartHandshake, title: "궁합 해석", text: "끌림, 갈등, 오래가는 방식까지 AI 상담으로 정리" },
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
const SECTION_ICONS: Record<string, string> = {
  overview: "☯",
  twoStars: "☽",
  attraction: "✦",
  conflict: "〜",
  timing: "◎",
  caution: "⚠",
  treasure: "◈",
  communication: "🗣",
  domains: "💞",
  crisis: "🌪",
  outlook: "🔭",
  moonLetter: "♡",
};
// 챕터 진입 시 숙요 역술가 보이스 로딩 카피
const CHAPTER_LOADING_COPY: Record<string, string> = {
  overview: "역술가가 두 별의 전체 궁합 그림을 펼치고 있습니다…",
  twoStars: "두 분의 본명숙을 나란히 놓고 기질을 비춰보는 중입니다.",
  attraction: "처음 끌렸던 순간의 별자리 거리를 되짚어 보고 있습니다.",
  conflict: "파문이 이는 자리를 관계 유형의 결로 살피는 중입니다.",
  timing: "관계의 계절이 어디쯤 왔는지 절기력을 넘기고 있습니다.",
  caution: "원국 근거로 조심할 습관을 정리하는 중입니다.",
  treasure: "두 분만의 강점이 모이는 자리를 찾아내고 있습니다.",
  communication: "서로에게 닿는 말의 온도를 맞춰 보는 중입니다.",
  domains: "연애, 일, 우정 — 영역별 상성을 갈아 끼워 보고 있습니다.",
  crisis: "위기 국면을 건너는 단계별 지침을 세우는 중입니다.",
  outlook: "1년 뒤, 3년 뒤 두 갈래 하늘을 미리 내다보는 중입니다.",
  moonLetter: "마지막 달빛 처방을 정성껏 접고 있습니다…",
};
const CHAPTER_LOADING_COPY_FALLBACK = "다음 장의 달빛을 모으는 중입니다…";

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
  return {
    ...person,
    name: profile.name || person.name,
    gender: (profile.gender as PersonForm["gender"]) || person.gender,
    birthDate: profile.birthDate || person.birthDate,
    birthTime: profile.birthTimeUnknown === true ? "" : profile.birthTime || person.birthTime,
    calendarType: profile.calendarType || person.calendarType,
  };
}

function buildInitialPersonA(): PersonForm {
  return applyProfileSeedToPerson({ ...EMPTY_PERSON }, readAiProfileSeed());
}

const ERROR_TEXT: Record<string, string> = {
  LOGIN_REQUIRED: "상담을 시작하려면 로그인이 필요합니다. 로그인 후 다시 시도해 주세요.",
  PAYMENT_REQUIRED: "숙요점 궁합 AI 상담 이용권이 필요합니다. 결제창을 열어드릴게요.",
  PAYMENT_VERIFY_FAILED: "결제 확인이 완료되지 않았습니다. 결제가 완료되었다면 잠시 후 다시 시도해 주세요.",
  PAYMENT_CANCELLED: "결제가 취소되었습니다. 필요할 때 다시 진행할 수 있습니다.",
  INVALID_INPUT: "상담에 필요한 정보가 부족해요. 두 사람의 생년월일과 달력 기준을 다시 확인해 주세요.",
  CALCULATION_FAILED: "숙요점 계산 중 문제가 발생했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.",
  SERVER_ERROR: "상담 준비 중 문제가 발생했어요. 결제나 이용권은 차감되지 않았습니다.",
  LLM_FAILED: "AI 상담문을 생성하는 중 문제가 발생했어요. 차감된 내역이 있다면 자동 복구됩니다.",
  NETWORK_ERROR: "연결이 불안정해요. 잠시 후 다시 시도해 주세요.",
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
    forceDeduct: true,
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
  });
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

function MoonLoadingScreen() {
  const [stage, setStage] = useState(0);
  const reduceMotion = useReducedMotion() === true;

  useEffect(() => {
    const intervals = [2400, 3000, 3200, 3400];
    let elapsed = 0;
    const timers = intervals.map((duration, index) => {
      elapsed += duration;
      return window.setTimeout(() => setStage(index), elapsed - duration);
    });
    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, []);

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
      <div className={styles.loadingText}>
        <p>{LOADING_STAGES[stage].label}</p>
        <span>{LOADING_STAGES[stage].sub}</span>
      </div>
      <div className={styles.loadingDots}>
        {LOADING_STAGES.map((item, index) => (
          <span key={item.sub} className={index <= stage ? styles.loadingDotActive : styles.loadingDot}>
            <b>{item.phase}</b>
            <i />
            <em>{item.sub}</em>
          </span>
        ))}
      </div>
      <div className={styles.loadingBar}>
        <span />
      </div>
      <p className={styles.loadingFoot}>두 사람의 달빛 자리를 맞춰보고 있어요.</p>
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
          <text key={axis.key} x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="rgba(255,255,255,0.48)">
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
        return (
          <div key={key} className={styles.scoreBarRow}>
            <div>
              <span>{label}</span>
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

function renderInlineRichText(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    return part;
  });
}

function renderRichText(body: string) {
  return body.split(/\n{2,}/).map((block, blockIndex) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return null;
    if (lines.every((line) => /^\d+[.)]\s+/.test(line))) {
      return (
        <ol key={blockIndex}>
          {lines.map((line, lineIndex) => <li key={lineIndex}>{renderInlineRichText(line.replace(/^\d+[.)]\s+/, ""))}</li>)}
        </ol>
      );
    }
    if (lines.every((line) => /^[-*]\s+/.test(line))) {
      return (
        <ul key={blockIndex}>
          {lines.map((line, lineIndex) => <li key={lineIndex}>{renderInlineRichText(line.replace(/^[-*]\s+/, ""))}</li>)}
        </ul>
      );
    }
    if (lines.every((line) => /^>\s?/.test(line))) {
      return <blockquote key={blockIndex}>{renderInlineRichText(lines.map((line) => line.replace(/^>\s?/, "")).join(" "))}</blockquote>;
    }
    return (
      <p key={blockIndex}>
        {lines.map((line, lineIndex) => (
          <span key={lineIndex}>
            {renderInlineRichText(line)}
            {lineIndex < lines.length - 1 ? <br /> : null}
          </span>
        ))}
      </p>
    );
  });
}

// 요약 헤더: 두 별을 잇는 별자리 라인 + 궁합 게이지 + "운명적 끌림 vs 현실적 조율" 듀얼 미터
function CompatSummaryHeader({ meta }: { meta: CompatResult["meta"] }) {
  const pull = Math.round(((meta.scores.destiny + meta.scores.emotion) / 40) * 100);
  const tune = Math.round(((meta.scores.stability + meta.scores.harmony) / 40) * 100);
  return (
    <section className={styles.summaryHeaderCard} aria-label="궁합 요약">
      <svg viewBox="0 0 320 96" className={styles.starLineSvg} aria-hidden="true">
        <path d="M28 66 Q160 8 292 66" fill="none" stroke="rgba(200,168,255,0.35)" strokeWidth="1.2" strokeDasharray="3 5" />
        <line x1="28" y1="66" x2="292" y2="66" stroke="rgba(255,232,182,0.5)" strokeWidth="1.4" />
        <circle cx="28" cy="66" r="7" fill="#FFE8B6" style={{ filter: "drop-shadow(0 0 8px rgba(255,232,182,0.9))" }} />
        <circle cx="292" cy="66" r="7" fill="#C8A8FF" style={{ filter: "drop-shadow(0 0 8px rgba(200,168,255,0.9))" }} />
        <text x="28" y="88" textAnchor="middle" fontSize="10" fill="rgba(255,247,232,0.85)">{meta.person_a.sukuyo}</text>
        <text x="292" y="88" textAnchor="middle" fontSize="10" fill="rgba(255,247,232,0.85)">{meta.person_b.sukuyo}</text>
        <text x="160" y="58" textAnchor="middle" fontSize="10" fill="rgba(255,232,182,0.9)">{meta.relation.type_a_to_b} · 거리 {meta.relation.distance}숙</text>
      </svg>
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

function CompatResultModal({ result, onClose, onDownloadError }: { result: CompatResult; onClose: () => void; onDownloadError: (message: string) => void }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { meta, sections } = result;
  const readingPages = useMemo(() => chunkReadingSections(sections), [sections]);
  const chapterEntries = useMemo(() => Object.entries(sections), [sections]);
  const [activeChapter, setActiveChapter] = useState(0);
  const [unlockedChapter, setUnlockedChapter] = useState(0);
  const [chapterLoading, setChapterLoading] = useState(false);
  const chapterTimerRef = useRef<number | null>(null);
  const chapterBodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setChapterLoading(true);
    chapterTimerRef.current = window.setTimeout(() => setChapterLoading(false), 850);
    return () => {
      if (chapterTimerRef.current) window.clearTimeout(chapterTimerRef.current);
    };
  }, []);

  const openChapter = (index: number) => {
    if (index < 0 || index >= chapterEntries.length || index > unlockedChapter + 1) return;
    if (chapterTimerRef.current) window.clearTimeout(chapterTimerRef.current);
    setActiveChapter(index);
    setUnlockedChapter((current) => Math.max(current, index));
    setChapterLoading(true);
    chapterTimerRef.current = window.setTimeout(() => {
      setChapterLoading(false);
      chapterBodyRef.current?.scrollTo?.({ top: 0 });
    }, 850);
  };

  const handlePDF = async () => {
    const element = document.getElementById("compat-result-body");
    if (!element || isDownloading) return;
    setIsDownloading(true);
    try {
      const [{ default: html2canvas }, jsPdfModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const JsPDF = jsPdfModule.default || jsPdfModule.jsPDF;
      const pdf = new JsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const pdfSections = Array.from(element.querySelectorAll<HTMLElement>("[data-pdf-section]"));
      for (const [index, section] of pdfSections.entries()) {
        const canvas = await html2canvas(section, {
          backgroundColor: "#060412",
          scale: 2,
          useCORS: true,
        });
        const imageData = canvas.toDataURL("image/png");
        const imageHeight = Math.min(pageHeight, (canvas.height / canvas.width) * pageWidth);
        if (index > 0) pdf.addPage();
        pdf.addImage(imageData, "PNG", 0, 0, pageWidth, imageHeight);
      }
      const fileName = `달빛궁합_${meta.person_a.name}_${meta.person_b.name}_${new Date().toLocaleDateString("ko-KR").replace(/\./g, "").replace(/ /g, "")}.pdf`.replace(/[\\/:*?"<>|]/g, "_");
      pdf.save(fileName);
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
          <h1>달빛 궁합 답장</h1>
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
        <CompatSummaryHeader meta={meta} />
        <nav className={styles.chapterNav} aria-label="궁합 리포트 목차 — 장을 눌러 이동">
          {chapterEntries.map(([key, section], index) => (
            <button
              key={key}
              type="button"
              className={`${styles.chapterChip}${index === activeChapter ? ` ${styles.chapterChipActive}` : ""}${index > unlockedChapter + 1 ? ` ${styles.chapterChipLocked}` : ""}`}
              onClick={() => openChapter(index)}
              disabled={index > unlockedChapter + 1}
              aria-current={index === activeChapter ? "true" : undefined}
              aria-label={`${index + 1}장 ${section.title}${index > unlockedChapter + 1 ? " (아직 잠겨 있어요)" : ""}`}
            >
              <span aria-hidden="true">{SECTION_ICONS[key] || "✦"}</span>
              {index + 1}장
            </button>
          ))}
        </nav>
        <div className={styles.chapterStage} ref={chapterBodyRef}>
          {chapterLoading ? (
            <div className={styles.yeonLoading} aria-live="polite">
              <span aria-hidden="true">☾</span>
              <p>{CHAPTER_LOADING_COPY[chapterEntries[activeChapter]?.[0] || ""] || CHAPTER_LOADING_COPY_FALLBACK}</p>
            </div>
          ) : (
            <article className={styles.readingSection}>
              <div>
                <span>{SECTION_ICONS[chapterEntries[activeChapter]?.[0] || ""] || "✦"}</span>
                <h3>{chapterEntries[activeChapter]?.[1]?.title || ""}</h3>
              </div>
              <div className={styles.readingBody}>{renderRichText(chapterEntries[activeChapter]?.[1]?.body || "")}</div>
            </article>
          )}
        </div>
        <div className={styles.chapterPager}>
          <button type="button" onClick={() => openChapter(activeChapter - 1)} disabled={activeChapter === 0 || chapterLoading} aria-label="이전 장으로">
            이전 장
          </button>
          <span>{activeChapter + 1} / {chapterEntries.length}</span>
          {activeChapter < chapterEntries.length - 1 ? (
            <button type="button" className={styles.chapterNextButton} onClick={() => openChapter(activeChapter + 1)} disabled={chapterLoading} aria-label="다음 장 열기">
              다음 장 열기
            </button>
          ) : (
            <button type="button" className={styles.chapterNextButton} onClick={onClose} disabled={chapterLoading} aria-label="결과 닫기">
              여운 남기고 닫기
            </button>
          )}
        </div>
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
              <article key={key} className={styles.readingSection}>
                <div>
                  <span>{SECTION_ICONS[key] || "✦"}</span>
                  <h3>{section.title}</h3>
                </div>
                <div className={styles.readingBody}>{renderRichText(section.body)}</div>
              </article>
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
  const [resultOpen, setResultOpen] = useState(false);
  const [recentList, setRecentList] = useState<RecentConsultation[]>([]);
  const [phase, setPhase] = useState<"idle" | "access" | "payment" | "start" | "chat">("idle");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const submitKeyRef = useRef("");
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
    birthTime: personA.birthTime,
    calendarType: personA.calendarType,
    partnerName: consultationType === "compatibility" ? personB.name : "",
    partnerGender: consultationType === "compatibility" ? personB.gender : "",
    partnerBirthDate: consultationType === "compatibility" ? personB.birthDate : "",
    partnerBirthTime: consultationType === "compatibility" ? personB.birthTime : "",
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
    if (busy) return;
    if (!validatePayload()) {
      setError(getPayloadValidationMessage());
      return;
    }
    const idempotencyKey = submitKeyRef.current || makeIdempotencyKey();
    submitKeyRef.current = idempotencyKey;
    setError("");
    setNotice("");
    setPhase("access");
    beginPaidFeatureGateCheck({
      featureKey: FEATURE_KEY,
      requestId: idempotencyKey,
      title: "이용권 확인",
      reason: "숙요점 궁합 AI 상담",
      paymentMode: "MEMBERSHIP_PASS",
    });
    try {
      const { data } = await postJson<EnsureAccessResult>(
        "/api/sukuyo-compatibility-ai/prepare",
        { ...payload, idempotencyKey },
        idempotencyKey,
      );
      if (data.ok) {
        completePaidFeatureGateCheck({
          featureKey: FEATURE_KEY,
          requestId: idempotencyKey,
          title: "이용권 확인 완료",
          reason: "숙요점 궁합 AI 상담",
          paymentMode: "MEMBERSHIP_PASS",
          message: "이용권 확인이 끝났습니다. 인연의 흐름을 읽고 있습니다.",
        });
        await startConsultation(idempotencyKey, { accessToken: data.accessToken, accessType: data.accessType });
        return;
      }
      const denied = data as Exclude<EnsureAccessResult, { ok: true }>;
      if (denied.reason === "LOGIN_REQUIRED") throw new Error("LOGIN_REQUIRED");
      if (denied.reason === "INVALID_INPUT") throw new Error("INVALID_INPUT");
      if (denied.reason !== "PAYMENT_REQUIRED") throw new Error(toText(denied.reason) || "SERVER_ERROR");
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
      setError(ERROR_TEXT[code] || ERROR_TEXT.SERVER_ERROR);
      failPaidFeatureGateCheck({
        featureKey: FEATURE_KEY,
        requestId: idempotencyKey,
        title: "이용권 확인 실패",
        reason: "숙요점 궁합 AI 상담",
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
          <label htmlFor={`${prefix}-birth-time`}>출생시간</label>
          <div className={styles.timeControl}>
            <input id={`${prefix}-birth-time`} type="time" value={value.birthTime} onChange={(event) => updatePerson(target, { birthTime: event.target.value })} disabled={busy} />
            <button type="button" className={styles.timeUnknownButton} onClick={() => updatePerson(target, { birthTime: "" })} disabled={busy || !value.birthTime}>
              모름
            </button>
          </div>
          <span className={styles.fieldHint}>정확한 시간을 모르신다면 ‘모름’을 선택해도 상담은 진행됩니다.</span>
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
            <h1>두 사람의 달빛 자리를 엽니다</h1>
            <p>본명숙과 관계 거리를 바탕으로 끌림, 갈등, 오래 머무는 마음의 리듬을 차분히 풀어드립니다.</p>
            <div className={styles.heroMeta} aria-label="상담 기준">
              <span><Orbit size={14} /> 27숙 본명숙</span>
              <span><CalendarDays size={14} /> 관계 거리</span>
              <span><HeartHandshake size={14} /> 인연 리듬</span>
              <span><Sparkles size={14} /> AI 상담문</span>
            </div>
            <div className={styles.insightCards} aria-label="숙요점 궁합 상담 구성">
              {CONSULTATION_CARDS.map(({ icon: Icon, title, text }, index) => (
                <m.article
                  key={title}
                  className={styles.insightCard}
                  initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                  animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  whileHover={reduceMotion ? undefined : { y: -4, scale: 1.012 }}
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

        <section className={styles.workPanel}>
          {!consultation ? (
            <>
              <div className={styles.panelHeader}>
                <p><Sparkles size={15} /> Moonlight Compatibility</p>
                <h2>두 사람의 달빛 자리를 엽니다</h2>
                <span>숙요점의 본명숙과 관계 거리를 바탕으로 서로의 끌림, 갈등, 마음의 속도를 AI 상담 형식으로 차분히 풀어드립니다.</span>
              </div>
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

              <div className={`${styles.resultTeaser}${bothComplete ? ` ${styles.resultTeaserReady}` : ""}`} aria-hidden="true">
                <div className={styles.teaserGauge}>
                  <span />
                  <em>궁합 게이지</em>
                </div>
                <div className={styles.teaserLine}>
                  <i /><b /><i />
                </div>
                <p>{bothComplete ? "두 별의 자리가 모두 채워졌어요. 이제 달빛 궁합을 열 수 있습니다." : "두 별의 자리가 채워지면 미리보기가 선명해져요."}</p>
              </div>

              <div className="flex items-center justify-end">
                <PriceBadge featureKey="sukuyo-compatibility-ai" fallbackCoins={300} prefix="상담 이용 가격 " />
              </div>
              <div className={styles.actions}>
                <button type="button" className={styles.primaryButton} onClick={handleSubmit} disabled={busy || !bothComplete}>
                  {busy ? <Loader2 size={18} className={styles.spin} /> : <Sparkles size={18} />}
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

              <div className={styles.chatList}>
                {consultation.messages.map((item, index) => (
                  <article key={`${item.role}-${index}`} className={item.role === "assistant" ? styles.assistantMessage : styles.userMessage}>
                    <span>{item.role === "assistant" ? "상담" : "나"}</span>
                    <p>{item.content}</p>
                  </article>
                ))}
              </div>
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
      {phase === "start" && <MoonLoadingScreen />}
      {result && resultOpen && (
        <CompatResultModal
          result={result}
          onClose={() => setResultOpen(false)}
          onDownloadError={setError}
        />
      )}
    </main>
  );
}
