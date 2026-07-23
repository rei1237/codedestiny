/**
 * Layer 2 — 운명의 갈림길(A/B) 결정론 비교(STEP 7).
 * 두 선택지의 텍스트 + 방향장 시드를 해시해 시스템별 기운 점수를 산출한다.
 * 결정론: Math.random/Date 미사용(시드·해시만). 정답 단정이 아니라 '기운 비교' 연출.
 */
import type { CrossroadOption, CrossroadResult, DirectionField, SystemKey } from "./types";

function hashInt(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h >>> 0;
}
function clamp0100(n: number): number {
  return n < 0 ? 0 : n > 100 ? 100 : n;
}
function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

const FALLBACK_SYSTEMS: readonly SystemKey[] = ["saju", "ziwei"];

export function computeCrossroad(field: DirectionField, optionA: string, optionB: string): CrossroadResult {
  const systems = field.sources.length ? field.sources : FALLBACK_SYSTEMS;
  const seed = field.seed;

  const build = (id: "A" | "B", rawLabel: string): CrossroadOption => {
    const label = rawLabel.trim() || id;
    const base = 52 + (hashInt(`${seed}|base|${label}`) % 26); // 52..77
    const systemScores: Partial<Record<SystemKey, number>> = {};
    let sum = 0;
    for (const sys of systems) {
      const jitter = (hashInt(`${seed}|${sys}|${label}`) % 37) - 18; // -18..+18
      const v = clamp0100(base + jitter);
      systemScores[sys] = v;
      sum += v;
    }
    const total = Math.round(sum / systems.length);
    return { id, labelKey: label, systemScores, total };
  };

  const a = build("A", optionA);
  const b = build("B", optionB);
  // 동점은 라벨 사전순으로 결정(결정론)
  const recommended: "A" | "B" =
    a.total === b.total ? (a.labelKey.localeCompare(b.labelKey) <= 0 ? "A" : "B") : a.total >= b.total ? "A" : "B";
  const gap = Math.abs(a.total - b.total);
  const confidence = clamp01(0.55 + (Math.min(gap, 30) / 30) * 0.35); // 0.55..0.9

  return { options: [a, b], recommended, confidence, seed };
}
