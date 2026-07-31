/**
 * 사주 어댑터 — 기존 십이운성 동물점 결과(resolveAnimalTwelveResult)를 읽기 전용으로
 * 소비해 방향성 기여로 변환한다. 계산 경로는 수정하지 않는다(import만).
 */
import type { EngineAdapter } from "./types";
import type { CompassInput, DirectionKey, EngineContribution, Evidence } from "../types";
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

const PILLAR_KO: Record<string, string> = { year: "연주", month: "월주", day: "일주", hour: "시주" };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** {stem, branch} → "갑자". 어느 한쪽이라도 없으면 null(빈 간지를 근거로 내보내지 않는다). */
function ganjiOf(value: unknown): string | null {
  const p = asRecord(value);
  const stem = String(p?.stem ?? "").trim();
  const branch = String(p?.branch ?? "").trim();
  return stem && branch ? `${stem}${branch}` : null;
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

    // 🔴 evidence[0] 고정: 기존 소비처(MapResult의 체계별 근거 라벨)가 인덱스 0을 읽는다.
    //    신규 항목은 반드시 아래로만 append 한다.
    const evidence: Evidence[] = [];
    if (stage) {
      evidence.push({
        system: "saju",
        term: `십이운성 ${stage}`,
        detail: "일간 기준 대표 단계",
        id: "saju.stage",
        group: "core",
      });
    }

    const sajuResult = asRecord(resolved.sajuResult);
    const pillars = asRecord(sajuResult?.pillars);
    if (pillars) {
      const text = (["year", "month", "day", "hour"] as const)
        .map((k) => {
          const gz = ganjiOf(pillars[k]);
          return gz ? `${PILLAR_KO[k]} ${gz}` : null;
        })
        .filter(Boolean)
        .join(" · ");
      if (text) {
        evidence.push({ system: "saju", term: "사주 명식", detail: text, id: "saju.pillars", group: "structure" });
      }
    }
    const dayStem = String(sajuResult?.dayStem ?? "").trim();
    if (dayStem) {
      evidence.push({ system: "saju", term: `일간 ${dayStem}`, detail: "명식의 주체", id: "saju.dayStem", group: "core" });
    }

    // 주별 십이운성 — 대표 단계 하나만으로는 '어느 자리에서 강한지'가 드러나지 않는다.
    const stageRows = (resolved.allStages || [])
      .map((s) => (s?.pillar && s?.labelKo ? `${PILLAR_KO[s.pillar] || s.pillar} ${s.labelKo}` : null))
      .filter(Boolean);
    if (stageRows.length) {
      evidence.push({
        system: "saju",
        term: "주별 십이운성",
        detail: stageRows.join(" · "),
        id: "saju.stagesByPillar",
        group: "structure",
      });
    }

    if (profile?.energyScores) {
      const e = profile.energyScores;
      const rows: [string, number][] = [
        ["매력", Number(e.charm) || 0],
        ["추진", Number(e.drive) || 0],
        ["회복", Number(e.recovery) || 0],
        ["재물", Number(e.money) || 0],
        ["애정", Number(e.love) || 0],
        ["직관", Number(e.intuition) || 0],
      ];
      rows.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      evidence.push({
        system: "saju",
        term: "기운 분포",
        detail: rows.map(([k, v]) => `${k} ${v}`).join(" · "),
        id: "saju.energy",
        group: "flow",
      });
    }

    return { directions, timelineHint, dataQuality, evidence: evidence.length ? evidence : undefined };
  },
};
