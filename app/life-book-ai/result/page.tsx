"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, BookOpen, Download, Loader2, ScrollText, Sparkles } from "lucide-react";
import { authFetch } from "@/app/_lib/auth-client";

type LifeBookMessage = {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

type SajuResult = {
  yearPillar?: string;
  monthPillar?: string;
  dayPillar?: string;
  hourPillar?: string;
  dayMaster?: string;
  fiveElements?: Record<string, number> | null;
  tenGods?: Record<string, number> | null;
  strength?: string;
  usefulGod?: string;
  unfavorableGod?: string;
  majorLuck?: unknown;
  yearlyLuck?: unknown;
  calculationMeta?: Record<string, unknown> | null;
};

type LifeBookResult = {
  ok?: boolean;
  sessionId?: string;
  consultationId?: string;
  idempotencyKey?: string;
  accessType?: string;
  status?: string;
  title?: string;
  topic?: string;
  birthInfo?: {
    name?: string;
    gender?: string;
    birthDate?: string;
    birthTime?: string;
    birthTimeUnknown?: boolean;
    calendarType?: string;
  } | null;
  sajuResult?: SajuResult | null;
  messages?: LifeBookMessage[];
  reportJson?: LifeBookReportJson | null;
  createdAt?: string;
  updatedAt?: string;
  message?: string;
  reason?: string;
};

type LifeBookChapter = {
  chapterNumber?: number;
  title?: string;
  summary?: string;
  content?: string;
  advice?: string[];
};

type LifeBookExpertReading = {
  title?: string;
  content?: string;
  guidance?: string[];
};

type LifeBookReportJson = {
  title?: string;
  subtitle?: string;
  profileSummary?: Record<string, string>;
  coreSummary?: {
    oneLine?: string;
    lifeTheme?: string;
    strongestElement?: string;
    neededBalance?: string;
  };
  chapters?: LifeBookChapter[];
  expertReadings?: LifeBookExpertReading[];
  finalMessage?: string;
};

const CANONICAL_TEN_GODS = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"];

const FALLBACK_CHAPTERS = [
  "타고난 사주의 원형",
  "성격과 내면의 작동 방식",
  "재능과 일의 방향",
  "사랑과 인연",
  "재물과 현실 기반",
  "인간관계와 가족의 장",
  "건강과 조후의 균형",
  "대운으로 보는 인생의 큰 장면",
  "가까운 시기의 세운 조언",
  "인생의 책 마지막 문장",
];

function toText(value: unknown) {
  return String(value || "").trim();
}

function safeFilePart(value: string) {
  return (value || "life-book").replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "-").slice(0, 80);
}

function formatGender(value?: string) {
  if (value === "female") return "여성";
  if (value === "male") return "남성";
  if (value === "unknown") return "비공개";
  return "미입력";
}

function formatCalendar(value?: string) {
  return value === "lunar" ? "음력" : "양력";
}

function formatSajuValue(value: unknown, fallback = "계산 제한") {
  return toText(value) || fallback;
}

function recordEntries(record?: Record<string, unknown> | null) {
  return Object.entries(record || {})
    .map(([key, value]) => ({ key, value: toText(value) }))
    .filter((entry) => entry.key && entry.value);
}

function compactLines(content: string) {
  return String(content || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
}

function extractJsonReport(content: string): LifeBookReportJson | null {
  const raw = content.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    return parsed && typeof parsed === "object" ? parsed as LifeBookReportJson : null;
  } catch {
    return null;
  }
}

function splitMarkdownChapters(content: string): LifeBookChapter[] {
  const lines = String(content || "").replace(/\r\n/g, "\n").split("\n");
  const chapters: LifeBookChapter[] = [];
  let current: LifeBookChapter | null = null;
  const headingPattern = /^(?:#{1,4}\s*)?(?:제?\s*\d{1,2}\s*장[.)]?\s*)?(.+?)\s*$/;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const heading = line.match(/^#{2,4}\s+(.+)$/) || line.match(/^제\s*\d{1,2}\s*장[.)]?\s*(.+)$/);
    if (heading) {
      if (current?.content?.trim()) chapters.push({ ...current, content: current.content.trim() });
      const title = toText(heading[1]).replace(/^[-:：\s]+/, "") || FALLBACK_CHAPTERS[chapters.length] || `인생의 장 ${chapters.length + 1}`;
      current = { chapterNumber: chapters.length + 1, title, content: "" };
      continue;
    }
    if (!current && line) {
      const first = line.match(headingPattern);
      current = { chapterNumber: 1, title: first?.[1]?.slice(0, 40) || FALLBACK_CHAPTERS[0], content: "" };
    }
    if (current) current.content = `${current.content || ""}${current.content ? "\n" : ""}${line}`;
  }

  if (current?.content?.trim()) chapters.push({ ...current, content: current.content.trim() });
  if (chapters.length >= 3) return chapters;

  const paragraphs = String(content || "").split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  return paragraphs.slice(0, 10).map((paragraph, index) => ({
    chapterNumber: index + 1,
    title: FALLBACK_CHAPTERS[index] || `인생의 장 ${index + 1}`,
    content: paragraph,
  }));
}

function getAssistantContent(result: LifeBookResult | null) {
  return result?.messages?.find((message) => message.role === "assistant")?.content?.trim() || "";
}

function buildReport(result: LifeBookResult | null) {
  const content = getAssistantContent(result);
  const parsed = result?.reportJson || extractJsonReport(content);
  const chapters = parsed?.chapters?.length
    ? parsed.chapters.map((chapter, index) => ({
      ...chapter,
      chapterNumber: chapter.chapterNumber || index + 1,
      title: chapter.title || FALLBACK_CHAPTERS[index] || `인생의 장 ${index + 1}`,
      content: chapter.content || chapter.summary || "",
    }))
    : splitMarkdownChapters(content);
  return {
    title: parsed?.title || result?.title || "인생의 책 AI 상담 리포트",
    subtitle: parsed?.subtitle || "타고난 사주와 시간의 흐름으로 읽는 삶의 장면",
    coreSummary: parsed?.coreSummary || null,
    expertReadings: Array.isArray(parsed?.expertReadings) ? parsed.expertReadings.filter((reading) => toText(reading?.title || reading?.content)) : [],
    finalMessage: parsed?.finalMessage || "",
    chapters,
  };
}

function LoadingState({ message = "인생의 책을 불러오고 있습니다." }: { message?: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#050407] px-4 text-amber-50">
      <div className="rounded-3xl border border-amber-200/20 bg-amber-50/10 p-8 text-center shadow-2xl backdrop-blur-xl">
        <Loader2 className="mx-auto h-9 w-9 animate-spin text-amber-200" aria-hidden="true" />
        <p className="mt-4 text-sm font-bold text-[#eadbb9]">{message}</p>
      </div>
    </main>
  );
}

function LifeBookResultContent() {
  const params = useSearchParams();
  const attemptId = toText(params?.get("attemptId") || params?.get("sessionId") || "");
  const pending = params?.get("pending") === "1";
  const [result, setResult] = useState<LifeBookResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState("");

  const loadResult = useCallback(async () => {
    if (!attemptId) {
      setError("결과 링크를 확인하지 못했습니다.");
      setLoading(false);
      return;
    }
    try {
      const response = await authFetch(`/api/life-book-ai/result?attemptId=${encodeURIComponent(attemptId)}`);
      const payload = await response.json().catch(() => ({})) as LifeBookResult;
      if (pending && response.status === 404) {
        setResult({ status: "generating", message: "인생의 책을 준비하고 있습니다." });
        setError("");
        setLoading(false);
        return;
      }
      if (response.status === 202 && payload?.status === "generating") {
        setResult(payload);
        setError("");
        setLoading(false);
        return;
      }
      if (!response.ok || payload?.ok === false) {
        throw new Error(toText(payload?.message) || "저장된 인생의 책을 불러오지 못했습니다.");
      }
      setResult(payload);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "저장된 인생의 책을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [attemptId, pending]);

  useEffect(() => {
    void loadResult();
  }, [loadResult]);

  useEffect(() => {
    if (result?.status !== "generating" && !pending) return;
    const timer = window.setInterval(() => void loadResult(), 3200);
    return () => window.clearInterval(timer);
  }, [loadResult, pending, result?.status]);

  const report = useMemo(() => buildReport(result), [result]);
  const birth = result?.birthInfo || {};
  const saju = result?.sajuResult || null;
  const generatedAt = toText(result?.updatedAt || result?.createdAt);
  const userName = toText(birth.name) || "당신";
  const isGenerating = result?.status === "generating";
  const pillarRows = [
    { label: "년주", value: formatSajuValue(saju?.yearPillar) },
    { label: "월주", value: formatSajuValue(saju?.monthPillar) },
    { label: "일주", value: formatSajuValue(saju?.dayPillar) },
    { label: "시주", value: formatSajuValue(saju?.hourPillar, birth.birthTimeUnknown ? "출생시간 모름" : "계산 제한") },
    { label: "일간", value: formatSajuValue(saju?.dayMaster) },
  ];
  const fiveElementEntries = recordEntries(saju?.fiveElements);
  const tenGodEntries = recordEntries(saju?.tenGods);

  async function handlePdfDownload() {
    const element = document.getElementById("life-book-result-document");
    if (!element || pdfLoading) return;
    setPdfLoading(true);
    setPdfError("");
    try {
      const [{ default: html2canvas }, jsPdfModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const JsPDF = jsPdfModule.default || jsPdfModule.jsPDF;
      const pdf = new JsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 8;
      const renderWidth = pageWidth - margin * 2;
      const renderHeight = pageHeight - margin * 2;
      const targets = Array.from(element.querySelectorAll<HTMLElement>("[data-life-book-pdf-page]"));
      const pdfTargets = targets.length ? targets : [element];
      let hasPage = false;

      for (const target of pdfTargets) {
        const canvas = await html2canvas(target, {
          backgroundColor: "#100a08",
          scale: Math.min(2, window.devicePixelRatio || 2),
          useCORS: true,
          windowWidth: Math.max(document.documentElement.scrollWidth, element.scrollWidth),
        });
        if (!canvas.width || !canvas.height) continue;
        const imageData = canvas.toDataURL("image/png");
        const imageHeight = (canvas.height * renderWidth) / canvas.width;
        let remainingHeight = imageHeight;
        let position = margin;
        if (hasPage) pdf.addPage();
        pdf.addImage(imageData, "PNG", margin, position, renderWidth, imageHeight);
        hasPage = true;
        remainingHeight -= renderHeight;
        while (remainingHeight > 0) {
          position = margin + remainingHeight - imageHeight;
          pdf.addPage();
          pdf.addImage(imageData, "PNG", margin, position, renderWidth, imageHeight);
          remainingHeight -= renderHeight;
        }
      }
      if (!hasPage) throw new Error("empty_pdf_capture");
      pdf.save(`life-book-reading-${safeFilePart(attemptId)}.pdf`);
    } catch {
      setPdfError("PDF로 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPdfLoading(false);
    }
  }

  if (loading) return <LoadingState message={pending ? "완성된 책을 기다리고 있습니다." : "인생의 책을 불러오고 있습니다."} />;

  if (error) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#050407] px-4 text-amber-50">
        <div className="max-w-md rounded-3xl border border-rose-200/25 bg-rose-950/30 p-7 text-center shadow-2xl backdrop-blur-xl">
          <AlertCircle className="mx-auto h-9 w-9 text-rose-200" aria-hidden="true" />
          <h1 className="mt-4 text-2xl font-black">결과를 열 수 없습니다</h1>
          <p className="mt-3 text-sm leading-6 text-rose-100">{error}</p>
          <Link href="/life-book-ai" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-amber-200 px-5 font-black text-[#171007]">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            새로운 인생의 책 만들기
          </Link>
        </div>
      </main>
    );
  }

  if (isGenerating) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#050407] px-4 text-amber-50">
        <div className="max-w-lg rounded-3xl border border-amber-200/20 bg-amber-50/10 p-8 text-center shadow-2xl backdrop-blur-xl">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-amber-200" aria-hidden="true" />
          <h1 className="mt-5 text-2xl font-black">당신의 인생의 책을 집필하는 중입니다</h1>
          <p className="mt-3 text-sm leading-7 text-[#eadbb9]">
            사주의 뼈대와 시간의 흐름을 엮어 각 장을 차례로 완성하고 있습니다. 이 창은 닫지 않아도 곧 결과로 바뀝니다.
          </p>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-black/30">
            <div className="h-full w-[72%] animate-pulse rounded-full bg-gradient-to-r from-[#b47b25] via-[#f2d07a] to-[#fff3b0]" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050407] text-amber-50 [font-family:var(--font-body)]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(244,198,98,0.22),transparent_34%),radial-gradient(circle_at_18%_28%,rgba(120,43,38,0.20),transparent_30%),linear-gradient(135deg,#1b120b,#2a1a10_44%,#050407)]" />
      <div className="pointer-events-none fixed inset-0 opacity-35 [background-image:radial-gradient(rgba(250,226,169,.58)_1px,transparent_1px),radial-gradient(rgba(255,255,255,.14)_1px,transparent_1px)] [background-position:0_0,38px_46px] [background-size:96px_96px,138px_138px]" />

      <section className="relative mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/life-book-ai" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-200/20 bg-black/20 px-4 text-sm font-bold text-amber-50 transition hover:bg-amber-50/10">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            새로운 인생의 책 만들기
          </Link>
          <button type="button" onClick={() => void handlePdfDownload()} disabled={pdfLoading} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-amber-200 px-5 text-sm font-black text-[#171007] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60">
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
            PDF로 저장하기
          </button>
        </div>
        {pdfError && <div className="mb-4 rounded-2xl border border-rose-200/25 bg-rose-950/30 px-4 py-3 text-sm font-bold text-rose-100">{pdfError}</div>}

        <article id="life-book-result-document" className="rounded-3xl border border-amber-200/20 bg-amber-50/10 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-6">
          <header data-life-book-pdf-page className="rounded-3xl border border-amber-200/20 bg-[#100a08]/80 p-5 sm:p-7">
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-50/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-200">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              인생의 책 AI 상담 리포트
            </p>
            <h1 className="mt-5 text-3xl font-black leading-tight text-amber-50 sm:text-5xl">{report.title}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[#eadbb9]">{report.subtitle}</p>
            <div className="mt-5 grid gap-2 text-sm text-[#f0dec0] sm:grid-cols-2 lg:grid-cols-4">
              <span>이름: {userName}</span>
              <span>생년월일: {birth.birthDate || "미입력"}</span>
              <span>출생시간: {birth.birthTimeUnknown ? "모름" : birth.birthTime || "미입력"}</span>
              <span>생성일: {generatedAt ? generatedAt.slice(0, 10) : "확인 중"}</span>
              <span>성별: {formatGender(birth.gender)}</span>
              <span>달력 기준: {formatCalendar(birth.calendarType)}</span>
              <span>일간: {saju?.dayMaster || "계산 제한"}</span>
              <span>강조 영역: {result?.topic || "전체 인생 흐름"}</span>
            </div>
          </header>

          <div className="mt-5 grid gap-5 lg:grid-cols-[300px_1fr]">
            <aside className="h-fit rounded-3xl border border-amber-200/20 bg-[#100a08]/75 p-4 lg:sticky lg:top-6">
              <div className="flex items-center gap-2 text-sm font-black text-amber-200">
                <ScrollText className="h-4 w-4" aria-hidden="true" />
                목차
              </div>
              <nav className="mt-4 grid gap-2">
                {report.chapters.map((chapter, index) => (
                  <a key={`${chapter.title}-${index}`} href={`#chapter-${index + 1}`} className="rounded-2xl border border-amber-200/15 bg-amber-50/[0.06] px-3 py-2 text-sm font-bold text-[#f4dfbd] transition hover:bg-amber-50/12">
                    <span className="mr-2 text-amber-200">{String(index + 1).padStart(2, "0")}</span>
                    {chapter.title}
                  </a>
                ))}
              </nav>

              <div className="mt-5 rounded-2xl border border-amber-200/15 bg-black/20 p-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-200">십성</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CANONICAL_TEN_GODS.map((name) => (
                    <span key={name} className={`rounded-full border px-2.5 py-1 text-xs font-bold ${saju?.tenGods?.[name] ? "border-amber-200/35 bg-amber-100/15 text-amber-50" : "border-amber-100/10 bg-black/20 text-[#9d8b71]"}`}>
                      {name}{saju?.tenGods?.[name] ? ` ${saju.tenGods[name]}` : ""}
                    </span>
                  ))}
                </div>
              </div>
            </aside>

            <section className="grid gap-4">
              <section data-life-book-pdf-page className="rounded-3xl border border-amber-200/20 bg-[#100a08]/80 p-5">
                <div className="flex items-center gap-2 text-amber-200">
                  <ScrollText className="h-5 w-5" aria-hidden="true" />
                  <h2 className="text-xl font-black">기본 명식</h2>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {pillarRows.map((row) => (
                    <div key={row.label} className="rounded-2xl border border-amber-200/15 bg-amber-50/[0.06] p-3">
                      <p className="text-xs font-bold text-amber-200">{row.label}</p>
                      <p className="mt-1 text-sm font-black text-[#f4e6cb]">{row.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-amber-200/15 bg-black/20 p-4">
                    <h3 className="text-sm font-black text-amber-200">오행 분포</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {fiveElementEntries.length ? fiveElementEntries.map((entry) => (
                        <span key={entry.key} className="rounded-full border border-amber-200/20 bg-amber-100/10 px-3 py-1 text-xs font-bold text-[#f4e6cb]">
                          {entry.key} {entry.value}
                        </span>
                      )) : <span className="text-sm text-[#eadbb9]">계산 가능한 오행 값이 제한되어 있습니다.</span>}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-amber-200/15 bg-black/20 p-4">
                    <h3 className="text-sm font-black text-amber-200">십성 분포</h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tenGodEntries.length ? tenGodEntries.map((entry) => (
                        <span key={entry.key} className="rounded-full border border-amber-200/20 bg-amber-100/10 px-3 py-1 text-xs font-bold text-[#f4e6cb]">
                          {entry.key} {entry.value}
                        </span>
                      )) : <span className="text-sm text-[#eadbb9]">계산 가능한 십성 값이 제한되어 있습니다.</span>}
                    </div>
                  </div>
                </div>
              </section>

              {report.coreSummary && (
                <section data-life-book-pdf-page className="rounded-3xl border border-amber-200/20 bg-[#fff8ed12] p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">Core Summary</p>
                  <h2 className="mt-2 text-2xl font-black text-amber-50">{report.coreSummary.oneLine || "삶의 중심 문장"}</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-black/20 p-3 text-sm text-[#eadbb9]">{report.coreSummary.lifeTheme || "삶의 주제가 차분히 드러납니다."}</div>
                    <div className="rounded-2xl bg-black/20 p-3 text-sm text-[#eadbb9]">강한 기운: {report.coreSummary.strongestElement || "계산 기반 해석"}</div>
                    <div className="rounded-2xl bg-black/20 p-3 text-sm text-[#eadbb9]">보완점: {report.coreSummary.neededBalance || "균형을 살피는 흐름"}</div>
                  </div>
                </section>
              )}

              {report.chapters.map((chapter, index) => (
                <section id={`chapter-${index + 1}`} key={`${chapter.title}-${index}`} data-life-book-pdf-page className="scroll-mt-6 rounded-3xl border border-amber-200/20 bg-[#fff8ed12] p-5 shadow-inner shadow-amber-200/5">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-amber-200/30 bg-amber-100/10 text-sm font-black text-amber-200">
                      {String(chapter.chapterNumber || index + 1).padStart(2, "0")}
                    </span>
                    <h2 className="text-2xl font-black text-amber-50">{chapter.title}</h2>
                  </div>
                  {chapter.summary && <p className="mb-4 rounded-2xl border border-amber-200/15 bg-black/20 p-3 text-sm leading-6 text-[#f2dfba]">{chapter.summary}</p>}
                  <div className="space-y-3 text-[15px] leading-8 text-[#f4e6cb]">
                    {compactLines(chapter.content || "").map((line, lineIndex) => (
                      <p key={lineIndex}>{line.replace(/^[-*]\s*/, "")}</p>
                    ))}
                  </div>
                  {Array.isArray(chapter.advice) && chapter.advice.length > 0 && (
                    <div className="mt-4 grid gap-2">
                      {chapter.advice.map((advice, adviceIndex) => (
                        <div key={`${advice}-${adviceIndex}`} className="rounded-2xl border border-amber-200/15 bg-black/20 px-4 py-3 text-sm font-bold text-[#eadbb9]">
                          {advice}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ))}

              {report.expertReadings.length > 0 && (
                <section data-life-book-pdf-page className="rounded-3xl border border-amber-200/20 bg-[#100a08]/80 p-5">
                  <div className="flex items-center gap-2 text-amber-200">
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                    <h2 className="text-xl font-black">명식의 깊은 판독</h2>
                  </div>
                  <div className="mt-4 grid gap-4">
                    {report.expertReadings.map((reading, index) => (
                      <div key={`${reading.title || "reading"}-${index}`} className="rounded-2xl border border-amber-200/15 bg-amber-50/[0.06] p-4">
                        <h3 className="text-lg font-black text-amber-50">{reading.title || `깊은 판독 ${index + 1}`}</h3>
                        <div className="mt-3 space-y-3 text-[15px] leading-8 text-[#f4e6cb]">
                          {compactLines(reading.content || "").map((line, lineIndex) => (
                            <p key={lineIndex}>{line.replace(/^[-*]\s*/, "")}</p>
                          ))}
                        </div>
                        {Array.isArray(reading.guidance) && reading.guidance.length > 0 && (
                          <div className="mt-4 grid gap-2">
                            {reading.guidance.map((guide, guideIndex) => (
                              <div key={`${guide}-${guideIndex}`} className="rounded-2xl border border-amber-200/15 bg-black/20 px-4 py-3 text-sm font-bold text-[#eadbb9]">
                                {guide}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {report.finalMessage && (
                <section data-life-book-pdf-page className="rounded-3xl border border-amber-200/25 bg-amber-100/10 p-5">
                  <div className="flex items-center gap-2 text-amber-200">
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                    <h2 className="text-xl font-black">마지막 문장</h2>
                  </div>
                  <p className="mt-3 text-[15px] leading-8 text-[#f4e6cb]">{report.finalMessage}</p>
                </section>
              )}
            </section>
          </div>
        </article>
      </section>
    </main>
  );
}

export default function LifeBookResultPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <LifeBookResultContent />
    </Suspense>
  );
}
