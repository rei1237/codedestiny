/**
 * 오늘·내일의 운세 웹툰 — 컷 그림 슬롯 표.
 *
 * 지금은 상담 웹툰(lib/brand/consultation-webtoons.mjs)의 컷을 "예화"로 빌려 쓴다.
 * 사용자가 일일 전용 컷을 그리면 후보 자리에 `{ src, widths, fallback, w, h, alt }` 를
 * 직접 넣으면 된다(파일은 public 아래 `${src}-${fallback}.webp` 와 `-${width}.avif`).
 * 2026-11-07 이후 웹툰 그림은 사용자가 직접 만든다 — 여기서 새 그림을 생성하지 않는다.
 */
import { consultationWebtoons } from "@/lib/brand/consultation-webtoons.mjs";

export type SlotArt = { src: string; widths: number[]; fallback: number; w: number; h: number; alt: string };
type SlotRef = { work: string; cut: number };
type SlotCandidate = SlotRef | SlotArt;

export const DAILY_WEBTOON_SLOTS = {
  opening: [{ work: "tea", cut: 1 }, { work: "fusion", cut: 1 }, { work: "life-book", cut: 1 }],
  saju: [{ work: "fusion", cut: 3 }, { work: "new-year", cut: 5 }, { work: "neo", cut: 5 }],
  sky: [{ work: "astrology", cut: 7 }, { work: "astrology", cut: 5 }, { work: "vedic", cut: 5 }],
  tarot: [{ work: "fusion", cut: 6 }],
  board: [{ work: "ziwei", cut: 5 }, { work: "ziwei", cut: 7 }, { work: "fusion", cut: 4 }],
  heart: [{ work: "love-secret", cut: 7 }, { work: "sukuyo-compat", cut: 7 }, { work: "karma", cut: 5 }],
  closing: [{ work: "tea", cut: 5 }, { work: "heukwol", cut: 8 }],
} satisfies Record<string, SlotCandidate[]>;

export type DailyWebtoonSlot = keyof typeof DAILY_WEBTOON_SLOTS;

/** FNV-1a 32bit — 날짜·sign·슬롯이 같으면 늘 같은 값. */
export function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

type WebtoonSource = Record<string, { cuts: SlotArt[] }>;

function resolveCandidate(candidate: SlotCandidate, slot: string): SlotArt {
  if ("src" in candidate) return candidate;
  const cut = (consultationWebtoons as unknown as WebtoonSource)[candidate.work]?.cuts?.[candidate.cut - 1];
  // 조용히 깨진 이미지가 나가지 않도록 빌드 시점에 바로 실패한다.
  if (!cut) throw new Error(`daily-webtoon slot "${slot}" points at missing cut ${candidate.work}/${candidate.cut}`);
  const { src, widths, fallback, w, h, alt } = cut;
  return { src, widths, fallback, w, h, alt };
}

export function resolveSlotArt(slot: DailyWebtoonSlot, seed: string): SlotArt {
  const candidates: SlotCandidate[] | undefined = (DAILY_WEBTOON_SLOTS as Record<string, SlotCandidate[]>)[slot];
  if (!candidates?.length) throw new Error(`daily-webtoon slot "${slot}" is not defined`);
  return resolveCandidate(candidates[hashSeed(`${seed}|${slot}`) % candidates.length], slot);
}
