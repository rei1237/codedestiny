"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp, Copy, Download, Loader2, Menu, RefreshCw, Sparkles, X } from "lucide-react";
import { friendlyErrorMessage } from "@/app/_lib/friendly-error";
import AiResultProse from "@/components/fortune/AiResultProse";
import { readDevPreviewState } from "@/lib/dev-preview/core";
import { buildKarmaDestinyPreviewPayload } from "@/lib/dev-preview/fixtures/karma-destiny";

type Chapter = {
  id: string;
  order: number;
  title: string;
  content: string;
  summary?: string;
  keyTakeaways?: string[];
  highlightQuotes?: string[];
  charCount?: number;
};

type GenerationProgress = {
  totalChapters?: number;
  completedChapters?: number;
  currentChapterTitle?: string;
  percent?: number;
  stageLabel?: string;
};

type KarmaResult = {
  ok: boolean;
  sessionId?: string;
  reportId?: string;
  attemptId?: string;
  status?: "generating" | "completed" | "generation_failed" | string;
  generatedAt?: string;
  totalCharCount?: number;
  userInput?: {
    name?: string;
    gender?: string;
    birthDate?: string;
    birthTime?: string;
    calendarType?: string;
    birthPlace?: { city?: string; country?: string; timezone?: string };
    topic?: string;
    question?: string;
  };
  summaryCards?: {
    keywords?: string[];
    repeatingPattern?: string;
    currentTask?: string;
  } | null;
  chapters?: Chapter[];
  finalLetter?: string;
  qualityCheck?: {
    passed?: boolean;
    totalCharCount?: number;
    chapterCount?: number;
    promptLeakDetected?: boolean;
  } | null;
  generationProgress?: GenerationProgress;
  message?: string;
  reason?: string;
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok && payload?.ok !== true) {
    throw new Error(payload?.message || "운명의 업 리포트를 불러오지 못했습니다.");
  }
  return payload as T;
}

function formatDate(value?: string) {
  if (!value) return "생성 중";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "생성 중";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "long", timeStyle: "short" }).format(date);
}

function buildChapterText(chapter: Chapter) {
  const takeaways = (chapter.keyTakeaways || []).filter(Boolean).slice(0, 3);
  return [
    `${chapter.order}장. ${chapter.title}`,
    "",
    chapter.content,
    "",
    "이번 장의 핵심",
    ...takeaways.map((item) => `- ${item}`),
  ].filter(Boolean).join("\n");
}

/* ── 불교 업보 컨셉 라인아트 모티프 (전부 인라인 SVG → html2canvas PDF 캡처 안전, 장식이므로 aria-hidden) ── */

// 길상매듭(연결매듭) — "업의 매듭". unravel(0~1)이 오를수록 아래 실가닥이 풀려 늘어지고 코어 글로우가 강해진다.
function KnotMark({ unravel = 1, className = "" }: { unravel?: number; className?: string }) {
  const value = Math.max(0, Math.min(1, unravel));
  return (
    <svg
      className={`kdai-knot ${className}`.trim()}
      style={{ "--kdai-unravel": value } as CSSProperties}
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
    >
      <g className="kdai-knot__core" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M60 26c-11.5 0-19 8.2-19 18 0 7.2 4.8 12 11 12 5.4 0 8.8-3.4 8.8-8.2" />
        <path d="M60 26c11.5 0 19 8.2 19 18 0 7.2-4.8 12-11 12-5.4 0-8.8-3.4-8.8-8.2" />
        <path d="M26 60c0-11.5 8.2-19 18-19 7.2 0 12 4.8 12 11 0 5.4-3.4 8.8-8.2 8.8" />
        <path d="M94 60c0-11.5-8.2-19-18-19-7.2 0-12 4.8-12 11 0 5.4 3.4 8.8 8.2 8.8" />
        <circle cx="60" cy="60" r="6.6" />
      </g>
      <g className="kdai-knot__loose" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M52 82c-3 9-6.5 15-11 21" />
        <path d="M68 82c3 9 6.5 15 11 21" />
      </g>
    </svg>
  );
}

// 염주(念珠) — 완료 구슬은 채워진 금색, 미완료는 빈 구슬. layout으로 가로열/세로열 전환.
function MalaBeads({ total, filled, layout = "row", className = "" }: { total: number; filled: number; layout?: "row" | "column"; className?: string }) {
  return (
    <div className={`kdai-mala kdai-mala--${layout} ${className}`.trim()} data-total={total} aria-hidden="true">
      {Array.from({ length: total }).map((_, index) => (
        <span key={index} className={`kdai-mala__bead ${index < filled ? "is-filled" : ""}`.trim()} />
      ))}
    </div>
  );
}

// 연꽃 — 핵심 키워드 마커.
function LotusIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4c1.9 2 2.8 4.3 2.8 6.8 0 1.4-.4 2.7-1.1 3.9M12 4c-1.9 2-2.8 4.3-2.8 6.8 0 1.4.4 2.7 1.1 3.9" />
      <path d="M12 14.7c1.5-2.3 3.6-3.6 6-3.9-.2 2.6-1.6 4.7-4 6M12 14.7c-1.5-2.3-3.6-3.6-6-3.9.2 2.6 1.6 4.7 4 6" />
      <path d="M5 13.5c-1 .6-1.8 1.4-2.4 2.5C4.8 17.6 8 18.4 12 18.4s7.2-.8 9.4-2.4c-.6-1.1-1.4-1.9-2.4-2.5" />
    </svg>
  );
}

// 두루마리 경전 — 총 글자 수 마커.
function ScrollIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 5.5C7 4.4 6.1 3.5 5 3.5S3 4.4 3 5.5v1c0 .8.7 1.5 1.5 1.5H6" />
      <path d="M6 3.5h11c1.1 0 2 .9 2 2v11" />
      <path d="M17 20.5c1.1 0 2-.9 2-2s-.9-2-2-2H8.5" />
      <path d="M6 3.5v14c0 1.7 1.3 3 3 3h8" />
      <path d="M8.5 8.5h6M8.5 12h6" />
    </svg>
  );
}

// 법륜(法輪) — 현재 과제 마커.
function DharmaWheelIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M12 3.5v6.1M12 14.4v6.1M3.5 12h6.1M14.4 12h6.1M6 6l4.3 4.3M13.7 13.7 18 18M18 6l-4.3 4.3M10.3 13.7 6 18" />
    </svg>
  );
}

// 챕터 사이 장식 구분선(연꽃 + 매듭 글리프) — 각 장을 독립 페이지처럼 분리.
function ChapterDivider() {
  return (
    <div className="kdai-divider" aria-hidden="true">
      <span className="kdai-divider__line" />
      <LotusIcon className="kdai-divider__lotus" />
      <span className="kdai-divider__line" />
    </div>
  );
}

function KarmaDestinyResultInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams?.get("sessionId") || searchParams?.get("reportId") || searchParams?.get("attemptId") || searchParams?.get("idempotencyKey") || "";
  const [result, setResult] = useState<KarmaResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [continuing, setContinuing] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set());
  const [expandedBodies, setExpandedBodies] = useState<Set<string>>(new Set());
  const [activeChapterId, setActiveChapterId] = useState("");
  const [exporting, setExporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const batchInFlightRef = useRef(false);
  // 서버가 진척 없이 generating을 반복 반환할 때 generate-batch POST가 무한 폭주(Cloudflare 1015)하지 않도록
  // "무진척(stall)" 배치가 연속되면 중단한다. 챕터가 진행되면 리셋되므로 정상 생성에는 영향이 없다.
  const generationStallRef = useRef({ lastChapters: -1, stalls: 0 });
  // 배치 락 TTL 390s(서버) 동안 다른 탭/죽은 isolate가 락을 쥐면 무진척 라운드(~1.2s)가 이어진다.
  // 390s를 견디도록 상한을 설정(≈0.8req/s — CF 10초당 100회 제한 대비 충분한 여유).
  const maxGenerationStalls = 360;

  const chapters = useMemo(() => [...(result?.chapters || [])].sort((a, b) => a.order - b.order), [result?.chapters]);
  const progress = result?.generationProgress || {};
  const percent = Math.max(4, Math.min(100, Math.round(Number(progress.percent || (result?.status === "completed" ? 100 : 8)))));
  const userName = result?.userInput?.name?.trim() || "당신";
  const keywords = result?.summaryCards?.keywords?.length ? result.summaryCards.keywords.slice(0, 3) : ["업의 매듭", "관계의 반복", "현실 전략"];

  const loadResult = useCallback(async () => {
    const previewState = readDevPreviewState();
    if (previewState) {
      setResult(buildKarmaDestinyPreviewPayload(previewState) as KarmaResult);
      setError("");
      setLoading(false);
      return;
    }
    if (!sessionId) {
      setError("상담 세션을 찾을 수 없습니다.");
      setLoading(false);
      return;
    }
    try {
      const payload = await requestJson<KarmaResult>(`/api/karma-destiny-ai/result?sessionId=${encodeURIComponent(sessionId)}`);
      setResult(payload);
      setError("");
    } catch (caught) {
      setError(friendlyErrorMessage(caught, "운명의 업 리포트를 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const continueGeneration = useCallback(async () => {
    if (!sessionId || batchInFlightRef.current) return;
    batchInFlightRef.current = true;
    setContinuing(true);
    try {
      const payload = await requestJson<KarmaResult>("/api/karma-destiny-ai/generate-batch", {
        method: "POST",
        body: JSON.stringify({ sessionId }),
      });
      const completed = Number(payload?.generationProgress?.completedChapters ?? 0);
      const stall = generationStallRef.current;
      if (completed > stall.lastChapters) {
        stall.lastChapters = completed;
        stall.stalls = 0;
      } else {
        stall.stalls += 1;
      }
      setResult(payload);
      if (payload?.status === "generating" && stall.stalls >= maxGenerationStalls) {
        setError("장문 리포트 생성이 지연되고 있습니다. 같은 세션으로 다시 시도해 주세요.");
      } else {
        setError("");
      }
    } catch (caught) {
      setError(friendlyErrorMessage(caught, "장문 리포트 생성이 멈췄습니다. 같은 세션으로 다시 시도해 주세요."));
    } finally {
      batchInFlightRef.current = false;
      setContinuing(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadResult();
  }, [loadResult]);

  useEffect(() => {
    if (result?.status !== "generating" || error) return undefined;
    const timer = window.setTimeout(() => {
      void continueGeneration();
    }, continuing ? 2600 : 900);
    return () => window.clearTimeout(timer);
  }, [continueGeneration, continuing, error, result?.status, result?.generationProgress?.completedChapters]);

  useEffect(() => {
    if (result?.status !== "completed" || !chapters.length) return;
    setOpenChapters((prev) => (prev.size ? prev : new Set(chapters.map((chapter) => chapter.id))));
  }, [chapters, result?.status]);

  // 스크롤 스파이 — 화면 상단 근처에 걸린 챕터를 현재 읽는 장으로 표시(염주 레일/목차 동기화).
  useEffect(() => {
    if (result?.status !== "completed" || !chapters.length || typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.intersectionRatio);
          else visible.delete(entry.target.id);
        }
        let bestId = "";
        let bestRatio = 0;
        for (const [id, ratio] of visible) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        if (bestId) setActiveChapterId(bestId);
      },
      { rootMargin: "-12% 0px -70% 0px", threshold: [0.01, 0.25, 0.5] },
    );
    const nodes = chapters.map((chapter) => document.getElementById(chapter.id)).filter((node): node is HTMLElement => Boolean(node));
    nodes.forEach((node) => observer.observe(node));
    setActiveChapterId((prev) => prev || chapters[0]?.id || "");
    return () => observer.disconnect();
  }, [chapters, result?.status]);

  const copyText = async (text: string, message: string) => {
    await navigator.clipboard.writeText(text);
    setNotice(message);
    window.setTimeout(() => setNotice(""), 1800);
  };

  const copyAll = async () => {
    await copyText(chapters.map(buildChapterText).join("\n\n"), "전체 리포트를 복사했습니다.");
  };

  const handleDownload = async () => {
    const element = document.getElementById("karma-premium-report");
    if (!element || downloading) return;
    setDownloading(true);
    // 접힌 "더 읽기" 본문·미개봉 챕터가 PDF에서 잘리지 않도록 전 챕터를 펼친 뒤 캡처한다.
    setOpenChapters(new Set(chapters.map((chapter) => chapter.id)));
    setExpandedBodies(new Set(chapters.map((chapter) => chapter.id)));
    setExporting(true);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    try {
      const { exportResultPdf } = await import("@/lib/pdf/export-result-pdf");
      const safeName = userName.replace(/[\\/:*?"<>|]/g, "_");
      await exportResultPdf({
        captureTargets: ["#karma-premium-report [data-kdai-pdf-page]"],
        fileName: `운명의업_장문리포트_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`,
        backgroundColor: "#080612",
        cover: {
          title: `${userName}님의 운명의 업 장문 리포트`,
          subtitle: result?.userInput?.topic || "전체 운명의 업",
          name: userName,
          date: formatDate(result?.generatedAt),
        },
      });
    } catch {
      setError("PDF 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setExporting(false);
      setDownloading(false);
    }
  };

  const toggleChapter = (id: string) => {
    setOpenChapters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleBody = (id: string) => {
    setExpandedBodies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <main className="kdai-result-page">
        <div className="kdai-pending">
          <Loader2 className="kdai-spin" size={28} />
          <p>운명의 기록을 불러오는 중</p>
        </div>
        <ResultStyles />
      </main>
    );
  }

  if (error && !result) {
    return (
      <main className="kdai-result-page">
        <div className="kdai-error-state">
          <p>{error}</p>
          <Link href="/karma-destiny-ai"><ArrowLeft size={17} /> 다시 입력하기</Link>
        </div>
        <ResultStyles />
      </main>
    );
  }

  const isGenerating = result?.status === "generating";
  const isCompleted = result?.status === "completed";

  return (
    <main className="kdai-result-page">
      {notice && <div className="kdai-toast">{notice}</div>}

      {isGenerating && (
        <section className="kdai-generation" aria-live="polite">
          <div className="kdai-generation__seal" aria-hidden="true">
            <KnotMark unravel={percent / 100} className="kdai-generation__knot" />
            <span className="kdai-generation__glyph">業</span>
          </div>
          <span>Premium Karma Report</span>
          <h1>{progress.stageLabel || "업의 매듭을 푸는 중"}</h1>
          <p>{progress.currentChapterTitle || "장(章)을 순서대로 엮어 장문 리포트를 짓고 있습니다."}</p>
          <MalaBeads
            total={Number(progress.totalChapters || 16)}
            filled={Number(progress.completedChapters || 0)}
            className="kdai-generation__mala"
          />
          <strong>{percent}% · {Number(progress.completedChapters || 0)} / {Number(progress.totalChapters || 16)}장</strong>
          <button type="button" onClick={() => void continueGeneration()} disabled={continuing}>
            {continuing ? <Loader2 size={17} className="kdai-spin" /> : <RefreshCw size={17} />}
            <span>{continuing ? "다음 장을 여는 중" : "생성 이어가기"}</span>
          </button>
          {error && <p className="kdai-inline-error">{error}</p>}
        </section>
      )}

      {isCompleted && (
        <div className="kdai-reader-shell">
          <aside className={`kdai-toc ${tocOpen ? "is-open" : ""}`}>
            <div className="kdai-toc__head">
              <strong>목차</strong>
              <span className="kdai-toc__count">{chapters.length}장</span>
              <button type="button" onClick={() => setTocOpen(false)} aria-label="목차 닫기"><X size={17} /></button>
            </div>
            <nav className="kdai-toc__rail">
              {chapters.map((chapter) => {
                const active = activeChapterId === chapter.id;
                return (
                  <a
                    key={chapter.id}
                    href={`#${chapter.id}`}
                    className={active ? "is-active" : ""}
                    aria-current={active ? "true" : undefined}
                    onClick={() => setTocOpen(false)}
                  >
                    <span className="kdai-toc__bead" aria-hidden="true" />
                    <span className="kdai-toc__order">{String(chapter.order).padStart(2, "0")}</span>
                    <span className="kdai-toc__title">{chapter.title}</span>
                  </a>
                );
              })}
            </nav>
          </aside>

          <section id="karma-premium-report" className="kdai-report" data-kdai-exporting={exporting ? "true" : undefined}>
            <div className="kdai-mandala" aria-hidden="true" />
            <header className="kdai-report-hero" data-kdai-pdf-page>
              <Link href="/karma-destiny-ai" className="kdai-back"><ArrowLeft size={17} /> 다시 보기</Link>
              <div className="kdai-report-hero__mark" aria-hidden="true">業</div>
              <span>운명의 업 전문가 상담</span>
              <h1>{userName}님의 운명의 업 장문 리포트</h1>
              <p>{result?.userInput?.topic || "전체 운명의 업"} · {formatDate(result?.generatedAt)}</p>
              <div className="kdai-report-actions">
                <button type="button" onClick={() => setTocOpen(true)}><Menu size={17} /> 목차</button>
                <button type="button" onClick={() => void copyAll()}><Copy size={17} /> 전체 복사</button>
                <button type="button" onClick={handleDownload} disabled={downloading}>
                  {downloading ? <Loader2 size={17} className="kdai-spin" /> : <Download size={17} />}
                  PDF 저장
                </button>
              </div>
            </header>

            <section className="kdai-summary-grid" data-kdai-pdf-page>
              <article className="kdai-plaque">
                <ScrollIcon className="kdai-plaque__icon" />
                <span>총 글자 수</span>
                <strong>{Number(result?.totalCharCount || 0).toLocaleString("ko-KR")}자</strong>
              </article>
              <article className="kdai-plaque">
                <span className="kdai-plaque__icon" aria-hidden="true">
                  <MalaBeads total={Math.min(8, chapters.length)} filled={Math.min(8, chapters.length)} className="kdai-plaque__mala" />
                </span>
                <span>완성된 장</span>
                <strong>{chapters.length}장</strong>
              </article>
              <article className="kdai-plaque">
                <LotusIcon className="kdai-plaque__icon" />
                <span>핵심 키워드</span>
                <strong className="kdai-plaque__keywords">
                  {keywords.map((keyword) => <em key={keyword}>{keyword}</em>)}
                </strong>
              </article>
              <article className="kdai-plaque">
                <DharmaWheelIcon className="kdai-plaque__icon" />
                <span>현재 과제</span>
                <strong>{result?.summaryCards?.currentTask || "반복된 장면에서 다른 선택을 세우는 일"}</strong>
              </article>
            </section>

            <section className="kdai-pdf-toc" data-kdai-pdf-page>
              <span>Contents</span>
              <h2>목차</h2>
              <ol>
                {chapters.map((chapter) => <li key={chapter.id}>{chapter.order}장. {chapter.title}</li>)}
              </ol>
            </section>

            {chapters.map((chapter, index) => {
              const open = openChapters.has(chapter.id);
              const expanded = expandedBodies.has(chapter.id);
              const longBody = (chapter.content || "").length > 360;
              const clamp = longBody && !expanded && !exporting;
              return (
                <Fragment key={chapter.id}>
                  {index > 0 && <ChapterDivider />}
                  <article id={chapter.id} className={`kdai-chapter ${open ? "is-open" : ""}`.trim()} data-kdai-pdf-page>
                    <button type="button" className="kdai-chapter__head" onClick={() => toggleChapter(chapter.id)} aria-expanded={open}>
                      <span className="kdai-chapter__num">{String(chapter.order).padStart(2, "0")}</span>
                      <h2>{chapter.title}</h2>
                      {open ? <ChevronUp size={19} /> : <ChevronDown size={19} />}
                    </button>
                    {open && (
                      <div className="kdai-chapter__body">
                        {chapter.highlightQuotes?.[0] && (
                          <blockquote className="kdai-sutra">{chapter.highlightQuotes[0]}</blockquote>
                        )}
                        <div className={`kdai-chapter__prose ${clamp ? "is-clamped" : ""}`.trim()}>
                          <AiResultProse value={chapter.content} className="text-[#fff7df]/90" />
                        </div>
                        {longBody && (
                          <button type="button" className="kdai-more-toggle" onClick={() => toggleBody(chapter.id)} aria-expanded={expanded}>
                            <span>{expanded ? "본문 접기" : "본문 더 읽기"}</span>
                            {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </button>
                        )}
                        <div className="kdai-core-box">
                          <div className="kdai-core-box__head">
                            <LotusIcon className="kdai-core-box__icon" />
                            <strong>이번 장의 핵심</strong>
                          </div>
                          {(chapter.keyTakeaways || []).slice(0, 3).map((item) => <span key={item}>{item}</span>)}
                        </div>
                        <button type="button" className="kdai-copy-chapter" onClick={() => void copyText(buildChapterText(chapter), `${chapter.order}장을 복사했습니다.`)}>
                          <Copy size={16} /> 이 장 복사
                        </button>
                      </div>
                    )}
                  </article>
                </Fragment>
              );
            })}

            <footer className="kdai-disclaimer" data-kdai-pdf-page>
              이 상담은 운명학적 상징과 자기 성찰을 돕기 위한 콘텐츠이며, 의료·법률·투자 판단을 대신하지 않습니다.
            </footer>
          </section>
        </div>
      )}

      {!isGenerating && !isCompleted && (
        <section className="kdai-error-state">
          <p>{error || result?.message || "리포트 생성이 완료되지 않았습니다."}</p>
          <Link href="/karma-destiny-ai"><ArrowLeft size={17} /> 다시 입력하기</Link>
        </section>
      )}

      <ResultStyles />
    </main>
  );
}

function ResultStyles() {
  return (
    <>
      <style jsx global>{`
        body:has(.kdai-result-page) header,
        body:has(.kdai-result-page) footer,
        body:has(.kdai-result-page) .site-header,
        body:has(.kdai-result-page) .site-footer,
        body:has(.kdai-result-page) .app-chrome__header,
        body:has(.kdai-result-page) .app-chrome__footer {
          display: none !important;
        }
      `}</style>
      {/* styled-jsx는 <style jsx>가 선언된 컴포넌트(ResultStyles) 트리에만 스코프 클래스를 붙인다.
          실제 .kdai-* 엘리먼트는 부모(KarmaDestinyAiResultClient)에서 렌더되므로 scoped 모드로는
          전혀 매치되지 않아 전체 결과 화면이 무스타일 텍스트로 노출되던 버그 — global로 전환. */}
      <style jsx global>{`
        .kdai-result-page {
          min-height: 100vh;
          color: #f8efd8;
          background:
            radial-gradient(circle at 18% 8%, rgba(126, 34, 206, .28), transparent 28%),
            radial-gradient(circle at 88% 14%, rgba(185, 28, 28, .2), transparent 30%),
            linear-gradient(135deg, #060814 0%, #111021 42%, #1f132a 70%, #071923 100%);
          font-family: CodeDestinyBody, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .kdai-spin {
          animation: kdaiSpin 1s linear infinite;
        }

        .kdai-pending,
        .kdai-error-state,
        .kdai-generation {
          display: flex;
          min-height: 100vh;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 16px;
          padding: 24px;
          text-align: center;
        }

        .kdai-generation__seal {
          position: relative;
          display: grid;
          width: 158px;
          height: 158px;
          place-items: center;
          color: #f8d06f;
        }

        .kdai-generation__glyph {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          font-family: CodeDestinyDecorative, serif;
          font-size: 30px;
          color: rgba(255, 233, 168, .92);
          text-shadow: 0 0 22px rgba(248, 208, 111, .55);
        }

        .kdai-generation span,
        .kdai-report-hero > span,
        .kdai-pdf-toc > span {
          color: #f8d06f;
          font-size: .76rem;
          font-weight: 800;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .kdai-generation h1,
        .kdai-report-hero h1 {
          margin: 0;
          color: #fff6dd;
          font-family: CodeDestinyDisplay, serif;
          font-size: clamp(2rem, 5vw, 4.8rem);
          letter-spacing: 0;
        }

        .kdai-generation p {
          max-width: 620px;
          margin: 0;
          color: rgba(255, 247, 223, .78);
          line-height: 1.75;
        }

        button,
        .kdai-back,
        .kdai-error-state a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          border: 1px solid rgba(248, 208, 111, .26);
          border-radius: 8px;
          padding: 0 14px;
          color: #fff6dd;
          background: rgba(255, 255, 255, .08);
          font: inherit;
          text-decoration: none;
          cursor: pointer;
        }

        button:disabled {
          cursor: wait;
          opacity: .7;
        }

        .kdai-reader-shell {
          display: grid;
          grid-template-columns: 270px minmax(0, 1fr);
          gap: 24px;
          max-width: 1380px;
          margin: 0 auto;
          padding: clamp(14px, 2.8vw, 34px);
        }

        .kdai-toc {
          position: sticky;
          top: 18px;
          align-self: start;
          max-height: calc(100vh - 36px);
          overflow: auto;
          border: 1px solid rgba(248, 208, 111, .2);
          border-radius: 8px;
          background: rgba(8, 6, 18, .78);
          backdrop-filter: blur(18px);
        }

        .kdai-toc__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px;
          border-bottom: 1px solid rgba(248, 208, 111, .16);
        }

        .kdai-toc__head button {
          display: none;
        }

        .kdai-toc nav {
          display: grid;
          gap: 4px;
          padding: 10px;
        }

        .kdai-report {
          display: grid;
          gap: 18px;
        }

        .kdai-report-hero,
        .kdai-summary-grid article,
        .kdai-pdf-toc,
        .kdai-chapter,
        .kdai-disclaimer {
          border: 1px solid rgba(248, 208, 111, .2);
          border-radius: 8px;
          background: rgba(8, 6, 18, .78);
          box-shadow: inset 0 1px 0 rgba(255, 247, 223, .08), 0 24px 70px rgba(0, 0, 0, .22);
        }

        .kdai-report-hero {
          position: relative;
          overflow: hidden;
          min-height: 390px;
          padding: clamp(18px, 4vw, 46px);
        }

        .kdai-report-hero__mark {
          position: absolute;
          right: clamp(22px, 6vw, 80px);
          bottom: clamp(12px, 4vw, 48px);
          color: rgba(248, 208, 111, .12);
          font-family: CodeDestinyDecorative, serif;
          font-size: clamp(7rem, 18vw, 15rem);
          line-height: .8;
        }

        .kdai-back {
          margin-bottom: clamp(34px, 8vw, 96px);
        }

        .kdai-report-hero p {
          max-width: 680px;
          margin: 14px 0 0;
          color: rgba(255, 247, 223, .76);
          line-height: 1.75;
        }

        .kdai-report-actions {
          position: relative;
          z-index: 1;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 28px;
        }

        .kdai-summary-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        .kdai-summary-grid article {
          padding: 18px;
        }

        .kdai-summary-grid span {
          display: block;
          margin-bottom: 9px;
          color: rgba(255, 247, 223, .78);
          font-size: .82rem;
        }

        .kdai-summary-grid strong {
          color: #fff6dd;
          line-height: 1.45;
        }

        .kdai-pdf-toc {
          padding: clamp(18px, 3vw, 32px);
        }

        .kdai-pdf-toc h2 {
          margin: 8px 0 18px;
          color: #fff6dd;
          font-family: CodeDestinyDisplay, serif;
          font-size: clamp(1.8rem, 3vw, 2.8rem);
          letter-spacing: 0;
        }

        .kdai-pdf-toc ol {
          columns: 2;
          margin: 0;
          padding-left: 22px;
          color: rgba(255, 247, 223, .84);
          line-height: 1.9;
        }

        .kdai-chapter {
          scroll-margin-top: 18px;
          overflow: hidden;
        }

        .kdai-chapter__head {
          display: grid;
          width: 100%;
          grid-template-columns: 48px minmax(0, 1fr) 28px;
          min-height: 76px;
          border: 0;
          border-radius: 0;
          padding: 16px clamp(16px, 3vw, 28px);
          background: linear-gradient(90deg, rgba(248, 208, 111, .12), rgba(255, 255, 255, .03));
          text-align: left;
        }

        .kdai-chapter__head span {
          display: grid;
          width: 38px;
          height: 38px;
          place-items: center;
          border: 1px solid rgba(248, 208, 111, .3);
          border-radius: 50%;
          color: #f8d06f;
        }

        .kdai-chapter__head h2 {
          margin: 0;
          color: #fff6dd;
          font-family: CodeDestinyDisplay, serif;
          font-size: clamp(1.28rem, 2vw, 2rem);
          letter-spacing: 0;
        }

        .kdai-chapter__body {
          padding: clamp(18px, 3vw, 34px);
        }

        .kdai-chapter__body blockquote {
          position: relative;
          margin: 0 0 24px;
          border: 0;
          border-left: 2px solid rgba(248, 208, 111, .85);
          padding: 8px 0 8px 20px;
          color: #ffe9a8;
          font-family: CodeDestinyPremium, CodeDestinyBody, serif;
          font-style: italic;
          font-size: 1.12rem;
          line-height: 1.85;
          letter-spacing: -0.01em;
          text-wrap: balance;
        }

        .kdai-core-box {
          display: grid;
          gap: 10px;
          max-width: 820px;
          margin-top: 24px;
          border: 1px solid rgba(248, 208, 111, .24);
          border-radius: 8px;
          padding: 16px;
          background: rgba(248, 208, 111, .08);
        }

        .kdai-core-box strong {
          color: #f8d06f;
        }

        .kdai-core-box span {
          color: rgba(255, 247, 223, .86);
          line-height: 1.62;
        }

        .kdai-copy-chapter {
          margin-top: 18px;
        }

        .kdai-disclaimer {
          padding: 22px;
          color: rgba(255, 247, 223, .72);
          line-height: 1.7;
        }

        .kdai-toast {
          position: fixed;
          z-index: 20;
          top: 18px;
          left: 50%;
          transform: translateX(-50%);
          border: 1px solid rgba(248, 208, 111, .26);
          border-radius: 8px;
          padding: 10px 14px;
          background: rgba(8, 6, 18, .9);
          box-shadow: 0 18px 44px rgba(0, 0, 0, .28);
        }

        .kdai-inline-error {
          color: #fecaca;
        }

        @media (max-width: 960px) {
          .kdai-reader-shell {
            grid-template-columns: 1fr;
            padding: 12px;
          }

          .kdai-toc {
            position: fixed;
            z-index: 30;
            inset: auto 10px 10px;
            max-height: 68vh;
            transform: translateY(calc(100% + 16px));
            transition: transform .2s ease;
          }

          .kdai-toc.is-open {
            transform: translateY(0);
          }

          .kdai-toc__head button {
            display: inline-flex;
            min-width: 38px;
            min-height: 38px;
            padding: 0;
          }

          .kdai-summary-grid {
            grid-template-columns: 1fr;
          }

          .kdai-pdf-toc ol {
            columns: 1;
          }

          .kdai-chapter__head {
            grid-template-columns: 42px minmax(0, 1fr) 26px;
          }
        }

        @keyframes kdaiSpin {
          to { transform: rotate(360deg); }
        }

        /* ───────── 불교 업보 모티프 레이어 ───────── */

        /* 길상매듭 — unravel(0~1)이 오를수록 실가닥이 풀리고 글로우가 강해진다 */
        .kdai-knot {
          color: #f8d06f;
          filter: drop-shadow(0 0 calc(6px + 20px * var(--kdai-unravel, 1)) rgba(248, 208, 111, calc(.22 + .38 * var(--kdai-unravel, 1))));
          transition: filter .5s cubic-bezier(.22, 1, .36, 1);
        }

        .kdai-knot__core {
          opacity: calc(.72 + .28 * var(--kdai-unravel, 1));
          transition: opacity .5s cubic-bezier(.22, 1, .36, 1);
        }

        .kdai-knot__loose {
          opacity: var(--kdai-unravel, 1);
          transform-origin: 60px 82px;
          transform: scaleY(calc(.35 + .65 * var(--kdai-unravel, 1)));
          transition: transform .5s cubic-bezier(.22, 1, .36, 1), opacity .5s ease;
        }

        /* 염주 */
        .kdai-mala {
          display: flex;
          gap: 8px;
        }

        .kdai-mala--row {
          flex-flow: row wrap;
          align-items: center;
          justify-content: center;
          max-width: min(560px, 90vw);
        }

        .kdai-mala--column {
          flex-direction: column;
        }

        .kdai-mala__bead {
          width: 13px;
          height: 13px;
          border-radius: 50%;
          border: 1px solid rgba(248, 208, 111, .5);
          background: rgba(255, 255, 255, .05);
          transition: background .4s ease, box-shadow .4s ease, border-color .4s ease;
        }

        .kdai-mala__bead.is-filled {
          border-color: #f8d06f;
          background: radial-gradient(circle at 35% 30%, #ffe9a8, #e0a83c);
          box-shadow: 0 0 10px rgba(248, 208, 111, .5);
        }

        .kdai-generation__mala {
          margin: 6px 0 2px;
        }

        /* 목차 — 세로 염주 레일 + 스크롤 스파이 */
        .kdai-toc__count {
          margin: 0 auto 0 10px;
          color: #f8d06f;
          font-size: .74rem;
          letter-spacing: .04em;
        }

        .kdai-toc__rail {
          position: relative;
        }

        .kdai-toc__rail::before {
          content: "";
          position: absolute;
          top: 22px;
          bottom: 22px;
          left: 22px;
          width: 1px;
          background: linear-gradient(180deg, transparent, rgba(248, 208, 111, .3) 12%, rgba(248, 208, 111, .3) 88%, transparent);
        }

        .kdai-toc__rail a {
          position: relative;
          display: grid;
          grid-template-columns: 26px 24px minmax(0, 1fr);
          gap: 8px;
          align-items: center;
          border-radius: 8px;
          padding: 8px 9px;
          color: rgba(255, 247, 223, .84);
          text-decoration: none;
          line-height: 1.4;
        }

        .kdai-toc__rail a:hover {
          background: rgba(248, 208, 111, .08);
          color: #fff6dd;
        }

        .kdai-toc__bead {
          justify-self: center;
          width: 11px;
          height: 11px;
          border-radius: 50%;
          border: 1px solid rgba(248, 208, 111, .55);
          background: rgba(8, 6, 18, .92);
          transition: background .3s ease, box-shadow .3s ease, transform .3s ease;
        }

        .kdai-toc__order {
          color: rgba(248, 208, 111, .82);
          font-size: .74rem;
        }

        .kdai-toc__title {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .kdai-toc__rail a.is-active {
          background: rgba(248, 208, 111, .12);
          color: #fff6dd;
        }

        .kdai-toc__rail a.is-active .kdai-toc__bead {
          background: radial-gradient(circle at 35% 30%, #ffe9a8, #e0a83c);
          box-shadow: 0 0 12px rgba(248, 208, 111, .6);
          transform: scale(1.18);
        }

        .kdai-toc__rail a.is-active::before {
          content: "";
          position: absolute;
          left: 0;
          top: 8px;
          bottom: 8px;
          width: 2px;
          border-radius: 2px;
          background: #f8d06f;
          box-shadow: 0 0 10px rgba(248, 208, 111, .55);
        }

        /* 현판/석판 요약 카드 */
        .kdai-plaque {
          position: relative;
          display: grid;
          gap: 7px;
          align-content: start;
        }

        .kdai-plaque::before {
          content: "";
          position: absolute;
          inset: 6px;
          border: 1px solid rgba(248, 208, 111, .14);
          border-radius: 5px;
          pointer-events: none;
        }

        .kdai-plaque__icon {
          width: 26px;
          height: 26px;
          color: #f8d06f;
        }

        .kdai-plaque__mala {
          gap: 5px;
        }

        .kdai-plaque__mala .kdai-mala__bead {
          width: 9px;
          height: 9px;
        }

        .kdai-plaque__keywords {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .kdai-plaque__keywords em {
          border: 1px solid rgba(248, 208, 111, .3);
          border-radius: 999px;
          padding: 3px 10px;
          color: #ffe9a8;
          font-size: .86rem;
          font-style: normal;
        }

        /* 챕터 열림 번호 글로우 */
        .kdai-chapter.is-open .kdai-chapter__num {
          border-color: rgba(248, 208, 111, .7);
          background: radial-gradient(circle at 40% 30%, rgba(255, 233, 168, .32), transparent 70%);
          box-shadow: 0 0 16px rgba(248, 208, 111, .35);
          color: #ffe9a8;
        }

        /* 본문 클램프 + 더보기 */
        .kdai-chapter__prose {
          position: relative;
        }

        .kdai-chapter__prose.is-clamped {
          max-height: 12.5em;
          overflow: hidden;
          -webkit-mask-image: linear-gradient(180deg, #000 62%, transparent);
          mask-image: linear-gradient(180deg, #000 62%, transparent);
        }

        .kdai-more-toggle {
          min-height: 42px;
          margin-top: 12px;
          padding: 0 16px;
          border-color: rgba(248, 208, 111, .3);
          color: #ffe9a8;
          background: rgba(248, 208, 111, .08);
          font-size: .9rem;
        }

        .kdai-more-toggle:hover {
          background: rgba(248, 208, 111, .14);
        }

        /* 이번 장의 핵심 헤더 */
        .kdai-core-box__head {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .kdai-core-box__icon {
          width: 20px;
          height: 20px;
          color: #f8d06f;
        }

        /* 챕터 구분선 */
        .kdai-divider {
          display: flex;
          align-items: center;
          gap: 14px;
          margin: 4px clamp(12px, 4vw, 40px);
          color: rgba(248, 208, 111, .55);
        }

        .kdai-divider__line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(248, 208, 111, .3), transparent);
        }

        .kdai-divider__lotus {
          width: 24px;
          height: 24px;
          opacity: .8;
        }

        /* 배경 만다라 (≤5% opacity) */
        .kdai-mandala {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          opacity: .04;
          background-image:
            repeating-conic-gradient(from 0deg at 50% 22%, #f8d06f 0 .6deg, transparent .6deg 15deg),
            radial-gradient(circle at 50% 22%, transparent 0 29%, rgba(248, 208, 111, .7) 29.4% 30%, transparent 30.4%);
          background-repeat: no-repeat;
          background-size: 640px 640px;
          background-position: center top;
          mask-image: radial-gradient(circle at 50% 22%, #000, transparent 58%);
          -webkit-mask-image: radial-gradient(circle at 50% 22%, #000, transparent 58%);
        }

        .kdai-report > *:not(.kdai-mandala) {
          position: relative;
          z-index: 1;
        }

        /* PDF 캡처 시 접힌 본문 전부 펼침 */
        .kdai-report[data-kdai-exporting="true"] .kdai-chapter__prose.is-clamped {
          max-height: none;
          -webkit-mask-image: none;
          mask-image: none;
        }

        .kdai-report[data-kdai-exporting="true"] .kdai-more-toggle {
          display: none;
        }

        @media (max-width: 960px) {
          .kdai-generation__mala {
            max-width: 92vw;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .kdai-knot,
          .kdai-knot__core,
          .kdai-knot__loose,
          .kdai-mala__bead,
          .kdai-toc__bead {
            transition: none;
          }
        }
      `}</style>
    </>
  );
}

export default function KarmaDestinyAiResultClient() {
  return (
    <Suspense fallback={(
      <main className="kdai-result-page">
        <div className="kdai-pending">
          <Loader2 className="kdai-spin" size={28} />
          <p>운명의 기록을 불러오는 중</p>
        </div>
        <ResultStyles />
      </main>
    )}>
      <KarmaDestinyResultInner />
    </Suspense>
  );
}
