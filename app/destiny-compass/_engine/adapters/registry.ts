/**
 * 어댑터 레지스트리 — 5체계 전부 배선(사주+자미+숙요+타로+베다) + 가용 엔진 가중치 재정규화.
 * 신규 엔진은 여기 배열에 추가하면 자동 참여한다.
 */
import type { EngineAdapter } from "./types";
import type { CompassInput, SystemKey } from "../types";
import { sajuAdapter } from "./sajuAdapter";
import { ziweiAdapter } from "./ziweiAdapter";
import { sukuyoAdapter } from "./sukuyoAdapter";
import { tarotAdapter } from "./tarotAdapter";
import { vedicAdapter } from "./vedicAdapter";

export const ADAPTERS: readonly EngineAdapter[] = [sajuAdapter, ziweiAdapter, sukuyoAdapter, tarotAdapter, vedicAdapter];

export function availableAdapters(input: CompassInput): EngineAdapter[] {
  return ADAPTERS.filter((a) => a.isAvailable(input));
}

// 가용 어댑터 baseWeight를 합=1로 재정규화(system→normalized weight)
export function normalizedWeights(adapters: EngineAdapter[]): Map<SystemKey, number> {
  const total = adapters.reduce((s, a) => s + a.baseWeight, 0) || 1;
  const map = new Map<SystemKey, number>();
  for (const a of adapters) map.set(a.system, a.baseWeight / total);
  return map;
}
