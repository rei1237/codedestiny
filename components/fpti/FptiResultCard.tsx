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

const AXIS_CARD_LABELS: Record<string, string> = {
  A: "Water / 지성형",
  W: "Wood / 성장형",
  F: "Fire / 표현형",
  E: "Earth / 안정형",
  M: "Metal / 원칙형",
  C: "Creator / 식상형",
  R: "Ruler / 관성형",
  S: "Scholar / 통찰형",
  I: "Independent / 자율형",
  O: "Open / 개방형",
  D: "Deep / 깊은 관계형",
  L: "Loyal / 신뢰형",
  B: "Balance / 균형형",
  G: "Growth / 성장형",
  P: "Power / 성취형",
  H: "Healing / 치유형",
};

function AxisChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/5 p-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-300">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

export default function FptiResultCard({ result }: Props) {
  const codeParts = result.code.split("-").filter(Boolean);

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      <div className="rounded-[28px] border border-white/15 bg-[linear-gradient(150deg,rgba(11,16,38,0.9),rgba(19,10,42,0.88))] p-5 shadow-[0_18px_50px_rgba(2,6,22,0.55)] backdrop-blur-xl md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.2em] text-[#bfdbfe]">SAJU FPTI RESULT</p>
            <h2 className="mt-1 text-4xl font-bold text-[#F6D365] md:text-5xl">{result.code}</h2>
            <p className="mt-1 text-lg font-semibold text-slate-100">{result.typeName}</p>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">{result.oneLiner}</p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-black/35 px-4 py-3 text-white">
            <p className="text-xs text-slate-300">정확도 가이드</p>
            <p className="text-2xl font-bold">{result.confidence}%</p>
          </div>
        </div>

        <p className="mt-4 rounded-xl border border-white/12 bg-white/5 p-3 text-sm text-slate-200">{result.reliabilityMessage}</p>

        <div className="mt-4 grid gap-2 md:grid-cols-4">
          {codeParts.map((part, idx) => (
            <div key={`${part}-${idx}`} className="rounded-2xl border border-[#E9C46A]/35 bg-[#0B1026]/70 p-3">
              <p className="text-[11px] text-slate-300">코드 {idx + 1}</p>
              <p className="mt-1 text-2xl font-bold text-[#F6D365]">{part}</p>
              <p className="mt-1 text-xs text-slate-200">{AXIS_CARD_LABELS[part] || "복합 의미"}</p>
            </div>
          ))}
        </div>

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
            <li>강한 십성: {result.evidence.strongTenGods.join(", ")} (편인: 흐름 감각, 식신: 표현 실행)</li>
            <li>성격 축: {result.axisMeanings.temperament} / {result.axisMeanings.behavior} / {result.axisMeanings.relation} / {result.axisMeanings.strategy}</li>
          </ul>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-3xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl">
          <h4 className="text-sm font-semibold text-slate-100">나의 본질</h4>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            {result.strengths.map((item) => (
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
        <section className="rounded-3xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl">
          <h4 className="text-sm font-semibold text-slate-100">운이 열리는 방향</h4>
          <ul className="mt-2 space-y-1 text-sm text-slate-200">
            {result.growthTips.map((item) => (
              <li key={item}>- {item}</li>
            ))}
          </ul>
        </section>
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

      <div className="rounded-3xl border border-[#E9C46A]/35 bg-[#F6D365]/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.18em] text-[#F6D365]">PREMIUM</p>
            <h4 className="text-lg font-semibold text-amber-100">내 성격이 왜 이렇게 나왔는지 더 깊게 알고 싶다면?</h4>
            <p className="text-sm text-amber-50">일간 상세 분석, 대운 기반 성향 변화, 연애/직업/재물 심층 리포트와 PDF 저장까지 확장됩니다.</p>
          </div>
          <Link
            href="/pricing"
            className="rounded-full bg-[linear-gradient(120deg,#7C3AED,#4C1D95,#F6D365)] px-4 py-2 text-sm font-semibold text-white"
          >
            FPTI 심층 리포트 보기
          </Link>
        </div>
      </div>

      <FptiShareCard result={result} />
    </motion.section>
  );
}
