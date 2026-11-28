// 인생 보정 P3 — 사주 연도 신호 래퍼. 설계: docs/context/life-calibration.md "엔진별 연도 신호"
// 읽기 전용 래퍼다. 운 판단은 사주 경험 보정 v1(lib/saju/experience-calibration.mjs)의
// analyzePeriods·resolveTones 를 그대로 쓴다(대운·세운 네 글자 × 현재 해석의 쓰는/꺼리는 오행, 입춘·교운 경계 처리 포함).
// 원국(natal)은 동결된 analyzeNatalCore 결과를 읽기만 한다. calculateLocalResult 는 쓰지 않는다.
import { analyzePeriods, buildLuckTimeline, resolveTones, CALIBRATION_VERSION, PERIODS_VERSION } from '../saju/experience-calibration.mjs';
import { STEM_ORDER, BRANCH_ORDER } from '../saju/natal-core/tables.mjs';
import { unavailableEngine } from './life-calibration.mjs';

export const SAJU_SIGNALS_VERSION = `life-calibration-saju-v1+${PERIODS_VERSION}+${CALIBRATION_VERSION}`;

/**
 * lib/korean-calendar/daeun.js daeun() 결과 → v1 cycles([{pillar, start:{year, month}}]).
 * 0번 칸(미입운 구간, 간지 없음)은 뺀다. 교운 달은 첫 대운 시작일(startSolar)의 달이다.
 */
export function cyclesFromDaeun(result) {
  if (!result || !Array.isArray(result.cycles)) return [];
  const month = Number.isInteger(result.startSolar?.month) ? result.startSolar.month : null;
  return result.cycles
    .filter((c) => Number.isInteger(c.stemIndex) && Number.isInteger(c.branchIndex) && Number.isInteger(c.startYear))
    .map((c) => ({ pillar: STEM_ORDER[c.stemIndex] + BRANCH_ORDER[c.branchIndex], start: { year: c.startYear, month } }));
}

/**
 * @param {{natal: object, applied: {useful: string[], avoid: string[]}, cycles: Array<{pillar:string,start:{year:number,month?:number|null}}>, years: number[]}} input
 * @returns 엔진 신호({engine:'saju', status, years, months}). 쓸 수 없으면 status 'unavailable' + reason.
 */
export function sajuYearSignals({ natal, applied, cycles, years } = {}) {
  if (!natal || natal.status !== 'ok' || !Object.isFrozen(natal)) return unavailableEngine('saju', SAJU_SIGNALS_VERSION, 'natal-analysis-required');
  if (!Array.isArray(cycles) || !cycles.length) return unavailableEngine('saju', SAJU_SIGNALS_VERSION, 'daeun-cycles-required');
  const ys = [...new Set((years || []).filter(Number.isInteger))].sort((a, b) => a - b);
  if (!ys.length) return unavailableEngine('saju', SAJU_SIGNALS_VERSION, 'no-years');
  const timeline = buildLuckTimeline({ cycles, fromYear: ys[0] - 1, toYear: ys[ys.length - 1] });
  const periods = analyzePeriods({ natal, applied: { useful: applied?.useful || [], avoid: applied?.avoid || [] }, timeline });
  if (!periods.allowedHypotheses.includes('reading')) return unavailableEngine('saju', SAJU_SIGNALS_VERSION, 'no-reading-hypothesis');
  const out = { engine: 'saju', version: SAJU_SIGNALS_VERSION, status: 'available', basis: { natalAnalysisId: natal.analysisId, periodsKey: periods.periodsKey }, years: {}, months: {} };
  for (const year of ys) {
    out.years[year] = { tone: resolveTones(periods, { year, month: null }).tones.reading };
    for (let month = 1; month <= 12; month += 1) {
      // v1 과 같이 1월 사건은 전년 세운으로 센다(서로 다른 해 수 minYears 계산용).
      out.months[`${year}-${month}`] = { tone: resolveTones(periods, { year, month }).tones.reading, periodYear: month === 1 ? year - 1 : year };
    }
  }
  return out;
}
