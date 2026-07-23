/**
 * Layer 3 연출 매핑 — Layer 2 스코어(읽기 전용)를 캐릭터 표정·나침반 각도로 변환.
 * 이 레이어는 스코어 값을 절대 바꾸지 않는다(read-only).
 */
import type { DirectionKey, EmotionKey, ScoreBand, Severity } from "../_engine/types";
import { DIRECTION_KEYS } from "../_engine/constants";
import { compassAssets } from "../data/assets";

// 나침반 8방향 배치 순서(시계 12시부터 시계방향)
export const COMPASS_ORDER: readonly DirectionKey[] = DIRECTION_KEYS;

/** 대표 방향 → 바늘 각도(도). 위(0°)=첫 방향, 시계방향 균등 배치. */
export function needleAngle(primary: DirectionKey): number {
  const i = COMPASS_ORDER.indexOf(primary);
  const idx = i < 0 ? 0 : i;
  return idx * (360 / COMPASS_ORDER.length);
}

type PigExpression = keyof typeof compassAssets.pig; // neutral|happy|talk|think|surprise

/** 밴드 + 감정 → 꽃돼지 표정 키 */
export function pigExpression(band: ScoreBand, emotion: EmotionKey): PigExpression {
  if (emotion === "tired" || emotion === "numb" || emotion === "anxious") return "talk"; // 위로 우선
  if (band === "strong") return "happy";
  if (band === "caution") return "think";
  return "talk";
}

/** 안개 해제 비율(0..1) — 응답 수 / 전체 질문 수 */
export function fogClearedRatio(answered: number, total: number): number {
  if (total <= 0) return 1;
  const r = answered / total;
  return r < 0 ? 0 : r > 1 ? 1 : r;
}

/** severity → 네오 톤 라벨(카피 강도 힌트) */
export function neoTone(severity: Severity): "gentle" | "firm" | "sharp" {
  return severity === "high" ? "sharp" : severity === "mid" ? "firm" : "gentle";
}

/** confidence(0..1) → 별점(0..5) */
export function confidenceStars(confidence: number): number {
  return Math.max(0, Math.min(5, Math.round(confidence * 5)));
}
