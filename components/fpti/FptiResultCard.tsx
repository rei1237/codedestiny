"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { fetchBillingBalance, purchaseFeature } from "@/app/_lib/billing-client";
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
    return parsed;
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

export default function FptiResultCard({ result }: Props) {
  const codeParts = result.code.split("").filter(Boolean);
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepError, setDeepError] = useState("");
  const [activeChapter, setActiveChapter] = useState(0);
  const [accessState, setAccessState] = useState<FptiReportAccessState>({ isUnlocked: false });
  const [deepReport, setDeepReport] = useState<FptiDeepReport>(() => buildFptiDeepReport({ result }, { unlocked: false }));

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
      setDeepReport(stored.report);
    } else {
      setAccessState({ isUnlocked: false });
      setDeepReport(buildFptiDeepReport({ result }, { unlocked: false }));
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
          setDeepReport(buildFptiDeepReport({ result }, { unlocked: false }));
          return;
        }

        const nextAccess: FptiReportAccessState = {
          isUnlocked: true,
          unlockMethod: stored?.access?.unlockMethod || "coin",
          transactionId: stored?.access?.transactionId,
          unlockedAt: stored?.access?.unlockedAt || new Date().toISOString(),
        };
        const unlockedReport = resolveUnlockReport(result);
        setAccessState(nextAccess);
        setDeepReport(unlockedReport);
        setActiveChapter(0);
        safeWriteStored({
          version: 1,
          scope,
          signature,
          access: nextAccess,
          report: unlockedReport,
        });
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
    if (deepLoading) return;
    if (accessState.isUnlocked) return;

    setDeepError("");
    setDeepLoading(true);

    try {
      const built = resolveUnlockReport(result);
      if (!Array.isArray(built.chapters) || built.chapters.length !== 7) {
        setDeepError("심층 리포트 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      const requestId = `fpti-deep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const purchase = await purchaseFeature({
        featureKey: "premium-fpti-report",
        reason: "FPTI 프리미엄 리포트 생성",
        requestId,
        forceDeduct: true,
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
      const nextAccess: FptiReportAccessState = {
        isUnlocked: true,
        unlockMethod: inferUnlockMethod(rawData),
        transactionId: String(consume?.transactionId || consume?.receiptId || requestId),
        unlockedAt: String(consume?.createdAt || new Date().toISOString()),
      };

      setAccessState(nextAccess);
      setDeepReport(built);
      setActiveChapter(0);

      const scope = readAuthScope();
      safeWriteStored({
        version: 1,
        scope,
        signature,
        access: nextAccess,
        report: built,
      });
    } catch {
      setDeepError("심층 리포트 잠금 해제 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setDeepLoading(false);
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
              {deepLoading ? "잠금 해제 처리 중" : "심층 리포트 잠금 해제"}
            </button>
          )}
        </div>
        <div className="mt-3 rounded-xl border border-white/15 bg-black/20 p-3 text-sm text-slate-100">
          상태: <span className={accessState.isUnlocked ? styles.neonTextCyan : styles.neonTextGold}>{accessState.isUnlocked ? "잠금 해제 완료" : "미리보기"}</span>
        </div>
        {deepError && <p className="mt-3 rounded-xl border border-rose-300/35 bg-rose-500/15 p-3 text-sm text-rose-100">{deepError}</p>}
      </div>

      <section className={`${styles.cosmicNeonCard} rounded-3xl p-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))]`}>
        <p className="text-xs tracking-[0.16em] text-cyan-200">FPTI DEEP REPORT</p>
        <h4 className={`${styles.neonTextCyan} mt-1 text-lg font-semibold`}>{deepReport.typeName} ({deepReport.userTypeCode})</h4>
        <p className="mt-2 text-sm text-slate-200">{deepReport.summary.preview}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {deepReport.summary.highlights.map((item) => (
            <span key={item} className="rounded-full border border-cyan-200/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
              {item}
            </span>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-cyan-200/20 bg-[#07142c]/70 p-3">
          <p className="text-xs tracking-[0.14em] text-cyan-200">TYPE CARD</p>
          <div className="mt-2"><CosmicRadar /></div>
        </div>

        <div className="mt-4 space-y-3">
          {deepReport.chapters.map((chapter, idx) => {
            const open = idx === activeChapter;
            return (
              <article key={`${chapter.roman}-${chapter.order}`} className="rounded-2xl border border-white/15 bg-black/20">
                <button
                  type="button"
                  onClick={() => setActiveChapter(idx)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <h5 className="text-sm font-semibold text-sky-100">{chapter.roman}. {chapter.title}</h5>
                  <span className="text-xs text-slate-300">{open ? "접기" : "열기"}</span>
                </button>
                {open && (
                  <div className="border-t border-white/10 px-4 pb-4 pt-3">
                    {!accessState.isUnlocked && (
                      <p className="mb-3 rounded-xl border border-amber-300/30 bg-amber-400/10 p-3 text-xs text-amber-100">
                        이 챕터는 미리보기 1~2문장만 표시됩니다. 전체 내용을 보려면 잠금을 해제하세요.
                      </p>
                    )}

                    <div className="space-y-3">
                      {chapter.sections.map((section) => (
                        <article key={`${chapter.roman}-${section.title}`} className="rounded-2xl border border-cyan-300/20 bg-cyan-500/5 p-3 transition hover:shadow-[0_0_20px_rgba(56,189,248,0.22)]">
                          <h6 className="text-sm font-semibold text-cyan-100">{section.title}</h6>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-100">{section.interpretation}</p>
                          {accessState.isUnlocked && (
                            <div className="mt-3 grid gap-2 md:grid-cols-3">
                              <p className="rounded-lg border border-emerald-200/25 bg-emerald-500/10 p-2 text-xs text-emerald-100">강점: {section.strength}</p>
                              <p className="rounded-lg border border-amber-200/25 bg-amber-500/10 p-2 text-xs text-amber-100">주의: {section.risk}</p>
                              <p className="rounded-lg border border-sky-200/25 bg-sky-500/10 p-2 text-xs text-sky-100">실행: {section.action}</p>
                            </div>
                          )}
                          <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-2">
                            <p className="text-xs font-semibold tracking-[0.14em] text-slate-300">해석에 반영된 성향</p>
                            <ul className="mt-2 space-y-1 text-xs text-slate-200">
                              {section.usedSignals.map((signal) => (
                                <li key={`${section.title}-${signal}`}>- {signal}</li>
                              ))}
                            </ul>
                          </div>
                        </article>
                      ))}
                    </div>

                    <p className="mt-4 rounded-xl border border-amber-200/30 bg-amber-300/10 p-3 text-sm leading-7 text-amber-100">
                      {chapter.chapterSummary}
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
