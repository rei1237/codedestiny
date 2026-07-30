/**
 * 마스터 인연의 서 (MASTER_LOVE_CODEX) — R2 에셋 매니페스트.
 *
 * 기존 노벨 에셋을 재사용한다(신규 파일명 생성 없음 — 임의 교체 금지 규칙 준수).
 * 화자(연애 고수) 컷은 온화 4종만 쓴다. 냉소·조롱·유혹·화남·광기 컷은 이 기능의
 * "운명의 안내자" 톤과 맞지 않아 의도적으로 제외했다(되살리지 말 것).
 */
import { getAssetUrlFromPublicPath } from "@/lib/r2-public-url";

const R2_BASE = process.env.NEXT_PUBLIC_ASSETS_BASE_URL || "https://assets.code-destiny.com";

const novelAsset = (fileName: string) =>
  getAssetUrlFromPublicPath(`/CodeDestinyNovel/${fileName}`, {
    baseUrl: R2_BASE,
    fallbackPublicPath: `/CodeDestinyNovel/${fileName}`,
    prefix: "",
  });

const novelBackground = (fileName: string) => novelAsset(`background/${fileName}`);

const rootAsset = (fileName: string) =>
  getAssetUrlFromPublicPath(`/${fileName}`, {
    baseUrl: R2_BASE,
    fallbackPublicPath: `/${fileName}`,
    prefix: "",
  });

export const masterLoveCodexAssets = {
  /** 메인 화면 대표 카드 · 랜딩 히어로 (1536×1024, 3:2) */
  cover: rootAsset("마스터 운명 연애 비책.webp"),
  backgrounds: {
    library: novelBackground("신비의 도서관.webp"),
    libraryDeep: novelBackground("신비의 도서관2.webp"),
  },
  narrator: {
    calm: novelAsset("박지은 무표정.webp"),
    base: novelAsset("박지은 기본.webp"),
    speaking: novelAsset("박지은 말함.webp"),
    speakingAlt: novelAsset("박지은 말함2.webp"),
  },
} as const;

/**
 * 배경음 — 이미 R2 `Meditation/` 에 있는 앰비언트만 쓴다(신규 업로드 없음).
 * 고요한 도서관에서 연애를 상담받는 자리라, 리듬이 도드라지는 보컬 트랙(DEST1NOVA·
 * lunabloom)과 전투 트랙(DestinyWar)은 제외했다. 볼륨은 낭독을 덮지 않는 선.
 */
export const masterLoveCodexBgmTracks = {
  /** 입장·프롤로그·생년 입력 — 달빛 문을 지나 서고로 들어가는 구간 */
  libraryGate: {
    key: "moonlit-temple-gate",
    url: "https://music.code-destiny.com/Meditation/Moonlit%20Temple%20Gate.mp3",
    volume: 0.22,
  },
  /** 생성 대기 — 20장이 쓰이는 동안 흐르는 필사실 */
  scriptorium: {
    key: "flowing-light",
    url: "https://music.code-destiny.com/Meditation/Flowing%20Light.mp3",
    volume: 0.2,
  },
  /** 열람 — 인연을 읽어 내려가는 구간 */
  reading: {
    key: "the-stars-remember-your-name",
    url: "https://music.code-destiny.com/Meditation/The%20Stars%20Remember%20Your%20Name.mp3",
    volume: 0.22,
  },
} as const;

export type MasterLoveCodexBgmTrack = (typeof masterLoveCodexBgmTracks)[keyof typeof masterLoveCodexBgmTracks];

/** 프롤로그 라인의 mood → 화자 컷 */
export type CodexNarratorMood = "calm" | "base" | "speaking" | "speakingAlt";

export function getNarratorAsset(mood: CodexNarratorMood | undefined): string {
  if (mood && mood in masterLoveCodexAssets.narrator) {
    return masterLoveCodexAssets.narrator[mood];
  }
  return masterLoveCodexAssets.narrator.base;
}
