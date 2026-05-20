"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCoinGate } from "../../hooks/useCoinGate";
import { showSubscriptionIncludedNotice } from "../../components/subscriptionNotice";
import { showToast } from "../../components/Toast";
import {
  NUMEROLOGY_DATA,
  TOPIC_LABELS,
  buildNumerologyContext,
  selectCards,
} from "../../../lib/tarot/numerology-tarot.mjs";

type TopicKey = keyof typeof TOPIC_LABELS;

type DrawnCard = {
  card: {
    id: number;
    nameKr: string;
    name: string;
    emoji?: string;
    upright?: string;
    reversed?: string;
  };
  orientation: "upright" | "reversed";
  position: number;
  positionLabel: string;
};

type ReadingResponse = {
  ok: boolean;
  source?: string;
  topic?: string;
  model?: string;
  interpretation?: {
    numerologyReading: string;
    coreMessage: string;
    cardReadings: Array<{ title: string; interpretation: string }>;
    conclusion: {
      summary: string;
      doThis: string[];
      avoidThis: string[];
      finalWord: string;
    };
  };
  message?: string;
};

type NumerologyContext = {
  lifePathNumber: number;
  personalDayNumber: number;
  questionNumber: number;
  topic: string;
  topicLabel: string;
  birthDate: string;
};

const TOPIC_OPTIONS: Array<{ value: TopicKey; label: string }> = Object.entries(TOPIC_LABELS).map(([value, label]) => ({
  value: value as TopicKey,
  label,
}));

function toText(value: unknown): string {
  return String(value || "").trim();
}

export default function NumerologyTarotClient() {
  const router = useRouter();
  const { ensurePaidAccess, isPaying } = useCoinGate();

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [topic, setTopic] = useState<TopicKey>("love");
  const [question, setQuestion] = useState("");

  const [numerology, setNumerology] = useState<NumerologyContext | null>(null);
  const [cards, setCards] = useState<DrawnCard[]>([]);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [reading, setReading] = useState<ReadingResponse["interpretation"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lifeData = useMemo(() => {
    const key = Number(numerology?.lifePathNumber || 0);
    return NUMEROLOGY_DATA[key as keyof typeof NUMEROLOGY_DATA] || null;
  }, [numerology]);

  function startDraw() {
    if (!birthDate) {
      setError("생년월일을 입력해 주세요.");
      return;
    }

    const context = buildNumerologyContext({
      birthDate,
      topic,
    }) as NumerologyContext;

    const selected = selectCards({
      birthDate,
      topic,
      name,
      numerology: context,
    }) as DrawnCard[];

    setNumerology(context);
    setCards(selected);
    setReading(null);
    setError("");
    setRevealed([]);
  }

  function revealCard(index: number) {
    if (revealed.includes(index)) return;
    setRevealed((prev) => [...prev, index]);
  }

  async function requestReading() {
    const res = await fetch("/api/tarot/numerology-reading", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: toText(name),
        birthDate,
        topic,
        question: toText(question),
        numerology,
        cards,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as ReadingResponse;
    if (!res.ok || !data?.ok || !data?.interpretation) {
      throw new Error(data?.message || "리딩 생성에 실패했습니다.");
    }
    setReading(data.interpretation);
  }

  async function payAndRead() {
    if (!cards.length || !numerology) {
      setError("먼저 카드 뽑기를 진행해 주세요.");
      return;
    }
    if (revealed.length < cards.length) {
      setError("카드 3장을 모두 열어야 해석을 볼 수 있습니다.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const paymentResult = await ensurePaidAccess({
        featureKey: "tarot-numerology-reading",
        reason: "수비학 타로 리딩",
        forceDeduct: true,
        requestId: `tarot-numerology-reading:req:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        onPaid: async ({ chargedCoins, requiredCoins, balanceAfter }) => {
          await requestReading();
          if (chargedCoins <= 0 && requiredCoins > 0) {
            showSubscriptionIncludedNotice({
              message: "구독 혜택이 적용되어 코인이 차감되지 않았습니다.",
              reason: "수비학 타로 리딩",
            });
            return;
          }
          if (chargedCoins > 0) {
            showToast(`수비학 타로 리딩 이용으로 ${chargedCoins}코인이 차감되었습니다. 남은 코인: ${balanceAfter.toLocaleString("ko-KR")}`, "info");
          }
        },
      });

      if (!paymentResult.ok) {
        if (paymentResult.code === "AUTH_REQUIRED") {
          setError("로그인이 필요합니다. 로그인 페이지로 이동합니다.");
          if (typeof window !== "undefined") {
            const next = encodeURIComponent(window.location.pathname + window.location.search);
            window.setTimeout(() => {
              window.location.href = `/login?next=${next}`;
            }, 600);
          }
          return;
        }
        if (paymentResult.code === "INSUFFICIENT_COINS") {
          setError(`코인이 부족합니다. ${paymentResult.requiredCoins}코인이 필요합니다.`);
          return;
        }
        setError(paymentResult.message || "코인 결제에 실패했습니다.");
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "리딩 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_15%_15%,#452f1e_0%,#100f17_45%,#09090f_100%)] px-4 py-10 text-amber-50">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-3xl border border-amber-300/35 bg-black/35 p-6 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-amber-200/80">NUMBER TAROT</p>
              <h1 className="mt-2 text-3xl font-semibold text-amber-100">수비학 타로 오라클</h1>
              <p className="mt-2 text-sm text-amber-100/80">
                생년월일과 질문 주제를 결합해 오늘의 숫자 진동과 3카드의 방향성을 함께 읽습니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-xl border border-amber-200/40 px-3 py-2 text-sm text-amber-100 hover:bg-amber-200/10"
            >
              홈으로
            </button>
          </div>
        </section>

        <section className="grid gap-4 rounded-3xl border border-amber-400/25 bg-black/30 p-5 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="text-amber-100/90">이름 (선택)</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="예: 홍길동"
              className="w-full rounded-xl border border-amber-200/30 bg-amber-950/20 px-3 py-2 text-sm outline-none placeholder:text-amber-100/35 focus:border-amber-300"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-amber-100/90">생년월일</span>
            <input
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
              className="w-full rounded-xl border border-amber-200/30 bg-amber-950/20 px-3 py-2 text-sm outline-none focus:border-amber-300"
            />
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-amber-100/90">질문 주제</span>
            <select
              value={topic}
              onChange={(event) => setTopic(event.target.value as TopicKey)}
              className="w-full rounded-xl border border-amber-200/30 bg-amber-950/20 px-3 py-2 text-sm outline-none focus:border-amber-300"
            >
              {TOPIC_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="text-amber-100/90">질문 (선택)</span>
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="예: 이 관계가 앞으로 어떻게 흘러갈까요?"
              className="w-full rounded-xl border border-amber-200/30 bg-amber-950/20 px-3 py-2 text-sm outline-none placeholder:text-amber-100/35 focus:border-amber-300"
            />
          </label>

          <div className="md:col-span-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startDraw}
              className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-semibold text-stone-900 hover:bg-amber-200"
            >
              숫자와 카드 뽑기 시작
            </button>
            <button
              type="button"
              onClick={payAndRead}
              disabled={!cards.length || loading || isPaying}
              className="rounded-xl border border-amber-200/40 px-4 py-2 text-sm font-semibold text-amber-50 disabled:opacity-50"
            >
              {loading || isPaying ? "결제/리딩 진행 중..." : "해석 보기 (30코인)"}
            </button>
          </div>

          {error ? <p className="md:col-span-2 text-sm text-rose-300">{error}</p> : null}
        </section>

        {numerology ? (
          <section className="grid gap-3 md:grid-cols-4">
            <article className="rounded-2xl border border-amber-300/25 bg-black/30 p-4">
              <p className="text-xs text-amber-100/70">생명수</p>
              <p className="text-2xl font-semibold text-amber-200">{numerology.lifePathNumber}</p>
              <p className="mt-1 text-xs text-amber-100/70">{lifeData?.keyword || "핵심 파동"}</p>
            </article>
            <article className="rounded-2xl border border-amber-300/25 bg-black/30 p-4">
              <p className="text-xs text-amber-100/70">오늘의 개인수</p>
              <p className="text-2xl font-semibold text-amber-200">{numerology.personalDayNumber}</p>
            </article>
            <article className="rounded-2xl border border-amber-300/25 bg-black/30 p-4">
              <p className="text-xs text-amber-100/70">질문수</p>
              <p className="text-2xl font-semibold text-amber-200">{numerology.questionNumber}</p>
              <p className="mt-1 text-xs text-amber-100/70">{numerology.topicLabel}</p>
            </article>
            <article className="rounded-2xl border border-amber-300/25 bg-black/30 p-4">
              <p className="text-xs text-amber-100/70">기본 해석 키워드</p>
              <p className="mt-1 text-sm text-amber-100/90">{lifeData?.meaning || "이번 흐름은 정리와 재배치가 핵심입니다."}</p>
            </article>
          </section>
        ) : null}

        {cards.length ? (
          <section className="space-y-3 rounded-3xl border border-amber-300/25 bg-black/30 p-5">
            <h2 className="text-lg font-semibold text-amber-100">3카드 스프레드</h2>
            <p className="text-sm text-amber-100/75">카드를 눌러 뒤집고, 3장을 모두 공개한 뒤 30코인 리딩을 진행하세요.</p>
            <div className="grid gap-3 md:grid-cols-3">
              {cards.map((entry, idx) => {
                const isOpen = revealed.includes(idx);
                return (
                  <button
                    key={`${entry.card.id}-${idx}`}
                    type="button"
                    onClick={() => revealCard(idx)}
                    className="group rounded-2xl border border-amber-300/30 bg-gradient-to-b from-amber-800/20 to-black/60 p-4 text-left transition hover:border-amber-200"
                  >
                    <p className="text-xs text-amber-100/70">{entry.positionLabel}</p>
                    {isOpen ? (
                      <>
                        <p className="mt-3 text-2xl">{entry.card.emoji || "🜂"}</p>
                        <p className="mt-2 text-base font-semibold text-amber-100">{entry.card.nameKr || entry.card.name}</p>
                        <p className="mt-1 text-xs text-amber-100/75">{entry.orientation === "reversed" ? "역방향" : "정방향"}</p>
                        <p className="mt-2 text-xs text-amber-100/70">
                          {entry.orientation === "reversed" ? entry.card.reversed : entry.card.upright}
                        </p>
                      </>
                    ) : (
                      <div className="mt-5 flex h-32 items-center justify-center rounded-xl border border-amber-200/20 bg-black/40">
                        <span className="text-sm tracking-[0.2em] text-amber-100/60">OPEN</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {reading ? (
          <section className="space-y-4 rounded-3xl border border-amber-200/30 bg-amber-950/20 p-5">
            <h2 className="text-2xl font-semibold text-amber-100">수비학 타로 해석</h2>
            <article className="rounded-2xl border border-amber-200/25 bg-black/30 p-4">
              <p className="text-sm leading-relaxed text-amber-50/90">{reading.numerologyReading}</p>
              <p className="mt-3 text-sm font-semibold text-amber-200">핵심 메시지: {reading.coreMessage}</p>
            </article>

            <div className="grid gap-3 md:grid-cols-3">
              {reading.cardReadings.map((item, idx) => (
                <article key={`${item.title}-${idx}`} className="rounded-2xl border border-amber-200/25 bg-black/30 p-4">
                  <h3 className="text-sm font-semibold text-amber-100">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-amber-50/85">{item.interpretation}</p>
                </article>
              ))}
            </div>

            <article className="rounded-2xl border border-amber-200/25 bg-black/30 p-4">
              <p className="text-sm text-amber-100/90">{reading.conclusion.summary}</p>
              <p className="mt-3 text-sm font-semibold text-emerald-200">지금 실행할 것</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-emerald-100/90">
                {reading.conclusion.doThis.map((line, idx) => <li key={`do-${idx}`}>{line}</li>)}
              </ul>
              <p className="mt-3 text-sm font-semibold text-rose-200">피할 것</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-rose-100/90">
                {reading.conclusion.avoidThis.map((line, idx) => <li key={`avoid-${idx}`}>{line}</li>)}
              </ul>
              <p className="mt-4 text-sm text-amber-200">{reading.conclusion.finalWord}</p>
            </article>
          </section>
        ) : null}
      </div>
    </main>
  );
}
