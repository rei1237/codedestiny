"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Fragment, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp, Copy, Download, Loader2, Menu, RefreshCw, X } from "lucide-react";
import { friendlyErrorMessage } from "@/app/_lib/friendly-error";
import AiResultProse from "@/components/fortune/AiResultProse";
import { readDevPreviewState } from "@/lib/dev-preview/core";
import { buildKarmaDestinyPreviewPayload } from "@/lib/dev-preview/fixtures/karma-destiny";
import EvidenceDisclosure from "./_components/EvidenceDisclosure";
import LensRadar from "./_components/LensRadar";
import ObservatoryLoader from "./_components/ObservatoryLoader";
import SectionTabs, { type SectionTab } from "./_components/SectionTabs";
import {
  ConstellationMark,
  NorthStarIcon,
  ObservatoryLogIcon,
  OrreryIcon,
  SectionDivider,
  StarChain,
  Starfield,
} from "./_components/ObservatorySvg";
import ResultStyles from "./_components/ResultStyles";
import {
  buildChapterText,
  normalizeReport,
  pickTodayLine,
  type KarmaResult,
} from "./_lib/report-model";

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

type Density = "full" | "summary";

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
  const [openEvidence, setOpenEvidence] = useState<Set<string>>(new Set());
  const [activeChapterId, setActiveChapterId] = useState("");
  const [activeSectionId, setActiveSectionId] = useState("");
  const [density, setDensity] = useState<Density>("full");
  const [readCount, setReadCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const batchInFlightRef = useRef(false);
  const readIdsRef = useRef<Set<string>>(new Set());
  // handleDownload 가 전 챕터를 강제로 펼치면 스크롤 없이 DOM 이 뷰포트에 들어와 "전부 읽음"
  // 으로 오염된다. state 가 아니라 ref 여야 옵저버 콜백이 최신값을 본다.
  const exportingRef = useRef(false);
  // 서버가 진척 없이 generating을 반복 반환할 때 generate-batch POST가 무한 폭주(Cloudflare 1015)하지 않도록
  // "무진척(stall)" 배치가 연속되면 중단한다. 챕터가 진행되면 리셋되므로 정상 생성에는 영향이 없다.
  const generationStallRef = useRef({ lastChapters: -1, stalls: 0 });
  // 배치 락 TTL 390s(서버) 동안 다른 탭/죽은 isolate가 락을 쥐면 무진척 라운드(~1.2s)가 이어진다.
  // 390s를 견디도록 상한을 설정(≈0.8req/s — CF 10초당 100회 제한 대비 충분한 여유).
  const maxGenerationStalls = 360;

  const report = useMemo(() => normalizeReport(result), [result]);
  // `report?.chapters || []` 를 그대로 쓰면 report 가 null 인 동안 매 렌더 새 배열이 되어
  // 아래 스파이 옵저버가 폴링마다 재생성된다.
  const chapters = useMemo(() => report?.chapters || [], [report]);
  const progress = result?.generationProgress || {};
  const percent = Math.max(4, Math.min(100, Math.round(Number(progress.percent || (result?.status === "completed" ? 100 : 8)))));
  const userName = result?.userInput?.name?.trim() || "당신";
  const keywords = result?.summaryCards?.keywords?.length ? result.summaryCards.keywords.slice(0, 3) : ["업의 매듭", "관계의 반복", "현실 전략"];
  const todayLine = useMemo(() => pickTodayLine(report?.keyLines || []), [report?.keyLines]);

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

  // 밀도 선호는 세션 단위로만 기억한다. localStorage 면 다른 리포트와 섞인다.
  useEffect(() => {
    if (!sessionId || typeof window === "undefined") return;
    const saved = window.sessionStorage.getItem(`kdai:density:${sessionId}`);
    if (saved === "summary" || saved === "full") setDensity(saved);
    const savedRead = window.sessionStorage.getItem(`kdai:read:${sessionId}`);
    if (savedRead) {
      try {
        const ids: string[] = JSON.parse(savedRead);
        readIdsRef.current = new Set(ids);
        setReadCount(readIdsRef.current.size);
      } catch {
        /* 저장값이 깨졌으면 그냥 처음부터 센다. */
      }
    }
  }, [sessionId]);

  const changeDensity = useCallback((next: Density) => {
    setDensity(next);
    if (sessionId && typeof window !== "undefined") window.sessionStorage.setItem(`kdai:density:${sessionId}`, next);
  }, [sessionId]);

  // 스크롤 스파이 — 섹션 탭·염주 레일·읽기 진행률·순차 등장을 옵저버 하나로 처리한다.
  // rootMargin/threshold 는 기존 튜닝값 그대로다(활성 판정이 이 값에 맞춰져 있다).
  useEffect(() => {
    if (result?.status !== "completed" || !chapters.length || typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, number>();
    const markRead = (id: string) => {
      if (exportingRef.current || readIdsRef.current.has(id)) return;
      readIdsRef.current.add(id);
      setReadCount(readIdsRef.current.size);
      if (sessionId && typeof window !== "undefined") {
        window.sessionStorage.setItem(`kdai:read:${sessionId}`, JSON.stringify([...readIdsRef.current]));
      }
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const node = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            visible.set(node.id, entry.intersectionRatio);
            node.classList.add("is-revealed");
            markRead(node.id);
          } else {
            visible.delete(node.id);
          }
        }
        let bestId = "";
        let bestRatio = 0;
        for (const [id, ratio] of visible) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        }
        if (!bestId) return;
        const kind = document.getElementById(bestId)?.dataset.kdaiSpy;
        if (kind === "section") setActiveSectionId(bestId);
        else setActiveChapterId(bestId);
      },
      { rootMargin: "-12% 0px -70% 0px", threshold: [0.01, 0.25, 0.5] },
    );
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-kdai-spy]"));
    nodes.forEach((node) => observer.observe(node));
    setActiveChapterId((prev) => prev || chapters[0]?.id || "");
    return () => observer.disconnect();
  }, [chapters, density, result?.status, sessionId]);

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
    // 접힌 "더 읽기" 본문·미개봉 챕터·요약 모드가 PDF에서 잘리지 않도록 전부 펼친 뒤 캡처한다.
    setOpenChapters(new Set(chapters.map((chapter) => chapter.id)));
    setExpandedBodies(new Set(chapters.map((chapter) => chapter.id)));
    changeDensity("full");
    exportingRef.current = true;
    setExporting(true);
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    try {
      const { exportResultPdf } = await import("@/lib/pdf/export-result-pdf");
      const safeName = userName.replace(/[\\/:*?"<>|]/g, "_");
      await exportResultPdf({
        captureTargets: ["#karma-premium-report [data-kdai-pdf-page]"],
        fileName: `운명의업_장문리포트_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`,
        backgroundColor: "#060A18",
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
      exportingRef.current = false;
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

  const toggleEvidence = (id: string, open: boolean) => {
    setOpenEvidence((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
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
  const summaryMode = density === "summary" && !exporting;

  // 탭은 실제로 마운트된 섹션에서만 만든다. 렌더되지 않는 단으로 가는 탭이 있으면 안 된다.
  const sectionTabs: SectionTab[] = [
    { id: "kdo-core", label: "핵심" },
    ...(report?.energyScores.length ? [{ id: "kdo-score", label: "에너지" }] : []),
    ...(report?.synthesis ? [{ id: "kdo-synthesis", label: "종합" }] : []),
    ...(report?.timeline.length ? [{ id: "kdo-map", label: "운명 지도" }] : []),
    { id: "kdo-cards", label: "카테고리" },
    ...(report?.actionItems.length || report?.letter ? [{ id: "kdo-action", label: "행동 전략" }] : []),
    ...(todayLine ? [{ id: "kdo-today", label: "오늘의 문장" }] : []),
  ];
  const totalSpyNodes = sectionTabs.length + (report?.categories.length || 0);
  const readProgress = totalSpyNodes > 0 ? Math.min(1, readCount / totalSpyNodes) : 0;

  return (
    <main className="kdai-result-page">
      {notice && <div className="kdai-toast">{notice}</div>}

      {isGenerating && (
        <ObservatoryLoader
          stageIndex={progress.stageIndex}
          totalStages={progress.totalStages}
          percent={percent}
          stageLabel={progress.stageLabel || "운명의 별자리를 잇는 중"}
          detail={progress.currentChapterTitle || "다섯 관점을 순서대로 이어 하나의 운명 지도를 짓고 있습니다."}
        >
          <StarChain
            total={Number(progress.totalChapters || 15)}
            filled={Number(progress.completedChapters || 0)}
            className="kdo-loader__chain"
          />
          <span className="kdo-loader__count">
            {Number(progress.completedChapters || 0)} / {Number(progress.totalChapters || 15)}장
          </span>
          <button type="button" className="kdo-loader__retry" onClick={() => void continueGeneration()} disabled={continuing}>
            {continuing ? <Loader2 size={17} className="kdai-spin" /> : <RefreshCw size={17} />}
            <span>{continuing ? "다음 장을 여는 중" : "생성 이어가기"}</span>
          </button>
          {error && <p className="kdai-inline-error">{error}</p>}
        </ObservatoryLoader>
      )}

      {isCompleted && report && (
        <div className="kdo-observatory">
          <aside className={`kdai-toc ${tocOpen ? "is-open" : ""}`}>
            <div className="kdai-toc__head">
              <strong>목차</strong>
              <span className="kdai-toc__count">{chapters.length}장</span>
              <button type="button" onClick={() => setTocOpen(false)} aria-label="목차 닫기"><X size={17} /></button>
            </div>
            <SectionTabs tabs={sectionTabs} activeId={activeSectionId} progress={readProgress} variant="rail" />
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
            <Starfield />

            <header className="kdai-report-hero kdo-pane kdo-pane--aurora" data-kdai-pdf-page>
              <Link href="/karma-destiny-ai" className="kdai-back"><ArrowLeft size={17} /> 다시 보기</Link>
              <ConstellationMark unravel={1} className="kdo-hero__mark" />
              <span>운명의 업 · Karma Destiny AI</span>
              <h1>{userName}님의 운명 지도</h1>
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

            {/* ① 운명의 핵심 문장 */}
            <section id="kdo-core" data-kdai-spy="section" data-kdo-reveal className="kdo-core kdo-pane kdo-pane--aurora" data-kdai-pdf-page>
              <span className="kdo-kicker">이번 삶을 관통하는 한 문장</span>
              <p className="kdo-core__line">{report.heroSentence}</p>
              <div className="kdo-core__meta">
                <span><ObservatoryLogIcon className="kdo-core__icon" /> {Number(result?.totalCharCount || 0).toLocaleString("ko-KR")}자</span>
                <span><NorthStarIcon className="kdo-core__icon" /> {chapters.length}장</span>
                <span className="kdo-core__keywords">{keywords.map((keyword) => <em key={keyword}>{keyword}</em>)}</span>
              </div>
            </section>

            {/* ② 영역별 에너지 강도 */}
            {report.energyScores.length > 0 && (
              <section id="kdo-score" data-kdai-spy="section" data-kdo-reveal className="kdo-energy kdo-pane" data-kdai-pdf-page>
                <span className="kdo-kicker">영역별 에너지 강도</span>
                <h2>지금 어디에 힘이 실려 있는가</h2>
                <ul className="kdo-energy__list">
                  {report.energyScores.map((score) => (
                    <li key={score.domain}>
                      <div className="kdo-energy__head">
                        <strong>{score.label}</strong>
                        <span>{score.value}</span>
                      </div>
                      <span className="kdo-energy__track">
                        <span className="kdo-energy__fill" style={{ transform: `scaleX(${Math.max(0, Math.min(100, score.value)) / 100})` }} />
                      </span>
                      {score.basis && <p>{score.basis}</p>}
                    </li>
                  ))}
                </ul>
                <p className="kdo-energy__note">각 영역을 실제로 분석한 장이 그 장의 계산 근거만으로 판정한 값입니다.</p>
              </section>
            )}

            {/* ③ AI 종합 결론 + 관점 기여도 */}
            {report.synthesis && (
              <section id="kdo-synthesis" data-kdai-spy="section" data-kdo-reveal className="kdo-synthesis kdo-pane kdo-pane--aurora" data-kdai-pdf-page>
                <span className="kdo-kicker">다섯 관점의 종합 결론</span>
                <h2>{report.synthesis.title}</h2>
                <div className="kdo-synthesis__body">
                  <div className="kdo-synthesis__prose">
                    {report.synthesis.highlightQuotes?.[0] && (
                      <blockquote className="kdo-quote">{report.synthesis.highlightQuotes[0]}</blockquote>
                    )}
                    <AiResultProse
                      value={report.synthesis.content}
                      highlight={report.synthesis.highlightQuotes}
                      className="kdo-prose"
                    />
                  </div>
                  {report.radar.kind !== "none" && (
                    <div className="kdo-synthesis__radar">
                      <LensRadar model={report.radar} forceTable={exporting} />
                    </div>
                  )}
                </div>
                <EvidenceDisclosure
                  evidence={report.synthesis.evidence || []}
                  open={exporting || openEvidence.has(report.synthesis.id)}
                  onToggle={(open) => toggleEvidence(report.synthesis!.id, open)}
                />
              </section>
            )}

            {/* ④ 운명 지도 */}
            {report.timeline.length > 0 && (
              <section id="kdo-map" data-kdai-spy="section" data-kdo-reveal className="kdo-map kdo-pane" data-kdai-pdf-page>
                <span className="kdo-kicker">운명 지도</span>
                <h2>흐름이 갈라지는 지점</h2>
                <ol className="kdo-map__list">
                  {report.timeline.map((node) => (
                    <li key={node.id}>
                      <span className="kdo-map__dot" aria-hidden="true" />
                      <div>
                        <strong>{node.label}</strong>
                        <p>{node.detail}</p>
                        <span className="kdo-map__source">{node.source}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* ⑤ 카테고리별 카드 */}
            <section id="kdo-cards" data-kdai-spy="section" className="kdo-deck">
              <div className="kdo-deck__head" data-kdai-pdf-page>
                <div>
                  <span className="kdo-kicker">카테고리별 해석</span>
                  <h2>{report.categories.length}개의 렌즈로 본 삶</h2>
                </div>
                <div className="kdo-density" role="group" aria-label="읽기 밀도">
                  <button type="button" aria-pressed={density === "full"} onClick={() => changeDensity("full")}>전문</button>
                  <button type="button" aria-pressed={density === "summary"} onClick={() => changeDensity("summary")}>요약</button>
                </div>
              </div>

              <ol className="kdo-deck__toc" data-kdai-pdf-page>
                {chapters.map((chapter) => <li key={chapter.id}>{chapter.order}장. {chapter.title}</li>)}
              </ol>

              {report.categories.map((chapter, index) => {
                const open = openChapters.has(chapter.id);
                const expanded = expandedBodies.has(chapter.id);
                const longBody = (chapter.content || "").length > 360;
                const clamp = longBody && !expanded && !exporting && !summaryMode;
                const lensLabel = chapter.leadLens && chapter.leadLens !== "none" && chapter.leadLens !== "cross"
                  ? chapter.leadLens
                  : "";
                return (
                  <Fragment key={chapter.id}>
                    {index > 0 && <SectionDivider />}
                    <article
                      id={chapter.id}
                      data-kdai-spy="chapter"
                      data-kdo-reveal
                      className={`kdai-chapter kdo-pane ${open ? "is-open" : ""}`.trim()}
                      data-kdai-pdf-page
                    >
                      <button type="button" className="kdai-chapter__head" onClick={() => toggleChapter(chapter.id)} aria-expanded={open}>
                        <span className="kdai-chapter__num">{chapter.symbol || String(chapter.order).padStart(2, "0")}</span>
                        <h2>{chapter.title}</h2>
                        {lensLabel && <span className="kdo-lens-badge">{lensLabel}</span>}
                        {open ? <ChevronUp size={19} /> : <ChevronDown size={19} />}
                      </button>
                      {open && (
                        <div className="kdai-chapter__body">
                          {chapter.highlightQuotes?.[0] && (
                            <blockquote className="kdo-quote">{chapter.highlightQuotes[0]}</blockquote>
                          )}
                          {!summaryMode && (
                            <>
                              <div className={`kdai-chapter__prose ${clamp ? "is-clamped" : ""}`.trim()}>
                                <AiResultProse
                                  value={chapter.content}
                                  highlight={chapter.highlightQuotes}
                                  className="kdo-prose"
                                />
                              </div>
                              {longBody && (
                                <button type="button" className="kdai-more-toggle" onClick={() => toggleBody(chapter.id)} aria-expanded={expanded}>
                                  <span>{expanded ? "본문 접기" : "본문 더 읽기"}</span>
                                  {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                </button>
                              )}
                            </>
                          )}
                          {summaryMode && chapter.summary && <p className="kdo-summary-line">{chapter.summary}</p>}
                          <div className="kdai-core-box">
                            <div className="kdai-core-box__head">
                              <NorthStarIcon className="kdai-core-box__icon" />
                              <strong>이번 장의 핵심</strong>
                            </div>
                            {(chapter.keyTakeaways || []).slice(0, 3).map((item) => <span key={item}>{item}</span>)}
                          </div>
                          <EvidenceDisclosure
                            evidence={chapter.evidence || []}
                            open={exporting || openEvidence.has(chapter.id)}
                            onToggle={(value) => toggleEvidence(chapter.id, value)}
                          />
                          <button type="button" className="kdai-copy-chapter" onClick={() => void copyText(buildChapterText(chapter), `${chapter.order}장을 복사했습니다.`)}>
                            <Copy size={16} /> 이 장 복사
                          </button>
                        </div>
                      )}
                    </article>
                  </Fragment>
                );
              })}
            </section>

            {/* ⑥ 행동 전략 + 최종 편지 */}
            {(report.actionItems.length > 0 || report.letter) && (
              <section id="kdo-action" data-kdai-spy="section" data-kdo-reveal className="kdo-action kdo-pane kdo-pane--aurora" data-kdai-pdf-page>
                <span className="kdo-kicker">지금 할 수 있는 것</span>
                <h2>행동 전략</h2>
                {report.actionItems.length > 0 && (
                  <ul className="kdo-action__list">
                    {report.actionItems.map((item) => (
                      <li key={item}><OrreryIcon className="kdo-action__icon" /><span>{item}</span></li>
                    ))}
                  </ul>
                )}
                {report.letter && (
                  <div className="kdo-letter">
                    <span className="kdo-kicker">{report.letter.title}</span>
                    <AiResultProse value={report.letter.content} className="kdo-prose" />
                  </div>
                )}
              </section>
            )}

            {/* ⑦ 오늘 기억해야 할 한 문장 */}
            {todayLine && (
              <section id="kdo-today" data-kdai-spy="section" data-kdo-reveal className="kdo-today kdo-pane" data-kdai-pdf-page>
                <span className="kdo-kicker">오늘 기억해야 할 한 문장</span>
                <p className="kdo-today__line">{todayLine}</p>
                {report.keyLines.length > 1 && (
                  <details className="kdo-today__more">
                    <summary>기억할 문장 전부 보기</summary>
                    <ul>
                      {report.keyLines.map((line) => <li key={line}>{line}</li>)}
                    </ul>
                  </details>
                )}
              </section>
            )}

            <footer className="kdai-disclaimer" data-kdai-pdf-page>
              이 상담은 운명학적 상징과 자기 성찰을 돕기 위한 콘텐츠이며, 의료·법률·투자 판단을 대신하지 않습니다.
            </footer>
          </section>

          <SectionTabs tabs={sectionTabs} activeId={activeSectionId} progress={readProgress} variant="mobile" />
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
