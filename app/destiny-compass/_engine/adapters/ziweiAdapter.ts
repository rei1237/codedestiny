/**
 * 자미두수 어댑터 — 결정론 명반(calculateZiweiChart)을 읽기 전용으로 소비해
 * 12궁 강도·사화·문창문곡을 방향성 기여로 변환한다.
 * 입력 매핑에 사용하는 parseBirthDate/parseBirthTime는 사주와 동일 파서(재사용).
 * timezone은 자미 자체 입력 필드일 뿐, 사주 계산 경로에는 주입하지 않는다(하드 제약 2).
 */
import type { EngineAdapter } from "./types";
import type { CompassInput, DirectionKey, EngineContribution } from "../types";
import type { AnimalDestinyInput } from "@/app/saju/animal-destiny/lib/types";
import type { ZiweiUserInput } from "@/app/_lib/ziwei-types";
import { calculateZiweiChart } from "@/app/_lib/ziwei-engine";
import { parseBirthDate, parseBirthTime } from "@/app/saju/animal-destiny/lib/sajuAdapter";
import { ZIWEI_PALACE_DIRECTION, ZIWEI_STUDY_STARS, DIRECTION_KEYS } from "../constants";

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function toZiweiInput(birth: AnimalDestinyInput): ZiweiUserInput {
  const { year, month, day } = parseBirthDate(birth.birthDate);
  const { hour, minute, hasTime } = parseBirthTime(birth.birthTime);
  return {
    name: birth.name || "",
    birthYear: year,
    birthMonth: month,
    birthDay: day,
    birthHour: hour ?? 12,
    birthMinute: minute ?? 0,
    unknownHour: !hasTime,
    gender: birth.gender === "female" ? "F" : "M", // unknown→M(자미는 M/F 필수)
    calendarType: birth.calendarType || "solar",
    isLeapMonth: Boolean(birth.lunarLeap),
    timezone: "Asia/Seoul",
  };
}

export const ziweiAdapter: EngineAdapter = {
  system: "ziwei",
  baseWeight: 0.2,
  isAvailable(): boolean {
    return true;
  },
  async contribute(input: CompassInput): Promise<EngineContribution> {
    const chart = calculateZiweiChart(toZiweiInput(input.birth));
    const directions: Partial<Record<DirectionKey, number>> = {};

    const palaces = Array.isArray(chart.palaces) ? chart.palaces : [];
    const maxScore = Math.max(1, ...palaces.map((p) => Number(p.score) || 0));

    for (const p of palaces) {
      const routes = ZIWEI_PALACE_DIRECTION[p.id];
      if (!routes || routes.length === 0) continue;
      const norm = clamp01((Number(p.score) || 0) / maxScore);
      for (const [dir, w] of routes) {
        directions[dir] = (directions[dir] || 0) + norm * w;
      }
      // 사화 보정: 화록 궁 +부스트, 화기 궁 감점(해당 궁의 방향에)
      const sihua = Array.isArray(p.sihua) ? p.sihua : [];
      if (sihua.includes("화록")) for (const [dir] of routes) directions[dir] = (directions[dir] || 0) + 0.12;
      if (sihua.includes("화기")) for (const [dir] of routes) directions[dir] = (directions[dir] || 0) - 0.1;
    }

    // 문창·문곡(보좌성) → study 기여
    const hasStudyStar = palaces.some((p) =>
      (Array.isArray(p.allStars) ? p.allStars : []).some((s) => ZIWEI_STUDY_STARS.includes(s.name)),
    );
    if (hasStudyStar) directions.study = (directions.study || 0) + 0.15;

    for (const k of DIRECTION_KEYS) {
      if (directions[k] !== undefined) directions[k] = clamp01(directions[k] as number);
    }

    // 시주 결측이면 시주 궁 불확실 → 품질 감점
    const dataQuality = input.birth.birthTime ? 1 : 0.75;
    return { directions, dataQuality };
  },
};
