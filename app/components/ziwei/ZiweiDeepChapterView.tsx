"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ZiweiDeepChapter } from "@/app/_lib/ziwei-types";
import ZiweiRemedyChecklist from "./ZiweiRemedyChecklist";
import ZiweiMasterPlan from "./ZiweiMasterPlan";

interface ZiweiDeepChapterViewProps {
  chapter: ZiweiDeepChapter;
}

interface MobilePanelProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function MobilePanel({ title, open, onToggle, children }: MobilePanelProps) {
  return (
    <section className="rounded-2xl border border-white/12 bg-slate-950/35">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-black text-slate-100">{title}</span>
        <span className="text-xs text-cyan-100">{open ? "접기" : "열기"}</span>
      </button>
      {open ? <div className="border-t border-white/10 px-4 py-4">{children}</div> : null}
    </section>
  );
}

export default function ZiweiDeepChapterView({ chapter }: ZiweiDeepChapterViewProps) {
  const [expanded, setExpanded] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [mobileBodyOpen, setMobileBodyOpen] = useState(true);
  const [mobileInsightOpen, setMobileInsightOpen] = useState(false);
  const [mobileChecklistOpen, setMobileChecklistOpen] = useState(false);
  const bodyRef = useRef<HTMLElement | null>(null);

  const estimatedMinutes = useMemo(() => {
    return Math.max(4, Math.round(chapter.fullText.length / 650));
  }, [chapter.fullText]);

  const displayText = useMemo(() => {
    if (expanded) return chapter.fullText;
    return chapter.fullText.slice(0, 2400) + (chapter.fullText.length > 2400 ? "\n\n... (더 보기)" : "");
  }, [chapter.fullText, expanded]);

  useEffect(() => {
    setExpanded(false);
    setReadingProgress(0);
    setMobileBodyOpen(true);
    setMobileInsightOpen(false);
    setMobileChecklistOpen(false);
  }, [chapter.sectionId]);

  useEffect(() => {
    const updateProgress = () => {
      const target = bodyRef.current;
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
  }, [chapter.sectionId, expanded]);

  if (chapter.sectionId === "master") {
    return <ZiweiMasterPlan chapter={chapter} />;
  }

  return (
    <article className="space-y-5 rounded-3xl border border-white/15 bg-white/5 p-5 backdrop-blur-xl md:p-7">
      <div className="sticky top-2 z-20 rounded-xl border border-cyan-200/30 bg-slate-950/75 p-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between text-[11px] font-bold text-cyan-100">
          <span>읽기 진행도</span>
          <span>{readingProgress}% · 예상 {estimatedMinutes}분</span>
        </div>
        <div className="mt-2 overflow-hidden rounded-full border border-white/10 bg-white/10">
          <div
            className="h-1.5 bg-gradient-to-r from-cyan-300 via-sky-300 to-amber-300"
            style={{ width: `${readingProgress}%` }}
          />
        </div>
      </div>

      <header>
        <p className="text-xs font-bold tracking-wide text-amber-200/90">Deep Reading Section</p>
        <h2 className="mt-1 text-2xl font-black text-slate-100">{chapter.title}</h2>
        <div className="mt-3 rounded-2xl border border-amber-300/30 bg-gradient-to-br from-amber-200/10 via-white/5 to-cyan-200/10 px-4 py-3">
          <p className="text-sm leading-7 text-amber-100/90">{chapter.summary.join(" ")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {chapter.highlights.slice(0, 5).map((item) => (
              <span key={item} className="rounded-full border border-cyan-200/25 bg-cyan-200/10 px-2.5 py-1 text-[11px] text-cyan-100">
                {item}
              </span>
            ))}
          </div>
        </div>
      </header>

      <div className="space-y-3 lg:hidden">
        <MobilePanel title="본문 읽기" open={mobileBodyOpen} onToggle={() => setMobileBodyOpen((prev) => !prev)}>
          <section ref={bodyRef} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
            <p className="whitespace-pre-wrap text-sm leading-8 text-slate-100">{displayText}</p>
            {chapter.fullText.length > 2400 ? (
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                className="mt-4 rounded-lg border border-white/20 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
                aria-label={expanded ? "본문 접기" : "본문 더 보기"}
              >
                {expanded ? "접기" : "더 보기"}
              </button>
            ) : null}
          </section>
        </MobilePanel>

        <MobilePanel title="강점·주의·하이라이트" open={mobileInsightOpen} onToggle={() => setMobileInsightOpen((prev) => !prev)}>
          <section className="grid gap-3">
            <div className="rounded-xl border border-cyan-200/20 bg-cyan-200/5 p-3">
              <p className="text-xs font-bold text-cyan-100">장점</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-100">
                {chapter.strengths.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-rose-200/20 bg-rose-200/5 p-3">
              <p className="text-xs font-bold text-rose-100">주의점</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-100">
                {chapter.cautions.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-amber-200/20 bg-amber-200/5 p-3">
              <p className="text-xs font-bold text-amber-100">핵심 하이라이트</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-100">
                {chapter.highlights.map((item) => (
                  <li key={item}>- {item}</li>
                ))}
              </ul>
            </div>
          </section>
        </MobilePanel>

        <MobilePanel title="실천 체크리스트" open={mobileChecklistOpen} onToggle={() => setMobileChecklistOpen((prev) => !prev)}>
          <ZiweiRemedyChecklist
            remedies={chapter.remedies}
            actionItems={chapter.actionItems}
            routine7Days={chapter.routine7Days}
            routine30Days={chapter.routine30Days}
          />
        </MobilePanel>
      </div>

      <div className="hidden space-y-5 lg:block">
        <section ref={bodyRef} className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
          <div className="mb-3 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
            <span>읽기 진행도 {readingProgress}%</span>
            <span>예상 읽기 {estimatedMinutes}분</span>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-8 text-slate-100">{displayText}</p>
          {chapter.fullText.length > 2400 ? (
            <button
              type="button"
              onClick={() => setExpanded((prev) => !prev)}
              className="mt-4 rounded-lg border border-white/20 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/10"
              aria-label={expanded ? "본문 접기" : "본문 더 보기"}
            >
              {expanded ? "접기" : "더 보기"}
            </button>
          ) : null}
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-cyan-200/20 bg-cyan-200/5 p-3">
            <p className="text-xs font-bold text-cyan-100">장점</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-100">
              {chapter.strengths.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-rose-200/20 bg-rose-200/5 p-3">
            <p className="text-xs font-bold text-rose-100">주의점</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-100">
              {chapter.cautions.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-amber-200/20 bg-amber-200/5 p-3">
            <p className="text-xs font-bold text-amber-100">핵심 하이라이트</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-100">
              {chapter.highlights.map((item) => (
                <li key={item}>- {item}</li>
              ))}
            </ul>
          </div>
        </section>

        <ZiweiRemedyChecklist
          remedies={chapter.remedies}
          actionItems={chapter.actionItems}
          routine7Days={chapter.routine7Days}
          routine30Days={chapter.routine30Days}
        />
      </div>
    </article>
  );
}
