"use client";

/**
 * 코덱스 리더 — 20장을 5막 × 4장으로 묶어 한 흐름으로 읽는다.
 *
 * 페이지 넘김(PagedResultViewer) 대신 연속 스크롤을 쓴다. 그쪽은 비활성 장을
 * `display:none` 으로 감추는데, 그러면 스크롤 진입 감지도 PDF 캡처도 성립하지 않는다.
 * (PagedResultViewer 자체는 다른 8개 기능이 계속 쓰므로 그대로 둔다.)
 *
 * 🔴 PDF: 캡처 직전 `isExporting` 을 올려 아직 화면에 안 들어온 장의 등장 애니메이션을
 * 건너뛴다. 이걸 빼면 결제한 사용자가 백지 페이지가 섞인 PDF 를 받는다.
 *
 * 🔴 PDF 캡처 계약 — 새 블록을 넣을 때 반드시 지킬 것:
 *   ① 캡처 선택자는 `#master-love-codex-document [data-codex-pdf-page]` 다.
 *      문서 div **안**에 있으면서 그 속성을 달아야 PDF 에 들어간다. 둘 중 하나만
 *      빠져도 경고 없이 통째로 사라진다.
 *   ② 데이터를 담은 값(막대 폭·게이지 offset)은 언제나 인라인 최종값이어야 한다.
 *      @keyframes 로 그리면 html2canvas 클론에서 0프레임부터 다시 돌아 0% 로 찍힌다.
 *   ③ 애니메이션이 붙는 컴포넌트에는 `forceVisible={isExporting}` 을 넘긴다.
 *      추가 안전망으로 문서에 `data-codex-exporting` 을 달아 모션을 전역 정지시킨다.
 */

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Download, Library, Loader2 } from "lucide-react";
import CodexShell from "./CodexShell";
import { CODEX_LIBRARY_ANCHOR } from "./CodexLibrary";
import CodexSpine from "./CodexSpine";
import CodexActInterstitial from "./CodexActInterstitial";
import ChapterSection, { stripChapterPrefix, type CodexChapterData } from "./CodexChapter";
import CodexLoveDnaPanel, { type CodexLoveDna, type CodexLoveDnaMetric } from "./CodexLoveDna";
import CodexScoreOverview from "./CodexScoreOverview";
import CodexReportOutro from "./CodexReportOutro";
import CodexReportStamp from "./CodexReportStamp";
import CodexSeal from "./CodexSeal";
import CodexReveal from "./CodexReveal";
import { getNarratorAsset } from "../data/assets";
import {
  CODEX_CHAPTER_ANCHOR_PREFIX,
  groupByAct,
  mergeCodexOutline,
  type CodexActMode,
  type CodexOutlineEntry,
  type CodexOutlineRow,
} from "../data/acts";
import { masterLoveCodexBilling, MASTER_LOVE_CODEX_TOTAL_CHAPTERS } from "../constants";
import { codexChapterStateLabel, useMasterLoveCodexCopy, useMasterLoveCodexLocale } from "../_lib/copy";
import styles from "../styles/codex.module.css";

export type CodexChapter = CodexChapterData & { symbol?: string; chars?: number };
export type { CodexLoveDna, CodexLoveDnaMetric };

interface CodexReaderProps {
  chapters: CodexChapter[];
  /**
   * 서버가 주는 기대 장 목록(publicSession 의 `outline`). 받은 장이 아니라 **구매한 구성**이
   * 목차·상단 막 이동·장 수 표기의 정본이다. 없으면 기대 장 수만큼 자리만 만든다.
   */
  outline?: CodexOutlineEntry[] | null;
  /** 기대 장 수 N. 서버 진행 상태(generationProgress.total)를 그대로 받는다 */
  totalChapters?: number;
  loveDna: CodexLoveDna | null;
  name: string;
  birthLine: string;
  totalCharCount: number;
  sessionId: string;
  /** solo = 개인판 / compat = 궁합판. 막 제목과 표지 제목이 갈린다 */
  mode?: CodexActMode;
  /** paid / pass / monthly_credit / admin — 리포트 표식의 금액 표기를 가른다 */
  accessType?: string;
  completed?: boolean;
}

function safeFilePart(value: string, fallback: string) {
  return String(value || fallback).replace(/[^\p{L}\p{N}_-]+/gu, "").slice(0, 24) || fallback;
}

const DECRYPT_LINES = ["Decrypting", "Reading Destiny", "Synchronizing"] as const;
const DECRYPT_MS = 2000;

/**
 * 아직 쓰이지 않은 장의 자리.
 *
 * 🔴 `data-codex-pdf-page` 를 붙이지 않는다 — 붙이면 소장본 PDF 에 빈 장이 끼어든다.
 *    앵커 id 와 tabIndex 는 **유지한다**: 목차·이전/다음 이동이 걸릴 실제 대상이 필요하다.
 *    비어 있는 이유를 함께 적어, 생성 중인 상태가 구매 잠금처럼 읽히지 않게 한다.
 */
function ChapterPlaceholder({ row }: { row: CodexOutlineRow<CodexChapterData> }) {
  const copy = useMasterLoveCodexCopy();
  return (
    <article
      id={`${CODEX_CHAPTER_ANCHOR_PREFIX}${row.order}`}
      data-codex-chapter={row.order}
      data-codex-chapter-state={row.state}
      tabIndex={-1}
      className={styles.section}
    >
      <div className={styles.measure}>
        <p
          className={styles.numeral}
          style={{ fontSize: "clamp(2.75rem, 9vw, 4rem)", lineHeight: 1, color: "rgba(185,173,153,.3)" }}
          aria-hidden="true"
        >
          {String(row.order).padStart(2, "0")}
        </p>
        <h2 className={`${styles.chapterTitle} mt-3`} style={{ color: "var(--codex-ink-text-muted)" }}>
          <span className="sr-only">{copy.chapterOrderSrLabel(row.order)}</span>
          {stripChapterPrefix(row.title) || copy.chapterPendingTitle(row.order)}
        </h2>
        <hr className={`${styles.rule} ${styles.ruleShort} mt-6 !ml-0`} />
        <p className="mt-8 text-[0.8125rem] leading-7" style={{ color: "var(--codex-ink-text-muted)" }} role="status">
          <span style={{ color: "var(--codex-gold-dim)" }}>{codexChapterStateLabel(copy, row.state)}</span>
          {" · "}
          {row.state === "blocked" ? copy.chapterBlockedNote : copy.chapterPendingNote}
        </p>
      </div>
    </article>
  );
}

export default function CodexReader({
  chapters,
  outline,
  totalChapters,
  loveDna,
  name,
  birthLine,
  totalCharCount,
  sessionId,
  mode = "solo",
  accessType = "",
  completed = true,
}: CodexReaderProps) {
  const locale = useMasterLoveCodexLocale();
  const copy = useMasterLoveCodexCopy();
  // 표지·PDF 파일명·막 제목이 모드에 따라 갈린다(리더 레이아웃은 두 모드가 공유한다).
  const bookTitle = masterLoveCodexBilling(mode, locale).title;
  const [decrypted, setDecrypted] = useState(false);
  const [decryptStep, setDecryptStep] = useState(0);
  const [activeAct, setActiveAct] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState("");
  const [resumeTop, setResumeTop] = useState(0);
  const [showResume, setShowResume] = useState(false);
  const documentRef = useRef<HTMLDivElement | null>(null);
  const readingKey = `masterLoveCodexReading:${sessionId}`;

  const ordered = useMemo(
    () => chapters.slice().sort((a, b) => Number(a.order || 0) - Number(b.order || 0)),
    [chapters],
  );
  /**
   * 🔴 화면의 정본은 **기대 장 목록**이다. 받은 장으로 목차를 만들면 2장이 늦게 온 책이
   *    "1장짜리 완성본"으로 보인다 — 이번 장애의 화면 쪽 얼굴이 정확히 이것이었다.
   */
  const rows = useMemo(
    () => mergeCodexOutline(outline, ordered, Number(totalChapters) || MASTER_LOVE_CODEX_TOTAL_CHAPTERS),
    [outline, ordered, totalChapters],
  );
  const readyCount = useMemo(() => rows.filter((row) => row.state === "ready").length, [rows]);
  /**
   * 봉인·마무리·PDF 는 `completed` 플래그가 아니라 **실제로 전 장을 들고 있을 때만** 연다.
   * 잘못 completed 로 닫힌 예전 결과(1장짜리)가 봉인 화면을 띄우던 경로를 fail-closed 로 막는다.
   */
  const sealed = completed && rows.length > 0 && readyCount === rows.length;
  const groups = useMemo(() => groupByAct(rows, mode, { keepEmpty: true }), [rows, mode]);
  // 색·보조 문구 전용. 막 이동 자체는 항상 열려 있다(CodexSpine 의 availableOrders 주석 참조).
  const availableActs = useMemo(
    () => groups.filter((group) => group.chapters.some((row) => row.state === "ready")).map((group) => group.act.order),
    [groups],
  );

  // 진입 연출 — 2초간 해독하는 척한 뒤 본문을 연다.
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let savedTop = 0;
    let opened = false;
    try {
      savedTop = Number(window.sessionStorage.getItem(readingKey) || 0);
      opened = window.sessionStorage.getItem(`${readingKey}:opened`) === "true";
    } catch { /* Browser storage is optional reading-position convenience. */ }
    if (savedTop > 80) {
      setResumeTop(savedTop);
      setShowResume(true);
      setDecrypted(true);
      return undefined;
    }
    if (reduce || opened) { setDecrypted(true); return undefined; }
    try { window.sessionStorage.setItem(`${readingKey}:opened`, "true"); } catch {}
    const stepTimer = window.setInterval(
      () => setDecryptStep((current) => (current + 1) % DECRYPT_LINES.length),
      DECRYPT_MS / DECRYPT_LINES.length,
    );
    const doneTimer = window.setTimeout(() => setDecrypted(true), DECRYPT_MS);
    return () => { window.clearInterval(stepTimer); window.clearTimeout(doneTimer); };
  }, [readingKey]);

  useEffect(() => {
    if (!decrypted || typeof window === "undefined") return undefined;
    let frame = 0;
    const savePosition = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        try { window.sessionStorage.setItem(readingKey, String(Math.round(window.scrollY))); } catch {}
        frame = 0;
      });
    };
    window.addEventListener("scroll", savePosition, { passive: true });
    return () => { window.removeEventListener("scroll", savePosition); if (frame) window.cancelAnimationFrame(frame); };
  }, [decrypted, readingKey]);

  const resumeReading = useCallback(() => {
    window.scrollTo({ top: resumeTop, behavior: "smooth" });
    setShowResume(false);
  }, [resumeTop]);

  const startOver = useCallback(() => {
    try { window.sessionStorage.removeItem(readingKey); } catch {}
    window.scrollTo({ top: 0, behavior: "smooth" });
    setShowResume(false);
  }, [readingKey]);

  // 스크롤 스파이 — 화면 상단 가까이 걸린 막을 현재 막으로 잡는다.
  useEffect(() => {
    if (!decrypted || !groups.length || typeof IntersectionObserver === "undefined") return undefined;
    const visible = new Map<number, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const order = Number((entry.target as HTMLElement).dataset.codexActMark || 0);
          if (!order) continue;
          if (entry.isIntersecting) visible.set(order, entry.intersectionRatio);
          else visible.delete(order);
        }
        let bestOrder = 0;
        let bestRatio = 0;
        for (const [order, ratio] of visible) {
          if (ratio > bestRatio) { bestRatio = ratio; bestOrder = order; }
        }
        if (bestOrder) setActiveAct(bestOrder);
      },
      { rootMargin: "-12% 0px -70% 0px", threshold: [0.01, 0.25, 0.5] },
    );
    document.querySelectorAll<HTMLElement>("[data-codex-act-mark]").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [decrypted, groups.length]);

  const handlePdfDownload = useCallback(async () => {
    if (pdfLoading) return;
    // 미완성 책을 PDF 로 굽지 않는다 — 소장본에 빈 장이 들어간다.
    if (!sealed) return;
    setPdfLoading(true);
    setError("");
    // 아직 스크롤로 도달하지 않은 장은 opacity 0 이라 그대로 찍으면 백지가 된다.
    setIsExporting(true);
    try {
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      await new Promise((resolve) => setTimeout(resolve, 140));
      const { exportResultPdf } = await import("@/lib/pdf/export-result-pdf");
      const today = new Date().toISOString().slice(0, 10);
      await exportResultPdf({
        captureTargets: ["#master-love-codex-document [data-codex-pdf-page]"],
        fileName: `${copy.pdfFileNamePrefix}_${safeFilePart(name, copy.pdfNameFallback)}_${today.replace(/-/g, "")}.pdf`,
        backgroundColor: "#0a0818",
        cover: {
          title: copy.possessiveBookTitle(safeFilePart(name, copy.pdfNameFallback), bookTitle),
          subtitle: copy.pdfCoverSubtitle(rows.length, loveDna?.typeName),
          name: birthLine,
          date: today,
        },
      });
    } catch {
      setError(copy.pdfDownloadError);
    } finally {
      setIsExporting(false);
      setPdfLoading(false);
    }
  }, [sealed, birthLine, bookTitle, loveDna?.typeName, name, rows.length, pdfLoading, copy]);

  if (!decrypted) {
    return (
      <CodexShell ariaLabel={copy.readerOpeningAriaLabel}>
        <div className="flex min-h-[100svh] flex-col items-center justify-center text-center">
          <div className={styles.measure}>
            <p
              className={styles.numeral}
              style={{ fontSize: "clamp(1rem, 3.4vw, 1.25rem)", letterSpacing: "0.24em", color: "var(--codex-gold)" }}
              aria-live="polite"
            >
              {DECRYPT_LINES[decryptStep]}
            </p>
            <hr className={`${styles.rule} ${styles.ruleShort} mt-8`} />
            <p className="mt-8 text-[0.875rem]" style={{ color: "var(--codex-ink-text-muted)" }}>
              {copy.readerOpeningNote}
            </p>
          </div>
        </div>
      </CodexShell>
    );
  }

  return (
    <CodexShell motes={false} ariaLabel={copy.readerAriaLabel(bookTitle)}>
      <CodexSpine
        activeOrder={activeAct}
        availableOrders={availableActs}
        mode={mode}
        chapters={rows.map((row) => ({ order: row.order, title: row.title, state: row.state }))}
      />

      {showResume ? (
        <aside className={styles.resumePrompt} aria-label={copy.resumePromptAriaLabel}>
          <p>{copy.resumePromptLine}</p>
          <button type="button" onClick={resumeReading}>{copy.resumeButton}</button>
          <button type="button" onClick={startOver}>{copy.startOverButton}</button>
        </aside>
      ) : null}

      {/* data-codex-exporting: 캡처 중 문서 전체의 모션을 정지시키는 안전망(codex.module.css) */}
      <div
        ref={documentRef}
        id="master-love-codex-document"
        className={styles.document}
        data-codex-exporting={isExporting ? "true" : undefined}
      >
        {/* 표지 */}
        <header data-codex-pdf-page className={styles.readerCover}>
          <div className={styles.measure}>
            <CodexReveal forceVisible={isExporting}>
              {/* 표식은 표지 헤더 '안'에 둔다 — 밖으로 빼면 캡처 대상에서 빠진다 */}
              <CodexReportStamp mode={mode} accessType={accessType} className="mb-6" />
              <Image
                src={getNarratorAsset("calm")}
                alt={copy.narratorClosingAlt}
                width={300}
                height={410}
                unoptimized
                priority
                className={styles.readerPortrait}
                style={{ filter: "drop-shadow(0 24px 48px rgba(0,0,0,.66))" }}
              />
              <p className={styles.readerBrand}>Master Love Codex</p>
              <h2 className={styles.readerTitle}>
                {copy.possessiveBookTitle(name, bookTitle)}
              </h2>
              <hr className={`${styles.rule} ${styles.ruleShort} mt-6`} />
              <p className="mt-5 text-[0.9375rem] leading-7" style={{ color: "var(--codex-ink-text-muted)" }}>
                {birthLine}
              </p>
              {ordered[0] ? <a className={`${styles.cta} mt-6`} href={`#${CODEX_CHAPTER_ANCHOR_PREFIX}${ordered[0].order}`}>{copy.readerBeginButton}</a> : null}
              <p className={`${styles.numeral} mt-2 text-[0.8125rem]`} style={{ color: "var(--codex-ink-text-muted)" }}>
                {/* 부분 결과를 완성 분량처럼 적지 않는다 — 다 쓰이기 전에는 "N장 중 K장" */}
                {sealed
                  ? copy.coverChapterCountSuffix(rows.length, totalCharCount)
                  : copy.coverChapterProgressSuffix(readyCount, rows.length, totalCharCount)}
              </p>
            </CodexReveal>
          </div>
        </header>

        {/* 종합 점수 — 표지 바로 다음. 문서 div 안이라 PDF 두 번째 장이 된다 */}
        {loveDna ? <CodexScoreOverview loveDna={loveDna} mode={mode} forceVisible={isExporting} /> : null}

        {/* 5막 × 4장 */}
        {groups.map((group) => (
          <div key={group.act.order}>
            <div data-codex-act-mark={group.act.order}>
              <CodexActInterstitial act={group.act} forceVisible={isExporting} />
            </div>
            {group.chapters.map((row) => (row.state === "ready" && row.chapter ? (
              <ChapterSection key={row.id} chapter={row.chapter} forceVisible={isExporting} />
            ) : (
              <ChapterPlaceholder key={row.id} row={row} />
            )))}
          </div>
        ))}

        {loveDna ? <CodexLoveDnaPanel loveDna={loveDna} forceVisible={isExporting} /> : null}

        {/* 마무리 카드 — 문서 div 안 마지막. 아래 CodexSeal 은 다음 화면 CTA 라 밖에 둔다 */}
        {sealed && <CodexReportOutro
          mode={mode}
          accessType={accessType}
          chapterCount={rows.length}
          totalCharCount={totalCharCount}
          forceVisible={isExporting}
        />}
      </div>

      {/* 소장 */}
      <div className={`${styles.measure} pb-4 text-center`}>
        <CodexReveal forceVisible={isExporting}>
          <button type="button" onClick={() => void handlePdfDownload()} disabled={pdfLoading || !sealed} className={styles.cta}>
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
            {pdfLoading ? copy.pdfBindingLabel : copy.pdfDownloadButton}
          </button>
          {error ? (
            <p role="alert" className="mt-5 text-[0.875rem]" style={{ color: "#ffb4b4" }}>{error}</p>
          ) : null}
          <p className="mt-6">
            <Link href={`/master-love-codex#${CODEX_LIBRARY_ANCHOR}`} className={`${styles.quiet} ${styles.readerLibraryLink}`}>
              <Library className="h-3.5 w-3.5" aria-hidden="true" />
              {copy.libraryNavLink}
            </Link>
          </p>
        </CodexReveal>
      </div>

      {/*
        🔴 "이 책이 끝났다" 는 화면은 **전 장이 실제로 도착했을 때만** 연다. 1장만 온 책
           아래에 봉인 화면이 뜨던 것이 이번 장애에서 사용자가 본 마지막 장면이었다.
      */}
      {sealed ? <CodexSeal forceVisible={isExporting} /> : null}

      {/*
        세션 식별자는 문의·내부 상태 확인에 필요하므로 지우지 않는다. 대신 자간을 줄이고
        어디서든 끊기게 해 좁은 화면에서 가로로 넘치지 않게 한다(padding 단축형을 쓰면
        pb-14 를 덮어쓴다 — paddingInline 만 준다).
      */}
      <p
        className={`${styles.numeral} pb-14 text-center text-[0.6875rem]`}
        style={{
          color: "rgba(185,173,153,.5)",
          letterSpacing: "0.08em",
          paddingInline: "1.25rem",
          overflowWrap: "anywhere",
        }}
      >
        {sessionId}
      </p>
    </CodexShell>
  );
}
