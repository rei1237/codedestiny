"use client";

import { useMemo, useState } from "react";
import type { FptiAnalysisResult } from "@/lib/fpti/fpti-types";

type Props = {
  result: FptiAnalysisResult;
};

export default function FptiShareCard({ result }: Props) {
  const [copied, setCopied] = useState(false);

  const shareText = useMemo(
    () => `내 사주 FPTI는 ${result.code} (${result.typeName})!\n${result.oneLiner}\n#사주FPTI #코드데스티니`,
    [result],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="rounded-3xl border border-white/15 bg-white/5 p-4 backdrop-blur-xl">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-100">공유 카드</h4>
        <span className="text-xs text-slate-300">1:1 / 9:16 / 16:9 미리보기</span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="aspect-square rounded-2xl border border-white/15 bg-[linear-gradient(145deg,#050617,#130A2A)] p-3 text-white">
          <p className="text-[11px] text-slate-200">사주로 보는 FPTI 테스트</p>
          <p className="mt-2 text-2xl font-bold text-[#F6D365]">{result.code}</p>
          <p className="mt-1 text-sm">{result.typeName}</p>
          <p className="mt-2 text-xs text-slate-300">Code:Destiny</p>
        </div>
        <div className="aspect-[9/16] rounded-2xl border border-white/15 bg-[linear-gradient(165deg,#0b1026,#4c1d95)] p-3 text-white">
          <p className="text-[11px] text-cyan-100">스토리 카드</p>
          <p className="mt-2 text-xl font-bold text-[#F6D365]">{result.code}</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-100">깊은 통찰과 직관으로 가능성을 읽는 타입</p>
        </div>
        <div className="aspect-video rounded-2xl border border-white/15 bg-[linear-gradient(145deg,#0b1026,#1f2937)] p-3 text-white">
          <p className="text-[11px] text-amber-100">가로 카드</p>
          <p className="mt-2 text-lg font-bold text-[#F6D365]">{result.typeName}</p>
          <p className="mt-1 text-xs">{result.oneLiner}</p>
        </div>
      </div>

      <div className="sticky bottom-3 mt-4 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-[#050617]/70 p-2 backdrop-blur">
        <button
          type="button"
          onClick={copy}
          className="rounded-full bg-[linear-gradient(120deg,#7C3AED,#4C1D95,#F6D365)] px-4 py-2 text-xs font-semibold text-white"
        >
          {copied ? "복사 완료" : "내 FPTI 카드 저장하기"}
        </button>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-[#E9C46A]/55 px-4 py-2 text-xs text-[#F6D365]"
        >
          친구에게 공유하기
        </a>
        <a
          href="/compatibility"
          className="rounded-full border border-cyan-300/45 px-4 py-2 text-xs text-cyan-200"
        >
          궁합 FPTI 보기
        </a>
      </div>
    </section>
  );
}
