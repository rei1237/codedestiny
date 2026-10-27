// 과거 경험 설문(6분류 사건 입력). 원국 판정에는 쓰지 않고, 대운·세운 해석의 강조 정도만 보정한다.
// 규칙·정책값은 lib/saju/experience-calibration.mjs에 있다. 이 파일은 영냥이 화면 계산 결과를 그 입력으로 옮긴다.
import {
  analyzePeriods, buildLuckTimeline, calibrateExperience, describeCalibration, normalizeExperienceAnswers,
  CALIBRATION_POLICY, ExperienceInputError,
} from '../../../../lib/saju/experience-calibration.mjs';
import { FortuneError } from '../shared/contracts';

export type ExperienceAnswer = ReturnType<typeof normalizeExperienceAnswers>[number];

/** 질문 연도는 날짜로만 고른다: 만 16세 이후로 끝난 최근 세운 해 최대 6개. 운이 좋을 것 같은 해를 골라 묻지 않는다. */
export const EXPERIENCE_PROMPT_POLICY = { fromAge: 16, maxYears: 6 } as const;

/** 결제 전 질문 연도. 출생시간이 없으면 대운 경계를 알 수 없어 묻지 않는다. */
export function experienceCheck(r: any, timed: boolean) {
  if (!timed) return null;
  const birthYear = Number(r.calculationMeta?.civil?.year);
  const luckYear = Number(r.yearlyLuck?.[0]?.year);
  if (!Number.isInteger(birthYear) || !Number.isInteger(luckYear)) return null;
  const maxYear = luckYear - 1, minYear = birthYear + EXPERIENCE_PROMPT_POLICY.fromAge;
  const years: number[] = [];
  for (let y = maxYear; y >= minYear && years.length < EXPERIENCE_PROMPT_POLICY.maxYears; y--) years.push(y);
  if (years.length < 2) return null;
  return { years, minYear: birthYear + 1, maxYear, maxEntries: CALIBRATION_POLICY.maxEntries, noteMax: CALIBRATION_POLICY.noteMax };
}

/** 요청 본문의 experience. 없거나 빈 배열이면 undefined, 형식이 틀리면 400. */
export function parseExperience(raw: unknown, asOfYear: number): ExperienceAnswer[] | undefined {
  if (raw === undefined || raw === null) return undefined;
  try {
    const list = normalizeExperienceAnswers(raw, { minYear: 1900, maxYear: asOfYear });
    return list.length ? list : undefined;
  } catch (error) {
    if (error instanceof ExperienceInputError) throw new FortuneError('INVALID_EXPERIENCE', 400);
    throw error;
  }
}

/** experienceCalibration fact. 메모 원문은 넣지 않는다. */
export function experienceCalibrationFact(r: any, answers: ExperienceAnswer[]) {
  const natal = r.jong?.natalCore;
  const luckYear = Number(r.yearlyLuck?.[0]?.year);
  if (!natal || natal.status !== 'ok' || !Number.isInteger(luckYear)) return null;
  const cycles = (r.majorLuck?.cycles || []).filter((c: any) => c.pillar && /^\d{4}-\d{2}/.test(c.startDate || ''))
    .map((c: any) => ({ pillar: c.pillar, start: { year: Number(c.startDate.slice(0, 4)), month: Number(c.startDate.slice(5, 7)) } }));
  if (!cycles.length) return null;
  const targetYears = [...new Set<number>((r.yearlyLuck || []).map((row: any) => Number(row.year)).filter(Number.isInteger))];
  const timeline = buildLuckTimeline({ cycles, fromYear: cycles[0].start.year, toYear: luckYear - 1, targetYears });
  const periods = analyzePeriods({ natal, applied: { useful: r.strength?.yongshin || [], avoid: r.strength?.kijishin || [] }, timeline });
  const c = calibrateExperience({ natal, periods, answers });
  const summary = describeCalibration(c);
  const reasons: Record<string, number> = {};
  for (const u of c.unused) reasons[u.reason] = (reasons[u.reason] || 0) + 1;
  return {
    rule: '대운·세운 문장의 강조 정도에만 쓴다. 격국·종격·신강/신약·조후·용신을 바꾸거나 다시 판정하지 않는다. 정확도·적중률을 말하지 않는다. 불일치한 해는 숨기지 않고 그대로 말한다.',
    version: c.version, policy: c.policy, natalAnalysisId: c.natalAnalysisId, calibrationKey: c.calibrationKey,
    status: c.status, counts: c.counts, factor: c.overall.factor,
    byDomain: Object.fromEntries(Object.entries(c.byDomain).map(([d, f]: [string, any]) => [d, { status: f.status, agree: f.agree, disagree: f.disagree, factor: f.factor }])),
    agreements: summary.agreements, mismatches: summary.mismatches, unusedReasons: reasons,
    adjustments: c.adjustments, periodRule: periods.rule, notes: c.notes,
  };
}
