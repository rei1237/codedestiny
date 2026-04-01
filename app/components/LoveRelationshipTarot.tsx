"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

type DrawnCard = {
  cardId: string;
  name?: string;
  nameKr?: string;
  position?: string;
  orientation?: string;
};

const SPREAD_TYPE = "relationship_six_card";
const CATEGORY = "love";
const CARD_COUNT = 6;

const POSITION_LABELS: Record<string, string> = {
  position_1: "내가 보는 상대",
  position_2: "상대가 관계를 보는 것",
  position_3: "상대가 나를 보는 것",
  position_4: "연애하고픈 마음",
  position_5: "관계를 막는 것",
  position_6: "예상되는 결과",
};

function cardImageUrl(cardId: string) {
  return `/api/tarot/card-image/${encodeURIComponent(cardId)}`;
}

function safeCardName(card?: DrawnCard, idx?: number) {
  const title = (card?.nameKr || card?.name || "").trim();
  if (title) return title;
  return `카드 ${typeof idx === "number" ? idx + 1 : ""}`.trim();
}

export default function LoveRelationshipTarot() {
  const router = useRouter();
  const [cards, setCards] = useState<DrawnCard[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [readingRaw, setReadingRaw] = useState<any>(null);

  const canRead = cards.length === CARD_COUNT && revealedCount === CARD_COUNT && !loading;

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
        body: JSON.stringify({ spreadType: SPREAD_TYPE }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.message || "카드 뽑기 실패");
      }
      const nextCards = Array.isArray(data?.cards) ? (data.cards as DrawnCard[]) : [];
      const sliced = nextCards.slice(0, CARD_COUNT);
      if (sliced.length !== CARD_COUNT) {
        throw new Error("6카드 데이터가 올바르지 않습니다.");
      }
      setCards(sliced);
    } catch (e: any) {
      setError(e?.message || "카드 뽑기 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function loadReading() {
    if (!canRead) return;
    setLoading(true);
    setError("");
    try {
      const payloadCards = cards.map((c) => ({
        cardId: c.cardId,
        position: c.position,
        orientation: c.orientation,
      }));
      const res = await fetch("/api/tarot/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: CATEGORY,
          spreadType: SPREAD_TYPE,
          cards: payloadCards,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.message || "해석 생성 실패");
      }
      setReadingRaw(data?.reading ?? data);
    } catch (e: any) {
      setError(e?.message || "해석 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-5">
        <section className="rounded-2xl border border-pink-500/30 bg-pink-950/30 p-5">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold">우리는 무슨 사이? 연애 타로</h1>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm"
            >
              홈으로
            </button>
          </div>
          <p className="mt-2 text-sm text-slate-300">
            관계 6카드 스프레드로 상대와의 흐름을 확인하는 독립 페이지 버전입니다.
          </p>
          <button
            type="button"
            onClick={startDraw}
            disabled={loading}
            className="mt-4 rounded-lg bg-pink-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "카드 준비 중..." : "6카드 뽑기 시작"}
          </button>
        </section>

        {cards.length > 0 ? (
          <section className="rounded-2xl border border-slate-700 bg-slate-900/65 p-5">
            <h2 className="mb-3 text-lg font-semibold">관계 스프레드</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((card, idx) => {
                const isRevealed = idx < revealedCount;
                const canReveal = idx === revealedCount && revealedCount < CARD_COUNT;
                const posLabel = POSITION_LABELS[card.position || ""] || `포지션 ${idx + 1}`;
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
                          alt={safeCardName(card, idx)}
                          fill
                          sizes="(max-width: 1024px) 45vw, 240px"
                          className="object-cover"
                        />
                        <div className="absolute inset-x-2 bottom-2 rounded-md bg-black/60 px-2 py-1 text-xs">
                          <div className="font-semibold">{safeCardName(card, idx)}</div>
                          <div className="opacity-90">{posLabel}</div>
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
                관계 해석 보기
              </button>
              <span className="text-xs text-slate-400">
                공개 진행: {revealedCount}/{CARD_COUNT}
              </span>
            </div>
          </section>
        ) : null}

        {error ? (
          <section className="rounded-xl border border-rose-600/40 bg-rose-950/30 p-4 text-sm text-rose-200">{error}</section>
        ) : null}

        {readingRaw ? (
          <section className="rounded-2xl border border-emerald-600/35 bg-emerald-950/20 p-5">
            <h2 className="mb-3 text-lg font-semibold">연애 관계 리딩 결과</h2>
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

