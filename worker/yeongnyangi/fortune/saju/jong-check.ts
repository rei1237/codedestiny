import { GAN, JI, KE, SHENG, whoControls, parentOf } from '../../../../lib/saju/natal-power.js';
import { yearGanji } from '../consultation';
import { FortuneError } from '../shared/contracts';

export type JongYear = { year: number; ganji: string };
/** `jong`: a 종격 candidate. `strength`: a non-종격 chart on the 신강/신약 line. Same question, same answer body. */
export type JongCheck = { kind: 'jong' | 'strength'; best: JongYear[]; worst: JongYear[] };
type YearWindow = { birthYear: number; asOfYear: number };
export type JongReply = 'yes' | 'no' | 'unsure';
export type JongAnswer = { best: JongReply; worst: JongReply; bestYears: number[]; worstYears: number[] };
export type JongVerdict = 'rejected' | 'confirmed' | 'unconfirmed';

const SELF_NAMES = ['종강격', '곡직격', '염상격', '가색격', '종혁격', '윤하격', '종왕격'];
const REPLIES: JongReply[] = ['yes', 'no', 'unsure'];

/**
 * Past years that should have felt good (용신) or hard (기신) if the 종격 candidate is real.
 * Port of 꿀꿀 js/saju-engine.js extractSixPastTestingYears with its defects fixed: the birth
 * year comes from the input (no 30-year guess), the window ends at the consultation year (no
 * wall clock), only years whose stem and branch both match are asked, and a year cannot sit on
 * both sides. Fewer than two years on either side means the question is skipped (null).
 */
export function jongCheckYears(jong: any, span: YearWindow): JongCheck | null {
  if (!jong?.isJong) return null;
  const name = String(jong.name || '');
  const yongshin = [jong.dominant, jong.parEl];
  if (name.includes('종아') || name.includes('종살')) yongshin.push((KE as any)[jong.dayEl]);
  if (name.includes('종재')) yongshin.push((SHENG as any)[jong.dominant]);
  const kishin = [whoControls(jong.dominant), ...(SELF_NAMES.some(n => name.includes(n))
    ? [(KE as any)[jong.dayEl], (SHENG as any)[jong.dayEl], whoControls(jong.dayEl)]
    : [jong.dayEl, parentOf(jong.dayEl)])].filter(el => !yongshin.includes(el));
  return pickYears('jong', yongshin, kishin, span);
}

// calcPower (lib/saju/natal-power.js) reads 신강 at score >= 30 without hidden stems. One peripheral
// stem or branch is worth 7, so a score within one such step of the line (23..36) could read either way.
const STRENGTH_LINE = 30, STRENGTH_STEP = 7;

/** Past years that test a boundary 신강/신약 call: its 억부 용신 years should have felt good, 기신 years hard. */
export function strengthCheckYears(power: any, span: YearWindow): JongCheck | null {
  if (!Number.isFinite(power?.score) || power.score + STRENGTH_STEP < STRENGTH_LINE || power.score - STRENGTH_STEP >= STRENGTH_LINE) return null;
  return pickYears('strength', power.yongshin, power.kijishin, span);
}

/** calcPower's other branch (natal-power.js:79-88) for a boundary chart whose past years contradict it. */
export function flipStrength(power: any) {
  const { dayEl, parEl } = power, isStrong = !power.isStrong, drain = (SHENG as any)[dayEl];
  return { ...power, isStrong, calculatedIsStrong: power.isStrong,
    yongshin: isStrong ? [drain, (SHENG as any)[drain], whoControls(dayEl)] : [dayEl, parEl],
    kijishin: isStrong ? [dayEl, parEl] : [drain, whoControls(dayEl), (KE as any)[dayEl]] };
}

function pickYears(kind: JongCheck['kind'], yongshin: string[], kishin: string[], { birthYear, asOfYear }: YearWindow): JongCheck | null {
  const best: JongYear[] = [], worst: JongYear[] = [];
  // Most recent first, as the original: people remember recent years better.
  for (let year = asOfYear - 1; year >= asOfYear - 25 && year - birthYear > 8; year--) {
    const ganji = yearGanji(year), stem = (GAN as any)[ganji[0]].e, branch = (JI as any)[ganji[1]].e;
    if (best.length < 3 && yongshin.includes(stem) && yongshin.includes(branch)) best.push({ year, ganji });
    else if (worst.length < 3 && kishin.includes(stem) && kishin.includes(branch)) worst.push({ year, ganji });
  }
  if (best.length < 2 || worst.length < 2) return null;
  return { kind, best: best.reverse(), worst: worst.reverse() };
}

const yearList = (value: unknown) => Array.isArray(value) && value.length >= 1 && value.length <= 3
  && value.every(y => Number.isInteger(y) && y >= 1900 && y <= 2200);

/** Request body `jongCheck`; absent stays absent so legacy request ids keep their fingerprint. */
export function parseJongAnswer(value: unknown): JongAnswer | undefined {
  if (value === undefined || value === null) return undefined;
  const v = value as Record<string, unknown>;
  if (typeof value !== 'object' || Array.isArray(value) || !REPLIES.includes(v.best as JongReply) || !REPLIES.includes(v.worst as JongReply)
    || !yearList(v.bestYears) || !yearList(v.worstYears)) throw new FortuneError('INVALID_JONG_CHECK');
  return { best: v.best as JongReply, worst: v.worst as JongReply, bestYears: [...v.bestYears as number[]], worstYears: [...v.worstYears as number[]] };
}

const sameYears = (years: number[], asked: JongYear[]) => years.length === asked.length && years.every((y, i) => y === asked[i].year);

/** An answer only counts for the exact years the server would ask now (new year, new birth place → ignored). */
export function resolveJongVerdict(check: JongCheck | null, answer?: JongAnswer): JongVerdict {
  if (!check || !answer || !sameYears(answer.bestYears, check.best) || !sameYears(answer.worstYears, check.worst)) return 'unconfirmed';
  if (answer.best === 'no' && answer.worst === 'no') return 'rejected';
  if (answer.best === 'yes' && answer.worst === 'yes') return 'confirmed';
  return 'unconfirmed';
}
