"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp, Copy, Download, Loader2, Menu, RefreshCw, Sparkles, X } from "lucide-react";

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
  const [downloading, setDownloading] = useState(false);
  const batchInFlightRef = useRef(false);
  // 서버가 진척 없이 generating을 반복 반환할 때 generate-batch POST가 무한 폭주(Cloudflare 1015)하지 않도록
  // "무진척(stall)" 배치가 연속되면 중단한다. 챕터가 진행되면 리셋되므로 정상 생성에는 영향이 없다.
  const generationStallRef = useRef({ lastChapters: -1, stalls: 0 });
  const maxGenerationStalls = 6;

  const chapters = useMemo(() => [...(result?.chapters || [])].sort((a, b) => a.order - b.order), [result?.chapters]);
  const progress = result?.generationProgress || {};
  const percent = Math.max(4, Math.min(100, Math.round(Number(progress.percent || (result?.status === "completed" ? 100 : 8)))));
  const userName = result?.userInput?.name?.trim() || "당신";
  const keywords = result?.summaryCards?.keywords?.length ? result.summaryCards.keywords.slice(0, 3) : ["업의 매듭", "관계의 반복", "현실 전략"];

  const loadResult = useCallback(async () => {
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
      setError(caught instanceof Error ? caught.message : "운명의 업 리포트를 불러오지 못했습니다.");
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
      setError(caught instanceof Error ? caught.message : "장문 리포트 생성이 멈췄습니다. 같은 세션으로 다시 시도해 주세요.");
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
    try {
      const [{ default: html2canvas }, jsPdfModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const JsPDF = jsPdfModule.default || jsPdfModule.jsPDF;
      const pdf = new JsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const targets = Array.from(element.querySelectorAll<HTMLElement>("[data-kdai-pdf-page]"));
      for (const [index, target] of (targets.length ? targets : [element]).entries()) {
        const canvas = await html2canvas(target, {
          backgroundColor: "#080612",
          scale: Math.min(2, window.devicePixelRatio || 2),
          useCORS: true,
        });
        const imageData = canvas.toDataURL("image/png");
        const imageHeight = (canvas.height * pageWidth) / canvas.width;
        let remainingHeight = imageHeight;
        let position = 0;
        if (index > 0) pdf.addPage();
        pdf.addImage(imageData, "PNG", 0, position, pageWidth, imageHeight);
        remainingHeight -= pageHeight;
        while (remainingHeight > 0) {
          position = remainingHeight - imageHeight;
          pdf.addPage();
          pdf.addImage(imageData, "PNG", 0, position, pageWidth, imageHeight);
          remainingHeight -= pageHeight;
        }
      }
      const safeName = userName.replace(/[\\/:*?"<>|]/g, "_");
      pdf.save(`운명의업_장문리포트_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      setError("PDF 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
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
          <div className="kdai-generation__seal" aria-hidden="true">業</div>
          <span>Premium Karma Report</span>
          <h1>{progress.stageLabel || "운명의 실타래를 펼치는 중"}</h1>
          <p>{progress.currentChapterTitle || "장문 리포트를 순서대로 쓰고 있습니다."}</p>
          <div className="kdai-progress">
            <div style={{ width: `${percent}%` }} />
          </div>
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
              <button type="button" onClick={() => setTocOpen(false)} aria-label="목차 닫기"><X size={17} /></button>
            </div>
            <nav>
              {chapters.map((chapter) => (
                <a key={chapter.id} href={`#${chapter.id}`} onClick={() => setTocOpen(false)}>
                  <span>{chapter.order}</span>
                  {chapter.title}
                </a>
              ))}
            </nav>
          </aside>

          <section id="karma-premium-report" className="kdai-report">
            <header className="kdai-report-hero" data-kdai-pdf-page>
              <Link href="/karma-destiny-ai" className="kdai-back"><ArrowLeft size={17} /> 다시 보기</Link>
              <div className="kdai-report-hero__mark" aria-hidden="true">業</div>
              <span>운명의 업 AI 상담</span>
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
              <article>
                <span>총 글자 수</span>
                <strong>{Number(result?.totalCharCount || 0).toLocaleString("ko-KR")}자</strong>
              </article>
              <article>
                <span>완성된 장</span>
                <strong>{chapters.length}장</strong>
              </article>
              <article>
                <span>핵심 키워드</span>
                <strong>{keywords.join(" · ")}</strong>
              </article>
              <article>
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

            {chapters.map((chapter) => {
              const open = openChapters.has(chapter.id);
              return (
                <article id={chapter.id} className="kdai-chapter" data-kdai-pdf-page key={chapter.id}>
                  <button type="button" className="kdai-chapter__head" onClick={() => toggleChapter(chapter.id)}>
                    <span>{String(chapter.order).padStart(2, "0")}</span>
                    <h2>{chapter.title}</h2>
                    {open ? <ChevronUp size={19} /> : <ChevronDown size={19} />}
                  </button>
                  {open && (
                    <div className="kdai-chapter__body">
                      {chapter.highlightQuotes?.[0] && <blockquote>{chapter.highlightQuotes[0]}</blockquote>}
                      {chapter.content.split(/\n{2,}/).map((paragraph, index) => (
                        <p key={`${chapter.id}-${index}`}>{paragraph}</p>
                      ))}
                      <div className="kdai-core-box">
                        <strong>이번 장의 핵심</strong>
                        {(chapter.keyTakeaways || []).slice(0, 3).map((item) => <span key={item}>{item}</span>)}
                      </div>
                      <button type="button" className="kdai-copy-chapter" onClick={() => void copyText(buildChapterText(chapter), `${chapter.order}장을 복사했습니다.`)}>
                        <Copy size={16} /> 이 장 복사
                      </button>
                    </div>
                  )}
                </article>
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
      <style jsx>{`
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
          display: grid;
          width: 116px;
          height: 116px;
          place-items: center;
          border: 1px solid rgba(248, 208, 111, .42);
          border-radius: 50%;
          color: #f8d06f;
          background: rgba(9, 8, 24, .72);
          box-shadow: 0 0 60px rgba(248, 208, 111, .22), inset 0 0 42px rgba(126, 34, 206, .22);
          font-family: CodeDestinyDecorative, serif;
          font-size: 48px;
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

        .kdai-progress {
          overflow: hidden;
          width: min(520px, 86vw);
          height: 10px;
          border: 1px solid rgba(248, 208, 111, .28);
          border-radius: 999px;
          background: rgba(255, 255, 255, .08);
        }

        .kdai-progress div {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #f8d06f, #ef4444, #a78bfa);
          transition: width .4s ease;
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

        .kdai-toc a {
          display: grid;
          grid-template-columns: 28px minmax(0, 1fr);
          gap: 9px;
          align-items: center;
          border-radius: 8px;
          padding: 9px;
          color: rgba(255, 247, 223, .82);
          text-decoration: none;
          line-height: 1.38;
        }

        .kdai-toc a:hover {
          background: rgba(248, 208, 111, .1);
          color: #fff6dd;
        }

        .kdai-toc a span {
          display: grid;
          width: 28px;
          height: 28px;
          place-items: center;
          border: 1px solid rgba(248, 208, 111, .22);
          border-radius: 50%;
          color: #f8d06f;
          font-size: .8rem;
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
          color: rgba(255, 247, 223, .62);
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
          margin: 0 0 22px;
          border-left: 3px solid #f8d06f;
          padding: 10px 0 10px 18px;
          color: #ffe9a8;
          font-family: CodeDestinyPremium, CodeDestinyBody, serif;
          font-size: 1.08rem;
          line-height: 1.75;
        }

        .kdai-chapter__body p {
          max-width: 820px;
          margin: 0 0 18px;
          color: rgba(255, 247, 223, .9);
          font-size: clamp(1rem, 1.12vw, 1.08rem);
          line-height: 1.92;
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
