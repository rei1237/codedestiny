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
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Flower2,
  Leaf,
  Loader2,
  Moon,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import type { FortuneTeaHouseHoneyDropsState } from "../data/consult";
import { fortuneTeaHouseAssets } from "../data/assets";
import {
  buildTarotAlbumCards,
  majorAlbumNarratives,
  rankMetaByNumber,
  suitMeta,
  tarotAlbumParts,
  tarotAlbumTemplates,
  type TarotAlbumStoryCard,
  type TarotAlbumSuit,
} from "../data/tarotAlbumStories";
import { authFetch } from "@/app/_lib/auth-client";
import albumStyles from "../styles/tea-album.module.css";
import { albumVisitCopy } from "../data/albumVisitCopy";
import { TAROT_ALBUM_UNLOCK_COST } from "../lib/honeyDrops";
import { normalizeHoneyDropsState } from "../lib/honeyDrops";
import { getTarotCardImageCoverage } from "../lib/tarotCardImageMap";
import { usePrefersReducedMotion } from "../lib/usePrefersReducedMotion";


import { useTeaHouseCopy } from "../lib/teaHouseCopy";
import { useLocale } from "@/lib/i18n/useT";
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
  onRequestRefresh: () => Promise<boolean>;
  isOpen: boolean;
  honeyDrops: FortuneTeaHouseHoneyDropsState | null;
  onClose: () => void;
  onHoneyDropsChange: (nextHoneyDrops: FortuneTeaHouseHoneyDropsState) => void;
};

// 🔴 표는 모듈 최상위라 훅을 못 부른다. 값이 아니라 KO 의 **키**를 담고, 렌더에서 copy[labelKey] 로 편다.
const tarotAlbumTabs: Array<{ id: TarotAlbumFilter; labelKey: keyof typeof KO }> = [
  { id: "all", labelKey: "kk03sxsx" },
  { id: "major", labelKey: "knnv85fh" },
  { id: "wands", labelKey: "kr7i3yto" },
  { id: "cups", labelKey: "k8tcg3oe" },
  { id: "swords", labelKey: "kph0fvpr" },
  { id: "pentacles", labelKey: "k79dstes" },
];

const tarotAlbumSortOptions: Array<{ id: TarotAlbumSortMode; labelKey: keyof typeof KO }> = [
  { id: "default", labelKey: "k2lsrnrw" },
  { id: "major-first", labelKey: "kby0xnd1" },
  { id: "minor-first", labelKey: "kdwhxrty" },
  { id: "name", labelKey: "kpqljmoc" },
];

const pdfMessageByPhase: Record<Exclude<TarotPdfPhase, "idle">, keyof typeof KO> = {
  preparing: "koq4dt2a",
  images: "kqejmfjk",
  stories: "kuqqlnlp",
  rendering: "kx5gbrnz",
  done: "kw9ktd7m",
  error: "k873uvgj",
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

function getPdfFileName(mode: TarotPdfMode, cards: TarotAlbumStoryCard[], copy: typeof KO) {
  if (mode === "single" && cards[0]) return copy.pdfFileNameSingle.replace("{name}", sanitizePdfFileName(cards[0].titleEn));
  if (mode === "selected") return copy.k7vazcgq;
  return copy.kihtwum1;
}

function sortTarotCards(cards: TarotAlbumStoryCard[], sortMode: TarotAlbumSortMode, locale: string) {
  const sorted = [...cards];
  if (sortMode === "name") {
    // 🔴 정렬 기준을 "ko-KR" 로 고정하면 어떤 로케일에서도 한국어 자모 순으로 늘어선다.
    // 활성 로케일로 비교하고, 그 로케일에 한국어 제목이 없을 수 있으므로 영문 제목이 tie-breaker 다.
    return sorted.sort((a, b) => a.titleKo.localeCompare(b.titleKo, locale) || a.titleEn.localeCompare(b.titleEn, locale));
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

/** 화면에 보이는 한국어 원문. 사전에 같은 경로의 값이 있으면 그것이 이긴다.
    키는 문구의 결정론적 해시라 같은 문구가 자동으로 한 키로 합쳐진다(정적 셸의 마커 도구와 같은 방식). */
const KO = {
  k0iceshy: "달빛 아래 펼친 이야기가 내일의 선택을 대신 정하지는 않지만, 당신이 이미 알고 있던 작은 감각을 다시 믿게 해주기를 바랍니다.",
  k1gzgjee: "연이의 비밀 카드첩",
  k1h4mohy: "달빛 앨범을 여는 중",
  k1iqbrdw: "탭하여 펼치기",
  k1yzt0ya: "달빛 타로 카드 앨범",
  k2jfbomz: "역방향",
  k2lsrnrw: "기본 순서",
  k2tt3wwq: "PDF에 담을 카드를 먼저 선택해 주세요.",
  k35zodw1: "타로 카드 검색",
  k3anflqu: "이전",
  k6jsudop: "스토리 잠금이 해제된 뒤 PDF를 만들 수 있어요.",
  k79dstes: "펜타클",
  k7vazcgq: "운명찻집_타로카드_선택카드.pdf",
  k873uvgj: "PDF 생성에 실패했어요. 잠시 후 다시 시도해 주세요.",
  k8tcg3oe: "컵",
  k9bz0eod: "카드가 깨어났어요. 이제 달빛 아래서 천천히 넘겨보세요.",
  kactydpb: "확인 중",
  kajyhu4o: "내면 성장",
  kampzo9z: "연이가 깊은 서랍에 아껴두었던 카드 이야기예요. 타로 카드 의미와 해석을 한 장씩 읽고, 마음에 남는 카드는 PDF로 엮어 보관해 보세요.",
  kb6dudtb: "달빛 서가",
  kbfum84c: "타로 카드 분류",
  kbs8kn5u: "일",
  kbx1lbox: "연이가 들려주는 카드 이야기",
  kby0xnd1: "메이저 먼저",
  kcbceqsz: "선택",
  kceymbv8: "카드 정렬",
  kcojnagb: "카드 이름, 키워드, 해석 검색",
  kdhtquzm: "목차",
  kdwhxrty: "마이너 먼저",
  kewammtp: "개",
  kfe3rgpe: "카드",
  kfnkjoro: "연이가 카드 이야기를 한 장씩 엮어, 오늘의 마음 곁에 오래 머무는 타로 도감으로 묶었습니다.",
  kftcqqfx: "오늘 당신에게 필요한 카드는 이미 마음속에 남아 있어요.",
  kfvqms0a: "다음 카드 보기",
  khjystua: "현재 꿀방울",
  khux287z: "다음",
  kibbunuu: "달빛 아래에서 아직 맞는 카드를 찾지 못했어요. 이름이나 키워드를 조금 다르게 불러보세요.",
  kihtwum1: "운명찻집_달빛타로카드앨범_전체.pdf",
  kiixx8vi: "모두 펼치기",
  kjcpkfd5: "나에게 던지는 질문",
  kjvmkajp: "장 PDF",
  kk03sxsx: "전체",
  kkoogge5: "돈",
  kkr3uulf: "CODE DESTINY · 운명 찻집",
  kl0nq8gl: "카드 이름·키워드 검색",
  klirlgb2: "꿀방울 10개로 앨범 열기",
  km05ijjs: "연이의 메시지",
  kmlqylfg: "카드 상세 닫기",
  kmzmv9si: "전체 PDF 다운로드",
  kmzwjems: "달빛 타로 앨범 닫기",
  knbpabsn: "와… 꿀방울이 10개나 모였네요? 그럼 제가 아껴둔 달빛 타로 앨범을 살짝 열어드릴게요.",
  knnv85fh: "메이저 아르카나",
  ko4yt45j: "사랑",
  ko8qlqfx: "정방향",
  kodlrapd: "이제 이 카드첩은 손님 곁에 열려 있어요. 마음이 흔들릴 때마다 달빛 아래서 천천히 넘겨보세요.",
  koq4dt2a: "달빛 아래에서 당신의 타로 앨범을 준비하는 중이에요.",
  kp7ramna: "역방향 의미",
  kph0fvpr: "소드",
  kpqljmoc: "이름순",
  kpuzku7s: "생성일",
  kq8n5rri: "앨범 해금 완료",
  kqcshbql: "잠시 후 다시 확인해주세요.",
  kqejmfjk: "카드 이미지를 한 장씩 불러오고 있어요.",
  kqjhespg: "78장의 이야기가 기다리고 있어요",
  kqjimwmt: "운명 찻집",
  kqnfouen: "모두 덮기",
  kqvrsm7l: "정방향 의미",
  kr7i3yto: "완드",
  krvhfnlu: "아직 달빛 속에 잠든 카드",
  kskfjn2j: "장",
  ksnvhf6c: "다음 카드",
  ksoa9rli: "1장 PDF",
  ksp1zhrt: "운명의 찻집에서 상담을 보면 꿀방울을 모을 수 있어요.",
  ktz26j2g: "해금 카드",
  kuqqlnlp: "연이가 카드 이야기를 한 장씩 엮고 있어요.",
  kv2kg2cx: "이전 카드 보기",
  kvgpq4qo: "선택 카드 PDF",
  kw9ktd7m: "PDF 다운로드가 완료됐어요.",
  kwqkjwzw: "관계",
  kwuaodmd: "카드를 열어보세요. 한 장 한 장에 담긴 연이의 이야기가 손님을 기다리고 있어요. 꿀방울 10개를 모으면 78장의 타로 도감이 달빛 아래 펼쳐집니다.",
  kwxkbj5k: "78장의 카드가 달빛 찻집의 도감처럼 조용히 펼쳐집니다.",
  kx5gbrnz: "PDF 생성 중이에요. 잠시만 기다려 주세요.",
  kxhy61lm: "해금 필요",
  kxj8ah4r: "보유 꿀방울",
  kxjbdi0j: "이전 카드",
  kyikujnc: "스토리 잠금이 걸려 있어요. 달빛이 조금만 더 차오르면 카드첩이 열릴 거예요.",
  kyny7lmn: "꿀방울이 조금 더 필요해요",
  // 아래는 런타임 치환 자리를 갖는 문장이다. 조각내면 어순이 한국어 기준으로 굳으므로
  // 문장 전체를 한 키로 두고 {슬롯}만 채운다.
  pdfFileNameSingle: "운명찻집_타로카드_{name}.pdf",
  selectedPdfLabel: "선택 {count}장 PDF",
  cardShelfToggleAria: "{title} 달빛 서가에 담기 {action}",
  cardShelfRemove: "해제",
  cardShelfAdd: "담음",
  cardCoverAria: "{title} 카드 다시 덮기",
  cardRevealAria: "{title} 카드 펼쳐 앞면 보기",
  cardDetailAria: "{title} {titleEn} 카드 자세히 보기",
  cardImageAlt: "{title} {titleEn} 타로 카드",
  honeyCountText: "{count}개",
  cardZoomAlt: "{title} {titleEn} 타로 카드 크게 보기",
  cardPositionAria: "카드 {index}번째, 전체 {total}장",
  cardSinglePdfAria: "{title} 한 장 PDF 다운로드",
};

export default function DestinyCafeTarotAlbum({
  isOpen,
  honeyDrops,
  onClose,
  onHoneyDropsChange,
  onRequestRefresh,
}: DestinyCafeTarotAlbumProps) {
  const copy = useTeaHouseCopy("tarotAlbum", KO);
  const locale = useLocale();
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
  const [flippedById, setFlippedById] = useState<Record<string, boolean>>({});
  const [revealedById, setRevealedById] = useState<Record<string, boolean>>({});
  const prefersReducedMotion = usePrefersReducedMotion();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const pdfRenderRef = useRef<HTMLDivElement | null>(null);
  // 조각을 하나씩 사전으로 덮어 앨범을 다시 조립한다.
  const templates = useTeaHouseCopy("tarotAlbumTemplates", tarotAlbumTemplates);
  const suits = useTeaHouseCopy("tarotAlbumSuits", suitMeta);
  const ranks = useTeaHouseCopy("tarotAlbumRanks", rankMetaByNumber);
  const major = useTeaHouseCopy("tarotAlbumMajor", majorAlbumNarratives);
  const albumCards = useMemo(
    () =>
      buildTarotAlbumCards({
        ...tarotAlbumParts,
        templates,
        suitMeta: suits,
        rankMeta: ranks,
        majorNarratives: major,
      }),
    [major, ranks, suits, templates],
  );
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
  const cardBackUrl = fortuneTeaHouseAssets.premium.tarotCardBack;
  const backgroundDesktopUrl = fortuneTeaHouseAssets.premium.landingDesktop;
  const backgroundMobileUrl = fortuneTeaHouseAssets.premium.landingMobile;
  const yeoniPoseFrames = fortuneTeaHouseAssets.yeoni.transparent.tarotPoseFrames;
  const isPdfBusy = Boolean(pdfStatus && ["preparing", "images", "stories", "rendering"].includes(pdfStatus.phase));
  const lockDialogue = isHoneyDisabled
    ? copy.kqcshbql
    : isAlbumUnlocked
      ? copy.kodlrapd
      : canUnlock
        ? copy.knbpabsn
        : copy.kyikujnc;
  const filteredCards = useMemo(() => {
    const query = normalizeSearch(searchText);
    const nextCards = albumCards.filter((card) => {
      const matchesFilter = activeFilter === "all"
        || (activeFilter === "major" ? card.arcana === "major" : card.suit === activeFilter);
      if (!matchesFilter) return false;
      if (!query) return true;
      return cardSearchText(card).includes(query);
    });
    return sortTarotCards(nextCards, sortMode, locale);
  }, [activeFilter, albumCards, locale, searchText, sortMode]);

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
      setFlippedById({});
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

  const handleFlipCard = useCallback((card: TarotAlbumStoryCard) => {
    setFlippedById((current) => ({ ...current, [card.id]: true }));
    setRevealedById((current) => (current[card.id] ? current : { ...current, [card.id]: true }));
  }, []);

  const handleCoverCard = useCallback((card: TarotAlbumStoryCard) => {
    setFlippedById((current) => ({ ...current, [card.id]: false }));
  }, []);

  const allVisibleFlipped = filteredCards.length > 0 && filteredCards.every((card) => flippedById[card.id]);
  const selectedCardIndex = selectedCard ? albumCards.findIndex((card) => card.id === selectedCard.id) : -1;

  const handleFlipAllVisible = useCallback(() => {
    setFlippedById((current) => {
      const next = { ...current };
      filteredCards.forEach((card) => {
        next[card.id] = true;
      });
      return next;
    });
    setRevealedById((current) => {
      const next = { ...current };
      filteredCards.forEach((card) => {
        next[card.id] = true;
      });
      return next;
    });
  }, [filteredCards]);

  const handleCoverAllVisible = useCallback(() => {
    setFlippedById((current) => {
      const next = { ...current };
      filteredCards.forEach((card) => {
        next[card.id] = false;
      });
      return next;
    });
  }, [filteredCards]);

  const handleSelectAdjacent = useCallback((direction: -1 | 1) => {
    if (!selectedCard) return;
    const currentIndex = albumCards.findIndex((card) => card.id === selectedCard.id);
    if (currentIndex < 0) return;
    const nextIndex = (currentIndex + direction + albumCards.length) % albumCards.length;
    setSelectedCard(albumCards[nextIndex]);
  }, [albumCards, selectedCard]);

  const handleDownloadPdf = useCallback(async (mode: TarotPdfMode, focusCard?: TarotAlbumStoryCard) => {
    if (!isAlbumUnlocked) {
      setPdfStatus({ phase: "error", message: copy.k6jsudop });
      return;
    }
    const cards = mode === "all" ? albumCards : mode === "selected" ? selectedCards : focusCard ? [focusCard] : [];
    if (!cards.length) {
      setPdfStatus({ phase: "error", message: copy.k2tt3wwq });
      return;
    }

    setPdfCards(cards);
    setPdfStatus({ phase: "preparing", message: copy[pdfMessageByPhase.preparing] });
    try {
      await waitForNextPaint();
      const renderRoot = pdfRenderRef.current;
      if (!renderRoot) throw new Error("PDF_RENDER_ROOT_MISSING");

      setPdfStatus({ phase: "images", message: copy[pdfMessageByPhase.images] });
      await waitForPdfImages(renderRoot);

      setPdfStatus({ phase: "stories", message: copy[pdfMessageByPhase.stories] });
      await waitForNextPaint();

      setPdfStatus({ phase: "rendering", message: copy[pdfMessageByPhase.rendering] });
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
          // Capture one page without loading the other 80 pages into every canvas clone.
          ignoreElements: element => element.hasAttribute("data-tarot-pdf-page") && element !== pages[index],
        });
        const imageData = canvas.toDataURL("image/jpeg", 0.82);
        pdf.addImage(imageData, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
      }

      pdf.save(getPdfFileName(mode, cards, copy));
      setPdfStatus({ phase: "done", message: copy[pdfMessageByPhase.done] });
    } catch (error) {
      console.warn("[FortuneTeaHouse] Tarot album PDF failed", error);
      setPdfStatus({ phase: "error", message: copy[pdfMessageByPhase.error] });
    } finally {
      setPdfCards([]);
    }
    // copy 를 의존성에 둔다 — 빠뜨리면 로케일을 바꿔도 이 콜백이 옛 문구(PDF 파일명·진행 메시지)를 계속 쓴다.
  }, [albumCards, copy, isAlbumUnlocked, selectedCards]);

  if (!isOpen) return null;

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div
      className={cx(albumStyles.world, "fixed inset-0 z-[70] min-h-screen overflow-y-auto")}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tarotAlbumTitle"
      onMouseDown={handleBackdropMouseDown}
    >
      <TarotAlbumMotionStyles yeoniPoseFrames={yeoniPoseFrames} />
      <div className="pointer-events-none fixed inset-0" aria-hidden>
        <div className="absolute inset-0 hidden bg-cover bg-center sm:block" style={{ backgroundImage: `url("${backgroundDesktopUrl}")` }} />
        <div className="absolute inset-0 bg-cover bg-center sm:hidden" style={{ backgroundImage: `url("${backgroundMobileUrl}")` }} />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(10,8,24,.74),rgba(10,8,24,.82)_46%,rgba(10,8,24,.94))]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_72%_14%,rgba(232,213,163,.16),transparent_56%)]" />
      </div>
      <span className="pointer-events-none fixed left-1/2 top-[-7rem] h-80 w-80 -translate-x-1/2 rounded-full bg-twilight-violet/20 blur-3xl" aria-hidden />
      <span className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(237,239,245,.05)_0_1px,transparent_2px),radial-gradient(circle_at_78%_24%,rgba(156,135,212,.04)_0_1px,transparent_2px),radial-gradient(circle_at_34%_72%,rgba(216,179,108,.03)_0_1px,transparent_2px),radial-gradient(circle_at_88%_78%,rgba(245,239,255,.02)_0_1px,transparent_2px)] opacity-100" aria-hidden />
      <span className="pointer-events-none fixed inset-x-0 bottom-0 h-56 bg-[radial-gradient(ellipse_at_bottom,rgba(0,0,0,.72),transparent_70%)]" aria-hidden />

      <button
        ref={closeButtonRef}
        type="button"
        className="fixed right-4 top-4 z-[75] grid h-11 w-11 place-items-center rounded-full border border-champagne-gold/25 bg-white/[0.07] text-champagne-gold shadow-[0_16px_40px_rgba(0,0,0,.35)] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-champagne-gold/50 hover:bg-white/[0.11] focus:outline-none focus:ring-2 focus:ring-champagne-gold/50 sm:right-6 sm:top-6"
        onClick={onClose}
        aria-label={copy.kmzwjems}
      >
        <X size={18} aria-hidden />
      </button>

      <section data-html2canvas-ignore="true" className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-16 sm:px-6 lg:px-8">
        {isAlbumUnlocked ? (
          <div className="flex flex-1 flex-col gap-5">
            <TarotAlbumHero
              currentHoneyDrops={currentHoneyDrops}
              totalCards={albumCards.length}
              selectedCount={selectedCount}
              pdfBusy={isPdfBusy}
              onDownloadAll={() => handleDownloadPdf("all")}
              onDownloadSelected={() => handleDownloadPdf("selected")}
            />
            <TarotPdfStatusBox status={pdfStatus} />
            <div className={albumStyles.toolbar}>
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(210px,260px)_minmax(260px,360px)] xl:items-center">
                <TarotAlbumFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />
                <TarotAlbumSort sortMode={sortMode} onSortModeChange={setSortMode} />
                <TarotAlbumSearch searchText={searchText} onSearchTextChange={setSearchText} />
              </div>
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2.5">
                <p className="text-xs font-bold text-moonveil-silver" aria-live="polite">

                  {copy.kfe3rgpe} <span className="font-mono font-black tabular-nums text-champagne-gold">{filteredCards.length}</span>{copy.kskfjn2j}
                  {selectedCount ? (
                    <>
                      {" · "}{copy.kb6dudtb} <span className="font-mono font-black tabular-nums text-champagne-gold">{selectedCount}</span>{copy.kskfjn2j}
                    </>
                  ) : null}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.055] px-3.5 text-xs font-black text-moonveil-silver transition hover:border-champagne-gold/35 hover:text-champagne-gold focus:outline-none focus:ring-2 focus:ring-champagne-gold/45 disabled:opacity-50"
                    onClick={allVisibleFlipped ? handleCoverAllVisible : handleFlipAllVisible}
                    disabled={!filteredCards.length}
                  >
                    {allVisibleFlipped ? <RotateCcw size={13} aria-hidden /> : <Sparkles size={13} aria-hidden />}
                    {allVisibleFlipped ? copy.kqnfouen : copy.kiixx8vi}
                  </button>
                  {selectedCount ? (
                    <button
                      type="button"
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-champagne-gold/35 bg-champagne-gold/12 px-3.5 text-xs font-black text-champagne-gold transition hover:border-champagne-gold/60 focus:outline-none focus:ring-2 focus:ring-champagne-gold/45 disabled:opacity-50"
                      onClick={() => handleDownloadPdf("selected")}
                      disabled={isPdfBusy}
                    >
                      {isPdfBusy ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Download size={13} aria-hidden />}

                      {copy.kcbceqsz} {selectedCount}{copy.kjvmkajp}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            <TarotAlbumGrid
              cards={filteredCards}
              selectedCardIds={selectedCardIds}
              imageFailedById={imageFailedById}
              flippedById={flippedById}
              revealedById={revealedById}
              prefersReducedMotion={prefersReducedMotion}
              cardBackUrl={cardBackUrl}
              onImageError={handleImageError}
              onSelectCard={setSelectedCard}
              onTogglePdfCard={handleTogglePdfCard}
              onFlipCard={handleFlipCard}
              onCoverCard={handleCoverCard}
            />
            {!filteredCards.length ? (
              <p className="rounded-2xl border border-moonveil-silver/15 bg-white/[0.045] px-4 py-5 text-center text-sm leading-relaxed text-moonveil-silver/80">

                {copy.kibbunuu}
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
            guest={Boolean(honeyDrops && !honeyDrops.authenticated)}
            onRequestRefresh={onRequestRefresh}
            onUnlock={async () => {
              if (isAlbumUnlocked) return;
              if (isHoneyLoading || isHoneyDisabled) {
                setUnlockMessage(copy.kqcshbql);
                return;
              }
              if (currentHoneyDrops < TAROT_ALBUM_UNLOCK_COST) {
                setUnlockMessage(copy.ksp1zhrt);
                return;
              }
              setIsUnlocking(true);
              setUnlockMessage("");
              try {
                const response = await authFetch("/api/fortune-tea-house/honey-drops/tarot-album/unlock", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ idempotencyKey: `yeoni-tarot-album-${Date.now()}` }),
                  cache: "no-store",
                });
                const payload = (await response.json().catch(() => null)) as TarotAlbumApiResponse | null;
                const nextHoneyDrops = normalizeHoneyDropsState(payload?.honeyDrops);
                if (nextHoneyDrops) onHoneyDropsChange(nextHoneyDrops);
                if (!response.ok || !payload?.success) {
                  setUnlockMessage(payload?.message || copy.kqcshbql);
                  return;
                }
                setUnlockMessage(copy.k9bz0eod);
              } catch {
                setUnlockMessage(copy.kqcshbql);
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
          cardIndex={selectedCardIndex}
          cardTotal={albumCards.length}
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

function TarotAlbumHero({ currentHoneyDrops, totalCards, selectedCount, pdfBusy, onDownloadAll, onDownloadSelected }: {
  currentHoneyDrops: number; totalCards: number; selectedCount: number; pdfBusy: boolean;
  onDownloadAll: () => void; onDownloadSelected: () => void;
}) {
  const copy = useTeaHouseCopy("tarotAlbum", KO);
  const visit = useTeaHouseCopy("albumVisit", albumVisitCopy);
  return <header className={albumStyles.hero}>
    <div className={albumStyles.heroCopy}>
      <Image src="/images/fortune-tea-house/moonlight-lotus-ornament.webp" alt="" width={120} height={120} className={albumStyles.moonOrnament}/><span className={albumStyles.eyebrow}>{visit.chapter}</span>
      <h2 id="tarotAlbumTitle">{copy.k1yzt0ya}</h2><p>{copy.kampzo9z}</p>
      <div className={albumStyles.meta}><span>{copy.kq8n5rri}</span><span>{copy.kfe3rgpe} {totalCards}{copy.kskfjn2j}</span><span>{copy.khjystua} {currentHoneyDrops}</span></div>
      <div className={albumStyles.actions}>
        <PdfActionButton onClick={onDownloadAll} disabled={pdfBusy} label={copy.kmzmv9si}/>
        <PdfActionButton onClick={onDownloadSelected} disabled={pdfBusy || selectedCount === 0} secondary label={selectedCount ? copy.selectedPdfLabel.replace("{count}", String(selectedCount)) : copy.kvgpq4qo}/>
      </div><p className={albumStyles.note}>{visit.downloadNote}</p>
    </div>
    <Image className={albumStyles.heroArt} src="/images/fortune-tea-house/yeoni-moonlight-novel.webp" alt={visit.humanAlt} width={768} height={768} sizes="(max-width:700px) 100vw,45vw"/>
  </header>;
}

function PdfActionButton({
  onClick,
  disabled,
  label,
  secondary = false,
}: {
  secondary?: boolean;
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      className={secondary ? albumStyles.secondary : albumStyles.primary}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
    >
      <Download size={17} aria-hidden />
      {label}
    </button>
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
        isError ? "border-rose-200/24 bg-rose-200/10 text-rose-50" : "border-champagne-gold/18 bg-white/[0.055] text-pearl-mist/88",
      )}
      role={isError ? "alert" : "status"}
      aria-live="polite"
    >
      <span className="grid h-9 w-9 place-items-center rounded-full border border-champagne-gold/22 bg-champagne-gold/10 text-champagne-gold">
        {isBusy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : isError ? <X size={16} aria-hidden /> : <CheckCircle2 size={16} aria-hidden />}
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
  const copy = useTeaHouseCopy("tarotAlbum", KO);
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]" role="tablist" aria-label={copy.kbfum84c}>
      {tarotAlbumTabs.map((tab) => {
        const active = activeFilter === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={cx(
              "min-h-11 flex-none rounded-full border px-4 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-champagne-gold/45",
              active
                ? "border-champagne-gold/45 bg-gradient-to-r from-champagne-gold/24 via-twilight-violet/18 to-champagne-gold/18 text-champagne-gold shadow-[0_0_24px_rgba(216,179,108,.16)]"
                : "border-white/10 bg-white/[0.055] text-moonveil-silver/78 hover:border-champagne-gold/28 hover:bg-white/[0.08] hover:text-champagne-gold",
            )}
            onClick={() => onFilterChange(tab.id)}
          >
            {copy[tab.labelKey]}
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
  const copy = useTeaHouseCopy("tarotAlbum", KO);
  return (
    <label className="grid min-h-12 grid-cols-[20px_minmax(0,1fr)] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.07] px-4 text-moonveil-silver/75 shadow-[inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-md focus-within:border-champagne-gold/35 focus-within:ring-2 focus-within:ring-champagne-gold/30">
      <SlidersHorizontal size={17} aria-hidden />
      <span className="sr-only">{copy.kceymbv8}</span>
      <select
        value={sortMode}
        className="w-full min-w-0 bg-transparent text-sm font-black text-champagne-gold outline-none"
        onChange={(event) => onSortModeChange(event.target.value as TarotAlbumSortMode)}
      >
        {tarotAlbumSortOptions.map((option) => (
          <option key={option.id} value={option.id} className="bg-midnight-ink text-champagne-gold">
            {copy[option.labelKey]}
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
  const copy = useTeaHouseCopy("tarotAlbum", KO);
  return (
    <label className="grid min-h-12 grid-cols-[20px_minmax(0,1fr)] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.07] px-4 text-moonveil-silver/75 shadow-[inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-md focus-within:border-champagne-gold/35 focus-within:ring-2 focus-within:ring-champagne-gold/30">
      <Search size={17} aria-hidden />
      <span className="sr-only">{copy.k35zodw1}</span>
      <input
        type="search"
        value={searchText}
        aria-label={copy.kcojnagb}
        placeholder={copy.kl0nq8gl}
        className="w-full min-w-0 bg-transparent text-sm font-semibold text-champagne-gold outline-none placeholder:text-moonveil-silver/70"
        onChange={(event) => onSearchTextChange(event.target.value)}
      />
    </label>
  );
}

function TarotAlbumGrid({
  cards,
  selectedCardIds,
  imageFailedById,
  flippedById,
  revealedById,
  prefersReducedMotion,
  cardBackUrl,
  onImageError,
  onSelectCard,
  onTogglePdfCard,
  onFlipCard,
  onCoverCard,
}: {
  cards: TarotAlbumStoryCard[];
  selectedCardIds: Record<string, boolean>;
  imageFailedById: Record<string, boolean>;
  flippedById: Record<string, boolean>;
  revealedById: Record<string, boolean>;
  prefersReducedMotion: boolean;
  cardBackUrl: string;
  onImageError: (card: TarotAlbumStoryCard) => void;
  onSelectCard: (card: TarotAlbumStoryCard) => void;
  onTogglePdfCard: (card: TarotAlbumStoryCard) => void;
  onFlipCard: (card: TarotAlbumStoryCard) => void;
  onCoverCard: (card: TarotAlbumStoryCard) => void;
}) {
  return (
    <div className={albumStyles.shelf} aria-live="polite">
      {cards.map((card, index) => (
        <TarotAlbumCardItem
          key={card.id}
          card={card}
          selectedForPdf={Boolean(selectedCardIds[card.id])}
          imageFailed={Boolean(imageFailedById[card.id])}
          flipped={Boolean(flippedById[card.id])}
          revealed={Boolean(revealedById[card.id])}
          prefersReducedMotion={prefersReducedMotion}
          cardBackUrl={cardBackUrl}
          onImageError={onImageError}
          onSelectCard={onSelectCard}
          onTogglePdfCard={onTogglePdfCard}
          onFlipCard={onFlipCard}
          onCoverCard={onCoverCard}
          staggerDelay={prefersReducedMotion ? 0 : Math.min(index, 12) * 55}
        />
      ))}
    </div>
  );
}

function TarotAlbumCardItem({
  card,
  selectedForPdf,
  imageFailed,
  flipped,
  revealed,
  prefersReducedMotion,
  cardBackUrl,
  onImageError,
  onSelectCard,
  onTogglePdfCard,
  onFlipCard,
  onCoverCard,
  staggerDelay = 0,
}: {
  card: TarotAlbumStoryCard;
  selectedForPdf: boolean;
  imageFailed: boolean;
  flipped: boolean;
  revealed: boolean;
  prefersReducedMotion: boolean;
  cardBackUrl: string;
  onImageError: (card: TarotAlbumStoryCard) => void;
  onSelectCard: (card: TarotAlbumStoryCard) => void;
  onTogglePdfCard: (card: TarotAlbumStoryCard) => void;
  onFlipCard: (card: TarotAlbumStoryCard) => void;
  onCoverCard: (card: TarotAlbumStoryCard) => void;
  staggerDelay?: number;
}) {
  const copy = useTeaHouseCopy("tarotAlbum", KO);
  const [burst, setBurst] = useState(false);
  const burstTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (burstTimer.current) window.clearTimeout(burstTimer.current);
  }, []);

  const handleReveal = useCallback(() => {
    onFlipCard(card);
    if (prefersReducedMotion) return;
    setBurst(true);
    if (burstTimer.current) window.clearTimeout(burstTimer.current);
    burstTimer.current = window.setTimeout(() => setBurst(false), 840);
  }, [card, onFlipCard, prefersReducedMotion]);

  return (
    <article
      className="group relative overflow-hidden rounded-2xl border border-champagne-gold/15 bg-midnight-ink/40 p-2 text-left shadow-[0_18px_44px_rgba(0,0,0,.24)] backdrop-blur-md transition-all duration-300 animate-moon-rise hover:-translate-y-1 hover:border-champagne-gold/40 hover:shadow-moon-glow focus-within:ring-2 focus-within:ring-champagne-gold/45"
      style={{ animationDelay: `${staggerDelay}ms` }}
    >
      <button
        type="button"
        className={cx(
          "absolute right-3 top-3 z-30 grid h-9 w-9 place-items-center rounded-full border backdrop-blur-xl transition focus:outline-none focus:ring-2 focus:ring-champagne-gold/50",
          selectedForPdf
            ? "border-champagne-gold/55 bg-champagne-gold/22 text-champagne-gold"
            : "border-white/15 bg-black/30 text-moonveil-silver hover:border-champagne-gold/35 hover:text-champagne-gold",
        )}
        aria-pressed={selectedForPdf}
        aria-label={copy.cardShelfToggleAria.replace("{title}", card.titleKo).replace("{action}", selectedForPdf ? copy.cardShelfRemove : copy.cardShelfAdd)}
        onClick={() => onTogglePdfCard(card)}
      >
        {selectedForPdf ? <MoonPhaseSeal full /> : <MoonPhaseSeal />}
      </button>
      {flipped ? (
        <button
          type="button"
          className="absolute left-3 top-3 z-30 grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/30 text-moonveil-silver backdrop-blur-xl transition hover:border-champagne-gold/35 hover:text-champagne-gold focus:outline-none focus:ring-2 focus:ring-champagne-gold/50"
          aria-label={copy.cardCoverAria.replace("{title}", card.titleKo)}
          onClick={() => onCoverCard(card)}
        >
          <RotateCcw size={15} aria-hidden />
        </button>
      ) : null}

      <div className="cdFlipViewport relative block w-full">
        <div className={cx("cdFlipInner", flipped && "is-flipped", burst && "is-burst")}>
          <button
            type="button"
            className="cdFlipFace cdFlipBack block border border-champagne-gold/18 bg-midnight-ink text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne-gold/60"
            style={{ pointerEvents: flipped ? "none" : "auto" }}
            aria-hidden={flipped}
            tabIndex={flipped ? -1 : 0}
            aria-label={copy.cardRevealAria.replace("{title}", card.titleKo)}
            onClick={handleReveal}
          >
            <Image
              src={cardBackUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 48vw, (max-width: 1280px) 25vw, 180px"
              unoptimized
              loading="lazy"
              className="object-cover"
            />
            <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(216,179,108,.16),transparent_46%)]" />
            <span className="pointer-events-none absolute inset-x-2 bottom-2 flex items-center justify-center gap-1 rounded-full border border-champagne-gold/25 bg-black/45 px-2 py-1 text-[0.62rem] font-black text-champagne-gold opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
              <Sparkles size={11} aria-hidden />

              {copy.k1iqbrdw}
            </span>
          </button>

          <button
            type="button"
            className="cdFlipFace cdFlipFront block border border-champagne-gold/24 bg-midnight-ink text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-champagne-gold/60"
            style={{ pointerEvents: flipped ? "auto" : "none" }}
            aria-hidden={!flipped}
            tabIndex={flipped ? 0 : -1}
            aria-label={copy.cardDetailAria.replace("{title}", card.titleKo).replace("{titleEn}", card.titleEn)}
            onClick={() => onSelectCard(card)}
          >
            {!revealed ? (
              <span className="cdShimmer absolute inset-0" />
            ) : card.imageSrc && !imageFailed ? (
              <Image
                src={card.imageSrc}
                alt={copy.cardImageAlt.replace("{title}", card.titleKo).replace("{titleEn}", card.titleEn)}
                className="object-cover transition duration-500 group-hover:scale-[1.03]"
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
            <span className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-champagne-gold/0 transition group-hover:ring-champagne-gold/34 group-focus-within:ring-champagne-gold/34" />
          </button>
        </div>
        {burst && !prefersReducedMotion ? <CardPetalBurst /> : null}
      </div>

      <span className="mt-3 grid gap-1 px-1 pb-1">
        <strong className="truncate font-premium text-sm font-black leading-tight text-pearl-mist sm:text-[0.96rem]">{card.titleKo}</strong>
        <em className="truncate text-[0.72rem] font-semibold not-italic text-moonveil-silver">{card.titleEn}</em>
        <span className="mt-1 inline-flex w-fit rounded-full border border-champagne-gold/18 bg-champagne-gold/8 px-2 py-1 text-[0.68rem] font-extrabold text-champagne-gold">
          {card.suitLabel}
        </span>
      </span>
    </article>
  );
}

function CardPetalBurst() {
  const petals = Array.from({ length: 7 });
  return (
    <span className="pointer-events-none absolute left-1/2 top-[42%] z-20 block" aria-hidden>
      {petals.map((_, index) => {
        const angle = (index / petals.length) * Math.PI * 2;
        const distance = 40 + (index % 3) * 11;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        const rotation = (index % 2 ? 1 : -1) * (80 + index * 12);
        return (
          <span
            key={index}
            className="absolute left-0 top-0 block h-2.5 w-2"
            style={{
              borderRadius: "62% 62% 55% 55% / 74% 74% 40% 40%",
              background: "linear-gradient(158deg, rgba(244,190,209,.95), rgba(234,208,137,.85))",
              boxShadow: "0 0 8px rgba(232,213,163,.5)",
              ["--cd-pb-x" as string]: `${x}px`,
              ["--cd-pb-y" as string]: `${y}px`,
              ["--cd-pb-r" as string]: `${rotation}deg`,
              animation: "tarotPetalBurst .82s cubic-bezier(.2,.7,.3,1) both",
            } as CSSProperties}
          />
        );
      })}
    </span>
  );
}

function MoonPhaseSeal({ full = false }: { full?: boolean }) {
  if (full) {
    return (
      <svg viewBox="0 0 20 20" fill="none" aria-hidden>
        <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.9" />
        <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
      <circle cx="10" cy="10" r="8.5" opacity="0.3" />
      <path d="M 10 2 Q 17 10 10 18 Q 10 18 10 2" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

function TarotAlbumLockPanel({ currentHoneyDrops, isHoneyLoading, canUnlock, isUnlocking, unlockMessage, lockDialogue, guest, onUnlock, onRequestRefresh }: {
  currentHoneyDrops: number; isHoneyLoading: boolean; canUnlock: boolean; isUnlocking: boolean;
  unlockMessage: string; lockDialogue: string; guest: boolean; onUnlock: () => void; onRequestRefresh: () => Promise<boolean>;
}) {
  const copy = useTeaHouseCopy("tarotAlbum", KO);
  const visit = useTeaHouseCopy("albumVisit", albumVisitCopy);
  const [refreshing, setRefreshing] = useState(false);
  const progress = visit.progress.replace("{count}", String(currentHoneyDrops)).replace("{cost}", String(TAROT_ALBUM_UNLOCK_COST));
  return <div className={albumStyles.lock}>
    <div className={albumStyles.lockArt}><Image src="/images/fortune-tea-house/yeoni-moonlight-novel.webp" alt={visit.humanAlt} fill sizes="(max-width:700px) 100vw,45vw"/></div>
    <div className={albumStyles.lockCopy}><Image src="/images/fortune-tea-house/moonlight-lotus-ornament.webp" alt="" width={110} height={110} className={albumStyles.moonOrnament}/>
      <span className={albumStyles.eyebrow}>{visit.eyebrow}</span><h2 id="tarotAlbumTitle">{copy.k1yzt0ya}</h2><p>{visit.description.replace("{cost}", String(TAROT_ALBUM_UNLOCK_COST))}</p>
      <span className={albumStyles.balance}>{guest ? visit.guest : isHoneyLoading ? visit.loading : progress}</span>
      {!guest && <progress max={TAROT_ALBUM_UNLOCK_COST} value={Math.min(currentHoneyDrops,TAROT_ALBUM_UNLOCK_COST)} aria-label={progress}/>}
      <div className={albumStyles.actions}>
        {guest ? <Link className={albumStyles.primary} href="/login/?next=%2Ffortune-tea-house%2F">{visit.login}</Link> : <button type="button" className={albumStyles.primary} disabled={!canUnlock || isUnlocking} onClick={onUnlock}>{isUnlocking ? <Loader2 size={18} className="animate-spin" aria-hidden/> : <BookOpen size={18} aria-hidden/>}{isUnlocking ? copy.k1h4mohy : canUnlock ? copy.klirlgb2 : copy.kyny7lmn}</button>}
        {!guest && <button type="button" className={albumStyles.secondary} disabled={refreshing} onClick={async () => { setRefreshing(true); try { await onRequestRefresh(); } finally { setRefreshing(false); } }}>{refreshing ? visit.loading : visit.retry}</button>}
      </div><blockquote role="status">{unlockMessage || lockDialogue}</blockquote>
    </div>
  </div>;
}

function TarotAlbumMotionStyles({ yeoniPoseFrames }: { yeoniPoseFrames: readonly string[] }) {
  const [f1, f2, f3, f4] = yeoniPoseFrames;
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
      @keyframes tarotPetalDrift {
        0% { opacity: 0; transform: translate3d(0, -24px, 0) rotate(0deg); }
        12% { opacity: .6; }
        88% { opacity: .42; }
        100% { opacity: 0; transform: translate3d(26px, 320px, 0) rotate(240deg); }
      }
      @keyframes tarotTwinkle {
        from { opacity: .2; transform: scale(.65); }
        to { opacity: .92; transform: scale(1.12); }
      }
      @keyframes tarotGentleFloat {
        0%, 100% { transform: translateY(-6px); }
        50% { transform: translateY(6px); }
      }
      @keyframes tarotGoldShimmer {
        0% { background-position: -180% 0; }
        100% { background-position: 180% 0; }
      }
      @keyframes tarotOrbit {
        from { transform: rotate(0deg) translateX(var(--cd-orbit-r, 78px)) rotate(0deg); }
        to { transform: rotate(360deg) translateX(var(--cd-orbit-r, 78px)) rotate(-360deg); }
      }
      @keyframes tarotPetalBurst {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(.2) rotate(0deg); }
        24% { opacity: 1; }
        100% { opacity: 0; transform: translate(calc(-50% + var(--cd-pb-x, 0px)), calc(-50% + var(--cd-pb-y, 0px))) scale(1) rotate(var(--cd-pb-r, 90deg)); }
      }
      @keyframes tarotFlipGlow {
        0% { box-shadow: 0 0 0 rgba(216,179,108,0); }
        42% { box-shadow: 0 0 60px -4px rgba(216,179,108,.5), 0 0 90px -20px rgba(156,135,212,.4); }
        100% { box-shadow: 0 0 22px -6px rgba(216,179,108,.16); }
      }
      @keyframes tarotCharacterIdle {
        0%, 100% { transform: translateY(0) rotate(-1.3deg) scale(1); }
        50% { transform: translateY(-7px) rotate(1.3deg) scale(1.022); }
      }
      @keyframes tarotCharacterAura {
        0%, 100% { opacity: .42; transform: translate(-50%, -50%) scale(.94); }
        50% { opacity: .72; transform: translate(-50%, -50%) scale(1.08); }
      }
      @keyframes tarotCharacterPoseCycle {
        0%, 20%   { background-image: url("${f1}"); }
        25%, 45%  { background-image: url("${f2}"); }
        50%, 70%  { background-image: url("${f3}"); }
        75%, 95%  { background-image: url("${f4}"); }
        100%      { background-image: url("${f1}"); }
      }

      .cdFlipViewport { perspective: 1000px; }
      .cdFlipInner {
        position: relative;
        width: 100%;
        aspect-ratio: 2 / 3;
        transform-style: preserve-3d;
        transition: transform .62s cubic-bezier(.4, 0, .2, 1);
      }
      .cdFlipInner.is-flipped { transform: rotateY(180deg); }
      .cdFlipFace {
        position: absolute;
        inset: 0;
        border-radius: .75rem;
        overflow: hidden;
        backface-visibility: hidden;
        -webkit-backface-visibility: hidden;
      }
      .cdFlipFront { transform: rotateY(180deg); }
      .cdFlipInner.is-burst { animation: tarotFlipGlow .8s cubic-bezier(.4, 0, .2, 1) both; }

      /* 🔴 셔머는 앞면(.cdFlipFront)에만 있고 그 면은 카드가 뒤집히기 전까지
         backface-visibility:hidden 이라 보이지 않는다. 선택자를 좁히지 않으면 안 보이는 카드
         78장이 background-position 을 매 프레임 움직여 앨범 스크롤이 통째로 끊긴다.
         실측 2026-08-30 (CPU 4배·Slow4G·3회): 끊긴 프레임 48.8% → 1.7%, 메인스레드 3135ms → 1696ms,
         측정 직전 실행 중 애니메이션 108개 → 30개. 재현: npm run perf:app-route -- --segments=album
         🔴 handleFlipCard 가 flipped 와 revealed 를 같은 배치에서 켜므로 'flipped && !revealed' 상태는
         존재하지 않는다 — 즉 이 선택자는 셔머를 사실상 완전히 멈춘다. 화면에서 사라지는 연출은 없고
         (그 span 은 늘 뒤쪽 면이었다), 나중에 두 상태가 갈리면 스켈레톤이 다시 살아난다. */
      .cdFlipInner.is-flipped .cdShimmer {
        background-image: linear-gradient(110deg, rgba(216,179,108,.06) 20%, rgba(216,179,108,.22) 42%, rgba(237,239,245,.28) 50%, rgba(216,179,108,.22) 58%, rgba(216,179,108,.06) 80%);
        background-size: 220% 100%;
        animation: tarotGoldShimmer 1.8s ease-in-out infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        .cdFlipInner, .cdFlipInner.is-flipped { transform: none; transition: none; }
        .cdFlipInner.is-burst { animation: none; }
        .cdFlipFace { backface-visibility: visible; -webkit-backface-visibility: visible; transition: opacity .3s ease; }
        .cdFlipFront { transform: none; opacity: 0; }
        .cdFlipInner.is-flipped .cdFlipFront { opacity: 1; }
        .cdFlipInner.is-flipped .cdFlipBack { opacity: 0; }
        .cdFlipInner.is-flipped .cdShimmer { animation-duration: 1ms; animation-iteration-count: 1; }
        [style*="tarotMoonGlow"],
        [style*="tarotLavenderBloom"],
        [style*="tarotPetalDrift"],
        [style*="tarotTwinkle"],
        [style*="tarotGentleFloat"],
        [style*="tarotCharacterIdle"],
        [style*="tarotCharacterAura"],
        [style*="tarotCharacterPoseCycle"],
        [style*="tarotOrbit"] {
          animation-duration: 1ms !important;
          animation-iteration-count: 1 !important;
        }
      }
    `}</style>
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
  const copy = useTeaHouseCopy("tarotAlbum", KO);
  const backgroundStyle = {
    backgroundImage: gardenSeal
      ? `radial-gradient(circle at 50% 14%, rgba(237,239,245,.15), transparent 30%), radial-gradient(circle at 16% 84%, rgba(156,135,212,.12), transparent 34%), radial-gradient(circle at 84% 86%, rgba(216,179,108,.08), transparent 30%), linear-gradient(145deg, rgba(27,21,48,.98), rgba(42,31,77,.92)), url("${cardBackUrl}")`
      : `radial-gradient(circle at 50% 16%, rgba(216,179,108,.15), transparent 30%), linear-gradient(145deg, rgba(21,16,38,.96), rgba(42,23,74,.92)), url("${cardBackUrl}")`,
  } as CSSProperties;

  return (
    <span
      className={cx(
        "relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-xl border bg-center bg-cover px-3 text-center text-champagne-gold shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]",
        large ? "aspect-[2/3] min-h-[210px] rounded-[1.6rem] px-5" : "",
        gardenSeal ? "border-twilight-violet/36 shadow-[0_0_34px_rgba(156,135,212,.16),inset_0_0_0_1px_rgba(237,239,245,.08)]" : "border-champagne-gold/22",
      )}
      style={backgroundStyle}
    >
      <span className={cx("absolute inset-[9%] rounded-[1.15rem] border", gardenSeal ? "border-twilight-violet/20" : "border-champagne-gold/14")} aria-hidden />
      {gardenSeal ? (
        <>
          <span className="absolute -bottom-3 -left-3 h-28 w-20 rotate-[-18deg] rounded-full border-l-2 border-twilight-violet/54" aria-hidden />
          <span className="absolute -bottom-2 -right-4 h-28 w-20 rotate-[18deg] rounded-full border-r-2 border-twilight-violet/54" aria-hidden />
          <Leaf className="absolute bottom-8 left-2 rotate-[-28deg] text-twilight-violet/70" size={18} strokeWidth={1.6} aria-hidden />
          <Leaf className="absolute bottom-11 right-3 rotate-[36deg] text-twilight-violet/62" size={18} strokeWidth={1.6} aria-hidden />
          <Flower2 className="absolute bottom-4 left-6 text-twilight-violet/80 drop-shadow-[0_0_10px_rgba(156,135,212,.3)]" size={17} strokeWidth={1.7} aria-hidden />
          <Flower2 className="absolute bottom-6 right-7 text-pearl-mist/76 drop-shadow-[0_0_10px_rgba(237,239,245,.28)]" size={16} strokeWidth={1.7} aria-hidden />
        </>
      ) : null}
      <Moon className={cx("relative drop-shadow-[0_0_18px_rgba(216,179,108,.24)]", gardenSeal ? "text-pearl-mist" : "text-champagne-gold", large ? "mb-4" : "mb-2")} size={large ? 42 : 26} strokeWidth={1.55} aria-hidden />
      <strong className={cx("relative font-premium font-black leading-tight", large ? "text-lg" : "text-sm")}>{title}</strong>
      <em className={cx("relative mt-2 max-w-[10rem] text-[0.68rem] font-bold not-italic leading-relaxed text-moonveil-silver/72", large ? "text-xs" : "")}>

        {copy.krvhfnlu}
      </em>
    </span>
  );
}

function TarotCardModal({
  card,
  cardIndex,
  cardTotal,
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
  cardIndex: number;
  cardTotal: number;
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
  const copy = useTeaHouseCopy("tarotAlbum", KO);
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
        className="relative grid max-h-[96svh] w-full max-w-6xl gap-5 overflow-y-auto rounded-t-[2rem] border border-champagne-gold/20 bg-midnight-ink/96 p-5 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] shadow-[0_0_80px_rgba(156,135,212,0.25)] backdrop-blur-2xl sm:max-h-[92svh] sm:grid-cols-[minmax(220px,340px)_minmax(0,1fr)] sm:rounded-[2rem] sm:p-8"
        onKeyDown={handleKeyDown}
      >
        <button
          type="button"
          className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full border border-white/12 bg-white/[0.07] text-champagne-gold backdrop-blur-xl transition hover:border-champagne-gold/42 hover:bg-white/[0.11] focus:outline-none focus:ring-2 focus:ring-champagne-gold/50"
          onClick={onClose}
          aria-label={copy.kmlqylfg}
        >
          <X size={18} aria-hidden />
        </button>
        <div className="mx-auto w-full max-w-[300px] sm:max-w-none">
          <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-champagne-gold/24 bg-midnight-ink shadow-[0_26px_60px_rgba(0,0,0,.34)]">
            {card.imageSrc && !imageFailed ? (
              <Image
                src={card.imageSrc}
                alt={copy.cardZoomAlt.replace("{title}", card.titleKo).replace("{titleEn}", card.titleEn)}
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
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.055] px-3 text-xs font-black text-moonveil-silver transition hover:border-champagne-gold/35 focus:outline-none focus:ring-2 focus:ring-champagne-gold/45"
              onClick={onPrevious}
              aria-label={copy.kv2kg2cx}
            >
              <ChevronLeft size={16} aria-hidden />

              {copy.k3anflqu}
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.055] px-3 text-xs font-black text-moonveil-silver transition hover:border-champagne-gold/35 focus:outline-none focus:ring-2 focus:ring-champagne-gold/45"
              onClick={onNext}
              aria-label={copy.kfvqms0a}
            >

              {copy.khux287z}
              <ChevronRight size={16} aria-hidden />
            </button>
          </div>
        </div>
        <div className="grid content-start gap-4 pr-0 sm:pr-12">
          <p className="inline-flex w-fit rounded-full border border-champagne-gold/24 bg-champagne-gold/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-champagne-gold">
            {card.suitLabel} · {card.element}
          </p>
          <div>
            <h3 id="tarotAlbumDetailTitle" className="font-premium text-3xl font-black leading-tight text-pearl-mist sm:text-5xl">
              {card.titleKo}
            </h3>
            <p className="mt-1 text-base font-semibold text-moonveil-silver/72">{card.titleEn}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {card.keywords.map((keyword) => (
              <span key={`${card.id}-${keyword}`} className="rounded-full border border-champagne-gold/18 bg-white/[0.07] px-3 py-1.5 text-xs font-extrabold text-champagne-gold/84">
                {keyword}
              </span>
            ))}
          </div>
          <blockquote className="rounded-2xl border border-champagne-gold/22 bg-champagne-gold/10 px-4 py-4 text-sm font-semibold leading-7 text-champagne-gold">
            {card.shortSummary}
          </blockquote>
          <DetailSection title={copy.kbx1lbox} body={`${card.storyTitle}\n${card.story}`} featured />
          <div className="grid gap-3 md:grid-cols-2">
            <DetailSection title={copy.kqvrsm7l} body={card.uprightMeaning} />
            <DetailSection title={copy.kp7ramna} body={card.reversedMeaning} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <DetailSection title={copy.ko4yt45j} body={card.loveMeaning} />
            <DetailSection title={copy.kwqkjwzw} body={card.relationshipMeaning} />
            <DetailSection title={copy.kbs8kn5u} body={card.careerMeaning} />
            <DetailSection title={copy.kkoogge5} body={card.moneyMeaning} />
          </div>
          <DetailSection title={copy.kajyhu4o} body={card.innerGrowthMeaning} />
          <blockquote className="rounded-2xl border border-champagne-gold/20 bg-champagne-gold/10 px-4 py-4 text-sm leading-7 text-champagne-gold">
            "{card.yeoniMessage}"
          </blockquote>
          <section className="rounded-2xl border border-moonveil-silver/16 bg-moonveil-silver/[0.07] px-4 py-4">
            <h4 className="text-sm font-black text-moonveil-silver">{copy.kjcpkfd5}</h4>
            <p className="mt-2 text-sm leading-7 text-pearl-mist/88">{card.journalQuestion}</p>
          </section>
        </div>
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-midnight-ink/88 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur-2xl sm:absolute sm:pb-3 sm:rounded-b-[2rem]">
          <div className="mx-auto flex max-w-5xl items-center gap-2">
            <button
              type="button"
              className="grid h-11 w-11 flex-none place-items-center rounded-full border border-white/12 bg-white/[0.055] text-moonveil-silver focus:outline-none focus:ring-2 focus:ring-champagne-gold/45"
              onClick={onPrevious}
              aria-label={copy.kxjbdi0j}
            >
              <ChevronLeft size={18} aria-hidden />
            </button>
            <button
              type="button"
              className="grid h-11 w-11 flex-none place-items-center rounded-full border border-white/12 bg-white/[0.055] text-moonveil-silver focus:outline-none focus:ring-2 focus:ring-champagne-gold/45"
              onClick={onNext}
              aria-label={copy.ksnvhf6c}
            >
              <ChevronRight size={18} aria-hidden />
            </button>
            {cardIndex >= 0 ? (
              <span className="hidden flex-none px-1 font-mono text-xs font-black tabular-nums text-moonveil-silver min-[400px]:block" aria-label={copy.cardPositionAria.replace("{index}", String(cardIndex + 1)).replace("{total}", String(cardTotal))}>
                {cardIndex + 1}/{cardTotal}
              </span>
            ) : null}
            <button
              type="button"
              className={cx(
                "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border px-3 text-xs font-black focus:outline-none focus:ring-2 focus:ring-champagne-gold/45",
                selectedForPdf ? "border-champagne-gold/50 bg-champagne-gold/18 text-champagne-gold" : "border-white/12 bg-white/[0.055] text-moonveil-silver",
              )}
              onClick={onTogglePdfCard}
              aria-pressed={selectedForPdf}
            >
              {selectedForPdf ? <MoonPhaseSeal full /> : <MoonPhaseSeal />}

              {copy.kb6dudtb}
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-champagne-gold/35 bg-champagne-gold/12 px-3 text-xs font-black text-champagne-gold focus:outline-none focus:ring-2 focus:ring-champagne-gold/45 disabled:opacity-55"
              onClick={onDownloadSingle}
              disabled={pdfBusy}
              aria-label={copy.cardSinglePdfAria.replace("{title}", card.titleKo)}
            >
              {pdfBusy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <FileText size={16} aria-hidden />}

              {copy.ksoa9rli}
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
      featured ? "border-champagne-gold/18 bg-white/[0.06]" : "border-white/10 bg-white/[0.045]",
    )}>
      <h4 className="text-sm font-black text-champagne-gold">{title}</h4>
      {paragraphs.map((paragraph) => (
        <p key={paragraph} className="mt-2 text-sm leading-7 text-pearl-mist/84">{paragraph}</p>
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
  const copy = useTeaHouseCopy("tarotAlbum", KO);
  const groupedCards = useMemo(() => {
    const groups: Array<{ title: string; cards: TarotAlbumStoryCard[] }> = [
      { title: copy.knnv85fh, cards: cards.filter((card) => card.arcana === "major") },
      { title: copy.kr7i3yto, cards: cards.filter((card) => card.suit === "wands") },
      { title: copy.k8tcg3oe, cards: cards.filter((card) => card.suit === "cups") },
      { title: copy.kph0fvpr, cards: cards.filter((card) => card.suit === "swords") },
      { title: copy.k79dstes, cards: cards.filter((card) => card.suit === "pentacles") },
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
      <PdfCoverPage count={cards.length} cardBackUrl={cardBackUrl} />
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

const PDF_ORNAMENT = "/images/fortune-tea-house/moonlight-lotus-ornament.webp";
const pdfInk = { title:"#462c3c", body:"#59474c", gold:"#876338", muted:"#786168", line:"#d8c5ac", paper:"#fbf5eb" };
const pdfBody: CSSProperties = { margin:0, color:pdfInk.body, fontSize:14, lineHeight:1.65, fontWeight:400, wordBreak:"keep-all", overflowWrap:"break-word" };
const pdfSectionTitle: CSSProperties = { margin:"0 0 8px", color:pdfInk.gold, fontSize:14, lineHeight:1.5, fontWeight:700 };
function PdfPageShell({ children, pageNumber, dark=false }: { children:ReactNode; pageNumber?:number; dark?:boolean }) {
  const copy=useTeaHouseCopy("tarotAlbum",KO);
  return <section data-tarot-pdf-page style={{ width:PDF_PAGE_WIDTH_PX, minHeight:PDF_PAGE_HEIGHT_PX, boxSizing:"border-box", padding:"48px 52px 60px", position:"relative", overflow:"hidden", background:dark ? "#261326" : pdfInk.paper, color:dark ? "#fff0e8" : pdfInk.title, fontFamily:"CodeDestinyBody, Pretendard, Apple SD Gothic Neo, sans-serif" }}>
    <div style={{ position:"absolute", inset:22, border:`1px solid ${dark ? "#9b796148" : "#cdb799"}`, pointerEvents:"none" }}/>
    <div style={{ position:"absolute", inset:28, border:`1px solid ${dark ? "#9b796124" : "#e5d6c0"}`, pointerEvents:"none" }}/>
    {!dark && <img src={PDF_ORNAMENT} alt="" style={{ position:"absolute", width:132, height:132, top:36, right:38, opacity:.34 }}/>}
    <div style={{ position:"relative", zIndex:1 }}>{children}</div>
    <footer style={{ position:"absolute", left:52, right:52, bottom:31, display:"flex", justifyContent:"space-between", paddingTop:10, borderTop:`1px solid ${dark ? "#9b796148" : "#d8c5ac"}`, color:dark ? "#d8c1ab" : pdfInk.muted, fontSize:10, letterSpacing:.6 }}><span>{copy.kkr3uulf}</span><span>{pageNumber ?? ""}</span></footer>
  </section>;
}

function PdfCoverPage({ count }: { count: number; cardBackUrl: string }) {
  const copy = useTeaHouseCopy("tarotAlbum", KO);
  const visit = useTeaHouseCopy("albumVisit", albumVisitCopy);
  const locale = useLocale();
  const createdAt = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date());
  return <PdfPageShell dark>
    <div style={{ position:"relative", height:590, margin:"-28px -28px 36px", overflow:"hidden", borderRadius:"12px 12px 0 0" }}>
      <img src="/images/fortune-tea-house/yeoni-moonlight-novel.webp" alt="" style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"65% center" }}/>
      <div style={{ position:"absolute", inset:0, background:"linear-gradient(0deg,#241021,transparent 48%)" }}/>
      <p style={{ position:"absolute", bottom:20, left:32, color:"#e8ca91", fontSize:15, letterSpacing:3 }}>{visit.chapter}</p>
    </div>
    <img src={PDF_ORNAMENT} alt="" style={{position:"absolute",right:-14,bottom:62,width:120,height:120,opacity:.7}}/>
    <h1 style={{ margin:"0 0 24px", fontFamily:"CodeDestinySerif, Georgia, serif", fontSize:48, fontWeight:500, lineHeight:1.3, color:"#ffe8ea" }}>{copy.k1yzt0ya}</h1>
    <p style={{ fontSize:19, lineHeight:1.9, color:"#e4ccd4", maxWidth:510 }}>{copy.kfnkjoro}</p>
    <p style={{ marginTop:36, paddingTop:20, borderTop:"1px solid #a9816855", color:"#e8ca91", fontSize:13 }}>{copy.kfe3rgpe} {count}{copy.kskfjn2j} · {createdAt}</p>
  </PdfPageShell>;
}

function PdfTocPage({ groups }: { groups:Array<{title:string; cards:TarotAlbumStoryCard[]}> }) {
  const copy=useTeaHouseCopy("tarotAlbum",KO);
  return <PdfPageShell pageNumber={2}>
    <p style={{...pdfSectionTitle, letterSpacing:2}}>{copy.kb6dudtb}</p>
    <h2 style={{margin:"0 0 34px",fontSize:38,fontWeight:500,color:pdfInk.title}}>{copy.kdhtquzm}</h2>
    <div style={{display:"grid",gap:18}}>{groups.map((group,index)=><section key={group.title} style={{paddingBottom:16,borderBottom:`1px solid ${pdfInk.line}`}}>
      <h3 style={{margin:"0 0 12px",fontSize:19,fontWeight:600,color:pdfInk.title}}><span style={{color:pdfInk.gold,fontSize:12,marginRight:16}}>{String(index+1).padStart(2,"0")}</span>{group.title}</h3>
      <p style={{...pdfBody,fontSize:13,lineHeight:1.9}}>{group.cards.map(card=>`${card.titleKo} (${card.titleEn})`).join(" · ")}</p>
    </section>)}</div>
  </PdfPageShell>;
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
  const copy = useTeaHouseCopy("tarotAlbum", KO);
  const imageSrc = card.imageSrc && !imageFailed ? card.imageSrc : cardBackUrl;
  const sections = [
    [copy.ko8qlqfx, card.uprightMeaning],
    [copy.k2jfbomz, card.reversedMeaning],
    [copy.ko4yt45j, card.loveMeaning],
    [copy.kwqkjwzw, card.relationshipMeaning],
    [copy.kbs8kn5u, card.careerMeaning],
    [copy.kkoogge5, card.moneyMeaning],
    [copy.kajyhu4o, card.innerGrowthMeaning],
  ] as const;

  return <PdfPageShell pageNumber={pageNumber}>
    <div style={{display:"grid",gridTemplateColumns:"182px minmax(0,1fr)",gap:28,alignItems:"start"}}>
      <div><img src={imageSrc} crossOrigin="anonymous" alt="" style={{width:182,height:273,objectFit:"cover",borderRadius:7,border:`1px solid ${pdfInk.line}`,boxShadow:"0 10px 20px #4a2a351c"}} onError={event=>{if(event.currentTarget.src!==cardBackUrl)event.currentTarget.src=cardBackUrl;}}/>
        <p style={{margin:"14px 0 0",fontSize:12,lineHeight:1.8,color:pdfInk.gold}}>{card.keywords.slice(0,5).join(" · ")}</p>
      </div>
      <div><p style={{...pdfSectionTitle,marginBottom:10,paddingRight:85,fontSize:12}}>{card.suitLabel} · {card.element}</p>
        <h2 style={{margin:0,fontSize:34,lineHeight:1.3,fontWeight:500,color:pdfInk.title}}>{card.titleKo}</h2>
        <p style={{margin:"6px 0 12px",fontSize:14,color:pdfInk.muted}}>{card.titleEn}</p>
        <p style={{...pdfBody,fontSize:16,fontWeight:600,marginBottom:14}}>{card.shortSummary}</p>
        <h3 style={pdfSectionTitle}>{copy.kbx1lbox}</h3><p style={pdfBody}>{card.story}</p>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px 28px",marginTop:20,paddingTop:18,borderTop:`1px solid ${pdfInk.line}`}}>
      {sections.map(([title,body])=><section key={title}><h3 style={pdfSectionTitle}>{title}</h3><p style={pdfBody}>{body}</p></section>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginTop:16,padding:"14px 20px",background:"#efe3db",borderRadius:6}}>
      <section><h3 style={pdfSectionTitle}>{copy.km05ijjs}</h3><p style={{...pdfBody,fontSize:13}}>{card.yeoniMessage}</p></section>
      <section><h3 style={pdfSectionTitle}>{copy.kjcpkfd5}</h3><p style={{...pdfBody,fontSize:13}}>{card.journalQuestion}</p></section>
    </div>
  </PdfPageShell>;
}

function PdfLastPage({ pageNumber }: { pageNumber:number }) {
  const copy=useTeaHouseCopy("tarotAlbum",KO);
  return <PdfPageShell pageNumber={pageNumber} dark>
    <div style={{display:"grid",minHeight:990,alignContent:"center",gap:28,textAlign:"center"}}>
      <img src={PDF_ORNAMENT} alt="" style={{width:260,height:260,objectFit:"contain",margin:"0 auto 12px"}}/>
      <p style={{margin:0,color:"#e8ca91",fontSize:14,letterSpacing:3}}>{copy.kqjimwmt}</p>
      <h2 style={{margin:"0 auto",maxWidth:540,color:"#ffe9e8",fontSize:34,lineHeight:1.5,fontWeight:500,wordBreak:"keep-all"}}>{copy.kftcqqfx}</h2>
      <p style={{margin:"0 auto",maxWidth:500,color:"#dec4ce",fontSize:17,lineHeight:1.9,wordBreak:"keep-all"}}>{copy.k0iceshy}</p>
    </div>
  </PdfPageShell>;
}
