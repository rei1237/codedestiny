"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import Image from "next/image";
import { BookOpen, CheckCircle2, Flower2, Leaf, Moon, Search, Sparkles, Sprout, X } from "lucide-react";
import type { FortuneTeaHouseHoneyDropsState } from "../data/consult";
import { fortuneTeaHouseAssets } from "../data/assets";
import { tarotDeckCards, type TeaHouseTarotCard } from "../data/tarotCards";
import { normalizeHoneyDropsState } from "../lib/honeyDrops";
import { getTarotCardImageCoverage, resolveTarotCardImage } from "../lib/tarotCardImageMap";

const TAROT_ALBUM_UNLOCK_COST = 10;
const DEFAULT_ALBUM_LINE = "달빛 아래서 천천히 넘겨 보면, 이 카드가 품은 작은 신호가 마음 안쪽에 조용히 닿을 거예요.";

type TarotAlbumFilter = "all" | "major" | "wands" | "cups" | "swords" | "pentacles";

type TarotAlbumApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  errorCode?: string;
  honeyDrops?: FortuneTeaHouseHoneyDropsState;
};

type TarotAlbumCard = {
  id: string;
  number: number;
  nameKo: string;
  nameEn: string;
  arcana: "major" | "minor";
  suit: TarotAlbumFilter;
  suitLabel: string;
  imageUrl: string;
  imageObjectKey?: string;
  keywords: string[];
  shortMeaning: string;
  reversedMeaning: string;
  yeoniLine: string;
};

type DestinyCafeTarotAlbumProps = {
  isOpen: boolean;
  honeyDrops: FortuneTeaHouseHoneyDropsState | null;
  onClose: () => void;
  onHoneyDropsChange: (nextHoneyDrops: FortuneTeaHouseHoneyDropsState) => void;
};

const tarotAlbumTabs: Array<{ id: TarotAlbumFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "major", label: "메이저" },
  { id: "wands", label: "완드" },
  { id: "cups", label: "컵" },
  { id: "swords", label: "소드" },
  { id: "pentacles", label: "펜타클" },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getCardSuit(card: TeaHouseTarotCard): TarotAlbumFilter {
  if (card.id.startsWith("major_")) return "major";
  if (card.id.includes("_wands_")) return "wands";
  if (card.id.includes("_cups_")) return "cups";
  if (card.id.includes("_swords_")) return "swords";
  if (card.id.includes("_pentacles_")) return "pentacles";
  return "major";
}

function getSuitLabel(suit: TarotAlbumFilter) {
  if (suit === "major") return "메이저 아르카나";
  if (suit === "wands") return "완드";
  if (suit === "cups") return "컵";
  if (suit === "swords") return "소드";
  if (suit === "pentacles") return "펜타클";
  return "전체";
}

function buildYeoniLine(card: TeaHouseTarotCard) {
  const firstKeyword = card.upright.keywords[0] || "달빛";
  const secondKeyword = card.upright.keywords[1] || "마음의 신호";
  if (card.nameEn === "The Moon") {
    return "밤길이 무서워도 괜찮아요. 달빛은 아주 작아 보여도, 길을 완전히 잃지 않게 해주거든요.";
  }
  return `${card.nameKo}은 ${firstKeyword}과 ${secondKeyword}의 빛을 조용히 펼쳐요. 마음이 흔들릴 때 이 카드 앞에서 잠시 숨을 골라 봐요.`;
}

function buildTarotAlbumCards(): TarotAlbumCard[] {
  return tarotDeckCards.map((card) => {
    const suit = getCardSuit(card);
    const image = resolveTarotCardImage({
      cardId: card.id,
      nameKo: card.nameKo,
      nameEn: card.nameEn,
      number: card.number,
      arcana: suit === "major" ? "major" : "minor",
      suit,
    });

    return {
      id: card.id,
      number: card.number,
      nameKo: card.nameKo,
      nameEn: card.nameEn,
      arcana: suit === "major" ? "major" : "minor",
      suit,
      suitLabel: getSuitLabel(suit),
      imageUrl: image?.url || "",
      imageObjectKey: image?.objectKey,
      keywords: Array.from(new Set([...card.upright.keywords, ...card.topicHints].filter(Boolean))).slice(0, 5),
      shortMeaning: card.upright.meaning,
      reversedMeaning: card.reversed.meaning,
      yeoniLine: buildYeoniLine(card) || DEFAULT_ALBUM_LINE,
    };
  });
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

export default function DestinyCafeTarotAlbum({
  isOpen,
  honeyDrops,
  onClose,
  onHoneyDropsChange,
}: DestinyCafeTarotAlbumProps) {
  const [activeFilter, setActiveFilter] = useState<TarotAlbumFilter>("all");
  const [searchText, setSearchText] = useState("");
  const [selectedCard, setSelectedCard] = useState<TarotAlbumCard | null>(null);
  const [imageFailedById, setImageFailedById] = useState<Record<string, boolean>>({});
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockMessage, setUnlockMessage] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const albumCards = useMemo(() => buildTarotAlbumCards(), []);
  const currentHoneyDrops = Math.max(0, honeyDrops?.currentHoneyDrops ?? honeyDrops?.balance ?? 0);
  const isHoneyLoading = !honeyDrops;
  const isHoneyDisabled = Boolean(honeyDrops?.disabled);
  const isAlbumUnlocked = Boolean(honeyDrops?.tarotAlbumUnlocked);
  const canUnlock = !isHoneyLoading && !isHoneyDisabled && !isAlbumUnlocked && currentHoneyDrops >= TAROT_ALBUM_UNLOCK_COST;
  const cardBackUrl = fortuneTeaHouseAssets.yeoni.transparent.tarotCard;
  const honeyDropUrl = fortuneTeaHouseAssets.rewards.honeyDropCounter;
  const lockDialogue = isHoneyDisabled
    ? "잠시 후 다시 확인해주세요."
    : isAlbumUnlocked
      ? "이제 이 카드첩은 손님 곁에 열려 있어요. 마음이 흔들릴 때마다 달빛 아래서 천천히 넘겨보세요."
      : canUnlock
        ? "와… 꿀방울이 10개나 모였네요? 그럼 제가 아껴둔 달빛 타로 앨범을 살짝 열어드릴게요."
        : "히히… 거의 다 모였어요. 달빛이 조금만 더 차오르면 카드첩이 열릴 거예요.";
  const filteredCards = useMemo(() => {
    const query = normalizeSearch(searchText);
    return albumCards.filter((card) => {
      const matchesFilter = activeFilter === "all" || card.suit === activeFilter;
      if (!matchesFilter) return false;
      if (!query) return true;
      const haystack = normalizeSearch([
        card.nameKo,
        card.nameEn,
        card.suitLabel,
        ...card.keywords,
      ].join(" "));
      return haystack.includes(query);
    });
  }, [activeFilter, albumCards, searchText]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => closeButtonRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (selectedCard) {
        setSelectedCard(null);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, selectedCard]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const coverage = getTarotCardImageCoverage();
    if (coverage.missingFiles.length || coverage.unusedFiles.length || coverage.mappedCards !== coverage.expectedCards) {
      console.warn("[FortuneTeaHouse] Tarot album image coverage", coverage);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setSelectedCard(null);
      setUnlockMessage("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  const handleImageError = (card: TarotAlbumCard) => {
    setImageFailedById((current) => ({ ...current, [card.id]: true }));
    console.warn("[FortuneTeaHouse] Tarot album image failed", {
      cardId: card.id,
      nameKo: card.nameKo,
      objectKey: card.imageObjectKey,
      url: card.imageUrl,
    });
  };

  const handleUnlock = async () => {
    if (isAlbumUnlocked) return;
    if (isHoneyLoading || isHoneyDisabled) {
      setUnlockMessage("잠시 후 다시 확인해주세요.");
      return;
    }
    if (currentHoneyDrops < TAROT_ALBUM_UNLOCK_COST) {
      setUnlockMessage("운명의 찻집에서 상담을 보면 꿀방울을 모을 수 있어요.");
      return;
    }

    setIsUnlocking(true);
    setUnlockMessage("");
    try {
      const response = await fetch("/api/fortune-tea-house/honey-drops/tarot-album/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: `yeoni-tarot-album-${Date.now()}` }),
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as TarotAlbumApiResponse | null;
      const nextHoneyDrops = normalizeHoneyDropsState(payload?.honeyDrops);
      if (nextHoneyDrops) onHoneyDropsChange(nextHoneyDrops);
      if (!response.ok || !payload?.success) {
        setUnlockMessage(payload?.message || "잠시 후 다시 확인해주세요.");
        return;
      }
      setUnlockMessage("카드가 깨어났어요. 이제 달빛 아래서 천천히 넘겨보세요.");
    } catch {
      setUnlockMessage("잠시 후 다시 확인해주세요.");
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] min-h-screen overflow-y-auto bg-[radial-gradient(circle_at_top,#2A174A_0%,#0B1020_42%,#050611_100%)] text-[#F8F1DC] animate-fade-in-up"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tarotAlbumTitle"
      onMouseDown={handleBackdropMouseDown}
    >
      <span className="pointer-events-none fixed left-1/2 top-[-7rem] h-80 w-80 -translate-x-1/2 rounded-full bg-[#F5EFFF]/20 blur-3xl" aria-hidden />
      <span className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(232,213,245,.58)_0_1px,transparent_2px),radial-gradient(circle_at_78%_24%,rgba(201,168,232,.42)_0_1px,transparent_2px),radial-gradient(circle_at_34%_72%,rgba(232,184,92,.36)_0_1px,transparent_2px),radial-gradient(circle_at_88%_78%,rgba(245,239,255,.28)_0_1px,transparent_2px)] opacity-60" aria-hidden />
      <span className="pointer-events-none fixed inset-x-0 bottom-0 h-56 bg-[radial-gradient(ellipse_at_bottom,rgba(0,0,0,.72),transparent_70%)]" aria-hidden />

      <button
        ref={closeButtonRef}
        type="button"
        className="fixed right-4 top-4 z-[75] grid h-11 w-11 place-items-center rounded-full border border-amber-200/25 bg-white/[0.07] text-amber-50 shadow-[0_16px_40px_rgba(0,0,0,.35)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-amber-200/50 hover:bg-white/[0.11] focus:outline-none focus:ring-2 focus:ring-amber-200/50 sm:right-6 sm:top-6"
        onClick={onClose}
        aria-label="달빛 타로 앨범 닫기"
      >
        <X size={18} aria-hidden />
      </button>

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-16 sm:px-6 lg:px-8">
        {isAlbumUnlocked ? (
          <div className="flex flex-1 flex-col gap-5">
            <TarotAlbumHero currentHoneyDrops={currentHoneyDrops} totalCards={albumCards.length} cardBackUrl={cardBackUrl} />
            <div className="sticky top-0 z-20 -mx-4 border-y border-white/10 bg-[#070817]/78 px-4 py-3 backdrop-blur-2xl sm:top-3 sm:mx-0 sm:rounded-3xl sm:border sm:bg-white/[0.055]">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] lg:items-center">
                <TarotAlbumFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />
                <TarotAlbumSearch searchText={searchText} onSearchTextChange={setSearchText} />
              </div>
            </div>
            <TarotAlbumGrid
              cards={filteredCards}
              imageFailedById={imageFailedById}
              cardBackUrl={cardBackUrl}
              onImageError={handleImageError}
              onSelectCard={setSelectedCard}
            />
            {!filteredCards.length ? (
              <p className="rounded-2xl border border-violet-200/15 bg-white/[0.045] px-4 py-5 text-center text-sm leading-relaxed text-violet-100/80">
                달빛 아래에서 아직 맞는 카드를 찾지 못했어요. 이름이나 키워드를 조금 다르게 불러보세요.
              </p>
            ) : null}
          </div>
        ) : (
          <TarotAlbumLockPanel
            currentHoneyDrops={currentHoneyDrops}
            isHoneyLoading={isHoneyLoading}
            canUnlock={canUnlock}
            isUnlocking={isUnlocking}
            unlockMessage={unlockMessage}
            lockDialogue={lockDialogue}
            honeyDropUrl={honeyDropUrl}
            cardBackUrl={cardBackUrl}
            onUnlock={handleUnlock}
          />
        )}
      </section>

      {selectedCard ? (
        <TarotCardModal
          card={selectedCard}
          imageFailed={Boolean(imageFailedById[selectedCard.id])}
          cardBackUrl={cardBackUrl}
          onClose={() => setSelectedCard(null)}
          onImageError={handleImageError}
        />
      ) : null}
    </div>
  );
}

function TarotAlbumHero({
  currentHoneyDrops,
  totalCards,
  cardBackUrl,
}: {
  currentHoneyDrops: number;
  totalCards: number;
  cardBackUrl: string;
}) {
  return (
    <header className="relative overflow-hidden rounded-[2rem] border border-amber-200/20 bg-white/[0.06] px-6 py-8 shadow-[0_0_60px_rgba(215,181,109,0.12)] backdrop-blur-xl md:px-10 md:py-12">
      <span className="pointer-events-none absolute left-10 top-6 h-28 w-28 rounded-full bg-amber-100/10 blur-2xl" aria-hidden />
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(221,214,254,.17),transparent_34%),linear-gradient(120deg,rgba(255,255,255,.08),transparent_45%)]" aria-hidden />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(220px,320px)] lg:items-center">
        <div className="max-w-3xl">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200/25 bg-amber-100/10 px-4 py-2 text-[0.72rem] font-black uppercase tracking-[0.18em] text-amber-100">
            <Sparkles size={14} aria-hidden />
            MOONLIT TAROT ARCHIVE
          </span>
          <h2 id="tarotAlbumTitle" className="bg-gradient-to-r from-[#F7E7B0] via-[#DDD6FE] to-[#D7B56D] bg-clip-text font-premium text-4xl font-black leading-tight text-transparent sm:text-5xl lg:text-6xl">
            달빛 타로 앨범
          </h2>
          <p className="mt-4 text-lg font-semibold leading-relaxed text-[#F8F1DC] sm:text-xl">
            78장의 카드가 달빛 아래 조용히 펼쳐집니다.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-violet-100/78 sm:text-base">
            연이가 운명의 찻집 깊은 서랍에 아껴두었던 카드첩이에요. 마음이 흔들릴 때마다 천천히 넘겨보세요.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <TarotAlbumUnlockBadge />
            <span className="inline-flex min-h-10 items-center rounded-full border border-violet-200/15 bg-white/[0.055] px-4 text-sm font-bold text-violet-100/78">
              보유 꿀방울 {currentHoneyDrops}개
            </span>
            <span className="inline-flex min-h-10 items-center rounded-full border border-violet-200/15 bg-white/[0.055] px-4 text-sm font-bold text-violet-100/78">
              {totalCards}장의 운명 조각
            </span>
          </div>
        </div>
        <div className="relative mx-auto hidden w-full max-w-[250px] lg:block" aria-hidden>
          <MoonlitCardPlaceholder title="연이의 비밀 카드첩" cardBackUrl={cardBackUrl} large />
          <span className="absolute -right-6 top-8 h-28 w-20 rotate-6 rounded-2xl border border-amber-200/15 bg-white/[0.045] shadow-[0_0_26px_rgba(221,214,254,.14)]" />
          <span className="absolute -left-5 bottom-12 h-24 w-16 -rotate-6 rounded-2xl border border-violet-200/15 bg-white/[0.04]" />
        </div>
      </div>
    </header>
  );
}

function TarotAlbumUnlockBadge() {
  return (
    <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-amber-200/30 bg-amber-200/10 px-4 text-sm font-extrabold text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.12)]">
      <CheckCircle2 size={16} aria-hidden />
      앨범 해금 완료
    </span>
  );
}

function TarotAlbumFilters({
  activeFilter,
  onFilterChange,
}: {
  activeFilter: TarotAlbumFilter;
  onFilterChange: (filter: TarotAlbumFilter) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]" role="tablist" aria-label="타로 카드 분류">
      {tarotAlbumTabs.map((tab) => {
        const active = activeFilter === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={cx(
              "min-h-11 flex-none rounded-full border px-4 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-amber-200/45",
              active
                ? "border-amber-200/45 bg-gradient-to-r from-amber-100/24 via-violet-300/18 to-amber-200/18 text-amber-50 shadow-[0_0_24px_rgba(215,181,109,.16)]"
                : "border-white/10 bg-white/[0.055] text-violet-100/78 hover:border-amber-200/28 hover:bg-white/[0.08] hover:text-amber-50",
            )}
            onClick={() => onFilterChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function TarotAlbumSearch({
  searchText,
  onSearchTextChange,
}: {
  searchText: string;
  onSearchTextChange: (value: string) => void;
}) {
  return (
    <label className="grid min-h-12 grid-cols-[20px_minmax(0,1fr)] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.07] px-4 text-violet-100/75 shadow-[inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-md focus-within:border-amber-200/35 focus-within:ring-2 focus-within:ring-amber-200/30">
      <Search size={17} aria-hidden />
      <span className="sr-only">타로 카드 검색</span>
      <input
        type="search"
        value={searchText}
        placeholder="카드 이름이나 키워드를 검색해보세요"
        className="w-full min-w-0 bg-transparent text-sm font-semibold text-amber-50 outline-none placeholder:text-violet-200/50"
        onChange={(event) => onSearchTextChange(event.target.value)}
      />
    </label>
  );
}

function TarotAlbumGrid({
  cards,
  imageFailedById,
  cardBackUrl,
  onImageError,
  onSelectCard,
}: {
  cards: TarotAlbumCard[];
  imageFailedById: Record<string, boolean>;
  cardBackUrl: string;
  onImageError: (card: TarotAlbumCard) => void;
  onSelectCard: (card: TarotAlbumCard) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" aria-live="polite">
      {cards.map((card) => (
        <TarotAlbumCardButton
          key={card.id}
          card={card}
          imageFailed={Boolean(imageFailedById[card.id])}
          cardBackUrl={cardBackUrl}
          onImageError={onImageError}
          onSelectCard={onSelectCard}
        />
      ))}
    </div>
  );
}

function TarotAlbumCardButton({
  card,
  imageFailed,
  cardBackUrl,
  onImageError,
  onSelectCard,
}: {
  card: TarotAlbumCard;
  imageFailed: boolean;
  cardBackUrl: string;
  onImageError: (card: TarotAlbumCard) => void;
  onSelectCard: (card: TarotAlbumCard) => void;
}) {
  return (
    <button
      type="button"
      className="group relative overflow-hidden rounded-2xl border border-amber-200/15 bg-white/[0.05] p-2 text-left shadow-[0_18px_44px_rgba(0,0,0,.24)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-amber-200/40 hover:shadow-[0_0_36px_rgba(215,181,109,0.22)] focus:outline-none focus:ring-2 focus:ring-amber-200/45"
      onClick={() => onSelectCard(card)}
      aria-label={`${card.nameKo} ${card.nameEn} 카드 자세히 보기`}
    >
      <span className="relative block aspect-[2/3] overflow-hidden rounded-xl border border-amber-200/18 bg-[#151026]">
        {card.imageUrl && !imageFailed ? (
          <Image
            src={card.imageUrl}
            alt={`${card.nameKo} ${card.nameEn} 타로 카드`}
            className="object-cover"
            fill
            sizes="(max-width: 640px) 48vw, (max-width: 1280px) 25vw, 180px"
            unoptimized
            loading="lazy"
            onError={() => onImageError(card)}
          />
        ) : (
          <MoonlitCardPlaceholder title={card.nameKo} cardBackUrl={cardBackUrl} />
        )}
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100" />
      </span>
      <span className="mt-3 grid gap-1 px-1 pb-1">
        <strong className="truncate font-premium text-sm font-black leading-tight text-[#FFF8DF] sm:text-[0.96rem]">{card.nameKo}</strong>
        <em className="truncate text-[0.72rem] font-semibold not-italic text-violet-200/76">{card.nameEn}</em>
        <span className="mt-1 inline-flex w-fit rounded-full border border-amber-200/18 bg-amber-100/8 px-2 py-1 text-[0.68rem] font-extrabold text-amber-100/78">
          {card.suitLabel}
        </span>
      </span>
    </button>
  );
}

function TarotAlbumLockPanel({
  currentHoneyDrops,
  isHoneyLoading,
  canUnlock,
  isUnlocking,
  unlockMessage,
  lockDialogue,
  honeyDropUrl,
  cardBackUrl,
  onUnlock,
}: {
  currentHoneyDrops: number;
  isHoneyLoading: boolean;
  canUnlock: boolean;
  isUnlocking: boolean;
  unlockMessage: string;
  lockDialogue: string;
  honeyDropUrl: string;
  cardBackUrl: string;
  onUnlock: () => void;
}) {
  const honeyCountText = isHoneyLoading ? "확인 중" : `${currentHoneyDrops}개`;

  return (
    <div className="grid flex-1 place-items-center py-6">
      <TarotAlbumGardenMotionStyles />
      <div className="relative w-full max-w-4xl overflow-hidden rounded-[2rem] border border-[#C9A8E8]/24 bg-[#1B1530]/90 px-5 py-8 text-center shadow-[0_0_80px_rgba(201,168,232,0.2)] backdrop-blur-2xl sm:px-8 sm:py-10">
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-8%,rgba(245,239,255,.22),transparent_34%),radial-gradient(circle_at_16%_82%,rgba(201,168,232,.18),transparent_38%),linear-gradient(145deg,#1B1530_0%,#2A1F4D_58%,#3D2B5C_100%)]" aria-hidden />
        <span className="pointer-events-none absolute -right-10 top-8 h-40 w-40 rounded-full bg-[#F5EFFF]/16 blur-3xl" aria-hidden />
        <span className="pointer-events-none absolute left-6 top-10 h-24 w-20 rotate-[-18deg] rounded-[45%] border border-[#C9A8E8]/10 bg-[#C9A8E8]/5 blur-[1px]" aria-hidden />
        <span className="pointer-events-none absolute bottom-12 right-10 h-28 w-24 rotate-12 rounded-[45%] border border-[#E8D5F5]/10 bg-[#9B7BC4]/8 blur-[1px]" aria-hidden />
        <span className="pointer-events-none absolute left-[12%] top-[18%] h-2 w-2 rounded-full bg-[#E8D5F5]/70 shadow-[0_0_14px_rgba(232,213,245,.42)]" style={{ animation: "tarotTwinkleFloat 6.5s ease-in-out infinite" }} aria-hidden />
        <span className="pointer-events-none absolute right-[18%] top-[28%] h-1.5 w-1.5 rounded-full bg-[#E8B85C]/70 shadow-[0_0_12px_rgba(232,184,92,.34)]" style={{ animation: "tarotTwinkleFloat 7.5s ease-in-out infinite 800ms" }} aria-hidden />
        <span className="pointer-events-none absolute bottom-[26%] left-[20%] h-3 w-1.5 rotate-45 rounded-full bg-[#C9A8E8]/34" style={{ animation: "tarotPetalFloat 9s ease-in-out infinite" }} aria-hidden />
        <span className="pointer-events-none absolute bottom-[20%] right-[16%] h-3 w-1.5 rotate-[28deg] rounded-full bg-[#E8D5F5]/28" style={{ animation: "tarotPetalFloat 10s ease-in-out infinite 1.2s" }} aria-hidden />
        <div className="relative mx-auto mb-6 w-40 sm:w-48" aria-hidden>
          <span className="absolute -right-14 -top-8 h-28 w-28 rounded-full bg-[#F5EFFF]/22 blur-2xl" style={{ animation: "tarotMoonGlow 6.4s ease-in-out infinite" }} />
          <span className="absolute -right-5 -top-2 h-20 w-20 rounded-full bg-[#F5EFFF]/80 shadow-[0_0_34px_rgba(245,239,255,.32)]">
            <span className="absolute -right-2 top-0 h-20 w-20 rounded-full bg-[#2A1F4D]" />
          </span>
          <MoonlitCardPlaceholder title="달빛 봉인" cardBackUrl={cardBackUrl} large gardenSeal />
          <BloomSeal canBloom={canUnlock} />
        </div>
        <div className="relative">
          <p className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-[#C9A8E8]/38 bg-[#C9A8E8]/10 px-4 py-2 text-[0.72rem] font-black uppercase tracking-[0.16em] text-[#F7E7B0] shadow-[0_0_24px_rgba(201,168,232,.18)]">
            <Sparkles size={13} aria-hidden />
            MOONLIT TAROT ARCHIVE
          </p>
          <h2 id="tarotAlbumTitle" className="bg-gradient-to-r from-[#C9A8E8] via-[#F5EFFF] to-[#E8B85C] bg-clip-text font-premium text-4xl font-black leading-tight text-transparent sm:text-5xl">
            달빛 봉인이 걸린 카드첩
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#B8A8D4] sm:text-base">
            꿀방울 10개를 모으면 연이가 아껴둔 타로 카드 앨범을 열어드려요.
          </p>
          <div className="mx-auto mt-6 grid max-w-lg grid-cols-2 gap-3">
            <div className="relative overflow-hidden rounded-2xl border border-[#C9A8E8]/24 bg-[#F5EFFF]/[0.055] px-4 py-3 shadow-[inset_0_1px_0_rgba(245,239,255,.1)]">
              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(232,213,245,.18)_0_1px,transparent_2px),radial-gradient(circle_at_82%_72%,rgba(201,168,232,.14)_0_1px,transparent_2px)]" aria-hidden />
              <span className="relative mx-auto mb-1 block h-5 w-5 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${honeyDropUrl}")` }} aria-hidden />
              <span className="relative block text-xs font-extrabold text-[#B8A8D4]">현재 꿀방울</span>
              <strong className="relative mt-1 block font-premium text-2xl text-[#E8B85C]">{honeyCountText}</strong>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-[#C9A8E8]/24 bg-[#F5EFFF]/[0.055] px-4 py-3 shadow-[inset_0_1px_0_rgba(245,239,255,.1)]">
              <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_78%,rgba(232,213,245,.18)_0_1px,transparent_2px),radial-gradient(circle_at_84%_24%,rgba(232,184,92,.16)_0_1px,transparent_2px)]" aria-hidden />
              <Flower2 className="relative mx-auto mb-1 text-[#C9A8E8]" size={20} strokeWidth={1.7} aria-hidden />
              <span className="relative block text-xs font-extrabold text-[#B8A8D4]">해금 필요</span>
              <strong className="relative mt-1 block font-premium text-2xl text-[#E8B85C]">{TAROT_ALBUM_UNLOCK_COST}개</strong>
            </div>
          </div>
          <HoneyDropProgress current={currentHoneyDrops} total={TAROT_ALBUM_UNLOCK_COST} />
          <button
            type="button"
            className={cx(
              "mt-6 inline-flex min-h-12 w-full max-w-sm items-center justify-center gap-2 rounded-full border px-5 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-[#E8D5F5]/55",
              canUnlock && !isUnlocking
                ? "border-[#E8B85C]/60 bg-gradient-to-r from-[#E8B85C] via-[#F5EFFF] to-[#C9A8E8] text-[#1B1530] shadow-[0_18px_44px_rgba(232,184,92,.24)] hover:-translate-y-0.5 hover:shadow-[0_0_42px_rgba(232,184,92,.3)]"
                : "cursor-not-allowed border-[#C9A8E8]/28 bg-[#F5EFFF]/[0.07] text-[#B8A8D4] shadow-[0_0_28px_rgba(201,168,232,.1)]",
            )}
            disabled={!canUnlock || isUnlocking}
            onClick={onUnlock}
          >
            <BookOpen size={18} aria-hidden />
            {isUnlocking ? "달빛 앨범을 여는 중" : canUnlock ? "꿀방울 10개로 앨범 열기" : "꿀방울이 조금 더 필요해요"}
          </button>
          <div className="mx-auto mt-5 grid max-w-2xl grid-cols-[34px_minmax(0,1fr)] gap-3 rounded-2xl border border-[#C9A8E8]/20 bg-[#16112A]/72 px-4 py-3 text-left text-sm leading-relaxed text-[#F5F0FF] shadow-[0_18px_44px_rgba(5,2,14,.18)]">
            <span className="relative mt-0.5 grid h-8 w-8 place-items-center rounded-full border border-[#E8B85C]/24 bg-[#E8B85C]/10 text-[#F7E7B0]">
              <Sparkles size={15} aria-hidden />
              <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-[#E8D5F5] shadow-[0_0_8px_rgba(232,213,245,.5)]" aria-hidden />
              <span className="absolute -bottom-1 left-0 h-1 w-1 rounded-full bg-[#E8B85C] shadow-[0_0_7px_rgba(232,184,92,.42)]" aria-hidden />
            </span>
            <p>“{unlockMessage || lockDialogue}”</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TarotAlbumGardenMotionStyles() {
  return (
    <style>{`
      @keyframes tarotMoonGlow {
        0%, 100% { opacity: .55; transform: scale(.96); }
        50% { opacity: 1; transform: scale(1.04); }
      }
      @keyframes tarotPetalFloat {
        0%, 100% { opacity: .24; transform: translate3d(0, 0, 0) rotate(28deg); }
        50% { opacity: .62; transform: translate3d(12px, -18px, 0) rotate(52deg); }
      }
      @keyframes tarotTwinkleFloat {
        0%, 100% { opacity: .36; transform: translateY(0) scale(.88); }
        50% { opacity: .92; transform: translateY(-8px) scale(1.08); }
      }
      @keyframes tarotLavenderBloom {
        0% { opacity: .45; transform: scale(.62) rotate(-10deg); }
        70% { opacity: 1; transform: scale(1.14) rotate(4deg); }
        100% { opacity: 1; transform: scale(1) rotate(0deg); }
      }
      @media (prefers-reduced-motion: reduce) {
        [style*="tarotMoonGlow"],
        [style*="tarotPetalFloat"],
        [style*="tarotTwinkleFloat"],
        [style*="tarotLavenderBloom"] {
          animation-duration: 1ms !important;
          animation-iteration-count: 1 !important;
        }
      }
    `}</style>
  );
}

function BloomSeal({ canBloom }: { canBloom: boolean }) {
  return (
    <span
      className={cx(
        "absolute -right-4 -top-4 grid h-16 w-16 place-items-center rounded-full border bg-[#151026]/92 shadow-[0_0_30px_rgba(201,168,232,.24)]",
        canBloom ? "border-[#E8B85C]/55 text-[#E8B85C]" : "border-[#C9A8E8]/44 text-[#C9A8E8]",
      )}
    >
      <span className="absolute inset-2 rounded-full bg-[radial-gradient(circle_at_50%_22%,rgba(245,239,255,.16),transparent_42%)]" aria-hidden />
      {canBloom ? <Flower2 className="relative drop-shadow-[0_0_12px_rgba(232,184,92,.38)]" size={28} strokeWidth={1.7} aria-hidden /> : <Sprout className="relative drop-shadow-[0_0_12px_rgba(201,168,232,.3)]" size={28} strokeWidth={1.8} aria-hidden />}
    </span>
  );
}

function HoneyDropProgress({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const bounded = Math.max(0, Math.min(current, total));
  const progress = total > 0 ? Math.round((bounded / total) * 100) : 0;

  return (
    <div className="mx-auto mt-6 w-full max-w-2xl">
      <div className="relative h-24 overflow-hidden rounded-[2rem] border border-[#C9A8E8]/26 bg-[#070817]/72 px-3 shadow-[inset_0_2px_14px_rgba(0,0,0,.42),0_0_28px_rgba(201,168,232,.12)]">
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_12%,rgba(232,213,245,.16),transparent_24%),radial-gradient(circle_at_84%_84%,rgba(232,184,92,.12),transparent_26%)]" aria-hidden />
        <span className="absolute left-6 right-6 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#9B7BC4]/30 shadow-[0_0_18px_rgba(155,123,196,.16)]" aria-hidden />
        <span
          className="absolute left-6 right-6 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gradient-to-r from-[#E8B85C] via-[#C9A8E8] to-[#E8D5F5] shadow-[0_0_22px_rgba(232,213,245,.24)] transition-transform duration-500"
          style={{ transform: `translateY(-50%) scaleX(${progress / 100})`, transformOrigin: "left center" }}
          aria-hidden
        />
        <div className="absolute inset-x-3 top-1/2 grid grid-cols-10 items-center justify-items-center gap-0.5 -translate-y-1/2 sm:gap-2" aria-hidden>
          {Array.from({ length: total }).map((_, index) => {
            const isBloomed = index < bounded;
            const isNewestBloom = isBloomed && index === bounded - 1;
            return (
              <span
                key={index}
                className={cx(
                  "relative grid h-7 w-7 place-items-center rounded-full border transition sm:h-9 sm:w-9",
                  isBloomed
                    ? "border-[#E8B85C]/46 bg-[#E8B85C]/16 text-[#E8D5F5] shadow-[0_0_16px_rgba(232,213,245,.24)]"
                    : "border-[#C9A8E8]/20 bg-[#1B1530]/78 text-[#9B7BC4]/58",
                )}
                style={isNewestBloom ? { animation: "tarotLavenderBloom 480ms cubic-bezier(0.2, 0.82, 0.24, 1) both" } : undefined}
              >
                {isBloomed ? <Flower2 size={17} strokeWidth={1.75} aria-hidden /> : <Sprout size={15} strokeWidth={1.8} aria-hidden />}
              </span>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-center text-xs font-black text-[#E8B85C]/84">
        현재 꿀방울 {bounded} / {total}
      </p>
    </div>
  );
}

function MoonlitCardPlaceholder({
  title,
  cardBackUrl,
  large = false,
  gardenSeal = false,
}: {
  title: string;
  cardBackUrl: string;
  large?: boolean;
  gardenSeal?: boolean;
}) {
  const backgroundStyle = {
    backgroundImage: gardenSeal
      ? `radial-gradient(circle at 50% 14%, rgba(245,239,255,.22), transparent 30%), radial-gradient(circle at 16% 84%, rgba(201,168,232,.18), transparent 34%), radial-gradient(circle at 84% 86%, rgba(232,184,92,.12), transparent 30%), linear-gradient(145deg, rgba(27,21,48,.98), rgba(42,31,77,.92)), url("${cardBackUrl}")`
      : `radial-gradient(circle at 50% 16%, rgba(247,231,176,.2), transparent 30%), linear-gradient(145deg, rgba(21,16,38,.96), rgba(42,23,74,.92)), url("${cardBackUrl}")`,
  } as CSSProperties;

  return (
    <span
      className={cx(
        "relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-xl border bg-center bg-cover px-3 text-center text-amber-50 shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]",
        large ? "aspect-[2/3] min-h-[210px] rounded-[1.6rem] px-5" : "",
        gardenSeal ? "border-[#C9A8E8]/36 shadow-[0_0_34px_rgba(201,168,232,.16),inset_0_0_0_1px_rgba(245,239,255,.08)]" : "border-amber-200/22",
      )}
      style={backgroundStyle}
    >
      <span className={cx("absolute inset-[9%] rounded-[1.15rem] border", gardenSeal ? "border-[#C9A8E8]/20" : "border-amber-200/14")} aria-hidden />
      {gardenSeal ? (
        <>
          <span className="absolute -bottom-3 -left-3 h-28 w-20 rotate-[-18deg] rounded-full border-l-2 border-[#9B7BC4]/54" aria-hidden />
          <span className="absolute -bottom-2 -right-4 h-28 w-20 rotate-[18deg] rounded-full border-r-2 border-[#9B7BC4]/54" aria-hidden />
          <Leaf className="absolute bottom-8 left-2 rotate-[-28deg] text-[#C9A8E8]/70" size={18} strokeWidth={1.6} aria-hidden />
          <Leaf className="absolute bottom-11 right-3 rotate-[36deg] text-[#C9A8E8]/62" size={18} strokeWidth={1.6} aria-hidden />
          <Flower2 className="absolute bottom-4 left-6 text-[#C9A8E8]/80 drop-shadow-[0_0_10px_rgba(201,168,232,.3)]" size={17} strokeWidth={1.7} aria-hidden />
          <Flower2 className="absolute bottom-6 right-7 text-[#E8D5F5]/76 drop-shadow-[0_0_10px_rgba(232,213,245,.28)]" size={16} strokeWidth={1.7} aria-hidden />
        </>
      ) : null}
      <Moon className={cx("relative drop-shadow-[0_0_18px_rgba(247,231,176,.24)]", gardenSeal ? "text-[#F5EFFF]" : "text-amber-100", large ? "mb-4" : "mb-2")} size={large ? 42 : 26} strokeWidth={1.55} aria-hidden />
      <strong className={cx("relative font-premium font-black leading-tight", large ? "text-lg" : "text-sm")}>{title}</strong>
      <em className={cx("relative mt-2 max-w-[10rem] text-[0.68rem] font-bold not-italic leading-relaxed text-violet-100/72", large ? "text-xs" : "")}>
        아직 달빛 속에 잠든 카드
      </em>
    </span>
  );
}

function TarotCardModal({
  card,
  imageFailed,
  cardBackUrl,
  onClose,
  onImageError,
}: {
  card: TarotAlbumCard;
  imageFailed: boolean;
  cardBackUrl: string;
  onClose: () => void;
  onImageError: (card: TarotAlbumCard) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-0 backdrop-blur-md sm:items-center sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tarotAlbumDetailTitle"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <article className="relative grid max-h-[96svh] w-full max-w-5xl gap-5 overflow-y-auto rounded-t-[2rem] border border-amber-200/20 bg-[#0B1020]/94 p-5 shadow-[0_0_80px_rgba(124,58,237,0.25)] backdrop-blur-2xl sm:max-h-[92svh] sm:grid-cols-[minmax(220px,340px)_minmax(0,1fr)] sm:rounded-[2rem] sm:p-8">
        <button
          type="button"
          className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/12 bg-white/[0.07] text-amber-50 backdrop-blur-xl transition hover:border-amber-200/42 hover:bg-white/[0.11] focus:outline-none focus:ring-2 focus:ring-amber-200/50"
          onClick={onClose}
          aria-label="카드 상세 닫기"
        >
          <X size={18} aria-hidden />
        </button>
        <div className="mx-auto w-full max-w-[280px] sm:max-w-none">
          <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-amber-200/24 bg-[#151026] shadow-[0_26px_60px_rgba(0,0,0,.34)]">
            {card.imageUrl && !imageFailed ? (
              <Image
                src={card.imageUrl}
                alt={`${card.nameKo} ${card.nameEn} 타로 카드 크게 보기`}
                className="object-cover"
                fill
                sizes="(max-width: 640px) 82vw, 340px"
                unoptimized
                onError={() => onImageError(card)}
              />
            ) : (
              <MoonlitCardPlaceholder title={card.nameKo} cardBackUrl={cardBackUrl} large />
            )}
          </div>
        </div>
        <div className="grid content-start gap-4 pr-0 sm:pr-12">
          <p className="inline-flex w-fit rounded-full border border-amber-200/24 bg-amber-100/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-amber-100">
            {card.suitLabel}
          </p>
          <div>
            <h3 id="tarotAlbumDetailTitle" className="font-premium text-3xl font-black leading-tight text-[#FFF8DF] sm:text-5xl">
              {card.nameKo}
            </h3>
            <p className="mt-1 text-base font-semibold text-violet-200/78">{card.nameEn}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {card.keywords.slice(0, 5).map((keyword) => (
              <span key={`${card.id}-${keyword}`} className="rounded-full border border-amber-200/18 bg-white/[0.07] px-3 py-1.5 text-xs font-extrabold text-amber-50/84">
                {keyword}
              </span>
            ))}
          </div>
          <section className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
            <h4 className="text-sm font-black text-amber-100">정방향 의미</h4>
            <p className="mt-2 text-sm leading-7 text-violet-50/84">{card.shortMeaning}</p>
          </section>
          <section className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3">
            <h4 className="text-sm font-black text-amber-100">역방향 의미</h4>
            <p className="mt-2 text-sm leading-7 text-violet-50/84">{card.reversedMeaning}</p>
          </section>
          <blockquote className="rounded-2xl border border-pink-200/20 bg-pink-200/10 px-4 py-3 text-sm leading-7 text-pink-50">
            “{card.yeoniLine}”
          </blockquote>
        </div>
      </article>
    </div>
  );
}
