"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type TarotMode = "one" | "three";

type TarotCategory =
  | "love"
  | "reunion"
  | "friendship"
  | "wealth"
  | "loss"
  | "contract"
  | "travel"
  | "creative"
  | "health";

type DrawnCard = {
  cardId: string;
  name?: string;
  nameKr?: string;
  position?: string;
  orientation?: string;
};

const CATEGORY_OPTIONS: Array<{ value: TarotCategory; label: string }> = [
  { value: "love", label: "연애/애정" },
  { value: "reunion", label: "재회운" },
  { value: "friendship", label: "우정/관계" },
  { value: "wealth", label: "사업운" },
  { value: "loss", label: "재물운" },
  { value: "contract", label: "계약/문서" },
  { value: "travel", label: "이동/해외" },
  { value: "creative", label: "창의/예술" },
  { value: "health", label: "건강/휴식" },
];

function spreadTypeForMode(mode: TarotMode) {
  return mode === "three" ? "three_card_past_present_future" : "one_card";
}

function cardImageUrl(cardId: string) {
  return `/api/tarot/card-image/${encodeURIComponent(cardId)}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function MingriTarot() {
  const router = useRouter();
  const [mode, setMode] = useState<TarotMode>("one");
  const [category, setCategory] = useState<TarotCategory>("love");
  const [cards, setCards] = useState<DrawnCard[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [readingRaw, setReadingRaw] = useState<Record<string, unknown> | null>(null);

  const spreadType = useMemo(() => spreadTypeForMode(mode), [mode]);
  const requiredRevealCount = mode === "three" ? 3 : 1;
  const canRead = cards.length >= requiredRevealCount && revealedCount >= requiredRevealCount && !loading;

  async function startDraw() {
    setLoading(true);
    setError("");
    setReadingRaw(null);
    setCards([]);
    setRevealedCount(0);

    try {
      const res = await fetch("/api/tarot/draw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadType }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.message || "카드 뽑기 실패");
      }
      const nextCards = Array.isArray(data?.cards) ? (data.cards as DrawnCard[]) : [];
      const sliced = nextCards.slice(0, requiredRevealCount);
      if (!sliced.length) throw new Error("카드 데이터가 비어 있습니다.");
      setCards(sliced);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "카드 뽑기 중 오류가 발생했습니다."));
    } finally {
      setLoading(false);
    }
  }

  async function loadReading() {
    if (!canRead) return;
    setLoading(true);
    setError("");
    try {
      const payloadCards = cards.slice(0, requiredRevealCount).map((c) => ({
        cardId: c.cardId,
        position: c.position,
        orientation: c.orientation,
      }));
      const res = await fetch("/api/tarot/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          spreadType,
          cards: payloadCards,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.message || "해석 생성 실패");
      }
      setReadingRaw(data?.reading ?? data);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "해석 생성 중 오류가 발생했습니다."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-3xl space-y-5">
        <section className="rounded-2xl border border-violet-500/30 bg-violet-950/35 p-5">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold">명리학 AI 타로</h1>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm"
            >
              홈으로
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-300">
            기존 iframe 모달과 분리된 독립 페이지 버전입니다. 카드를 뽑고, 해석 API를 바로 조회합니다.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm">
              <span>리딩 모드</span>
              <select
                className="rounded-md border border-slate-600 bg-slate-900 px-2 py-2"
                value={mode}
                onChange={(e) => setMode(e.target.value as TarotMode)}
              >
                <option value="one">원카드</option>
                <option value="three">3카드</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm md:col-span-2">
              <span>고민 카테고리</span>
              <select
                className="rounded-md border border-slate-600 bg-slate-900 px-2 py-2"
                value={category}
                onChange={(e) => setCategory(e.target.value as TarotCategory)}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={startDraw}
            disabled={loading}
            className="mt-4 rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "카드 준비 중..." : "카드 뽑기 시작"}
          </button>
        </section>

        {cards.length > 0 ? (
          <section className="rounded-2xl border border-slate-700 bg-slate-900/65 p-5">
            <h2 className="mb-3 text-lg font-semibold">뽑힌 카드</h2>
            <div className={`grid gap-3 ${mode === "three" ? "md:grid-cols-3" : "md:grid-cols-1"}`}>
              {cards.map((card, idx) => {
                const isRevealed = idx < revealedCount;
                const canReveal = idx === revealedCount && revealedCount < requiredRevealCount;
                return (
                  <button
                    key={`${card.cardId}-${idx}`}
                    type="button"
                    onClick={() => canReveal && setRevealedCount((prev) => prev + 1)}
                    disabled={!canReveal}
                    className="relative aspect-[3/4] overflow-hidden rounded-xl border border-slate-700 bg-slate-800 text-left"
                  >
                    {isRevealed ? (
                      <>
                        <Image
                          src={cardImageUrl(card.cardId)}
                          alt={card.nameKr || card.name || `tarot-${idx + 1}`}
                          fill
                          sizes="(max-width: 768px) 90vw, 300px"
                          className="object-cover"
                        />
                        <div className="absolute inset-x-2 bottom-2 rounded-md bg-black/60 px-2 py-1 text-xs">
                          {(card.nameKr || card.name || "Unknown").trim()}
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-slate-300">
                        {canReveal ? "클릭해서 카드 공개" : "이전 카드를 먼저 공개하세요"}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={loadReading}
                disabled={!canRead}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                해석 보기
              </button>
              <span className="text-xs text-slate-400">
                공개 진행: {revealedCount}/{requiredRevealCount}
              </span>
            </div>
          </section>
        ) : null}

        {error ? (
          <section className="rounded-xl border border-rose-600/40 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</section>
        ) : null}

        {readingRaw ? (
          <section className="rounded-2xl border border-emerald-600/35 bg-emerald-950/20 p-5">
            <h2 className="mb-3 text-lg font-semibold">명리학 해석 결과</h2>
            <div className="space-y-3 text-sm leading-7 text-slate-100">
              {Object.entries(readingRaw).map(([key, value]) => {
                if (!value) return null;
                const text = Array.isArray(value) ? value.join("\n") : String(value);
                if (!text.trim()) return null;
                return (
                  <article key={key} className="rounded-lg border border-emerald-800/50 bg-slate-900/40 p-3">
                    <h3 className="mb-1 text-sm font-semibold text-emerald-300">{key}</h3>
                    <pre className="whitespace-pre-wrap font-sans text-sm">{text}</pre>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

