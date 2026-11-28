// 인생 보정 P3 — 자미두수 연도 신호 래퍼. 설계: docs/context/life-calibration.md "엔진별 연도 신호"
// 읽기 전용 래퍼다. 완성된 명반(ZiweiDeepChart)에 yearFlowTheory(app/_lib/ziwei-year-flow.ts)를 해마다 부르고
// 그 tone 만 옮긴다. 명반 계산·유년 이론은 바꾸지 않는다.
// tone 대응(개발 정책 보조값): expand → favorable, guard → unfavorable, mixed·calm → neutral(판단 없음).
// 유년은 음력 설 기준이라, 1월 사건은 전년, 2월 사건은 전년·당년 둘 다 후보로 보고 두 판단이 같을 때만 센다.
import { yearFlowTheory, type FlowTone } from "../../app/_lib/ziwei-year-flow";
import type { ZiweiDeepChart } from "../../app/_lib/ziwei-types";

export const ZIWEI_SIGNALS_VERSION = "life-calibration-ziwei-v1";

type Tone = "favorable" | "unfavorable" | "neutral" | "ambiguous";
interface ToneEntry { tone: Tone; periodYear?: number }
export interface ZiweiSignals {
  engine: "ziwei";
  version: string;
  status: "available" | "unavailable";
  reason?: string;
  years: Record<string, ToneEntry>;
  months: Record<string, ToneEntry>;
}

export function ziweiToneOf(tone: FlowTone): Tone {
  return tone === "expand" ? "favorable" : tone === "guard" ? "unfavorable" : "neutral";
}

const candidates = (year: number, month: number | null) => (month === 1 ? [year - 1] : month === 2 ? [year - 1, year] : [year]);

export function ziweiYearSignals({ chart, years }: { chart: ZiweiDeepChart | null | undefined; years: number[] }): ZiweiSignals {
  const unavailable = (reason: string): ZiweiSignals => ({ engine: "ziwei", version: ZIWEI_SIGNALS_VERSION, status: "unavailable", reason, years: {}, months: {} });
  if (!chart || !Array.isArray(chart.palaces) || chart.palaces.length !== 12) return unavailable("ziwei-chart-required");
  const ys = [...new Set((years || []).filter((y) => Number.isInteger(y)))].sort((a, b) => a - b);
  if (!ys.length) return unavailable("no-years");
  const cache = new Map<number, Tone>();
  const toneAt = (y: number): Tone => {
    if (!cache.has(y)) cache.set(y, ziweiToneOf(yearFlowTheory(chart, y).tone));
    return cache.get(y) as Tone;
  };
  const out: ZiweiSignals = { engine: "ziwei", version: ZIWEI_SIGNALS_VERSION, status: "available", years: {}, months: {} };
  const resolve = (year: number, month: number | null): ToneEntry => {
    const tones = new Set(candidates(year, month).map(toneAt));
    return { tone: tones.size === 1 ? [...tones][0] : "ambiguous", periodYear: month === 1 ? year - 1 : year };
  };
  for (const year of ys) {
    out.years[year] = { tone: resolve(year, null).tone };
    for (let month = 1; month <= 12; month += 1) out.months[`${year}-${month}`] = resolve(year, month);
  }
  return out;
}
