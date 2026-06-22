"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ZiweiDeepChapter } from "@/app/_lib/ziwei-types";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

interface ZiweiMasterPlanProps {
  chapter: ZiweiDeepChapter;
}

const ZIWEI_MASTER_PLAN_COPY: Record<LoadingLocale, {
  mobileProgress: string;
  progress: (value: number) => string;
  estimated: (minutes: number) => string;
  title: string;
}> = {
  ko: {
    mobileProgress: "마스터플랜 읽기 진행도",
    progress: (value) => `읽기 진행도 ${value}%`,
    estimated: (minutes) => `예상 읽기 ${minutes}분`,
    title: "인생 마스터플랜",
  },
  en: {
    mobileProgress: "Master plan reading progress",
    progress: (value) => `Reading progress ${value}%`,
    estimated: (minutes) => `Estimated reading ${minutes} min`,
    title: "Life Master Plan",
  },
  ja: {
    mobileProgress: "マスタープラン読了進捗",
    progress: (value) => `読了進捗 ${value}%`,
    estimated: (minutes) => `目安 ${minutes}分`,
    title: "人生マスタープラン",
  },
  "zh-CN": {
    mobileProgress: "人生蓝图阅读进度",
    progress: (value) => `阅读进度 ${value}%`,
    estimated: (minutes) => `预计阅读 ${minutes} 分钟`,
    title: "人生蓝图",
  },
  "zh-TW": {
    mobileProgress: "人生藍圖閱讀進度",
    progress: (value) => `閱讀進度 ${value}%`,
    estimated: (minutes) => `預計閱讀 ${minutes} 分鐘`,
    title: "人生藍圖",
  },
  vi: {
    mobileProgress: "Tiến độ đọc kế hoạch đời",
    progress: (value) => `Tiến độ đọc ${value}%`,
    estimated: (minutes) => `Ước tính ${minutes} phút`,
    title: "Kế hoạch cuộc đời",
  },
  hi: {
    mobileProgress: "जीवन मास्टरप्लान पढ़ने की प्रगति",
    progress: (value) => `पढ़ने की प्रगति ${value}%`,
    estimated: (minutes) => `अनुमानित पढ़ाई ${minutes} मिनट`,
    title: "जीवन मास्टरप्लान",
  },
  es: {
    mobileProgress: "Progreso de lectura del plan maestro",
    progress: (value) => `Progreso de lectura ${value}%`,
    estimated: (minutes) => `Lectura estimada ${minutes} min`,
    title: "Plan maestro de vida",
  },
  fr: {
    mobileProgress: "Progression de lecture du plan maître",
    progress: (value) => `Progression ${value}%`,
    estimated: (minutes) => `Lecture estimée ${minutes} min`,
    title: "Plan maître de vie",
  },
  de: {
    mobileProgress: "Lesefortschritt des Masterplans",
    progress: (value) => `Lesefortschritt ${value}%`,
    estimated: (minutes) => `Geschätzte Lesezeit ${minutes} Min.`,
    title: "Lebens-Masterplan",
  },
  nl: {
    mobileProgress: "Leesvoortgang masterplan",
    progress: (value) => `Leesvoortgang ${value}%`,
    estimated: (minutes) => `Geschatte leestijd ${minutes} min`,
    title: "Levensmasterplan",
  },
  ms: {
    mobileProgress: "Kemajuan bacaan pelan utama",
    progress: (value) => `Kemajuan bacaan ${value}%`,
    estimated: (minutes) => `Anggaran bacaan ${minutes} min`,
    title: "Pelan utama kehidupan",
  },
};

export default function ZiweiMasterPlan({ chapter }: ZiweiMasterPlanProps) {
  const [readingProgress, setReadingProgress] = useState(0);
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const contentRef = useRef<HTMLDivElement | null>(null);
  const estimatedMinutes = useMemo(() => Math.max(5, Math.round(chapter.fullText.length / 680)), [chapter.fullText]);
  const copy = ZIWEI_MASTER_PLAN_COPY[locale] || ZIWEI_MASTER_PLAN_COPY.ko;

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
  }, []);

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
          <span>{copy.mobileProgress}</span>
          <span>{readingProgress}% · {copy.estimated(estimatedMinutes)}</span>
        </div>
        <div className="mt-2 overflow-hidden rounded-full border border-white/10 bg-white/10">
          <div className="h-1.5 bg-gradient-to-r from-amber-300 via-yellow-300 to-cyan-300" style={{ width: `${readingProgress}%` }} />
        </div>
      </div>

      <h3 className="text-lg font-black text-amber-100">{copy.title}</h3>
      <p className="rounded-xl border border-amber-200/30 bg-amber-100/10 px-3 py-2 text-sm leading-7 text-slate-100">
        {chapter.summary.join(" ")}
      </p>

      <div ref={contentRef} className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/30 p-3">
        <div className="mb-3 hidden items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 lg:flex">
          <span>{copy.progress(readingProgress)}</span>
          <span>{copy.estimated(estimatedMinutes)}</span>
        </div>
        <pre className="whitespace-pre-wrap text-xs leading-6 text-slate-200">{chapter.fullText}</pre>
      </div>
    </section>
  );
}
