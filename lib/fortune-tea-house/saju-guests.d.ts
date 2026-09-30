export type GuestGrade = "yong" | "hee" | "gi" | "gu" | "han" | "unavailable";
export type UsefulGodEvidence = { yong?: string | string[]; hee?: string[]; gi?: string[]; gu?: string[]; han?: string[]; strength?: string };
export type SajuGuest = {
  id: string; tenGodId: string; tenGod: string; scope: "natal" | "daewoon" | "sewoon";
  position: string; grade: GuestGrade; traditional: "challenging" | "auspicious" | "neutral";
  evidence: { source: string; stem: string; element?: string; branch?: string; layer?: string; year?: number; startYear?: number; endYear?: number; isCurrent?: boolean };
};
export const SAJU_GUEST_VERSION: string;
export function guestGrade(element: string, decisions?: UsefulGodEvidence): GuestGrade;
export function buildSajuGuests(input?: { facts?: unknown; decisions?: UsefulGodEvidence; timing?: unknown }): SajuGuest[];
export function kstDate(now?: Date): string;
