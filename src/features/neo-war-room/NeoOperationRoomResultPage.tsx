"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Download, Loader2, Lock } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { authFetch } from "@/app/_lib/auth-client";
import { useSpritePlaybackGate } from "@/src/hooks/useSpritePlaybackGate";
import NeoWarRoomAssetImage from "./components/NeoWarRoomAssetImage";
import { type NeoWarRoomConsultMode, neoWarRoomAssets } from "./data/assets";
import { getNeoWarRoomMethodDefinition, neoWarRoomMethodRegistry } from "./data/method-registry";
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
  resultUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

type NeoResultPreviewMode = "" | "loading" | "briefing" | "reality" | "refined";
type NeoBadgeVault = {
  count: number;
  totalAwarded: number;
  awards: Record<string, number>;
};
type NeoBadgeAwardState = {
  count: number;
  currentBadgeIndex: number;
  awardedNow: boolean;
};
type NeoBenefitSpendResult = {
  ok: boolean;
  count: number;
  reason?: "missing_key" | "not_enough";
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
const NEO_BADGE_VAULT_STORAGE_KEY = "neoOperationRoomLionBadgeVaultV1";
const NEO_LETTER_GRANTS_STORAGE_KEY = "neoOperationRoomLetterGrantsV1";
const NEO_LETTER_BADGE_COST = 5;
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

function methodLabel(method?: string) {
  return getNeoWarRoomMethodDefinition(method)?.label || "선택한 술수";
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

function getRefinedStuckPoint(refined?: NeoRefinedOrder | null): { title?: string; description?: string } {
  if (refined?.verdict?.statement) return { title: "네오의 판정", description: refined.verdict.statement };
  return {};
}

function readNeoStorageRecord(key: string) {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function readNeoBadgeVault(): NeoBadgeVault {
  const vault = readNeoStorageRecord(NEO_BADGE_VAULT_STORAGE_KEY);
  const rawAwards = vault.awards && typeof vault.awards === "object" && !Array.isArray(vault.awards)
    ? vault.awards as Record<string, unknown>
    : {};
  const awards = Object.entries(rawAwards).reduce<Record<string, number>>((nextAwards, [key, value]) => {
    const badgeIndex = Number(value);
    if (Number.isInteger(badgeIndex) && badgeIndex >= 0 && badgeIndex < NEO_RESULT_BADGE_COUNT) {
      nextAwards[key] = badgeIndex;
    }
    return nextAwards;
  }, {});
  const count = Number(vault.count);
  const totalAwarded = Number(vault.totalAwarded);
  return {
    count: Number.isFinite(count) && count > 0 ? Math.floor(count) : 0,
    totalAwarded: Number.isFinite(totalAwarded) && totalAwarded > 0 ? Math.floor(totalAwarded) : Object.keys(awards).length,
    awards,
  };
}

function writeNeoBadgeVault(vault: NeoBadgeVault) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NEO_BADGE_VAULT_STORAGE_KEY, JSON.stringify({
    count: Math.max(0, Math.floor(vault.count)),
    totalAwarded: Math.max(0, Math.floor(vault.totalAwarded)),
    awards: vault.awards,
  }));
}

function getNeoResultKeys(session: NeoResultSession, attemptId: string) {
  const resultAttemptId = session.resultUrl?.split("attemptId=")[1];
  const keys = [
    session.sessionId,
    session.id,
    attemptId,
    resultAttemptId ? decodeURIComponent(resultAttemptId) : "",
    session.resultUrl,
  ];
  return Array.from(new Set(keys.map((key) => String(key || "").trim()).filter(Boolean)));
}

function awardNeoResultBadge(resultKeys: string[], enabled: boolean): NeoBadgeAwardState {
  const vault = readNeoBadgeVault();
  const resultKey = resultKeys[0] || "";
  if (!enabled || !resultKey) {
    return {
      count: vault.count,
      currentBadgeIndex: 0,
      awardedNow: false,
    };
  }
  const existingBadgeIndex = resultKeys
    .map((key) => vault.awards[key])
    .find((badgeIndex) => Number.isInteger(badgeIndex));
  if (typeof existingBadgeIndex === "number" && Number.isInteger(existingBadgeIndex)) {
    return {
      count: vault.count,
      currentBadgeIndex: existingBadgeIndex,
      awardedNow: false,
    };
  }
  const currentBadgeIndex = vault.totalAwarded % NEO_RESULT_BADGE_COUNT;
  const nextVault = {
    count: Math.min(999, vault.count + 1),
    totalAwarded: vault.totalAwarded + 1,
    awards: resultKeys.reduce<Record<string, number>>((nextAwards, key) => ({
      ...nextAwards,
      [key]: currentBadgeIndex,
    }), vault.awards),
  };
  writeNeoBadgeVault(nextVault);
  return {
    count: nextVault.count,
    currentBadgeIndex,
    awardedNow: true,
  };
}

function hasNeoBenefitGrant(keys: string[]) {
  const grants = readNeoStorageRecord(NEO_LETTER_GRANTS_STORAGE_KEY);
  return keys.some((key) => Boolean(grants[key]));
}

function writeNeoBenefitGrant(keys: string[]) {
  if (typeof window === "undefined") return;
  const grants = readNeoStorageRecord(NEO_LETTER_GRANTS_STORAGE_KEY);
  const grant = {
    spentAt: new Date().toISOString(),
    cost: NEO_LETTER_BADGE_COST,
    benefits: ["pdf", "neoLetter"],
  };
  keys.forEach((key) => {
    grants[key] = grant;
  });
  window.localStorage.setItem(NEO_LETTER_GRANTS_STORAGE_KEY, JSON.stringify(grants));
}

function spendNeoBenefitBadges(keys: string[]): NeoBenefitSpendResult {
  const vault = readNeoBadgeVault();
  if (!keys.length) return { ok: false, count: vault.count, reason: "missing_key" };
  if (hasNeoBenefitGrant(keys)) return { ok: true, count: vault.count };
  if (vault.count < NEO_LETTER_BADGE_COST) return { ok: false, count: vault.count, reason: "not_enough" };
  writeNeoBadgeVault({
    ...vault,
    count: vault.count - NEO_LETTER_BADGE_COST,
  });
  writeNeoBenefitGrant(keys);
  return { ok: true, count: vault.count - NEO_LETTER_BADGE_COST };
}

function getNeoBenefitKeys(session: NeoResultSession, attemptId: string) {
  const keys = [
    session.sessionId,
    session.id,
    attemptId,
    session.resultUrl?.split("attemptId=")[1] ? decodeURIComponent(session.resultUrl.split("attemptId=")[1]) : "",
    session.resultUrl,
  ];
  return Array.from(new Set(keys.map((key) => String(key || "").trim()).filter(Boolean)));
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

function buildNeoSincereLetter(session: NeoResultSession, methodName: string) {
  const briefing = session.initialBriefing;
  const refined = session.refinedOrder;
  const title = refined?.operationTitle || briefing?.operationTitle || "이번 작전";
  const opening = briefing?.neoOpening || "오늘 네가 들고 온 질문은 가볍지 않았다.";
  const frontline = getBriefingFrontline(briefing);
  const stuckPoint = getRefinedStuckPoint(refined);
  const strategy = refined?.actionAlternatives?.[0]?.action || refined?.thirtyDayStrategy?.[0] || briefing?.originalStrategy?.description || "";
  const closing = refined?.tsundereClosing || briefing?.tsundereClosing || briefing?.nextStepPrompt || "";
  return [
    `너에게. ${title}을 정리하고 나서, 나는 잠깐 작전 테이블의 불을 낮췄다. ${methodName}의 지도 위에 남은 선은 생각보다 조용했지만, 그 조용함 안에는 네가 오래 참아 온 마음이 또렷하게 남아 있었다. ${opening}`,
    frontline
      ? `네 운명의 전선에서 가장 먼저 드러난 것은 이것이다. ${frontline} 이 말은 너를 몰아붙이려는 판정이 아니라, 네가 더는 스스로를 흐린 사람으로 오해하지 않도록 세워 둔 표식이다. 너는 무너진 것이 아니라, 너무 오래 같은 방식으로 버티느라 방향을 잠시 잃은 쪽에 가깝다.`
      : "네 운명의 전선에서 가장 먼저 드러난 것은, 네가 생각보다 약하지 않다는 사실이다. 다만 마음이 지칠 때마다 스스로를 뒤로 미루는 버릇이 있었고, 그 버릇이 운의 흐름을 조금씩 흐리게 만들었다.",
    stuckPoint.description
      ? `특히 마음에 남겨야 할 지점은 ${stuckPoint.title || "흔들리던 자리"}다. ${stuckPoint.description} 그래서 나는 네게 거창한 각오보다 작은 기준을 먼저 주고 싶다. 사람의 반응을 기다리기 전에 네 기준을 먼저 읽고, 불안이 커질수록 오늘 할 수 있는 한 가지를 작게 닫아라.`
      : "특히 마음에 남겨야 할 지점은 선택 직전의 침묵이다. 너는 답을 모르는 척했지만, 사실은 답을 고른 뒤 달라질 풍경을 먼저 두려워했다. 그래서 나는 네게 거창한 각오보다 작은 기준을 먼저 주고 싶다.",
    strategy
      ? `네가 본래 움직여야 하는 방식은 이미 안쪽에 있다. ${strategy} 이 흐름을 믿어라. 운은 멀리서 갑자기 떨어지는 상이 아니라, 네가 매일 선택하는 방향에 조용히 살을 붙인다. 오늘 하나를 정리하면 내일은 조금 덜 흔들리고, 내일 덜 흔들리면 다음 선택은 더 깨끗해진다.`
      : "네가 본래 움직여야 하는 방식은 이미 안쪽에 있다. 기준을 세우고, 감정이 가라앉은 뒤 행동을 닫고, 남의 표정이 아니라 네 안의 질서를 먼저 확인하는 것이다. 운은 멀리서 갑자기 떨어지는 상이 아니라, 네가 매일 선택하는 방향에 조용히 살을 붙인다.",
    `나는 네 편을 무조건 들어주려고 여기에 있는 것이 아니다. 하지만 네가 너 자신을 함부로 낮추는 순간에는, 꽤 단호하게 네 앞을 막을 것이다. 너는 계속 미뤄도 되는 사람이 아니라, 이제는 자기 삶의 작전권을 되찾아야 하는 사람이다. 겁이 있어도 괜찮다. 겁이 있다는 건 아직 소중히 지키고 싶은 것이 남아 있다는 뜻이니까.`,
    `${closing || "그러니 오늘은 흐리지 마라. 네가 알고 있는 한 가지부터 실행해라."} 사자 휘장 다섯 개를 내어준 만큼, 이 편지는 네가 다시 같은 밤으로 돌아갈 때 조용히 펼쳐 보라고 남긴다. 네오.`,
  ].join("\n\n");
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
    () => getNeoWarRoomMethodDefinition(selectedMethod) ?? neoWarRoomMethodRegistry[0],
    [selectedMethod],
  );

  useEffect(() => {
    let cancelled = false;
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
        setError("작전 명령서 식별값이 없다.");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const response = await authFetch(`/api/neo-operation-room/result?attemptId=${encodeURIComponent(attemptId)}`);
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok || !data?.ok) {
          const message = asErrorMessage(data) || (response.status === 401 ? "로그인이 필요하다." : "작전 명령서를 찾지 못했다.");
          setError(message);
          setSession(null);
          return;
        }
        setSession(data as NeoResultSession);
        setSelectedChecks(Array.isArray(data.realityCheck?.selectedChecks) ? data.realityCheck.selectedChecks : []);
        setFreeform(String(data.realityCheck?.freeform || ""));
        setShowRealityForm(!data.refinedOrder);
      } catch {
        if (!cancelled) setError("작전 명령서를 불러오지 못했다.");
      } finally {
        if (!cancelled) setLoading(false);
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
      setRefineError("체크 답변을 고르거나 현재 상황을 조금 더 적어라.");
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
      const response = await authFetch("/api/neo-operation-room/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.sessionId,
          selectedChecks,
          freeform: freeform.trim(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        throw new Error(asErrorMessage(data) || "수정 작전 명령서 작성에 실패했다.");
      }
      setSession(data as NeoResultSession);
      setShowRealityForm(false);
    } catch (caught) {
      setRefineError(caught instanceof Error ? caught.message : "수정 작전 명령서 작성에 실패했다.");
    } finally {
      setRefining(false);
    }
  }

  function handleUnlockNeoBenefits() {
    if (!session || benefitUnlocking || neoBenefitsUnlocked) return;
    if (isLocalPreview) {
      setBenefitUnlockError("미리보기에서는 사자 휘장이 실제로 움직이지 않는다.");
      return;
    }
    setBenefitUnlocking(true);
    setBenefitUnlockError("");
    const spendResult = spendNeoBenefitBadges(getNeoBenefitKeys(session, attemptId));
    setBadgeAward((current) => ({
      ...current,
      count: spendResult.count,
    }));
    if (spendResult.ok) {
      setNeoBenefitsUnlocked(true);
      setPdfError("");
    } else {
      setBenefitUnlockError(spendResult.reason === "missing_key"
        ? "이 작전 명령서를 다시 확인한 뒤 휘장을 사용해라."
        : "사자 휘장 5개가 모이면 PDF와 네오의 편지가 열린다.");
    }
    setBenefitUnlocking(false);
  }

  async function handlePdfDownload() {
    const element = documentRef.current;
    if (!element || pdfLoading) return;
    if (!neoBenefitsUnlocked) {
      setPdfError("사자 휘장 5개를 사용하면 PDF 저장이 열린다.");
      return;
    }
    setPdfLoading(true);
    setPdfError("");
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
      setPdfError("PDF로 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPdfLoading(false);
    }
  }

  const briefing = session?.initialBriefing || null;
  const refined = session?.refinedOrder || null;
  const isGenerating = loading || session?.status === "generating";
  const isFailed = Boolean(error) || session?.status === "generation_failed";
  const canUnlockNeoBenefits = !neoBenefitsUnlocked && !isLocalPreview && badgeAward.count >= NEO_LETTER_BADGE_COST;
  const neoLetterText = useMemo(
    () => neoBenefitsUnlocked && session ? buildNeoSincereLetter(session, methodLabel(selectedMethod)) : "",
    [neoBenefitsUnlocked, selectedMethod, session],
  );
  const backgroundStyle = {
    "--neo-bg-desktop": `url("${neoWarRoomAssets.backgrounds.desktop.src}")`,
    "--neo-bg-mobile": `url("${neoWarRoomAssets.backgrounds.mobile.src}")`,
  } as CSSProperties;
  const neoResultGradesAsset = resultSealGate.isMobile ? neoWarRoomAssets.badges.gradesMobile : neoWarRoomAssets.badges.grades;
  const neoResultStampAsset = resultSealGate.isMobile ? neoWarRoomAssets.badges.resultStampMobile : neoWarRoomAssets.badges.resultStamp;

  useEffect(() => {
    if (!session || isGenerating || isFailed) {
      setNeoBenefitsUnlocked(false);
      return;
    }
    setBadgeAward(awardNeoResultBadge(getNeoResultKeys(session, attemptId), !isLocalPreview));
    setNeoBenefitsUnlocked(hasNeoBenefitGrant(getNeoBenefitKeys(session, attemptId)));
    setBenefitUnlockError("");
  }, [attemptId, isFailed, isGenerating, isLocalPreview, session]);

  return (
    <main className={styles.shell} style={backgroundStyle}>
      <div className={styles.bg} aria-hidden="true" />
      <section className={styles.hero} aria-labelledby="neo-result-title">
        <div className={styles.heroCopy}>
          <span>Operation Order</span>
          <h1 id="neo-result-title">네오의 작전 명령서</h1>
          <p>{isGenerating ? "운명의 작전 지도가 아직 움직이고 있다." : "1차 브리핑과 2차 수정 명령서를 분리해서 보관한다."}</p>
        </div>
        <div className={styles.heroVisual} aria-hidden="true">
          <NeoWarRoomAssetImage
            asset={neoWarRoomAssets.hero.fullbody}
            alt=""
            priority
            sizes="(max-width: 768px) 62vw, 360px"
            className={styles.neoPortrait}
            imageClassName={styles.neoPortraitImage}
          />
          <NeoWarRoomAssetImage asset={neoWarRoomAssets.decor.asset1} alt="" sizes="110px" className={styles.decorOne} imageClassName={styles.decorImage} />
          <NeoWarRoomAssetImage asset={neoWarRoomAssets.decor.asset2} alt="" sizes="110px" className={styles.decorTwo} imageClassName={styles.decorImage} />
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
          <NeoWarRoomAssetImage asset={neoResultGradesAsset} alt="" sizes="86px" className={styles.stateSeal} imageClassName={styles.decorImage} />
          <h2>작전 브리핑 생성 중</h2>
          <p>계산과 LLM 작성이 끝나면 이 명령서에 결과가 찍힌다.</p>
        </section>
      ) : null}

      {isFailed ? (
        <section className={styles.stateCard} aria-live="assertive">
          <NeoWarRoomAssetImage asset={neoResultStampAsset} alt="" sizes="86px" className={styles.stateSeal} imageClassName={styles.decorImage} />
          <h2>작전 명령서 열람 실패</h2>
          <p>{error || session?.generationError?.message || "생성에 실패했다. 입력과 권한을 확인한 뒤 다시 시도해라."}</p>
          <Link href="/neo-operation-room" prefetch={false}>작전 다시 짜기</Link>
        </section>
      ) : null}

      {!isGenerating && !isFailed && session ? (
        <div className={styles.layout}>
          <aside className={styles.sidePanel}>
            <NeoWarRoomAssetImage
              asset={selectedMethodDefinition.coverAsset}
              alt={`${methodLabel(selectedMethod)} 표지`}
              sizes="280px"
              className={styles.methodCover}
              imageClassName={styles.methodCoverImage}
            />
            <div>
              <span>선택한 술수</span>
              <strong>{methodLabel(selectedMethod)}</strong>
              <p>{selectedMethodDefinition.resultEvidenceLabel}</p>
              <p>{session.topic || "작전 주제 미기록"}</p>
            </div>
          </aside>

          <section id="neo-operation-result-document" ref={documentRef} className={styles.documentStack}>
            <ResultSummaryCover
              session={session}
              methodName={methodLabel(selectedMethod)}
              badgeIndex={badgeAward.currentBadgeIndex}
            />
            {briefing ? (
              <InitialBriefingDocument
                briefing={briefing}
                evidenceFallbackLabel={selectedMethodDefinition.resultEvidenceLabel}
                hasRefined={Boolean(refined)}
                badgeIndex={badgeAward.currentBadgeIndex}
                onOpenReality={() => setShowRealityForm(true)}
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
              />
            ) : null}
            {refined ? <RefinedOrderDocument refined={refined} badgeIndex={badgeAward.currentBadgeIndex} /> : null}
            <CtaDeck attemptId={isLocalPreview ? "" : session.sessionId || attemptId} onOpenReality={() => setShowRealityForm(true)} hasRefined={Boolean(refined)} />
            <BadgeVaultPanel badgeAward={badgeAward} benefitsUnlocked={neoBenefitsUnlocked} />
            <section className={styles.actionBar} aria-label="작전 명령서 보관과 특전">
              <div className={styles.actionCopy}>
                <span>{refined ? "Final Order Ready" : "Briefing Ready"}</span>
                <strong>{refined ? "2차 수정 명령서까지 정리 완료" : "1차 작전 브리핑 정리 완료"}</strong>
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
                  <span>{benefitUnlocking ? "휘장 사용 중" : neoBenefitsUnlocked ? "특전 해금 완료" : "사자 휘장 5개 사용"}</span>
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
                  <span>{pdfLoading ? "PDF 저장 중" : neoBenefitsUnlocked ? "PDF 저장" : "PDF 잠금"}</span>
                </button>
              </div>
              {benefitUnlockError ? <p className={styles.unlockError} role="alert">{benefitUnlockError}</p> : null}
              {pdfError ? <p className={styles.pdfError} role="alert">{pdfError}</p> : null}
            </section>
            {neoLetterText ? (
              <NeoSincereLetter letter={neoLetterText} />
            ) : (
              <NeoLetterLockCard
                badgeAward={badgeAward}
                benefitsUnlocked={neoBenefitsUnlocked}
                canUnlock={canUnlockNeoBenefits}
                unlocking={benefitUnlocking}
                unlockError={benefitUnlockError}
                onUnlock={handleUnlockNeoBenefits}
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
  const stampAsset = badgeGate.isMobile ? neoWarRoomAssets.badges.resultStampMobile : neoWarRoomAssets.badges.resultStamp;
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

function BadgeVaultPanel({ badgeAward, benefitsUnlocked }: { badgeAward: NeoBadgeAwardState; benefitsUnlocked: boolean }) {
  const progress = Math.min(NEO_LETTER_BADGE_COST, badgeAward.count);
  const remaining = Math.max(0, NEO_LETTER_BADGE_COST - progress);
  const message = benefitsUnlocked
    ? "PDF와 네오의 편지가 열린 작전이다."
    : remaining === 0
      ? "휘장 다섯 개가 모였다. 이제 특전을 열 수 있다."
      : `${remaining}개가 더 모이면 PDF와 네오의 편지가 열린다.`;
  return (
    <div className={styles.badgeVault}>
      <LionBadgeStamp badgeIndex={badgeAward.currentBadgeIndex} className={styles.badgeVaultStamp} />
      <div className={styles.badgeVaultCopy}>
        <span>{badgeAward.awardedNow ? "새 휘장 수여" : "사자 휘장 보관함"}</span>
        <strong>{badgeAward.count}개 보유</strong>
        <p>{message}</p>
      </div>
      <div className={styles.badgeVaultSlots} aria-label={`사자 휘장 ${progress} / ${NEO_LETTER_BADGE_COST}`}>
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
}: {
  badgeAward: NeoBadgeAwardState;
  benefitsUnlocked: boolean;
  canUnlock: boolean;
  unlocking: boolean;
  unlockError: string;
  onUnlock: () => void;
}) {
  const progress = Math.min(NEO_LETTER_BADGE_COST, badgeAward.count);
  return (
    <article className={styles.neoLetterLockCard}>
      <header className={styles.documentHeader}>
        <span>네오가 남긴 편지</span>
        <h2>{benefitsUnlocked ? "네오의 편지가 열렸다" : "사자 휘장 다섯 개가 문을 연다"}</h2>
      </header>
      <p>지금은 {progress}/{NEO_LETTER_BADGE_COST}개가 봉인에 닿았다. 다섯 개를 사용하면 PDF 명령서와 네오의 편지가 함께 열린다.</p>
      <div className={styles.neoLetterLockActions}>
        <button type="button" disabled={!canUnlock || unlocking || benefitsUnlocked} onClick={onUnlock}>
          {unlocking ? <Loader2 className={styles.spinIcon} aria-hidden="true" /> : benefitsUnlocked ? <CheckCircle2 aria-hidden="true" /> : <Lock aria-hidden="true" />}
          <span>{unlocking ? "휘장 사용 중" : benefitsUnlocked ? "편지 해금 완료" : "사자 휘장 5개 사용"}</span>
        </button>
      </div>
      {unlockError ? <p className={styles.unlockError} role="alert">{unlockError}</p> : null}
    </article>
  );
}

function NeoSincereLetter({ letter }: { letter: string }) {
  return (
    <article className={styles.neoLetterCard} data-neo-pdf-page>
      <header className={styles.documentHeader}>
        <span>네오가 남긴 편지</span>
        <h2>사자 휘장 다섯 개로 열린 진심</h2>
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
}: {
  session: NeoResultSession;
  methodName: string;
  badgeIndex: number;
}) {
  const briefing = session.initialBriefing || null;
  const refined = session.refinedOrder || null;
  const issuedAt = formatDateKey(session.updatedAt || session.createdAt);
  return (
    <article className={`${styles.documentCard} ${styles.summaryCover}`} data-neo-pdf-page>
      <header className={styles.documentHeader}>
        <span>Neo Operation Order</span>
        <h2>{refined?.operationTitle || briefing?.operationTitle || "네오의 작전 명령서"}</h2>
      </header>
      <div className={styles.summaryGrid}>
        <section>
          <span>술수</span>
          <strong>{methodName}</strong>
        </section>
        <section>
          <span>작전 주제</span>
          <strong>{session.topic || "미기록"}</strong>
        </section>
        <section>
          <span>발급일</span>
          <strong>{issuedAt}</strong>
        </section>
      </div>
      {session.question ? <p className={styles.summaryQuestion}>{session.question}</p> : null}
      <div className={styles.summarySeal}>
        <LionBadgeStamp badgeIndex={badgeIndex} className={styles.stampImageFrame} />
        <p>{refined ? "현실 점검까지 반영한 최종 작전이다." : "1차 브리핑 기준으로 저장된 작전이다."}</p>
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
}: {
  briefing: NeoBriefing;
  evidenceFallbackLabel: string;
  hasRefined: boolean;
  badgeIndex: number;
  onOpenReality: () => void;
}) {
  const frontlineSummary = getBriefingFrontline(briefing);
  const repeatedChoice = getBriefingRepeatedChoice(briefing);
  const misalignedFlow = getBriefingMisalignedFlow(briefing);
  return (
    <article className={styles.documentCard} data-neo-pdf-page>
      <header className={styles.documentHeader}>
        <span>1차 작전 브리핑</span>
        <h2>{briefing.operationTitle || "무명 작전"}</h2>
      </header>
      <Section title="현재 운명의 전선" body={frontlineSummary} />
      {briefing.bluntTruth ? <blockquote className={styles.blunt}>{briefing.bluntTruth}</blockquote> : null}
      <Section title="바로 해야 할 작전" list={briefing.actionOrders} />
      {!hasRefined ? <button type="button" className={styles.primaryCta} onClick={onOpenReality}>수정 작전 명령서 받기</button> : null}
      <Section title="네오의 첫 판단" body={briefing.neoOpening} />
      <Section title={repeatedChoice.title || "반복되는 선택"} body={repeatedChoice.description} />
      <Section title={briefing.innateNature?.title || "타고난 성향의 핵"} body={briefing.innateNature?.description} list={briefing.innateNature?.keyTraits} />
      <Section
        title={briefing.innateStrength?.title || "타고난 강점과 약점"}
        body={briefing.innateStrength?.description}
        list={[
          ...(briefing.innateStrength?.strongPoints || []).map((point) => `💪 ${point}`),
          ...(briefing.innateStrength?.weakPoints || []).map((point) => `⚠ ${point}`),
        ]}
      />
      <Section title={briefing.topicStyle?.title || "이 주제에서 너의 방식"} body={briefing.topicStyle?.description} list={briefing.topicStyle?.keyPoints} />
      {briefing.topicAreas?.length ? (
        <Section title="주제 영역별 심층" list={briefing.topicAreas.map((item) => `${item.area} — ${item.reading}`)} />
      ) : null}
      <Section title={briefing.topicTiming?.title || "이 주제의 시기 흐름"} body={briefing.topicTiming?.description} list={briefing.topicTiming?.windows} />
      <Section title={briefing.originalStrategy?.title || "본래 너는 이렇게 움직여야 한다"} body={briefing.originalStrategy?.description} list={briefing.originalStrategy?.keyRules} />
      <Section title={misalignedFlow.title || "지금 흐름이 어긋난 자리"} body={misalignedFlow.description} />
      {briefing.methodEvidence?.length ? (
        <div className={styles.gridList}>
          {briefing.methodEvidence.map((item) => <Section key={`${item.method}-${item.label}`} title={item.label || evidenceFallbackLabel} body={item.summary} />)}
        </div>
      ) : null}
      <Section title={briefing.forbiddenAction?.title || "오늘 금지 행동"} body={briefing.forbiddenAction?.reason} />
      {briefing.sevenDayMission?.length ? (
        <div className={styles.missionGrid}>
          <strong>7일 작전</strong>
          {briefing.sevenDayMission.map((item) => (
            <section key={`${item.day}-${item.mission}`}>
              <span>DAY {item.day}</span>
              <p>{item.mission}</p>
            </section>
          ))}
        </div>
      ) : null}
      {briefing.realityCheckQuestions?.length ? (
        <div className={styles.questionList}>
          <strong>현실 점검 질문</strong>
          {briefing.realityCheckQuestions.map((item) => (
            <section key={item.question}>
              <p>{item.question}</p>
              <span>{item.whyItMatters}</span>
            </section>
          ))}
        </div>
      ) : null}
      {briefing.badge?.description ? (
        <div className={styles.badgeBlock}>
          <LionBadgeStamp badgeIndex={badgeIndex} className={styles.badgeImageFrame} />
          <div>
            <strong>오늘의 사자 휘장 · {briefing.badge.name || "무명 휘장"}</strong>
            <p>{briefing.badge.description}</p>
          </div>
          <LionBadgeStamp badgeIndex={(badgeIndex + 1) % NEO_RESULT_BADGE_COUNT} className={styles.stampImageFrame} />
        </div>
      ) : null}
      {briefing.tsundereClosing || briefing.nextStepPrompt ? <blockquote className={styles.blunt}>{briefing.tsundereClosing || briefing.nextStepPrompt}</blockquote> : null}
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
}: {
  selectedChecks: string[];
  setSelectedChecks: (updater: string[] | ((current: string[]) => string[])) => void;
  freeform: string;
  setFreeform: (value: string) => void;
  refining: boolean;
  refineError: string;
  onSubmit: () => void;
}) {
  return (
    <article className={styles.documentCard}>
      <header className={styles.documentHeader}>
        <span>현실 점검</span>
        <h2>네오에게 다시 반박하기</h2>
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
              {item}
            </button>
          );
        })}
      </div>
      <textarea
        value={freeform}
        maxLength={1000}
        placeholder={"네오에게 반박하거나, 현재 상황을 더 자세히 적어주세요.\n변명도 괜찮습니다. 네오가 알아서 걸러냅니다."}
        onChange={(event) => setFreeform(event.target.value)}
      />
      {refineError ? <p className={styles.errorText}>{refineError}</p> : null}
      <button type="button" className={styles.primaryCta} disabled={refining} onClick={onSubmit}>
        {refining ? "수정 작전 작성 중" : "수정 작전 명령서 받기"}
      </button>
    </article>
  );
}

function RefinedOrderDocument({ refined, badgeIndex }: { refined: NeoRefinedOrder; badgeIndex: number }) {
  return (
    <article className={styles.documentCard} data-version="v2" data-neo-pdf-page>
      <header className={styles.documentHeader}>
        <span>2차 수정 작전 명령서</span>
        <h2>{refined.operationTitle || "수정 작전"}</h2>
      </header>
      <Section title="전황 재판단" body={refined.neoReview} />
      <Section title={refined.verdict?.status ? `판정 · ${refined.verdict.status}` : "판정"} body={refined.verdict?.statement} />
      <Section title="판정 근거" body={refined.verdictBasis} />
      {refined.actionAlternatives?.length ? (
        <div className={styles.gridList}>
          {refined.actionAlternatives.map((item, index) => (
            <Section
              key={`${item.timing}-${index}`}
              title={item.timing ? `전선 조정 · ${item.timing}` : "전선 조정"}
              body={item.action}
              list={item.rationale ? [item.rationale] : undefined}
            />
          ))}
        </div>
      ) : null}
      {refined.peopleToMeet?.length ? (
        <div className={styles.gridList}>
          {refined.peopleToMeet.map((item, index) => (
            <Section
              key={`${item.role}-${index}`}
              title="만나야 할 사람"
              body={item.role}
              list={[item.complementaryEnergy, item.whereToFind ? `만날 곳 · ${item.whereToFind}` : ""].filter(Boolean) as string[]}
            />
          ))}
        </div>
      ) : null}
      <Section title="30일 전략" list={refined.thirtyDayStrategy} />
      <Section title="이번 주 첫 걸음" body={refined.thisWeekFirstStep} />
      <Section title={refined.forbiddenAction?.title || "오늘 금지 행동"} body={refined.forbiddenAction?.reason} />
      <div className={styles.badgeBlock}>
        <LionBadgeStamp badgeIndex={badgeIndex} className={styles.badgeImageFrame} />
        <div>
          <strong>오늘의 사자 휘장 · {refined.badge?.name || "무명 휘장"}</strong>
          <p>{refined.badge?.description}</p>
        </div>
        <LionBadgeStamp badgeIndex={(badgeIndex + 1) % NEO_RESULT_BADGE_COUNT} className={styles.stampImageFrame} />
      </div>
      <blockquote className={styles.blunt}>{refined.tsundereClosing}</blockquote>
    </article>
  );
}

function Section({ title, body, list }: { title: string; body?: string; list?: string[] }) {
  if (!body && !list?.length) return null;
  return (
    <section className={styles.sectionCard}>
      <h3>{title}</h3>
      {body ? <p>{body}</p> : null}
      {list?.length ? <ul>{list.map((item) => <li key={item}>{item}</li>)}</ul> : null}
    </section>
  );
}

function CtaDeck({ attemptId, hasRefined, onOpenReality }: { attemptId: string; hasRefined: boolean; onOpenReality: () => void }) {
  return (
    <nav className={styles.ctaDeck} aria-label="작전 명령서 다음 행동">
      <button type="button" onClick={onOpenReality}>{hasRefined ? "네오에게 다시 반박하기" : "수정 작전 명령서 받기"}</button>
      <Link href="/neo-operation-room" prefetch={false}>작전 다시 짜기</Link>
      <Link href="/neo-operation-room" prefetch={false}>다른 술수로 다시 분석하기</Link>
      <Link href="/fortune-tea-house">연이의 운명 찻집으로 가기</Link>
      {attemptId ? <Link href={`/neo-operation-room/result?attemptId=${encodeURIComponent(attemptId)}`}>작전 명령서 다시 열기</Link> : null}
    </nav>
  );
}
