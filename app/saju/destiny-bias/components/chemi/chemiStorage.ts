// 반복 흐름용 로컬 저장. 생년월일·시간은 절대 저장하지 않는다(파트너 참조·유형·한 줄만).
import type { ChemiPartnerRef, ChemiTypeId } from "@/lib/idol-chemi";

export const RECENT_PARTNERS_KEY = "cd.destinyBias.recentPartners.v1";
export const RECENT_RESULTS_KEY = "cd.destinyBias.recentResults.v1";
export const RECENT_PARTNERS_LIMIT = 8;
export const RECENT_RESULTS_LIMIT = 20;

export type RecentResultEntry = {
  partner: ChemiPartnerRef;
  partnerName: string;
  groupLabel: string;
  chemiTypeId: ChemiTypeId;
  chemiTypeNameKo: string;
  oneLiner: string;
  minorMode: boolean;
  engineVersion: string;
  at: string;
};

const PARTNER_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function isPartnerRef(value: unknown): value is ChemiPartnerRef {
  if (!value || typeof value !== "object") return false;
  const ref = value as Record<string, unknown>;
  return (ref.kind === "roster" || ref.kind === "preset") && typeof ref.id === "string" && PARTNER_ID.test(ref.id);
}

function readJson(key: string): unknown {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 실패는 조용히 무시(프라이빗 모드 등)
  }
}

export function sameRef(a: ChemiPartnerRef | null | undefined, b: ChemiPartnerRef | null | undefined) {
  return Boolean(a && b && a.kind === b.kind && a.id === b.id);
}

export function readRecentPartners(): ChemiPartnerRef[] {
  const raw = readJson(RECENT_PARTNERS_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isPartnerRef).slice(0, RECENT_PARTNERS_LIMIT);
}

export function pushRecentPartner(ref: ChemiPartnerRef): ChemiPartnerRef[] {
  const next = [{ kind: ref.kind, id: ref.id }, ...readRecentPartners().filter((r) => !sameRef(r, ref))].slice(0, RECENT_PARTNERS_LIMIT);
  writeJson(RECENT_PARTNERS_KEY, next);
  return next;
}

function isRecentResult(value: unknown): value is RecentResultEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return isPartnerRef(entry.partner) && typeof entry.chemiTypeId === "string" && typeof entry.oneLiner === "string" && typeof entry.at === "string";
}

export function readRecentResults(): RecentResultEntry[] {
  const raw = readJson(RECENT_RESULTS_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRecentResult).slice(0, RECENT_RESULTS_LIMIT);
}

export function pushRecentResult(entry: RecentResultEntry): RecentResultEntry[] {
  const next = [entry, ...readRecentResults().filter((r) => !sameRef(r.partner, entry.partner))].slice(0, RECENT_RESULTS_LIMIT);
  writeJson(RECENT_RESULTS_KEY, next);
  return next;
}

export function collectedTypeIds(results: RecentResultEntry[]): Set<ChemiTypeId> {
  return new Set(results.map((r) => r.chemiTypeId));
}
