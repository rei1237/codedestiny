"use client";

import { useMemo, useState } from "react";
import PagedResultViewer, { usePagedViewerMode, type ResultViewerPage } from "@/components/fortune/PagedResultViewer";
import AiResultProse from "@/components/fortune/AiResultProse";

export interface DeckSection {
  id: string;
  title: string;
  body: string;
}
export interface Decks {
  sukuyo: DeckSection[];
  vedic: DeckSection[];
}
export interface NatalIdentity {
  sukuyoKo?: string;
  sukuyoHan?: string;
  nakshatraKo?: string;
  nakshatraEn?: string;
}

type DeckKey = "sukuyo" | "vedic";

const DECK_META: Record<DeckKey, { label: string; sub: string; glyph: string; accent: string; activeChip: string; idleChip: string }> = {
  sukuyo: {
    label: "숙요 대가의 상담",
    sub: "宿曜 · 칠요와 격각",
    glyph: "☯",
    accent: "text-blue-100",
    activeChip: "bg-blue-200 text-slate-950 shadow-[0_0_22px_-6px_rgba(147,197,253,0.75)]",
    idleChip: "text-blue-100/75 hover:text-blue-50 hover:bg-white/[0.04]",
  },
  vedic: {
    label: "베다 대가의 상담",
    sub: "Jyotish · 지배성과 다샤",
    glyph: "🕉",
    accent: "text-amber-100",
    activeChip: "bg-amber-200 text-slate-950 shadow-[0_0_22px_-6px_rgba(251,191,36,0.75)]",
    idleChip: "text-amber-100/75 hover:text-amber-50 hover:bg-white/[0.04]",
  },
};

export default function AiConsultDecks({ decks, natal, question }: { decks: Decks; natal: NatalIdentity | null; question: string }) {
  const [activeDeck, setActiveDeck] = useState<DeckKey>("sukuyo");
  const [viewAll, setViewAll] = usePagedViewerMode("nakshatraAiViewerModeV1");
  const [sukuyoPage, setSukuyoPage] = useState(0);
  const [vedicPage, setVedicPage] = useState(0);

  const toPages = (sections: DeckSection[]): ResultViewerPage[] =>
    sections.map((section) => ({ id: section.id, label: section.title, content: <AiResultProse value={section.body} /> }));

  const sukuyoPages = useMemo(() => toPages(decks.sukuyo), [decks.sukuyo]);
  const vedicPages = useMemo(() => toPages(decks.vedic), [decks.vedic]);
  const isSukuyo = activeDeck === "sukuyo";
  const meta = DECK_META[activeDeck];

  return (
    <div className="mx-auto w-full max-w-3xl motion-safe:animate-fade-in-up">
      {/* 명식 헤더 */}
      <header className="rounded-2xl border border-amber-200/20 bg-white/[0.03] p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.4)] md:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-100/70">Nakshatra Codex · AI 심화 상담</p>
        <h1 className="mt-3 text-balance break-keep text-2xl font-bold leading-tight text-slate-50 md:text-3xl">
          {natal?.sukuyoHan ? <span className="text-blue-100">{natal.sukuyoHan}宿</span> : null}
          {natal?.sukuyoHan && natal?.nakshatraKo ? <span className="mx-2 text-slate-500">·</span> : null}
          {natal?.nakshatraKo ? <span className="text-amber-100">{natal.nakshatraKo}</span> : null}
          {!natal?.sukuyoHan && !natal?.nakshatraKo ? <span className="text-slate-100">두 대가의 심화 상담</span> : null}
        </h1>
        <p className="mt-2 break-keep text-sm text-slate-300">숙요와 베다, 두 전통의 대가가 각각 당신의 별을 읽어 드립니다.</p>
        {question ? (
          <p className="mx-auto mt-4 max-w-xl break-keep rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left text-sm leading-7 text-slate-100">
            <span className="mr-1 font-semibold text-amber-100/90">질문</span>“{question}”
          </p>
        ) : null}
      </header>

      {/* 덱 토글 — "2회 봐주기": 숙요 대가 / 베다 대가 */}
      <div className="mt-6 flex justify-center">
        <div role="tablist" aria-label="상담 관점 전환" className="inline-flex gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
          {(Object.keys(DECK_META) as DeckKey[]).map((key) => {
            const on = key === activeDeck;
            const dm = DECK_META[key];
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setActiveDeck(key)}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold outline-none transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-amber-200/70 md:text-sm ${on ? dm.activeChip : dm.idleChip}`}
              >
                <span aria-hidden="true">{dm.glyph}</span>
                {dm.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 활성 덱 소제목 */}
      <p className={`mt-5 text-center text-xs font-semibold uppercase tracking-[0.2em] ${meta.accent}`}>{meta.glyph} {meta.sub}</p>

      {/* 활성 덱 뷰어 — 덱 전환 시 크로스페이드 재등장 */}
      <div key={activeDeck} className="mt-3 motion-safe:animate-fade-in-up">
        <PagedResultViewer
          pages={isSukuyo ? sukuyoPages : vedicPages}
          deckLabel={meta.label}
          viewAll={viewAll}
          onViewAllChange={setViewAll}
          activePage={isSukuyo ? sukuyoPage : vedicPage}
          onPageChange={isSukuyo ? setSukuyoPage : setVedicPage}
        />
      </div>

      <p className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5 text-xs leading-6 text-slate-300">
        본 서비스는 전통 별자리 문화 콘텐츠이며, 의료·법률·투자 판단의 근거로 사용할 수 없습니다.
        상담문은 계산된 명식(숙요 본명수·베다 나크샤트라)을 근거로 AI가 작성했으며, 통합 해석은 Code Destiny의 창작입니다.
      </p>
    </div>
  );
}
