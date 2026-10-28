import type { LoadingLocale } from "@/constants/loadingMessages";

/**
 * 전문가 상담(기본 상담 제외)에 붙는 라이트노벨 캐릭터.
 * 원작 정본: docs/webnovel_review/SAJU_SERIES_BIBLE.md (윤달 L59, 무성 L61, 서한비 L58).
 *  - yun    → 점성술 AI (윤달)
 *  - musung → 자미두수 AI·심층 리포트 (무성, 원작대로 소년)
 *  - hanbi  → 숙요점 궁합 AI (서한비 — R2 파일명·`pje` 키는 유지하되 "박지은"은 영구 금지)
 *  - yeoni  → 손금 (소설 캐주얼 연이 — 찻집 한복 버전·돼지 폼은 쓰지 않는다)
 */
export type ExpertCharacterKey = "yun" | "musung" | "hanbi" | "yeoni";

export type ExpertMood = "idle" | "greet" | "thinking" | "reveal" | "caution" | "comfort" | "error" | "empty";

/** cutout: 투명 배경 스프라이트(바닥 정렬) / card: 불투명 정사각 흉상(꽉 채움) */
export type ExpertSpriteFit = "cutout" | "card";

export type ExpertSprite = {
  src: string;
  alt: string;
};

export type ExpertLine = {
  id: string;
  mood: ExpertMood;
  text: string;
};

export type ExpertCharacter = {
  key: ExpertCharacterKey;
  /** 롤백 스위치 — false 면 모든 무대가 렌더되지 않고 기존 화면만 남는다. */
  enabled: boolean;
  name: { ko: string; en: string };
  title: { ko: string; en: string };
  spriteFit: ExpertSpriteFit;
  /** CSS aspect-ratio 값. 레이아웃 흔들림을 막기 위해 스프라이트 원본 비율로 고정한다. */
  spriteAspect: string;
  moods: Record<ExpertMood, ExpertSprite>;
  hero: ExpertSprite & { width: number; height: number };
  /** 말하기 프레임. idle 표정과 같은 캔버스에서 입만 바뀐 컷이며, 대사가 바뀔 때 잠깐 돌린다. */
  talkFrames?: readonly ExpertSprite[];
  lines: Record<string, ExpertLine>;
  /** 영어 번역. 표에 없는 로케일은 영어로, 영어에도 없으면 한국어 원문으로 내려간다. */
  linesEn: Record<string, string>;
};

export type ExpertLocale = LoadingLocale | string;
