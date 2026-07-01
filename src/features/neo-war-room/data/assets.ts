import { getAssetUrlFromPublicPath } from "@/lib/r2-public-url";

export type NeoWarRoomAssetCategory =
  | "hero"
  | "sprite"
  | "room-background"
  | "method-cover"
  | "intensity-cover"
  | "badge-stamp"
  | "decor";

export type NeoWarRoomConsultMode = "saju" | "vedic" | "ziwei" | "astrology";

export type NeoWarRoomAsset = {
  src: string;
  fallbackSrc: string;
  objectKey: string;
  alt: string;
  category: NeoWarRoomAssetCategory;
  role: string;
};

export const NEO_WAR_ROOM_ASSET_BASE_URL = process.env.NEXT_PUBLIC_ASSETS_BASE_URL || "https://assets.code-destiny.com";
export const NEO_WAR_ROOM_ASSET_FOLDER = "DestinyWar";

export const neoWarRoomBgmTracks = {
  moonlitWarRoom: {
    key: "white-lion",
    url: "https://music.code-destiny.com/DestinyWar/White%20Lion.mp3",
    volume: 0.26,
  },
} as const;

function destinyWarAsset(fileName: string, alt: string, category: NeoWarRoomAssetCategory, role: string): NeoWarRoomAsset {
  const publicPath = `/${NEO_WAR_ROOM_ASSET_FOLDER}/${fileName}`;
  return {
    src: getAssetUrlFromPublicPath(publicPath, {
      baseUrl: NEO_WAR_ROOM_ASSET_BASE_URL,
      fallbackPublicPath: publicPath,
      prefix: "",
    }),
    fallbackSrc: "",
    objectKey: `${NEO_WAR_ROOM_ASSET_FOLDER}/${fileName}`,
    alt,
    category,
    role,
  };
}

function localNeoWarRoomAsset(publicPath: string, alt: string, category: NeoWarRoomAssetCategory, role: string): NeoWarRoomAsset {
  return {
    src: publicPath,
    fallbackSrc: "",
    objectKey: publicPath.replace(/^\//, ""),
    alt,
    category,
    role,
  };
}

function buildSpriteSet(prefix: string, count: number, altPrefix: string) {
  return Array.from({ length: count }, (_, index) => {
    const frame = index + 1;
    return destinyWarAsset(
      `${prefix}${frame}.png`,
      `${altPrefix} ${frame}`,
      "sprite",
      `sprite-${frame}`,
    );
  });
}

export const neoWarRoomAssets = {
  hero: {
    portrait: destinyWarAsset(
      "네오 반신상 배경없음-Photoroom.png",
      "네오 반신상 캐릭터 일러스트",
      "hero",
      "hero-portrait",
    ),
    fullbody: destinyWarAsset(
      "네오 전신상 배경없음-Photoroom.png",
      "네오 전신 캐릭터 일러스트",
      "hero",
      "hero-fullbody",
    ),
    strategyNeoMain: destinyWarAsset(
      "전략실 네오 메인-Photoroom.png",
      "전략실 변신 전 네오 메인 일러스트",
      "hero",
      "strategy-neo-main",
    ),
    blackShadow: destinyWarAsset(
      "검은 그림자-Photoroom.png",
      "전략실에 나타난 검은 그림자",
      "hero",
      "black-shadow",
    ),
    transformation: localNeoWarRoomAsset(
      "/neo-operation-room/sprites/neo-transform-v3-clean.webp",
      "네오 변신 장면 스프라이트 시트",
      "hero",
      "hero-transformation-v3-clean",
    ),
    transformationMobile: localNeoWarRoomAsset(
      "/neo-operation-room/sprites/neo-transform-v3-clean.webp",
      "네오 변신 장면 모바일 스프라이트 시트",
      "hero",
      "hero-transformation-v3-clean-mobile",
    ),
  },
  sprites: {
    withBackground: buildSpriteSet("네오 스프라이트 배경", 7, "네오 작전실 표정 스프라이트"),
    transparent: buildSpriteSet("네오 스프라이트 배경없음", 5, "네오 배경 없는 표정 스프라이트").map((asset) => ({
      ...asset,
      src: asset.src.replace(".png", "-Photoroom.png"),
      objectKey: asset.objectKey.replace(".png", "-Photoroom.png"),
    })),
    strategyNeo: destinyWarAsset(
      "전략실 네오-Photoroom.png",
      "전략실 변신 전 네오 표정 스프라이트 시트",
      "sprite",
      "strategy-neo-sprite-sheet",
    ),
    strategyNeoMobile: localNeoWarRoomAsset(
      "/neo-operation-room/sprites/mobile/neo-strategy-sheet-mobile.webp",
      "Neo strategy sprite mobile sheet",
      "sprite",
      "strategy-neo-mobile-sheet",
    ),
  },
  backgrounds: {
    lobbyDesktop: destinyWarAsset(
      "전략 상담실 데스크탑.png",
      "네오의 전략 상담실 데스크탑 배경",
      "room-background",
      "lobby-desktop-background",
    ),
    lobbyMobile: destinyWarAsset(
      "전략 상담실 모바일.png",
      "네오의 전략 상담실 모바일 배경",
      "room-background",
      "lobby-mobile-background",
    ),
    desktop: destinyWarAsset(
      "네오 전략실 데스크탑1.png",
      "네오의 팩폭 작전실 데스크탑 배경",
      "room-background",
      "desktop-background",
    ),
    mobile: destinyWarAsset(
      "네오 전략실 모바일1.png",
      "네오의 팩폭 작전실 모바일 배경",
      "room-background",
      "mobile-background",
    ),
    strategyCity: destinyWarAsset(
      "전략실 도시.webp",
      "네오의 운명 전략실 도시 배경",
      "room-background",
      "strategy-city-background",
    ),
  },
  methods: {
    saju: destinyWarAsset(
      "네오 전략실 사주 이미지.png",
      "사주 작전 브리핑 선택 이미지",
      "method-cover",
      "method-saju",
    ),
    vedic: destinyWarAsset(
      "네오 전략실 베다점 이미지.png",
      "베다점 작전 브리핑 선택 이미지",
      "method-cover",
      "method-vedic",
    ),
    ziwei: destinyWarAsset(
      "네오 전략실 자미두수 이미지.png",
      "자미두수 작전 브리핑 선택 이미지",
      "method-cover",
      "method-ziwei",
    ),
    astrology: destinyWarAsset(
      "네오 전략실 점성술 이미지.png",
      "점성술 작전 브리핑 선택 이미지",
      "method-cover",
      "method-astrology",
    ),
  },
  intensity: {
    spicySheet: destinyWarAsset(
      "매운 맛 강도-Photoroom.png",
      "팩폭 강도 선택 배지",
      "intensity-cover",
      "intensity-spicy-sheet",
    ),
  },
  badges: {
    grades: destinyWarAsset(
      "사자 휘장 c부터ex-Photoroom.png",
      "사자 휘장 등급 이미지",
      "badge-stamp",
      "badge-grades",
    ),
    gradesMobile: localNeoWarRoomAsset(
      "/neo-operation-room/sprites/mobile/neo-badge-grades-mobile.webp",
      "Neo badge grades mobile sheet",
      "badge-stamp",
      "badge-grades-mobile",
    ),
    resultStamp: destinyWarAsset(
      "사자 휘장 도장-Photoroom.png",
      "작전 명령서 완료 도장",
      "badge-stamp",
      "result-stamp",
    ),
    resultStampMobile: localNeoWarRoomAsset(
      "/neo-operation-room/sprites/mobile/neo-result-stamp-mobile.webp",
      "Neo result stamp mobile sheet",
      "badge-stamp",
      "result-stamp-mobile",
    ),
  },
  decor: {
    asset1: destinyWarAsset(
      "작전실 에셋1-Photoroom.png",
      "작전실 장식 에셋 1",
      "decor",
      "decor-1",
    ),
    asset2: destinyWarAsset(
      "작전실 에셋2-Photoroom.png",
      "작전실 장식 에셋 2",
      "decor",
      "decor-2",
    ),
  },
} as const;

export const neoWarRoomMethodAssets: Array<{
  mode: NeoWarRoomConsultMode;
  label: string;
  asset: NeoWarRoomAsset;
}> = [
  { mode: "saju", label: "사주", asset: neoWarRoomAssets.methods.saju },
  { mode: "vedic", label: "베다점", asset: neoWarRoomAssets.methods.vedic },
  { mode: "ziwei", label: "자미두수", asset: neoWarRoomAssets.methods.ziwei },
  { mode: "astrology", label: "점성술", asset: neoWarRoomAssets.methods.astrology },
];

export function getNeoWarRoomBackgroundAsset(viewport: "desktop" | "mobile") {
  return viewport === "mobile" ? neoWarRoomAssets.backgrounds.mobile : neoWarRoomAssets.backgrounds.desktop;
}

export function getNeoWarRoomSpriteAsset(kind: "withBackground" | "transparent", frame: number) {
  const set = neoWarRoomAssets.sprites[kind];
  const index = Math.max(0, Math.min(set.length - 1, Math.floor(frame) - 1));
  return set[index];
}

export function getNeoWarRoomIntroSpriteAsset(frame: number) {
  return getNeoWarRoomSpriteAsset("withBackground", frame);
}

export function getNeoWarRoomAssetUrl(fileName: string) {
  return destinyWarAsset(fileName, "", "decor", "custom").src;
}
