"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ZiweiDeepChapter } from "@/app/_lib/ziwei-types";

interface ZiweiMasterPlanProps {
  chapter: ZiweiDeepChapter;
}

export default function ZiweiMasterPlan({ chapter }: ZiweiMasterPlanProps) {
  const [readingProgress, setReadingProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const estimatedMinutes = useMemo(() => Math.max(5, Math.round(chapter.fullText.length / 680)), [chapter.fullText]);

  useEffect(() => {
    const updateProgress = () => {
      const target = contentRef.current;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const viewport = Math.max(window.innerHeight, 1);
      const total = Math.max(rect.height + viewport, 1);
      const passed = viewport - rect.top;
      const pct = Math.round(Math.max(0, Math.min(100, (passed / total) * 100)));
      setReadingProgress(pct);
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [chapter.sectionId]);

  return (
    <section className="space-y-4 rounded-2xl border border-amber-300/25 bg-amber-200/5 p-4">
      <div className="sticky top-2 z-20 rounded-xl border border-amber-300/35 bg-slate-950/75 p-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between text-[11px] font-bold text-amber-100">
          <span>마스터플랜 읽기 진행도</span>
          <span>{readingProgress}% · 예상 {estimatedMinutes}분</span>
        </div>
        <div className="mt-2 overflow-hidden rounded-full border border-white/10 bg-white/10">
          <div className="h-1.5 bg-gradient-to-r from-amber-300 via-yellow-300 to-cyan-300" style={{ width: `${readingProgress}%` }} />
        </div>
      </div>

      <h3 className="text-lg font-black text-amber-100">인생 마스터플랜</h3>
      <p className="rounded-xl border border-amber-200/30 bg-amber-100/10 px-3 py-2 text-sm leading-7 text-slate-100">
        {chapter.summary.join(" ")}
      </p>

      <div ref={contentRef} className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/30 p-3">
        <div className="mb-3 hidden items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 lg:flex">
          <span>읽기 진행도 {readingProgress}%</span>
          <span>예상 읽기 {estimatedMinutes}분</span>
        </div>
        <pre className="whitespace-pre-wrap text-xs leading-6 text-slate-200">{chapter.fullText}</pre>
      </div>
    </section>
  );
}
