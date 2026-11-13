import { buildImageCandidates } from "@/lib/tarot/tarot-cards.mjs";
import { yeongnyangiCardArt } from "@/lib/tarot/yeongnyangi-deck";
import {
  getTarotCounselProfile,
  tarotDeckCards,
  type TarotOrientation,
} from "@/src/features/fortune-tea-house/data/tarotCards";
import { resolveTarotCardImage } from "@/src/features/fortune-tea-house/lib/tarotCardImageMap";

export type { TarotOrientation } from "@/src/features/fortune-tea-house/data/tarotCards";

export type TarotTalismanDeck = "yeongnyangi" | "teahouse";
export type TarotTalismanGroup = "major" | "wands" | "cups" | "swords" | "pentacles";

const SUIT_CODE: Record<Exclude<TarotTalismanGroup, "major">, string> = {
  wands: "W",
  cups: "C",
  swords: "S",
  pentacles: "P",
};

function groupOf(id: string): TarotTalismanGroup {
  if (id.startsWith("major_")) return "major";
  if (id.includes("_wands_")) return "wands";
  if (id.includes("_cups_")) return "cups";
  if (id.includes("_swords_")) return "swords";
  return "pentacles";
}

function codeOf(id: string, number: number): string {
  const group = groupOf(id);
  return group === "major" ? `M${String(number).padStart(2, "0")}` : `${SUIT_CODE[group]}${String(number).padStart(2, "0")}`;
}

export const tarotTalismanCards = tarotDeckCards.map((card) => ({
  ...card,
  code: codeOf(card.id, card.number),
  group: groupOf(card.id),
}));

export type TarotTalismanCard = (typeof tarotTalismanCards)[number];

export function findTarotTalismanCard(value: string | null | undefined): TarotTalismanCard | undefined {
  const normalized = String(value || "").trim().toLowerCase();
  return tarotTalismanCards.find((card) => card.id.toLowerCase() === normalized || card.code.toLowerCase() === normalized);
}

export function tarotTalismanReading(card: TarotTalismanCard, orientation: TarotOrientation) {
  return getTarotCounselProfile(card, orientation);
}

export function tarotTalismanImageCandidates(card: TarotTalismanCard, deck: TarotTalismanDeck, locale = "ko"): string[] {
  const classic = String(buildImageCandidates(card.code)?.[0] || "").replace(/\.jpe?g$/i, ".webp");
  const yeongnyangi = yeongnyangiCardArt(card.code, locale).src;
  if (deck === "yeongnyangi") return Array.from(new Set([yeongnyangi, classic].filter(Boolean)));
  const teaHouse = resolveTarotCardImage({
    cardId: card.id,
    nameKo: card.nameKo,
    nameEn: card.nameEn,
    suit: card.group,
    number: card.number,
    arcana: card.group === "major" ? "major" : "minor",
  })?.url;
  return Array.from(new Set([teaHouse, classic, yeongnyangi].filter(Boolean) as string[]));
}
