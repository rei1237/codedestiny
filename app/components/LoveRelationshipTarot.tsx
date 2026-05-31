"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { showToast } from "./Toast";
import { showSubscriptionIncludedNotice } from "./subscriptionNotice";
import { useCoinGate } from "../hooks/useCoinGate";

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
const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;

const POSITION_LABELS: Record<string, string> = {
  self_view_of_other: "내가 바라보는 상대",
  other_view_of_relationship: "상대가 관계 전체를 보는 시각",
  other_feeling_toward_me: "상대가 나를 바라보는 마음",
  other_romantic_will: "상대의 연애 의지와 열망",
  core_block: "관계를 가로막는 핵심 요인",
  short_term_outcome: "앞으로 펼쳐질 단기적 결말",
  position_1: "내가 바라보는 상대",
  position_2: "상대가 관계 전체를 보는 시각",
  position_3: "상대가 나를 바라보는 마음",
  position_4: "상대의 연애 의지와 열망",
  position_5: "관계를 가로막는 핵심 요인",
  position_6: "앞으로 펼쳐질 단기적 결말",
};

function isPositionBreakdownItem(value: unknown): value is {
  positionTitle?: string;
  positionKey?: string;
  positionOrder?: number;
  cardName?: string;
  cardNameEn?: string;
  cardId?: string;
  suit?: string;
  rank?: string;
  isMajor?: boolean;
  isCourt?: boolean;
  orientation?: string;
  orientationLabel?: string;
  keywords?: string[];
  headline?: string;
  summary?: string;
  detail?: string;
  relationshipInsight?: string;
  advice?: string;
  caution?: string;
  rawCardMeaning?: string;
  orderConnection?: string;
  title?: string;
  card?: string;
} {
  if (!value || typeof value !== "object") return false;
  return "title" in value || "card" in value || "summary" in value || "positionTitle" in value || "cardName" in value;
}

function isFinalAdvice(value: unknown): value is {
  instantMission?: string;
  conversationTip?: string;
  relationshipBoundary?: string;
  nextSevenDays?: string;
  checklist?: string[];
} {
  if (!value || typeof value !== "object") return false;
  return "instantMission" in value || "conversationTip" in value || "relationshipBoundary" in value || "nextSevenDays" in value;
}

const TAROT_IMAGE_MAP: Record<string, string> = {
  M00:"thefool.webp",M01:"themagician.webp",M02:"thehighpriestess.webp",M03:"theempress.webp",
  M04:"theemperor.webp",M05:"thehierophant.webp",M06:"TheLovers.webp",M07:"thechariot.webp",
  M08:"thestrength.webp",M09:"thehermit.webp",M10:"wheeloffortune.webp",M11:"justice.webp",
  M12:"thehangedman.webp",M13:"death.webp",M14:"temperance.webp",M15:"thedevil.webp",
  M16:"thetower.webp",M17:"thestar.webp",M18:"themoon.webp",M19:"thesun.webp",
  M20:"judgement.webp",M21:"theworld.webp",
  W01:"aceofwands.webp",W02:"twoofwands.webp",W03:"threeofwands.webp",W04:"fourofwands.webp",
  W05:"fiveofwands.webp",W06:"sixofwands.webp",W07:"sevenofwands.webp",W08:"eightofwands.webp",
  W09:"nineofwands.webp",W10:"tenofwands.webp",W11:"pageofwands.webp",W12:"knightofwands.webp",
  W13:"queenofwands.webp",W14:"kingofwands.webp",
  C01:"aceofcups.webp",C02:"twoofcups.webp",C03:"threeofcups.webp",C04:"fourofcups.webp",
  C05:"fiveofcups.webp",C06:"sixofcups.webp",C07:"sevenofcups.webp",C08:"eightofcups.webp",
  C09:"nineofcups.webp",C10:"tenofcups.webp",C11:"pageofcups.webp",C12:"knightofcups.webp",
  C13:"queenofcups.webp",C14:"kingofcups.webp",
  S01:"aceofswords.webp",S02:"twoofswords.webp",S03:"threeofswords.webp",S04:"fourofswords.webp",
  S05:"fiveofswords.webp",S06:"sixofswords.webp",S07:"sevenofswords.webp",S08:"eightofswords.webp",
  S09:"nineofswords.webp",S10:"tenofswords.webp",S11:"pageofswords.webp",S12:"knightofswords.webp",
  S13:"queenofswords.webp",S14:"kingofswords.webp",
  P01:"aceofpentacles.webp",P02:"twoofpentacles.webp",P03:"threeofpentacles.webp",P04:"fourofpentacles.webp",
  P05:"fiveofpentacles.webp",P06:"sixofpentacles.webp",P07:"sevenofpentacles.webp",P08:"eightofpentacles.webp",
  P09:"nineofpentacles.webp",P10:"tenofpentacles.webp",P11:"pageofpentacles.webp",P12:"knightofpentacles.webp",
  P13:"queenofpentacles.webp",P14:"kingofpentacles.webp",
};

function cardImageUrl(cardId: string) {
  const key = String(cardId || "").toUpperCase();
  const fn = TAROT_IMAGE_MAP[key];
  return fn ? `/tarot-cards/${fn}` : `/tarot-cards/thefool.webp`;
}

function safeCardName(card?: DrawnCard, idx?: number) {
  const title = (card?.nameKr || card?.name || "").trim();
  if (title) return title;
  return `카드 ${typeof idx === "number" ? idx + 1 : ""}`.trim();
}

export default function LoveRelationshipTarot() {
  const router = useRouter();
  const { ensurePaidAccess } = useCoinGate();
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
      const isAdminLikeUser = () => {
        if (typeof window === "undefined") return false;
        try {
          if (String(sessionStorage.getItem("flower_admin_password_ok") || "") !== "1") return false;
        } catch (_) {}
        try {
          const sTok = String(sessionStorage.getItem("flower_admin_token") || "");
          if (FLOWER_ADMIN_TOKEN_RE.test(sTok)) return true;
        } catch (_) {}
        try {
          const lTok = String(localStorage.getItem("flower_admin_token") || "");
          if (FLOWER_ADMIN_TOKEN_RE.test(lTok)) return true;
        } catch (_) {}
        return false;
      };

      const isFlowerAdminMode = isAdminLikeUser();

      const payloadCards = cards.map((c) => ({
        cardId: c.cardId,
        position: c.position,
        orientation: c.orientation,
      }));

      const executeReading = async () => {
        const res = await fetch("/api/tarot/love-reading", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cards: payloadCards,
          }),
        });
        const data = await res.json();
        if (!res.ok || data?.ok === false) {
          throw new Error(data?.message || "해석 생성 실패");
        }
        setReadingRaw(data?.reading ?? data);
      };

      if (isFlowerAdminMode) {
        await executeReading();
        return;
      }

      const paymentResult = await ensurePaidAccess({
        featureKey: "tarot-love-relationship",
        reason: "우리는 무슨 사이? 타로 리딩",
        forceDeduct: true,
        requestId: `tarot-love-relationship:req:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        onPaid: async ({ chargedCoins, requiredCoins, balanceAfter }) => {
          await executeReading();
          if (chargedCoins <= 0 && requiredCoins > 0) {
            showSubscriptionIncludedNotice({
              message: "구독 혜택이 적용되어 코인이 차감되지 않았습니다.",
              reason: "우리는 무슨 사이 타로",
            });
            return;
          }
          if (chargedCoins > 0) {
            showToast(`🪙 우리는 무슨 사이? 타로 이용으로 ${chargedCoins}코인이 차감되었습니다. 남은 코인: ${balanceAfter.toLocaleString("ko-KR")}`, "info");
          }
        },
      });

      if (!paymentResult.ok) {
        if (paymentResult.code === "AUTH_REQUIRED") {
          setError("로그인이 필요합니다. 로그인 후 다시 시도해 주세요.");
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
        if (paymentResult.code === "FEATURE_EXECUTION_FAILED" && paymentResult.refunded) {
          showToast("API 오류로 이번 결제가 자동 환불되었습니다.", "info");
        }
        if (!paymentResult.ok) {
          setError(String(paymentResult.message || "코인 차감에 실패했습니다."));
          return;
        }
      }
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
              <article className="rounded-lg border border-emerald-800/50 bg-slate-900/40 p-3">
                <h3 className="mb-2 text-sm font-semibold text-emerald-300">🌙 타로 마스터의 시선</h3>
                {readingRaw?.overallVibe ? <p className="text-sm text-slate-100">{String(readingRaw.overallVibe)}</p> : null}
                {readingRaw?.relationshipMatrix?.sequenceFlow ? (
                  <p className="mt-2 text-sm text-slate-100"><strong>6장 흐름:</strong> {String(readingRaw.relationshipMatrix.sequenceFlow)}</p>
                ) : null}
                {Array.isArray(readingRaw?.positionBreakdown) && readingRaw.positionBreakdown.length >= 2 ? (
                  <p className="mt-2 text-sm text-slate-100">
                    <strong>첫 카드 → 마지막 카드:</strong> {String(readingRaw.positionBreakdown[0]?.cardName || "")} {String(readingRaw.positionBreakdown[0]?.orientationLabel || "")} → {String(readingRaw.positionBreakdown[readingRaw.positionBreakdown.length - 1]?.cardName || "")} {String(readingRaw.positionBreakdown[readingRaw.positionBreakdown.length - 1]?.orientationLabel || "")}
                  </p>
                ) : null}
              </article>

              <article className="rounded-lg border border-emerald-800/50 bg-slate-900/40 p-3">
                <h3 className="mb-2 text-sm font-semibold text-emerald-300">🔍 마음의 해부학</h3>
                {readingRaw?.deepReading ? <p className="text-sm text-slate-100">{String(readingRaw.deepReading)}</p> : null}
                {readingRaw?.relationshipMatrix?.projectionGap ? (
                  <p className="mt-2 text-sm text-slate-100"><strong>Projection Gap:</strong> {String(readingRaw.relationshipMatrix.projectionGap)}</p>
                ) : null}
                {readingRaw?.relationshipMatrix?.relationshipFrame ? (
                  <p className="mt-2 text-sm text-slate-100"><strong>Relationship Frame:</strong> {String(readingRaw.relationshipMatrix.relationshipFrame)}</p>
                ) : null}
              </article>

              <article className="rounded-lg border border-emerald-800/50 bg-slate-900/40 p-3">
                <h3 className="mb-2 text-sm font-semibold text-emerald-300">🚧 현실과 다가올 내일</h3>
                {readingRaw?.realityAndFuture ? <p className="text-sm text-slate-100">{String(readingRaw.realityAndFuture)}</p> : null}
                {readingRaw?.relationshipMatrix?.blockToOutcome ? (
                  <p className="mt-2 text-sm text-slate-100"><strong>Block → Outcome:</strong> {String(readingRaw.relationshipMatrix.blockToOutcome)}</p>
                ) : null}
                {readingRaw?.finalAdvice?.nextSevenDays ? (
                  <p className="mt-2 text-sm text-slate-100"><strong>Next 7 Days:</strong> {String(readingRaw.finalAdvice.nextSevenDays)}</p>
                ) : null}
              </article>

              {Array.isArray(readingRaw?.positionBreakdown) ? (
                <article className="rounded-lg border border-emerald-800/50 bg-slate-900/40 p-3">
                  <h3 className="mb-2 text-sm font-semibold text-emerald-300">🃏 포지션별 관계 해석</h3>
                  <div className="space-y-2">
                    {readingRaw.positionBreakdown.filter(isPositionBreakdownItem).map((row, idx) => (
                      <div key={`position-${idx}`} className="rounded-md border border-emerald-900/70 bg-slate-900/50 p-2">
                        <p className="text-xs font-semibold text-emerald-200">{row.positionOrder ? `${row.positionOrder}. ` : ""}{row.positionTitle || row.title || `포지션 ${idx + 1}`}</p>
                        <p className="text-xs text-slate-300">{(row.cardName || row.card || "") + (row.orientationLabel ? ` · ${row.orientationLabel}` : "")}</p>
                        {Array.isArray(row.keywords) && row.keywords.length ? (
                          <p className="mt-1 text-xs text-slate-300"><strong>핵심 키워드:</strong> {row.keywords.join(" · ")}</p>
                        ) : null}
                        {(row.headline || row.summary) ? <p className="mt-1 text-sm text-slate-100"><strong>한 줄 핵심:</strong> {row.headline || row.summary}</p> : null}
                        {row.detail ? <p className="mt-1 text-sm text-slate-100"><strong>상세 해석:</strong> {row.detail}</p> : null}
                        {row.relationshipInsight ? <p className="mt-1 text-sm text-slate-100"><strong>상대/관계 심리:</strong> {row.relationshipInsight}</p> : null}
                        {row.advice ? <p className="mt-1 text-sm text-slate-100"><strong>조언:</strong> {row.advice}</p> : null}
                        {row.caution ? <p className="mt-1 text-sm text-slate-100"><strong>주의할 점:</strong> {row.caution}</p> : null}
                        {row.orderConnection ? <p className="mt-1 text-sm text-slate-100"><strong>흐름 연결:</strong> {row.orderConnection}</p> : null}
                      </div>
                    ))}
                  </div>
                </article>
              ) : null}

              {isFinalAdvice(readingRaw?.finalAdvice) ? (
                <article className="rounded-lg border border-emerald-800/50 bg-slate-900/40 p-3">
                  <h3 className="mb-2 text-sm font-semibold text-emerald-300">🧭 마지막 조언</h3>
                  <div className="space-y-2 text-sm text-slate-100">
                    {readingRaw.finalAdvice.instantMission ? <p><strong>⚡ 지금 당장 할 1가지:</strong> {readingRaw.finalAdvice.instantMission}</p> : null}
                    {readingRaw.finalAdvice.conversationTip ? <p><strong>💬 대화 팁:</strong> {readingRaw.finalAdvice.conversationTip}</p> : null}
                    {readingRaw.finalAdvice.relationshipBoundary ? <p><strong>🛡️ 내가 지킬 선:</strong> {readingRaw.finalAdvice.relationshipBoundary}</p> : null}
                    {readingRaw.finalAdvice.nextSevenDays ? <p><strong>🌙 앞으로 7일:</strong> {readingRaw.finalAdvice.nextSevenDays}</p> : null}
                    {Array.isArray(readingRaw.finalAdvice.checklist) && readingRaw.finalAdvice.checklist.length ? (
                      <div>
                        <p><strong>✅ 실전 체크리스트:</strong></p>
                        <ul className="ml-4 list-disc">
                          {readingRaw.finalAdvice.checklist.map((line, idx) => (
                            <li key={`check-${idx}`}>{String(line)}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </article>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

