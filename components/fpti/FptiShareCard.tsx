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
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900">공유 카드</h4>
        <span className="text-xs text-slate-500">SNS 한 줄 공유</span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl bg-[linear-gradient(145deg,#111827,#3b1d57)] p-3 text-white">
          <p className="text-xs text-slate-200">Core Type</p>
          <p className="mt-1 text-2xl font-bold text-amber-200">{result.code}</p>
          <p className="mt-1 text-xs">{result.typeName}</p>
        </div>
        <div className="rounded-xl bg-[linear-gradient(145deg,#0f3a52,#13485f)] p-3 text-white">
          <p className="text-xs text-cyan-100">Temperament</p>
          <p className="mt-1 text-sm">{result.axisMeanings.temperament}</p>
        </div>
        <div className="rounded-xl bg-[linear-gradient(145deg,#4d3016,#5c3a1e)] p-3 text-white">
          <p className="text-xs text-amber-100">Strategy</p>
          <p className="mt-1 text-sm">{result.axisMeanings.strategy}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
        >
          {copied ? "복사 완료" : "공유 문구 복사"}
        </button>
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-slate-300 px-4 py-2 text-xs text-slate-700 hover:bg-slate-100"
        >
          X 공유
        </a>
      </div>
    </section>
  );
}
