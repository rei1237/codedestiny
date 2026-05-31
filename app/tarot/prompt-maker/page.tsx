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
        forceDeduct: true,
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

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#040716] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.18),transparent_34%),radial-gradient(circle_at_18%_22%,rgba(251,191,36,0.16),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(96,165,250,0.14),transparent_22%),linear-gradient(160deg,#02030c_0%,#081124_34%,#180a22_66%,#04050e_100%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:36px_36px]" />
      <div className="absolute left-[-8rem] top-20 h-72 w-72 rounded-full bg-rose-300/20 blur-3xl" />
      <div className="absolute right-[-6rem] top-32 h-72 w-72 rounded-full bg-sky-300/10 blur-3xl" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 pb-20 pt-6 sm:px-6 lg:px-10">
        <section className="grid gap-6 rounded-[32px] border border-white/10 bg-white/[0.05] px-5 py-6 shadow-[0_30px_120px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-8">
          <div className="space-y-5">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200/30 bg-amber-100/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-amber-100">
              Moonlit Tarot Library
            </div>
            <div className="space-y-3">
              <h1 className="max-w-4xl font-serif text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
                타로 프롬프트 라이브러리
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-white/74 sm:text-base">
                스프레드를 고르고, 카드 수만큼 직접 뽑고, 포지션 의미와 카드 방향을 합친 Oracle Prompt를 바로 완성합니다.
                마인드 스캔처럼 몰입형으로 설계했지만 결과는 프롬프트 생성에 집중했습니다.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <label className="block rounded-[28px] border border-white/10 bg-black/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Question</div>
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="예: 이 관계는 앞으로 진전될까? 또는 요즘 내 마음을 가장 흔드는 감정은 무엇일까?"
                  className="min-h-[112px] w-full resize-none bg-transparent text-sm leading-7 text-white outline-none placeholder:text-white/35"
                />
              </label>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={scrollToLibrary}
                  className="rounded-full border border-amber-200/30 bg-amber-200/15 px-5 py-3 text-sm font-semibold text-amber-50 transition hover:bg-amber-200/22"
                >
                  라이브러리 열기
                </button>
                <button
                  type="button"
                  onClick={() => setQuestion(DEFAULT_QUESTION_BY_CATEGORY[detectedCategory])}
                  className="rounded-full border border-white/15 bg-white/8 px-5 py-3 text-sm font-semibold text-white/86 transition hover:bg-white/14"
                >
                  질문 없이 기본 질문 적용
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUESTION_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setQuestion(chip.text)}
                  className="rounded-full border border-white/12 bg-white/7 px-3 py-2 text-left text-xs text-white/82 transition hover:border-amber-200/30 hover:bg-white/12"
                >
                  <span className="mr-2">{chip.icon}</span>
                  {chip.label}
                </button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                <div className="text-[11px] uppercase tracking-[0.25em] text-white/48">Detected Theme</div>
                <div className="mt-2 text-lg font-semibold text-white">{CATEGORY_LABEL[detectedCategory]}</div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                <div className="text-[11px] uppercase tracking-[0.25em] text-white/48">Spread Library</div>
                <div className="mt-2 text-lg font-semibold text-white">{SPREAD_LIBRARY.length} Spreads</div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                <div className="text-[11px] uppercase tracking-[0.25em] text-white/48">Billing</div>
                <div className="mt-2 text-lg font-semibold text-white">1회 50코인</div>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.35)]"
          >
            <div className="rounded-[28px] border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.25em] text-white/48">Featured Spread</div>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{selectedSpread.title}</h2>
                </div>
                <span className="rounded-full border border-amber-200/30 bg-amber-200/14 px-3 py-1 text-xs font-semibold text-amber-50">
                  {DIFFICULTY_LABEL[selectedSpread.difficulty]}
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-white/72">{selectedSpread.purpose}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedSpread.tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[11px] text-white/70">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-5 rounded-[24px] border border-white/10 bg-[#070c1a] p-4">
                <div className="relative mx-auto aspect-square w-full max-w-[360px] rounded-[28px] border border-dashed border-white/12 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_42%),linear-gradient(180deg,rgba(8,15,30,0.95),rgba(7,10,18,0.88))]">
                  {selectedSpread.positions.map((position) => (
                    <div
                      key={`${selectedSpread.id}-${position.index}`}
                      className="absolute h-[78px] w-[54px] -translate-x-1/2 -translate-y-1/2 rounded-[18px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04))] p-2 text-center shadow-[0_18px_40px_rgba(0,0,0,0.25)]"
                      style={{ left: `${position.x}%`, top: `${position.y}%`, transform: `translate(-50%, -50%) rotate(${position.rotate}deg)` }}
                    >
                      <div className="text-[10px] font-semibold text-amber-100">{position.index}</div>
                      <div className="mt-1 line-clamp-3 text-[10px] leading-4 text-white/72">{position.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-white/72">
                <div className="text-[11px] uppercase tracking-[0.25em] text-white/48">Reading Mood</div>
                <div className="mt-2">{selectedSpread.mood}</div>
                <div className="mt-3 text-white/58">{selectedSpread.ritual}</div>
              </div>
              <button
                type="button"
                onClick={() => beginDraw(selectedSpread.id)}
                className="mt-5 w-full rounded-full bg-[linear-gradient(90deg,#f59e0b,#fb7185,#60a5fa)] px-5 py-3 text-sm font-semibold text-slate-950 shadow-[0_16px_40px_rgba(244,114,182,0.28)] transition hover:scale-[1.01]"
              >
                이 스프레드로 카드 뽑기 시작
              </button>
            </div>
          </motion.div>
        </section>

        <section ref={libraryRef} id="spread-library" className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[32px] border border-white/10 bg-white/[0.05] p-4 backdrop-blur-xl sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.25em] text-white/48">Spread Library</div>
                <h2 className="mt-2 text-2xl font-semibold text-white">질문에 맞는 스프레드를 직접 선택하세요</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {["all", 3, 5, 7, 10, 12, 14].map((count) => (
                  <button
                    key={String(count)}
                    type="button"
                    onClick={() => setCardCountFilter(count === "all" ? "all" : count)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${cardCountFilter === count ? "border-amber-200/40 bg-amber-100/14 text-amber-50" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"}`}
                  >
                    {count === "all" ? "All" : `${count} Cards`}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 px-4 py-3">
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="스프레드 이름, 목적, 태그 검색"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/34"
              />
            </div>

            <div className="mt-5 grid gap-3 lg:max-h-[960px] lg:overflow-auto lg:pr-1">
              {filteredSpreads.map((spread) => {
                const active = spread.id === selectedSpread.id;
                const recommendedBadge = recommended.some((item) => item.id === spread.id);
                return (
                  <button
                    key={spread.id}
                    type="button"
                    onClick={() => selectSpread(spread.id)}
                    className={`group rounded-[28px] border p-4 text-left transition ${active ? "border-amber-200/40 bg-white/12 shadow-[0_24px_60px_rgba(0,0,0,0.24)]" : "border-white/10 bg-white/[0.04] hover:border-white/18 hover:bg-white/[0.08]"}`}
                  >
                    <div className={`rounded-[22px] bg-gradient-to-br p-4 ${difficultyTone(spread)}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.25em] text-white/46">{CATEGORY_LABEL[spread.category]}</div>
                          <h3 className="mt-2 text-lg font-semibold text-white">{spread.title}</h3>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {recommendedBadge && (
                            <span className="rounded-full border border-sky-200/30 bg-sky-200/14 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-100">
                              For You
                            </span>
                          )}
                          <span className="rounded-full border border-white/12 bg-black/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/72">
                            {DIFFICULTY_LABEL[spread.difficulty]}
                          </span>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-7 text-white/76">{spread.purpose}</p>
                      <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/68">
                        <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1">{spread.cardCount} cards</span>
                        {spread.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.aside
              key={selectedSpread.id}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="rounded-[32px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl"
            >
              <div className="sticky top-4 space-y-5">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.25em] text-white/48">Selected Spread</div>
                  <h2 className="mt-2 text-3xl font-semibold text-white">{selectedSpread.title}</h2>
                  <p className="mt-3 text-sm leading-7 text-white/72">{selectedSpread.purpose}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/70">
                  <div className="text-[11px] uppercase tracking-[0.25em] text-white/48">Recommended Question</div>
                  <div className="mt-2">{effectiveQuestion}</div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {selectedSpread.interpretationGuide.map((item) => (
                    <div key={item} className="rounded-[20px] border border-white/10 bg-white/[0.04] p-3 text-sm leading-6 text-white/68">
                      {item}
                    </div>
                  ))}
                </div>
                <div className="rounded-[24px] border border-white/10 bg-[#070c1a] p-4">
                  <div className="text-[11px] uppercase tracking-[0.25em] text-white/48">Position Flow</div>
                  <div className="mt-3 grid gap-2">
                    {selectedSpread.positions.map((position) => (
                      <div key={`${selectedSpread.id}-${position.index}`} className="flex items-start gap-3 rounded-[18px] border border-white/8 bg-white/[0.04] px-3 py-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-200/20 bg-amber-200/10 text-xs font-semibold text-amber-50">
                          {position.index}
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-white">{position.label}</div>
                          <div className="text-xs leading-5 text-white/58">{position.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.aside>
          </AnimatePresence>
        </section>

        <AnimatePresence>
          {stage !== "library" && (
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="mt-8 rounded-[36px] border border-white/10 bg-white/[0.05] p-5 backdrop-blur-xl sm:p-6"
            >
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
                    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
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

                    <div className="rounded-[24px] border border-white/10 bg-[#070c1a] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-[11px] uppercase tracking-[0.25em] text-white/48">Spread Board</div>
                          <div className="mt-2 text-sm text-white/70">{drawnCards.length} / {selectedSpread.cardCount} cards selected</div>
                        </div>
                        <div className="rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1 text-xs font-semibold text-amber-50">
                          {selectedSpread.cardCount} Cards
                        </div>
                      </div>
                      <div className="relative mt-4 aspect-square rounded-[28px] border border-dashed border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_44%),linear-gradient(180deg,rgba(10,15,28,0.96),rgba(7,9,18,0.9))]">
                        {selectedSpread.positions.map((position) => {
                          const drawn = drawnCards.find((card) => card.slotIndex === position.index);
                          return (
                            <div
                              key={`${selectedSpread.id}-${position.index}`}
                              className="absolute h-[96px] w-[68px] -translate-x-1/2 -translate-y-1/2 rounded-[20px] border border-white/12 bg-white/[0.04] p-2 text-center shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
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

                    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-white/70">
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
                    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
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
                              className={`group aspect-[0.72] rounded-[16px] border text-[10px] font-semibold transition ${disabled ? "border-white/6 bg-black/20 text-white/24" : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.03))] text-amber-50 hover:-translate-y-1 hover:border-amber-200/30 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.08))]"}`}
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

                    <div className="rounded-[24px] border border-white/10 bg-[#070c1a] p-4">
                      <div className="text-[11px] uppercase tracking-[0.25em] text-white/48">Selected Cards</div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {selectedSpread.positions.map((position, index) => {
                          const drawn = drawnCards[index];
                          return (
                            <div key={`${selectedSpread.id}-selected-${position.index}`} className="rounded-[20px] border border-white/10 bg-white/[0.04] p-3">
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

                    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                      <div className="text-[11px] uppercase tracking-[0.25em] text-white/48">Effective Question</div>
                      <div className="mt-2 text-sm leading-7 text-white/78">{promptResult.effectiveQuestion}</div>
                    </div>

                    <div className="rounded-[24px] border border-white/10 bg-[#070c1a] p-4">
                      <div className="text-[11px] uppercase tracking-[0.25em] text-white/48">Card Digest</div>
                      <div className="mt-4 grid gap-3">
                        {promptResult.cardDigest.map((line) => (
                          <div key={line} className="rounded-[18px] border border-white/8 bg-white/[0.04] px-3 py-2.5 text-sm leading-7 text-white/70">
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {promptResult.guidance.map((item) => (
                        <div key={item} className="rounded-[20px] border border-white/10 bg-white/[0.04] p-3 text-sm leading-7 text-white/68">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-4">
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
                      <div className="mt-4 rounded-[24px] border border-white/10 bg-[#050912] p-3">
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

                    <div className="mt-4 rounded-[22px] border border-white/10 bg-white/[0.04] p-4 text-sm leading-7 text-white/64">
                      AI 상담 API 연결은 다음 단계에서 붙일 예정입니다. 지금은 카드 선택 결과를 바탕으로 고품질 Oracle Prompt를 복사해 바로 사용할 수 있습니다.
                    </div>
                  </div>
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}