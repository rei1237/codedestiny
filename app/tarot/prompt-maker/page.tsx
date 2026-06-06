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

const STEP_META: Array<{ id: Stage; title: string; caption: string; icon: string }> = [
  { id: "question", title: "질문 올리기", caption: "마음속 질문을 밤하늘에 올리고 어울리는 스프레드를 고르세요.", icon: "✦" },
  { id: "draw", title: "카드 열기", caption: "직관이 닿는 순서대로 카드를 열어 질문의 별자리를 만듭니다.", icon: "✦" },
  { id: "prompt", title: "오라클 문장", caption: "카드가 만든 흐름을 바로 읽을 수 있는 리딩 원고로 정리합니다.", icon: "✦" },
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
      "카드가 열리면 질문의 별자리와 포지션별 흐름이 이곳에 떠오릅니다.",
      "지금은 질문과 스프레드에 맞는 첫 문장을 기다리고 있습니다.",
      "직관이 머무는 순서대로 한 장씩 조용히 열어보세요.",
    ];
  }
  const first = cards[0];
  const middle = cards[Math.floor(cards.length / 2)] || first;
  const last = cards[cards.length - 1] || first;
  const uprightCount = cards.filter((card) => card.orientation === "upright").length;
  const reversedCount = cards.length - uprightCount;
  return [
    `${first.cardNameKo} ${first.orientationLabel}에서 열린 첫빛이 ${middle.cardNameKo} ${middle.orientationLabel}을 지나며 질문의 중심을 비춥니다.`,
    `현재 조합은 정방향 ${uprightCount}장, 역방향 ${reversedCount}장으로 열리는 힘과 머무는 힘의 균형을 보여줍니다.`,
    `${last.positionLabel}에 놓인 ${last.cardNameKo}가 이 프롬프트의 마지막 문장과 행동 톤을 정합니다.`,
  ];
}

/* ─── StepIndicator ─── */
function StepIndicator({ current }: { current: Stage }) {
  const currentIndex = STEP_META.findIndex((s) => s.id === current);
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-3xl mx-auto">
      {STEP_META.map((step, idx) => {
        const active = currentIndex === idx;
        const done = currentIndex > idx;
        return (
          <div key={step.id} className="flex items-center gap-0 flex-1">
            <div className="flex-1 flex flex-col items-center gap-1.5">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-500 ${
                active ? "border-[#c084fc] bg-[#c084fc]/20 text-[#e9d5ff] shadow-[0_0_18px_rgba(192,132,252,0.5)]"
                : done ? "border-[#a855f7] bg-[#a855f7]/15 text-[#d8b4fe]"
                : "border-white/20 bg-white/5 text-white/40"
              }`}>
                {done ? "✓" : idx + 1}
              </div>
              <div className={`text-xs font-semibold tracking-wide ${active ? "text-[#e9d5ff]" : done ? "text-[#c4b5fd]" : "text-white/35"}`}>
                {step.title}
              </div>
            </div>
            {idx < STEP_META.length - 1 && (
              <div className={`h-px flex-1 mx-2 transition-all duration-700 ${done ? "bg-gradient-to-r from-[#a855f7] to-[#c084fc]" : "bg-white/15"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Floating Stars Background ─── */
function StarField() {
  const stars = Array.from({ length: 60 }, (_, i) => i);
  return (
    <>
      {stars.map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white/80"
          style={{
            width: i % 5 === 0 ? 2.5 : i % 3 === 0 ? 2 : 1.5,
            height: i % 5 === 0 ? 2.5 : i % 3 === 0 ? 2 : 1.5,
            left: `${(i * 1.618 * 13) % 100}%`,
            top: `${(i * 2.236 * 7) % 100}%`,
          }}
          animate={{ opacity: [0.15, 0.9, 0.2], scale: [1, 1.4, 1] }}
          transition={{ duration: 2.8 + (i % 7) * 0.4, repeat: Infinity, ease: "easeInOut", delay: (i % 11) * 0.2 }}
        />
      ))}
    </>
  );
}

/* ─── Main Component ─── */
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
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const selectedSpread = findSpreadById(selectedSpreadId);
  const detectedCategory = detectTarotCategory(question);

  const effectiveQuestion = useMemo(
    () => normalizeText(question) || DEFAULT_QUESTION_BY_CATEGORY[selectedSpread.category],
    [question, selectedSpread.category],
  );

  const flowLines = useMemo(() => buildFlowLines(drawnCards), [drawnCards]);
  const progressText = `${drawnCards.length} / ${selectedSpread.cardCount}`;

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
    ? (billingSnapshot.freeBySubscription ? "구독 포함" : billingSnapshot.canAccess ? "즉시 이용" : "결제 필요")
    : (billingLoading ? "확인 중" : "미연동");

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
        const query = new URLSearchParams({ featureKey: "tarot-prompt-maker", reason: "타로 프롬프트 라이브러리" });
        const response = await fetch(`/api/billing/unlock-status?${query.toString()}`, { method: "GET", credentials: "include", signal: controller.signal });
        const payload = await response.json().catch(() => ({}));
        const data = payload?.ok && payload?.data && typeof payload.data === "object" ? payload.data : null;
        if (!active || !data) return;
        setBillingSnapshot({ requiredCoins: Number(data.requiredCoins || 0), canAccess: Boolean(data.canAccess), freeBySubscription: Boolean(data.freeBySubscription), subscriptionTier: String(data.subscriptionTier || "free"), accessReason: String(data.accessReason || "").trim().toLowerCase() });
      } catch (_error) {
        if (!active) return;
        setBillingSnapshot(null);
      } finally {
        if (active) setBillingLoading(false);
      }
    }
    loadBillingSnapshot();
    return () => { active = false; controller.abort(); };
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
    if (!selectedSpreadId) setSelectedSpreadId(SPREAD_LIBRARY[0]?.id || "");
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
            showSubscriptionIncludedNotice({ message: "구독 혜택으로 이번 프롬프트 생성은 코인이 차감되지 않았습니다.", reason: "타로 프롬프트 라이브러리" });
            return;
          }
          if (chargedCoins > 0) showToast(`타로 프롬프트 라이브러리 이용으로 ${chargedCoins}코인이 차감되었습니다. 남은 코인: ${balanceAfter.toLocaleString("ko-KR")}`, "info");
        },
      });
      if (!paymentResult.ok) {
        if (paymentResult.code === "AUTH_REQUIRED") {
          setFeedback("로그인이 필요합니다.");
          if (typeof window !== "undefined") {
            const next = encodeURIComponent(window.location.pathname + window.location.search);
            window.setTimeout(() => { window.location.href = `/login?next=${next}`; }, 600);
          }
          return;
        }
        if (paymentResult.code === "INSUFFICIENT_COINS") { setFeedback(`코인이 부족합니다. ${paymentResult.requiredCoins}코인이 필요합니다.`); return; }
        if (paymentResult.code === "PRICE_NOT_FOUND") { setFeedback("서비스 가격 정책을 불러오지 못했습니다."); return; }
        if (paymentResult.code === "SERVER_CONFIG_ERROR") { setFeedback("결제 서버 설정을 확인 중입니다."); return; }
        if (paymentResult.code === "FEATURE_EXECUTION_FAILED" && paymentResult.refunded) showToast("프롬프트 생성 실패로 이번 결제가 자동 환불되었습니다.", "info");
        setFeedback(paymentResult.message || "코인 차감에 실패했습니다.");
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "오라클 문장을 엮는 중 문제가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopyPrompt() {
    if (!promptResult?.prompt) return;
    try {
      await navigator.clipboard.writeText(promptResult.prompt);
      setCopied(true);
      showToast("오라클 원고가 복사되었습니다.", "success");
    } catch (_error) {
      showToast("클립보드 복사에 실패했습니다.", "error");
    }
  }

  function handleRegeneratePrompt() {
    if (drawnCards.length !== selectedSpread.cardCount) { setFeedback("카드 선택이 완료된 뒤 다시 생성할 수 있습니다."); return; }
    const nextPrompt = buildOraclePrompt(selectedSpread, effectiveQuestion, drawnCards);
    setPromptResult(nextPrompt);
    setFeedback("");
    showToast("같은 카드 조합으로 오라클 원고를 다시 정리했습니다.", "success");
  }

  function handleRedrawCards() { resetDrawState(); setStage("draw"); setFeedback(""); }
  function handleChooseAnotherSpread() { resetDrawState(); setStage("question"); setShowSpreadPicker(true); setFeedback(""); }
  function handleGoQuestion() { setStage("question"); setFeedback(""); }
  function handleResetAll() { setQuestion(""); setSelectedSpreadId(SPREAD_LIBRARY[0]?.id || ""); setAllowReversed(true); resetDrawState(); setFeedback(""); setStage("question"); }

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 20% 0%, #2d0a4e 0%, transparent 50%), radial-gradient(ellipse at 80% 10%, #1a0a3a 0%, transparent 45%), linear-gradient(180deg, #0d0618 0%, #120828 30%, #0f0520 60%, #080312 100%)",
        fontFamily: "'Noto Serif KR', serif",
      }}
    >
      {/* Star field */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <StarField />
      </div>

      {/* Moon top-left */}
      <div className="pointer-events-none absolute -top-6 -left-6 w-36 h-36 rounded-full opacity-80"
        style={{ background: "radial-gradient(circle at 65% 35%, #fffbe8 0%, #f5d88a 30%, #d4a820 55%, transparent 70%)", filter: "blur(1px)", boxShadow: "0 0 60px 20px rgba(212, 168, 32, 0.25)" }}
      />
      {/* Crescent accent */}
      <div className="pointer-events-none absolute top-2 left-2 w-28 h-28 rounded-full"
        style={{ background: "transparent", border: "2px solid rgba(212,168,32,0.3)", clipPath: "ellipse(65% 65% at 40% 50%)", filter: "blur(0.5px)" }}
      />

      {/* Bokeh blobs */}
      <div className="pointer-events-none absolute top-1/4 right-1/4 w-64 h-64 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #a855f7, transparent 70%)", filter: "blur(40px)" }} />
      <div className="pointer-events-none absolute bottom-1/3 left-1/5 w-48 h-48 rounded-full opacity-8" style={{ background: "radial-gradient(circle, #ec4899, transparent 70%)", filter: "blur(50px)" }} />

      {/* Floral corner ornaments */}
      <div className="pointer-events-none absolute bottom-0 right-0 w-64 h-64 opacity-20" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Ccircle cx='160' cy='160' r='60' fill='none' stroke='%23a855f7' stroke-width='0.5' opacity='0.6'/%3E%3Ccircle cx='140' cy='170' r='40' fill='none' stroke='%23c084fc' stroke-width='0.5' opacity='0.5'/%3E%3Ccircle cx='170' cy='140' r='45' fill='none' stroke='%23e879f9' stroke-width='0.5' opacity='0.4'/%3E%3C/svg%3E")`,
      }} />
      <div className="pointer-events-none absolute top-0 left-1/3 w-96 h-32 opacity-15" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 120'%3E%3Cpath d='M0,60 Q100,10 200,60 Q300,110 400,60' fill='none' stroke='%23a855f7' stroke-width='0.8' opacity='0.5'/%3E%3Cpath d='M0,40 Q100,-10 200,40 Q300,90 400,40' fill='none' stroke='%23c084fc' stroke-width='0.5' opacity='0.3'/%3E%3C/svg%3E")`,
      }} />

      {/* Scrollable content wrapper */}
      <div className="relative z-10 h-full overflow-y-auto">
        <div className="min-h-full flex flex-col px-4 py-6 sm:px-6 lg:px-10">

          {/* ── Header ── */}
          <header className="text-center mb-8 pt-2">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#a855f7]/40 bg-[#a855f7]/10 text-[11px] font-semibold tracking-[0.25em] text-[#c4b5fd] uppercase mb-4">
              ✦ Oracle Prompt Atelier ✦
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight" style={{ color: "#fff", textShadow: "0 0 40px rgba(168,85,247,0.4)" }}>
              <span className="text-[#e9d5ff]">질문을 올리고</span>
              <span className="mx-3 text-[#c084fc]">→</span>
              <span className="text-[#e9d5ff]">카드를 열어</span>
              <span className="mx-3 text-[#c084fc]">→</span>
              <span className="bg-gradient-to-r from-[#c084fc] to-[#f472b6] bg-clip-text text-transparent">오라클 원고로</span>
            </h1>
            <p className="mt-3 text-[#c4b5fd]/70 text-sm sm:text-base">
              질문, 스프레드, 카드의 방향을 하나의 섬세한 오라클 리딩 원고로 엮습니다.
            </p>

            {/* Billing badge */}
            <div className="inline-flex items-center gap-3 mt-4 px-4 py-2 rounded-full border border-[#7c3aed]/30 bg-[#1e0a3c]/60 backdrop-blur-sm">
              <span className="text-[#a78bfa] text-xs font-semibold">{billingCoinLabel}</span>
              <span className="w-px h-3 bg-white/20" />
              <span className={`text-xs font-semibold ${billingSnapshot?.freeBySubscription ? "text-[#34d399]" : "text-[#fbbf24]"}`}>{billingStateLabel}</span>
            </div>
          </header>

          {/* ── Step Indicator ── */}
          <div className="mb-8">
            <StepIndicator current={stage} />
          </div>

          {/* ── Stage Content ── */}
          <div className="flex-1">
            <AnimatePresence mode="wait">

              {/* ━━━ QUESTION STAGE ━━━ */}
              {stage === "question" && (
                <motion.div
                  key="question-stage"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="max-w-2xl mx-auto"
                >
                  {/* Question card */}
                  <div
                    className="rounded-3xl p-6 sm:p-8 border border-[#7c3aed]/40"
                    style={{
                      background: "linear-gradient(145deg, rgba(30,10,60,0.92), rgba(20,5,45,0.92))",
                      boxShadow: "0 0 60px rgba(124,58,237,0.15), inset 0 1px 0 rgba(255,255,255,0.06)",
                    }}
                  >
                    <div className="text-center mb-6">
                      <div className="text-4xl mb-3">🌙</div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-[#e9d5ff]">마음 속 질문을 들려주세요</h2>
                      <p className="mt-2 text-[#a78bfa]/80 text-sm leading-relaxed">
                        타로가 당신만의 이야기를 풀어낼 준비를 합니다.
                      </p>
                    </div>

                    {/* Textarea */}
                    <div
                      className="rounded-2xl border border-[#6d28d9]/40 p-4 mb-4"
                      style={{ background: "rgba(0,0,0,0.35)" }}
                    >
                      <textarea
                        value={question}
                        onChange={(e) => { setQuestion(e.target.value); setFeedback(""); }}
                        maxLength={220}
                        placeholder="예) 이 관계가 앞으로 어떻게 변할지 알고 싶어요."
                        className="w-full min-h-[140px] resize-none bg-transparent text-[#f3e8ff] text-sm sm:text-base leading-relaxed outline-none placeholder:text-[#7c3aed]/50"
                      />
                      <div className="text-right text-xs text-[#6d28d9]/60 mt-1">{question.length} / 220</div>
                    </div>

                    {/* Quick chips */}
                    <div className="flex flex-wrap gap-2 mb-5">
                      {QUESTION_CHIPS.slice(0, 6).map((chip) => (
                        <button
                          key={chip.label}
                          type="button"
                          onClick={() => handleQuestionChip(chip.text)}
                          className="px-3.5 py-1.5 rounded-full border border-[#7c3aed]/30 bg-[#7c3aed]/10 text-[#c4b5fd] text-xs font-medium hover:bg-[#7c3aed]/20 hover:border-[#7c3aed]/50 transition-all duration-200"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>

                    {/* Selected spread */}
                    <div
                      className="rounded-2xl border border-[#6d28d9]/35 p-4 mb-5"
                      style={{ background: "linear-gradient(135deg, rgba(109,40,217,0.12), rgba(167,139,250,0.08))" }}
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-[#7c3aed]/70 mb-1">선택된 스프레드</div>
                          <div className="text-[#e9d5ff] font-semibold text-base">{selectedSpread.title}</div>
                          <div className="text-[#a78bfa]/70 text-xs mt-0.5">{selectedSpread.cardCount}장 · {DIFFICULTY_LABEL[selectedSpread.difficulty]}</div>
                          <div className="text-[#c4b5fd]/60 text-xs mt-1 leading-relaxed">{selectedSpread.purpose}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowSpreadPicker(true)}
                          className="px-4 py-2 rounded-full border border-[#c084fc]/40 bg-[#c084fc]/10 text-[#e9d5ff] text-xs font-semibold hover:bg-[#c084fc]/20 transition-all"
                        >
                          스프레드 바꾸기
                        </button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => setQuestion(DEFAULT_QUESTION_BY_CATEGORY[detectedCategory])}
                        className="flex-1 px-4 py-3 rounded-full border border-white/15 bg-white/5 text-[#c4b5fd] text-sm font-medium hover:bg-white/10 transition-all"
                      >
                        추천 질문 자동 입력
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={handleStartDraw}
                        className="flex-1 sm:flex-[2] px-6 py-3 rounded-full font-bold text-sm text-[#1a0533] shadow-lg transition-all"
                        style={{ background: "linear-gradient(90deg, #c084fc, #f472b6, #fbbf24)", boxShadow: "0 8px 30px rgba(192,132,252,0.35)" }}
                      >
                        ✦ 카드 뽑기 시작
                      </motion.button>
                    </div>

                    {feedback && <p className="mt-3 text-rose-300/90 text-sm text-center">{feedback}</p>}
                  </div>
                </motion.div>
              )}

              {/* ━━━ DRAW STAGE ━━━ */}
              {stage === "draw" && (
                <motion.div
                  key="draw-stage"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="grid gap-5 lg:grid-cols-[1fr_380px] max-w-6xl mx-auto"
                >
                  {/* Left: Spread board */}
                  <div className="space-y-4">
                    {/* Header */}
                    <div
                      className="rounded-2xl border border-[#7c3aed]/30 p-4"
                      style={{ background: "linear-gradient(135deg, rgba(25,12,55,0.9), rgba(15,8,35,0.9))" }}
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.22em] text-[#7c3aed]/60 mb-1">Moon Archive</div>
                          <h2 className="text-xl font-bold text-[#e9d5ff]">{selectedSpread.title}</h2>
                          <p className="text-[#a78bfa]/75 text-sm mt-1 leading-relaxed">{effectiveQuestion}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div
                            className="px-3 py-1.5 rounded-full text-xs font-bold"
                            style={{ background: "linear-gradient(90deg, rgba(192,132,252,0.2), rgba(244,114,182,0.15))", border: "1px solid rgba(192,132,252,0.35)", color: "#e9d5ff" }}
                          >
                            {progressText} 완료
                          </div>
                          <label className="flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded-full border border-white/15 bg-white/5 text-xs text-[#c4b5fd]">
                            <input type="checkbox" checked={allowReversed} onChange={(e) => setAllowReversed(e.target.checked)} className="accent-[#a855f7] h-3.5 w-3.5" />
                            역방향 포함
                          </label>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button type="button" onClick={handleGoQuestion} className="px-3 py-1.5 rounded-full border border-white/12 bg-white/5 text-xs text-[#c4b5fd] hover:bg-white/10 transition-all">← 질문으로 돌아가기</button>
                        <button type="button" onClick={handleResetAll} className="px-3 py-1.5 rounded-full border border-white/12 bg-white/5 text-xs text-[#c4b5fd] hover:bg-white/10 transition-all">처음으로</button>
                        <button type="button" onClick={() => setShowSpreadPicker(true)} className="px-3 py-1.5 rounded-full border border-[#7c3aed]/30 bg-[#7c3aed]/10 text-xs text-[#c4b5fd] font-semibold hover:bg-[#7c3aed]/20 transition-all">다른 스프레드</button>
                      </div>
                    </div>

                    {/* Spread visual board */}
                    <div
                      className="rounded-3xl border border-[#6d28d9]/25 overflow-hidden"
                      style={{
                        background: "radial-gradient(ellipse at 50% 110%, rgba(192,132,252,0.18) 0%, transparent 60%), linear-gradient(180deg, rgba(12,6,30,0.95) 0%, rgba(8,4,20,0.95) 100%)",
                        boxShadow: "inset 0 0 80px rgba(109,40,217,0.06)",
                      }}
                    >
                      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                        <div className="text-xs uppercase tracking-[0.22em] text-[#7c3aed]/55">Spread Board</div>
                        <div className="ml-auto text-xs text-[#a78bfa]/60">직관이 끌리는 순서대로 카드를 뽑아보세요.</div>
                      </div>
                      <div className="relative" style={{ paddingBottom: "90%", minHeight: 280 }}>
                        {selectedSpread.positions.map((position) => {
                          const drawn = drawnCards.find((card) => card.slotIndex === position.index);
                          return (
                            <motion.div
                              key={`${selectedSpread.id}-${position.index}`}
                              initial={{ opacity: 0.5, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.25 }}
                              className="absolute"
                              style={{
                                left: `${position.x}%`,
                                top: `${position.y}%`,
                                transform: `translate(-50%, -50%) rotate(${position.rotate}deg)`,
                                width: "clamp(56px, 8vw, 80px)",
                                height: "clamp(80px, 12vw, 114px)",
                              }}
                            >
                              <div
                                className="rounded-xl border h-full w-full shadow-xl overflow-hidden"
                                style={{
                                  borderColor: drawn ? "rgba(192,132,252,0.5)" : "rgba(109,40,217,0.25)",
                                  background: drawn ? "transparent" : "rgba(0,0,0,0.4)",
                                  boxShadow: drawn ? "0 0 20px rgba(192,132,252,0.2)" : "none",
                                }}
                              >
                                {drawn ? (
                                  <motion.div
                                    key={`${drawn.cardCode}-${drawn.slotIndex}`}
                                    initial={{ rotateY: 120, opacity: 0, scale: 0.85 }}
                                    animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                                    transition={{ type: "spring", stiffness: 230, damping: 22 }}
                                    className="h-full flex flex-col"
                                    style={{ backfaceVisibility: "hidden" }}
                                  >
                                    <img src={drawn.image} alt={drawn.cardNameKo} className="w-full flex-1 object-cover" style={{ filter: drawn.orientation === "reversed" ? "hue-rotate(180deg) brightness(0.85)" : undefined, transform: drawn.orientation === "reversed" ? "rotate(180deg)" : undefined }} />
                                    <div className="px-1 py-1 text-center" style={{ background: "rgba(0,0,0,0.7)" }}>
                                      <div className="text-[9px] font-bold text-[#e9d5ff] leading-tight line-clamp-1">{drawn.cardNameKo}</div>
                                      <div className="text-[8px] text-[#f472b6]">{drawn.orientationLabel}</div>
                                    </div>
                                  </motion.div>
                                ) : (
                                  <div className="h-full flex flex-col items-center justify-center rounded-xl border-dashed border border-[#7c3aed]/30" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))" }}>
                                    <div className="text-[10px] font-bold text-[#c084fc]">{position.index}</div>
                                    <div className="text-[8px] text-white/40 mt-0.5 text-center px-1 leading-tight line-clamp-2">{position.label}</div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Position guide */}
                    <div className="rounded-2xl border border-[#6d28d9]/20 p-4" style={{ background: "rgba(10,5,25,0.7)" }}>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[#7c3aed]/55 mb-3">포지션 의미</div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {selectedSpread.positions.map((position) => (
                          <div key={`${selectedSpread.id}-position-${position.index}`} className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
                            <div className="text-xs font-semibold text-[#c084fc]">{position.index}. {position.label}</div>
                            <div className="mt-0.5 text-xs text-white/55 leading-relaxed">{position.description}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Deck + selected cards */}
                  <div className="space-y-4">
                    {/* Deck draw */}
                    <div
                      className="rounded-2xl border border-[#6d28d9]/35 p-5"
                      style={{ background: "linear-gradient(145deg, rgba(30,10,70,0.88), rgba(15,5,40,0.88))" }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.2em] text-[#7c3aed]/60">Tarot Deck</div>
                          <div className="text-xs text-[#a78bfa]/70 mt-0.5">78장 덱에서 한 장씩 뽑아보세요.</div>
                        </div>
                        <div className="px-2.5 py-1 rounded-full border border-white/12 bg-white/5 text-xs font-semibold text-[#c4b5fd]">
                          {78 - usedDeckSlots.length} / 78
                        </div>
                      </div>

                      {/* Deck visual */}
                      <div className="flex justify-center mb-4">
                        <div className="relative w-24 h-36 cursor-pointer group" onClick={drawnCards.length < selectedSpread.cardCount ? drawCardFromStack : undefined}>
                          {[2, 1, 0].map((z) => (
                            <div
                              key={z}
                              className="absolute rounded-xl border border-[#7c3aed]/40 transition-transform duration-300 group-hover:scale-105"
                              style={{
                                inset: 0,
                                transform: `translate(${z * 2}px, ${-z * 3}px)`,
                                background: `linear-gradient(135deg, #2d1b69 0%, #1e0f47 100%)`,
                                boxShadow: z === 0 ? "0 8px 30px rgba(124,58,237,0.3)" : "none",
                              }}
                            >
                              {z === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="text-3xl opacity-60" style={{ filter: "drop-shadow(0 0 8px rgba(192,132,252,0.5))" }}>🌙</div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={drawCardFromStack}
                        disabled={drawnCards.length >= selectedSpread.cardCount}
                        className="w-full py-3 rounded-2xl font-bold text-sm text-[#1a0533] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        style={{ background: "linear-gradient(90deg, #a855f7, #ec4899, #f59e0b)", boxShadow: "0 6px 25px rgba(168,85,247,0.3)" }}
                      >
                        ✦ 카드 뽑기
                      </motion.button>

                      <button
                        type="button"
                        onClick={() => setShowFullDeck((p) => !p)}
                        className="mt-2 w-full py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-[#a78bfa] hover:bg-white/10 transition-all"
                      >
                        {showFullDeck ? "전체 카드 목록 닫기" : "전체 카드 직접 선택"}
                      </button>

                      <AnimatePresence>
                        {showFullDeck && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 grid grid-cols-8 sm:grid-cols-10 gap-1 overflow-hidden"
                          >
                            {DECK_SLOTS.map((slot) => {
                              const disabled = usedDeckSlots.includes(slot) || drawnCards.length >= selectedSpread.cardCount;
                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  disabled={disabled}
                                  onClick={() => drawCardFromDeckSlot(slot)}
                                  onMouseEnter={() => setHoveredCard(slot)}
                                  onMouseLeave={() => setHoveredCard(null)}
                                  className={`aspect-[0.7] rounded-lg text-[9px] font-bold transition-all ${disabled ? "border border-white/5 bg-black/20 text-white/20" : "border border-[#7c3aed]/35 bg-[#2d1b69]/60 text-[#c4b5fd] hover:-translate-y-0.5 hover:border-[#c084fc]/50 hover:shadow-[0_0_8px_rgba(192,132,252,0.3)]"}`}
                                >
                                  {hoveredCard === slot && !disabled ? "✦" : slot + 1}
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Drawn cards list */}
                    <div className="rounded-2xl border border-[#6d28d9]/20 p-4" style={{ background: "rgba(10,5,25,0.7)" }}>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[#7c3aed]/55 mb-3">선택된 카드</div>
                      <div className="space-y-1.5">
                        {selectedSpread.positions.map((position, index) => {
                          const drawn = drawnCards[index];
                          return (
                            <div key={`${selectedSpread.id}-picked-${position.index}`} className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
                              <div className="text-xs font-semibold text-[#c084fc]">{position.index}. {position.label}</div>
                              {drawn ? (
                                <div className="mt-0.5 flex items-center gap-2">
                                  <span className="text-xs text-[#f3e8ff] font-medium">{drawn.cardNameKo}</span>
                                  <span className="text-[10px] text-[#f472b6]">{drawn.orientationLabel}</span>
                                </div>
                              ) : (
                                <div className="mt-0.5 text-[10px] text-white/30">아직 선택되지 않았어요.</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Flow lines */}
                    <div className="rounded-2xl border border-white/8 p-4" style={{ background: "rgba(5,3,15,0.6)" }}>
                      <div className="space-y-2">
                        {flowLines.map((line, i) => (
                          <p key={i} className="text-xs leading-relaxed text-[#a78bfa]/75">{line}</p>
                        ))}
                      </div>
                    </div>

                    {/* Generate button */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      onClick={handleGeneratePrompt}
                      disabled={drawnCards.length !== selectedSpread.cardCount || isGenerating || isPaying}
                      className="w-full py-4 rounded-2xl font-bold text-sm text-[#1a0533] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      style={{ background: "linear-gradient(90deg, #a855f7, #ec4899, #f59e0b)", boxShadow: "0 8px 30px rgba(168,85,247,0.3)" }}
                    >
                      {isGenerating || isPaying ? "✦ 오라클 문장 조율 중..." : "✦ 오라클 원고 만들기"}
                    </motion.button>

                    {feedback && <p className="text-rose-300/80 text-xs text-center">{feedback}</p>}
                  </div>
                </motion.div>
              )}

              {/* ━━━ PROMPT STAGE ━━━ */}
              {stage === "prompt" && promptResult && (
                <motion.div
                  key="prompt-stage"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="grid gap-5 lg:grid-cols-[360px_1fr] max-w-6xl mx-auto"
                >
                  {/* Left: summary */}
                  <div className="space-y-4">
                    <div
                      className="rounded-2xl border border-[#7c3aed]/30 p-5"
                      style={{ background: "linear-gradient(145deg, rgba(25,10,55,0.92), rgba(15,5,38,0.92))" }}
                    >
                      <div className="text-[10px] uppercase tracking-[0.22em] text-[#7c3aed]/60 mb-2">당신을 위한 타로 메시지</div>
                      <h2 className="text-xl font-bold text-[#e9d5ff] mb-2">{selectedSpread.title}</h2>
                      <p className="text-xs text-[#a78bfa]/75 leading-relaxed mb-2">{promptResult.effectiveQuestion}</p>
                      <p className="text-xs text-[#c4b5fd]/65 leading-relaxed">{promptResult.summary}</p>
                    </div>

                    {/* Card images strip */}
                    <div className="rounded-2xl border border-[#6d28d9]/20 p-4" style={{ background: "rgba(8,4,20,0.75)" }}>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[#7c3aed]/55 mb-3">선택된 카드</div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {drawnCards.slice(0, 5).map((card, i) => (
                          <div key={i} className="flex flex-col items-center gap-1">
                            <div className="w-14 h-20 rounded-lg overflow-hidden border border-[#7c3aed]/30 shadow-md">
                              <img src={card.image} alt={card.cardNameKo} className="w-full h-full object-cover" style={{ filter: card.orientation === "reversed" ? "brightness(0.75)" : undefined, transform: card.orientation === "reversed" ? "rotate(180deg)" : undefined }} />
                            </div>
                            <div className="text-[8px] text-[#c4b5fd] text-center w-14 leading-tight line-clamp-2">{card.cardNameKo}</div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-1.5">
                        {selectedSpread.positions.map((position, index) => {
                          const drawn = drawnCards[index];
                          if (!drawn) return null;
                          return (
                            <div key={`${selectedSpread.id}-result-${position.index}`} className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
                              <div className="text-[10px] text-[#c084fc]">{position.index}. {position.label}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-semibold text-[#f3e8ff]">{drawn.cardNameKo}</span>
                                <span className="text-[10px] text-[#f472b6]">{drawn.orientationLabel}</span>
                              </div>
                              <div className="text-[10px] text-white/45 mt-0.5 leading-relaxed">{drawn.positionDescription}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Spread summary */}
                    <div className="rounded-2xl border border-white/8 p-4" style={{ background: "rgba(5,3,15,0.6)" }}>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-[#7c3aed]/55 mb-2">카드가 만든 신탁 지도</div>
                      <div className="space-y-1.5">
                        {flowLines.map((line, i) => (
                          <p key={i} className="text-xs leading-relaxed text-[#a78bfa]/70">{line}</p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: prompt output */}
                  <div className="space-y-4">
                    <div
                      className="rounded-3xl border border-[#c084fc]/30 p-5 sm:p-6"
                      style={{
                        background: "linear-gradient(155deg, rgba(30,10,65,0.92), rgba(15,5,40,0.92))",
                        boxShadow: "0 0 60px rgba(192,132,252,0.1), inset 0 1px 0 rgba(255,255,255,0.06)",
                      }}
                    >
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.22em] text-[#7c3aed]/60">Oracle Prompt</div>
                          <div className="text-base font-bold text-[#e9d5ff] mt-0.5">지금 복사할 오라클 원고 ✦</div>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyPrompt}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#c084fc]/40 bg-[#c084fc]/10 text-[#e9d5ff] text-xs font-semibold hover:bg-[#c084fc]/20 transition-all"
                        >
                          {copied ? "✓ 복사 완료" : "📋 문장 복사"}
                        </button>
                      </div>

                      <div
                        className="rounded-2xl border border-[#6d28d9]/30 p-5"
                        style={{ background: "rgba(0,0,0,0.45)" }}
                      >
                        <div className="max-h-[55vh] overflow-auto whitespace-pre-wrap text-sm leading-8 text-[#f3e8ff]/85 custom-scrollbar" style={{ fontFamily: "var(--font-sans, sans-serif)" }}>
                          {promptResult.prompt}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={handleCopyPrompt} className="col-span-2 py-3 rounded-2xl font-bold text-sm text-[#1a0533] transition-all" style={{ background: "linear-gradient(90deg, #a855f7, #ec4899, #f59e0b)", boxShadow: "0 6px 25px rgba(168,85,247,0.25)" }}>
                        {copied ? "✓ 복사 완료" : "✦ 오라클 원고 복사"}
                      </button>
                      <button type="button" onClick={handleRegeneratePrompt} className="py-2.5 rounded-xl border border-white/12 bg-white/5 text-xs font-semibold text-[#c4b5fd] hover:bg-white/10 transition-all">
                        ↺ 같은 카드로 다시 엮기
                      </button>
                      <button type="button" onClick={handleRedrawCards} className="py-2.5 rounded-xl border border-white/12 bg-white/5 text-xs font-semibold text-[#c4b5fd] hover:bg-white/10 transition-all">
                        🃏 카드 다시 열기
                      </button>
                      <button type="button" onClick={handleChooseAnotherSpread} className="py-2.5 rounded-xl border border-[#7c3aed]/30 bg-[#7c3aed]/10 text-xs font-semibold text-[#c4b5fd] hover:bg-[#7c3aed]/20 transition-all">
                        다른 스프레드 선택
                      </button>
                      <button type="button" onClick={handleResetAll} className="py-2.5 rounded-xl border border-[#7c3aed]/30 bg-[#7c3aed]/10 text-xs font-semibold text-[#c4b5fd] hover:bg-[#7c3aed]/20 transition-all">
                        처음부터 다시 시작
                      </button>
                    </div>

                    {feedback && <p className="text-rose-300/80 text-xs text-center">{feedback}</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom padding */}
          <div className="h-8" />
        </div>
      </div>

      {/* ── Spread Picker Modal ── */}
      <AnimatePresence>
        {showSpreadPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center p-0 sm:p-4"
            style={{ background: "rgba(5,2,15,0.75)", backdropFilter: "blur(12px)" }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ duration: 0.28 }}
              className="w-full sm:max-w-5xl h-[88dvh] sm:h-[85vh] sm:max-h-[860px] flex flex-col rounded-t-3xl sm:rounded-3xl border border-[#6d28d9]/40 overflow-hidden"
              style={{ background: "linear-gradient(165deg, #0e0626 0%, #1a0a3a 100%)" }}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-[#7c3aed]/60">Spread Library</div>
                  <div className="text-lg font-bold text-[#e9d5ff] mt-0.5">✦ 다른 스프레드 보기</div>
                </div>
                <button type="button" onClick={() => setShowSpreadPicker(false)} className="px-3 py-1.5 rounded-full border border-white/14 bg-white/6 text-sm text-[#a78bfa] hover:bg-white/12 transition-all">닫기</button>
              </div>

              {/* Search and filters */}
              <div className="px-5 py-3 space-y-2 border-b border-white/5">
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="스프레드 검색"
                    className="rounded-xl border border-[#6d28d9]/35 bg-black/30 px-3 py-2 text-sm text-[#f3e8ff] outline-none placeholder:text-[#7c3aed]/40"
                  />
                  <div className="rounded-xl border border-[#6d28d9]/25 bg-black/20 px-3 py-2 text-xs text-[#a78bfa]/70">
                    추천 테마: {CATEGORY_LABEL[detectedCategory]}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_FILTER_OPTIONS.map((item) => (
                    <button
                      key={`spread-filter-${item.id}`}
                      type="button"
                      onClick={() => setCategoryFilter(item.id)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${categoryFilter === item.id ? "border-[#c084fc]/45 bg-[#c084fc]/15 text-[#e9d5ff]" : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10"}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CARD_COUNT_FILTERS.map((count) => (
                    <button
                      key={`spread-count-${String(count)}`}
                      type="button"
                      onClick={() => setCardCountFilter(count === "all" ? "all" : count)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${cardCountFilter === count ? "border-[#a855f7]/45 bg-[#a855f7]/15 text-[#e9d5ff]" : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10"}`}
                    >
                      {count === "all" ? "전체" : `${count}장`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Spread grid */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
                        className={`rounded-2xl border p-3.5 text-left transition-all ${active ? "border-[#c084fc]/45 shadow-[0_0_20px_rgba(192,132,252,0.1)]" : "border-white/10 hover:border-white/20"}`}
                        style={{
                          background: active
                            ? "linear-gradient(145deg, rgba(192,132,252,0.15), rgba(167,139,250,0.1))"
                            : "rgba(255,255,255,0.03)",
                        }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="text-[9px] uppercase tracking-[0.16em] text-[#7c3aed]/55">{CATEGORY_LABEL[spread.category]}</div>
                          {recommended && <span className="px-1.5 py-0.5 rounded-full border border-[#f59e0b]/35 bg-[#f59e0b]/10 text-[9px] text-[#fcd34d]">추천</span>}
                        </div>
                        <div className="text-sm font-bold text-[#e9d5ff]">{spread.title}</div>
                        <div className="text-xs text-[#a78bfa]/60 mt-0.5">{spread.cardCount}장 · {DIFFICULTY_LABEL[spread.difficulty]}</div>
                        <p className="mt-2 text-xs leading-relaxed text-white/55">{spread.purpose}</p>
                      </motion.button>
                    );
                  })}
                  {!filteredSpreads.length && (
                    <div className="col-span-full rounded-2xl border border-dashed border-white/15 bg-white/3 px-4 py-10 text-center text-sm text-white/45">
                      조건에 맞는 스프레드가 없습니다. 필터를 조정해 주세요.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.4); border-radius: 4px; }
      `}</style>
    </div>
  );
}
