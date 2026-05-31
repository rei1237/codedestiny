"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { showToast } from "../../components/Toast";
import { showSubscriptionIncludedNotice } from "../../components/subscriptionNotice";
import { useCoinGate } from "../../hooks/useCoinGate";
import { buildImageCandidates, TAROT_CARDS } from "../../../lib/tarot/tarot-cards.mjs";
import {
  CATEGORY_LABEL,
  DEFAULT_QUESTION_BY_CATEGORY,
  DIFFICULTY_LABEL,
  findSpreadById,
  QUESTION_CHIPS,
  SPREAD_LIBRARY,
} from "./data/tarotSpreadLibrary";
import type { DrawnTarotCard, TarotCardOrientation, TarotSpread } from "./types";
import { detectTarotCategory, recommendSpreads } from "./utils/classifyTarotQuestion";
import { buildOraclePrompt } from "./utils/buildOraclePrompt";

type Stage = "library" | "draw" | "oracle";

type TarotCardSource = {
  code?: string;
  nameKo?: string;
  nameEn?: string;
  keywords?: string[];
  focus?: string;
};

type PromptResult = ReturnType<typeof buildOraclePrompt>;

type BillingSnapshot = {
  requiredCoins: number;
  canAccess: boolean;
  freeBySubscription: boolean;
  subscriptionTier: string;
  accessReason: string;
};

const CARD_POOL = (TAROT_CARDS as TarotCardSource[])
  .map((card) => ({
    cardCode: String(card?.code || ""),
    cardNameKo: String(card?.nameKo || "알 수 없는 카드"),
    cardNameEn: String(card?.nameEn || "Unknown Card"),
    keywords: Array.isArray(card?.keywords) ? card.keywords.map((value) => String(value)) : [],
    focus: String(card?.focus || "흐름 읽기"),
    image: buildImageCandidates(String(card?.code || ""))[0] || "/tarot-cards/thefool.jpeg",
  }))
  .filter((card) => card.cardCode);

const DECK_SLOTS = Array.from({ length: 78 }, (_, index) => index);

function normalizeText(value: string) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function difficultyTone(spread: TarotSpread) {
  if (spread.difficulty === "premium") return "from-amber-300/30 via-white/12 to-rose-300/20";
  if (spread.difficulty === "deep") return "from-sky-300/20 via-white/10 to-fuchsia-300/20";
  if (spread.difficulty === "easy") return "from-emerald-300/20 via-white/10 to-cyan-300/20";
  return "from-white/20 via-white/8 to-white/16";
}

function describeLocalFlow(cards: DrawnTarotCard[]) {
  if (!cards.length) return "카드를 뽑으면 포지션과 카드 흐름이 여기서 바로 정리됩니다.";
  const positives = cards.filter((card) => card.orientation === "upright").length;
  const reversals = cards.length - positives;
  const lead = cards[0];
  const anchor = cards[Math.floor(cards.length / 2)] || cards[0];
  return `${lead.cardNameKo} ${lead.orientationLabel}에서 시작해 ${anchor.cardNameKo} ${anchor.orientationLabel}로 흐름이 고정되고 있습니다. 현재 조합은 정방향 ${positives}장, 역방향 ${reversals}장으로 감정과 현실의 속도 차이를 함께 보여줍니다.`;
}

export default function TarotPromptMakerPage() {
  const { ensurePaidAccess, isPaying } = useCoinGate();
  const libraryRef = useRef<HTMLElement | null>(null);
  const [stage, setStage] = useState<Stage>("library");
  const [question, setQuestion] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [cardCountFilter, setCardCountFilter] = useState<number | "all">("all");
  const [selectedSpreadId, setSelectedSpreadId] = useState(SPREAD_LIBRARY[0]?.id || "");
  const [allowReversed, setAllowReversed] = useState(true);
  const [usedDeckSlots, setUsedDeckSlots] = useState<number[]>([]);
  const [drawnCards, setDrawnCards] = useState<DrawnTarotCard[]>([]);
  const [promptResult, setPromptResult] = useState<PromptResult | null>(null);
  const [feedback, setFeedback] = useState("");
  const [billingSnapshot, setBillingSnapshot] = useState<BillingSnapshot | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [promptOpen, setPromptOpen] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedSpread = findSpreadById(selectedSpreadId);
  const detectedCategory = detectTarotCategory(question);
  const recommended = recommendSpreads(question, cardCountFilter).slice(0, 6);
  const filteredSpreads = SPREAD_LIBRARY.filter((spread) => {
    const normalizedQuery = normalizeText(searchQuery).toLowerCase();
    const matchesSearch = !normalizedQuery
      || normalizeText(spread.title).toLowerCase().includes(normalizedQuery)
      || normalizeText(spread.purpose).toLowerCase().includes(normalizedQuery)
      || spread.tags.some((tag) => normalizeText(tag).toLowerCase().includes(normalizedQuery));
    const matchesCount = cardCountFilter === "all" || spread.cardCount === cardCountFilter;
    return matchesSearch && matchesCount;
  }).sort((left, right) => {
    const leftRecommended = recommended.some((spread) => spread.id === left.id) ? 1 : 0;
    const rightRecommended = recommended.some((spread) => spread.id === right.id) ? 1 : 0;
    if (rightRecommended !== leftRecommended) return rightRecommended - leftRecommended;
    if (left.category === detectedCategory && right.category !== detectedCategory) return -1;
    if (right.category === detectedCategory && left.category !== detectedCategory) return 1;
    return left.cardCount - right.cardCount;
  });

  useEffect(() => {
    if (selectedSpreadId) return;
    setSelectedSpreadId(SPREAD_LIBRARY[0]?.id || "");
  }, [selectedSpreadId]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadBillingSnapshot() {
      setBillingLoading(true);
      try {
        const query = new URLSearchParams({
          featureKey: "tarot-prompt-maker",
          reason: "타로 프롬프트 라이브러리",
        });
        const response = await fetch(`/api/billing/unlock-status?${query.toString()}`, {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
        });
        const payload = await response.json().catch(() => ({}));
        const data = payload?.ok && payload?.data && typeof payload.data === "object"
          ? payload.data
          : null;
        if (!active || !data) return;

        setBillingSnapshot({
          requiredCoins: Number(data.requiredCoins || 0),
          canAccess: Boolean(data.canAccess),
          freeBySubscription: Boolean(data.freeBySubscription),
          subscriptionTier: String(data.subscriptionTier || "free"),
          accessReason: String(data.accessReason || "").trim().toLowerCase(),
        });
      } catch (_error) {
        if (!active) return;
        setBillingSnapshot(null);
      } finally {
        if (active) setBillingLoading(false);
      }
    }

    loadBillingSnapshot();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  function scrollToLibrary() {
    libraryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function selectSpread(spreadId: string) {
    setSelectedSpreadId(spreadId);
    setFeedback("");
  }

  function beginDraw(spreadId?: string) {
    const resolvedId = spreadId || selectedSpread.id;
    setSelectedSpreadId(resolvedId);
    setStage("draw");
    setUsedDeckSlots([]);
    setDrawnCards([]);
    setPromptResult(null);
    setFeedback("");
    setCopied(false);
  }

  function drawCardFromDeck(deckSlot: number) {
    if (stage !== "draw") return;
    if (usedDeckSlots.includes(deckSlot)) return;
    if (drawnCards.length >= selectedSpread.cardCount) return;

    const usedCodes = new Set(drawnCards.map((card) => card.cardCode));
    const availableCards = CARD_POOL.filter((card) => !usedCodes.has(card.cardCode));
    if (!availableCards.length) return;

    const picked = availableCards[Math.floor(Math.random() * availableCards.length)];
    const position = selectedSpread.positions[drawnCards.length];
    const orientation: TarotCardOrientation = allowReversed && Math.random() < 0.35 ? "reversed" : "upright";

    setUsedDeckSlots((prev) => [...prev, deckSlot]);
    setDrawnCards((prev) => [
      ...prev,
      {
        slotIndex: position.index,
        positionLabel: position.label,
        positionDescription: position.description,
        cardCode: picked.cardCode,
        cardNameKo: picked.cardNameKo,
        cardNameEn: picked.cardNameEn,
        keywords: picked.keywords,
        orientation,
        orientationLabel: orientation === "reversed" ? "역방향" : "정방향",
        image: picked.image,
        focus: picked.focus,
      },
    ]);
    setFeedback("");
  }

  async function handleGeneratePrompt() {
    if (isGenerating || isPaying) return;
    if (drawnCards.length !== selectedSpread.cardCount) {
      setFeedback(`이 스프레드는 ${selectedSpread.cardCount}장을 모두 뽑아야 합니다.`);
      return;
    }

    const generate = () => {
      const nextPrompt = buildOraclePrompt(selectedSpread, question, drawnCards);
      setPromptResult(nextPrompt);
      setStage("oracle");
      setPromptOpen(true);
      setFeedback("");
    };

    setIsGenerating(true);
    try {
      const paymentResult = await ensurePaidAccess({
        featureKey: "tarot-prompt-maker",
        reason: "타로 프롬프트 라이브러리",
        forceDeduct: !Boolean(billingSnapshot?.canAccess),
        requestId: `tarot-prompt-library:req:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        onPaid: ({ chargedCoins, requiredCoins, balanceAfter }) => {
          generate();
          if (chargedCoins <= 0 && requiredCoins > 0) {
            showSubscriptionIncludedNotice({
              message: "구독 혜택으로 이번 프롬프트 생성은 코인이 차감되지 않았습니다.",
              reason: "타로 프롬프트 라이브러리",
            });
            return;
          }
          if (chargedCoins > 0) {
            showToast(`타로 프롬프트 라이브러리 이용으로 ${chargedCoins}코인이 차감되었습니다. 남은 코인: ${balanceAfter.toLocaleString("ko-KR")}`, "info");
          }
        },
      });

      if (!paymentResult.ok) {
        if (paymentResult.code === "AUTH_REQUIRED") {
          setFeedback("로그인이 필요합니다. 로그인 후 다시 시도해 주세요.");
          if (typeof window !== "undefined") {
            const next = encodeURIComponent(window.location.pathname + window.location.search);
            window.setTimeout(() => {
              window.location.href = `/login?next=${next}`;
            }, 600);
          }
          return;
        }
        if (paymentResult.code === "INSUFFICIENT_COINS") {
          setFeedback(`코인이 부족합니다. ${paymentResult.requiredCoins}코인이 필요합니다.`);
          return;
        }
        if (paymentResult.code === "PRICE_NOT_FOUND") {
          setFeedback("현재 서비스 가격 정책을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
          return;
        }
        if (paymentResult.code === "SERVER_CONFIG_ERROR") {
          setFeedback("결제 서버 설정을 확인 중입니다. 잠시 후 다시 시도해 주세요.");
          return;
        }
        if (paymentResult.code === "FEATURE_EXECUTION_FAILED" && paymentResult.refunded) {
          showToast("프롬프트 생성 실패로 이번 결제가 자동 환불되었습니다.", "info");
        }
        setFeedback(paymentResult.message || "코인 차감에 실패했습니다.");
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "프롬프트 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopyPrompt() {
    if (!promptResult?.prompt) return;
    try {
      await navigator.clipboard.writeText(promptResult.prompt);
      setCopied(true);
      showToast("Oracle Prompt가 복사되었습니다.", "success");
    } catch (_error) {
      showToast("클립보드 복사에 실패했습니다.", "error");
    }
  }

  function handleRestart() {
    setStage("library");
    setDrawnCards([]);
    setUsedDeckSlots([]);
    setPromptResult(null);
    setFeedback("");
    scrollToLibrary();
  }

  const effectiveQuestion = normalizeText(question) || DEFAULT_QUESTION_BY_CATEGORY[selectedSpread.category];
  const localFlow = describeLocalFlow(drawnCards);
  const billingCoinLabel = billingSnapshot
    ? (billingSnapshot.requiredCoins > 0 ? `${billingSnapshot.requiredCoins}코인` : "무료")
    : "1회 50코인";
  const billingStateLabel = billingSnapshot
    ? (billingSnapshot.freeBySubscription
      ? "구독 포함"
      : billingSnapshot.canAccess
        ? "즉시 접근 가능"
        : "결제 필요")
    : (billingLoading ? "정책 확인 중" : "정책 미연동");

  return (
    <main className="relative min-h-[100dvh] w-screen overflow-x-hidden overflow-y-auto bg-[#07041a] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_8%,rgba(255,190,95,0.22),transparent_24%),radial-gradient(circle_at_88%_12%,rgba(119,138,255,0.2),transparent_26%),radial-gradient(circle_at_50%_110%,rgba(202,117,255,0.16),transparent_28%),linear-gradient(170deg,#050316_0%,#0b0e2d_44%,#170c2e_100%)]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:34px_34px]" />
      {[0, 1, 2, 3, 4, 5, 6].map((star) => (
        <motion.span
          key={`tarot-star-${star}`}
          className="pointer-events-none absolute inline-block rounded-full bg-white/80"
          style={{
            width: star % 2 === 0 ? 3 : 2,
            height: star % 2 === 0 ? 3 : 2,
            left: `${8 + star * 13}%`,
            top: `${7 + (star % 4) * 14}%`,
            boxShadow: "0 0 18px rgba(255,255,255,0.7)",
          }}
          animate={{ opacity: [0.2, 1, 0.25], scale: [1, 1.3, 1] }}
          transition={{ duration: 2.6 + star * 0.45, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      <div className="relative w-full px-3 pb-16 pt-4 sm:px-5 lg:px-8">
        <div className="grid gap-4 xl:grid-cols-[84px_minmax(0,1fr)]">
          <aside className="hidden xl:block">
            <div className="sticky top-5 rounded-[22px] border border-[#f8d38f]/22 bg-[linear-gradient(180deg,rgba(13,16,43,0.95),rgba(8,10,30,0.95))] p-2.5 shadow-[0_20px_55px_rgba(6,8,30,0.58)]">
              <div className="mb-2 rounded-[14px] border border-[#f8d38f]/30 bg-[#f8d38f]/10 px-2 py-2 text-center text-[11px] font-semibold tracking-[0.2em] text-[#ffe4a8]">
                CD
              </div>
              <div className="space-y-1.5">
                {[
                  { key: "home", icon: "☾", label: "홈" },
                  { key: "library", icon: "✦", label: "라이브러리" },
                  { key: "question", icon: "✎", label: "질문" },
                  { key: "result", icon: "☽", label: "결과" },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={item.key === "library" ? scrollToLibrary : undefined}
                    className="group w-full rounded-[12px] border border-white/8 bg-white/[0.03] px-1 py-2 text-center transition hover:border-[#f8d38f]/35 hover:bg-white/[0.08]"
                  >
                    <div className="text-sm text-white/90">{item.icon}</div>
                    <div className="mt-1 text-[10px] text-white/55 group-hover:text-[#ffe4a8]">{item.label}</div>
                  </button>
                ))}
              </div>
              <div className="mt-3 rounded-[12px] border border-white/10 bg-white/[0.04] px-1 py-2 text-center">
                <div className="text-[10px] text-white/55">Moonlit</div>
                <div className="text-[10px] font-semibold text-white/82">Premium</div>
              </div>
            </div>
          </aside>

          <div>
            <section className="rounded-[30px] border border-[#f8d38f]/25 bg-[linear-gradient(120deg,rgba(12,16,42,0.92),rgba(25,14,55,0.86))] px-5 py-6 shadow-[0_30px_120px_rgba(4,6,22,0.65)] backdrop-blur-xl lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f8d38f]/35 bg-[#f8d38f]/12 px-3 py-1 text-[11px] font-semibold tracking-[0.22em] text-[#ffe4a8]">
                Moon Archive
              </div>
              <h1 className="font-serif text-3xl leading-tight text-[#fff7e7] sm:text-4xl lg:text-[56px]">
                타로 프롬프트 라이브러리
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-white/75 sm:text-base">
                질문에 가장 맞는 스프레드를 고르고 카드 포지션 구조를 확인한 뒤 바로 프롬프트를 완성하세요.
              </p>
            </div>
            <div className="grid gap-2 text-sm text-white/70 sm:grid-cols-2 lg:w-[520px]">
              {["스프레드 선택", "질문 입력", "포지션 확인", "프롬프트 생성"].map((step, index) => (
                <div key={step} className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#f8d38f]/45 bg-[#f8d38f]/10 text-xs font-bold text-[#ffe4a8]">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
          </section>

          <section ref={libraryRef} id="spread-library" className="mt-5 grid gap-4 xl:grid-cols-[1.03fr_1fr_1.03fr]">
          <div className="rounded-[26px] border border-[#8b78d5]/35 bg-[linear-gradient(180deg,rgba(18,20,54,0.94),rgba(10,11,34,0.94))] p-4 shadow-[0_18px_60px_rgba(7,8,28,0.55)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">질문 입력</div>
                <h2 className="mt-1 text-2xl font-semibold text-[#fff6e2]">프롬프트 시작점</h2>
              </div>
              <button
                type="button"
                onClick={() => setQuestion(DEFAULT_QUESTION_BY_CATEGORY[detectedCategory])}
                className="rounded-full border border-[#f8d38f]/35 bg-[#f8d38f]/12 px-3 py-1.5 text-xs font-semibold text-[#ffe4a8] transition hover:bg-[#f8d38f]/18"
              >
                추천 질문
              </button>
            </div>

            <label className="block rounded-[20px] border border-white/12 bg-black/25 p-3">
              <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/45">나의 질문</div>
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="예: 이 관계가 앞으로 어떻게 변할지 알고 싶어요"
                className="min-h-[110px] w-full resize-none bg-transparent text-sm leading-7 text-white outline-none placeholder:text-white/32"
              />
            </label>

            <div className="mt-3 flex flex-wrap gap-2">
              {QUESTION_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setQuestion(chip.text)}
                  className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-xs text-white/80 transition hover:border-[#f8d38f]/35 hover:bg-white/14"
                >
                  <span className="mr-1.5">{chip.icon}</span>
                  {chip.label}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-[16px] border border-white/10 bg-white/[0.04] p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/42">질문 테마</div>
                <div className="mt-1 text-sm font-semibold text-white">{CATEGORY_LABEL[detectedCategory]}</div>
              </div>
              <div className="rounded-[16px] border border-white/10 bg-white/[0.04] p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/42">요금</div>
                <div className="mt-1 text-sm font-semibold text-white">{billingCoinLabel}</div>
                <div className="text-xs text-emerald-200/85">{billingStateLabel}</div>
              </div>
            </div>

            <div className="mt-4 rounded-[20px] border border-[#f8d38f]/22 bg-[linear-gradient(140deg,rgba(255,186,107,0.12),rgba(255,186,107,0.03))] p-3 text-sm leading-6 text-white/75">
              {effectiveQuestion}
            </div>

            <button
              type="button"
              onClick={() => beginDraw(selectedSpread.id)}
              className="mt-4 w-full rounded-[16px] bg-[linear-gradient(90deg,#f4b04f,#d883ff)] px-4 py-3 text-sm font-semibold text-[#190b2f] shadow-[0_12px_30px_rgba(216,131,255,0.33)] transition hover:brightness-110"
            >
              선택 스프레드로 시작하기
            </button>
          </div>

          <div className="rounded-[26px] border border-[#8b78d5]/35 bg-[linear-gradient(180deg,rgba(16,19,50,0.94),rgba(8,10,30,0.94))] p-4 shadow-[0_18px_60px_rgba(7,8,28,0.55)]">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">스프레드 라이브러리</div>
                <h2 className="mt-1 text-2xl font-semibold text-[#fff6e2]">질문에 맞는 전개 선택</h2>
              </div>
              <button
                type="button"
                onClick={scrollToLibrary}
                className="rounded-full border border-white/12 bg-white/7 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/12"
              >
                새로 보기
              </button>
            </div>

            <div className="mt-3 rounded-[16px] border border-white/12 bg-black/25 px-3 py-2.5">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="스프레드 검색"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/34"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {["all", 3, 5, 7, 10, 12, 14].map((count) => (
                <button
                  key={String(count)}
                  type="button"
                  onClick={() => setCardCountFilter(count === "all" ? "all" : count)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${cardCountFilter === count ? "border-[#f8d38f]/45 bg-[#f8d38f]/14 text-[#ffe4a8]" : "border-white/10 bg-white/6 text-white/70 hover:bg-white/10"}`}
                >
                  {count === "all" ? "전체" : `${count}장`}
                </button>
              ))}
            </div>

            <div className="mt-4 grid max-h-[760px] gap-2 overflow-auto pr-1">
              {filteredSpreads.map((spread) => {
                const active = spread.id === selectedSpread.id;
                const recommendedBadge = recommended.some((item) => item.id === spread.id);
                return (
                  <motion.button
                    key={spread.id}
                    type="button"
                    onClick={() => selectSpread(spread.id)}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.99 }}
                    className={`rounded-[16px] border p-3 text-left transition ${active ? "border-[#f8d38f]/45 bg-white/[0.13]" : "border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.09]"}`}
                  >
                    <div className={`rounded-[12px] bg-gradient-to-r px-3 py-2 ${difficultyTone(spread)}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-white/70">{CATEGORY_LABEL[spread.category]}</div>
                        <div className="flex items-center gap-1.5">
                          {recommendedBadge && <span className="rounded-full bg-[#f8d38f]/24 px-2 py-0.5 text-[10px] font-semibold text-[#ffe4a8]">추천</span>}
                          <span className="rounded-full bg-black/25 px-2 py-0.5 text-[10px] text-white/75">{DIFFICULTY_LABEL[spread.difficulty]}</span>
                        </div>
                      </div>
                      <div className="mt-2 text-base font-semibold text-white">{spread.title}</div>
                      <div className="mt-1 text-xs text-white/75">{spread.cardCount} cards • {spread.tags.slice(0, 2).join(" / ")}</div>
                    </div>
                    <p className="mt-2 text-xs leading-6 text-white/72">{spread.purpose}</p>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.aside
              key={selectedSpread.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="rounded-[26px] border border-[#8b78d5]/35 bg-[linear-gradient(180deg,rgba(16,19,50,0.94),rgba(8,10,30,0.94))] p-4 shadow-[0_18px_60px_rgba(7,8,28,0.55)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">선택한 스프레드</div>
                  <h2 className="mt-1 text-2xl font-semibold text-[#fff6e2]">{selectedSpread.title}</h2>
                </div>
                <span className="rounded-full border border-[#f8d38f]/35 bg-[#f8d38f]/10 px-2.5 py-1 text-xs text-[#ffe4a8]">
                  {selectedSpread.cardCount} cards
                </span>
              </div>

              <p className="mt-3 text-sm leading-7 text-white/72">{selectedSpread.purpose}</p>

              <div className="mt-4 rounded-[20px] border border-[#f8d38f]/20 bg-[#090f2a] p-3">
                <div className="relative mx-auto aspect-square max-w-[360px] rounded-[20px] border border-[#f8d38f]/24 bg-[radial-gradient(circle_at_50%_100%,rgba(248,211,143,0.24),transparent_32%),linear-gradient(180deg,rgba(14,18,46,0.94),rgba(8,10,30,0.94))]">
                  {selectedSpread.positions.map((position) => (
                    <div
                      key={`${selectedSpread.id}-${position.index}`}
                      className="absolute h-[84px] w-[58px] -translate-x-1/2 -translate-y-1/2 rounded-[14px] border border-white/16 bg-white/[0.05] p-1.5 text-center"
                      style={{ left: `${position.x}%`, top: `${position.y}%`, transform: `translate(-50%, -50%) rotate(${position.rotate}deg)` }}
                    >
                      <div className="text-[10px] font-bold text-[#ffe4a8]">{position.index}</div>
                      <div className="mt-1 line-clamp-3 text-[10px] leading-4 text-white/75">{position.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid gap-2">
                {selectedSpread.positions.map((position) => (
                  <div key={`${selectedSpread.id}-flow-${position.index}`} className="flex items-start gap-2 rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-2">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#f8d38f]/28 bg-[#f8d38f]/10 text-[10px] font-semibold text-[#ffe4a8]">
                      {position.index}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-white">{position.label}</div>
                      <div className="text-xs text-white/62">{position.description}</div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => beginDraw(selectedSpread.id)}
                className="mt-4 w-full rounded-[16px] bg-[linear-gradient(90deg,#f4b04f,#d883ff)] px-4 py-3 text-sm font-semibold text-[#190b2f] shadow-[0_12px_30px_rgba(216,131,255,0.33)] transition hover:brightness-110"
              >
                이 스프레드로 카드 뽑기
              </button>
            </motion.aside>
          </AnimatePresence>
            </section>

            <AnimatePresence mode="wait">
              <motion.section
                key={stage}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="relative mt-6 overflow-hidden rounded-[30px] border border-[#f8d38f]/20 bg-[linear-gradient(160deg,rgba(15,17,46,0.92),rgba(10,12,35,0.92))] p-5 shadow-[0_36px_120px_rgba(6,8,28,0.5)] backdrop-blur-2xl sm:p-6"
              >
              <div className="pointer-events-none absolute -right-12 top-6 h-32 w-32 rounded-full bg-rose-200/20 blur-3xl" />
              <div className="pointer-events-none absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-indigo-200/12 blur-3xl" />
              {stage === "library" && (
                <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[22px] border border-[#f8d38f]/22 bg-[#080d28]/90 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.2em] text-white/48">Spread Detail</div>
                        <h3 className="mt-1 text-2xl font-semibold text-[#fff6e2]">{selectedSpread.title}</h3>
                      </div>
                      <span className="rounded-full border border-[#f8d38f]/35 bg-[#f8d38f]/10 px-2.5 py-1 text-xs text-[#ffe4a8]">{DIFFICULTY_LABEL[selectedSpread.difficulty]}</span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-white/72">{selectedSpread.purpose}</p>

                    <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_0.94fr]">
                      <div className="rounded-[18px] border border-[#f8d38f]/20 bg-[radial-gradient(circle_at_50%_100%,rgba(248,211,143,0.18),transparent_32%),linear-gradient(180deg,rgba(14,18,46,0.94),rgba(8,10,30,0.94))] p-3">
                        <div className="relative aspect-square rounded-[16px] border border-[#f8d38f]/22">
                          {selectedSpread.positions.map((position) => (
                            <div
                              key={`${selectedSpread.id}-preview-${position.index}`}
                              className="absolute h-[80px] w-[56px] -translate-x-1/2 -translate-y-1/2 rounded-[12px] border border-white/14 bg-white/[0.05] p-1 text-center"
                              style={{ left: `${position.x}%`, top: `${position.y}%`, transform: `translate(-50%, -50%) rotate(${position.rotate}deg)` }}
                            >
                              <div className="text-[10px] font-bold text-[#ffe4a8]">{position.index}</div>
                              <div className="mt-1 line-clamp-3 text-[10px] text-white/70">{position.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {selectedSpread.interpretationGuide.slice(0, 4).map((item) => (
                          <div key={item} className="rounded-[14px] border border-white/10 bg-white/[0.05] px-3 py-2 text-xs leading-6 text-white/72">{item}</div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => beginDraw(selectedSpread.id)}
                      className="mt-4 w-full rounded-[16px] bg-[linear-gradient(90deg,#f4b04f,#d883ff)] px-4 py-3 text-sm font-semibold text-[#190b2f] shadow-[0_12px_30px_rgba(216,131,255,0.33)] transition hover:brightness-110"
                    >
                      이 스프레드로 프롬프트 생성하기
                    </button>
                  </div>

                  <div className="rounded-[22px] border border-[#f8d38f]/22 bg-[#070c22]/92 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.2em] text-white/48">Result / Prompt</div>
                        <h3 className="mt-1 text-2xl font-semibold text-[#fff6e2]">생성될 타로 프롬프트</h3>
                      </div>
                      <span className="rounded-full border border-white/12 bg-white/[0.06] px-2.5 py-1 text-xs text-white/70">Preview</span>
                    </div>
                    <div className="mt-3 rounded-[16px] border border-[#f8d38f]/20 bg-[#060a1a] p-3 text-sm leading-7 text-white/72">
                      질문에 맞는 카드 구성을 완성하면 여기에 Oracle Prompt가 표시됩니다. 지금은 스프레드 선택과 질문 정제를 먼저 진행해 주세요.
                    </div>
                    <div className="mt-3 grid gap-2">
                      {selectedSpread.positions.slice(0, 5).map((position) => (
                        <div key={`${selectedSpread.id}-prompt-line-${position.index}`} className="rounded-[12px] border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/68">
                          {position.index}. {position.label} 포지션을 중심으로 해석됩니다.
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" className="rounded-full border border-white/12 bg-white/6 px-3 py-2 text-xs text-white/80">
                        복사 대기
                      </button>
                      <button
                        type="button"
                        onClick={() => beginDraw(selectedSpread.id)}
                        className="rounded-full bg-[linear-gradient(90deg,#f4b04f,#d883ff)] px-4 py-2 text-xs font-semibold text-[#190b2f]"
                      >
                        카드 뽑기 시작
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {stage === "draw" && (
                <div className="grid gap-6 xl:grid-cols-[0.75fr_1.05fr]">
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.25em] text-white/48">Card Drawing</div>
                        <h2 className="mt-2 text-3xl font-semibold text-white">{selectedSpread.title}</h2>
                      </div>
                      <button
                        type="button"
                        onClick={handleRestart}
                        className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-semibold text-white/72 transition hover:bg-white/10"
                      >
                        라이브러리로 돌아가기
                      </button>
                    </div>
                    <div className="rounded-[24px] border border-rose-100/20 bg-black/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.25em] text-white/48">Question</div>
                          <div className="mt-2 text-sm leading-7 text-white/76">{effectiveQuestion}</div>
                        </div>
                        <label className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/6 px-3 py-2 text-xs font-semibold text-white/78">
                          <input
                            type="checkbox"
                            checked={allowReversed}
                            onChange={(event) => setAllowReversed(event.target.checked)}
                            className="h-4 w-4 accent-amber-300"
                          />
                          역방향 포함
                        </label>
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-fuchsia-100/20 bg-[#070c1a]/90 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.25em] text-white/48">Spread Board</div>
                          <div className="mt-2 text-sm text-white/70">{drawnCards.length} / {selectedSpread.cardCount} cards selected</div>
                        </div>
                        <div className="rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-xs font-semibold text-amber-50">
                          {selectedSpread.cardCount} Cards
                        </div>
                      </div>
                      <div className="relative mt-4 aspect-square rounded-[28px] border border-dashed border-rose-100/25 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.12),transparent_42%),radial-gradient(circle_at_80%_20%,rgba(244,114,182,0.16),transparent_36%),linear-gradient(180deg,rgba(10,15,28,0.96),rgba(7,9,18,0.9))]">
                        {selectedSpread.positions.map((position) => {
                          const drawn = drawnCards.find((card) => card.slotIndex === position.index);
                          return (
                            <div
                              key={`${selectedSpread.id}-${position.index}`}
                              className="absolute h-[96px] w-[68px] -translate-x-1/2 -translate-y-1/2 rounded-[20px] border border-rose-100/20 bg-white/[0.05] p-2 text-center shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
                              style={{ left: `${position.x}%`, top: `${position.y}%`, transform: `translate(-50%, -50%) rotate(${position.rotate}deg)` }}
                            >
                              {drawn ? (
                                <div className="flex h-full flex-col overflow-hidden rounded-[14px] border border-white/10 bg-black/30">
                                  <img src={drawn.image} alt={drawn.cardNameKo} className="h-12 w-full object-cover" />
                                  <div className="flex-1 px-1 py-1 text-[10px] leading-4 text-white/76">
                                    <div className="font-semibold text-amber-50">{drawn.cardNameKo}</div>
                                    <div>{drawn.orientationLabel}</div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex h-full flex-col items-center justify-center rounded-[14px] border border-dashed border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] px-1 text-[10px] leading-4 text-white/52">
                                  <div className="text-amber-100">{position.index}</div>
                                  <div className="mt-1">{position.label}</div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-rose-100/20 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4 text-sm leading-7 text-white/75">
                      {localFlow}
                    </div>

                    <button
                      type="button"
                      onClick={handleGeneratePrompt}
                      disabled={drawnCards.length !== selectedSpread.cardCount || isGenerating || isPaying}
                      className="w-full rounded-full bg-[linear-gradient(90deg,#fbbf24,#fb7185,#60a5fa)] px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_40px_rgba(244,114,182,0.26)] transition disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {isGenerating || isPaying ? "Oracle Prompt 생성 중..." : "Oracle Prompt 만들기"}
                    </button>
                    {feedback && <div className="text-sm text-rose-200">{feedback}</div>}
                  </div>

                  <div className="space-y-5">
                    <div className="rounded-[24px] border border-fuchsia-100/20 bg-black/25 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.25em] text-white/48">Moon Deck</div>
                          <div className="mt-2 text-sm text-white/72">78장 덱에서 원하는 위치를 눌러 카드를 선택하세요.</div>
                        </div>
                        <div className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-xs font-semibold text-white/70">
                          {78 - usedDeckSlots.length} cards left
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
                        {DECK_SLOTS.map((deckSlot) => {
                          const disabled = usedDeckSlots.includes(deckSlot) || drawnCards.length >= selectedSpread.cardCount;
                          return (
                            <button
                              key={deckSlot}
                              type="button"
                              disabled={disabled}
                              onClick={() => drawCardFromDeck(deckSlot)}
                              className={`group aspect-[0.72] rounded-[16px] border text-[10px] font-semibold transition ${disabled ? "border-white/6 bg-black/20 text-white/24" : "border-rose-100/22 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.03))] text-amber-50 hover:-translate-y-1 hover:border-rose-200/40 hover:shadow-[0_10px_22px_rgba(251,113,133,0.22)] hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.08))]"}`}
                            >
                              <div className="flex h-full flex-col items-center justify-center rounded-[14px] bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.12),transparent_34%),linear-gradient(180deg,rgba(6,10,18,0.96),rgba(11,17,32,0.96))]">
                                <div className="text-[11px] tracking-[0.2em]">MOON</div>
                                <div className="mt-1 text-[9px] text-white/48">{deckSlot + 1}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="rounded-[24px] border border-rose-100/20 bg-[#070c1a]/90 p-4">
                      <div className="text-[11px] uppercase tracking-[0.25em] text-white/48">Selected Cards</div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {selectedSpread.positions.map((position, index) => {
                          const drawn = drawnCards[index];
                          return (
                            <div key={`${selectedSpread.id}-selected-${position.index}`} className="rounded-[20px] border border-rose-100/20 bg-white/[0.05] p-3">
                              <div className="text-[11px] uppercase tracking-[0.2em] text-white/42">Position {position.index}</div>
                              <div className="mt-2 text-sm font-semibold text-white">{position.label}</div>
                              {drawn ? (
                                <div className="mt-3 flex gap-3">
                                  <img src={drawn.image} alt={drawn.cardNameKo} className="h-20 w-14 rounded-[12px] object-cover" />
                                  <div className="text-xs leading-6 text-white/68">
                                    <div className="font-semibold text-amber-50">{drawn.cardNameKo}</div>
                                    <div>{drawn.orientationLabel}</div>
                                    <div className="mt-1 line-clamp-3">{drawn.keywords.slice(0, 4).join(", ") || drawn.focus}</div>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-3 text-xs leading-6 text-white/48">다음 클릭에서 이 포지션이 채워집니다.</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {stage === "oracle" && promptResult && (
                <div className="grid gap-6 xl:grid-cols-[0.72fr_1.08fr]">
                  <div className="space-y-5">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.25em] text-white/48">Oracle Prompt Ready</div>
                      <h2 className="mt-2 text-3xl font-semibold text-white">{selectedSpread.title}</h2>
                      <p className="mt-3 text-sm leading-7 text-white/74">{promptResult.summary}</p>
                    </div>

                    <div className="rounded-[24px] border border-fuchsia-100/20 bg-black/25 p-4">
                      <div className="text-[11px] uppercase tracking-[0.25em] text-white/48">Effective Question</div>
                      <div className="mt-2 text-sm leading-7 text-white/78">{promptResult.effectiveQuestion}</div>
                    </div>

                    <div className="rounded-[24px] border border-rose-100/20 bg-[#070c1a]/90 p-4">
                      <div className="text-[11px] uppercase tracking-[0.25em] text-white/48">Card Digest</div>
                      <div className="mt-4 grid gap-3">
                        {promptResult.cardDigest.map((line) => (
                          <div key={line} className="rounded-[18px] border border-rose-100/20 bg-white/[0.05] px-3 py-2.5 text-sm leading-7 text-white/74">
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {promptResult.guidance.map((item) => (
                        <div key={item} className="rounded-[20px] border border-fuchsia-100/20 bg-white/[0.05] p-3 text-sm leading-7 text-white/72">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-rose-100/20 bg-[linear-gradient(160deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-[0.25em] text-white/48">Prompt Panel</div>
                        <div className="mt-2 text-lg font-semibold text-white">Oracle Prompt</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setPromptOpen((prev) => !prev)}
                          className="rounded-full border border-white/12 bg-white/6 px-3 py-2 text-xs font-semibold text-white/76 transition hover:bg-white/10"
                        >
                          {promptOpen ? "접기" : "펼치기"}
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyPrompt}
                          className="rounded-full border border-amber-200/30 bg-amber-100/12 px-3 py-2 text-xs font-semibold text-amber-50 transition hover:bg-amber-100/18"
                        >
                          {copied ? "복사 완료" : "복사하기"}
                        </button>
                        <button
                          type="button"
                          disabled
                          className="cursor-not-allowed rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/34"
                        >
                          AI 상담 받기 예정
                        </button>
                      </div>
                    </div>

                    {promptOpen && (
                      <div className="mt-4 rounded-[24px] border border-rose-100/20 bg-[#050912]/95 p-3">
                        <textarea
                          readOnly
                          value={promptResult.prompt}
                          className="min-h-[520px] w-full resize-none bg-transparent text-sm leading-7 text-white/76 outline-none"
                        />
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => beginDraw(selectedSpread.id)}
                        className="rounded-full border border-white/12 bg-white/6 px-4 py-2.5 text-sm font-semibold text-white/78 transition hover:bg-white/10"
                      >
                        같은 스프레드 다시 뽑기
                      </button>
                      <button
                        type="button"
                        onClick={handleRestart}
                        className="rounded-full bg-[linear-gradient(90deg,#fbbf24,#fb7185,#60a5fa)] px-4 py-2.5 text-sm font-semibold text-slate-950"
                      >
                        타로 프롬프트 라이브러리로 이동하기
                      </button>
                    </div>

                    <div className="mt-4 rounded-[22px] border border-fuchsia-100/20 bg-white/[0.05] p-4 text-sm leading-7 text-white/70">
                      AI 상담 API 연결은 다음 단계에서 붙일 예정입니다. 지금은 카드 선택 결과를 바탕으로 고품질 Oracle Prompt를 복사해 바로 사용할 수 있습니다.
                    </div>
                  </div>
                </div>
              )}
              </motion.section>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </main>
  );
}