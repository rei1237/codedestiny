"use client";

/**
 * 마스터 인연의 서 — 완성된 책 리더.
 *
 * 장 넘김은 공용 PagedResultViewer 를 쓴다(스와이프·키보드·전체보기 토글 포함).
 * PDF 저장 시에는 expandForExport 로 전 장을 펼친 뒤 캡처해야 한다 —
 * 숨겨진(display:none) 장은 html2canvas 에서 빈 캔버스가 된다.
 */

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import PagedResultViewer, { usePagedViewerMode } from "@/components/fortune/PagedResultViewer";
import { getNarratorAsset, masterLoveCodexAssets } from "../data/assets";
import { MASTER_LOVE_CODEX_TITLE } from "../constants";

export interface CodexChapter {
  id: string;
  order: number;
  symbol?: string;
  title: string;
  body: string;
  chars?: number;
  ok?: boolean;
}

export interface CodexLoveDnaMetric {
  key: string;
  label: string;
  score: number;
  basis?: string;
}

export interface CodexLoveDna {
  typeName?: string;
  typeSummary?: string;
  metrics?: CodexLoveDnaMetric[];
}

interface CodexBookReaderProps {
  chapters: CodexChapter[];
  loveDna: CodexLoveDna | null;
  name: string;
  birthLine: string;
  totalCharCount: number;
  sessionId: string;
}

function safeFilePart(value: string) {
  return String(value || "인연의서").replace(/[^\p{L}\p{N}_-]+/gu, "").slice(0, 24) || "인연의서";
}

export default function CodexBookReader({ chapters, loveDna, name, birthLine, totalCharCount, sessionId }: CodexBookReaderProps) {
  const [viewAll, setViewAll] = usePagedViewerMode("masterLoveCodexViewerModeV1");
  const [exportExpand, setExportExpand] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState("");
  const [activePage, setActivePage] = useState(0);
  const documentRef = useRef<HTMLDivElement | null>(null);

  const ordered = useMemo(
    () => chapters.slice().sort((a, b) => Number(a.order || 0) - Number(b.order || 0)),
    [chapters],
  );

  const pages = useMemo(
    () => ordered.map((chapter) => ({
      id: chapter.id,
      label: chapter.title.replace(/^제(\d+)장 · /, "$1장 · "),
      content: (
        <article data-codex-pdf-page className="rounded-2xl bg-[#150b1e] p-6 sm:p-8">
          <p className="text-[11px] font-black tracking-[0.28em] text-amber-100/70">
            {chapter.symbol ? `${chapter.symbol} · ` : ""}MASTER DESTINY
          </p>
          <h3 className="font-display mt-2 text-lg font-black leading-snug text-amber-100 sm:text-xl">{chapter.title}</h3>
          <p className="mt-4 whitespace-pre-wrap text-[15px] leading-8 text-rose-50/95 sm:text-base sm:leading-9">{chapter.body}</p>
          {chapter.ok === false ? (
            <p className="mt-4 rounded-lg border border-amber-300/30 bg-amber-200/10 px-3 py-2 text-xs text-amber-100/85">
              이 장은 다시 열면 채워집니다. 다른 장은 그대로 보관되어 있습니다.
            </p>
          ) : null}
        </article>
      ),
    })),
    [ordered],
  );

  async function handlePdfDownload() {
    if (pdfLoading) return;
    setPdfLoading(true);
    setError("");
    setExportExpand(true);
    try {
      // 펼침이 실제 레이아웃에 반영된 뒤 캡처해야 빈 페이지가 생기지 않는다.
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      await new Promise((resolve) => setTimeout(resolve, 140));
      const { exportResultPdf } = await import("@/lib/pdf/export-result-pdf");
      const today = new Date().toISOString().slice(0, 10);
      await exportResultPdf({
        captureTargets: ["#master-love-codex-document [data-codex-pdf-page]"],
        fileName: `마스터인연의서_${safeFilePart(name)}_${today.replace(/-/g, "")}.pdf`,
        backgroundColor: "#150b1e",
        cover: {
          title: `${safeFilePart(name)}님의 마스터 인연의 서`,
          subtitle: loveDna?.typeName ? `${loveDna.typeName} · 전 ${ordered.length}장` : `전 ${ordered.length}장`,
          name: birthLine,
          date: today,
        },
      });
    } catch {
      setError("PDF로 옮기는 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setExportExpand(false);
      setPdfLoading(false);
    }
  }

  return (
    <section className="relative min-h-[100svh] bg-[#0d0714] pb-16" aria-label="마스터 인연의 서 본문">
      <div
        className="absolute inset-x-0 top-0 h-[42svh] bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url("${masterLoveCodexAssets.backgrounds.library}")` }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[42svh] bg-gradient-to-b from-[#0d0714]/70 to-[#0d0714]" aria-hidden="true" />

      <div className="relative z-10 mx-auto w-full max-w-3xl px-5 pt-8 sm:px-8 sm:pt-12">
        <header className="text-center">
          <Image
            src={getNarratorAsset("speakingAlt")}
            alt="마지막 장을 덮는 박지은"
            width={280}
            height={380}
            unoptimized
            className="mx-auto h-[20svh] w-auto object-contain drop-shadow-[0_18px_36px_rgba(0,0,0,.55)]"
          />
          <p className="mt-4 text-[11px] font-black tracking-[0.3em] text-amber-100/75">MASTER DESTINY · 완성</p>
          <h2 className="font-display mt-2 text-2xl font-black text-rose-50 sm:text-3xl">
            {name ? `${name}님의 ${MASTER_LOVE_CODEX_TITLE}` : MASTER_LOVE_CODEX_TITLE}
          </h2>
          <p className="mt-2 text-xs text-rose-100/60">{birthLine}</p>
          <p className="mt-1 text-xs text-amber-100/70">
            전 {ordered.length}장 · 약 {totalCharCount.toLocaleString("ko-KR")}자
          </p>
        </header>

        {loveDna?.metrics?.length ? (
          <div data-codex-pdf-page className="mt-8 rounded-2xl border border-amber-200/25 bg-[#150b1e] p-6">
            <p className="text-[11px] font-black tracking-[0.28em] text-amber-100/70">연애 DNA</p>
            {loveDna.typeName ? (
              <h3 className="font-display mt-2 text-xl font-black text-amber-100">{loveDna.typeName}</h3>
            ) : null}
            {loveDna.typeSummary ? (
              <p className="mt-1.5 text-sm leading-7 text-rose-50/85">{loveDna.typeSummary}</p>
            ) : null}
            <ul className="mt-5 space-y-3">
              {loveDna.metrics.map((metric) => (
                <li key={metric.key}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-bold text-rose-50">{metric.label}</span>
                    <span className="text-sm font-black text-amber-100">{metric.score}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-rose-100/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-200 to-rose-200"
                      style={{ width: `${Math.max(0, Math.min(100, metric.score))}%` }}
                    />
                  </div>
                  {metric.basis ? <p className="mt-1.5 text-xs leading-6 text-rose-100/60">{metric.basis}</p> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <nav className="mt-8 rounded-2xl border border-rose-100/15 bg-[#150b1e]/70 p-4" aria-label="목차">
          <p className="mb-3 text-xs font-black tracking-[0.2em] text-amber-100/75">목차</p>
          <ol className="grid gap-1 sm:grid-cols-2">
            {ordered.map((chapter, index) => (
              <li key={chapter.id}>
                <button
                  type="button"
                  onClick={() => { setViewAll(false); setActivePage(index); }}
                  className={`w-full truncate rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition ${
                    activePage === index ? "bg-amber-200/15 text-amber-50" : "text-rose-50/70 hover:bg-rose-100/5 hover:text-amber-100"
                  }`}
                >
                  {chapter.title}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/25 bg-amber-200/10 px-4 py-3">
          <p className="text-xs font-semibold text-amber-100/85">이 책은 서재에 보관되어 언제든 다시 열 수 있습니다.</p>
          <button
            type="button"
            onClick={() => void handlePdfDownload()}
            disabled={pdfLoading}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200/45 bg-amber-200/15 px-4 py-2.5 text-sm font-black text-amber-50 transition hover:brightness-110 disabled:opacity-60"
          >
            {pdfLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
            {pdfLoading ? "책으로 엮는 중..." : "PDF로 소장하기"}
          </button>
        </div>

        {error ? (
          <p role="alert" className="mt-4 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p>
        ) : null}

        <div ref={documentRef} id="master-love-codex-document" className="mt-6">
          <PagedResultViewer
            pages={pages}
            deckLabel="마스터 인연의 서 장 넘기기"
            viewAll={viewAll}
            onViewAllChange={setViewAll}
            expandForExport={exportExpand}
            activePage={activePage}
            onPageChange={setActivePage}
          />
        </div>

        <p className="mt-8 text-center text-[11px] text-rose-100/40">보관 번호 {sessionId}</p>
      </div>
    </section>
  );
}
