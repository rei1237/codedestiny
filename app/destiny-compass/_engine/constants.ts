/**
 * 운명의 나침반 하우스 — 상수/매핑 데이터(순수 데이터, 로직 없음 · STEP 5-1).
 * 근거: docs/destiny-compass/step3-architecture.md §3.
 * 방향 라벨의 12로케일 i18n 사전은 _lib/copy.ts 의 directionLabel/directionShortLabel 로 등록되었다.
 */
import type {
  DirectionKey,
  EmotionKey,
  ScoreBand,
  SystemKey,
  Weather,
} from "./types";

// 방향 도메인 목록(나침반 8방향)
export const DIRECTION_KEYS: readonly DirectionKey[] = [
  "career", "venture", "study", "relationship",
  "love", "wealth", "health", "rest",
] as const;

// 감정 체크인 목록 + ko 라벨
export const EMOTION_KEYS: readonly EmotionKey[] = [
  "tired", "anxious", "confused", "numb", "hopeful", "excited",
] as const;

export const EMOTION_LABEL_KO: Record<EmotionKey, string> = {
  tired: "지침",
  anxious: "불안",
  confused: "혼란",
  numb: "무덤덤",
  hopeful: "기대",
  excited: "설렘",
};

// 엔진 기본 가중치(가용 엔진만 재정규화). MVP = saju+ziwei → 실효 0.67/0.33.
export const SYSTEM_BASE_WEIGHT: Record<SystemKey, number> = {
  saju: 0.40,
  ziwei: 0.20,
  tarot: 0.15,
  vedic: 0.15,
  sukuyo: 0.10,
};

// MVP에서 실제 배선된 엔진(나머지는 어댑터 isAvailable=false로 자동 제외)
export const MVP_SYSTEMS: readonly SystemKey[] = ["saju", "ziwei"] as const;

// 스코어 밴드 임계값(0..100): >=strong→strong, >=steady→steady, 그 외 caution
export const BAND_THRESHOLD: Record<Exclude<ScoreBand, "caution">, number> = {
  strong: 70,
  steady: 45,
};

// momentum(0..100) → weather. 큰 값부터 매칭.
export const WEATHER_THRESHOLD: ReadonlyArray<readonly [number, Weather]> = [
  [75, "clear"],
  [55, "breeze"],
  [35, "fog"],
  [0, "storm"],
] as const;

// 사주 energyScores → 방향 기여([방향, 가중]). 도메인 정합(money→wealth 등)이
// game_stats보다 명확해 이걸 1차 신호로 쓴다. 정규화(0..1)는 sajuAdapter에서.
export const SAJU_ENERGY_DIRECTION: Record<string, ReadonlyArray<readonly [DirectionKey, number]>> = {
  charm: [["relationship", 0.55], ["love", 0.45]],
  drive: [["venture", 0.55], ["career", 0.45]],
  recovery: [["rest", 0.7], ["health", 0.3]],
  money: [["wealth", 1]],
  love: [["love", 1]],
  intuition: [["study", 0.7], ["health", 0.3]],
};

// 자미 12궁(palace id) → 방향 기여. palace id는 ziwei-types.ts ZiweiPalaceId 정본.
export const ZIWEI_PALACE_DIRECTION: Record<string, ReadonlyArray<readonly [DirectionKey, number]>> = {
  career: [["career", 1]],
  wealth: [["wealth", 1]],
  property: [["wealth", 1], ["rest", 0.5]],
  spouse: [["love", 1]],
  friends: [["relationship", 1]],
  siblings: [["relationship", 1]],
  travel: [["venture", 1], ["career", 0.5]],
  children: [["venture", 1]],
  health: [["health", 1]],
  fortune: [["rest", 1], ["health", 0.5]],
  parents: [["relationship", 1], ["study", 0.5]],
  ming: [], // 명궁 = 전역 강도 부스트(로직에서 처리)
};

// 자미 보좌성 → study 기여(문서·학문)
export const ZIWEI_STUDY_STARS: readonly string[] = ["문창", "문곡"] as const;

// 십이운성(TwelveStage 정본 라벨) → 흐름 그룹. rising=상승/nascent=태동/declining=하강.
export const SAJU_STAGE_GROUP: Record<"rising" | "declining" | "nascent", readonly string[]> = {
  rising: ["장생", "목욕", "관대", "건록", "제왕"],
  declining: ["쇠", "병", "사", "묘", "절"],
  nascent: ["태", "양"],
};

// 그룹별 timeline momentum(0..100) 기준값 → weather는 WEATHER_THRESHOLD로 파생
export const SAJU_STAGE_MOMENTUM: Record<"rising" | "declining" | "nascent", number> = {
  rising: 78,
  declining: 40,
  nascent: 58,
};
