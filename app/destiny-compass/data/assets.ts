/**
 * 나침반 하우스 에셋 — 기존 찻집/전략실 매니페스트 재사용 + 확정 히어로.
 * 신규 파일명 생성 없음(임의 교체 금지 규칙 준수).
 */
import {
  fortuneTeaHouseAssets,
  talkingPigYeoniFrameCrops,
} from "@/src/features/fortune-tea-house/data/assets";
import { neoWarRoomAssets, neoWarRoomBgmTracks } from "@/src/features/neo-war-room/data/assets";
import { getAssetUrlFromPublicPath } from "@/lib/r2-public-url";

const R2_BASE = process.env.NEXT_PUBLIC_ASSETS_BASE_URL || "https://assets.code-destiny.com";

// 확정 히어로: 버킷 루트 (200/image/webp)
export const compassHero = getAssetUrlFromPublicPath("/네오와 연이의 운명 나침반.webp", {
  baseUrl: R2_BASE,
  fallbackPublicPath: "/네오와 연이의 운명 나침반.webp",
  prefix: "",
});

// 소설 페인팅 배경(R2) — 결과 화면 섹션별 몰입 배경. 신규 파일 생성 없이 기존 소설/자미두수 아트 재사용.
const painting = (key: string) => getAssetUrlFromPublicPath(`/${key}`, { baseUrl: R2_BASE, prefix: "" });
export const compassPaintings = {
  island: painting("DestinyAssets/자미두수 운명의 섬.webp"), // 목적지·도착 — 운명의 섬
  ziwei1: painting("CodeDestinyNovel/background/자미두수 세계1.webp"),
  ziwei2: painting("CodeDestinyNovel/background/자미두수 세계2.webp"),
  ziwei3: painting("CodeDestinyNovel/background/자미두수 세계3.webp"),
  ziwei4: painting("CodeDestinyNovel/background/자미두수 세계4.webp"),
  redThread: painting("CodeDestinyNovel/background/숙요점 붉은 실의 세계.webp"), // 관계·인연
} as const;

export const compassAssets = {
  hero: compassHero,
  // 꽃돼지(연이 변신형) — 힐링. 투명 컷아웃 전체 이미지(시트 크롭 미사용, MVP).
  pig: {
    neutral: fortuneTeaHouseAssets.pig.transparent.base1,
    happy: fortuneTeaHouseAssets.pig.transparent.base8,
    talk: fortuneTeaHouseAssets.pig.transparent.talking1,
    think: fortuneTeaHouseAssets.pig.transparent.talking2,
    surprise: fortuneTeaHouseAssets.pig.transparent.talking3,
  },
  // 연이(수달 내레이터)
  yeoni: {
    intro: fortuneTeaHouseAssets.yeoni.transparent.full,
    guide: fortuneTeaHouseAssets.yeoni.transparent.sprite6,
    point: fortuneTeaHouseAssets.yeoni.transparent.sprite7,
  },
  // 네오(사자 팩폭) — 라벨 불명확한 표정 시트 대신 확정 메인 히어로 사용
  neo: {
    main: neoWarRoomAssets.hero.strategyNeoMain.src,
    portrait: neoWarRoomAssets.hero.portrait.src,
  },
  bg: {
    cafe: fortuneTeaHouseAssets.backgrounds.interiorDesktop1,
    cafeMobile: fortuneTeaHouseAssets.backgrounds.interiorMobile1,
    warroom: neoWarRoomAssets.backgrounds.desktop.src,
    warroomMobile: neoWarRoomAssets.backgrounds.mobile.src,
  },
  bgm: {
    warroom: neoWarRoomBgmTracks.moonlitWarRoom.url,
  },
} as const;

// 크롭 프레임(정밀 표정이 필요할 때 사용) — 참조용 재수출
export { talkingPigYeoniFrameCrops };
