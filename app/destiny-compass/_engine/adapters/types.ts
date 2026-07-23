/**
 * 엔진 어댑터 계약 — 각 운세 엔진(사주·자미·타로·베다·숙요)의 기존 결과를
 * 읽기 전용으로 소비해 방향성 기여로 변환한다. 계약만 선언(STEP 5-1).
 */
import type { CompassInput, EngineContribution, SystemKey } from "../types";

export interface EngineAdapter {
  system: SystemKey;
  /** 재정규화 전 기본 가중치 */
  baseWeight: number;
  /** 배선·데이터 여부. false면 가중치 재정규화에서 제외 */
  isAvailable(input: CompassInput): boolean;
  /** 결정론: 동일 입력 → 동일 기여 */
  contribute(input: CompassInput): Promise<EngineContribution>;
}
