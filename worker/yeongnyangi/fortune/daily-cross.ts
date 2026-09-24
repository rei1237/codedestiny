// Free-question evidence from the 꿀꿀 today hub (사주 일진·숙요 일운·베다 판창가·수비학) for any product system.
// 대운 is never included. Daily tarot is excluded: its draw is client-side random and cannot be reproduced here.
import {buildTodayFortunes} from '../../routes/fortune-today.js';
import {domains} from './index';
import type {DomainId, Evidence} from './shared/contracts';

type Card = Record<string, unknown> | null | undefined;
export type TodayFortunes = {saju?:Card;sukuyo?:Card;vedic?:Card;number?:Card};

const labels = {saju:'todaySaju', sukuyo:'todaySukuyo', vedic:'todayVedic', number:'todayNumerology'} as const;
// Card chrome and raw indexes are not evidence.
const hidden = new Set(['system', 'label', 'personalized', 'mansionIndex']);

// birthFromProfile output → the hub's parseBirthQuery shape (original calendar date, 12:00 when time is unknown).
export function hubInput(person: any) {
  const [year, month, day] = String(person.birthDate).split('-').map(Number);
  const time = /^(\d{2}):(\d{2})$/.exec(person.birthTime || '');
  return {year, month, day, hour:time ? Number(time[1]) : 12, minute:time ? Number(time[2]) : 0, timeUnknown:!time,
    birthDate:person.birthDate, birthTime:time ? person.birthTime : '',
    calendarType:person.calendarType === 'lunar' ? (person.leapMonth ? 'lunar_leap' : 'lunar') : 'solar',
    gender:person.gender === 'male' ? 'male' : 'female'};
}

export function crossDailyFacts(domain: DomainId, fortunes: TodayFortunes, sajuLuck: Evidence[] = []): Evidence[] {
  const today = (Object.keys(labels) as (keyof typeof labels)[]).flatMap(key => {
    const card = fortunes[key];
    if (!card) return [];
    const value = Object.fromEntries(Object.entries(card).filter(([k]) => !hidden.has(k)));
    return [{id:`${domain}.${labels[key]}`, label:labels[key], value}];
  });
  const luck = sajuLuck.flatMap(f => f.label === 'yearlyLuck' ? [{id:`${domain}.sajuYearlyLuck`, label:'sajuYearlyLuck', value:Array.isArray(f.value) ? f.value.slice(0, 1) : f.value}]
    : f.label === 'monthlyLuck' ? [{id:`${domain}.sajuMonthlyLuck`, label:'sajuMonthlyLuck', value:f.value}] : []);
  return [...today, ...luck];
}

// Never blocks a consultation: any failure yields no cross facts.
export async function computeCrossDaily(env: Record<string, unknown>, raw: any, asOf: string, systems: DomainId[]): Promise<Evidence[]> {
  try {
    const [year, month, day] = asOf.split('-').map(Number);
    const person = raw.personA;
    const fortunes = await buildTodayFortunes(env, person ? hubInput(person) : null, {year, month, day}, {wantDetail:true});
    let sajuLuck: Evidence[] = [];
    if (person && !systems.includes('saju')) {
      try {
        sajuLuck = (await domains.saju.calculate(domains.saju.validateInput(raw), {runtimeEnv:env, asOf})).facts;
      } catch (error: any) {
        console.warn('[yeongnyangi-cross-daily-skip]', 'saju-luck', String(error?.message || error).slice(0, 200));
      }
    }
    return crossDailyFacts(systems[0], fortunes, sajuLuck);
  } catch (error: any) {
    console.warn('[yeongnyangi-cross-daily-skip]', String(error?.message || error).slice(0, 200));
    return [];
  }
}
