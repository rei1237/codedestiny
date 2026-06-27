import { getAssetUrlFromPublicPath } from "@/lib/r2-public-url";

const R2_ASSET_BASE_URL = process.env.NEXT_PUBLIC_ASSETS_BASE_URL || "https://assets.code-destiny.com";

const teaHouseAsset = (fileName: string) =>
  getAssetUrlFromPublicPath(`/DestinyCafe/${fileName}`, {
    baseUrl: R2_ASSET_BASE_URL,
    fallbackPublicPath: `/DestinyCafe/${fileName}`,
    prefix: "",
  });

export const fortuneTeaHouseAssets = {
  pig: {
    emotionGauge: teaHouseAsset("꽃돼지 감정 분석 바 게이지.webp"),
    transform: teaHouseAsset("꽃돼지 연이 변신.webp"),
    base1: teaHouseAsset("꽃돼지.webp"),
    base2: teaHouseAsset("꽃돼지2.webp"),
    base3: teaHouseAsset("꽃돼지3.webp"),
    base4: teaHouseAsset("꽃돼지4.webp"),
    base5: teaHouseAsset("꽃돼지5.webp"),
    base6: teaHouseAsset("꽃돼지6.webp"),
    base7: teaHouseAsset("꽃돼지7.webp"),
    base8: teaHouseAsset("꽃돼지8.webp"),
    talking1: teaHouseAsset("말하는 꽃돼지 연이1.webp"),
    talking2: teaHouseAsset("말하는 꽃돼지 연이2.webp"),
    talking3: teaHouseAsset("말하는 꽃돼지 연이3.webp"),
  },
  yeoni: {
    bubble: teaHouseAsset("연이 말풍선.webp"),
    bust: teaHouseAsset("연이 반신상.webp"),
    full: teaHouseAsset("연이 전신상.webp"),
    sprite1: teaHouseAsset("연이 스프라이트1.webp"),
    sprite2: teaHouseAsset("연이 스프라이트2.webp"),
    sprite3: teaHouseAsset("연이 스프라이트3.webp"),
    sprite4: teaHouseAsset("연이 스프라이트4.webp"),
    sprite5: teaHouseAsset("연이 스프라이트5.webp"),
    sprite6: teaHouseAsset("연이 스프라이트6.webp"),
    sprite7: teaHouseAsset("연이 스프라이트7.webp"),
    cupPose: teaHouseAsset("연이 컵을 내미는 포즈.webp"),
    cupPoseSheet: teaHouseAsset("연이 컵을 내미는 포즈 스프라이트 시트.webp"),
    tarotCard: teaHouseAsset("연이 타로 카드.webp"),
    tarotCardAnim: teaHouseAsset("연이 타로 카드 애니메이션.webp"),
  },
  backgrounds: {
    mainDesktop: teaHouseAsset("운명의 찻집 데스크탑.webp"),
    mainMobile: teaHouseAsset("운명의 찻집 모바일.webp"),
    landingDesktop: teaHouseAsset("운명의 찻집 데스크탑.webp"),
    landingMobile: teaHouseAsset("운명의 찻집 모바일.webp"),
    interiorDesktop1: teaHouseAsset("운명의 찻집 내부 데스크탑1.webp"),
    interiorDesktop2: teaHouseAsset("운명의 찻집 내부 데스크탑2.webp"),
    interiorMobile1: teaHouseAsset("운명의 찻집 내부 모바일 1.webp"),
    interiorMobile2: teaHouseAsset("운명의 찻집 내부 모바일2.webp"),
    menuDesktop: teaHouseAsset("운명의 찻집 메뉴판 데스크탑.webp"),
    menuMobile: teaHouseAsset("운명의 찻집 메뉴판 모바일.webp"),
    desktop: teaHouseAsset("로딩 배경 데스크탑.webp"),
    mobile: teaHouseAsset("로딩 배경 모바일.webp"),
    loadingDesktop: teaHouseAsset("로딩 배경 데스크탑.webp"),
    loadingMobile: teaHouseAsset("로딩 배경 모바일.webp"),
    loadingScene: teaHouseAsset("로딩 화면.webp"),
  },
  ui: {
    buttons: teaHouseAsset("버튼 ui 에셋 세트.webp"),
    selection: teaHouseAsset("선택 UI.webp"),
    menuDesktop: teaHouseAsset("운명의 찻집 메뉴판 데스크탑.webp"),
    menuMobile: teaHouseAsset("운명의 찻집 메뉴판 모바일.webp"),
    overlay: teaHouseAsset("오버레이.webp"),
    overlay2: teaHouseAsset("오버레이2.webp"),
    overlay1: teaHouseAsset("오버레이.webp"),
    resultSheet: teaHouseAsset("운명의 찻집 결과 시트.webp"),
  },
  teaCups: {
    labeledSheet: teaHouseAsset("찻잔 이미지.webp"),
    stateSheet: teaHouseAsset("찻잔 이미지2.webp"),
  },
  tea: {
    cups1: teaHouseAsset("찻잔 이미지.webp"),
    cups2: teaHouseAsset("찻잔 이미지2.webp"),
  },
  tarot: {
    yeoniCard: teaHouseAsset("연이 타로 카드.webp"),
    yeoniCardAnimation: teaHouseAsset("연이 타로 카드 애니메이션.webp"),
    frameSheet: teaHouseAsset("타로카드 매핑.webp"),
    majorArcana: teaHouseAsset("타로카드 매핑2.webp"),
    minorWandsCups: teaHouseAsset("타로카드 매핑3.webp"),
    minorSwordsPentacles: teaHouseAsset("타로카드 매핑4.webp"),
  },
  tenGods: {
    sheet: teaHouseAsset("십성.webp"),
  },
} as const;

export const talkingPigYeoniFrames = [
  fortuneTeaHouseAssets.pig.talking1,
  fortuneTeaHouseAssets.pig.talking2,
  fortuneTeaHouseAssets.pig.talking3,
] as const;
