/**
 * 사주 어댑터 — 기존 십이운성 동물점 결과(resolveAnimalTwelveResult)를 읽기 전용으로
 * 소비해 방향성 기여로 변환한다. 계산 경로는 수정하지 않는다(import만).
 */
import type { EngineAdapter } from "./types";
import type { CompassInput, DirectionKey, EngineContribution } from "../types";
import { resolveAnimalTwelveResult } from "@/app/saju/animal-destiny/lib/sajuAdapter";
import {
  SAJU_ENERGY_DIRECTION,
  SAJU_STAGE_GROUP,
  SAJU_STAGE_MOMENTUM,
  DIRECTION_KEYS,
} from "../constants";

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export const sajuAdapter: EngineAdapter = {
  system: "saju",
  baseWeight: 0.4,
  // 사주는 로컬 결정론 계산이라 항상 가용.
  isAvailable(): boolean {
    return true;
  },
  async contribute(input: CompassInput): Promise<EngineContribution> {
    const resolved = await resolveAnimalTwelveResult(input.birth);
    const directions: Partial<Record<DirectionKey, number>> = {};

    const profile = resolved.profile;
    if (profile && profile.energyScores) {
      const e = profile.energyScores;
      const raw: Record<string, number> = {
        charm: Number(e.charm) || 0,
        drive: Number(e.drive) || 0,
        recovery: Number(e.recovery) || 0,
        money: Number(e.money) || 0,
        love: Number(e.love) || 0,
        intuition: Number(e.intuition) || 0,
      };
      // 스케일 불변: 6개 중 최댓값 기준 상대 정규화(0..1)
      const max = Math.max(1, ...Object.values(raw));
      for (const stat of Object.keys(SAJU_ENERGY_DIRECTION)) {
        const v = (raw[stat] || 0) / max;
        for (const [dir, w] of SAJU_ENERGY_DIRECTION[stat]) {
          directions[dir] = (directions[dir] || 0) + v * w;
        }
      }
    }

    // 십이운성 대표 단계 → timeline momentum + weather 힌트(전 구간 동일 기준값)
    const stage = resolved.representativeStage?.labelKo;
    let momentum = SAJU_STAGE_MOMENTUM.nascent;
    if (stage) {
      if (SAJU_STAGE_GROUP.rising.includes(stage)) momentum = SAJU_STAGE_MOMENTUM.rising;
      else if (SAJU_STAGE_GROUP.declining.includes(stage)) momentum = SAJU_STAGE_MOMENTUM.declining;
      else momentum = SAJU_STAGE_MOMENTUM.nascent;
    }
    const m01 = momentum / 100;
    const timelineHint = { d30: m01, d90: m01, y1: m01, y3: m01 };

    // 정규화 클램프
    for (const k of DIRECTION_KEYS) {
      if (directions[k] !== undefined) directions[k] = clamp01(directions[k] as number);
    }

    // 시주 결측 시 품질 감점. 계산 실패(ok=false)면 크게 감점.
    const timeUnknown = !input.birth.birthTime;
    const dataQuality = resolved.ok ? (timeUnknown ? 0.75 : 1) : 0.4;

    const evidence = stage
      ? [{ system: "saju" as const, term: `십이운성 ${stage}`, detail: "일간 기준 대표 단계" }]
      : undefined;

    return { directions, timelineHint, dataQuality, evidence };
  },
};
