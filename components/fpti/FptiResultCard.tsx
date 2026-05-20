"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { authFetch } from "@/app/_lib/auth-client";
import { purchaseFeature } from "@/app/_lib/billing-client";
import type { FptiAnalysisResult } from "@/lib/fpti/fpti-types";
import FptiElementChart from "./FptiElementChart";
import FptiTenGodsPanel from "./FptiTenGodsPanel";
import FptiRelationshipCard from "./FptiRelationshipCard";
import FptiShareCard from "./FptiShareCard";
import FptiStrategyCard from "./FptiStrategyCard";

type Props = {
  result: FptiAnalysisResult;
};

type DeepReportSection = {
  title: string;
  content: string;
};

type DeepReportPayload = {
  title: string;
  summary: string;
  sections: DeepReportSection[];
  warning?: string;
  source?: string;
  model?: string;
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

function AxisChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/5 p-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

export default function FptiResultCard({ result }: Props) {
  const codeParts = result.code.split("").filter(Boolean);
  const [deepLoading, setDeepLoading] = useState(false);
  const [deepError, setDeepError] = useState("");
  const [deepReport, setDeepReport] = useState<DeepReportPayload | null>(null);

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

  const handleDeepReport = async () => {
    if (deepLoading) return;
    setDeepError("");
    setDeepLoading(true);

    try {
      const requestId = `fpti-premium-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
          setDeepError("코인이 부족합니다. FPTI 프리미엄 리포트는 200코인이 필요합니다.");
          return;
        }
        setDeepError(purchase.message || "코인 결제 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      const response = await authFetch("/api/fpti/deep-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ result }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        data?: DeepReportPayload;
      };

      if (!response.ok || payload?.ok !== true || !payload?.data) {
        setDeepError(payload?.message || "심층 리포트 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }

      setDeepReport(payload.data);
    } catch {
      setDeepError("네트워크 문제로 리포트를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.");
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
      <div className="rounded-[28px] border border-white/20 bg-[linear-gradient(150deg,rgba(5,18,36,0.92),rgba(14,34,58,0.9))] p-5 shadow-[0_18px_50px_rgba(2,8,25,0.58)] backdrop-blur-xl md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.2em] text-[#f6d365]">당신의 FPTI 코드</p>
            <p className="text-xs tracking-[0.2em] text-[#bfdbfe]">SAJU FPTI RESULT</p>
            <h2 className="mt-1 text-4xl font-bold text-[#F6D365] md:text-5xl">{result.code}</h2>
            <p className="mt-1 text-lg font-semibold text-slate-100">{result.typeName}</p>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">{result.oneLiner}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {result.keywords.slice(0, 5).map((keyword) => (
                <span key={keyword} className="rounded-full border border-[#e9c46a]/45 bg-[#f6d365]/10 px-3 py-1 text-xs text-[#fef3c7]">
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
            <div key={`${part}-${idx}`} className="rounded-2xl border border-[#E9C46A]/35 bg-[#0b2039]/70 p-3">
              <p className="text-[11px] text-slate-300">코드 {idx + 1}</p>
              <p className="mt-1 text-2xl font-bold text-[#F6D365]">{part}</p>
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
          <h4 className="text-sm font-semibold text-slate-100">이 결과는 이렇게 계산되었어요</h4>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            <li>일간: {result.evidence.dayMaster}</li>
            <li>월지: {result.evidence.monthBranch}</li>
            <li>강한 오행: {result.evidence.strongElements.join(", ")}</li>
            <li>약한 오행: {result.evidence.weakElements.join(", ")}</li>
            <li>강한 십성: {result.evidence.strongTenGods.join(", ")}</li>
            <li>성격 축: {result.axisMeanings.energy} / {result.axisMeanings.judgment} / {result.axisMeanings.execution} / {result.axisMeanings.vision}</li>
          </ul>
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs font-semibold tracking-[0.14em] text-slate-300">계산 노트</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-200">
              {result.evidence.calculationNotes.map((note) => (
                <li key={note}>- {note}</li>
              ))}
            </ul>
          </div>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl">
          <h4 className="text-sm font-semibold text-slate-100">연애에서의 나</h4>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            {result.loveTips.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl">
          <h4 className="text-sm font-semibold text-slate-100">돈과 일에서 빛나는 방식</h4>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            {result.careerTips.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </section>
      </div>

      <div className="rounded-3xl border border-[#E9C46A]/35 bg-[radial-gradient(circle_at_15%_20%,rgba(245,158,11,0.25),transparent_38%),radial-gradient(circle_at_85%_30%,rgba(56,189,248,0.22),transparent_42%),linear-gradient(145deg,rgba(15,23,42,0.95),rgba(30,41,59,0.88))] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.18em] text-[#F6D365]">PREMIUM REPORT</p>
            <h4 className="text-lg font-semibold text-amber-100">FPTI 심층 리포트(200코인)</h4>
            <p className="text-sm text-amber-50">10개 챕터로 나의 연애, 일, 돈, 인간관계, 성장 루틴을 사주 근거와 함께 분석합니다.</p>
          </div>
          <button
            type="button"
            onClick={handleDeepReport}
            disabled={deepLoading}
            className="rounded-full bg-[linear-gradient(120deg,#0ea5e9,#2563eb,#f59e0b)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(14,165,233,0.35)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {deepLoading ? "리포트 생성 중..." : "심층 리포트 열기 (200코인)"}
          </button>
        </div>
        {deepError && <p className="mt-3 rounded-xl border border-rose-300/35 bg-rose-500/15 p-3 text-sm text-rose-100">{deepError}</p>}
      </div>

      {deepReport && (
        <section className="rounded-3xl border border-cyan-300/30 bg-[linear-gradient(140deg,rgba(8,47,73,0.7),rgba(30,41,59,0.8))] p-4 backdrop-blur-xl">
          <p className="text-xs tracking-[0.16em] text-cyan-200">FPTI DEEP REPORT</p>
          <h4 className="mt-1 text-lg font-semibold text-sky-100">{deepReport.title}</h4>
          <p className="mt-2 text-sm text-slate-200">{deepReport.summary}</p>
          {deepReport.warning && (
            <p className="mt-3 rounded-xl border border-amber-300/35 bg-amber-500/10 p-3 text-sm text-amber-100">{deepReport.warning}</p>
          )}

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {deepReport.sections.map((section) => (
              <article key={section.title} className="rounded-2xl border border-white/15 bg-black/20 p-3">
                <h5 className="text-sm font-semibold text-sky-100">{section.title}</h5>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{section.content}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <FptiShareCard result={result} />
    </motion.section>
  );
}
