"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import Image from "next/image";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Flower2,
  Leaf,
  Loader2,
  Lock,
  Moon,
  Search,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  X,
} from "lucide-react";
import type { FortuneTeaHouseHoneyDropsState } from "../data/consult";
import { fortuneTeaHouseAssets } from "../data/assets";
import {
  tarotAlbumStoryCards,
  type TarotAlbumStoryCard,
  type TarotAlbumSuit,
} from "../data/tarotAlbumStories";
import { normalizeHoneyDropsState } from "../lib/honeyDrops";
import { getTarotCardImageCoverage } from "../lib/tarotCardImageMap";

const TAROT_ALBUM_UNLOCK_COST = 10;
const PDF_PAGE_WIDTH_PX = 794;
const PDF_PAGE_HEIGHT_PX = 1123;

type TarotAlbumFilter = "all" | "major" | TarotAlbumSuit;
type TarotAlbumSortMode = "default" | "major-first" | "minor-first" | "name";
type TarotPdfPhase = "idle" | "preparing" | "images" | "stories" | "rendering" | "done" | "error";
type TarotPdfMode = "all" | "selected" | "single";

type TarotAlbumApiResponse = {
  ok?: boolean;
  success?: boolean;
  message?: string;
  errorCode?: string;
  honeyDrops?: FortuneTeaHouseHoneyDropsState;
};

type TarotPdfStatus = {
  phase: TarotPdfPhase;
  message: string;
};

type DestinyCafeTarotAlbumProps = {
  isOpen: boolean;
  honeyDrops: FortuneTeaHouseHoneyDropsState | null;
  onClose: () => void;
  onHoneyDropsChange: (nextHoneyDrops: FortuneTeaHouseHoneyDropsState) => void;
};

const tarotAlbumTabs: Array<{ id: TarotAlbumFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "major", label: "메이저 아르카나" },
  { id: "wands", label: "완드" },
  { id: "cups", label: "컵" },
  { id: "swords", label: "소드" },
  { id: "pentacles", label: "펜타클" },
];

const tarotAlbumSortOptions: Array<{ id: TarotAlbumSortMode; label: string }> = [
  { id: "default", label: "기본 순서" },
  { id: "major-first", label: "메이저 먼저" },
  { id: "minor-first", label: "마이너 먼저" },
  { id: "name", label: "이름순" },
];

const pdfMessageByPhase: Record<Exclude<TarotPdfPhase, "idle">, string> = {
  preparing: "달빛 아래에서 당신의 타로 앨범을 준비하는 중이에요.",
  images: "카드 이미지를 한 장씩 불러오고 있어요.",
  stories: "연이가 카드 이야기를 한 장씩 엮고 있어요.",
  rendering: "PDF 생성 중이에요. 잠시만 기다려 주세요.",
  done: "PDF 다운로드가 완료됐어요.",
  error: "PDF 생성에 실패했어요. 잠시 후 다시 시도해 주세요.",
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function waitForNextPaint() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

async function waitForPdfImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(images.map((image) => {
    if (image.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const timer = window.setTimeout(resolve, 4200);
      image.addEventListener("load", () => {
        window.clearTimeout(timer);
        resolve();
      }, { once: true });
      image.addEventListener("error", () => {
        window.clearTimeout(timer);
        resolve();
      }, { once: true });
    });
  }));
}

function sanitizePdfFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, "_");
}

function getPdfFileName(mode: TarotPdfMode, cards: TarotAlbumStoryCard[]) {
  if (mode === "single" && cards[0]) return `운명찻집_타로카드_${sanitizePdfFileName(cards[0].titleEn)}.pdf`;
  if (mode === "selected") return "운명찻집_타로카드_선택카드.pdf";
  return "운명찻집_달빛타로카드앨범_전체.pdf";
}

function sortTarotCards(cards: TarotAlbumStoryCard[], sortMode: TarotAlbumSortMode) {
  const sorted = [...cards];
  if (sortMode === "name") {
    return sorted.sort((a, b) => a.titleKo.localeCompare(b.titleKo, "ko-KR") || a.titleEn.localeCompare(b.titleEn));
  }
  if (sortMode === "minor-first") {
    return sorted.sort((a, b) => (a.arcana === b.arcana ? a.order - b.order : a.arcana === "minor" ? -1 : 1));
  }
  return sorted.sort((a, b) => (a.arcana === b.arcana ? a.order - b.order : a.arcana === "major" ? -1 : 1));
}

function cardSearchText(card: TarotAlbumStoryCard) {
  return normalizeSearch([
    card.titleKo,
    card.titleEn,
    card.suitLabel,
    card.number,
    card.element,
    ...card.keywords,
    ...card.reversedKeywords,
    card.shortSummary,
    card.storyTitle,
  ].filter(Boolean).join(" "));
}

export default function DestinyCafeTarotAlbum({
  isOpen,
  honeyDrops,
  onClose,
  onHoneyDropsChange,
}: DestinyCafeTarotAlbumProps) {
  const [activeFilter, setActiveFilter] = useState<TarotAlbumFilter>("all");
  const [sortMode, setSortMode] = useState<TarotAlbumSortMode>("default");
  const [searchText, setSearchText] = useState("");
  const [selectedCard, setSelectedCard] = useState<TarotAlbumStoryCard | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<Record<string, boolean>>({});
  const [imageFailedById, setImageFailedById] = useState<Record<string, boolean>>({});
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockMessage, setUnlockMessage] = useState("");
  const [pdfCards, setPdfCards] = useState<TarotAlbumStoryCard[]>([]);
  const [pdfStatus, setPdfStatus] = useState<TarotPdfStatus | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const pdfRenderRef = useRef<HTMLDivElement | null>(null);
  const albumCards = useMemo(() => tarotAlbumStoryCards, []);
  const selectedCards = useMemo(
    () => albumCards.filter((card) => selectedCardIds[card.id]),
    [albumCards, selectedCardIds],
  );
  const selectedCount = selectedCards.length;
  const currentHoneyDrops = Math.max(0, honeyDrops?.currentHoneyDrops ?? honeyDrops?.balance ?? 0);
  const isHoneyLoading = !honeyDrops;
  const isHoneyDisabled = Boolean(honeyDrops?.disabled);
  const isAlbumUnlocked = Boolean(honeyDrops?.tarotAlbumUnlocked);
  const canUnlock = !isHoneyLoading && !isHoneyDisabled && !isAlbumUnlocked && currentHoneyDrops >= TAROT_ALBUM_UNLOCK_COST;
  const cardBackUrl = fortuneTeaHouseAssets.yeoni.transparent.tarotCard;
  const honeyDropUrl = fortuneTeaHouseAssets.rewards.honeyDropCounter;
  const isPdfBusy = Boolean(pdfStatus && ["preparing", "images", "stories", "rendering"].includes(pdfStatus.phase));
  const lockDialogue = isHoneyDisabled
    ? "잠시 후 다시 확인해주세요."
    : isAlbumUnlocked
      ? "이제 이 카드첩은 손님 곁에 열려 있어요. 마음이 흔들릴 때마다 달빛 아래서 천천히 넘겨보세요."
      : canUnlock
        ? "와… 꿀방울이 10개나 모였네요? 그럼 제가 아껴둔 달빛 타로 앨범을 살짝 열어드릴게요."
        : "스토리 잠금이 걸려 있어요. 달빛이 조금만 더 차오르면 카드첩이 열릴 거예요.";
  const filteredCards = useMemo(() => {
    const query = normalizeSearch(searchText);
    const nextCards = albumCards.filter((card) => {
      const matchesFilter = activeFilter === "all"
        || (activeFilter === "major" ? card.arcana === "major" : card.suit === activeFilter);
      if (!matchesFilter) return false;
      if (!query) return true;
      return cardSearchText(card).includes(query);
    });
    return sortTarotCards(nextCards, sortMode);
  }, [activeFilter, albumCards, searchText, sortMode]);

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
      setPdfStatus(null);
      setPdfCards([]);
    }
  }, [isOpen]);

  const handleImageError = useCallback((card: TarotAlbumStoryCard) => {
    setImageFailedById((current) => ({ ...current, [card.id]: true }));
    console.warn("[FortuneTeaHouse] Tarot album image failed", {
      cardId: card.id,
      titleKo: card.titleKo,
      objectKey: card.imageObjectKey,
      url: card.imageSrc,
    });
  }, []);

  const handleTogglePdfCard = useCallback((card: TarotAlbumStoryCard) => {
    setSelectedCardIds((current) => {
      const next = { ...current };
      if (next[card.id]) delete next[card.id];
      else next[card.id] = true;
      return next;
    });
  }, []);

  const handleSelectAdjacent = useCallback((direction: -1 | 1) => {
    if (!selectedCard) return;
    const currentIndex = albumCards.findIndex((card) => card.id === selectedCard.id);
    if (currentIndex < 0) return;
    const nextIndex = (currentIndex + direction + albumCards.length) % albumCards.length;
    setSelectedCard(albumCards[nextIndex]);
  }, [albumCards, selectedCard]);

  const handleDownloadPdf = useCallback(async (mode: TarotPdfMode, focusCard?: TarotAlbumStoryCard) => {
    if (!isAlbumUnlocked) {
      setPdfStatus({ phase: "error", message: "스토리 잠금이 해제된 뒤 PDF를 만들 수 있어요." });
      return;
    }
    const cards = mode === "all" ? albumCards : mode === "selected" ? selectedCards : focusCard ? [focusCard] : [];
    if (!cards.length) {
      setPdfStatus({ phase: "error", message: "PDF에 담을 카드를 먼저 선택해 주세요." });
      return;
    }

    setPdfCards(cards);
    setPdfStatus({ phase: "preparing", message: pdfMessageByPhase.preparing });
    try {
      await waitForNextPaint();
      const renderRoot = pdfRenderRef.current;
      if (!renderRoot) throw new Error("PDF_RENDER_ROOT_MISSING");

      setPdfStatus({ phase: "images", message: pdfMessageByPhase.images });
      await waitForPdfImages(renderRoot);

      setPdfStatus({ phase: "stories", message: pdfMessageByPhase.stories });
      await waitForNextPaint();

      setPdfStatus({ phase: "rendering", message: pdfMessageByPhase.rendering });
      const [{ default: html2canvas }, jsPdfModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const JsPDF = jsPdfModule.default || jsPdfModule.jsPDF;
      const pdf = new JsPDF("p", "mm", "a4", true);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pages = Array.from(renderRoot.querySelectorAll<HTMLElement>("[data-tarot-pdf-page]"));

      for (let index = 0; index < pages.length; index += 1) {
        if (index > 0) pdf.addPage();
        const canvas = await html2canvas(pages[index], {
          backgroundColor: "#120b22",
          scale: Math.min(1.6, window.devicePixelRatio || 1.25),
          useCORS: true,
          allowTaint: false,
          logging: false,
        });
        const imageData = canvas.toDataURL("image/jpeg", 0.82);
        pdf.addImage(imageData, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
      }

      pdf.save(getPdfFileName(mode, cards));
      setPdfStatus({ phase: "done", message: pdfMessageByPhase.done });
    } catch (error) {
      console.warn("[FortuneTeaHouse] Tarot album PDF failed", error);
      setPdfStatus({ phase: "error", message: pdfMessageByPhase.error });
    } finally {
      window.setTimeout(() => setPdfCards([]), 800);
    }
  }, [albumCards, isAlbumUnlocked, selectedCards]);

  if (!isOpen) return null;

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
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
            <TarotAlbumHero
              currentHoneyDrops={currentHoneyDrops}
              totalCards={albumCards.length}
              selectedCount={selectedCount}
              cardBackUrl={cardBackUrl}
              pdfBusy={isPdfBusy}
              onDownloadAll={() => handleDownloadPdf("all")}
              onDownloadSelected={() => handleDownloadPdf("selected")}
            />
            <TarotPdfStatusBox status={pdfStatus} />
            <div className="sticky top-0 z-20 -mx-4 border-y border-white/10 bg-[#070817]/82 px-4 py-3 backdrop-blur-2xl sm:top-3 sm:mx-0 sm:rounded-3xl sm:border sm:bg-white/[0.06]">
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(210px,260px)_minmax(260px,360px)] xl:items-center">
                <TarotAlbumFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />
                <TarotAlbumSort sortMode={sortMode} onSortModeChange={setSortMode} />
                <TarotAlbumSearch searchText={searchText} onSearchTextChange={setSearchText} />
              </div>
            </div>
            <TarotAlbumGrid
              cards={filteredCards}
              selectedCardIds={selectedCardIds}
              imageFailedById={imageFailedById}
              cardBackUrl={cardBackUrl}
              onImageError={handleImageError}
              onSelectCard={setSelectedCard}
              onTogglePdfCard={handleTogglePdfCard}
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
            onUnlock={async () => {
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
            }}
          />
        )}
      </section>

      {selectedCard ? (
        <TarotCardModal
          card={selectedCard}
          selectedForPdf={Boolean(selectedCardIds[selectedCard.id])}
          imageFailed={Boolean(imageFailedById[selectedCard.id])}
          cardBackUrl={cardBackUrl}
          pdfBusy={isPdfBusy}
          onClose={() => setSelectedCard(null)}
          onImageError={handleImageError}
          onPrevious={() => handleSelectAdjacent(-1)}
          onNext={() => handleSelectAdjacent(1)}
          onTogglePdfCard={() => handleTogglePdfCard(selectedCard)}
          onDownloadSingle={() => handleDownloadPdf("single", selectedCard)}
        />
      ) : null}

      <TarotAlbumPdfRender
        cards={pdfCards}
        imageFailedById={imageFailedById}
        cardBackUrl={cardBackUrl}
        renderRef={pdfRenderRef}
      />
    </div>
  );
}

function TarotAlbumHero({
  currentHoneyDrops,
  totalCards,
  selectedCount,
  cardBackUrl,
  pdfBusy,
  onDownloadAll,
  onDownloadSelected,
}: {
  currentHoneyDrops: number;
  totalCards: number;
  selectedCount: number;
  cardBackUrl: string;
  pdfBusy: boolean;
  onDownloadAll: () => void;
  onDownloadSelected: () => void;
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
            달빛 타로 카드 앨범
          </h2>
          <p className="mt-4 text-lg font-semibold leading-relaxed text-[#F8F1DC] sm:text-xl">
            78장의 카드가 달빛 찻집의 도감처럼 조용히 펼쳐집니다.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-violet-100/78 sm:text-base">
            연이가 깊은 서랍에 아껴두었던 카드 이야기예요. 타로 카드 의미와 해석을 한 장씩 읽고, 마음에 남는 카드는 PDF로 엮어 보관해 보세요.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <TarotAlbumUnlockBadge />
            <span className="inline-flex min-h-10 items-center rounded-full border border-violet-200/15 bg-white/[0.055] px-4 text-sm font-bold text-violet-100/78">
              보유 꿀방울 {currentHoneyDrops}개
            </span>
            <span className="inline-flex min-h-10 items-center rounded-full border border-violet-200/15 bg-white/[0.055] px-4 text-sm font-bold text-violet-100/78">
              해금 카드 {totalCards}장
            </span>
            <span className="inline-flex min-h-10 items-center rounded-full border border-violet-200/15 bg-white/[0.055] px-4 text-sm font-bold text-violet-100/78">
              PDF 선택 {selectedCount}장
            </span>
          </div>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <PdfActionButton onClick={onDownloadAll} disabled={pdfBusy} label="전체 PDF 다운로드" />
            <PdfActionButton onClick={onDownloadSelected} disabled={pdfBusy || selectedCount === 0} label={selectedCount ? `선택 ${selectedCount}장 PDF` : "선택 카드 PDF"} />
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

function PdfActionButton({
  onClick,
  disabled,
  label,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-amber-200/35 bg-amber-100/12 px-5 text-sm font-black text-amber-50 shadow-[0_12px_34px_rgba(215,181,109,.14)] transition hover:-translate-y-0.5 hover:border-amber-100/60 hover:bg-amber-100/18 focus:outline-none focus:ring-2 focus:ring-amber-200/45 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      {disabled ? <Loader2 size={17} className="animate-spin" aria-hidden /> : <Download size={17} aria-hidden />}
      {label}
    </button>
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

function TarotPdfStatusBox({ status }: { status: TarotPdfStatus | null }) {
  if (!status) return null;
  const isBusy = ["preparing", "images", "stories", "rendering"].includes(status.phase);
  const isError = status.phase === "error";
  return (
    <div
      className={cx(
        "grid grid-cols-[34px_minmax(0,1fr)] items-center gap-3 rounded-2xl border px-4 py-3 text-sm leading-relaxed shadow-[0_14px_36px_rgba(0,0,0,.2)]",
        isError ? "border-rose-200/24 bg-rose-200/10 text-rose-50" : "border-amber-200/18 bg-white/[0.055] text-violet-50/88",
      )}
      role={isError ? "alert" : "status"}
      aria-live="polite"
    >
      <span className="grid h-9 w-9 place-items-center rounded-full border border-amber-200/22 bg-amber-100/10 text-amber-100">
        {isBusy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : isError ? <X size={16} aria-hidden /> : <Check size={16} aria-hidden />}
      </span>
      <p>{status.message}</p>
    </div>
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

function TarotAlbumSort({
  sortMode,
  onSortModeChange,
}: {
  sortMode: TarotAlbumSortMode;
  onSortModeChange: (mode: TarotAlbumSortMode) => void;
}) {
  return (
    <label className="grid min-h-12 grid-cols-[20px_minmax(0,1fr)] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.07] px-4 text-violet-100/75 shadow-[inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-md focus-within:border-amber-200/35 focus-within:ring-2 focus-within:ring-amber-200/30">
      <SlidersHorizontal size={17} aria-hidden />
      <span className="sr-only">카드 정렬</span>
      <select
        value={sortMode}
        className="w-full min-w-0 bg-transparent text-sm font-black text-amber-50 outline-none"
        onChange={(event) => onSortModeChange(event.target.value as TarotAlbumSortMode)}
      >
        {tarotAlbumSortOptions.map((option) => (
          <option key={option.id} value={option.id} className="bg-[#120B22] text-amber-50">
            {option.label}
          </option>
        ))}
      </select>
    </label>
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
        aria-label="카드 이름, 키워드, 해석 검색"
        className="w-full min-w-0 bg-transparent text-sm font-semibold text-amber-50 outline-none"
        onChange={(event) => onSearchTextChange(event.target.value)}
      />
    </label>
  );
}

function TarotAlbumGrid({
  cards,
  selectedCardIds,
  imageFailedById,
  cardBackUrl,
  onImageError,
  onSelectCard,
  onTogglePdfCard,
}: {
  cards: TarotAlbumStoryCard[];
  selectedCardIds: Record<string, boolean>;
  imageFailedById: Record<string, boolean>;
  cardBackUrl: string;
  onImageError: (card: TarotAlbumStoryCard) => void;
  onSelectCard: (card: TarotAlbumStoryCard) => void;
  onTogglePdfCard: (card: TarotAlbumStoryCard) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" aria-live="polite">
      {cards.map((card) => (
        <TarotAlbumCardItem
          key={card.id}
          card={card}
          selectedForPdf={Boolean(selectedCardIds[card.id])}
          imageFailed={Boolean(imageFailedById[card.id])}
          cardBackUrl={cardBackUrl}
          onImageError={onImageError}
          onSelectCard={onSelectCard}
          onTogglePdfCard={onTogglePdfCard}
        />
      ))}
    </div>
  );
}

function TarotAlbumCardItem({
  card,
  selectedForPdf,
  imageFailed,
  cardBackUrl,
  onImageError,
  onSelectCard,
  onTogglePdfCard,
}: {
  card: TarotAlbumStoryCard;
  selectedForPdf: boolean;
  imageFailed: boolean;
  cardBackUrl: string;
  onImageError: (card: TarotAlbumStoryCard) => void;
  onSelectCard: (card: TarotAlbumStoryCard) => void;
  onTogglePdfCard: (card: TarotAlbumStoryCard) => void;
}) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-amber-200/15 bg-white/[0.05] p-2 text-left shadow-[0_18px_44px_rgba(0,0,0,.24)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-amber-200/40 hover:shadow-[0_0_36px_rgba(215,181,109,0.22)] focus-within:ring-2 focus-within:ring-amber-200/45">
      <button
        type="button"
        className={cx(
          "absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border backdrop-blur-xl transition focus:outline-none focus:ring-2 focus:ring-amber-200/50",
          selectedForPdf
            ? "border-amber-200/55 bg-amber-100/22 text-amber-50"
            : "border-white/15 bg-black/30 text-violet-100 hover:border-amber-200/35 hover:text-amber-50",
        )}
        aria-pressed={selectedForPdf}
        aria-label={`${card.titleKo} PDF 포함 ${selectedForPdf ? "해제" : "선택"}`}
        onClick={() => onTogglePdfCard(card)}
      >
        <Check size={16} aria-hidden />
      </button>
      <button
        type="button"
        className="block w-full text-left focus:outline-none"
        onClick={() => onSelectCard(card)}
        aria-label={`${card.titleKo} ${card.titleEn} 카드 자세히 보기`}
      >
        <span className="relative block aspect-[2/3] overflow-hidden rounded-xl border border-amber-200/18 bg-[#151026]">
          {card.imageSrc && !imageFailed ? (
            <Image
              src={card.imageSrc}
              alt={`${card.titleKo} ${card.titleEn} 타로 카드`}
              className="object-cover transition duration-500 group-hover:scale-[1.025]"
              fill
              sizes="(max-width: 640px) 48vw, (max-width: 1280px) 25vw, 180px"
              unoptimized
              loading="lazy"
              onError={() => onImageError(card)}
            />
          ) : (
            <MoonlitCardPlaceholder title={card.titleKo} cardBackUrl={cardBackUrl} />
          )}
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100" />
          <span className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-amber-100/0 transition group-hover:ring-amber-100/34 group-focus-within:ring-amber-100/34" />
        </span>
        <span className="mt-3 grid gap-1 px-1 pb-1">
          <strong className="truncate font-premium text-sm font-black leading-tight text-[#FFF8DF] sm:text-[0.96rem]">{card.titleKo}</strong>
          <em className="truncate text-[0.72rem] font-semibold not-italic text-violet-200/76">{card.titleEn}</em>
          <span className="mt-1 inline-flex w-fit rounded-full border border-amber-200/18 bg-amber-100/8 px-2 py-1 text-[0.68rem] font-extrabold text-amber-100/78">
            {card.suitLabel}
          </span>
        </span>
      </button>
    </article>
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
        <div className="relative mx-auto mb-6 w-40 sm:w-48" aria-hidden>
          <span className="absolute -right-14 -top-8 h-28 w-28 rounded-full bg-[#F5EFFF]/22 blur-2xl" style={{ animation: "tarotMoonGlow 6.4s ease-in-out infinite" }} />
          <span className="absolute -right-5 -top-2 h-20 w-20 rounded-full bg-[#F5EFFF]/80 shadow-[0_0_34px_rgba(245,239,255,.32)]">
            <span className="absolute -right-2 top-0 h-20 w-20 rounded-full bg-[#2A1F4D]" />
          </span>
          <MoonlitCardPlaceholder title="스토리 잠금" cardBackUrl={cardBackUrl} large gardenSeal />
          <BloomSeal canBloom={canUnlock} />
        </div>
        <div className="relative">
          <p className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-[#C9A8E8]/38 bg-[#C9A8E8]/10 px-4 py-2 text-[0.72rem] font-black uppercase tracking-[0.16em] text-[#F7E7B0] shadow-[0_0_24px_rgba(201,168,232,.18)]">
            <Lock size={13} aria-hidden />
            MOONLIT TAROT ARCHIVE
          </p>
          <h2 id="tarotAlbumTitle" className="bg-gradient-to-r from-[#C9A8E8] via-[#F5EFFF] to-[#E8B85C] bg-clip-text font-premium text-4xl font-black leading-tight text-transparent sm:text-5xl">
            달빛 봉인이 걸린 카드첩
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[#B8A8D4] sm:text-base">
            꿀방울 10개를 모으면 연이가 아껴둔 타로 카드 앨범과 78장의 이야기를 열어드려요.
          </p>
          <div className="mx-auto mt-6 grid max-w-lg grid-cols-2 gap-3">
            <div className="relative overflow-hidden rounded-2xl border border-[#C9A8E8]/24 bg-[#F5EFFF]/[0.055] px-4 py-3 shadow-[inset_0_1px_0_rgba(245,239,255,.1)]">
              <span className="relative mx-auto mb-1 block h-5 w-5 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: `url("${honeyDropUrl}")` }} aria-hidden />
              <span className="relative block text-xs font-extrabold text-[#B8A8D4]">현재 꿀방울</span>
              <strong className="relative mt-1 block font-premium text-2xl text-[#E8B85C]">{honeyCountText}</strong>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-[#C9A8E8]/24 bg-[#F5EFFF]/[0.055] px-4 py-3 shadow-[inset_0_1px_0_rgba(245,239,255,.1)]">
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
            {isUnlocking ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <BookOpen size={18} aria-hidden />}
            {isUnlocking ? "달빛 앨범을 여는 중" : canUnlock ? "꿀방울 10개로 앨범 열기" : "꿀방울이 조금 더 필요해요"}
          </button>
          <div className="mx-auto mt-5 grid max-w-2xl grid-cols-[34px_minmax(0,1fr)] gap-3 rounded-2xl border border-[#C9A8E8]/20 bg-[#16112A]/72 px-4 py-3 text-left text-sm leading-relaxed text-[#F5F0FF] shadow-[0_18px_44px_rgba(5,2,14,.18)]">
            <span className="relative mt-0.5 grid h-8 w-8 place-items-center rounded-full border border-[#E8B85C]/24 bg-[#E8B85C]/10 text-[#F7E7B0]">
              <Sparkles size={15} aria-hidden />
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
      @keyframes tarotLavenderBloom {
        0% { opacity: .45; transform: scale(.62) rotate(-10deg); }
        70% { opacity: 1; transform: scale(1.14) rotate(4deg); }
        100% { opacity: 1; transform: scale(1) rotate(0deg); }
      }
      @media (prefers-reduced-motion: reduce) {
        [style*="tarotMoonGlow"],
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
  selectedForPdf,
  imageFailed,
  cardBackUrl,
  pdfBusy,
  onClose,
  onImageError,
  onPrevious,
  onNext,
  onTogglePdfCard,
  onDownloadSingle,
}: {
  card: TarotAlbumStoryCard;
  selectedForPdf: boolean;
  imageFailed: boolean;
  cardBackUrl: string;
  pdfBusy: boolean;
  onClose: () => void;
  onImageError: (card: TarotAlbumStoryCard) => void;
  onPrevious: () => void;
  onNext: () => void;
  onTogglePdfCard: () => void;
  onDownloadSingle: () => void;
}) {
  const modalRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const firstButton = modalRef.current?.querySelector<HTMLButtonElement>("button");
    window.setTimeout(() => firstButton?.focus(), 0);
  }, [card.id]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onPrevious();
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      onNext();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(modalRef.current?.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])") || [])
      .filter((element) => !element.hasAttribute("disabled") && element.tabIndex !== -1);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

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
      <article
        ref={modalRef}
        className="relative grid max-h-[96svh] w-full max-w-6xl gap-5 overflow-y-auto rounded-t-[2rem] border border-amber-200/20 bg-[#0B1020]/96 p-5 pb-24 shadow-[0_0_80px_rgba(124,58,237,0.25)] backdrop-blur-2xl sm:max-h-[92svh] sm:grid-cols-[minmax(220px,340px)_minmax(0,1fr)] sm:rounded-[2rem] sm:p-8"
        onKeyDown={handleKeyDown}
      >
        <button
          type="button"
          className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/12 bg-white/[0.07] text-amber-50 backdrop-blur-xl transition hover:border-amber-200/42 hover:bg-white/[0.11] focus:outline-none focus:ring-2 focus:ring-amber-200/50"
          onClick={onClose}
          aria-label="카드 상세 닫기"
        >
          <X size={18} aria-hidden />
        </button>
        <div className="mx-auto w-full max-w-[300px] sm:max-w-none">
          <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-amber-200/24 bg-[#151026] shadow-[0_26px_60px_rgba(0,0,0,.34)]">
            {card.imageSrc && !imageFailed ? (
              <Image
                src={card.imageSrc}
                alt={`${card.titleKo} ${card.titleEn} 타로 카드 크게 보기`}
                className="object-cover"
                fill
                sizes="(max-width: 640px) 82vw, 340px"
                unoptimized
                priority
                onError={() => onImageError(card)}
              />
            ) : (
              <MoonlitCardPlaceholder title={card.titleKo} cardBackUrl={cardBackUrl} large />
            )}
          </div>
          <div className="mt-4 hidden grid-cols-2 gap-2 sm:grid">
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.055] px-3 text-xs font-black text-violet-50 transition hover:border-amber-200/35 focus:outline-none focus:ring-2 focus:ring-amber-200/45"
              onClick={onPrevious}
              aria-label="이전 카드 보기"
            >
              <ChevronLeft size={16} aria-hidden />
              이전
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.055] px-3 text-xs font-black text-violet-50 transition hover:border-amber-200/35 focus:outline-none focus:ring-2 focus:ring-amber-200/45"
              onClick={onNext}
              aria-label="다음 카드 보기"
            >
              다음
              <ChevronRight size={16} aria-hidden />
            </button>
          </div>
        </div>
        <div className="grid content-start gap-4 pr-0 sm:pr-12">
          <p className="inline-flex w-fit rounded-full border border-amber-200/24 bg-amber-100/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-amber-100">
            {card.suitLabel} · {card.element}
          </p>
          <div>
            <h3 id="tarotAlbumDetailTitle" className="font-premium text-3xl font-black leading-tight text-[#FFF8DF] sm:text-5xl">
              {card.titleKo}
            </h3>
            <p className="mt-1 text-base font-semibold text-violet-200/78">{card.titleEn}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {card.keywords.map((keyword) => (
              <span key={`${card.id}-${keyword}`} className="rounded-full border border-amber-200/18 bg-white/[0.07] px-3 py-1.5 text-xs font-extrabold text-amber-50/84">
                {keyword}
              </span>
            ))}
          </div>
          <blockquote className="rounded-2xl border border-amber-200/22 bg-amber-100/10 px-4 py-4 text-sm font-semibold leading-7 text-amber-50">
            {card.shortSummary}
          </blockquote>
          <DetailSection title="연이가 들려주는 카드 이야기" body={`${card.storyTitle}\n${card.story}`} featured />
          <div className="grid gap-3 md:grid-cols-2">
            <DetailSection title="정방향 의미" body={card.uprightMeaning} />
            <DetailSection title="역방향 의미" body={card.reversedMeaning} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <DetailSection title="사랑" body={card.loveMeaning} />
            <DetailSection title="관계" body={card.relationshipMeaning} />
            <DetailSection title="일" body={card.careerMeaning} />
            <DetailSection title="돈" body={card.moneyMeaning} />
          </div>
          <DetailSection title="내면 성장" body={card.innerGrowthMeaning} />
          <blockquote className="rounded-2xl border border-pink-200/20 bg-pink-200/10 px-4 py-4 text-sm leading-7 text-pink-50">
            “{card.yeoniMessage}”
          </blockquote>
          <section className="rounded-2xl border border-violet-200/16 bg-violet-200/[0.07] px-4 py-4">
            <h4 className="text-sm font-black text-violet-100">나에게 던지는 질문</h4>
            <p className="mt-2 text-sm leading-7 text-violet-50/88">{card.journalQuestion}</p>
          </section>
        </div>
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#090715]/88 px-4 py-3 backdrop-blur-2xl sm:absolute sm:rounded-b-[2rem]">
          <div className="mx-auto flex max-w-5xl items-center gap-2">
            <button
              type="button"
              className="grid h-11 w-11 flex-none place-items-center rounded-full border border-white/12 bg-white/[0.055] text-violet-50 focus:outline-none focus:ring-2 focus:ring-amber-200/45"
              onClick={onPrevious}
              aria-label="이전 카드"
            >
              <ChevronLeft size={18} aria-hidden />
            </button>
            <button
              type="button"
              className="grid h-11 w-11 flex-none place-items-center rounded-full border border-white/12 bg-white/[0.055] text-violet-50 focus:outline-none focus:ring-2 focus:ring-amber-200/45"
              onClick={onNext}
              aria-label="다음 카드"
            >
              <ChevronRight size={18} aria-hidden />
            </button>
            <button
              type="button"
              className={cx(
                "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border px-3 text-xs font-black focus:outline-none focus:ring-2 focus:ring-amber-200/45",
                selectedForPdf ? "border-amber-200/50 bg-amber-100/18 text-amber-50" : "border-white/12 bg-white/[0.055] text-violet-50",
              )}
              onClick={onTogglePdfCard}
              aria-pressed={selectedForPdf}
            >
              <Check size={16} aria-hidden />
              PDF 포함
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-amber-200/35 bg-amber-100/12 px-3 text-xs font-black text-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-200/45 disabled:opacity-55"
              onClick={onDownloadSingle}
              disabled={pdfBusy}
              aria-label={`${card.titleKo} 한 장 PDF 다운로드`}
            >
              {pdfBusy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <FileText size={16} aria-hidden />}
              1장 PDF
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}

function DetailSection({
  title,
  body,
  featured = false,
}: {
  title: string;
  body: string;
  featured?: boolean;
}) {
  const paragraphs = body.split("\n").filter(Boolean);
  return (
    <section className={cx(
      "rounded-2xl border px-4 py-4",
      featured ? "border-amber-200/18 bg-white/[0.06]" : "border-white/10 bg-white/[0.045]",
    )}>
      <h4 className="text-sm font-black text-amber-100">{title}</h4>
      {paragraphs.map((paragraph) => (
        <p key={paragraph} className="mt-2 text-sm leading-7 text-violet-50/84">{paragraph}</p>
      ))}
    </section>
  );
}

function TarotAlbumPdfRender({
  cards,
  imageFailedById,
  cardBackUrl,
  renderRef,
}: {
  cards: TarotAlbumStoryCard[];
  imageFailedById: Record<string, boolean>;
  cardBackUrl: string;
  renderRef: RefObject<HTMLDivElement>;
}) {
  const groupedCards = useMemo(() => {
    const groups: Array<{ title: string; cards: TarotAlbumStoryCard[] }> = [
      { title: "메이저 아르카나", cards: cards.filter((card) => card.arcana === "major") },
      { title: "완드", cards: cards.filter((card) => card.suit === "wands") },
      { title: "컵", cards: cards.filter((card) => card.suit === "cups") },
      { title: "소드", cards: cards.filter((card) => card.suit === "swords") },
      { title: "펜타클", cards: cards.filter((card) => card.suit === "pentacles") },
    ];
    return groups.filter((group) => group.cards.length);
  }, [cards]);

  if (!cards.length) {
    return <div ref={renderRef} aria-hidden />;
  }

  return (
    <div
      ref={renderRef}
      aria-hidden
      style={{
        position: "fixed",
        left: "-10000px",
        top: 0,
        width: PDF_PAGE_WIDTH_PX,
        pointerEvents: "none",
        opacity: 1,
        zIndex: -1,
      }}
    >
      <PdfCoverPage count={cards.length} />
      <PdfTocPage groups={groupedCards} />
      {cards.map((card, index) => (
        <PdfCardPage
          key={card.id}
          card={card}
          pageNumber={index + 3}
          imageFailed={Boolean(imageFailedById[card.id])}
          cardBackUrl={cardBackUrl}
        />
      ))}
      <PdfLastPage pageNumber={cards.length + 3} />
    </div>
  );
}

const pdfPageStyle: CSSProperties = {
  width: PDF_PAGE_WIDTH_PX,
  minHeight: PDF_PAGE_HEIGHT_PX,
  padding: "54px",
  background: "radial-gradient(circle at 78% 8%, rgba(245,239,255,.15), transparent 28%), linear-gradient(145deg, #120b22 0%, #17102d 52%, #24153d 100%)",
  color: "#f8f1dc",
  fontFamily: "CodeDestinyBody, Pretendard, Apple SD Gothic Neo, sans-serif",
  position: "relative",
  overflow: "hidden",
};

function PdfPageShell({
  children,
  pageNumber,
}: {
  children: ReactNode;
  pageNumber?: number;
}) {
  return (
    <section data-tarot-pdf-page style={pdfPageStyle}>
      <div style={{ position: "absolute", inset: 24, border: "1px solid rgba(247,231,176,.2)", borderRadius: 28 }} />
      <div style={{ position: "absolute", right: 64, top: 52, width: 88, height: 88, borderRadius: 999, background: "rgba(245,239,255,.78)", boxShadow: "0 0 36px rgba(245,239,255,.25)" }} />
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
      {pageNumber ? (
        <p style={{ position: "absolute", bottom: 28, right: 54, margin: 0, color: "rgba(248,241,220,.58)", fontSize: 12, fontWeight: 800 }}>
          {pageNumber}
        </p>
      ) : null}
    </section>
  );
}

function PdfCoverPage({ count }: { count: number }) {
  const createdAt = new Intl.DateTimeFormat("ko-KR", { dateStyle: "long" }).format(new Date());
  return (
    <PdfPageShell>
      <div style={{ display: "grid", minHeight: 990, alignContent: "center", gap: 26 }}>
        <p style={{ margin: 0, color: "#f7e7b0", fontSize: 15, fontWeight: 900, letterSpacing: 2 }}>CODE DESTINY · 운명 찻집</p>
        <h1 style={{ margin: 0, maxWidth: 560, color: "#fff8df", fontSize: 58, lineHeight: 1.08, fontWeight: 950 }}>
          달빛 타로 카드 앨범
        </h1>
        <p style={{ margin: 0, maxWidth: 560, color: "rgba(232,213,245,.9)", fontSize: 21, lineHeight: 1.7, fontWeight: 700 }}>
          연이가 카드 이야기를 한 장씩 엮어, 오늘의 마음 곁에 오래 머무는 타로 도감으로 묶었습니다.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <span style={{ border: "1px solid rgba(247,231,176,.28)", borderRadius: 999, padding: "10px 16px", color: "#f7e7b0", fontSize: 13, fontWeight: 900 }}>
            카드 {count}장
          </span>
          <span style={{ border: "1px solid rgba(232,213,245,.22)", borderRadius: 999, padding: "10px 16px", color: "#e8d5f5", fontSize: 13, fontWeight: 900 }}>
            생성일 {createdAt}
          </span>
        </div>
      </div>
    </PdfPageShell>
  );
}

function PdfTocPage({ groups }: { groups: Array<{ title: string; cards: TarotAlbumStoryCard[] }> }) {
  return (
    <PdfPageShell pageNumber={2}>
      <h2 style={{ margin: "0 0 22px", color: "#fff8df", fontSize: 34, fontWeight: 950 }}>목차</h2>
      <div style={{ display: "grid", gap: 18 }}>
        {groups.map((group) => (
          <section key={group.title} style={{ border: "1px solid rgba(247,231,176,.16)", borderRadius: 20, padding: 18, background: "rgba(255,255,255,.045)" }}>
            <h3 style={{ margin: "0 0 10px", color: "#f7e7b0", fontSize: 18, fontWeight: 950 }}>{group.title}</h3>
            <p style={{ margin: 0, color: "rgba(232,213,245,.86)", fontSize: 13, lineHeight: 1.85, fontWeight: 700 }}>
              {group.cards.map((card) => `${card.titleKo}(${card.titleEn})`).join(" · ")}
            </p>
          </section>
        ))}
      </div>
    </PdfPageShell>
  );
}

function PdfCardPage({
  card,
  pageNumber,
  imageFailed,
  cardBackUrl,
}: {
  card: TarotAlbumStoryCard;
  pageNumber: number;
  imageFailed: boolean;
  cardBackUrl: string;
}) {
  const imageSrc = card.imageSrc && !imageFailed ? card.imageSrc : cardBackUrl;
  const sections = [
    ["정방향", card.uprightMeaning],
    ["역방향", card.reversedMeaning],
    ["사랑", card.loveMeaning],
    ["관계", card.relationshipMeaning],
    ["일", card.careerMeaning],
    ["돈", card.moneyMeaning],
    ["내면 성장", card.innerGrowthMeaning],
  ] as const;

  return (
    <PdfPageShell pageNumber={pageNumber}>
      <div style={{ display: "grid", gridTemplateColumns: "210px 1fr", gap: 24 }}>
        <div>
          <img
            src={imageSrc}
            crossOrigin="anonymous"
            alt=""
            style={{ width: 196, height: 294, objectFit: "cover", borderRadius: 18, border: "1px solid rgba(247,231,176,.28)", boxShadow: "0 24px 46px rgba(0,0,0,.32)" }}
            onError={(event) => {
              event.currentTarget.src = cardBackUrl;
            }}
          />
          <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {card.keywords.slice(0, 5).map((keyword) => (
              <span key={keyword} style={{ border: "1px solid rgba(247,231,176,.18)", borderRadius: 999, padding: "5px 8px", color: "#f7e7b0", fontSize: 10, fontWeight: 900 }}>
                {keyword}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p style={{ margin: "0 0 8px", color: "#f7e7b0", fontSize: 12, fontWeight: 950, letterSpacing: 1.1 }}>
            {card.suitLabel} · {card.element}
          </p>
          <h2 style={{ margin: 0, color: "#fff8df", fontSize: 30, lineHeight: 1.16, fontWeight: 950 }}>
            {card.titleKo}
          </h2>
          <p style={{ margin: "4px 0 14px", color: "rgba(232,213,245,.86)", fontSize: 14, fontWeight: 800 }}>{card.titleEn}</p>
          <p style={{ margin: "0 0 14px", color: "#f8f1dc", fontSize: 13, lineHeight: 1.65, fontWeight: 800 }}>
            {card.shortSummary}
          </p>
          <section style={{ border: "1px solid rgba(247,231,176,.14)", borderRadius: 16, padding: 12, background: "rgba(255,255,255,.045)", marginBottom: 12 }}>
            <h3 style={{ margin: "0 0 6px", color: "#f7e7b0", fontSize: 13, fontWeight: 950 }}>연이가 들려주는 카드 이야기</h3>
            <p style={{ margin: 0, color: "rgba(248,241,220,.88)", fontSize: 11.2, lineHeight: 1.62, fontWeight: 650 }}>{card.story}</p>
          </section>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
        {sections.map(([title, body]) => (
          <section key={title} style={{ border: "1px solid rgba(232,213,245,.14)", borderRadius: 14, padding: 10, background: "rgba(255,255,255,.04)" }}>
            <h3 style={{ margin: "0 0 5px", color: "#f7e7b0", fontSize: 11.4, fontWeight: 950 }}>{title}</h3>
            <p style={{ margin: 0, color: "rgba(248,241,220,.84)", fontSize: 9.6, lineHeight: 1.58, fontWeight: 650 }}>{body}</p>
          </section>
        ))}
      </div>
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <section style={{ border: "1px solid rgba(247,231,176,.18)", borderRadius: 14, padding: 10, background: "rgba(247,231,176,.08)" }}>
          <h3 style={{ margin: "0 0 5px", color: "#f7e7b0", fontSize: 11.4, fontWeight: 950 }}>연이의 메시지</h3>
          <p style={{ margin: 0, color: "rgba(248,241,220,.9)", fontSize: 9.8, lineHeight: 1.58, fontWeight: 700 }}>{card.yeoniMessage}</p>
        </section>
        <section style={{ border: "1px solid rgba(232,213,245,.18)", borderRadius: 14, padding: 10, background: "rgba(232,213,245,.07)" }}>
          <h3 style={{ margin: "0 0 5px", color: "#e8d5f5", fontSize: 11.4, fontWeight: 950 }}>나에게 던지는 질문</h3>
          <p style={{ margin: 0, color: "rgba(248,241,220,.9)", fontSize: 9.8, lineHeight: 1.58, fontWeight: 700 }}>{card.journalQuestion}</p>
        </section>
      </div>
    </PdfPageShell>
  );
}

function PdfLastPage({ pageNumber }: { pageNumber: number }) {
  return (
    <PdfPageShell pageNumber={pageNumber}>
      <div style={{ display: "grid", minHeight: 990, alignContent: "center", gap: 20, textAlign: "center" }}>
        <p style={{ margin: 0, color: "#f7e7b0", fontSize: 15, fontWeight: 950, letterSpacing: 2 }}>운명 찻집</p>
        <h2 style={{ margin: "0 auto", maxWidth: 560, color: "#fff8df", fontSize: 38, lineHeight: 1.35, fontWeight: 950 }}>
          오늘 당신에게 필요한 카드는 이미 마음속에 남아 있어요.
        </h2>
        <p style={{ margin: "0 auto", maxWidth: 520, color: "rgba(232,213,245,.86)", fontSize: 17, lineHeight: 1.8, fontWeight: 700 }}>
          달빛 아래 펼친 이야기가 내일의 선택을 대신 정하지는 않지만, 당신이 이미 알고 있던 작은 감각을 다시 믿게 해주기를 바랍니다.
        </p>
      </div>
    </PdfPageShell>
  );
}
