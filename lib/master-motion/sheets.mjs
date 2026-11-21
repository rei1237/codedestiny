// 마스터 스프라이트 시트 목록(F, 2026-11-22). 파일은 scripts/sprites/build-master-motion.mjs 가
// public/images/master-motion/<id>/ 에 만들고, 같은 폴더의 manifest.json 과 이 목록이 같아야 한다
// (__tests__/ui/master-motion-assets.test.mjs). 규격: docs/design/master-motion-assets.md
import { MASTER_SPRITE_SHEETS } from "./flags.mjs";

/** 칸 하나의 재생 시간(ms)과 한 줄 시트의 칸 수 범위. 최소 구성은 깜빡임(반쯤·감음·반쯤) 3칸이다. */
export const MASTER_MOTION_FRAME_MS = 120;
export const MASTER_MOTION_MIN_FRAMES = 2;
export const MASTER_MOTION_MAX_FRAMES = 12;

/** 용량 상한(바이트) — 넘으면 빌드 스크립트와 테스트가 모두 실패한다. */
export const MASTER_MOTION_BUDGETS = Object.freeze({
  portrait: Object.freeze({ width: 600, height: 720, sheetBytes: 400_000, posterBytes: 80_000 }),
  avatar: Object.freeze({ width: 112, height: 112, sheetBytes: 80_000, posterBytes: 12_000 }),
});

/**
 * { [마스터 id]: { [변형 이름]: { kind, poster, sheet: { src, frames, cols, cell } } } }
 * @type {Readonly<Record<string, Readonly<Record<string, { kind: "portrait" | "avatar"; poster: string; sheet: { src: string; frames: number; cols: number; cell: { width: number; height: number } } }>>>>}
 */
export const MASTER_MOTION_SHEETS = Object.freeze({
  // 연이(연애 비책): 정본 초상 + 눈 깜빡임(반쯤·감음·반쯤) 3칸. 입(변화 부족)·바람(한 칸만 튐) 생성물은 쓰지 않았다(docs/handoff/master-motion-premium-2026-11-22.md F2).
  yeoni: Object.freeze({
    portrait: Object.freeze({ kind: "portrait", poster: "/images/master-motion/yeoni/portrait-poster.webp", sheet: { src: "/images/master-motion/yeoni/portrait-sheet.webp", frames: 3, cols: 3, cell: { width: 600, height: 720 } } }),
    avatar: Object.freeze({ kind: "avatar", poster: "/images/master-motion/yeoni/avatar-poster.webp", sheet: { src: "/images/master-motion/yeoni/avatar-sheet.webp", frames: 3, cols: 3, cell: { width: 112, height: 112 } } }),
  }),
  // 윤달(점성술·베다점 정본 초상 yun-astrology-portrait): 눈 깜빡임(반쯤·감음·반쯤) 3칸. 기울어진 얼굴이라 눈마다 타원 하나(F3).
  yun: Object.freeze({
    portrait: Object.freeze({ kind: "portrait", poster: "/images/master-motion/yun/portrait-poster.webp", sheet: { src: "/images/master-motion/yun/portrait-sheet.webp", frames: 3, cols: 3, cell: { width: 600, height: 720 } } }),
    avatar: Object.freeze({ kind: "avatar", poster: "/images/master-motion/yun/avatar-poster.webp", sheet: { src: "/images/master-motion/yun/avatar-sheet.webp", frames: 3, cols: 3, cell: { width: 112, height: 112 } } }),
  }),
  // 윤달(인생의 책 전용 초상 yun-life-book-portrait): 눈 깜빡임 3칸(F3).
  "yun-life-book": Object.freeze({
    portrait: Object.freeze({ kind: "portrait", poster: "/images/master-motion/yun-life-book/portrait-poster.webp", sheet: { src: "/images/master-motion/yun-life-book/portrait-sheet.webp", frames: 3, cols: 3, cell: { width: 600, height: 720 } } }),
    avatar: Object.freeze({ kind: "avatar", poster: "/images/master-motion/yun-life-book/avatar-poster.webp", sheet: { src: "/images/master-motion/yun-life-book/avatar-sheet.webp", frames: 3, cols: 3, cell: { width: 112, height: 112 } } }),
  }),
});

/**
 * 플래그가 켜진 마스터의 변형만 MasterMotionArt 로 돌려준다. 없거나 꺼져 있으면 undefined(CSS 모션).
 * @param {string} id
 * @param {string} variant
 * @returns {{ poster: string; sheet: { src: string; frames: number; cols: number; cell: { width: number; height: number } } } | undefined}
 */
export function masterMotionArt(id, variant) {
  if (!(/** @type {Record<string, boolean>} */ (MASTER_SPRITE_SHEETS))[id]) return undefined;
  const entry = MASTER_MOTION_SHEETS[id]?.[variant];
  return entry ? { poster: entry.poster, sheet: entry.sheet } : undefined;
}
