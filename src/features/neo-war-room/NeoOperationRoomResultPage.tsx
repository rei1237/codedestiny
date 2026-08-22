"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Download, Loader2, Lock } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { authFetch } from "@/app/_lib/auth-client";
import { toDisplayText } from "@/lib/llm-text";
import { buildResizedAssetUrl } from "@/lib/r2-public-url";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import LlmParagraphs from "@/components/fortune/LlmParagraphs";
import PagedResultViewer, { usePagedViewerMode, type ResultViewerPage } from "@/components/fortune/PagedResultViewer";
import { neoInitialBreaks, neoRefinedBreaks, withCharacterBreaks } from "@/components/fortune/result-character-breaks";
import { useSpritePlaybackGate } from "@/src/hooks/useSpritePlaybackGate";
import NeoFactPunch from "./components/NeoFactPunch";
import NeoWarRoomAssetImage from "./components/NeoWarRoomAssetImage";
import { type NeoWarRoomConsultMode, neoWarRoomAssets } from "./data/assets";
import { getLocalizedNeoWarRoomMethodDefinition, getLocalizedNeoWarRoomMethodRegistry } from "./data/method-registry";
import { getNeoRealityCheckLabel, getNeoFormCopy, getNeoTopicLabel } from "./data/form-copy";
import {
  buildNeoSincereLetterParagraphs,
  getNeoResultAdjustWithTiming,
  getNeoResultBadgeVaultAriaLabel,
  getNeoResultBadgeVaultRemainingMsg,
  getNeoResultCopy,
  getNeoResultGeneratingBody,
  getNeoResultLetterLockBody,
  getNeoResultTocPageFallback,
  getNeoResultVerdictWithStatus,
} from "./data/result-copy";
import styles from "./neo-operation-room-result.module.css";

type NeoBriefing = {
  selectedMethod?: NeoWarRoomConsultMode;
  operationTitle?: string;
  neoOpening?: string;
  frontlineSummary?: string;
  coreDiagnosis?: string;
  repeatedChoice?: { title?: string; description?: string };
  repeatedPattern?: { title?: string; description?: string };
  innateNature?: { title?: string; description?: string; keyTraits?: string[] };
  innateStrength?: { title?: string; description?: string; strongPoints?: string[]; weakPoints?: string[] };
  topicStyle?: { title?: string; description?: string; keyPoints?: string[] };
  topicAreas?: Array<{ area?: string; reading?: string }>;
  topicTiming?: { title?: string; description?: string; windows?: string[] };
  originalStrategy?: { title?: string; description?: string; keyRules?: string[] };
  misalignedFlow?: { title?: string; description?: string };
  currentProblem?: { title?: string; description?: string };
  methodEvidence?: Array<{ method?: string; label?: string; summary?: string }>;
  bluntTruth?: string;
  forbiddenAction?: { title?: string; reason?: string };
  actionOrders?: string[];
  sevenDayMission?: Array<{ day?: number; mission?: string }>;
  realityCheckQuestions?: Array<{ question?: string; whyItMatters?: string }>;
  badge?: { name?: string; description?: string };
  tsundereClosing?: string;
  nextStepPrompt?: string;
};

type NeoRefinedOrder = {
  selectedMethod?: NeoWarRoomConsultMode;
  operationTitle?: string;
  neoReview?: string;
  verdict?: { status?: string; statement?: string };
  verdictBasis?: string;
  actionAlternatives?: Array<{ timing?: string; action?: string; rationale?: string }>;
  peopleToMeet?: Array<{ role?: string; complementaryEnergy?: string; whereToFind?: string }>;
  thirtyDayStrategy?: string[];
  forbiddenAction?: { title?: string; reason?: string };
  thisWeekFirstStep?: string;
  badge?: { name?: string; description?: string };
  tsundereClosing?: string;
};

type NeoResultSession = {
  ok: true;
  id?: string;
  sessionId?: string;
  status?: "generating" | "completed" | "generation_failed" | string;
  selectedMethod?: NeoWarRoomConsultMode;
  topic?: string;
  intensity?: string;
  question?: string;
  initialBriefing?: NeoBriefing | null;
  refinedOrder?: NeoRefinedOrder | null;
  realityCheck?: { selectedChecks?: string[]; freeform?: string } | null;
  generationError?: { message?: string } | null;
  refinementError?: { message?: string } | null;
  badge?: NeoBadgeState | null;
  resultUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

type NeoResultPreviewMode = "" | "loading" | "briefing" | "reality" | "refined";
// 사자 휘장 서버 상태(계정 귀속 지갑). 미인증 응답은 authenticated:false로 오므로
// 프론트 가드가 이를 검사해 정상 잔량을 0으로 덮지 않는다(꿀방울과 동일 원칙).
type NeoBadgeState = {
  balance?: number;
  totalEarned?: number;
  totalSpent?: number;
  currentBadgeIndex?: number;
  unlocked?: boolean;
  benefitsUnlocked?: boolean;
  awardedNow?: boolean;
  authenticated?: boolean;
  disabled?: boolean;
};
type NeoBadgeAwardState = {
  count: number;
  currentBadgeIndex: number;
  awardedNow: boolean;
};

const realityCheckOptions = [
  "맞다. 요즘 계속 회피하고 있다.",
  "어느 정도 맞지만 전부는 아니다.",
  "나는 오히려 너무 성급하게 움직이는 편이다.",
  "감정적으로 흔들리는 게 가장 크다.",
  "현실 문제보다 관계 문제가 더 크다.",
  "지금은 돈/직업/가족 문제가 더 중요하다.",
  "네오의 말에 반박하고 싶은 부분이 있다.",
] as const;

const NEO_RESULT_PREVIEW_MODES = new Set<NeoResultPreviewMode>(["loading", "briefing", "reality", "refined"]);
const NEO_LETTER_BADGE_COST = 5;
// 1차 브리핑 로딩과 2차 명령서 폴링이 같은 예산을 쓴다. 4s×60=240s, CF rate-limit(10s당 100회) 여유 안.
const RESULT_POLL_INTERVAL_MS = 4000;
const RESULT_POLL_MAX_ATTEMPTS = 60;
const NEO_RESULT_BADGE_COLUMNS = 4;
const NEO_RESULT_BADGE_ROWS = 3;
const NEO_RESULT_BADGE_COUNT = 10;

const localPreviewBriefing: NeoBriefing = {
  selectedMethod: "saju",
  operationTitle: "흐려진 전선을 다시 잡는 작전",
  neoOpening: "좋다. 지금 네 운은 멈춘 게 아니라, 같은 선택 앞에서 자꾸 힘을 잃고 있다.",
  frontlineSummary: "겉으로는 선택지가 많은데, 실제로는 마음이 편한 쪽으로만 도망가려는 흐름이 강하다.",
  coreDiagnosis: "겉으로는 선택지가 많은데, 실제로는 마음이 편한 쪽으로만 도망가려는 흐름이 강하다.",
  repeatedChoice: {
    title: "반복되는 선택",
    description: "중요한 순간마다 확신을 기다리다가 타이밍을 놓치고, 뒤늦게 스스로를 몰아붙이는 모습이 드러난다.",
  },
  repeatedPattern: {
    title: "반복되는 선택",
    description: "중요한 순간마다 확신을 기다리다가 타이밍을 놓치고, 뒤늦게 스스로를 몰아붙이는 모습이 드러난다.",
  },
  innateNature: {
    title: "타고난 성향의 핵",
    description: "너는 감정이 가라앉은 뒤에 판단이 서는 사람이다. 즉흥보다 기준으로 움직일 때 힘이 붙고, 기준이 흐려지면 곧바로 흔들린다.",
    keyTraits: ["기준으로 움직이는 사람", "감정 정리 후 판단이 서는 구조", "확신을 기다리다 타이밍을 놓치는 경향"],
  },
  innateStrength: {
    title: "타고난 강점과 약점",
    description: "밀어붙일 자리는 기준을 세워 오래 끌고 가는 지구력이고, 지켜야 할 자리는 확신을 기다리며 결정을 미루는 습관이다.",
    strongPoints: ["기준을 세우면 오래 끌고 가는 지구력", "감정에 휩쓸리지 않는 판단력"],
    weakPoints: ["확신을 기다리다 타이밍을 놓치는 결정 지연", "남의 반응에 기준이 흔들리는 지점"],
  },
  topicStyle: {
    title: "이 주제에서 너의 방식",
    description: "이 영역에서 너는 판을 넓게 벌이기보다, 기준이 맞는 한 자리를 오래 파고들 때 성과가 난다.",
    keyPoints: ["한 자리를 오래 파고들 때 성과", "기준이 맞는지부터 확인하는 방식"],
  },
  topicAreas: [
    { area: "중심 자리", reading: "이 주제의 축이 되는 자리가 단단해, 방향만 정하면 밀고 나갈 힘은 충분하다." },
    { area: "흐름 자리", reading: "흐름을 다루는 자리가 약해, 타이밍을 재다가 놓치는 손실이 반복된다." },
  ],
  topicTiming: {
    title: "이 주제의 시기 흐름",
    description: "지금 국면은 재는 때가 아니라 작게라도 벌려 확인하는 때다.",
    windows: ["현재: 작게 벌려 확인하는 확장 국면"],
  },
  originalStrategy: {
    title: "본래 너는 이렇게 살아야 한다",
    description: "감정이 가라앉은 뒤 판단하는 사람이다. 빠른 결정보다 기준을 먼저 세울수록 운이 안정된다.",
    keyRules: ["선택 전에 기준을 적는다", "사람의 반응보다 내 리듬을 먼저 본다", "미룬 질문을 하루 안에 하나만 처리한다"],
  },
  misalignedFlow: {
    title: "지금 흐름이 어긋난 자리",
    description: "정답을 몰라서가 아니라, 답을 고르면 잃을 것이 보이기 때문에 계속 판단을 흐리고 있다.",
  },
  currentProblem: {
    title: "지금 흐름이 어긋난 자리",
    description: "정답을 몰라서가 아니라, 답을 고르면 잃을 것이 보이기 때문에 계속 판단을 흐리고 있다.",
  },
  methodEvidence: [
    { method: "saju", label: "사주 작전 브리핑", summary: "일간의 무기는 기준을 세울 때 살아나고, 계절의 기운은 선택을 오래 붙잡기보다 행동으로 닫을 때 안정된다." },
  ],
  bluntTruth: "너는 아직 준비가 안 된 게 아니다. 준비라는 이름으로 결정을 늦추는 데 익숙해진 거다.",
  forbiddenAction: {
    title: "오늘 금지 행동",
    reason: "상대 반응을 핑계로 내 결정을 다시 무르는 것.",
  },
  actionOrders: ["선택 기준 세 가지를 적어라", "오늘 버릴 선택지 하나를 정해라", "미룬 질문 하나를 밤 전까지 처리해라"],
  sevenDayMission: [
    { day: 1, mission: "가장 미룬 질문 하나를 적어라." },
    { day: 2, mission: "선택 기준 세 가지를 정리해라." },
    { day: 3, mission: "기준에 맞지 않는 선택지를 하나 버려라." },
    { day: 4, mission: "마음이 흔들린 순간과 이유를 한 줄로 남겨라." },
    { day: 5, mission: "남의 반응을 확인하기 전에 네 기준을 먼저 읽어라." },
    { day: 6, mission: "버릴 선택지 하나를 조용히 지워라." },
    { day: 7, mission: "일주일 뒤에도 남는 기준만 작전표에 남겨라." },
  ],
  realityCheckQuestions: [
    { question: "지금 네가 미루는 선택은 정말 정보가 부족해서냐?", whyItMatters: "부족한 정보와 피하고 싶은 책임은 전혀 다르다." },
    { question: "네가 잃기 싫은 것은 사람의 평가냐, 네가 상상한 안전함이냐?", whyItMatters: "지키는 대상을 잘못 보면 작전이 계속 어긋난다." },
  ],
  badge: {
    name: "안개 절단 휘장",
    description: "흐린 마음을 핑계로 쓰지 않고, 기준을 다시 세운 사람에게 주는 휘장이다.",
  },
  tsundereClosing: "여기까지 봤으면 이제 현실을 대입해라. 인정해도 되고 반박해도 된다. 대신 흐리지 마라.",
  nextStepPrompt: "현실을 대입해라. 인정해도 되고 반박해도 된다. 대신 흐리지 마라.",
};

const localPreviewRefinedOrder: NeoRefinedOrder = {
  selectedMethod: "saju",
  operationTitle: "선택의 안개를 걷는 수정 작전",
  neoReview: "네 답변까지 보면 핵심은 더 분명하다. 문제는 운이 아니라 네가 판단을 멈추는 방식이다.",
  verdict: {
    status: "방향은 맞지만 부족하다",
    statement: "방향은 맞다. 다만 결정을 확신이 올 때까지 미루는 습관이 그 방향을 자꾸 무르게 만든다.",
  },
  verdictBasis: "일간이 약하지 않은데도 판단을 멈추는 건 능력이 아니라 기준의 문제다. 지금 대운 흐름은 벌릴 때지 재는 때가 아니다.",
  actionAlternatives: [
    { timing: "이번 주 ~ 2주 안", action: "미뤄둔 결정 하나를 세 문장으로 적고, 사흘 안에 실행 여부만 정해라.", rationale: "지금 흐름은 확장기라 작게라도 움직여야 판단이 다시 선명해진다." },
    { timing: "이번 달 안", action: "남의 반응을 확인하기 전에 내 기준부터 읽는 순서를 고정해라.", rationale: "관계 반응에 흔들리는 회로가 반복 선택의 방아쇠라서, 순서를 바꾸면 흔들림이 줄어든다." },
  ],
  peopleToMeet: [
    { role: "결정을 빠르게 내리고 실행부터 하는 실무형 사람", complementaryEnergy: "재는 습관을 끊어줄 추진력을 채워준다.", whereToFind: "업계 실무 모임, 사이드 프로젝트 커뮤니티, 소개 자리." },
  ],
  forbiddenAction: {
    title: "오늘 금지 행동",
    reason: "상대 반응을 핑계로 내 결정을 다시 무르는 것.",
  },
  thisWeekFirstStep: "가장 오래 미룬 결정 하나를 오늘 세 문장으로 적어라. 그게 이번 주 첫 걸음이다.",
  thirtyDayStrategy: [
    "1주차: 미룬 결정 목록을 만들고 그중 하나를 기준 세 줄로 정리해 실행 여부만 정한다.",
    "2주차: 남의 반응을 확인하기 전에 내 기준부터 읽는 순서를 고정한다.",
    "3주차: 매주 버릴 선택지를 하나씩 지워 선택지를 좁힌다.",
    "4주차: 남은 기준만 작전표에 남기고 반복되던 불안에 이름을 붙인다.",
  ],
  badge: {
    name: "안개 절단 휘장",
    description: "흐린 마음을 핑계로 쓰지 않고, 기준을 다시 세운 사람에게 주는 휘장이다.",
  },
  tsundereClosing: "여기까지 봤으면 이제 알겠지. 네가 약한 게 아니라, 계속 같은 방식으로 흔들렸던 거다.",
};

function buildLocalPreviewSession(mode: NeoResultPreviewMode): NeoResultSession {
  const now = new Date().toISOString();
  const showBriefing = mode !== "loading";
  const showRefined = mode === "refined";
  return {
    ok: true,
    id: `local-preview-${mode || "briefing"}`,
    sessionId: `local-preview-${mode || "briefing"}`,
    status: mode === "loading" ? "generating" : "completed",
    selectedMethod: "saju",
    topic: "지금 선택",
    intensity: "standard",
    question: "지금 내가 같은 선택 앞에서 흔들리는 이유를 알고 싶다.",
    initialBriefing: showBriefing ? localPreviewBriefing : null,
    refinedOrder: showRefined ? localPreviewRefinedOrder : null,
    realityCheck: mode === "reality" || mode === "refined"
      ? {
        selectedChecks: ["맞다. 요즘 계속 회피하고 있다.", "감정적으로 흔들리는 게 가장 크다."],
        freeform: "결정하기 전에는 확신을 기다리고, 결정한 뒤에는 주변 반응이 무서워 다시 흔들린다.",
      }
      : null,
    resultUrl: `/neo-operation-room/result?neoPreview=${mode || "briefing"}`,
    createdAt: now,
    updatedAt: now,
  };
}

function asErrorMessage(value: unknown) {
  if (value && typeof value === "object" && "message" in value) return String(value.message || "").trim();
  return "";
}

function methodLabel(method: string | undefined, locale: LoadingLocale) {
  return getLocalizedNeoWarRoomMethodDefinition(method, locale)?.label || getNeoResultCopy(locale).selectedMethodFallback;
}

function safeFilePart(value: string) {
  return String(value || "session")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "session";
}

function formatDateKey(value?: string | Date) {
  const date = value ? new Date(value) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  const month = String(safeDate.getMonth() + 1).padStart(2, "0");
  const day = String(safeDate.getDate()).padStart(2, "0");
  return `${safeDate.getFullYear()}-${month}-${day}`;
}

function todayKey() {
  return formatDateKey();
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("pdf_capture_timeout")), timeoutMs);
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timer));
  });
}

function getBriefingFrontline(briefing?: NeoBriefing | null) {
  return briefing?.frontlineSummary || briefing?.coreDiagnosis || "";
}

function getBriefingRepeatedChoice(briefing?: NeoBriefing | null) {
  return briefing?.repeatedChoice || briefing?.repeatedPattern || {};
}

function getBriefingMisalignedFlow(briefing?: NeoBriefing | null) {
  return briefing?.misalignedFlow || briefing?.currentProblem || {};
}

function getRefinedStuckPoint(refined: NeoRefinedOrder | null | undefined, locale: LoadingLocale): { title?: string; description?: string } {
  if (refined?.verdict?.statement) return { title: getNeoResultCopy(locale).neoVerdictLabel, description: refined.verdict.statement };
  return {};
}

// 서버 배지 payload → 화면 상태. 미인증(authenticated:false)·일시 오류(disabled)·부재(null)면
// 정상 잔량을 0으로 덮지 않도록 null을 반환해 이전 값을 유지한다(꿀방울과 동일 원칙).
function toBadgeAwardState(badge: NeoBadgeState | null | undefined): NeoBadgeAwardState | null {
  if (!badge || badge.authenticated === false || badge.disabled) return null;
  return {
    count: Math.max(0, Math.floor(Number(badge.balance ?? 0))),
    currentBadgeIndex: Math.max(0, Math.floor(Number(badge.currentBadgeIndex ?? 0))),
    awardedNow: Boolean(badge.awardedNow),
  };
}

function getSessionId(session: NeoResultSession) {
  return String(session.sessionId || session.id || "").trim();
}

function getBadgeStampStyle(index: number) {
  const safeIndex = Math.max(0, Math.min(NEO_RESULT_BADGE_COUNT - 1, index));
  const column = safeIndex % NEO_RESULT_BADGE_COLUMNS;
  const row = Math.floor(safeIndex / NEO_RESULT_BADGE_COLUMNS);
  return {
    "--neo-result-badge-sheet-width": `${NEO_RESULT_BADGE_COLUMNS * 100}%`,
    "--neo-result-badge-sheet-height": `${NEO_RESULT_BADGE_ROWS * 100}%`,
    "--neo-result-badge-x": `${column * -100}%`,
    "--neo-result-badge-y": `${row * -100}%`,
  } as CSSProperties;
}

function buildNeoSincereLetter(session: NeoResultSession, methodName: string, locale: LoadingLocale) {
  const briefing = session.initialBriefing;
  const refined = session.refinedOrder;
  const resultCopy = getNeoResultCopy(locale);
  const title = refined?.operationTitle || briefing?.operationTitle || resultCopy.defaultOperationTitle;
  const opening = briefing?.neoOpening || resultCopy.defaultOpening;
  const frontline = getBriefingFrontline(briefing);
  const stuckPoint = getRefinedStuckPoint(refined, locale);
  const strategy = refined?.actionAlternatives?.[0]?.action || refined?.thirtyDayStrategy?.[0] || briefing?.originalStrategy?.description || "";
  const closing = refined?.tsundereClosing || briefing?.tsundereClosing || briefing?.nextStepPrompt || "";
  return buildNeoSincereLetterParagraphs(
    {
      title,
      methodName,
      opening,
      frontline,
      stuckPointTitle: stuckPoint.title || "",
      stuckPointDescription: stuckPoint.description || "",
      strategy,
      closing,
    },
    locale,
  ).join("\n\n");
}

export default function NeoOperationRoomResultPage() {
  const searchParams = useSearchParams();
  const attemptId = searchParams?.get("attemptId") || searchParams?.get("id") || "";
  const localPreviewEnabled = process.env.NODE_ENV !== "production";
  const rawPreviewMode = searchParams?.get("neoPreview") || "";
  const localPreviewMode: NeoResultPreviewMode =
    localPreviewEnabled && NEO_RESULT_PREVIEW_MODES.has(rawPreviewMode as NeoResultPreviewMode)
      ? rawPreviewMode as NeoResultPreviewMode
      : "";
  const isLocalPreview = Boolean(localPreviewMode);
  const [dialogueLocale, setDialogueLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  const resultCopy = getNeoResultCopy(dialogueLocale);
  const [session, setSession] = useState<NeoResultSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRealityForm, setShowRealityForm] = useState(false);
  const [selectedChecks, setSelectedChecks] = useState<string[]>([]);
  const [freeform, setFreeform] = useState("");
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [viewAll, setViewAll] = usePagedViewerMode("neoOperationRoomViewerModeV1");
  const [exportExpand, setExportExpand] = useState(false);
  const [badgeAward, setBadgeAward] = useState<NeoBadgeAwardState>({
    count: 0,
    currentBadgeIndex: 0,
    awardedNow: false,
  });
  const [neoBenefitsUnlocked, setNeoBenefitsUnlocked] = useState(false);
  const [benefitUnlocking, setBenefitUnlocking] = useState(false);
  const [benefitUnlockError, setBenefitUnlockError] = useState("");
  const documentRef = useRef<HTMLElement | null>(null);
  const resultSealGate = useSpritePlaybackGate<HTMLDivElement>({ pauseWhenOffscreen: false });

  const selectedMethod = session?.selectedMethod || session?.initialBriefing?.selectedMethod || session?.refinedOrder?.selectedMethod;
  const selectedMethodDefinition = useMemo(
    () => getLocalizedNeoWarRoomMethodDefinition(selectedMethod, dialogueLocale) ?? getLocalizedNeoWarRoomMethodRegistry(dialogueLocale)[0],
    [selectedMethod, dialogueLocale],
  );

  useEffect(() => {
    const sync = () => setDialogueLocale(getCurrentLoadingLocale());
    sync();
    window.addEventListener("cd:locale-ready", sync);
    window.addEventListener("cd:locale-change", sync);
    return () => {
      window.removeEventListener("cd:locale-ready", sync);
      window.removeEventListener("cd:locale-change", sync);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    // 생성은 서버 백그라운드에서 진행되므로, 결과 페이지를 직접 열면 아직 generating(202)일 수 있다.
    // 완료(또는 실패)로 수렴할 때까지 폴링한다. 4s×60=240s, CF rate-limit(10s당 100회) 여유 안.
    async function loadResult() {
      if (localPreviewMode) {
        const previewSession = buildLocalPreviewSession(localPreviewMode);
        setSession(previewSession);
        setSelectedChecks(previewSession.realityCheck?.selectedChecks || []);
        setFreeform(previewSession.realityCheck?.freeform || "");
        setShowRealityForm(localPreviewMode === "reality");
        setError("");
        setLoading(false);
        return;
      }
      if (!attemptId) {
        setLoading(false);
        setError(getNeoResultCopy(getCurrentLoadingLocale()).missingAttemptIdError);
        return;
      }
      setLoading(true);
      setError("");
      for (let attempt = 0; attempt < RESULT_POLL_MAX_ATTEMPTS; attempt += 1) {
        try {
          const response = await authFetch(`/api/neo-operation-room/result?attemptId=${encodeURIComponent(attemptId)}`);
          const data = await response.json().catch(() => ({}));
          if (cancelled) return;
          // 아직 생성 중(202) — 생성 상태를 보여주고 잠시 후 다시 조회한다.
          if (response.status === 202 || (data?.ok && data.status === "generating")) {
            setSession((current) => (current?.status === "generating" ? current : (data as NeoResultSession)));
            setLoading(false);
            await new Promise((resolve) => window.setTimeout(resolve, RESULT_POLL_INTERVAL_MS));
            if (cancelled) return;
            continue;
          }
          if (!response.ok || !data?.ok) {
            const currentResultCopy = getNeoResultCopy(getCurrentLoadingLocale());
            const message = asErrorMessage(data) || (response.status === 401 ? currentResultCopy.loginRequiredError : currentResultCopy.notFoundError);
            setError(message);
            setSession(null);
            setLoading(false);
            return;
          }
          setSession(data as NeoResultSession);
          setSelectedChecks(Array.isArray(data.realityCheck?.selectedChecks) ? data.realityCheck.selectedChecks : []);
          setFreeform(String(data.realityCheck?.freeform || ""));
          setShowRealityForm(!data.refinedOrder);
          setLoading(false);
          return;
        } catch {
          if (cancelled) return;
          // 일시적 네트워크 오류 — 잠시 후 재시도.
          await new Promise((resolve) => window.setTimeout(resolve, RESULT_POLL_INTERVAL_MS));
          if (cancelled) return;
        }
      }
      // 폴링 예산 소진 — 생성이 지연되고 있음을 알린다(이용권/권한은 보존).
      if (!cancelled) {
        setLoading(false);
        setError(getNeoResultCopy(getCurrentLoadingLocale()).pollTimeoutError);
      }
    }
    loadResult();
    return () => {
      cancelled = true;
    };
  }, [attemptId, localPreviewMode]);

  async function handleRefine() {
    if (!session?.sessionId) return;
    if (!selectedChecks.length && freeform.trim().length < 4) {
      setRefineError(resultCopy.refineMissingAnswerError);
      return;
    }
    if (isLocalPreview) {
      setRefining(true);
      setRefineError("");
      setSession((current) => ({
        ...(current || buildLocalPreviewSession("reality")),
        status: "completed",
        realityCheck: {
          selectedChecks,
          freeform: freeform.trim(),
        },
        refinedOrder: localPreviewRefinedOrder,
        updatedAt: new Date().toISOString(),
      }));
      setShowRealityForm(false);
      setRefining(false);
      return;
    }
    setRefining(true);
    setRefineError("");
    try {
      let response: Response | null = null;
      let data: Record<string, unknown> = {};
      try {
        response = await authFetch("/api/neo-operation-room/refine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: session.sessionId,
            selectedChecks,
            freeform: freeform.trim(),
          }),
        });
        data = await response.json().catch(() => ({}));
      } catch {
        // 응답을 못 받았다(네트워크·엣지 컷). /refine 은 8챕터를 동기로 쓰므로 서버는 아직 진행 중일
        // 수 있다 — 단발 실패로 끝내면 사용자는 "재시도를 계속해야 나온다"를 겪는다.
        response = null;
      }
      if (response?.ok && (data as { ok?: boolean }).ok && (data as { refinedOrder?: unknown }).refinedOrder) {
        setSession(data as NeoResultSession);
        setShowRealityForm(false);
        return;
      }
      // 202(이미 같은 답변으로 생성 중)·503(일시 장애)·응답 없음은 결과가 나올 수 있다 → 폴링으로 수렴.
      // 그 외 확정 실패(404·422)만 즉시 끝낸다.
      const retriable = !response || response.status === 202 || response.status === 503;
      if (!retriable) {
        throw new Error(asErrorMessage(data) || resultCopy.refineGenericError);
      }
      const refined = await pollRefinedOrder(session.sessionId);
      setSession(refined);
      setShowRealityForm(false);
    } catch (caught) {
      setRefineError(caught instanceof Error ? caught.message : resultCopy.refineGenericError);
    } finally {
      setRefining(false);
    }
  }

  // 1차 브리핑 로딩이 쓰는 예산(4s × 60)과 같다. refinedOrder 가 붙거나 서버가 실패를 확정할 때까지 본다.
  async function pollRefinedOrder(resultId: string): Promise<NeoResultSession> {
    for (let attempt = 0; attempt < RESULT_POLL_MAX_ATTEMPTS; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, RESULT_POLL_INTERVAL_MS));
      let response: Response;
      let data: Record<string, unknown>;
      try {
        response = await authFetch(`/api/neo-operation-room/result?attemptId=${encodeURIComponent(resultId)}`);
        data = await response.json().catch(() => ({}));
      } catch {
        // 일시적 네트워크 오류 — 다음 회차에 다시 본다(여기서 던지면 폴링 자체가 죽는다).
        continue;
      }
      if (data.ok && data.refinedOrder) return data as NeoResultSession;
      if (data.refinementStatus === "generation_failed") {
        throw new Error(asErrorMessage(data.refinementError) || resultCopy.refineGenericErrorRetry);
      }
      if (response.status === 401) throw new Error(resultCopy.loginRequiredError);
    }
    throw new Error(resultCopy.refinePendingError);
  }

  async function handleUnlockNeoBenefits() {
    if (!session || benefitUnlocking || neoBenefitsUnlocked) return;
    if (isLocalPreview) {
      setBenefitUnlockError(resultCopy.previewUnlockNotice);
      return;
    }
    const sessionId = getSessionId(session);
    if (!sessionId) {
      setBenefitUnlockError(resultCopy.missingSessionKeyError);
      return;
    }
    setBenefitUnlocking(true);
    setBenefitUnlockError("");
    try {
      const response = await authFetch("/api/neo-operation-room/badges/unlock-benefits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; reason?: string; badge?: NeoBadgeState };
      const nextAward = toBadgeAwardState(data.badge);
      if (nextAward) setBadgeAward((current) => ({ ...current, count: nextAward.count, currentBadgeIndex: nextAward.currentBadgeIndex }));
      if (response.ok && data?.ok) {
        setNeoBenefitsUnlocked(true);
        setPdfError("");
      } else {
        setBenefitUnlockError(data?.reason === "missing_key"
          ? resultCopy.missingSessionKeyError
          : resultCopy.unlockGenericHint);
      }
    } catch {
      setBenefitUnlockError(resultCopy.unlockErrorGeneric);
    } finally {
      setBenefitUnlocking(false);
    }
  }

  async function handlePdfDownload() {
    const element = documentRef.current;
    if (!element || pdfLoading) return;
    if (!neoBenefitsUnlocked) {
      setPdfError(resultCopy.pdfLockedHint);
      return;
    }
    setPdfLoading(true);
    setPdfError("");
    // 페이지 뷰어가 숨긴 장(display:none)은 html2canvas에서 빈 캔버스가 되므로 전부 펼친 뒤 캡처한다.
    setExportExpand(true);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await new Promise((resolve) => setTimeout(resolve, 120));
    try {
      const [{ default: html2canvas }, jsPdfModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const JsPDF = jsPdfModule.default || jsPdfModule.jsPDF;
      const pdf = new JsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 8;
      const renderWidth = pageWidth - margin * 2;
      const renderHeight = pageHeight - margin * 2;
      const targets = Array.from(element.querySelectorAll<HTMLElement>("[data-neo-pdf-page]"));
      const pdfTargets = targets.length ? targets : [element];
      let hasPage = false;

      for (const target of pdfTargets) {
        let canvas: HTMLCanvasElement;
        try {
          canvas = await withTimeout(html2canvas(target, {
            backgroundColor: "#070c18",
            imageTimeout: 4000,
            ignoreElements: (node) => node instanceof HTMLImageElement,
            logging: false,
            scale: Math.min(2, window.devicePixelRatio || 2),
            useCORS: true,
            windowWidth: Math.max(document.documentElement.scrollWidth, element.scrollWidth, target.scrollWidth),
          }), 12000);
        } catch {
          continue;
        }
        if (!canvas.width || !canvas.height) continue;
        const imageData = canvas.toDataURL("image/png");
        const imageHeight = (canvas.height * renderWidth) / canvas.width;
        let remainingHeight = imageHeight;
        let position = margin;
        if (hasPage) pdf.addPage();
        pdf.addImage(imageData, "PNG", margin, position, renderWidth, imageHeight);
        hasPage = true;
        remainingHeight -= renderHeight;
        while (remainingHeight > 0) {
          position = margin + remainingHeight - imageHeight;
          pdf.addPage();
          pdf.addImage(imageData, "PNG", margin, position, renderWidth, imageHeight);
          remainingHeight -= renderHeight;
        }
      }

      if (!hasPage) throw new Error("empty_pdf_capture");
      const sessionKey = safeFilePart(session?.sessionId || session?.id || attemptId || "preview");
      const fileName = `neo-operation-order-${sessionKey}-${todayKey()}.pdf`;
      const blob = pdf.output("blob");
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setPdfError(resultCopy.pdfSaveError);
    } finally {
      setExportExpand(false);
      setPdfLoading(false);
    }
  }

  const briefing = session?.initialBriefing || null;
  const refined = session?.refinedOrder || null;
  const isGenerating = loading || session?.status === "generating";
  const isFailed = Boolean(error) || session?.status === "generation_failed";
  const canUnlockNeoBenefits = !neoBenefitsUnlocked && !isLocalPreview && badgeAward.count >= NEO_LETTER_BADGE_COST;
  const neoLetterText = useMemo(
    () => neoBenefitsUnlocked && session ? buildNeoSincereLetter(session, methodLabel(selectedMethod, dialogueLocale), dialogueLocale) : "",
    [neoBenefitsUnlocked, selectedMethod, session, dialogueLocale],
  );
  // 배경은 CSS 변수로 나가 NeoWarRoomAssetImage 를 우회하므로 리사이즈를 여기서 직접 건다.
  const backgroundStyle = {
    "--neo-bg-desktop": `url("${buildResizedAssetUrl(neoWarRoomAssets.backgrounds.desktop.src, { width: 1600, quality: 82 })}")`,
    "--neo-bg-mobile": `url("${buildResizedAssetUrl(neoWarRoomAssets.backgrounds.mobile.src, { width: 820, quality: 82 })}")`,
  } as CSSProperties;
  const neoResultStampAsset = resultSealGate.isMobile ? neoWarRoomAssets.badges.resultStampMobile : neoWarRoomAssets.badges.resultStamp;

  useEffect(() => {
    if (!session || isGenerating || isFailed) {
      setNeoBenefitsUnlocked(false);
      return;
    }
    if (isLocalPreview) {
      setBadgeAward({ count: 0, currentBadgeIndex: 0, awardedNow: false });
      setNeoBenefitsUnlocked(false);
      setBenefitUnlockError("");
      return;
    }
    // 휘장 잔량/해금 여부는 서버(session.badge)가 원천. 적립(멱등)은 서버가 이 세션 로드에서 처리한다.
    // 미인증/일시오류로 badge가 없거나 authenticated:false면 이전 값을 유지(0으로 덮지 않음).
    const nextAward = toBadgeAwardState(session.badge);
    if (nextAward) setBadgeAward(nextAward);
    if (session.badge && session.badge.authenticated !== false) {
      setNeoBenefitsUnlocked(Boolean(session.badge.benefitsUnlocked));
    }
    setBenefitUnlockError("");
  }, [attemptId, isFailed, isGenerating, isLocalPreview, session]);

  return (
    <main className={styles.shell} style={backgroundStyle}>
      <div className={styles.bg} aria-hidden="true" />
      <section className={styles.hero} aria-labelledby="neo-result-title">
        <div className={styles.heroCopy}>
          <span>Operation Order</span>
          <h1 id="neo-result-title">{resultCopy.heroTitle}</h1>
          <p>{isGenerating ? resultCopy.heroSubtitleGenerating : resultCopy.heroSubtitleReady}</p>
        </div>
        <div className={styles.heroVisual} aria-hidden="true">
          <NeoWarRoomAssetImage
            asset={neoWarRoomAssets.hero.fullbody}
            fallbackSrc="/neo-operation-room/sprites/transparent/neo-transparent-s1-f01.webp"
            alt=""
            priority
            sizes="(max-width: 768px) 62vw, 360px"
            className={styles.neoPortrait}
            imageClassName={styles.neoPortraitImage}
          />
          <NeoWarRoomAssetImage asset={neoWarRoomAssets.decor.asset1} alt="" sizes="110px" resizeWidth={240} className={styles.decorOne} imageClassName={styles.decorImage} />
          <NeoWarRoomAssetImage asset={neoWarRoomAssets.decor.asset2} alt="" sizes="110px" resizeWidth={240} className={styles.decorTwo} imageClassName={styles.decorImage} />
        </div>
      </section>

      {localPreviewEnabled ? (
        <nav className={styles.localPreviewBar} aria-label="개발 결과 미리보기">
          <strong>개발 결과 미리보기</strong>
          <Link href="/neo-operation-room/result?neoPreview=loading">로딩</Link>
          <Link href="/neo-operation-room/result?neoPreview=briefing">1차 브리핑</Link>
          <Link href="/neo-operation-room/result?neoPreview=reality">현실 점검</Link>
          <Link href="/neo-operation-room/result?neoPreview=refined">2차 명령서</Link>
        </nav>
      ) : null}

      {isGenerating ? (
        <section className={styles.stateCard} aria-live="polite">
          <NeoWarRoomAssetImage
            asset={neoWarRoomAssets.hero.strategyNeoMain}
            fallbackSrc="/neo-operation-room/sprites/transparent/neo-transparent-s1-f01.webp"
            alt=""
            sizes="200px"
            resizeWidth={440}
            className={styles.stateNeo}
            imageClassName={styles.stateNeoImage}
          />
          <h2>{resultCopy.generatingTitle}</h2>
          <p>{selectedMethod
            ? getNeoResultGeneratingBody(methodLabel(selectedMethod, dialogueLocale), dialogueLocale)
            : resultCopy.generatingBodyDefault}</p>
          {selectedMethod ? (
            <NeoWarRoomAssetImage
              asset={selectedMethodDefinition.coverAsset}
              alt=""
              sizes="120px"
              resizeWidth={260}
              className={styles.stateMethodChip}
              imageClassName={styles.stateMethodChipImage}
            />
          ) : null}
        </section>
      ) : null}

      {isFailed ? (
        <section className={styles.stateCard} aria-live="assertive">
          <NeoWarRoomAssetImage asset={neoResultStampAsset} alt="" sizes="86px" className={styles.stateSeal} imageClassName={styles.decorImage} />
          <h2>{resultCopy.failedTitle}</h2>
          <p>{error || session?.generationError?.message || resultCopy.failedDefaultMessage}</p>
          <Link href="/neo-operation-room" prefetch={false}>{resultCopy.retryLink}</Link>
        </section>
      ) : null}

      {!isGenerating && !isFailed && session ? (
        <div className={styles.layout}>
          <aside className={styles.sidePanel}>
            <NeoWarRoomAssetImage
              asset={selectedMethodDefinition.coverAsset}
              alt={`${methodLabel(selectedMethod, dialogueLocale)} ${resultCopy.methodCoverAltSuffix}`}
              sizes="280px"
              resizeWidth={560}
              className={styles.methodCover}
              imageClassName={styles.methodCoverImage}
            />
            <div>
              <span>{resultCopy.selectedMethodFallback}</span>
              <strong>{methodLabel(selectedMethod, dialogueLocale)}</strong>
              <p>{selectedMethodDefinition.resultEvidenceLabel}</p>
              <p>{session.topic ? getNeoTopicLabel(session.topic, dialogueLocale) : resultCopy.topicFallback}</p>
            </div>
          </aside>

          <section id="neo-operation-result-document" ref={documentRef} className={styles.documentStack}>
            <ResultSummaryCover
              session={session}
              methodName={methodLabel(selectedMethod, dialogueLocale)}
              locale={dialogueLocale}
              badgeIndex={badgeAward.currentBadgeIndex}
            />
            {briefing ? (
              <InitialBriefingDocument
                briefing={briefing}
                evidenceFallbackLabel={selectedMethodDefinition.resultEvidenceLabel}
                hasRefined={Boolean(refined)}
                badgeIndex={badgeAward.currentBadgeIndex}
                onOpenReality={() => setShowRealityForm(true)}
                viewAll={viewAll}
                onViewAllChange={setViewAll}
                expandForExport={exportExpand}
                locale={dialogueLocale}
              />
            ) : null}
            {showRealityForm && briefing ? (
              <RealityCheckForm
                selectedChecks={selectedChecks}
                setSelectedChecks={setSelectedChecks}
                freeform={freeform}
                setFreeform={setFreeform}
                refining={refining}
                refineError={refineError}
                onSubmit={handleRefine}
                locale={dialogueLocale}
              />
            ) : null}
            {refined ? (
              <RefinedOrderDocument
                refined={refined}
                badgeIndex={badgeAward.currentBadgeIndex}
                viewAll={viewAll}
                onViewAllChange={setViewAll}
                expandForExport={exportExpand}
                locale={dialogueLocale}
              />
            ) : null}
            <CtaDeck attemptId={isLocalPreview ? "" : session.sessionId || attemptId} onOpenReality={() => setShowRealityForm(true)} hasRefined={Boolean(refined)} locale={dialogueLocale} />
            <BadgeVaultPanel badgeAward={badgeAward} benefitsUnlocked={neoBenefitsUnlocked} locale={dialogueLocale} />
            <section className={styles.actionBar} aria-label={resultCopy.actionBarAria}>
              <div className={styles.actionCopy}>
                <span>{refined ? "Final Order Ready" : "Briefing Ready"}</span>
                <strong>{refined ? resultCopy.actionBarRefinedDone : resultCopy.actionBarInitialDone}</strong>
              </div>
              <div className={styles.actionButtons}>
                <button
                  type="button"
                  className={styles.benefitButton}
                  data-loading={benefitUnlocking ? "true" : "false"}
                  data-unlocked={neoBenefitsUnlocked ? "true" : "false"}
                  disabled={benefitUnlocking || neoBenefitsUnlocked || !canUnlockNeoBenefits}
                  onClick={handleUnlockNeoBenefits}
                >
                  {benefitUnlocking ? <Loader2 className={styles.spinIcon} aria-hidden="true" /> : neoBenefitsUnlocked ? <CheckCircle2 aria-hidden="true" /> : <Lock aria-hidden="true" />}
                  <span>{benefitUnlocking ? resultCopy.benefitBusy : neoBenefitsUnlocked ? resultCopy.benefitDone : resultCopy.benefitCta}</span>
                </button>
                <button
                  type="button"
                  className={styles.pdfButton}
                  data-loading={pdfLoading ? "true" : "false"}
                  data-locked={neoBenefitsUnlocked ? "false" : "true"}
                  disabled={pdfLoading || !neoBenefitsUnlocked}
                  onClick={handlePdfDownload}
                >
                  {pdfLoading ? <Loader2 className={styles.spinIcon} aria-hidden="true" /> : neoBenefitsUnlocked ? <Download aria-hidden="true" /> : <Lock aria-hidden="true" />}
                  <span>{pdfLoading ? resultCopy.pdfBusy : neoBenefitsUnlocked ? resultCopy.pdfReady : resultCopy.pdfLocked}</span>
                </button>
              </div>
              {benefitUnlockError ? <p className={styles.unlockError} role="alert">{benefitUnlockError}</p> : null}
              {pdfError ? <p className={styles.pdfError} role="alert">{pdfError}</p> : null}
            </section>
            {neoLetterText ? (
              <NeoSincereLetter letter={neoLetterText} locale={dialogueLocale} />
            ) : (
              <NeoLetterLockCard
                badgeAward={badgeAward}
                benefitsUnlocked={neoBenefitsUnlocked}
                canUnlock={canUnlockNeoBenefits}
                unlocking={benefitUnlocking}
                unlockError={benefitUnlockError}
                onUnlock={handleUnlockNeoBenefits}
                locale={dialogueLocale}
              />
            )}
          </section>
        </div>
      ) : null}
    </main>
  );
}

function LionBadgeStamp({ badgeIndex, className = "" }: { badgeIndex: number; className?: string }) {
  const badgeGate = useSpritePlaybackGate<HTMLSpanElement>();
  // "오늘의 등급"(C~EX, 0~9 순환)에는 등급별로 실제 다른 그림인 grades 시트를 써야 한다.
  // resultStamp는 별개 자산(단일 도장 모티프)이라 어느 인덱스를 넣어도 같은 컷처럼 보였다.
  const stampAsset = badgeGate.isMobile ? neoWarRoomAssets.badges.gradesMobile : neoWarRoomAssets.badges.grades;
  return (
    <span ref={badgeGate.ref} className={`${styles.badgeStampFrame} ${className}`} style={getBadgeStampStyle(badgeIndex)}>
      {badgeGate.canLoad ? (
        <NeoWarRoomAssetImage
          asset={stampAsset}
          alt=""
          sizes="144px"
          className={styles.badgeStampSheet}
          imageClassName={styles.badgeStampImage}
          style={{ background: "transparent" }}
        />
      ) : null}
    </span>
  );
}

function BadgeVaultPanel({ badgeAward, benefitsUnlocked, locale }: { badgeAward: NeoBadgeAwardState; benefitsUnlocked: boolean; locale: LoadingLocale }) {
  const resultCopy = getNeoResultCopy(locale);
  const progress = Math.min(NEO_LETTER_BADGE_COST, badgeAward.count);
  const remaining = Math.max(0, NEO_LETTER_BADGE_COST - progress);
  const message = benefitsUnlocked
    ? resultCopy.badgeVaultUnlockedMsg
    : remaining === 0
      ? resultCopy.badgeVaultReadyMsg
      : getNeoResultBadgeVaultRemainingMsg(remaining, locale);
  return (
    <div className={styles.badgeVault}>
      <LionBadgeStamp badgeIndex={badgeAward.currentBadgeIndex} className={styles.badgeVaultStamp} />
      <div className={styles.badgeVaultCopy}>
        <span>{badgeAward.awardedNow ? resultCopy.badgeVaultAwarded : resultCopy.badgeVaultTitle}</span>
        <strong>{badgeAward.count}{resultCopy.badgeVaultCountSuffix}</strong>
        <p>{message}</p>
      </div>
      <div className={styles.badgeVaultSlots} aria-label={getNeoResultBadgeVaultAriaLabel(progress, NEO_LETTER_BADGE_COST, locale)}>
        {Array.from({ length: NEO_LETTER_BADGE_COST }).map((_, index) => (
          <i key={index} data-filled={index < progress ? "true" : "false"} />
        ))}
      </div>
    </div>
  );
}

function NeoLetterLockCard({
  badgeAward,
  benefitsUnlocked,
  canUnlock,
  unlocking,
  unlockError,
  onUnlock,
  locale,
}: {
  badgeAward: NeoBadgeAwardState;
  benefitsUnlocked: boolean;
  canUnlock: boolean;
  unlocking: boolean;
  unlockError: string;
  onUnlock: () => void;
  locale: LoadingLocale;
}) {
  const resultCopy = getNeoResultCopy(locale);
  const progress = Math.min(NEO_LETTER_BADGE_COST, badgeAward.count);
  return (
    <article className={styles.neoLetterLockCard}>
      <header className={styles.documentHeader}>
        <span>{resultCopy.letterSpan}</span>
        <h2>{benefitsUnlocked ? resultCopy.letterUnlockedTitle : resultCopy.letterLockedTitle}</h2>
      </header>
      <p>{getNeoResultLetterLockBody(progress, NEO_LETTER_BADGE_COST, locale)}</p>
      <div className={styles.neoLetterLockActions}>
        <button type="button" disabled={!canUnlock || unlocking || benefitsUnlocked} onClick={onUnlock}>
          {unlocking ? <Loader2 className={styles.spinIcon} aria-hidden="true" /> : benefitsUnlocked ? <CheckCircle2 aria-hidden="true" /> : <Lock aria-hidden="true" />}
          <span>{unlocking ? resultCopy.benefitBusy : benefitsUnlocked ? resultCopy.letterUnlockDone : resultCopy.benefitCta}</span>
        </button>
      </div>
      {unlockError ? <p className={styles.unlockError} role="alert">{unlockError}</p> : null}
    </article>
  );
}

function NeoSincereLetter({ letter, locale }: { letter: string; locale: LoadingLocale }) {
  const resultCopy = getNeoResultCopy(locale);
  return (
    <article className={styles.neoLetterCard} data-neo-pdf-page>
      <header className={styles.documentHeader}>
        <span>{resultCopy.letterSpan}</span>
        <h2>{resultCopy.letterOpenedTitle}</h2>
      </header>
      <div className={styles.neoLetterBody}>
        {letter.split("\n\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
    </article>
  );
}

function ResultSummaryCover({
  session,
  methodName,
  badgeIndex,
  locale,
}: {
  session: NeoResultSession;
  methodName: string;
  badgeIndex: number;
  locale: LoadingLocale;
}) {
  const resultCopy = getNeoResultCopy(locale);
  const briefing = session.initialBriefing || null;
  const refined = session.refinedOrder || null;
  const issuedAt = formatDateKey(session.updatedAt || session.createdAt);
  return (
    <article className={`${styles.documentCard} ${styles.summaryCover}`} data-neo-pdf-page>
      <header className={styles.documentHeader}>
        <span>Neo Operation Order</span>
        <h2>{refined?.operationTitle || briefing?.operationTitle || resultCopy.heroTitle}</h2>
      </header>
      <div className={styles.summaryGrid}>
        <section>
          <span>{resultCopy.summaryMethodLabel}</span>
          <strong>{methodName}</strong>
        </section>
        <section>
          <span>{resultCopy.summaryTopicLabel}</span>
          <strong>{session.topic ? getNeoTopicLabel(session.topic, locale) : resultCopy.summaryTopicFallback}</strong>
        </section>
        <section>
          <span>{resultCopy.summaryIssuedLabel}</span>
          <strong>{issuedAt}</strong>
        </section>
      </div>
      {session.question ? <p className={styles.summaryQuestion}>{session.question}</p> : null}
      <div className={styles.summarySeal}>
        <LionBadgeStamp badgeIndex={badgeIndex} className={styles.stampImageFrame} />
        <p>{refined ? resultCopy.summaryRefinedNote : resultCopy.summaryInitialNote}</p>
      </div>
    </article>
  );
}

function InitialBriefingDocument({
  briefing,
  evidenceFallbackLabel,
  hasRefined,
  badgeIndex,
  onOpenReality,
  viewAll,
  onViewAllChange,
  expandForExport,
  locale,
}: {
  briefing: NeoBriefing;
  evidenceFallbackLabel: string;
  hasRefined: boolean;
  badgeIndex: number;
  onOpenReality: () => void;
  viewAll: boolean;
  onViewAllChange: (viewAll: boolean) => void;
  expandForExport: boolean;
  locale: LoadingLocale;
}) {
  const resultCopy = getNeoResultCopy(locale);
  const formCopy = getNeoFormCopy(locale);
  const [activePage, setActivePage] = useState(0);
  const frontlineSummary = getBriefingFrontline(briefing);
  const repeatedChoice = getBriefingRepeatedChoice(briefing);
  const misalignedFlow = getBriefingMisalignedFlow(briefing);
  const bluntTruth = toDisplayText(briefing.bluntTruth);
  const closing = toDisplayText(briefing.tsundereClosing || briefing.nextStepPrompt);
  const pageCandidates: Array<ResultViewerPage & { when: boolean }> = [
    {
      id: "briefing-frontline",
      label: resultCopy.tabFrontline,
      when: Boolean(toDisplayText(frontlineSummary) || bluntTruth),
      content: (
        <>
          <Section title={formCopy["briefing.frontlineLabel"]} body={frontlineSummary} />
          {bluntTruth ? <NeoBluntCallout text={bluntTruth} locale={locale} /> : null}
        </>
      ),
    },
    {
      id: "briefing-orders",
      label: resultCopy.tabUrgentOrders,
      when: Boolean(briefing.actionOrders?.length),
      content: (
        <>
          <Section title={formCopy["briefing.actionOrdersLabel"]} list={briefing.actionOrders} />
          {!hasRefined ? <button type="button" className={styles.primaryCta} onClick={onOpenReality}>{formCopy["realityPanel.submitIdle"]}</button> : null}
        </>
      ),
    },
    {
      id: "briefing-judgement",
      label: resultCopy.tabJudgement,
      when: Boolean(toDisplayText(briefing.neoOpening) || toDisplayText(repeatedChoice.description)),
      // "네오의 첫 판단" 페이지는 홀수라 cadence 삽화 대상에서 빠진다. 인접한 "긴급 작전"이
      // s1-f01을 받으므로 중복감을 피해 다른 시퀀스를 직접 배정한다(로컬 webp 재사용).
      breakImage: {
        src: "/neo-operation-room/sprites/transparent/neo-transparent-s3-f01.webp",
        width: 362,
        height: 543,
        className: styles.neoBustBreak,
      },
      content: (
        <>
          <Section title={resultCopy.firstJudgementTitle} body={briefing.neoOpening} />
          <Section title={repeatedChoice.title || formCopy["briefing.repeatedChoiceFallback"]} body={repeatedChoice.description} />
        </>
      ),
    },
    {
      id: "briefing-innate",
      label: resultCopy.tabInnate,
      when: Boolean(toDisplayText(briefing.innateNature?.description) || toDisplayText(briefing.innateStrength?.description)),
      content: (
        <>
          <Section title={briefing.innateNature?.title || formCopy["briefing.innateNatureFallback"]} body={briefing.innateNature?.description} list={briefing.innateNature?.keyTraits} />
          <Section
            title={briefing.innateStrength?.title || formCopy["briefing.innateStrengthFallback"]}
            body={briefing.innateStrength?.description}
            list={[
              ...(briefing.innateStrength?.strongPoints || []).map((point) => `💪 ${toDisplayText(point)}`),
              ...(briefing.innateStrength?.weakPoints || []).map((point) => `⚠ ${toDisplayText(point)}`),
            ]}
          />
        </>
      ),
    },
    {
      id: "briefing-topic",
      label: resultCopy.tabTopic,
      when: Boolean(toDisplayText(briefing.topicStyle?.description) || briefing.topicAreas?.length),
      content: (
        <>
          <Section title={briefing.topicStyle?.title || formCopy["briefing.topicStyleFallback"]} body={briefing.topicStyle?.description} list={briefing.topicStyle?.keyPoints} />
          {briefing.topicAreas?.length ? (
            <Section title={formCopy["briefing.topicAreasLabel"]} list={briefing.topicAreas.map((item) => `${toDisplayText(item.area)} — ${toDisplayText(item.reading)}`)} />
          ) : null}
        </>
      ),
    },
    {
      id: "briefing-timing",
      label: resultCopy.tabTiming,
      when: Boolean(toDisplayText(briefing.topicTiming?.description) || toDisplayText(briefing.originalStrategy?.description)),
      content: (
        <>
          <Section title={briefing.topicTiming?.title || formCopy["briefing.topicTimingFallback"]} body={briefing.topicTiming?.description} list={briefing.topicTiming?.windows} />
          <Section title={briefing.originalStrategy?.title || formCopy["briefing.originalStrategyFallback"]} body={briefing.originalStrategy?.description} list={briefing.originalStrategy?.keyRules} />
        </>
      ),
    },
    {
      id: "briefing-evidence",
      label: resultCopy.tabEvidence,
      when: Boolean(toDisplayText(misalignedFlow.description) || briefing.methodEvidence?.length),
      content: (
        <>
          <Section title={misalignedFlow.title || formCopy["briefing.misalignedFlowFallback"]} body={misalignedFlow.description} />
          {briefing.methodEvidence?.length ? (
            <div className={styles.gridList}>
              {briefing.methodEvidence.map((item) => <Section key={`${item.method}-${item.label}`} title={item.label || evidenceFallbackLabel} body={item.summary} />)}
            </div>
          ) : null}
        </>
      ),
    },
    {
      id: "briefing-mission",
      label: resultCopy.tabMission,
      when: Boolean(toDisplayText(briefing.forbiddenAction?.reason) || briefing.sevenDayMission?.length),
      content: (
        <>
          <Section title={briefing.forbiddenAction?.title || formCopy["briefing.forbiddenActionFallback"]} body={briefing.forbiddenAction?.reason} />
          {briefing.sevenDayMission?.length ? (
            <div className={styles.missionGrid}>
              <strong>{formCopy["briefing.sevenDayLabel"]}</strong>
              {briefing.sevenDayMission.map((item, index) => (
                <section key={`${item.day}-${index}`}>
                  <span>DAY {item.day}</span>
                  <p>{toDisplayText(item.mission)}</p>
                </section>
              ))}
            </div>
          ) : null}
        </>
      ),
    },
    {
      id: "briefing-reality",
      label: formCopy["realityPanel.eyebrow"],
      when: Boolean(briefing.realityCheckQuestions?.length),
      content: (
        <>
          {briefing.realityCheckQuestions?.length ? (
            <div className={styles.questionList}>
              <strong>{formCopy["briefing.realityQuestionsLabel"]}</strong>
              {briefing.realityCheckQuestions.map((item, index) => (
                <section key={`${index}-${toDisplayText(item.question).slice(0, 24)}`}>
                  <p>{toDisplayText(item.question)}</p>
                  <span>{toDisplayText(item.whyItMatters)}</span>
                </section>
              ))}
            </div>
          ) : null}
          {!hasRefined ? <button type="button" className={styles.primaryCta} onClick={onOpenReality}>{resultCopy.answerThenRefineCta}</button> : null}
        </>
      ),
    },
    {
      id: "briefing-badge",
      label: resultCopy.tabBadge,
      when: Boolean(toDisplayText(briefing.badge?.description) || closing),
      content: (
        <>
          {briefing.badge?.description ? (
            <div className={styles.badgeBlock}>
              <LionBadgeStamp badgeIndex={badgeIndex} className={styles.badgeImageFrame} />
              <div>
                <strong>{formCopy["refinedOrder.badgePrefix"]} · {toDisplayText(briefing.badge.name) || resultCopy.unnamedBadgeFallback}</strong>
                <LlmParagraphs text={briefing.badge.description} />
              </div>
              <LionBadgeStamp badgeIndex={(badgeIndex + 1) % NEO_RESULT_BADGE_COUNT} className={styles.stampImageFrame} />
            </div>
          ) : null}
          {closing ? (
            <NeoFactPunch text={closing} label={formCopy["refinedOrder.closingLabel"]} />
          ) : null}
        </>
      ),
    },
  ];
  const pages: ResultViewerPage[] = pageCandidates
    .filter((page) => page.when)
    .map((page) => ({ id: page.id, label: page.label, content: page.content, breakImage: page.breakImage }));
  return (
    <article className={styles.documentCard} data-neo-pdf-page>
      <header className={styles.documentHeader}>
        <span>{formCopy["briefing.eyebrow"]}</span>
        <h2>{toDisplayText(briefing.operationTitle) || formCopy["briefing.fallbackTitle"]}</h2>
      </header>
      {/* 전체 보기·PDF 펼침에서는 모든 장이 이미 보이므로 목차는 감춘다. */}
      {!viewAll && !expandForExport ? (
        <ResultDeckToc pages={pages} activePage={activePage} onSelect={setActivePage} label={resultCopy.docBriefingTocAria} locale={locale} />
      ) : null}
      <PagedResultViewer
        pages={withCharacterBreaks(pages, neoInitialBreaks, styles.neoBustBreak)}
        deckLabel={formCopy["briefing.eyebrow"]}
        className={styles.pagedViewer}
        pageClassName={styles.neoPage}
        viewAll={viewAll}
        onViewAllChange={onViewAllChange}
        activePage={activePage}
        onPageChange={setActivePage}
        expandForExport={expandForExport}
      />
    </article>
  );
}

function RealityCheckForm({
  selectedChecks,
  setSelectedChecks,
  freeform,
  setFreeform,
  refining,
  refineError,
  onSubmit,
  locale,
}: {
  selectedChecks: string[];
  setSelectedChecks: (updater: string[] | ((current: string[]) => string[])) => void;
  freeform: string;
  setFreeform: (value: string) => void;
  refining: boolean;
  refineError: string;
  onSubmit: () => void;
  locale: LoadingLocale;
}) {
  const resultCopy = getNeoResultCopy(locale);
  const formCopy = getNeoFormCopy(locale);
  return (
    <article className={styles.documentCard}>
      <header className={styles.documentHeader}>
        <span>{formCopy["realityPanel.eyebrow"]}</span>
        <h2>{resultCopy.realityFormTitle}</h2>
      </header>
      <div className={styles.choiceGrid}>
        {realityCheckOptions.map((item) => {
          const active = selectedChecks.includes(item);
          return (
            <button
              key={item}
              type="button"
              data-active={active ? "true" : "false"}
              onClick={() => {
                setSelectedChecks((current) => active ? current.filter((entry) => entry !== item) : [...current, item]);
              }}
            >
              {getNeoRealityCheckLabel(item, locale)}
            </button>
          );
        })}
      </div>
      <textarea
        value={freeform}
        maxLength={1000}
        placeholder={formCopy["realityPanel.freeformPlaceholder"]}
        onChange={(event) => setFreeform(event.target.value)}
      />
      {refineError ? <p className={styles.errorText}>{refineError}</p> : null}
      <button type="button" className={styles.primaryCta} disabled={refining} onClick={onSubmit}>
        {refining ? formCopy["realityPanel.submitBusy"] : formCopy["realityPanel.submitIdle"]}
      </button>
    </article>
  );
}

function RefinedOrderDocument({
  refined,
  badgeIndex,
  viewAll,
  onViewAllChange,
  expandForExport,
  locale,
}: {
  refined: NeoRefinedOrder;
  badgeIndex: number;
  viewAll: boolean;
  onViewAllChange: (viewAll: boolean) => void;
  expandForExport: boolean;
  locale: LoadingLocale;
}) {
  const resultCopy = getNeoResultCopy(locale);
  const formCopy = getNeoFormCopy(locale);
  const [activePage, setActivePage] = useState(0);
  const closing = toDisplayText(refined.tsundereClosing);
  const pageCandidates: Array<ResultViewerPage & { when: boolean }> = [
    {
      id: "refined-review",
      label: resultCopy.tabReview,
      when: Boolean(toDisplayText(refined.neoReview)),
      content: <Section title={resultCopy.tabReview} body={refined.neoReview} />,
    },
    {
      id: "refined-verdict",
      label: resultCopy.tabVerdict,
      when: Boolean(toDisplayText(refined.verdict?.statement) || toDisplayText(refined.verdictBasis)),
      content: (
        <>
          <Section title={refined.verdict?.status ? getNeoResultVerdictWithStatus(toDisplayText(refined.verdict.status), locale) : resultCopy.tabVerdict} body={refined.verdict?.statement} />
          <Section title={resultCopy.verdictBasisTitle} body={refined.verdictBasis} />
        </>
      ),
    },
    {
      id: "refined-alternatives",
      label: resultCopy.tabAdjust,
      when: Boolean(refined.actionAlternatives?.length),
      content: (
        <div className={styles.gridList}>
          {(refined.actionAlternatives || []).map((item, index) => (
            <Section
              key={`${toDisplayText(item.timing)}-${index}`}
              title={item.timing ? getNeoResultAdjustWithTiming(toDisplayText(item.timing), locale) : resultCopy.tabAdjust}
              body={item.action}
              list={item.rationale ? [toDisplayText(item.rationale)] : undefined}
            />
          ))}
        </div>
      ),
    },
    {
      id: "refined-people",
      label: formCopy["refinedOrder.peopleLabel"],
      when: Boolean(refined.peopleToMeet?.length),
      content: (
        <div className={styles.gridList}>
          {(refined.peopleToMeet || []).map((item, index) => (
            <Section
              key={`${toDisplayText(item.role)}-${index}`}
              title={formCopy["refinedOrder.peopleLabel"]}
              body={item.role}
              list={[toDisplayText(item.complementaryEnergy), item.whereToFind ? `${formCopy["refinedOrder.whereToFindPrefix"]} · ${toDisplayText(item.whereToFind)}` : ""].filter(Boolean)}
            />
          ))}
        </div>
      ),
    },
    {
      id: "refined-thirty",
      label: formCopy["refinedOrder.thirtyDayLabel"],
      when: Boolean(refined.thirtyDayStrategy?.length || toDisplayText(refined.thisWeekFirstStep)),
      content: (
        <>
          <Section title={formCopy["refinedOrder.thirtyDayLabel"]} list={refined.thirtyDayStrategy} />
          <Section title={formCopy["refinedOrder.thisWeekLabel"]} body={refined.thisWeekFirstStep} />
        </>
      ),
    },
    {
      id: "refined-closing",
      label: resultCopy.tabClosing,
      when: true,
      content: (
        <>
          <Section title={refined.forbiddenAction?.title || formCopy["briefing.forbiddenActionFallback"]} body={refined.forbiddenAction?.reason} />
          <div className={styles.badgeBlock}>
            <LionBadgeStamp badgeIndex={badgeIndex} className={styles.badgeImageFrame} />
            <div>
              <strong>{formCopy["refinedOrder.badgePrefix"]} · {toDisplayText(refined.badge?.name) || resultCopy.unnamedBadgeFallback}</strong>
              <LlmParagraphs text={refined.badge?.description} />
            </div>
            <LionBadgeStamp badgeIndex={(badgeIndex + 1) % NEO_RESULT_BADGE_COUNT} className={styles.stampImageFrame} />
          </div>
          {closing ? (
            <NeoFactPunch text={closing} label={formCopy["refinedOrder.closingLabel"]} />
          ) : null}
        </>
      ),
    },
  ];
  const pages: ResultViewerPage[] = pageCandidates
    .filter((page) => page.when)
    .map((page) => ({ id: page.id, label: page.label, content: page.content }));
  return (
    <article className={styles.documentCard} data-version="v2" data-neo-pdf-page>
      <header className={styles.documentHeader}>
        <span>{formCopy["refinedOrder.eyebrow"]}</span>
        <h2>{toDisplayText(refined.operationTitle) || formCopy["refinedOrder.fallbackTitle"]}</h2>
      </header>
      {!viewAll && !expandForExport ? (
        <ResultDeckToc pages={pages} activePage={activePage} onSelect={setActivePage} label={resultCopy.docRefinedTocAria} locale={locale} />
      ) : null}
      <PagedResultViewer
        pages={withCharacterBreaks(pages, neoRefinedBreaks, styles.neoBustBreak)}
        deckLabel={formCopy["refinedOrder.eyebrow"]}
        className={styles.pagedViewer}
        pageClassName={styles.neoPage}
        viewAll={viewAll}
        onViewAllChange={onViewAllChange}
        activePage={activePage}
        onPageChange={setActivePage}
        expandForExport={expandForExport}
      />
    </article>
  );
}

// 세로로 긴 덱을 순서대로만 넘기게 두지 않는 목차. PagedResultViewer 가 이미 가진
// activePage/onPageChange 를 연결할 뿐이라 뷰어 로직은 새로 만들지 않는다.
// (정본 패턴: app/love-secret-ai/result/LoveSecretAiResultClient.tsx)
function ResultDeckToc({
  pages,
  activePage,
  onSelect,
  label,
  locale,
}: {
  pages: ResultViewerPage[];
  activePage: number;
  onSelect: (index: number) => void;
  label: string;
  locale: LoadingLocale;
}) {
  if (pages.length < 2) return null;
  return (
    <nav className={styles.deckToc} aria-label={label}>
      {pages.map((page, index) => (
        <button
          key={page.id}
          type="button"
          onClick={() => onSelect(index)}
          data-active={activePage === index ? "true" : "false"}
          aria-current={activePage === index ? "true" : undefined}
        >
          {page.label || getNeoResultTocPageFallback(index + 1, locale)}
        </button>
      ))}
    </nav>
  );
}

function Section({ title, body, list }: { title: string; body?: string; list?: string[] }) {
  // LLM 필드가 객체/배열이거나 저장 단계에서 "[object Object]"로 오염된 경우를 방어한다.
  const bodyText = toDisplayText(body);
  const items = (list || []).map((item) => toDisplayText(item)).filter(Boolean);
  if (!bodyText && !items.length) return null;
  return (
    <section className={styles.sectionCard}>
      <h3>{toDisplayText(title)}</h3>
      <LlmParagraphs text={bodyText} />
      {items.length ? <ul>{items.map((item, index) => <li key={`${index}-${item.slice(0, 24)}`}>{item}</li>)}</ul> : null}
    </section>
  );
}

// 팩폭 콜아웃 이미지 — 재생속도 이슈로 프레임 애니메이션 대신 기본 이미지 한 장만 고정 노출.
const NEO_CALLOUT_IMAGE = "/neo-operation-room/sprites/transparent/neo-transparent-s1-f01.webp";

// 팩폭 한줄 요약을 네오 스티커(고정 이미지) 옆에 배치해 시선이 쉬는 지점을 만든다.
function NeoBluntCallout({ text, locale }: { text: string; locale: LoadingLocale }) {
  return (
    <div className={styles.neoAside}>
      <figure className={styles.neoAsideSprite} data-playing="false">
        <Image
          src={NEO_CALLOUT_IMAGE}
          width={362}
          height={543}
          alt={getNeoResultCopy(locale).bluntCalloutAlt}
          loading="lazy"
        />
      </figure>
      <NeoFactPunch text={text} />
    </div>
  );
}

function CtaDeck({ attemptId, hasRefined, onOpenReality, locale }: { attemptId: string; hasRefined: boolean; onOpenReality: () => void; locale: LoadingLocale }) {
  const resultCopy = getNeoResultCopy(locale);
  const formCopy = getNeoFormCopy(locale);
  return (
    <nav className={styles.ctaDeck} aria-label={resultCopy.ctaDeckAria}>
      <button type="button" onClick={onOpenReality}>{hasRefined ? resultCopy.realityFormTitle : formCopy["realityPanel.submitIdle"]}</button>
      <Link href="/neo-operation-room" prefetch={false}>{resultCopy.retryLink}</Link>
      <Link href="/neo-operation-room" prefetch={false}>{resultCopy.ctaOtherMethod}</Link>
      <Link href="/fortune-tea-house">{resultCopy.ctaTeaHouse}</Link>
      {attemptId ? <Link href={`/neo-operation-room/result?attemptId=${encodeURIComponent(attemptId)}`}>{resultCopy.ctaReopen}</Link> : null}
    </nav>
  );
}
