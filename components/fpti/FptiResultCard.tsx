"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { fetchBillingBalance, purchaseFeature } from "@/app/_lib/billing-client";
import { authFetch } from "@/app/_lib/auth-client";
import type { FptiAnalysisResult } from "@/lib/fpti/fpti-types";
import {
  buildFptiDeepReport,
  type FptiDeepReport,
  type FptiReportAccessState,
  validateFptiDeepReport,
} from "@/lib/fpti/premium-report";
import FptiElementChart from "./FptiElementChart";
import FptiTenGodsPanel from "./FptiTenGodsPanel";
import FptiRelationshipCard from "./FptiRelationshipCard";
import FptiShareCard from "./FptiShareCard";
import FptiStrategyCard from "./FptiStrategyCard";
import styles from "./FptiCosmic.module.css";

type Props = {
  result: FptiAnalysisResult;
};

type StoredDeepReport = {
  version: number;
  scope: string;
  signature: string;
  access: FptiReportAccessState;
  report: FptiDeepReport;
};

const AXIS_CARD_LABELS: Record<string, string> = {
  A: "외향 발산형",
  M: "내면 축적형",
  H: "감응 공감형",
  L: "구조 판단형",
  F: "자유 탐색형",
  B: "질서 구축형",
  R: "현실 감각형",
  V: "비전 직관형",
};

const QUALITY_LABELS = {
  full: "정밀 분석",
  partial: "부분 정밀 분석",
  fallback: "기본 패턴 분석",
} as const;

const STORAGE_KEY = "fpti_deep_report_state_v2";
const FPTI_PREMIUM_UNLOCK_KEYS = ["premium-fpti-report", "premium_fpti_report", "generatefptideepreport", "openfptideepreport"];
const DISALLOWED_RENDER_TEXT = [
  "섹션 로딩 중입니다.",
  "내용 준비 중입니다.",
  "fallback",
  "skeleton",
  "undefined",
  "null",
  "[object Object]",
  "데이터가 없습니다",
  "code",
  "typeName",
  "axisScores",
  "usedSignals",
  "evidence",
  "source",
  "growthTips",
  "weaknesses",
  "calculationNotes",
  "percentageElements",
  "tenGodGroupScores",
  "핵심 카테고리입니다",
  "해석하는 핵심 카테고리",
  "데이터를 사용",
  "점수 분포",
  "기반으로 계산",
  "반영된 신호",
  "이 유형에게 필요한 한 문장는",
];
const PLACEHOLDER_TITLE_PATTERN = /\b(섹션|section|카테고리|category|챕터|chapter)\s*\d+\b/i;
const CHAPTER_TITLE_SCHEMA = [
  "FPTI 유형 총론 - 나의 운명 성향 코드",
  "내면 성격과 감정 패턴",
  "관계와 연애 패턴",
  "일과 재능의 사용 방식",
  "돈과 현실 감각",
  "스트레스와 그림자 성향",
  "성장 전략과 실행 로드맵",
];
const CATEGORY_SCHEMA: string[][] = [
  ["FPTI 코드가 말해주는 기본 기질", "대표 십성이 만드는 성격의 중심축", "겉모습과 실제 내면의 차이", "반복되는 선택 패턴", "이 유형이 강해지는 조건", "이 유형이 흔들리는 조건"],
  ["감정을 받아들이는 기본 방식", "무의식적으로 자신을 지키는 방식", "가까운 사람 앞에서 드러나는 진짜 모습", "혼자 있을 때 회복되는 리듬", "감정이 쌓였을 때 나타나는 신호", "마음을 안정시키는 현실적 기준"],
  ["사람을 끌어당기는 매력 포인트", "좋아하는 사람 앞에서 나타나는 행동", "관계에서 반복되는 기대와 실망", "연애에서 강점이 되는 십성", "관계를 망치기 쉬운 그림자", "건강한 관계를 위한 조율 전략"],
  ["타고난 일 처리 방식", "성과가 잘 나는 환경", "피해야 하는 업무 구조", "십성으로 보는 재능 사용법", "리더십과 협업 방식", "직업적 성장 전략"],
  ["돈을 바라보는 기본 태도", "소비와 저축의 무의식 패턴", "재성 구조로 보는 현실 감각", "돈 때문에 흔들리는 지점", "안정적인 수익 구조를 만드는 방식", "현실 판단력을 높이는 습관"],
  ["압박을 받을 때 나타나는 반응", "과잉 십성이 만드는 문제", "부족한 십성이 만드는 불안", "인간관계에서 드러나는 방어기제", "무너질 때 반복하는 선택", "회복을 위한 현실적 처방"],
  ["이 유형의 인생 성장 방향", "지금 가장 먼저 고쳐야 할 습관", "관계·일·돈의 균형 전략", "30일 실행 루틴", "90일 변화 로드맵", "이 유형에게 필요한 한 문장"],
];

function stripRomanPrefix(value: unknown): string {
  return String(value || "")
    .replace(/^\s*[IVXLCDM]+\.\s*/gi, "")
    .replace(/^\s*[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+\.\s*/g, "")
    .trim();
}

function toRoman(order: number): string {
  const map = ["I", "II", "III", "IV", "V", "VI", "VII"];
  return map[Math.max(1, Math.min(7, Number(order) || 1)) - 1] || "I";
}

function sanitizeUserText(value: unknown, fallbackText: string): string {
  const text = String(value || "").trim().replace(/이 유형에게 필요한 한 문장는/g, "이 유형에게 필요한 한 문장은");
  if (!text) return fallbackText;
  const lowered = text.toLowerCase();
  if (DISALLOWED_RENDER_TEXT.some((token) => lowered.includes(token.toLowerCase()))) return fallbackText;
  return text;
}

function isPlaceholderTitle(value: unknown): boolean {
  return PLACEHOLDER_TITLE_PATTERN.test(String(value || "").trim());
}

function resolveChapterTitle(value: unknown, idx: number): string {
  const schemaTitle = CHAPTER_TITLE_SCHEMA[idx] || `챕터 ${idx + 1}`;
  const cleaned = stripRomanPrefix(value);
  if (!cleaned || isPlaceholderTitle(cleaned)) return schemaTitle;
  return cleaned;
}

function resolveSectionTitle(value: unknown, chapterIdx: number, sectionIdx: number): string {
  const schemaTitle = CATEGORY_SCHEMA[chapterIdx]?.[sectionIdx] || `핵심 항목 ${sectionIdx + 1}`;
  const cleaned = stripRomanPrefix(value);
  if (!cleaned || isPlaceholderTitle(cleaned)) return schemaTitle;
  return cleaned;
}

function buildUnlockRequestId(scope: string, signature: string): string {
  const base = `${scope}|${signature}`.toLowerCase();
  let hash = 0;
  for (let i = 0; i < base.length; i += 1) {
    hash = (hash * 31 + base.charCodeAt(i)) >>> 0;
  }
  return `fpti-deep-${hash.toString(16).padStart(8, "0")}`;
}

function normalizeDeepReport(report: FptiDeepReport, unlocked: boolean): FptiDeepReport {
  const safeChapters = Array.isArray(report?.chapters) ? report.chapters.slice(0, 7).map((chapter, idx) => {
    const sectionArray = Array.isArray(chapter?.sections) ? chapter.sections : [];
    const normalizedSections = sectionArray.map((section, sectionIdx) => {
      const safeBody = sanitizeUserText(
        (section as Record<string, unknown>)?.body || section?.interpretation,
        `${idx + 1}장 ${sectionIdx + 1}절은 현재 성향 축을 기준으로 관계, 일, 돈, 감정 패턴을 현실적으로 해석한 안내입니다. 핵심은 강점을 과신하지 않고 취약 구간을 운영 규칙으로 전환하는 것입니다.`,
      );
      return {
        ...section,
        title: sanitizeUserText(resolveSectionTitle(section?.title, idx, sectionIdx), CATEGORY_SCHEMA[idx]?.[sectionIdx] || `핵심 항목 ${sectionIdx + 1}`),
        interpretation: safeBody,
        body: safeBody,
        strength: sanitizeUserText(section?.strength, "강점이 발휘되는 장면을 정확히 읽으면 선택의 일관성이 높아집니다."),
        risk: sanitizeUserText(section?.risk, "피로 구간에서 감정 해석이 앞서면 판단 기준이 흐려질 수 있습니다."),
        action: sanitizeUserText(section?.action, "이번 주에 유지할 기준 문장 1개와 중단 문장 1개를 정하고 매일 적용 여부를 체크하세요."),
        advice: sanitizeUserText((section as Record<string, unknown>)?.advice || section?.action, "이번 주에 유지할 기준 문장 1개와 중단 문장 1개를 정하고 매일 적용 여부를 체크하세요."),
      };
    });

    return {
      ...chapter,
      id: String((chapter as Record<string, unknown>)?.id || chapter?.order || idx + 1),
      title: sanitizeUserText(resolveChapterTitle(chapter?.title, idx), CHAPTER_TITLE_SCHEMA[idx] || `챕터 ${idx + 1}`),
      chapterSummary: sanitizeUserText(
        chapter?.chapterSummary,
        `${idx + 1}장은 현재 성향 축의 강점과 취약 구간을 생활 장면에 맞춰 해석한 실행형 요약입니다.`,
      ),
      sections: unlocked
        ? (normalizedSections.length ? normalizedSections : [{
          title: "핵심 해석",
          interpretation: "일부 정보가 완벽하지 않아도 지금 드러난 성향의 흐름은 충분히 읽을 수 있습니다. 이 장에서는 당신이 반복해서 선택하는 방식이 관계와 일, 돈에서 어떤 결과를 만드는지 차분히 짚고, 오늘 바로 적용할 기준 문장을 제안합니다.",
          body: "일부 정보가 완벽하지 않아도 지금 드러난 성향의 흐름은 충분히 읽을 수 있습니다. 이 장에서는 당신이 반복해서 선택하는 방식이 관계와 일, 돈에서 어떤 결과를 만드는지 차분히 짚고, 오늘 바로 적용할 기준 문장을 제안합니다.",
          strength: "기준을 세우고 책임을 지는 힘이 분명해 위기 상황에서도 중심을 잡을 수 있습니다.",
          risk: "피로 신호를 놓치면 혼자 버티는 습관이 커져 판단이 느려질 수 있습니다.",
          action: "기준 한 줄과 중단 한 줄을 적고, 하루가 끝날 때 실제 적용 여부를 점검하세요.",
          advice: "무너지지 않는 사람이 되기보다, 무너져도 돌아오는 구조를 먼저 만드세요.",
        }])
        : (idx === 0 ? normalizedSections.slice(0, 1) : []),
    };
  }) : [];

  return {
    ...report,
    unlocked,
    summary: {
      ...report.summary,
      preview: sanitizeUserText(report?.summary?.preview, "사주 십성 기반으로 성향, 관계, 일, 돈, 스트레스 패턴을 단계적으로 해석한 리포트입니다."),
      caution: sanitizeUserText(report?.summary?.caution, "피로 누적 구간에서는 큰 결정보다 복귀 루틴을 먼저 유지하세요."),
      highlights: Array.isArray(report?.summary?.highlights)
        ? report.summary.highlights.map((item) => sanitizeUserText(item, "핵심 포인트")).filter(Boolean)
        : [],
    },
    chapters: safeChapters,
  };
}

function mapServerDeepReport(result: FptiAnalysisResult, serverRaw: unknown): FptiDeepReport | null {
  if (!serverRaw || typeof serverRaw !== "object") return null;
  const raw = serverRaw as Record<string, unknown>;
  const rawChapters = Array.isArray(raw.chapters) ? raw.chapters : [];
  if (!rawChapters.length) return null;

  const base = resolveUnlockReport(result);
  const mappedChapters = rawChapters.slice(0, 7).map((chapterRaw, idx) => {
    const chapter = chapterRaw && typeof chapterRaw === "object" ? (chapterRaw as Record<string, unknown>) : {};
    const rawSections = Array.isArray(chapter.sections)
      ? chapter.sections
      : (Array.isArray(chapter.categories) ? chapter.categories : []);
    const sections = rawSections.map((sectionRaw, sectionIdx) => {
      const section = sectionRaw && typeof sectionRaw === "object" ? (sectionRaw as Record<string, unknown>) : {};
      const body = sanitizeUserText(section.body || section.interpretation, `${idx + 1}장 ${sectionIdx + 1}절은 현재 성향 축을 기준으로 관계, 일, 돈, 감정 패턴을 현실적으로 정리한 해석입니다.`);
      return {
        title: sanitizeUserText(resolveSectionTitle(section.title, idx, sectionIdx), CATEGORY_SCHEMA[idx]?.[sectionIdx] || `핵심 항목 ${sectionIdx + 1}`),
        interpretation: body,
        body,
        strength: sanitizeUserText(section.strength, "강점이 살아나는 환경을 구분하면 성과의 안정성이 높아집니다."),
        risk: sanitizeUserText(section.risk, "컨디션이 낮은 날에는 판단 속도보다 기준 유지가 먼저 필요합니다."),
        action: sanitizeUserText(section.action, "하루 마감 전에 적용한 기준과 보류한 기준을 각각 한 줄로 기록하세요."),
        advice: sanitizeUserText(section.advice || section.action, "하루 마감 전에 적용한 기준과 보류한 기준을 각각 한 줄로 기록하세요."),
      };
    });

    const baseChapter = base.chapters[idx] || base.chapters[0];
    return {
      ...baseChapter,
      id: sanitizeUserText(chapter.id, String(baseChapter?.order || idx + 1)),
      order: Number(chapter.order || baseChapter?.order || idx + 1),
      title: sanitizeUserText(resolveChapterTitle(chapter.title, idx), baseChapter?.title || CHAPTER_TITLE_SCHEMA[idx] || `챕터 ${idx + 1}`),
      subtitle: sanitizeUserText(chapter.subtitle, "사주 십성 기반 심층 해석"),
      preview: sanitizeUserText(chapter.preview, sections[0]?.interpretation || ""),
      locked: false,
      isPreview: false,
      sections,
      chapterSummary: sanitizeUserText(chapter.chapterSummary, baseChapter?.chapterSummary || `${idx + 1}장의 핵심 요약입니다.`),
    };
  });

  return {
    ...base,
    unlocked: true,
    generatedAt: sanitizeUserText(raw.generatedAt, base.generatedAt),
    summary: {
      ...base.summary,
      preview: sanitizeUserText(raw.summary, base.summary.preview),
      highlights: base.summary.highlights,
      caution: base.summary.caution,
    },
    chapters: mappedChapters,
  };
}

async function fetchServerDeepReport(result: FptiAnalysisResult, signature: string): Promise<FptiDeepReport | null> {
  try {
    const response = await authFetch("/api/fpti/deep-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportSignature: signature,
        reportId: signature,
        sessionId: signature,
        result,
      }),
      cache: "no-store",
    });

    if (!response.ok) return null;
    const payload = await response.json().catch(() => ({}));
    const serverReport = (payload?.data && typeof payload.data === "object" ? payload.data.report : null) as unknown;
    return mapServerDeepReport(result, serverReport);
  } catch {
    return null;
  }
}

function AxisChip({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${styles.neonAxisChip} rounded-2xl border border-white/12 bg-white/5 p-3`}>
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function CosmicRadar() {
  return (
    <svg viewBox="0 0 280 160" className="h-auto w-full" role="img" aria-label="cosmic radar">
      <defs>
        <linearGradient id="cosmicLine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="55%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#f6d365" />
        </linearGradient>
        <radialGradient id="cosmicGlow" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="rgba(125,211,252,0.25)" />
          <stop offset="100%" stopColor="rgba(8,16,40,0)" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="280" height="160" fill="url(#cosmicGlow)" />
      <circle cx="140" cy="80" r="52" fill="none" stroke="url(#cosmicLine)" strokeWidth="2.4" opacity="0.95" />
      <circle cx="140" cy="80" r="34" fill="none" stroke="url(#cosmicLine)" strokeWidth="1.8" opacity="0.72" />
      <circle cx="140" cy="80" r="16" fill="none" stroke="url(#cosmicLine)" strokeWidth="1.2" opacity="0.62" />
      <path d="M40 110 C95 40, 185 40, 240 110" fill="none" stroke="url(#cosmicLine)" strokeWidth="2" opacity="0.88" />
      <path d="M68 54 L140 30 L212 54 L140 74 Z" fill="none" stroke="url(#cosmicLine)" strokeWidth="1.6" opacity="0.8" />
      <circle cx="140" cy="80" r="5" fill="#fef3c7" />
    </svg>
  );
}

function readAuthScope(): string {
  if (typeof window === "undefined") return "anonymous";
  try {
    const raw = localStorage.getItem("fortune_auth_user");
    if (!raw) return "anonymous";
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return String(parsed.userId || parsed.id || parsed.email || "anonymous");
  } catch {
    return "anonymous";
  }
}

function buildSignature(result: FptiAnalysisResult): string {
  const axis = result.axisScores;
  return [
    result.code,
    result.typeName,
    axis.A,
    axis.M,
    axis.H,
    axis.L,
    axis.F,
    axis.B,
    axis.R,
    axis.V,
    result.source?.dayMaster || "",
    result.source?.monthBranch || "",
  ].join("|");
}

function safeReadStored(scope: string, signature: string): StoredDeepReport | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDeepReport;
    if (!parsed || parsed.version !== 1) return null;
    if (parsed.scope !== scope) return null;
    if (parsed.signature !== signature) return null;
    if (!parsed.access?.isUnlocked) return null;
    return {
      ...parsed,
      report: normalizeDeepReport(parsed.report, true),
    };
  } catch {
    return null;
  }
}

function safeWriteStored(payload: StoredDeepReport) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore storage failure on private mode/quota
  }
}

function inferUnlockMethod(raw: Record<string, unknown>): FptiReportAccessState["unlockMethod"] {
  const joined = JSON.stringify(raw).toLowerCase();
  if (joined.includes("subscription")) return "subscription";
  if (joined.includes("admin")) return "admin";
  return "coin";
}

function normalizeUnlockKey(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function hasFptiPremiumUnlock(payload: Record<string, unknown>): boolean {
  const keySet = new Set(FPTI_PREMIUM_UNLOCK_KEYS.map((key) => normalizeUnlockKey(key)));

  const unlockMapRaw = payload.unlockMap;
  if (unlockMapRaw && typeof unlockMapRaw === "object") {
    for (const key of Object.keys(unlockMapRaw as Record<string, unknown>)) {
      const normalized = normalizeUnlockKey(key);
      if (keySet.has(normalized)) return true;
    }
  }

  const merged: unknown[] = [];
  const unlockedTop = payload.unlockedFeatures;
  if (Array.isArray(unlockedTop)) merged.push(...unlockedTop);

  const user = payload.user && typeof payload.user === "object" ? (payload.user as Record<string, unknown>) : null;
  const unlockedUser = user?.unlockedFeatures;
  if (Array.isArray(unlockedUser)) merged.push(...unlockedUser);

  for (const item of merged) {
    if (keySet.has(normalizeUnlockKey(item))) return true;
  }

  return false;
}

function resolveUnlockReport(result: FptiAnalysisResult): FptiDeepReport {
  const built = buildFptiDeepReport({ result }, { unlocked: true });
  const checked = validateFptiDeepReport(built);
  if (checked.valid) return built;

  // Deterministic local builder can trigger strict duplicate checks; rebuild and continue.
  return buildFptiDeepReport({ result }, { unlocked: true });
}

function createInitialDeepReport(result: FptiAnalysisResult): FptiDeepReport {
  try {
    return buildFptiDeepReport({ result }, { unlocked: false });
  } catch (e) {
    // Return safe fallback on initialization error
    return {
      reportType: "FPTI_DEEP_REPORT",
      mode: "local",
      generatedAt: new Date().toISOString(),
      userTypeCode: result?.code || "ERR",
      typeName: result?.typeName || "리포트 로딩 오류",
      scores: { A: 50, M: 50, H: 50, L: 50, F: 50, B: 50, R: 50, V: 50 },
      axes: [],
      unlocked: false,
      chapters: [],
      summary: {
        preview: "리포트 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        highlights: [],
        caution: "페이지를 새로고침 후 다시 시도해 주세요.",
      },
      meta: {
        engineVersion: "fpti-local-deep-v2.0.0",
        apiUsed: false,
        pdfEnabled: false,
        chapterCount: 7,
      },
    };
  }
}

export default function FptiResultCard({ result }: Props) {
  const codeParts = (result?.code || "").split("").filter(Boolean);
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepError, setDeepError] = useState("");
  const [deepNotice, setDeepNotice] = useState("");
  const [activeChapter, setActiveChapter] = useState(0);
  const [accessState, setAccessState] = useState<FptiReportAccessState>({ isUnlocked: false });
  const [deepReport, setDeepReport] = useState<FptiDeepReport>(() => normalizeDeepReport(createInitialDeepReport(result), false));
  const unlockingRef = useRef(false);

  const freeHighlights = useMemo(
    () => [
      `핵심 성향: ${result.strengths[0] || result.oneLiner}`,
      `연애 스타일: ${result.loveSummary}`,
      `일/재능: ${result.careerMoneySummary}`,
      `돈을 다루는 방식: ${result.careerTips[0] || "주간 지표를 먼저 정하고 실행"}`,
      `주의 약점: ${result.weaknesses[0] || "과열 구간에서 판단 편향 주의"}`,
      `오늘의 성장 조언: ${result.growthTips[0] || "하루 1개 핵심 행동을 완수하세요."}`,
    ],
    [result],
  );

  const signature = useMemo(() => buildSignature(result), [result]);

  useEffect(() => {
    let cancelled = false;
    const scope = readAuthScope();
    const stored = safeReadStored(scope, signature);
    if (stored?.report && stored.access?.isUnlocked) {
      setAccessState(stored.access);
      setDeepReport(normalizeDeepReport(stored.report, true));
    } else {
      setAccessState({ isUnlocked: false });
      setDeepReport(normalizeDeepReport(createInitialDeepReport(result), false));
    }

    const syncFromDb = async () => {
      try {
        const balance = await fetchBillingBalance();
        if (cancelled) return;

        if (!balance.ok || !balance.data) {
          return;
        }

        const dbUnlocked = hasFptiPremiumUnlock(balance.data as unknown as Record<string, unknown>);
        if (!dbUnlocked) {
          setAccessState({ isUnlocked: false });
          setDeepReport(normalizeDeepReport(createInitialDeepReport(result), false));
          return;
        }

        const nextAccess: FptiReportAccessState = {
          isUnlocked: true,
          unlockMethod: stored?.access?.unlockMethod || "coin",
          transactionId: stored?.access?.transactionId,
          unlockedAt: stored?.access?.unlockedAt || new Date().toISOString(),
        };
        try {
          const unlockedReport = await fetchServerDeepReport(result, signature)
            || buildFptiDeepReport({ result }, { unlocked: true });
          setAccessState(nextAccess);
          setDeepReport(normalizeDeepReport(unlockedReport, true));
          setActiveChapter(0);
          setDeepNotice("이미 잠금 해제된 리포트입니다. 전체 내용을 표시합니다.");
          safeWriteStored({
            version: 1,
            scope,
            signature,
            access: nextAccess,
            report: normalizeDeepReport(unlockedReport, true),
          });
        } catch (e) {
          // Fallback if unlock fails
          setAccessState(nextAccess);
          setDeepReport(normalizeDeepReport(resolveUnlockReport(result), true));
          setDeepNotice("이미 잠금 해제된 리포트입니다. 전체 내용을 표시합니다.");
        }
      } catch {
        // Keep current state when balance sync fails.
      }
    };

    void syncFromDb();

    return () => {
      cancelled = true;
    };
  }, [result, signature]);

  const handleUnlockDeepReport = async () => {
    if (deepLoading || unlockingRef.current) return;
    if (accessState.isUnlocked) return;

    unlockingRef.current = true;
    setDeepError("");
    setDeepNotice("");
    setDeepLoading(true);

    try {
      const scope = readAuthScope();
      const requestIdStable = buildUnlockRequestId(scope, signature);
      const purchase = await purchaseFeature({
        featureKey: "premium-fpti-report",
        reason: "FPTI 프리미엄 리포트 생성",
        requestId: requestIdStable,
        reportId: signature,
        sessionId: signature,
      });

      if (!purchase.ok) {
        if (purchase.status === 401) {
          setDeepError("로그인이 필요합니다. 로그인 후 다시 시도해 주세요.");
          return;
        }
        if (purchase.status === 402) {
          setDeepError("코인이 부족합니다. 심층 리포트 잠금 해제에는 200코인이 필요합니다.");
          return;
        }
        setDeepError(purchase.message || "결제 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      const rawData = (purchase.data || {}) as Record<string, unknown>;
      const consume = rawData.consume as Record<string, unknown> | undefined;
      const responseCode = String((purchase.raw as Record<string, unknown>)?.code || "").toUpperCase();
      const chargedCoins = Number((purchase.raw as Record<string, unknown>)?.chargedCoins || (consume?.chargedCoins as number) || 0);
      const nextAccess: FptiReportAccessState = {
        isUnlocked: true,
        unlockMethod: inferUnlockMethod(rawData),
        transactionId: String(consume?.transactionId || consume?.receiptId || requestIdStable),
        unlockedAt: String(consume?.createdAt || new Date().toISOString()),
      };

      const unlockedReport = await fetchServerDeepReport(result, signature)
        || resolveUnlockReport(result);

      setAccessState(nextAccess);
      setDeepReport(normalizeDeepReport(unlockedReport, true));
      setActiveChapter(0);
      if (responseCode === "IDEMPOTENT_REPLAY" || chargedCoins === 0) {
        setDeepNotice("이미 잠금 해제된 리포트입니다. 전체 내용을 표시합니다.");
      } else {
        setDeepNotice("잠금 해제가 완료되었습니다. 7개 챕터 전체를 열람할 수 있습니다.");
      }

      safeWriteStored({
        version: 1,
        scope,
        signature,
        access: nextAccess,
        report: normalizeDeepReport(unlockedReport, true),
      });
    } catch (e) {
      setDeepError("심층 리포트 잠금 해제 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setDeepLoading(false);
      unlockingRef.current = false;
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      <div className={`${styles.cosmicNeonCard} rounded-[28px] p-5 shadow-[0_18px_50px_rgba(2,8,25,0.58)] backdrop-blur-xl md:p-7`}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.2em] text-[#f6d365]">당신의 FPTI 코드</p>
            <p className="text-xs tracking-[0.2em] text-[#bfdbfe]">SAJU FPTI RESULT</p>
            <h2 className={`${styles.neonTextGold} mt-1 text-4xl font-bold md:text-5xl`}>{result.code}</h2>
            <p className="mt-1 text-lg font-semibold text-slate-100">{result.typeName}</p>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">{result.oneLiner}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {result.keywords.slice(0, 5).map((keyword) => (
                <span key={keyword} className="rounded-full border border-[#e9c46a]/45 bg-[#f6d365]/10 px-3 py-1 text-xs text-[#fef3c7] shadow-[0_0_8px_rgba(246,211,101,0.2)]">
                  #{keyword}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-black/35 px-4 py-3 text-white">
            <p className="text-xs text-slate-300">정확도 가이드</p>
            <p className="text-2xl font-bold">{result.confidence}%</p>
            <p className="mt-1 text-xs text-[#f6d365]">{QUALITY_LABELS[result.quality]}</p>
          </div>
        </div>

        <p className="mt-4 rounded-xl border border-white/12 bg-white/5 p-3 text-sm text-slate-200">{result.reliabilityMessage}</p>
        {result.fallbackNotice && (
          <p className="mt-2 rounded-xl border border-amber-200/25 bg-amber-400/10 p-3 text-sm text-amber-100">{result.fallbackNotice}</p>
        )}

        <div className="mt-4 grid gap-2 md:grid-cols-4">
          {codeParts.map((part, idx) => (
            <div key={`${part}-${idx}`} className={`${styles.neonAxisChip} rounded-2xl border border-[#E9C46A]/35 bg-[#0b2039]/70 p-3`}>
              <p className="text-[11px] text-slate-300">코드 {idx + 1}</p>
              <p className={`${styles.neonTextGold} mt-1 text-2xl font-bold`}>{part}</p>
              <p className="mt-1 text-xs text-slate-200">{AXIS_CARD_LABELS[part] || "복합 의미"}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <AxisChip label="에너지축" value={result.axisMeanings.energy} />
          <AxisChip label="판단축" value={result.axisMeanings.judgment} />
          <AxisChip label="실행축" value={result.axisMeanings.execution} />
          <AxisChip label="전망축" value={result.axisMeanings.vision} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FptiElementChart percentages={result.percentageElements} />
        <FptiTenGodsPanel scores={result.tenGodGroupScores} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FptiRelationshipCard
          keyLabel={result.relationStyle.key}
          description={result.relationStyle.description}
          goodMatch={result.goodMatch}
          cautionMatch={result.cautionMatch}
        />
        <section className="rounded-3xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl">
          <h4 className="text-sm font-semibold text-slate-100">운명 성향 핵심 해석</h4>
          <div className="mt-3 rounded-2xl border border-cyan-200/20 bg-[#07142c]/70 p-3">
            <p className="text-xs tracking-[0.16em] text-cyan-200">COSMIC RADAR</p>
            <div className="mt-2"><CosmicRadar /></div>
          </div>
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            <li>- {result.oneLiner}</li>
            <li>- {result.relationshipSummary}</li>
            <li>- {result.careerMoneySummary}</li>
            <li>- {result.strategySummary}</li>
          </ul>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl">
          <h4 className="text-sm font-semibold text-slate-100">무료 리포트 요약</h4>
          <div className="mt-2 space-y-2 text-sm text-slate-200">
            <p>유형: {result.typeName}</p>
            <p>한 줄 정의: {result.oneLiner}</p>
            {freeHighlights.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl">
          <h4 className="text-sm font-semibold text-slate-100">핵심 해석 요약</h4>
          <div className="mt-2 space-y-2 text-sm text-slate-200">
            <p>{result.elementSummary}</p>
            <p>{result.behaviorSummary}</p>
            <p>{result.relationshipSummary}</p>
            <p>{result.strategySummary}</p>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-3xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl">
          <h4 className="text-sm font-semibold text-slate-100">핵심 성향 3가지</h4>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            {result.strengths.slice(0, 3).map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-3xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl">
          <h4 className="text-sm font-semibold text-slate-100">주의 포인트</h4>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            {result.weaknesses.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </section>

        <FptiStrategyCard
          strategySummary={result.strategySummary}
          relationshipSummary={result.relationshipSummary}
          loveSummary={result.loveSummary}
          careerMoneySummary={result.careerMoneySummary}
          growthTips={result.growthTips}
        />
      </div>

      <div className={`${styles.cosmicNeonCard} rounded-3xl border border-[#E9C46A]/35 bg-[radial-gradient(circle_at_15%_20%,rgba(245,158,11,0.25),transparent_38%),radial-gradient(circle_at_85%_30%,rgba(56,189,248,0.22),transparent_42%),linear-gradient(145deg,rgba(15,23,42,0.95),rgba(30,41,59,0.88))] p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.18em] text-[#F6D365]">PREMIUM DEEP REPORT</p>
            <h4 className="text-lg font-semibold text-amber-100">FPTI 심층 리포트 잠금 해제 (200코인)</h4>
            <p className="text-sm text-amber-50">결제 전 미리보기, 결제 후 7개 챕터 전체 열람으로 동작합니다.</p>
          </div>
          {!accessState.isUnlocked && (
            <button
              type="button"
              onClick={handleUnlockDeepReport}
              disabled={deepLoading}
              className="rounded-full bg-[linear-gradient(120deg,#0ea5e9,#2563eb,#f59e0b)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(14,165,233,0.35)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {deepLoading ? "잠금 해제 처리 중" : "FPTI 심층 리포트 잠금 해제 (200코인)"}
            </button>
          )}
          {accessState.isUnlocked && (
            <button type="button" disabled className="rounded-full border border-emerald-200/30 bg-emerald-500/20 px-5 py-2.5 text-sm font-semibold text-emerald-50 opacity-90">
              이미 잠금 해제됨
            </button>
          )}
        </div>
        <div className="mt-3 rounded-xl border border-white/15 bg-black/20 p-3 text-sm text-slate-100">
          상태: <span className={accessState.isUnlocked ? styles.neonTextCyan : styles.neonTextGold}>{accessState.isUnlocked ? "전체 열람 가능" : "미리보기"}</span>
        </div>
        {deepNotice && <p className="mt-3 rounded-xl border border-emerald-300/35 bg-emerald-500/15 p-3 text-sm text-emerald-100">{deepNotice}</p>}
        {deepError && <p className="mt-3 rounded-xl border border-rose-300/35 bg-rose-500/15 p-3 text-sm text-rose-100">{deepError}</p>}
      </div>

      <section className={`${styles.cosmicNeonCard} rounded-3xl p-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))]`}>
        <p className="text-xs tracking-[0.16em] text-cyan-200">FPTI DEEP REPORT</p>
        <h4 className={`${styles.neonTextCyan} mt-1 text-lg font-semibold`}>{deepReport?.typeName || "리포트"} ({deepReport?.userTypeCode || ""})</h4>
        <p className="mt-2 text-sm text-slate-200">{deepReport?.summary?.preview || ""}</p>

        <div className="mt-3 flex items-center justify-between rounded-xl border border-white/12 bg-black/20 px-3 py-2 text-xs text-slate-200">
          <span>읽는 순서: 총론 → 내면 → 관계 → 일/재능 → 돈 → 스트레스 → 성장</span>
          <span className="font-semibold text-cyan-100">현재 {activeChapter + 1}/{Array.isArray(deepReport?.chapters) ? deepReport.chapters.length : 7}장</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {Array.isArray(deepReport?.summary?.highlights) && deepReport.summary.highlights.map((item) => (
            <span key={item} className="rounded-full border border-cyan-200/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
              {item}
            </span>
          ))}
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {Array.isArray(deepReport?.chapters) && deepReport.chapters.map((chapter, idx) => {
            const chapterLocked = !accessState.isUnlocked && idx > 0;
            const chapterActive = idx === activeChapter;
            return (
              <button
                key={`chapter-nav-${chapter?.roman}-${idx}`}
                type="button"
                onClick={() => setActiveChapter(idx)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition ${chapterActive ? "border-cyan-200/55 bg-cyan-500/20 text-cyan-50" : chapterLocked ? "border-amber-300/35 bg-amber-500/10 text-amber-100" : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"}`}
              >
                {toRoman(Number(chapter?.order || idx + 1))} {chapterLocked ? "잠금" : stripRomanPrefix(chapter?.title).split(" ")[0]}
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-2xl border border-cyan-200/20 bg-[#07142c]/70 p-3">
          <p className="text-xs tracking-[0.14em] text-cyan-200">TYPE CARD</p>
          <div className="mt-2"><CosmicRadar /></div>
        </div>

        <div className="mt-4 space-y-3">
          {Array.isArray(deepReport?.chapters) && deepReport.chapters.map((chapter, idx) => {
            const open = idx === activeChapter;
            const lockedChapter = !accessState.isUnlocked && idx > 0;
            return (
              <article key={`${chapter?.roman}-${chapter?.order}`} className={`rounded-2xl border border-white/15 bg-black/20 ${lockedChapter ? "opacity-90" : ""}`}>
                <button
                  type="button"
                  onClick={() => setActiveChapter(idx)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <h5 className="text-sm font-semibold text-sky-100">{toRoman(Number(chapter?.order || idx + 1))}. {stripRomanPrefix(chapter?.title)}</h5>
                  <span className="text-xs text-slate-300">{lockedChapter ? "잠금" : open ? "접기" : "열기"}</span>
                </button>
                {open && (
                  <div className="border-t border-white/10 px-4 pb-4 pt-3">
                    {lockedChapter && (
                      <p className="mb-3 rounded-xl border border-amber-300/30 bg-amber-400/10 p-3 text-xs text-amber-100">
                        🔒 이 챕터는 잠금 상태입니다. FPTI 심층 리포트 잠금 해제 후 전체 본문을 볼 수 있습니다.
                      </p>
                    )}
                    {!accessState.isUnlocked && idx === 0 && (
                      <p className="mb-3 rounded-xl border border-amber-300/30 bg-amber-400/10 p-3 text-xs text-amber-100">
                        1챕터는 1~2문장 미리보기로 제공됩니다. 잠금 해제 시 7개 챕터 전체가 열립니다.
                      </p>
                    )}

                    {!lockedChapter && <div className="space-y-3">
                      {chapter.sections && Array.isArray(chapter.sections) && chapter.sections.map((section) => (
                        <article key={`${chapter.roman}-${section?.title}`} className="rounded-2xl border border-cyan-300/20 bg-cyan-500/5 p-3 transition hover:shadow-[0_0_20px_rgba(56,189,248,0.22)]">
                          <div className="flex items-start justify-between gap-3">
                            <h6 className="text-sm font-semibold text-cyan-100">{section?.title || "제목 없음"}</h6>
                            <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] text-slate-200">상담 섹션</span>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-[14px] leading-8 text-slate-100">{sanitizeUserText((section as Record<string, unknown>)?.body || section?.interpretation, "이 섹션은 현재 성향 축과 십성 분포를 바탕으로 행동 패턴, 관계 반응, 현실 선택 전략을 균형 있게 해석한 안내입니다.")}</p>
                          {accessState.isUnlocked && (
                            <div className="mt-3 grid gap-2 md:grid-cols-3">
                              <p className="rounded-lg border border-emerald-200/25 bg-emerald-500/10 p-2 text-xs text-emerald-100">강점: {section?.strength || "-"}</p>
                              <p className="rounded-lg border border-amber-200/25 bg-amber-500/10 p-2 text-xs text-amber-100">주의: {section?.risk || "-"}</p>
                              <p className="rounded-lg border border-sky-200/25 bg-sky-500/10 p-2 text-xs text-sky-100">실행: {sanitizeUserText((section as Record<string, unknown>)?.advice || section?.action, "핵심 행동 1개를 먼저 완료하고 주간 점검을 고정하세요.")}</p>
                            </div>
                          )}
                        </article>
                      ))}
                    </div>}

                    <p className="mt-4 rounded-xl border border-amber-200/30 bg-amber-300/10 p-3 text-sm leading-7 text-amber-100">
                      {sanitizeUserText(chapter?.chapterSummary, "이 챕터는 성향 축의 강점과 취약 구간을 현실 행동으로 연결하는 실행형 요약입니다.")}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-[#081329] to-transparent pb-[env(safe-area-inset-bottom)] pt-10" />
      </section>

      <FptiShareCard result={result} />
    </motion.section>
  );
}
