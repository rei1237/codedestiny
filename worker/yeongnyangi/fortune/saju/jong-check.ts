import { GAN, JI, KE, SHENG, whoControls, parentOf } from '../../../../lib/saju/natal-power.js';
import { yearGanji } from '../consultation';
import { FortuneError } from '../shared/contracts';

export type JongYear = { year: number; ganji: string };
export type JongCheck = { best: JongYear[]; worst: JongYear[] };
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
export function jongCheckYears(jong: any, { birthYear, asOfYear }: { birthYear: number; asOfYear: number }): JongCheck | null {
  if (!jong?.isJong) return null;
  const name = String(jong.name || '');
  const yongshin = [jong.dominant, jong.parEl];
  if (name.includes('종아') || name.includes('종살')) yongshin.push((KE as any)[jong.dayEl]);
  if (name.includes('종재')) yongshin.push((SHENG as any)[jong.dominant]);
  const kishin = [whoControls(jong.dominant), ...(SELF_NAMES.some(n => name.includes(n))
    ? [(KE as any)[jong.dayEl], (SHENG as any)[jong.dayEl], whoControls(jong.dayEl)]
    : [jong.dayEl, parentOf(jong.dayEl)])].filter(el => !yongshin.includes(el));
  const best: JongYear[] = [], worst: JongYear[] = [];
  // Most recent first, as the original: people remember recent years better.
  for (let year = asOfYear - 1; year >= asOfYear - 25 && year - birthYear > 8; year--) {
    const ganji = yearGanji(year), stem = (GAN as any)[ganji[0]].e, branch = (JI as any)[ganji[1]].e;
    if (best.length < 3 && yongshin.includes(stem) && yongshin.includes(branch)) best.push({ year, ganji });
    else if (worst.length < 3 && kishin.includes(stem) && kishin.includes(branch)) worst.push({ year, ganji });
  }
  if (best.length < 2 || worst.length < 2) return null;
  return { best: best.reverse(), worst: worst.reverse() };
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
