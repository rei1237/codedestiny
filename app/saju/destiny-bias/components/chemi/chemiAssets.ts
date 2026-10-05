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

/** 직접 그린 무대 아트(가상 아이돌 실루엣·공연장). 실존 인물·로고 없음. */
export const STAGE_BASE = `${ASSET_BASE}/stage`;
export const STAGE = {
  hero: `${STAGE_BASE}/hero-1536.webp`,
  heroTall: `${STAGE_BASE}/hero-tall-780.webp`,
  fanOcean: `${STAGE_BASE}/fan-ocean-960.webp`,
  backstage: `${STAGE_BASE}/backstage-960.webp`,
} as const;

/** 그룹 구성(공개 사실)으로 실루엣 계열만 고른다. 그룹을 모르면 id 해시로 넷 중 하나. */
const GROUP_SILHOUETTE: Record<string, "f" | "m"> = {
  bts: "m",
  seventeen: "m",
  "stray-kids": "m",
  txt: "m",
  enhypen: "m",
  riize: "m",
  twice: "f",
  blackpink: "f",
  newjeans: "f",
  ive: "f",
  aespa: "f",
  "le-sserafim": "f",
  gidle: "f",
  illit: "f",
  babymonster: "f",
  nmixx: "f",
};

function hashText(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** 포토카드 기본 아트: 같은 최애는 늘 같은 실루엣. */
export function idolSoloSrc(partnerId: string, groupId?: string | null) {
  const hash = hashText(partnerId);
  const tone = (groupId && GROUP_SILHOUETTE[groupId]) || (hash % 2 ? "f" : "m");
  return `${STAGE_BASE}/idol-${tone}${((hash >>> 3) % 2) + 1}.webp`;
}

export function stickerSrc(index: number) {
  const n = ((Math.abs(Math.trunc(index)) % 6) + 1).toString().padStart(2, "0");
  return `${ASSET_BASE}/stickers/s-${n}.webp`;
}

export function typeSymbolSrc(typeId: ChemiTypeId) {
  return `${STAGE_BASE}/emblems/${typeId}.webp`;
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
