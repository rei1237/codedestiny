"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { showToast } from "./Toast";

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
const LOVE_RELATIONSHIP_COIN_COST = 50;
const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;

const POSITION_LABELS: Record<string, string> = {
  position_1: "내가 보는 상대",
  position_2: "상대가 관계를 보는 것",
  position_3: "상대가 나를 보는 것",
  position_4: "연애하고픈 마음",
  position_5: "관계를 막는 것",
  position_6: "예상되는 결과",
};

const READING_LABELS: Record<string, string> = {
  overallVibe: "전체 관계 흐름",
  deepReading: "심층 감정 해석",
  realityAndFuture: "현실 변수와 단기 전망",
  positionBreakdown: "포지션별 정밀 해석",
  advice: "실전 행동 가이드",
  opening: "리딩 오프닝",
  pastBond: "과거 인연",
  theirNow: "상대의 현재",
  outsideFactor: "외부 변수",
  theirHeart: "상대의 속마음",
  reunionOutcome: "재회 가능성",
  lighthouseGuidance: "등대의 조언",
  actionPlan: "실행 계획",
};

function sectionTitle(key: string) {
  return READING_LABELS[key] || key;
}

function isPositionBreakdownItem(value: unknown): value is { title?: string; card?: string; summary?: string } {
  if (!value || typeof value !== "object") return false;
  return "title" in value || "card" in value || "summary" in value;
}

const TAROT_IMAGE_MAP: Record<string, string> = {
  M00:"thefool.jpeg",M01:"themagician.jpeg",M02:"thehighpriestess.jpeg",M03:"theempress.jpeg",
  M04:"theemperor.jpeg",M05:"thehierophant.jpeg",M06:"TheLovers.jpg",M07:"thechariot.jpeg",
  M08:"thestrength.jpeg",M09:"thehermit.jpeg",M10:"wheeloffortune.jpeg",M11:"justice.jpeg",
  M12:"thehangedman.jpeg",M13:"death.jpeg",M14:"temperance.jpeg",M15:"thedevil.jpeg",
  M16:"thetower.jpeg",M17:"thestar.jpeg",M18:"themoon.jpeg",M19:"thesun.jpeg",
  M20:"judgement.jpeg",M21:"theworld.jpeg",
  W01:"aceofwands.jpeg",W02:"twoofwands.jpeg",W03:"threeofwands.jpeg",W04:"fourofwands.jpeg",
  W05:"fiveofwands.jpeg",W06:"sixofwands.jpeg",W07:"sevenofwands.jpeg",W08:"eightofwands.jpeg",
  W09:"nineofwands.jpeg",W10:"tenofwands.jpeg",W11:"pageofwands.jpeg",W12:"knightofwands.jpeg",
  W13:"queenofwands.jpeg",W14:"kingofwands.jpeg",
  C01:"aceofcups.jpeg",C02:"twoofcups.jpeg",C03:"threeofcups.jpeg",C04:"fourofcups.jpeg",
  C05:"fiveofcups.jpeg",C06:"sixofcups.jpeg",C07:"sevenofcups.jpeg",C08:"eightofcups.jpeg",
  C09:"nineofcups.jpeg",C10:"tenofcups.jpeg",C11:"pageofcups.jpeg",C12:"knightofcups.jpeg",
  C13:"queenofcups.jpeg",C14:"kingofcups.jpeg",
  S01:"aceofswords.jpeg",S02:"twoofswords.jpeg",S03:"threeofswords.jpeg",S04:"fourofswords.jpeg",
  S05:"fiveofswords.jpeg",S06:"sixofswords.jpeg",S07:"sevenofswords.jpeg",S08:"eightofswords.jpeg",
  S09:"nineofswords.jpeg",S10:"tenofswords.jpeg",S11:"pageofswords.jpeg",S12:"knightofswords.jpeg",
  S13:"queenofswords.jpeg",S14:"kingofswords.jpeg",
  P01:"aceofpentacles.jpeg",P02:"twoofpentacles.jpeg",P03:"threeofpentacles.jpeg",P04:"fourofpentacles.jpeg",
  P05:"fiveofpentacles.jpeg",P06:"sixofpentacles.jpeg",P07:"sevenofpentacles.jpeg",P08:"eightofpentacles.jpeg",
  P09:"nineofpentacles.jpeg",P10:"tenofpentacles.jpeg",P11:"pageofpentacles.jpeg",P12:"knightofpentacles.jpeg",
  P13:"queenofpentacles.jpeg",P14:"kingofpentacles.jpeg",
};

function cardImageUrl(cardId: string) {
  const key = String(cardId || "").toUpperCase();
  const fn = TAROT_IMAGE_MAP[key];
  return fn ? `/tarot-cards/${fn}` : `/tarot-cards/thefool.jpeg`;
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
    let consumedTxId = "";
    let refundHeaders: Record<string, string> | null = null;
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

      const authToken = typeof window !== "undefined"
        ? localStorage.getItem("fortune_auth_token") || localStorage.getItem("cdToken")
        : "";
      const flowerAdminToken = typeof window !== "undefined"
        ? (String(sessionStorage.getItem("flower_admin_password_ok") || "") === "1"
          ? (sessionStorage.getItem("flower_admin_token") || localStorage.getItem("flower_admin_token") || "")
          : "")
        : "";
      const adminTestTier = typeof window !== "undefined"
        ? String(localStorage.getItem("flower_admin_test_tier") || "").toLowerCase()
        : "";
      const isFlowerAdminMode = isAdminLikeUser();
      const validAdminToken = FLOWER_ADMIN_TOKEN_RE.test(String(flowerAdminToken || ""))
        ? String(flowerAdminToken)
        : "";

      if (!authToken && !isFlowerAdminMode) {
        setError("로그인이 필요합니다. 로그인 후 다시 시도해 주세요.");
        if (typeof window !== "undefined") {
          const next = encodeURIComponent(window.location.pathname + window.location.search);
          window.setTimeout(() => {
            window.location.href = `/login?next=${next}`;
          }, 600);
        }
        return;
      }

      if (!isFlowerAdminMode) {
        const consumeRequestHeaders: Record<string, string> = {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...(validAdminToken ? { "x-admin-token": validAdminToken } : {}),
          ...(validAdminToken && (adminTestTier === "standard" || adminTestTier === "premium" || adminTestTier === "vvip")
            ? { "x-admin-subscription-tier": adminTestTier }
            : {}),
        };
        const consumeRes = await fetch("/api/fortune/pig-coin/consume", {
          method: "POST",
          headers: consumeRequestHeaders,
          body: JSON.stringify({
            cost: LOVE_RELATIONSHIP_COIN_COST,
            reason: "우리는 무슨 사이 타로 이용",
            featureKey: "tarot-love-relationship",
            forceDeduct: true,
            requestId: "tarot-love-relationship:req:" + Date.now().toString() + "-" + Math.random().toString(36).slice(2,9),
          }),
        });
        const consumeData = await consumeRes.json().catch(() => ({}));
        if (consumeRes.status === 402) {
          setError(`코인이 부족합니다. ${LOVE_RELATIONSHIP_COIN_COST}코인이 필요합니다.`);
          return;
        }
        if (!consumeRes.ok) {
          setError(String(consumeData?.message || "코인 차감에 실패했습니다."));
          return;
        }
        consumedTxId = String(consumeData?.transactionId || "");
        refundHeaders = consumeRequestHeaders;
        const remainPoints = Number(consumeData?.user?.points ?? 0);
        showToast(`🪙 우리는 무슨 사이? 타로 이용으로 ${LOVE_RELATIONSHIP_COIN_COST}코인이 차감되었습니다. 남은 코인: ${remainPoints.toLocaleString("ko-KR")}`, "info");
      }

      const payloadCards = cards.map((c) => ({
        cardId: c.cardId,
        position: c.position,
        orientation: c.orientation,
      }));
      const res = await fetch("/api/tarot/love-reading", {
        method: "POST",
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
    } catch (e: any) {
      if (consumedTxId && refundHeaders) {
        try {
          const refundRes = await fetch("/api/fortune/pig-coin/refund", {
            method: "POST",
            headers: refundHeaders,
            body: JSON.stringify({
              cost: LOVE_RELATIONSHIP_COIN_COST,
              reason: "우리는 무슨 사이 타로 API 실패 자동 환불",
              featureKey: "tarot-love-relationship",
              sourceTransactionId: consumedTxId,
              requestId: `refund:tarot-love-relationship:${consumedTxId}`,
            }),
          });
          const refundData = await refundRes.json().catch(() => ({}));
          if (refundRes.ok || refundData?.alreadyRefunded) {
            const refundedPoints = Number(refundData?.user?.points ?? NaN);
            if (Number.isFinite(refundedPoints)) {
              try {
                const userRaw = localStorage.getItem("fortune_auth_user") || "null";
                const user = JSON.parse(userRaw) || {};
                user.points = refundedPoints;
                localStorage.setItem("fortune_auth_user", JSON.stringify(user));
              } catch (_) {}
            }
            showToast("API 오류로 이번 결제가 자동 환불되었습니다.", "info");
          }
        } catch (_) {}
      }
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
                const title = sectionTitle(key);

                if (Array.isArray(value) && key === "positionBreakdown") {
                  const rows = value.filter(isPositionBreakdownItem);
                  if (!rows.length) return null;
                  return (
                    <article key={key} className="rounded-lg border border-emerald-800/50 bg-slate-900/40 p-3">
                      <h3 className="mb-2 text-sm font-semibold text-emerald-300">{title}</h3>
                      <div className="space-y-2">
                        {rows.map((row, idx) => (
                          <div key={`${key}-${idx}`} className="rounded-md border border-emerald-900/70 bg-slate-900/50 p-2">
                            <p className="text-xs font-semibold text-emerald-200">{row.title || `포지션 ${idx + 1}`}</p>
                            <p className="text-xs text-slate-300">{row.card || ""}</p>
                            <p className="mt-1 text-sm text-slate-100">{row.summary || ""}</p>
                          </div>
                        ))}
                      </div>
                    </article>
                  );
                }

                const text = Array.isArray(value)
                  ? value.map((item) => `• ${String(item)}`).join("\n")
                  : String(value);
                if (!text.trim()) return null;
                return (
                  <article key={key} className="rounded-lg border border-emerald-800/50 bg-slate-900/40 p-3">
                    <h3 className="mb-1 text-sm font-semibold text-emerald-300">{title}</h3>
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

