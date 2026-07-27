/**
 * 운명의 나침반 하우스 — Layer 2(해석) 타입 정의.
 * 순수 타입 선언만. 로직 없음(STEP 5-1). 3-레이어: 계산(읽기전용) → 해석(여기) → 연출.
 * 스키마 근거: docs/destiny-compass/step3-architecture.md §1.
 */
import type { AnimalDestinyInput } from "@/app/saju/animal-destiny/lib/types";

// ── 입력 ──────────────────────────────────────────────────────────────
export type EmotionKey =
  | "tired"    // 지침
  | "anxious"  // 불안
  | "confused" // 혼란
  | "numb"     // 무덤덤
  | "hopeful"  // 기대
  | "excited"; // 설렘

export interface FogAnswer {
  /** 질문 식별자 */
  qid: string;
  /** 선택지 값 (결정론 시드에 포함) */
  choice: string;
}

export interface CompassInput {
  birth: AnimalDestinyInput;
  emotion: EmotionKey;
  /** 자유 상황 입력(선택) */
  situation?: string;
  /** 안개 걷기 Q&A 응답 3~5개 */
  answers: FogAnswer[];
  /** "YYYY-MM-DD" (KST 민용일) — 일 단위 결정론 시드 */
  dateSeed: string;
}

// ── 스코어 ────────────────────────────────────────────────────────────
export type DirectionKey =
  | "career"       // 직장·커리어
  | "venture"      // 창업·도전
  | "study"        // 공부·성장
  | "relationship" // 인간관계
  | "love"         // 연애
  | "wealth"       // 재물
  | "health"       // 건강
  | "rest";        // 정비·휴식

export type SystemKey = "saju" | "ziwei" | "tarot" | "vedic" | "sukuyo";
export type ScoreBand = "strong" | "steady" | "caution";
export type Weather = "storm" | "fog" | "breeze" | "clear"; // 폭풍/안개/순풍/맑음
export type Severity = "low" | "mid" | "high";
export type TimelineKey = "d30" | "d90" | "y1" | "y3";

/** 결과 근거(원 용어) — 각 엔진이 결론의 뿌리가 된 자기 체계의 용어를 남긴다. */
export interface Evidence {
  system: SystemKey;
  /** 원 용어(예: "각수(角宿)", "정관 투출", "화록입명궁") */
  term: string;
  /** 보조 설명(짧게) */
  detail?: string;
}

/** 엔진별 어댑터가 반환하는 정규화 기여(각 0..1) */
export interface EngineContribution {
  directions: Partial<Record<DirectionKey, number>>;
  timelineHint?: Partial<Record<TimelineKey, number>>;
  /** 0..1 — 데이터 품질(예: 시주 결측 시 감점) */
  dataQuality: number;
  /** 결과 근거(원 용어) — field.raw에 보존되어 근거 심화·AI 문장화에 사용(선택) */
  evidence?: Evidence[];
}

export interface DirectionScore {
  key: DirectionKey;
  /** 라벨 참조(현재 DirectionKey, i18n 배선 시 사전 키로 승격) */
  labelKey: string;
  /** 0..100 정규화 */
  score: number;
  band: ScoreBand;
  contributingSystems: SystemKey[];
}

export interface TimelinePhase {
  weather: Weather;
  /** 0..100 */
  momentum: number;
  headlineKey: string;
}

export interface LuckyGuide {
  avoidKeys: string[];
  recommendKeys: string[];
  luckyPersonKey: string;
  luckyPlaceKey: string;
  luckyColorKey: string;
  luckyFoodKey: string;
  luckyTimeKey: string;
}

export interface DirectionField {
  /** score 내림차순 정렬 */
  directions: DirectionScore[];
  primary: DirectionScore;
  blockedArea: { key: DirectionKey; labelKey: string; severity: Severity };
  strongArea: { key: DirectionKey; labelKey: string };
  timeline: Record<TimelineKey, TimelinePhase>;
  lucky: LuckyGuide;
  /** 0..1 — 별점 = round(confidence*5) */
  confidence: number;
  /** 실제 소비된 엔진 */
  sources: SystemKey[];
  /** 결정론 시드(문서화) */
  seed: string;
  /** 투명성용 원본 기여(연출 레이어는 참조만) */
  raw: Partial<Record<SystemKey, EngineContribution | null>>;
}

// ── 갈림길 / 오늘의 한 걸음 ────────────────────────────────────────────
export interface CrossroadOption {
  id: "A" | "B";
  labelKey: string;
  systemScores: Partial<Record<SystemKey, number>>; // 0..100
  total: number;
}

export interface CrossroadResult {
  options: [CrossroadOption, CrossroadOption];
  recommended: "A" | "B";
  confidence: number;
  seed: string;
}

export interface TodayStep {
  directionKey: DirectionKey;
  /** 규칙 템플릿 키(AI 실패 시 폴백) */
  actionKey: string;
  /** AI 생성 문구(성공 시) */
  aiText?: string;
  /** dateSeed 기반 — 하루 1회 회전 */
  seed: string;
}
