"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { FptiAnalysisResult } from "@/lib/fpti/fpti-types";
import FptiElementChart from "./FptiElementChart";
import FptiTenGodsPanel from "./FptiTenGodsPanel";
import FptiRelationshipCard from "./FptiRelationshipCard";
import FptiShareCard from "./FptiShareCard";

type Props = {
  result: FptiAnalysisResult;
};

function AxisChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function FptiResultCard({ result }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.2em] text-slate-500">SAJU FPTI RESULT</p>
            <h2 className="mt-1 text-3xl font-bold text-slate-900 md:text-4xl">{result.code}</h2>
            <p className="mt-1 text-lg font-semibold text-indigo-700">{result.typeName}</p>
            <p className="mt-2 max-w-2xl text-sm text-slate-700">{result.oneLiner}</p>
          </div>
          <div className="rounded-2xl bg-slate-900 px-4 py-3 text-white">
            <p className="text-xs text-slate-300">신뢰도</p>
            <p className="text-2xl font-bold">{result.confidence}%</p>
          </div>
        </div>

        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{result.reliabilityMessage}</p>

        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <AxisChip label="기질축" value={result.axisMeanings.temperament} />
          <AxisChip label="행동축" value={result.axisMeanings.behavior} />
          <AxisChip label="관계축" value={result.axisMeanings.relation} />
          <AxisChip label="전략축" value={result.axisMeanings.strategy} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FptiElementChart percentages={result.percentageElements} />
        <FptiTenGodsPanel scores={result.tenGodGroupScores} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FptiRelationshipCard keyLabel={result.relationStyle.key} description={result.relationStyle.description} />
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-900">핵심 근거</h4>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            <li>일간: {result.evidence.dayMaster}</li>
            <li>월지: {result.evidence.monthBranch}</li>
            <li>강한 오행: {result.evidence.strongElements.join(", ")}</li>
            <li>강한 십성: {result.evidence.strongTenGods.join(", ")}</li>
          </ul>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-900">강점</h4>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {result.strengths.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-900">주의 포인트</h4>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {result.weaknesses.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-900">성장 가이드</h4>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {result.growthTips.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </section>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.18em] text-amber-700">PREMIUM</p>
            <h4 className="text-lg font-semibold text-amber-900">FPTI 심층 리포트 업그레이드</h4>
            <p className="text-sm text-amber-800">궁합 매칭, 커리어 전략, 연애 흐름 30일 가이드를 확장해서 볼 수 있습니다.</p>
          </div>
          <Link
            href="/pricing"
            className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
          >
            유료 리포트 보기
          </Link>
        </div>
      </div>

      <FptiShareCard result={result} />
    </motion.section>
  );
}
