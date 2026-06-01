"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
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
import type { DrawnTarotCard, TarotCardOrientation, TarotSpreadCategory } from "./types";
import { detectTarotCategory, recommendSpreads } from "./utils/classifyTarotQuestion";
import { buildOraclePrompt } from "./utils/buildOraclePrompt";

type Stage = "question" | "draw" | "prompt";

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

const STEP_META: Array<{ id: Stage; title: string; caption: string }> = [
  { id: "question", title: "질문 입력", caption: "질문과 스프레드 준비" },
  { id: "draw", title: "카드 뽑기", caption: "직관대로 한 장씩 선택" },
  { id: "prompt", title: "프롬프트 생성", caption: "해석과 문장 완성" },
];

const CARD_COUNT_FILTERS = ["all", 3, 5, 7, 10, 12, 14] as const;

const CATEGORY_FILTER_OPTIONS: Array<{ id: "all" | TarotSpreadCategory; label: string }> = [
  { id: "all", label: "전체" },
  ...(Object.keys(CATEGORY_LABEL) as TarotSpreadCategory[]).map((id) => ({
    id,
    label: CATEGORY_LABEL[id],
  })),
];

function normalizeText(value: string) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function buildFlowLines(cards: DrawnTarotCard[]) {
  if (!cards.length) {
    return [
      "카드가 선택되면 포지션별 흐름이 여기서 정리됩니다.",
      "지금은 질문과 스프레드에 맞는 첫 장을 기다리고 있어요.",
      "직관이 끌리는 순서대로 한 장씩 뽑아보세요.",
    ];
  }

  const first = cards[0];
  const middle = cards[Math.floor(cards.length / 2)] || first;
  const last = cards[cards.length - 1] || first;
  const uprightCount = cards.filter((card) => card.orientation === "upright").length;
  const reversedCount = cards.length - uprightCount;

  return [
    `${first.cardNameKo} ${first.orientationLabel}에서 시작된 흐름이 ${middle.cardNameKo} ${middle.orientationLabel}을 지나고 있습니다.`,
    `현재 조합은 정방향 ${uprightCount}장, 역방향 ${reversedCount}장으로 감정과 현실의 속도 차이를 함께 보여줍니다.`,
    `${last.positionLabel}에 놓인 ${last.cardNameKo}가 이번 질문의 마무리 톤을 결정합니다.`,
  ];
}

function StageBadge({ current }: { current: Stage }) {
  const currentIndex = STEP_META.findIndex((step) => step.id === current);

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {STEP_META.map((step, index) => {
        const active = currentIndex === index;
        const done = currentIndex > index;
        return (
          <div
            key={step.id}
            className={`rounded-2xl border px-3 py-2.5 ${active
              ? "border-[#FFD59E]/45 bg-[linear-gradient(120deg,rgba(255,213,158,0.22),rgba(167,139,250,0.2))]"
              : done
                ? "border-[#A78BFA]/35 bg-[linear-gradient(120deg,rgba(167,139,250,0.16),rgba(109,74,255,0.12))]"
                : "border-white/10 bg-white/[0.05]"}`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${active
                  ? "border-[#FFD59E]/70 bg-[#FFD59E]/20 text-[#FFF7E6]"
                  : done
                    ? "border-[#A78BFA]/60 bg-[#A78BFA]/20 text-[#F7F0FF]"
                    : "border-white/25 text-white/75"}`}
              >
                {index + 1}
              </span>
              <div>
                <div className="text-sm font-semibold text-[#FFF7E6]">{step.title}</div>
                <div className="text-[11px] text-white/55">{step.caption}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TarotPromptMakerPage() {
  const { ensurePaidAccess, isPaying } = useCoinGate();

  const [stage, setStage] = useState<Stage>("question");
  const [question, setQuestion] = useState("");
  const [selectedSpreadId, setSelectedSpreadId] = useState(SPREAD_LIBRARY[0]?.id || "");
  const [allowReversed, setAllowReversed] = useState(true);
  const [usedDeckSlots, setUsedDeckSlots] = useState<number[]>([]);
  const [drawnCards, setDrawnCards] = useState<DrawnTarotCard[]>([]);
  const [promptResult, setPromptResult] = useState<PromptResult | null>(null);
  const [feedback, setFeedback] = useState("");
  const [billingSnapshot, setBillingSnapshot] = useState<BillingSnapshot | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const [showSpreadPicker, setShowSpreadPicker] = useState(false);
  const [showFullDeck, setShowFullDeck] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | TarotSpreadCategory>("all");
  const [cardCountFilter, setCardCountFilter] = useState<number | "all">("all");

  const selectedSpread = findSpreadById(selectedSpreadId);
  const detectedCategory = detectTarotCategory(question);

  const effectiveQuestion = useMemo(
    () => normalizeText(question) || DEFAULT_QUESTION_BY_CATEGORY[selectedSpread.category],
    [question, selectedSpread.category],
  );

  const flowLines = useMemo(() => buildFlowLines(drawnCards), [drawnCards]);
  const progressText = `${drawnCards.length} / ${selectedSpread.cardCount} cards selected`;

  const recommendedSpreads = useMemo(
    () => recommendSpreads(effectiveQuestion, cardCountFilter).slice(0, 6),
    [effectiveQuestion, cardCountFilter],
  );

  const filteredSpreads = useMemo(
    () => SPREAD_LIBRARY.filter((spread) => {
      const normalizedQuery = normalizeText(searchQuery).toLowerCase();
      const matchesSearch = !normalizedQuery
        || normalizeText(spread.title).toLowerCase().includes(normalizedQuery)
        || normalizeText(spread.purpose).toLowerCase().includes(normalizedQuery)
        || spread.tags.some((tag) => normalizeText(tag).toLowerCase().includes(normalizedQuery));
      const matchesCategory = categoryFilter === "all" || spread.category === categoryFilter;
      const matchesCount = cardCountFilter === "all" || spread.cardCount === cardCountFilter;
      return matchesSearch && matchesCategory && matchesCount;
    }).sort((left, right) => {
      const leftRecommended = recommendedSpreads.some((item) => item.id === left.id) ? 1 : 0;
      const rightRecommended = recommendedSpreads.some((item) => item.id === right.id) ? 1 : 0;
      if (rightRecommended !== leftRecommended) return rightRecommended - leftRecommended;
      if (left.category === detectedCategory && right.category !== detectedCategory) return -1;
      if (right.category === detectedCategory && left.category !== detectedCategory) return 1;
      return left.cardCount - right.cardCount;
    }),
    [searchQuery, categoryFilter, cardCountFilter, recommendedSpreads, detectedCategory],
  );

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

  function resetDrawState() {
    setUsedDeckSlots([]);
    setDrawnCards([]);
    setPromptResult(null);
    setCopied(false);
    setShowFullDeck(false);
  }

  function handleSelectSpread(spreadId: string) {
    setSelectedSpreadId(spreadId);
    setFeedback("");
    setShowSpreadPicker(false);
  }

  function handleQuestionChip(text: string) {
    setQuestion(text);
    setFeedback("");
  }

  function handleStartDraw() {
    if (!normalizeText(question)) {
      setFeedback("질문을 먼저 입력해 주세요. 짧아도 괜찮아요.");
      return;
    }
    if (!selectedSpreadId) {
      setSelectedSpreadId(SPREAD_LIBRARY[0]?.id || "");
    }
    resetDrawState();
    setFeedback("");
    setStage("draw");
  }

  function drawCardFromDeckSlot(deckSlot: number) {
    if (stage !== "draw") return;
    if (usedDeckSlots.includes(deckSlot)) return;
    if (drawnCards.length >= selectedSpread.cardCount) return;

    const usedCodes = new Set(drawnCards.map((card) => card.cardCode));
    const availableCards = CARD_POOL.filter((card) => !usedCodes.has(card.cardCode));
    if (!availableCards.length) return;

    const picked = availableCards[Math.floor(Math.random() * availableCards.length)];
    const position = selectedSpread.positions[drawnCards.length];
    if (!position) return;

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

  function drawCardFromStack() {
    const availableSlots = DECK_SLOTS.filter((slot) => !usedDeckSlots.includes(slot));
    if (!availableSlots.length) return;
    const randomSlot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
    drawCardFromDeckSlot(randomSlot);
  }

  async function handleGeneratePrompt() {
    if (isGenerating || isPaying) return;
    if (drawnCards.length !== selectedSpread.cardCount) {
      setFeedback(`이 스프레드는 ${selectedSpread.cardCount}장을 모두 뽑아야 합니다.`);
      return;
    }

    const generate = () => {
      const nextPrompt = buildOraclePrompt(selectedSpread, effectiveQuestion, drawnCards);
      setPromptResult(nextPrompt);
      setStage("prompt");
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
      showToast("프롬프트가 복사되었습니다.", "success");
    } catch (_error) {
      showToast("클립보드 복사에 실패했습니다.", "error");
    }
  }

  function handleRegeneratePrompt() {
    if (drawnCards.length !== selectedSpread.cardCount) {
      setFeedback("카드 선택이 완료된 뒤 다시 생성할 수 있습니다.");
      return;
    }
    const nextPrompt = buildOraclePrompt(selectedSpread, effectiveQuestion, drawnCards);
    setPromptResult(nextPrompt);
    setFeedback("");
    showToast("같은 카드 조합으로 프롬프트를 다시 정리했습니다.", "success");
  }

  function handleRedrawCards() {
    resetDrawState();
    setStage("draw");
    setFeedback("");
  }

  function handleChooseAnotherSpread() {
    resetDrawState();
    setStage("question");
    setShowSpreadPicker(true);
    setFeedback("");
  }

  function handleGoQuestion() {
    setStage("question");
    setFeedback("");
  }

  function handleResetAll() {
    setQuestion("");
    setSelectedSpreadId(SPREAD_LIBRARY[0]?.id || "");
    setAllowReversed(true);
    resetDrawState();
    setFeedback("");
    setStage("question");
  }

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#070A17] text-[#FFF7E6]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_6%,rgba(255,213,158,0.28),transparent_21%),radial-gradient(circle_at_88%_8%,rgba(109,74,255,0.3),transparent_29%),radial-gradient(circle_at_50%_100%,rgba(255,183,199,0.2),transparent_34%),linear-gradient(165deg,#060916_0%,#0A0F21_38%,#211735_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.25)_1px,transparent_1px),radial-gradient(rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:32px_32px,48px_48px] [background-position:0_0,18px_20px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.09] [background-image:linear-gradient(120deg,rgba(255,255,255,0.42)_0.5px,transparent_0.5px),linear-gradient(rgba(255,255,255,0.26)_0.5px,transparent_0.5px)] [background-size:3px_3px,3px_3px]" />
      <div className="pointer-events-none absolute left-[3%] top-[2.5%] h-20 w-20 rounded-full border border-[#FFD59E]/30 bg-[radial-gradient(circle_at_35%_35%,rgba(255,249,232,0.95),rgba(255,213,158,0.45)_45%,rgba(255,213,158,0.03)_72%)] shadow-[0_0_70px_rgba(255,213,158,0.4)] sm:h-24 sm:w-24" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((star) => (
        <motion.span
          key={`tarot-star-${star}`}
          className="pointer-events-none absolute inline-block rounded-full bg-white/85"
          style={{
            width: star % 3 === 0 ? 3 : 2,
            height: star % 3 === 0 ? 3 : 2,
            left: `${6 + star * 11}%`,
            top: `${8 + (star % 5) * 13}%`,
            boxShadow: "0 0 16px rgba(255,255,255,0.6)",
          }}
          animate={{ opacity: [0.22, 1, 0.35], scale: [1, 1.35, 1] }}
          transition={{ duration: 2.4 + star * 0.35, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1400px] flex-col px-3 pb-6 pt-4 sm:px-5 lg:px-8">
        <header className="rounded-[28px] border border-[#FFD59E]/28 bg-[linear-gradient(130deg,rgba(15,18,44,0.9),rgba(36,24,58,0.9))] px-4 py-4 shadow-[0_28px_95px_rgba(3,5,18,0.62)] backdrop-blur-xl sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#FFD59E]/35 bg-[#FFD59E]/12 px-3 py-1 text-[11px] font-semibold tracking-[0.2em] text-[#FFE9BF]">
                TAROT PROMPT GENERATOR
              </div>
              <h1 className="mt-3 font-serif text-2xl leading-tight text-[#FFF7E6] sm:text-3xl lg:text-4xl">
                질문 입력 → 카드 뽑기 → 프롬프트 생성
              </h1>
              <p className="mt-2 text-sm text-white/72 sm:text-base">
                선택된 카드가 당신만의 타로 프롬프트로 정리됩니다.
              </p>
            </div>

            <div className="rounded-2xl border border-[#A78BFA]/35 bg-[linear-gradient(145deg,rgba(167,139,250,0.14),rgba(255,183,199,0.1))] px-3 py-2 text-xs text-white/80">
              <div>요금: {billingCoinLabel}</div>
              <div className="text-[#FFD59E]">상태: {billingStateLabel}</div>
            </div>
          </div>

          <div className="mt-4">
            <StageBadge current={stage} />
          </div>
        </header>

        <section className="relative mt-4 flex-1 overflow-y-auto rounded-[28px] border border-white/12 bg-[linear-gradient(140deg,rgba(11,16,38,0.86),rgba(18,12,34,0.84))] p-4 shadow-[0_32px_110px_rgba(3,5,18,0.65)] backdrop-blur-2xl sm:p-6">
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,213,158,0.7),transparent)]" />
          <AnimatePresence mode="wait">
            {stage === "question" && (
              <motion.div
                key="question-stage"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="mx-auto flex w-full max-w-4xl flex-col justify-center"
              >
                <div className="rounded-[30px] border border-[#FFD59E]/28 bg-[linear-gradient(145deg,rgba(19,17,50,0.88),rgba(18,13,34,0.88))] p-5 shadow-[0_30px_90px_rgba(3,5,20,0.54)] sm:p-7">
                  <div className="text-center">
                    <h2 className="font-serif text-3xl text-[#FFF7E6] sm:text-4xl">마음 속 질문을 들려주세요</h2>
                    <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
                      질문을 입력하면, 당신에게 맞는 스프레드로 바로 카드를 뽑을 수 있어요.
                    </p>
                    <p className="mt-1 text-sm leading-7 text-white/60">
                      지금 떠오르는 사람, 고민, 장면을 그대로 적어도 괜찮아요.
                    </p>
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/14 bg-[linear-gradient(180deg,rgba(0,0,0,0.24),rgba(0,0,0,0.36))] p-3 sm:p-4">
                    <textarea
                      value={question}
                      onChange={(event) => {
                        setQuestion(event.target.value);
                        setFeedback("");
                      }}
                      maxLength={220}
                      placeholder="예: 이 관계가 앞으로 어떻게 변할지 알고 싶어요."
                      className="min-h-[150px] w-full resize-none bg-transparent text-base leading-8 text-[#FFF7E6] outline-none placeholder:text-white/30"
                    />
                    <div className="mt-2 text-right text-xs text-white/45">{question.length} / 220</div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2.5">
                    {QUESTION_CHIPS.slice(0, 6).map((chip) => (
                      <button
                        key={chip.label}
                        type="button"
                        onClick={() => handleQuestionChip(chip.text)}
                        className="rounded-full border border-white/16 bg-white/10 px-3 py-1.5 text-sm text-white/82 transition hover:border-[#FFD59E]/40 hover:bg-white/16"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border border-[#A78BFA]/35 bg-[linear-gradient(130deg,rgba(167,139,250,0.14),rgba(109,74,255,0.1))] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-white/55">선택된 스프레드</div>
                        <div className="mt-1 text-lg font-semibold text-[#FFF7E6]">{selectedSpread.title}</div>
                        <div className="mt-1 text-sm text-white/70">{selectedSpread.cardCount}장 · {DIFFICULTY_LABEL[selectedSpread.difficulty]}</div>
                        <div className="mt-1 text-sm text-white/66">{selectedSpread.purpose}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowSpreadPicker(true)}
                        className="rounded-full border border-[#FFD59E]/35 bg-[#FFD59E]/12 px-4 py-2 text-sm font-semibold text-[#FFE9BF] transition hover:bg-[#FFD59E]/20"
                      >
                        스프레드 바꾸기
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setQuestion(DEFAULT_QUESTION_BY_CATEGORY[detectedCategory])}
                      className="rounded-full border border-white/14 bg-white/8 px-4 py-2 text-sm text-white/80 transition hover:bg-white/14"
                    >
                      추천 질문 자동 입력
                    </button>
                    <button
                      type="button"
                      onClick={handleStartDraw}
                      className="rounded-full bg-[linear-gradient(90deg,#A78BFA,#FFB7C7,#FFD59E)] px-6 py-3 text-sm font-semibold text-[#1D1233] shadow-[0_18px_44px_rgba(167,139,250,0.42)] transition hover:brightness-110"
                    >
                      카드 뽑기 시작
                    </button>
                  </div>

                  {feedback && <div className="mt-3 text-sm text-rose-200">{feedback}</div>}
                </div>
              </motion.div>
            )}

            {stage === "draw" && (
              <motion.div
                key="draw-stage"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]"
              >
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-[#FFD59E]/24 bg-[linear-gradient(135deg,rgba(24,20,56,0.84),rgba(14,16,37,0.84))] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-white/52">Moon Archive</div>
                        <h2 className="mt-1 text-2xl font-semibold text-[#FFF7E6]">{selectedSpread.title}</h2>
                        <p className="mt-2 text-sm leading-7 text-white/72">{effectiveQuestion}</p>
                      </div>
                      <div className="text-right">
                        <div className="rounded-full border border-[#FFD59E]/35 bg-[#FFD59E]/12 px-3 py-1.5 text-xs font-semibold text-[#FFE9BF]">
                          {progressText}
                        </div>
                        <label className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/8 px-3 py-1.5 text-xs text-white/80">
                          <input
                            type="checkbox"
                            checked={allowReversed}
                            onChange={(event) => setAllowReversed(event.target.checked)}
                            className="h-4 w-4 accent-[#A78BFA]"
                          />
                          역방향 포함
                        </label>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleGoQuestion}
                        className="rounded-full border border-white/14 bg-white/8 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/14"
                      >
                        질문 수정
                      </button>
                      <button
                        type="button"
                        onClick={handleResetAll}
                        className="rounded-full border border-white/14 bg-white/8 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/14"
                      >
                        처음으로
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSpreadPicker(true)}
                        className="rounded-full border border-[#A78BFA]/35 bg-[#A78BFA]/12 px-3 py-1.5 text-xs font-semibold text-[#EADFFF] transition hover:bg-[#A78BFA]/20"
                      >
                        다른 스프레드 보기
                      </button>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-[#FFD59E]/22 bg-[radial-gradient(circle_at_50%_110%,rgba(255,213,158,0.24),transparent_36%),linear-gradient(180deg,rgba(14,18,41,0.94),rgba(8,10,24,0.94))] p-4">
                    <div className="text-xs uppercase tracking-[0.22em] text-white/52">Spread Board</div>
                    <p className="mt-1 text-sm text-white/68">직관이 끌리는 순서대로 카드를 뽑아보세요.</p>

                    <div className="relative mt-4 aspect-[1/1.08] rounded-[24px] border border-dashed border-white/18 bg-[radial-gradient(circle_at_50%_5%,rgba(255,183,199,0.18),transparent_40%),linear-gradient(180deg,rgba(9,12,30,0.9),rgba(6,8,21,0.92))] sm:aspect-[1.08]">
                      {selectedSpread.positions.map((position) => {
                        const drawn = drawnCards.find((card) => card.slotIndex === position.index);
                        return (
                          <motion.div
                            key={`${selectedSpread.id}-${position.index}`}
                            initial={{ opacity: 0.6, scale: 0.94 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2 }}
                            className="absolute h-[96px] w-[66px] -translate-x-1/2 -translate-y-1/2 rounded-[18px] border border-[#FFD59E]/22 bg-white/[0.05] p-1.5 shadow-[0_14px_34px_rgba(0,0,0,0.45)] sm:h-[112px] sm:w-[78px] lg:h-[124px] lg:w-[86px]"
                            style={{ left: `${position.x}%`, top: `${position.y}%`, transform: `translate(-50%, -50%) rotate(${position.rotate}deg)` }}
                          >
                            {drawn ? (
                              <motion.div
                                key={`${drawn.cardCode}-${drawn.slotIndex}`}
                                initial={{ rotateY: 112, rotateX: 9, opacity: 0, scale: 0.88, y: 14 }}
                                animate={{ rotateY: 0, rotateX: 0, opacity: 1, scale: 1, y: 0 }}
                                transition={{ type: "spring", stiffness: 220, damping: 20, mass: 0.95 }}
                                className="relative flex h-full flex-col overflow-hidden rounded-[14px] border border-white/14 bg-black/35"
                                style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
                              >
                                <span className="pointer-events-none absolute inset-x-2 top-0 h-10 bg-[linear-gradient(180deg,rgba(255,255,255,0.24),transparent)]" />
                                <img src={drawn.image} alt={drawn.cardNameKo} className="h-14 w-full object-cover sm:h-16" />
                                <div className="flex-1 px-1.5 py-1 text-[10px] leading-4 text-white/80">
                                  <div className="line-clamp-2 font-semibold text-[#FFF7E6]">{drawn.cardNameKo}</div>
                                  <div className="text-[#FFD59E]">{drawn.orientationLabel}</div>
                                </div>
                              </motion.div>
                            ) : (
                              <div className="flex h-full flex-col items-center justify-center rounded-[14px] border border-dashed border-white/20 bg-[radial-gradient(circle_at_50%_0%,rgba(255,213,158,0.2),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] px-1 text-center text-[10px] leading-4 text-white/58">
                                <div className="font-semibold text-[#FFD59E]">{position.index}</div>
                                <div className="mt-1 line-clamp-3">{position.label}</div>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/12 bg-white/[0.05] p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-white/52">포지션 의미</div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {selectedSpread.positions.map((position) => (
                        <div key={`${selectedSpread.id}-position-${position.index}`} className="rounded-xl border border-white/12 bg-black/20 px-3 py-2">
                          <div className="text-xs font-semibold text-[#FFD59E]">{position.index}. {position.label}</div>
                          <div className="mt-1 text-xs text-white/65">{position.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[24px] border border-[#A78BFA]/30 bg-[linear-gradient(135deg,rgba(109,74,255,0.18),rgba(255,183,199,0.1))] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-white/52">Tarot Deck</div>
                        <div className="mt-1 text-sm text-white/72">78장 덱에서 한 장씩 뽑아 현재 포지션에 배치됩니다.</div>
                      </div>
                      <div className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-semibold text-white/80">
                        {78 - usedDeckSlots.length} cards left
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={drawCardFromStack}
                      disabled={drawnCards.length >= selectedSpread.cardCount}
                      className="mt-4 w-full rounded-[18px] border border-[#FFD59E]/35 bg-[linear-gradient(90deg,rgba(167,139,250,0.92),rgba(255,183,199,0.9),rgba(255,213,158,0.94))] px-4 py-3 text-sm font-semibold text-[#26103F] shadow-[0_18px_42px_rgba(167,139,250,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      카드 한 장 뽑기
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowFullDeck((prev) => !prev)}
                      className="mt-2 w-full rounded-[14px] border border-white/14 bg-white/8 px-3 py-2 text-xs text-white/80 transition hover:bg-white/14"
                    >
                      {showFullDeck ? "전체 카드 보기 닫기" : "전체 카드 보기"}
                    </button>

                    {showFullDeck && (
                      <div className="mt-3 grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-10">
                        {DECK_SLOTS.map((slot) => {
                          const disabled = usedDeckSlots.includes(slot) || drawnCards.length >= selectedSpread.cardCount;
                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={disabled}
                              onClick={() => drawCardFromDeckSlot(slot)}
                              className={`aspect-[0.74] rounded-lg border text-[10px] transition active:scale-[0.97] ${disabled
                                ? "border-white/8 bg-black/25 text-white/30"
                                : "border-[#FFD59E]/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.04))] text-[#FFF7E6] hover:-translate-y-0.5 hover:border-[#FFD59E]/55"}`}
                            >
                              {slot + 1}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="rounded-[24px] border border-white/12 bg-white/[0.05] p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-white/52">선택된 카드</div>
                    <div className="mt-3 grid gap-2">
                      {selectedSpread.positions.map((position, index) => {
                        const drawn = drawnCards[index];
                        return (
                          <div key={`${selectedSpread.id}-picked-${position.index}`} className="rounded-xl border border-white/12 bg-black/20 px-3 py-2.5">
                            <div className="text-xs font-semibold text-[#FFD59E]">{position.index}. {position.label}</div>
                            {drawn ? (
                              <div className="mt-1.5 text-xs text-white/72">
                                <span className="font-semibold text-[#FFF7E6]">{drawn.cardNameKo}</span>
                                <span className="ml-1 text-[#FFB7C7]">{drawn.orientationLabel}</span>
                              </div>
                            ) : (
                              <div className="mt-1.5 text-xs text-white/50">아직 선택되지 않았어요.</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/12 bg-white/[0.05] p-4 text-sm leading-7 text-white/74">
                    {flowLines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleGeneratePrompt}
                    disabled={drawnCards.length !== selectedSpread.cardCount || isGenerating || isPaying}
                    className="w-full rounded-full bg-[linear-gradient(90deg,#A78BFA,#FFB7C7,#FFD59E)] px-5 py-3 text-sm font-semibold text-[#230F39] shadow-[0_18px_42px_rgba(167,139,250,0.36)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {isGenerating || isPaying ? "프롬프트 생성 중..." : "프롬프트 생성하기"}
                  </button>

                  {feedback && <div className="text-sm text-rose-200">{feedback}</div>}
                </div>
              </motion.div>
            )}

            {stage === "prompt" && promptResult && (
              <motion.div
                key="prompt-stage"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
                className="grid gap-5 lg:grid-cols-[0.88fr_1.12fr]"
              >
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-[#FFD59E]/22 bg-[linear-gradient(140deg,rgba(24,20,52,0.86),rgba(14,16,35,0.86))] p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-white/52">당신을 위한 타로 프롬프트</div>
                    <h2 className="mt-2 text-2xl font-semibold text-[#FFF7E6]">{selectedSpread.title}</h2>
                    <p className="mt-2 text-sm leading-7 text-white/74">{promptResult.effectiveQuestion}</p>
                    <p className="mt-2 text-sm leading-7 text-white/70">{promptResult.summary}</p>
                  </div>

                  <div className="rounded-[24px] border border-white/12 bg-white/[0.05] p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-white/52">카드 요약</div>
                    <div className="mt-3 grid gap-2">
                      {selectedSpread.positions.map((position, index) => {
                        const drawn = drawnCards[index];
                        if (!drawn) return null;
                        return (
                          <div key={`${selectedSpread.id}-result-${position.index}`} className="rounded-xl border border-white/12 bg-black/20 px-3 py-2.5">
                            <div className="text-xs text-[#FFD59E]">{position.index}. {position.label}</div>
                            <div className="mt-1 text-sm font-semibold text-[#FFF7E6]">{drawn.cardNameKo}</div>
                            <div className="text-xs text-[#FFB7C7]">{drawn.orientationLabel}</div>
                            <div className="mt-1 text-xs text-white/66">{drawn.positionDescription}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/12 bg-white/[0.05] p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-white/52">해석 요약</div>
                    <div className="mt-3 space-y-2 text-sm leading-7 text-white/74">
                      {flowLines.map((line) => (
                        <p key={`result-${line}`}>{line}</p>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[24px] border border-[#FFD59E]/25 bg-[linear-gradient(155deg,rgba(255,247,230,0.14),rgba(167,139,250,0.12))] p-4 shadow-[0_20px_46px_rgba(0,0,0,0.28)]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-[#FFF7E6]">생성된 프롬프트</div>
                      <button
                        type="button"
                        onClick={handleCopyPrompt}
                        className="rounded-full border border-[#FFD59E]/35 bg-[#FFD59E]/12 px-3 py-1.5 text-xs font-semibold text-[#FFE9BF] transition hover:bg-[#FFD59E]/20"
                      >
                        {copied ? "복사 완료" : "프롬프트 복사"}
                      </button>
                    </div>

                    <div className="mt-3 rounded-[18px] border border-white/14 bg-[linear-gradient(180deg,rgba(7,10,24,0.9),rgba(10,12,30,0.9))] p-4">
                      <div className="max-h-[500px] overflow-auto whitespace-pre-wrap text-sm leading-7 text-white/82">
                        {promptResult.prompt}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={handleRegeneratePrompt}
                      className="rounded-full border border-white/14 bg-white/8 px-4 py-2.5 text-sm font-semibold text-white/82 transition hover:bg-white/14"
                    >
                      프롬프트 다시 생성
                    </button>
                    <button
                      type="button"
                      onClick={handleRedrawCards}
                      className="rounded-full border border-white/14 bg-white/8 px-4 py-2.5 text-sm font-semibold text-white/82 transition hover:bg-white/14"
                    >
                      다시 카드 뽑기
                    </button>
                    <button
                      type="button"
                      onClick={handleChooseAnotherSpread}
                      className="rounded-full border border-[#A78BFA]/35 bg-[#A78BFA]/12 px-4 py-2.5 text-sm font-semibold text-[#EADFFF] transition hover:bg-[#A78BFA]/20"
                    >
                      다른 스프레드 선택
                    </button>
                    <button
                      type="button"
                      onClick={handleResetAll}
                      className="rounded-full bg-[linear-gradient(90deg,#A78BFA,#FFB7C7,#FFD59E)] px-4 py-2.5 text-sm font-semibold text-[#230F39]"
                    >
                      처음부터 다시하기
                    </button>
                  </div>

                  {feedback && <div className="text-sm text-rose-200">{feedback}</div>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      <AnimatePresence>
        {showSpreadPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end bg-black/65 backdrop-blur-sm sm:items-center sm:justify-center"
          >
            <motion.div
              initial={{ y: 26, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 26, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="h-[88dvh] w-full rounded-t-[26px] border border-white/12 bg-[linear-gradient(165deg,#0B0F1F,#241A3A)] p-4 shadow-[0_34px_120px_rgba(0,0,0,0.58)] sm:h-[86vh] sm:max-h-[860px] sm:max-w-5xl sm:rounded-[26px] sm:p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-white/52">Spread Library</div>
                  <div className="mt-1 text-xl font-semibold text-[#FFF7E6]">다른 스프레드 보기</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSpreadPicker(false)}
                  className="rounded-full border border-white/16 bg-white/8 px-3 py-1.5 text-sm text-white/80 transition hover:bg-white/14"
                >
                  닫기
                </button>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-[1.4fr_1fr]">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="스프레드 검색"
                  className="rounded-xl border border-white/14 bg-black/25 px-3 py-2 text-sm text-white outline-none placeholder:text-white/40"
                />
                <div className="rounded-xl border border-white/14 bg-black/25 px-3 py-2 text-sm text-white/78">
                  추천 테마: {CATEGORY_LABEL[detectedCategory]}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {CATEGORY_FILTER_OPTIONS.map((item) => (
                  <button
                    key={`spread-filter-${item.id}`}
                    type="button"
                    onClick={() => setCategoryFilter(item.id)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${categoryFilter === item.id
                      ? "border-[#FFD59E]/45 bg-[#FFD59E]/15 text-[#FFE9BF]"
                      : "border-white/12 bg-white/8 text-white/72 hover:bg-white/14"}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {CARD_COUNT_FILTERS.map((count) => (
                  <button
                    key={`spread-count-${String(count)}`}
                    type="button"
                    onClick={() => setCardCountFilter(count === "all" ? "all" : count)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${cardCountFilter === count
                      ? "border-[#A78BFA]/45 bg-[#A78BFA]/18 text-[#EADFFF]"
                      : "border-white/12 bg-white/8 text-white/72 hover:bg-white/14"}`}
                  >
                    {count === "all" ? "전체" : `${count}장`}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid max-h-[64dvh] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                {filteredSpreads.map((spread) => {
                  const active = spread.id === selectedSpread.id;
                  const recommended = recommendedSpreads.some((item) => item.id === spread.id);
                  return (
                    <motion.button
                      key={spread.id}
                      type="button"
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleSelectSpread(spread.id)}
                      className={`rounded-2xl border p-3 text-left transition ${active
                        ? "border-[#FFD59E]/45 bg-[linear-gradient(145deg,rgba(255,213,158,0.2),rgba(167,139,250,0.15))]"
                        : "border-white/12 bg-white/[0.05] hover:border-white/22 hover:bg-white/[0.08]"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-white/52">{CATEGORY_LABEL[spread.category]}</div>
                        {recommended && <span className="rounded-full border border-[#FFD59E]/35 bg-[#FFD59E]/10 px-2 py-0.5 text-[10px] text-[#FFE9BF]">추천</span>}
                      </div>
                      <div className="mt-2 text-sm font-semibold text-[#FFF7E6]">{spread.title}</div>
                      <div className="mt-1 text-xs text-white/65">{spread.cardCount}장 · {DIFFICULTY_LABEL[spread.difficulty]}</div>
                      <p className="mt-2 text-xs leading-6 text-white/68">{spread.purpose}</p>
                    </motion.button>
                  );
                })}
                {!filteredSpreads.length && (
                  <div className="col-span-full rounded-2xl border border-dashed border-white/20 bg-white/[0.04] px-4 py-8 text-center text-sm text-white/65">
                    조건에 맞는 스프레드가 없습니다. 필터를 조정해 주세요.
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
