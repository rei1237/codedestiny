"use client";

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import FortuneTeaHouseImmersiveShell from "./components/FortuneTeaHouseImmersiveShell";
import FortuneTeaHouseLanding from "./components/FortuneTeaHouseLanding";
import AssetImage from "./components/AssetImage";
import TeaHouseButton from "./components/TeaHouseButton";
import HoneyDropRewardOverlay from "./components/HoneyDropRewardOverlay";
import { fortuneTeaHouseAssets } from "./data/assets";
import type { FortuneTeaHouseConsultMode, FortuneTeaHouseConsultRequest, FortuneTeaHouseConsultResponse, FortuneTeaHouseHoneyDropsState, FortuneTeaHouseQuestionInput } from "./data/consult";
import { isTeaHouseEntryStage } from "./data/entryStory";
import { teaHouseCtaCopy, type TeaHouseStage } from "./data/story";
import type { TeaHouseCup } from "./data/teaCups";
import { buildFortuneTeaHouseConsultResult } from "./lib/buildConsultResult";
import {
  createFortuneTeaAttemptId,
  normalizeHoneyDropsState,
  pickHoneyDropMessage,
} from "./lib/honeyDrops";
import styles from "./styles/fortune-tea-house.module.css";

type RunBillingCoinGate = typeof import("@/app/_lib/billing-client")["runBillingCoinGate"];
type BeginPaidFeatureGateCheck = typeof import("@/app/_lib/billing-client")["beginPaidFeatureGateCheck"];
type CompletePaidFeatureGateCheck = typeof import("@/app/_lib/billing-client")["completePaidFeatureGateCheck"];
type FailPaidFeatureGateCheck = typeof import("@/app/_lib/billing-client")["failPaidFeatureGateCheck"];

const FORTUNE_TEA_BGM_TRACKS = {
  moonlitTeaHouse: {
    key: "moonlit-tea-house",
    url: "https://music.code-destiny.com/DestinyCafe/Moonlit%20Tea%20House.mp3",
    volume: 0.28,
  },
  gentleOrientalGirl: {
    key: "gentle-oriental-girl",
    url: "https://music.code-destiny.com/DestinyCafe/Gentle%20Oriental%20Girl.mp3",
    volume: 0.24,
  },
  moonlightTea: {
    key: "moonlight-tea",
    url: "https://music.code-destiny.com/DestinyCafe/Moonlight%20Tea.mp3",
    volume: 0.26,
  },
  kindness: {
    key: "kindness",
    url: "https://music.code-destiny.com/DestinyCafe/Kindness.mp3",
    volume: 0.26,
  },
  moonlitDestinyRoom: {
    key: "moonlit-destiny-room",
    url: "https://music.code-destiny.com/DestinyCafe/Moonlit%20Destiny%20Room.mp3",
    volume: 0.26,
  },
  fortuneReveal: {
    key: "fortune-reveal",
    url: "https://music.code-destiny.com/DestinyCafe/Fortune%20Reveal.mp3",
    volume: 0.25,
  },
} as const;

const FORTUNE_TEA_BGM_STORAGE_KEY = "code-destiny-fortune-tea-house-bgm";
const FORTUNE_TEA_ENTRY_PROLOGUE_SEEN_STORAGE_KEY = "code-destiny-fortune-tea-house-entry-prologue-seen:v1";
const FORTUNE_TEA_LOADING_PLAYLIST = [
  FORTUNE_TEA_BGM_TRACKS.moonlightTea,
  FORTUNE_TEA_BGM_TRACKS.moonlitDestinyRoom,
  FORTUNE_TEA_BGM_TRACKS.fortuneReveal,
] as const;

type FortuneTeaBgmTrack = (typeof FORTUNE_TEA_BGM_TRACKS)[keyof typeof FORTUNE_TEA_BGM_TRACKS];
type FortuneTeaBillingGateInput = Parameters<RunBillingCoinGate>[0];
type FortuneTeaBillingGateResult = Awaited<ReturnType<RunBillingCoinGate>>;
type FortuneTeaBillingGateData = NonNullable<FortuneTeaBillingGateResult["data"]>;

const DestinyCafeTarotAlbum = lazy(() => import("./components/DestinyCafeTarotAlbum"));
const FortuneTeaHouseDebugPanel = lazy(() => import("./components/FortuneTeaHouseDebugPanel"));
const QuestionInputScene = lazy(() => import("./components/QuestionInputScene"));
const ScentLoadingScene = lazy(() => import("./components/ScentLoadingScene"));
const TarotRevealScene = lazy(() => import("./components/TarotRevealScene"));
const TeaCupRitualScene = lazy(() => import("./components/TeaCupRitualScene"));
const TeaCupSelectionScene = lazy(() => import("./components/TeaCupSelectionScene"));
const TeaHouseEntryScene = lazy(() => import("./components/TeaHouseEntryScene"));
const TeaHouseResultSheet = lazy(() => import("./components/TeaHouseResultSheet"));

type FortuneTeaHouseConsultApiResponse = {
  ok?: boolean;
  status?: string;
  reason?: string;
  retryable?: boolean;
  result?: FortuneTeaHouseConsultResponse;
  honeyDrops?: FortuneTeaHouseHoneyDropsState;
  message?: string;
  paymentRequired?: boolean;
  featureKey?: string;
  pricing?: Record<string, unknown>;
  accessDecision?: Record<string, unknown>;
  paymentPayload?: {
    runtimeGate?: Partial<FortuneTeaBillingGateInput> & Record<string, unknown>;
  } & Record<string, unknown>;
  generationMeta?: {
    mode?: "gemini" | "local_fallback";
    provider?: string;
    model?: string;
    reason?: string;
    generatedAt?: string;
  };
};

export type FortuneTeaGenerationProgress = {
  percent: number;
  label: string;
  message: string;
  delayed?: boolean;
  status: "running" | "complete" | "error";
};

type FortuneTeaProgressStep = {
  percent: number;
  label: string;
  message: string;
};

type FortuneTeaConsultPostBody = FortuneTeaHouseConsultRequest & Record<string, unknown>;

const FORTUNE_TEA_FEATURE_KEY_BY_MODE: Record<FortuneTeaHouseConsultMode, string> = {
  tarot: "fortune-tea-house-tarot-consultation",
  saju: "fortune-tea-house-saju-consultation",
  sukuyo: "fortune-tea-house-sukuyo-compatibility-consultation",
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toText(value: unknown): string {
  return String(value || "").trim();
}

function toNumber(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function buildFortuneTeaPaymentError(message: string) {
  const error = new Error(message || "결제 확인이 완료되지 않았어요. 다시 한 번만 시도해 주세요.");
  (error as Error & { paymentRequired?: boolean }).paymentRequired = true;
  return error;
}

function buildFortuneTeaGenerationPendingError(message?: string) {
  const error = new Error(message || "결제는 확인되었고 상담문은 아직 생성 중이에요. 잠시 뒤 같은 버튼으로 다시 열어 주세요.");
  (error as Error & { generationPending?: boolean }).generationPending = true;
  return error;
}

function isFortuneTeaGenerationPending(response: Response, payload: FortuneTeaHouseConsultApiResponse) {
  return response.status === 202 || payload.status === "generating" || payload.reason === "GENERATION_IN_PROGRESS";
}

function buildFortuneTeaBillingGateInput(payload: FortuneTeaHouseConsultApiResponse, mode: FortuneTeaHouseConsultMode, attemptId: string): FortuneTeaBillingGateInput {
  const paymentPayload = asRecord(payload.paymentPayload);
  const runtimeGate = asRecord(paymentPayload.runtimeGate);
  const pricing = asRecord(payload.pricing);
  const featureKey = toText(runtimeGate.featureKey ?? payload.featureKey ?? pricing.featureKey) || FORTUNE_TEA_FEATURE_KEY_BY_MODE[mode];
  const coinPrice = Math.floor(toNumber(runtimeGate.coinPrice ?? runtimeGate.cost ?? pricing.coinPrice ?? pricing.cost));
  const amountKRW = Math.floor(toNumber(runtimeGate.amountKRW ?? runtimeGate.amountKrw ?? runtimeGate.paymentAmount ?? pricing.amountKRW ?? pricing.paymentAmount));
  const membershipCreditCost = Math.floor(toNumber(runtimeGate.membershipCreditCost ?? pricing.membershipCreditCost));
  if (!featureKey || coinPrice <= 0 || amountKRW <= 0 || membershipCreditCost <= 0) {
    throw buildFortuneTeaPaymentError("결제 가격 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  return {
    ...runtimeGate,
    categoryKey: toText(runtimeGate.categoryKey) || "fortune-tea-house",
    subFeatureKey: toText(runtimeGate.subFeatureKey) || featureKey,
    featureKey,
    serviceType: toText(runtimeGate.serviceType) || "fortune-tea-house",
    productType: toText(runtimeGate.productType) || "fortune-tea-house-consultation",
    reason: toText(runtimeGate.reason ?? pricing.reason) || "운명 찻집 상담",
    requestId: attemptId,
    idempotencyKey: attemptId,
    cost: coinPrice,
    coinPrice,
    amountKRW,
    paymentAmount: amountKRW,
    membershipCreditCost,
    deferUsage: true,
    forceDeduct: true,
  };
}

async function postFortuneTeaConsultRequest(body: FortuneTeaConsultPostBody, signal?: AbortSignal) {
  const response = await fetch("/api/fortune-tea-house/consult", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal,
  });
  const payload = (await response.json().catch(() => ({}))) as FortuneTeaHouseConsultApiResponse;
  return { response, payload };
}

async function runFortuneTeaBillingGate(payload: FortuneTeaHouseConsultApiResponse, mode: FortuneTeaHouseConsultMode, attemptId: string) {
  const billingInput = buildFortuneTeaBillingGateInput(payload, mode, attemptId);
  const { runBillingCoinGate } = await import("@/app/_lib/billing-client");
  const gate = await runBillingCoinGate(billingInput);
  if (!gate.ok || !gate.data) {
    const code = toText(gate.error?.code).toUpperCase();
    const message = code === "AUTH_REQUIRED" || code === "LOGIN_REQUIRED"
      ? "로그인 후 운명 찻집 상담을 열 수 있어요."
      : gate.error?.message || gate.message || "결제 확인이 완료되지 않았어요. 다시 한 번만 시도해 주세요.";
    throw buildFortuneTeaPaymentError(code === "PAYMENT_CANCELLED" ? "결제가 취소되었습니다. 필요할 때 다시 진행할 수 있습니다." : message);
  }
  return {
    featureKey: toText(billingInput.featureKey),
    data: gate.data as FortuneTeaBillingGateData & Record<string, unknown>,
  };
}

async function ensureFortuneTeaAuthReady() {
  const { getAuthState, refreshAuth } = await import("@/app/_lib/auth-store");
  if (getAuthState().isAuthenticated) return;
  try {
    await refreshAuth({ force: true, silent: true });
  } catch {
    // 인증 예열 실패는 삼킨다 — 최종 접근 판정은 서버(getCurrentUser)가 한다.
  }
}

async function beginFortuneTeaAccessGate(mode: FortuneTeaHouseConsultMode, attemptId: string) {
  const { beginPaidFeatureGateCheck } = await import("@/app/_lib/billing-client") as {
    beginPaidFeatureGateCheck: BeginPaidFeatureGateCheck;
  };
  beginPaidFeatureGateCheck({
    featureKey: FORTUNE_TEA_FEATURE_KEY_BY_MODE[mode],
    requestId: attemptId,
    title: "이용권 확인",
    reason: "운명 찻집 상담",
    paymentMode: "MEMBERSHIP_PASS",
  });
}

async function completeFortuneTeaAccessGate(mode: FortuneTeaHouseConsultMode, attemptId: string) {
  const { completePaidFeatureGateCheck } = await import("@/app/_lib/billing-client") as {
    completePaidFeatureGateCheck: CompletePaidFeatureGateCheck;
  };
  completePaidFeatureGateCheck({
    featureKey: FORTUNE_TEA_FEATURE_KEY_BY_MODE[mode],
    requestId: attemptId,
    title: "이용권 확인 완료",
    reason: "운명 찻집 상담",
    paymentMode: "MEMBERSHIP_PASS",
    message: "이용권 확인이 끝났어요. 찻잔의 말을 정리하고 있어요.",
  });
}

async function failFortuneTeaAccessGate(mode: FortuneTeaHouseConsultMode, attemptId: string, message?: string) {
  const { failPaidFeatureGateCheck } = await import("@/app/_lib/billing-client") as {
    failPaidFeatureGateCheck: FailPaidFeatureGateCheck;
  };
  const cancelled = /PAYMENT_CANCELLED|취소/.test(message || "");
  failPaidFeatureGateCheck({
    featureKey: FORTUNE_TEA_FEATURE_KEY_BY_MODE[mode],
    requestId: attemptId,
    title: "이용권 확인 실패",
    reason: "운명 찻집 상담",
    paymentMode: "MEMBERSHIP_PASS",
    cancelled,
    message: message || "이용권 확인이 잠시 멈췄어요. 다시 한 번만 시도해 주세요.",
  });
}

const FORTUNE_TEA_PROGRESS_STEPS: FortuneTeaProgressStep[] = [
  { percent: 5, label: "요청 접수", message: "찻잔 위에 질문을 올리고 있어요." },
  { percent: 10, label: "권한과 입력 확인", message: "상담을 열 수 있는 상태인지 조용히 확인하고 있어요." },
  { percent: 20, label: "프로필 확인", message: "태어난 흐름과 질문의 결을 맞추고 있어요." },
  { percent: 35, label: "명식 계산", message: "명식의 기본 구조를 세우는 중이에요." },
  { percent: 50, label: "상담 준비", message: "오행과 십성의 균형을 살피는 중이에요." },
  { percent: 70, label: "상담문 생성", message: "대운과 현재 흐름을 질문에 연결하고 있어요." },
  { percent: 85, label: "결과 정리", message: "상담 문장을 차분히 고르고 있어요." },
  { percent: 95, label: "결과 저장 대기", message: "곧 결과지를 열어드릴게요." },
];

function progressMessageForMode(step: FortuneTeaProgressStep, mode: FortuneTeaHouseConsultMode): string {
  if (mode === "saju") return step.message;
  if (mode === "sukuyo" && step.percent >= 35) {
    if (step.percent < 50) return "두 사람의 달빛 자리를 맞추고 있어요.";
    if (step.percent < 70) return "27숙의 거리와 관계 온도를 살피는 중이에요.";
    if (step.percent < 85) return "인연의 흐름을 상담 문장으로 엮고 있어요.";
  }
  if (mode === "tarot" && step.percent >= 35) {
    if (step.percent < 50) return "선택된 카드의 상징을 잔 위에 띄우고 있어요.";
    if (step.percent < 70) return "카드의 장면과 질문의 온도를 맞추고 있어요.";
    if (step.percent < 85) return "연이가 타로의 말을 조심스럽게 고르고 있어요.";
  }
  return step.message;
}

type BrowserIdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function getFortuneTeaBgmTrack(stage: TeaHouseStage) {
  if (stage === "scentLoading") return FORTUNE_TEA_BGM_TRACKS.moonlightTea;
  if (stage === "tarotReveal" || stage === "result") return FORTUNE_TEA_BGM_TRACKS.kindness;
  if (stage === "yeoniReveal" || stage === "teaIntro" || stage === "teaSelect" || stage === "teaCupRitual" || stage === "questionInput") {
    return FORTUNE_TEA_BGM_TRACKS.gentleOrientalGirl;
  }
  return FORTUNE_TEA_BGM_TRACKS.moonlitTeaHouse;
}

function logSubmitStep(message: string, payload?: unknown) {
  if (process.env.NODE_ENV !== "production") {
    if (typeof payload === "undefined") console.info(`[FortuneTeaHouse Submit] ${message}`);
    else console.info(`[FortuneTeaHouse Submit] ${message}`, payload);
  }
}

function SceneLoadingPanel() {
  return (
    <section className={styles.consultErrorScene} aria-live="polite" aria-busy="true">
      <div className={styles.consultErrorCard}>
        <p className={styles.sceneEyebrow}>달빛 찻잔을 데우는 중이에요</p>
        <h2>장면을 조용히 열고 있어요</h2>
        <p>잠시만 기다리면 바로 이어서 볼 수 있어요.</p>
      </div>
    </section>
  );
}

function TarotAlbumLoadingDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[70] grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,#2A174A_0%,#0B1020_42%,#050611_100%)] px-5 text-[#F8F1DC]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tarotAlbumLoadingTitle"
    >
      <button
        type="button"
        className="fixed right-4 top-4 z-[75] grid h-11 w-11 place-items-center rounded-full border border-amber-200/25 bg-white/[0.07] text-amber-50 shadow-[0_16px_40px_rgba(0,0,0,.35)]"
        onClick={onClose}
        aria-label="달빛 타로 앨범 닫기"
      >
        <span aria-hidden>×</span>
      </button>
      <section className="w-full max-w-sm rounded-[28px] border border-amber-100/15 bg-white/[0.07] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,.42)]">
        <span className="mx-auto mb-4 block h-11 w-11 rounded-full bg-[radial-gradient(circle_at_36%_34%,#fff8d8_0_18%,#efd489_42%,rgba(239,212,137,.12)_70%)] shadow-[0_0_24px_rgba(239,212,137,.24)]" aria-hidden />
        <h2 id="tarotAlbumLoadingTitle" className="text-base font-black">
          달빛 타로 앨범을 여는 중이에요.
        </h2>
        <p className="mt-2 text-sm leading-6 text-amber-50/70">
          카드첩이 열리면 바로 이어서 볼 수 있어요.
        </p>
      </section>
    </div>
  );
}

export default function FortuneTeaHousePage() {
  const [stage, setStage] = useState<TeaHouseStage>("landing");
  const [notice, setNotice] = useState("");
  const [isEnteringTeaHouse, setIsEnteringTeaHouse] = useState(false);
  const [hasSeenEntryPrologue, setHasSeenEntryPrologue] = useState(false);
  const [isEntryPrologueSkipped, setIsEntryPrologueSkipped] = useState(false);
  const [bgmEnabled, setBgmEnabled] = useState(true);
  const [isBgmPreferenceReady, setIsBgmPreferenceReady] = useState(false);
  const [bgmStatus, setBgmStatus] = useState<"idle" | "playing" | "blocked" | "off">("idle");
  const [selectedCup, setSelectedCup] = useState<TeaHouseCup | null>(null);
  const [questionInput, setQuestionInput] = useState<Partial<FortuneTeaHouseQuestionInput>>({});
  const [consultResult, setConsultResult] = useState<FortuneTeaHouseConsultResponse | null>(null);
  const [honeyDrops, setHoneyDrops] = useState<FortuneTeaHouseHoneyDropsState | null>(null);
  const [isTarotAlbumOpen, setIsTarotAlbumOpen] = useState(false);
  const [honeyRewardBurstKey, setHoneyRewardBurstKey] = useState(0);
  const [honeyRewardMessage, setHoneyRewardMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [loadingBgmIndex, setLoadingBgmIndex] = useState(0);
  const [generationProgress, setGenerationProgress] = useState<FortuneTeaGenerationProgress>({
    percent: 5,
    label: "요청 접수",
    message: "찻잔 위에 질문을 올리고 있어요.",
    status: "running",
  });
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const enterTimerRef = useRef<number | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const progressStartedAtRef = useRef(0);
  const consultRunRef = useRef(0);
  const submitLockRef = useRef(false);
  const loadingBgmIndexRef = useRef(0);
  const currentBgmTrack = stage === "scentLoading" ? FORTUNE_TEA_LOADING_PLAYLIST[loadingBgmIndex] : getFortuneTeaBgmTrack(stage);
  const reduceMotion = useReducedMotion();

  const clearGenerationProgressTimer = useCallback(() => {
    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const startGenerationProgress = useCallback((mode: FortuneTeaHouseConsultMode) => {
    clearGenerationProgressTimer();
    progressStartedAtRef.current = Date.now();
    let stepIndex = 0;
    const firstStep = FORTUNE_TEA_PROGRESS_STEPS[0];
    setGenerationProgress({
      percent: firstStep.percent,
      label: firstStep.label,
      message: progressMessageForMode(firstStep, mode),
      status: "running",
    });
    progressTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - progressStartedAtRef.current;
      stepIndex = Math.min(FORTUNE_TEA_PROGRESS_STEPS.length - 1, stepIndex + 1);
      const step = FORTUNE_TEA_PROGRESS_STEPS[stepIndex];
      setGenerationProgress((current) => {
        const softPercent = elapsed > 12000
          ? Math.min(95, Math.max(current.percent, current.percent + 1))
          : step.percent;
        return {
          percent: Math.min(95, Math.max(current.percent, softPercent)),
          label: step.percent > current.percent ? step.label : current.label,
          message: step.percent > current.percent ? progressMessageForMode(step, mode) : current.message,
          delayed: elapsed > 18000,
          status: "running",
        };
      });
      if (stepIndex >= FORTUNE_TEA_PROGRESS_STEPS.length - 1 && elapsed > 12000) {
        stepIndex = FORTUNE_TEA_PROGRESS_STEPS.length - 2;
      }
    }, 1450);
  }, [clearGenerationProgressTimer]);

  const markGenerationComplete = useCallback(() => {
    clearGenerationProgressTimer();
    setGenerationProgress({
      percent: 100,
      label: "완료",
      message: "상담 결과가 완성되었습니다. 결과지를 열어드릴게요.",
      status: "complete",
    });
  }, [clearGenerationProgressTimer]);

  const markGenerationError = useCallback(() => {
    clearGenerationProgressTimer();
    setGenerationProgress((current) => ({
      ...current,
      status: "error",
      message: "상담문을 엮는 중 흐름이 끊겼어요. 다시 시도할 수 있게 준비해둘게요.",
    }));
  }, [clearGenerationProgressTimer]);

  useEffect(() => {
    const audio = bgmAudioRef.current;
    if (audio) audio.volume = FORTUNE_TEA_BGM_TRACKS.moonlitTeaHouse.volume;

    try {
      const savedPreference = window.localStorage.getItem(FORTUNE_TEA_BGM_STORAGE_KEY);
      if (savedPreference === "off") setBgmEnabled(false);
    } catch {
      void 0;
    }
    try {
      const savedEntryPrologueSeen = window.localStorage.getItem(FORTUNE_TEA_ENTRY_PROLOGUE_SEEN_STORAGE_KEY);
      if (savedEntryPrologueSeen === "seen") setHasSeenEntryPrologue(true);
    } catch {
      void 0;
    }
    setIsBgmPreferenceReady(true);

    return () => {
      if (audio) audio.pause();
      if (enterTimerRef.current) window.clearTimeout(enterTimerRef.current);
      clearGenerationProgressTimer();
    };
  }, [clearGenerationProgressTimer]);

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();

    const syncServerHoneyDrops = () => {
      fetch("/api/fortune-tea-house/honey-drops/balance", {
        cache: "no-store",
        signal: abortController.signal,
      })
        .then(async (response) => {
          if (!response.ok) return null;
          const payload = (await response.json().catch(() => null)) as { ok?: boolean; honeyDrops?: FortuneTeaHouseHoneyDropsState } | null;
          return payload?.ok ? normalizeHoneyDropsState(payload.honeyDrops) : null;
        })
        .then((serverHoneyDrops) => {
          if (!cancelled && serverHoneyDrops) setHoneyDrops(serverHoneyDrops);
        })
        .catch(() => {
          void 0;
        });
    };

    const idleWindow = window as BrowserIdleWindow;
    const idleCallbackId = idleWindow.requestIdleCallback?.(syncServerHoneyDrops, { timeout: 2500 }) ?? null;
    const fallbackTimerId = idleCallbackId === null ? window.setTimeout(syncServerHoneyDrops, 1200) : null;

    return () => {
      cancelled = true;
      abortController.abort();
      if (idleCallbackId !== null) idleWindow.cancelIdleCallback?.(idleCallbackId);
      if (fallbackTimerId !== null) window.clearTimeout(fallbackTimerId);
    };
  }, []);

  useEffect(() => {
    setNotice("");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [stage]);

  const playBgm = useCallback(async (forceEnabled = false, trackOverride?: FortuneTeaBgmTrack) => {
    const audio = bgmAudioRef.current;
    if (!audio || (!forceEnabled && !bgmEnabled) || !isBgmPreferenceReady) return;
    const nextTrack = trackOverride ?? currentBgmTrack;
    try {
      audio.volume = nextTrack.volume;
      if (audio.src !== nextTrack.url) {
        audio.src = nextTrack.url;
        audio.load();
      }
      await audio.play();
      setBgmStatus("playing");
    } catch {
      setBgmStatus("blocked");
    }
  }, [bgmEnabled, currentBgmTrack, isBgmPreferenceReady]);

  useEffect(() => {
    loadingBgmIndexRef.current = 0;
    setLoadingBgmIndex(0);
  }, [stage]);

  useEffect(() => {
    const audio = bgmAudioRef.current;
    if (!audio) return;

    const playNextLoadingTrack = () => {
      if (stage !== "scentLoading" || !bgmEnabled) return;
      const nextIndex = (loadingBgmIndexRef.current + 1) % FORTUNE_TEA_LOADING_PLAYLIST.length;
      const nextTrack = FORTUNE_TEA_LOADING_PLAYLIST[nextIndex];
      loadingBgmIndexRef.current = nextIndex;
      setLoadingBgmIndex(nextIndex);
      void playBgm(false, nextTrack);
    };

    audio.addEventListener("ended", playNextLoadingTrack);
    return () => {
      audio.removeEventListener("ended", playNextLoadingTrack);
    };
  }, [bgmEnabled, playBgm, stage]);

  useEffect(() => {
    const audio = bgmAudioRef.current;
    if (!audio || !isBgmPreferenceReady) return;
    if (!bgmEnabled) {
      audio.pause();
      setBgmStatus("off");
      return;
    }
    if (!audio.paused) {
      void playBgm();
      return;
    }
    setBgmStatus("idle");
  }, [bgmEnabled, currentBgmTrack.key, isBgmPreferenceReady, playBgm]);

  function goToStage(nextStage: TeaHouseStage) {
    if (nextStage === "doorOpened") {
      setIsEntryPrologueSkipped(false);
    } else if (nextStage === "teaIntro" && isTeaHouseEntryStage(stage) && stage !== "yeoniReveal") {
      setIsEntryPrologueSkipped(true);
    }
    setStage(nextStage);
  }

  function toggleBgm() {
    const nextEnabled = !bgmEnabled;
    setBgmEnabled(nextEnabled);
    try {
      window.localStorage.setItem(FORTUNE_TEA_BGM_STORAGE_KEY, nextEnabled ? "on" : "off");
    } catch {
      void 0;
    }
    if (nextEnabled) {
      void playBgm(true);
    }
  }

  function enterTeaHouse() {
    if (isEnteringTeaHouse) return;
    void playBgm();
    setIsEntryPrologueSkipped(false);
    if (hasSeenEntryPrologue) {
      goToStage("teaSelect");
      return;
    }
    setIsEnteringTeaHouse(true);
    enterTimerRef.current = window.setTimeout(() => {
      setIsEnteringTeaHouse(false);
      goToStage("doorOpened");
    }, 1280);
  }

  function replayEntryPrologue() {
    if (isEnteringTeaHouse) return;
    void playBgm();
    setIsEntryPrologueSkipped(false);
    setIsEnteringTeaHouse(true);
    enterTimerRef.current = window.setTimeout(() => {
      setIsEnteringTeaHouse(false);
      goToStage("doorOpened");
    }, 1280);
  }

  function completeEntryPrologue() {
    if (!isEntryPrologueSkipped) {
      setHasSeenEntryPrologue(true);
      try {
        window.localStorage.setItem(FORTUNE_TEA_ENTRY_PROLOGUE_SEEN_STORAGE_KEY, "seen");
      } catch {
        void 0;
      }
    }
    setIsEntryPrologueSkipped(false);
    goToStage("teaSelect");
  }

  function restartConsultation() {
    consultRunRef.current += 1;
    submitLockRef.current = false;
    clearGenerationProgressTimer();
    setIsSubmitting(false);
    setSubmitError("");
    setQuestionInput({});
    setConsultResult(null);
    setStage("teaSelect");
  }

  function returnToLanding() {
    consultRunRef.current += 1;
    submitLockRef.current = false;
    clearGenerationProgressTimer();
    if (enterTimerRef.current) {
      window.clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    setIsEnteringTeaHouse(false);
    setSelectedCup(null);
    setQuestionInput({});
    setConsultResult(null);
    setIsSubmitting(false);
    setSubmitError("");
    setStage("landing");
  }

  function showReadyNotice(message: string = teaHouseCtaCopy.notice) {
    setNotice(message);
  }

  function selectTeaCup(cup: TeaHouseCup) {
    clearGenerationProgressTimer();
    setSelectedCup(cup);
    setConsultResult(null);
    setSubmitError("");
    goToStage("teaCupRitual");
  }

  function canUseLocalConsultPreview() {
    if (typeof window === "undefined") return false;
    return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "::1";
  }

  async function submitQuestion(nextQuestionInput: FortuneTeaHouseQuestionInput) {
    if (isSubmitting || submitLockRef.current) return;
    logSubmitStep("start");
    logSubmitStep("selectedCup", selectedCup);
    logSubmitStep("input", nextQuestionInput);

    if (!selectedCup) {
      goToStage("teaSelect");
      return;
    }

    submitLockRef.current = true;
    setIsSubmitting(true);
    setSubmitError("");
    setQuestionInput(nextQuestionInput);
    setConsultResult(null);
    startGenerationProgress(nextQuestionInput.consultationMode);
    const consultRunId = consultRunRef.current + 1;
    consultRunRef.current = consultRunId;
    const useLocalPreview = canUseLocalConsultPreview();
    let localPreviewResult: FortuneTeaHouseConsultResponse | null = null;
    let localPreviewResultId = "";
    let accessGateStarted = false;

    try {
      const startedAt = Date.now();
      const localDraft = buildFortuneTeaHouseConsultResult({
        consultationMode: nextQuestionInput.consultationMode,
        selectedTeaCupId: selectedCup.id,
        selectedTeaCupName: selectedCup.name,
        selectedTeaCupTopic: selectedCup.topic,
        nickname: nextQuestionInput.nickname,
        concernTopic: nextQuestionInput.concernTopic,
        birthInfo: nextQuestionInput.birthInfo,
        profileId: nextQuestionInput.profileId,
        birthDate: nextQuestionInput.birthDate,
        birthTime: nextQuestionInput.birthTime,
        birthTimeUnknown: nextQuestionInput.birthTimeUnknown,
        birthPlace: nextQuestionInput.birthPlace,
        timezone: nextQuestionInput.timezone,
        gender: nextQuestionInput.gender,
        calendarType: nextQuestionInput.calendarType,
        tarotSpread: nextQuestionInput.tarotSpread,
        sukuyo: nextQuestionInput.sukuyo,
        question: nextQuestionInput.question,
      });
      localPreviewResult = localDraft;
      const requestPayload: FortuneTeaHouseConsultRequest = {
        consultationMode: nextQuestionInput.consultationMode,
        selectedTeaCupId: selectedCup.id,
        selectedTeaCupName: selectedCup.name,
        selectedTeaCupTopic: selectedCup.topic,
        nickname: nextQuestionInput.nickname,
        concernTopic: nextQuestionInput.concernTopic,
        birthInfo: nextQuestionInput.birthInfo,
        profileId: nextQuestionInput.profileId,
        birthDate: nextQuestionInput.birthDate,
        birthTime: nextQuestionInput.birthTime,
        birthTimeUnknown: nextQuestionInput.birthTimeUnknown,
        birthPlace: nextQuestionInput.birthPlace,
        timezone: nextQuestionInput.timezone,
        gender: nextQuestionInput.gender,
        calendarType: nextQuestionInput.calendarType,
        tarotSpread: nextQuestionInput.tarotSpread,
        sukuyo: nextQuestionInput.sukuyo,
        question: nextQuestionInput.question,
      };
      const attemptId = createFortuneTeaAttemptId(requestPayload);
      localPreviewResultId = attemptId;
      await beginFortuneTeaAccessGate(nextQuestionInput.consultationMode, attemptId);
      accessGateStarted = true;
      // Phase-1 이전에 인증을 예열해 이용권 보유자가 첫 제출에서 서버 게이트를 원샷 통과하도록 한다.
      await ensureFortuneTeaAuthReady();
      const requestPayloadWithAttempt: FortuneTeaConsultPostBody = {
        ...requestPayload,
        attemptId,
        requestId: attemptId,
        idempotencyKey: attemptId,
      };
      logSubmitStep("api result start");
      const abortController = new AbortController();
      const localPreviewTimeoutId = useLocalPreview ? window.setTimeout(() => abortController.abort(), 8500) : null;
      let { response, payload } = await postFortuneTeaConsultRequest({
        ...requestPayloadWithAttempt,
        draftResult: localDraft,
      }, abortController.signal).finally(() => {
        if (localPreviewTimeoutId !== null) window.clearTimeout(localPreviewTimeoutId);
      });
      if (isFortuneTeaGenerationPending(response, payload)) {
        throw buildFortuneTeaGenerationPendingError(payload.message);
      }
      if ((!response.ok || !payload.ok || !payload.result) && payload.paymentRequired) {
        setGenerationProgress((current) => ({
          ...current,
          percent: Math.max(current.percent, 24),
          label: "가격 확인",
          message: "상담 가격과 결제 권한을 확인하고 있어요.",
        }));
        const billing = await runFortuneTeaBillingGate(payload, nextQuestionInput.consultationMode, attemptId);
        if (consultRunRef.current !== consultRunId) return;
        const billingGate = asRecord(billing.data);
        const accessGrant = asRecord(billingGate.accessGrant);
        const consume = asRecord(billingGate.consume);
        logSubmitStep("billing gate success", { featureKey: billing.featureKey });
        setGenerationProgress((current) => ({
          ...current,
          percent: Math.max(current.percent, 42),
          label: "결제 확인 중",
          message: "결제와 이용권이 열린 것을 확인하고 있어요.",
        }));
        const phase2Body: FortuneTeaConsultPostBody = {
          ...requestPayloadWithAttempt,
          draftResult: localDraft,
          featureKey: billing.featureKey,
          billingGate,
          accessGrant,
          consume,
          _paymentContext: {
            featureKey: billing.featureKey,
            requestId: attemptId,
            idempotencyKey: attemptId,
            billingGate,
            accessGrant,
            consume,
          },
        };
        ({ response, payload } = await postFortuneTeaConsultRequest(phase2Body));
        // 결제 증빙은 방금 기록됐지만 DB 전파 지연으로 서버가 아직 못 찾아 402를 줄 수 있다.
        // 같은 증빙으로 한 번만 짧게 백오프 후 재조회해 코인 결제자의 "결제했는데 또 결제창"을 없앤다.
        if (
          (!response.ok || !payload.ok || !payload.result)
          && payload.paymentRequired
          && !isFortuneTeaGenerationPending(response, payload)
        ) {
          await new Promise((resolve) => window.setTimeout(resolve, 500));
          if (consultRunRef.current !== consultRunId) return;
          ({ response, payload } = await postFortuneTeaConsultRequest(phase2Body));
        }
      }
      if (isFortuneTeaGenerationPending(response, payload)) {
        throw buildFortuneTeaGenerationPendingError(payload.message);
      }
      if (!response.ok || !payload.ok || !payload.result) {
        const submitError = new Error(payload.message || "연이가 상담문을 엮는 중 잠시 멈췄어요. 다시 한 번만 건네주세요.");
        if (payload.paymentRequired) {
          (submitError as Error & { paymentRequired?: boolean }).paymentRequired = true;
        }
        throw submitError;
      }
      logSubmitStep("api result success", payload.generationMeta);
      if (consultRunRef.current !== consultRunId) return;
      if (accessGateStarted) await completeFortuneTeaAccessGate(nextQuestionInput.consultationMode, attemptId);
      markGenerationComplete();

      const remainingDelay = Math.max(0, 1300 - (Date.now() - startedAt));
      if (remainingDelay > 0) {
        await new Promise((resolve) => window.setTimeout(resolve, remainingDelay));
      }

      if (consultRunRef.current !== consultRunId) return;
      const resultId = payload.result.resultId || attemptId;
      const serverHoneyDrops = normalizeHoneyDropsState(payload.honeyDrops);
      const nextResult = { ...payload.result, resultId, consultationMode: nextQuestionInput.consultationMode };
      if (serverHoneyDrops) setHoneyDrops(serverHoneyDrops);
      if (serverHoneyDrops?.earnedThisResult) {
        setHoneyRewardMessage(pickHoneyDropMessage(serverHoneyDrops));
        setHoneyRewardBurstKey((key) => key + 1);
      }
      setConsultResult(nextResult);
      if (payload.generationMeta?.mode === "local_fallback") {
        setNotice(
          nextQuestionInput.consultationMode === "saju"
            ? "연이가 사주의 드러난 흐름을 먼저 짚어 상담을 이어갔어요."
            : nextQuestionInput.consultationMode === "sukuyo"
              ? "연이가 27숙 인연의 흐름을 먼저 짚어 상담을 이어갔어요."
              : "연이가 타로의 향을 먼저 엮어 상담을 이어갔어요.",
        );
      }
      if (nextQuestionInput.consultationMode === "saju" || nextQuestionInput.consultationMode === "sukuyo") {
        logSubmitStep("go result");
        goToStage("result");
        return;
      }
      logSubmitStep("go tarotReveal");
      goToStage("tarotReveal");
    } catch (error) {
      if (consultRunRef.current !== consultRunId) return;
      logSubmitStep("error", error);
      const generationPending = error instanceof Error && (error as Error & { generationPending?: boolean }).generationPending;
      const blocksLocalPreview = error instanceof Error && (
        (error as Error & { paymentRequired?: boolean }).paymentRequired
        || generationPending
      );
      if (localPreviewResult && useLocalPreview && !blocksLocalPreview) {
        if (accessGateStarted) await completeFortuneTeaAccessGate(nextQuestionInput.consultationMode, localPreviewResultId);
        markGenerationComplete();
        const nextResult = {
          ...localPreviewResult,
          resultId: localPreviewResult.resultId || localPreviewResultId,
          consultationMode: nextQuestionInput.consultationMode,
        };
        setConsultResult(nextResult);
        setNotice("로컬 UI 확인 모드로 상담 결과 초안을 열었어요. API 응답은 나중에 다시 확인해 주세요.");
        if (nextQuestionInput.consultationMode === "saju" || nextQuestionInput.consultationMode === "sukuyo") {
          goToStage("result");
          return;
        }
        goToStage("tarotReveal");
        return;
      }
      if (accessGateStarted) {
        if (generationPending) {
          await completeFortuneTeaAccessGate(nextQuestionInput.consultationMode, localPreviewResultId);
        } else {
          await failFortuneTeaAccessGate(
            nextQuestionInput.consultationMode,
            localPreviewResultId,
            error instanceof Error && error.message ? error.message : undefined,
          );
        }
      }
      markGenerationError();
      setSubmitError(error instanceof Error && error.message ? error.message : "찻잔의 향이 잠시 흐려졌어요. 다시 한 번만 건네주세요.");
      goToStage("questionInput");
    } finally {
      if (consultRunRef.current === consultRunId) {
        setIsSubmitting(false);
        submitLockRef.current = false;
      }
    }
  }

  function renderRecoveryCard(message: string) {
    return (
      <section className={styles.consultErrorScene} aria-labelledby="fortuneTeaRecoveryTitle">
        <div className={styles.consultErrorCard}>
          <p className={styles.sceneEyebrow}>달빛이 잠시 흐려졌어요</p>
          <h2 id="fortuneTeaRecoveryTitle">빈 화면 대신 찻잔을 다시 데울게요</h2>
          <p>{message}</p>
          <div className={styles.storyActions}>
            <TeaHouseButton variant="ghost" onClick={() => goToStage("teaSelect")}>
              찻잔 다시 고르기
            </TeaHouseButton>
          </div>
        </div>
      </section>
    );
  }

  function renderScene() {
    if (stage === "landing") {
      return (
        <FortuneTeaHouseLanding
          hasSeenPrologue={hasSeenEntryPrologue}
          onEnter={enterTeaHouse}
          onReplayPrologue={replayEntryPrologue}
          onShowHistory={() => showReadyNotice("상담 기록은 아직 준비 중이에요.")}
        />
      );
    }

    if (isTeaHouseEntryStage(stage)) {
      return <TeaHouseEntryScene stage={stage} onStageChange={goToStage} onComplete={completeEntryPrologue} />;
    }

    if (stage === "teaSelect") {
      return <TeaCupSelectionScene selectedCupId={selectedCup?.id} onSelect={selectTeaCup} />;
    }

    if (stage === "teaCupRitual" && selectedCup) {
      return <TeaCupRitualScene selectedCup={selectedCup} onBack={() => goToStage("teaSelect")} onConfirm={() => goToStage("questionInput")} />;
    }

    if (stage === "questionInput" && selectedCup) {
      return (
        <QuestionInputScene
          selectedCup={selectedCup}
          initialInput={questionInput}
          onBack={() => goToStage("teaSelect")}
          onSubmit={submitQuestion}
          isSubmitting={isSubmitting}
          submitError={submitError}
        />
      );
    }

    if (stage === "scentLoading") {
      return <ScentLoadingScene selectedCup={selectedCup} consultationMode={questionInput.consultationMode} progress={generationProgress} />;
    }

    if (stage === "tarotReveal" && consultResult) {
      return <TarotRevealScene result={consultResult} onComplete={() => goToStage("result")} />;
    }

    if (stage === "tarotReveal") {
      return renderRecoveryCard("카드가 떠오르기 전에 상담 결과가 사라졌어요. 찻잔을 다시 골라 이어갈게요.");
    }

    if (stage === "result" && consultResult) {
      return (
        <TeaHouseResultSheet
          result={consultResult}
          honeyDrops={honeyDrops}
          onRestart={restartConsultation}
          onShowTarot={() => goToStage("tarotReveal")}
          onEditBirthInfo={() => goToStage("questionInput")}
          onHoneyDropsChange={setHoneyDrops}
          onResultUpdate={setConsultResult}
        />
      );
    }

    if (stage === "result") {
      return renderRecoveryCard("결과 시트가 열리기 전에 상담 기록이 흐려졌어요. 다시 한 번 차를 데워볼게요.");
    }

    return <TeaCupSelectionScene selectedCupId={selectedCup?.id} onSelect={selectTeaCup} />;
  }

  return (
    <FortuneTeaHouseImmersiveShell stage={stage} notice={notice} onBackToLanding={returnToLanding}>
      <audio
        ref={bgmAudioRef}
        className={styles.bgmAudio}
        data-track={currentBgmTrack.key}
        loop={stage !== "scentLoading"}
        preload="none"
      />
      <button
        className={styles.bgmToggle}
        type="button"
        data-active={bgmEnabled && bgmStatus === "playing" ? "true" : "false"}
        aria-label={bgmEnabled ? "운명의 찻집 배경 음악 끄기" : "운명의 찻집 배경 음악 켜기"}
        aria-pressed={bgmEnabled}
        onClick={toggleBgm}
      >
        <span aria-hidden>{bgmEnabled && bgmStatus === "playing" ? "♪" : "月"}</span>
        <strong>BGM</strong>
        <em>{bgmEnabled ? (bgmStatus === "playing" ? "ON" : "READY") : "OFF"}</em>
      </button>

      {stage === "landing" ? (
        <HoneyDropRewardOverlay
          honeyDrops={honeyDrops}
          burstKey={honeyRewardBurstKey}
          message={honeyRewardMessage}
          onOpenTarotAlbum={() => setIsTarotAlbumOpen(true)}
        />
      ) : null}

      {isTarotAlbumOpen ? (
        <Suspense fallback={<TarotAlbumLoadingDialog onClose={() => setIsTarotAlbumOpen(false)} />}>
          <DestinyCafeTarotAlbum
            isOpen={isTarotAlbumOpen}
            honeyDrops={honeyDrops}
            onClose={() => setIsTarotAlbumOpen(false)}
            onHoneyDropsChange={setHoneyDrops}
          />
        </Suspense>
      ) : null}

      {isEnteringTeaHouse ? (
        <div className={styles.entryTransition} data-active="true" aria-hidden>
          <AssetImage
            className={`${styles.entryTransitionImage} ${styles.entryTransitionImageDesktop}`}
            imageClassName={styles.entryTransitionImageAsset}
            src={fortuneTeaHouseAssets.backgrounds.loadingDesktop}
            alt=""
            priority
          />
          <AssetImage
            className={`${styles.entryTransitionImage} ${styles.entryTransitionImageMobile}`}
            imageClassName={styles.entryTransitionImageAsset}
            src={fortuneTeaHouseAssets.backgrounds.loadingMobile}
            alt=""
            priority
          />
          <span className={styles.entryTransitionRing} />
          <div className={styles.entryLoadingPanel}>
            <strong>LOADING...</strong>
            <p className={styles.entryLoadingPanelMessage}>달빛이 찻집의 문을 조용히 열고 있어요.</p>
            <p>달빛 찻집의 문이 열립니다</p>
            <i />
          </div>
        </div>
      ) : null}

      <div className={styles.sceneFrame} aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={stage}
            className={styles.sceneStage}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.992 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.996 }}
            transition={{ duration: reduceMotion ? 0.16 : 0.36, ease: [0.22, 1, 0.36, 1] }}
          >
            <Suspense fallback={<SceneLoadingPanel />}>
              {renderScene()}
            </Suspense>
          </m.div>
        </AnimatePresence>
      </div>
      {process.env.NODE_ENV !== "production" ? (
        <Suspense fallback={null}>
          <FortuneTeaHouseDebugPanel
            stage={stage}
            selectedCup={selectedCup}
            questionInput={questionInput}
            consultResult={consultResult}
            lastError={submitError}
            isSubmitting={isSubmitting}
          />
        </Suspense>
      ) : null}
    </FortuneTeaHouseImmersiveShell>
  );
}
