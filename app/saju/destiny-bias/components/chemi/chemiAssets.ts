// 생성 자산 경로·유형별 포인트 색. 레저: docs/design/destiny-bias-kpop-art.jsonl
import type { ChemiTypeId, SignalStrength } from "@/lib/idol-chemi";

export const ASSET_BASE = "/images/destiny-bias";

export const ASSETS = {
  hero: `${ASSET_BASE}/hero-1200.webp`,
  heroMobile: `${ASSET_BASE}/hero-mobile-780.webp`,
  frameMember: `${ASSET_BASE}/frame-member.webp`,
  cardBg: `${ASSET_BASE}/card-bg-1080.webp`,
  shareBgSquare: `${ASSET_BASE}/share-bg-1080.webp`,
  shareBgStory: `${ASSET_BASE}/share-bg-1080x1920.webp`,
  ogDefault: `${ASSET_BASE}/og-default-1200x630.png`,
  miniLoading: `${ASSET_BASE}/mini/loading.webp`,
  miniEmpty: `${ASSET_BASE}/mini/empty.webp`,
  miniError: `${ASSET_BASE}/mini/error.webp`,
} as const;

export function stickerSrc(index: number) {
  const n = ((Math.abs(Math.trunc(index)) % 6) + 1).toString().padStart(2, "0");
  return `${ASSET_BASE}/stickers/s-${n}.webp`;
}

export function typeSymbolSrc(typeId: ChemiTypeId) {
  return `${ASSET_BASE}/types/${typeId}.webp`;
}

/** 유형별 포인트 색(라일락·일렉트릭 블루·핑크 3색 순환). CSS 변수 이름만 노출한다. */
export const TYPE_ACCENT: Record<ChemiTypeId, "lilac" | "blue" | "pink"> = {
  telepathy: "pink",
  "same-wave": "lilac",
  "accel-brake": "blue",
  "locked-in": "blue",
  "quiet-care": "lilac",
  "hype-charger": "pink",
  "push-pull": "pink",
  "cross-learn": "blue",
  "slow-burn": "lilac",
};

export const STRENGTH_LABEL: Record<SignalStrength, string> = {
  high: "신호 뚜렷함",
  medium: "신호 보통",
  low: "신호 은은함",
};

export const STRENGTH_DOTS: Record<SignalStrength, number> = { high: 3, medium: 2, low: 1 };
