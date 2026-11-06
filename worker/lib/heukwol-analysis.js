import { buildSibylAnnual, validateSibylYear, sibylEvidencePriority } from './sibyl-annual.js';
import { FOUR_TRANSFORMATIONS } from './ziwei-ai-chart.js';
import { calculateZiweiConsumerChart } from './ziwei-consumer-chart.js';
import { solarToLunar, STEM_HANGUL } from '../../lib/korean-calendar/index.js';
import { lunarMonthStemIndex } from '../../lib/ziwei-month-stem.js';
import { buildNeoBasisPayload } from './neo-operation-room-basis.js';
import { profileCardSolarBirth } from './paid-content-read-access.js';

export const HEUKWOL_VERSION = 'heukwol-monthly-v2';
const pad = n => String(n).padStart(2, '0');
const boundary = (year, month) => `${year}-${pad(month)}-01 00:00`;
const palacesByDomain = { money:['재백궁','전택궁'], love:['부부궁'], relationships:['형제궁','노복궁'], work:['관록궁','천이궁'] };

/** Only the account-owned card supplies civil birth time and location. */
export function heukwolProfileBirth(card) {
  const birth = profileCardSolarBirth(card);
  if (!birth || !card.location) return birth;
  const { label, tz, lng, lat } = card.location;
  return { ...birth, birthPlace: { name: label, timezone: tz, longitude: lng, latitude: lat } };
}

function marks(chart, stem) {
  const table = FOUR_TRANSFORMATIONS[stem];
  if (!table) throw new Error('HEUKWOL_CALENDAR_UNAVAILABLE');
  return Object.entries(table).map(([type, star]) => ({ type, star,
    palaces: chart.palaces.filter(p => [...p.mainStars, ...p.assistantStars].includes(star)).map(p => p.name) }));
}

/** Civil months, actual solar-term segments and lunar-month transformations stay separate. */
export function buildHeukwolAnalysis(birth, requestedYear, now = new Date(), { env = {} } = {}) {
  const year = validateSibylYear(requestedYear, now);
  const gender = String(birth?.gender||'').toLowerCase();
  birth = {...birth, gender: ['m','male','남','남성'].includes(gender)?'male':['f','female','여','여성'].includes(gender)?'female':''};
  if (!birth?.timeKnown || !birth.time || !['male','female','남','여','남성','여성'].includes(birth.gender)) {
    throw new Error('HEUKWOL_BIRTH_TIME_REQUIRED');
  }
  const years = [buildSibylAnnual(birth, year - 1), buildSibylAnnual(birth, year)];
  const chart = calculateZiweiConsumerChart({ birthDate:birth.date, birthTime:birth.time,
    calendarType:'solar', gender:birth.gender, birthPlace:birth.birthPlace }, {env, year});
  const lunarSegments = [];
  // Enumerate the civil dates to retain every lunar new month, including leap months.
  for (let month = 1; month <= 12; month++) {
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    for (let day = 1; day <= days; day++) {
      const lunar = solarToLunar(year, month, day);
      if (!lunar) throw new Error('HEUKWOL_CALENDAR_UNAVAILABLE');
      const key = `${lunar.lunarYear}-${lunar.lunarMonth}-${Boolean(lunar.isLeapMonth)}`;
      const start = `${year}-${pad(month)}-${pad(day)} 00:00`;
      if (lunarSegments.at(-1)?.key !== key) {
        if (lunarSegments.length) lunarSegments.at(-1).end = start;
        lunarSegments.push({key, start, end:boundary(year+1,1), lunarYear:lunar.lunarYear,
          lunarMonth:lunar.lunarMonth, leap:Boolean(lunar.isLeapMonth),
          marks:marks(chart, STEM_HANGUL[lunarMonthStemIndex(lunar.lunarYear,lunar.lunarMonth)])});
      }
    }
  }
  const months = Array.from({length:12}, (_,i) => {
    const start = boundary(year,i+1), end = i===11 ? boundary(year+1,1) : boundary(year,i+2);
    const saju = years.flatMap(a => a.months.filter(m => m.start<end && m.end>start).map(m => ({
      ...m, id:`saju-${a.year}-${m.id}`, start:m.start<start?start:m.start, end:m.end>end?end:m.end,
      annual:a.annual, major:a.major,
    })));
    const ziwei = lunarSegments.filter(m=>m.start<end && m.end>start).map(m=>({...m,
      id:`ziwei-${m.key}`, start:m.start<start?start:m.start, end:m.end>end?end:m.end }));
    const domains = years[1].domains.map(d => {
      const sajuPriority = Math.max(...saju.map(m=>sibylEvidencePriority(m,d)+sibylEvidencePriority(m.annual,d)+(m.major?sibylEvidencePriority(m.major,d):0)));
      const relevant = ziwei.flatMap(m=>m.marks.filter(mark=>mark.palaces.some(p=>palacesByDomain[d.id].includes(p))).map(mark=>({...mark,start:m.start,end:m.end})));
      return {id:d.id,title:d.title,sajuPriority, ziweiCautions:relevant.filter(m=>m.type==='huaJi'),
        ziweiSupports:relevant.filter(m=>m.type!=='huaJi'),action:d.action,sign:d.sign,change:d.change};
    });
    return {month:i+1,start,end,saju,ziwei,domains};
  });
  const day=years[1].pillars.find(p=>p.label==='일주')?.pillar;
  const neoBasis={
    saju:buildNeoBasisPayload({method:'saju',pillars:{day,dayMaster:day?.[0]},fiveElements:years[1].natal.elements,
      tenGods:years[1].natal.tenGods,natalInteractions:years[1].natal.interactions}),
    ziwei:buildNeoBasisPayload({method:'ziwei',mingGong:chart.lifePalace,shenGong:chart.bodyPalace,
      palaces:chart.palaces,fourTransformations:chart.fourTransformations,sanFangSiZheng:chart.sanFangSiZheng}),
  };
  return {version:HEUKWOL_VERSION,year,months,pillars:years[1].pillars,natal:years[1].natal,chart,neoBasis,
    limitation:'사주 점검 우선순위와 자미두수 사화 근거를 구분한 전통 해석 지표입니다. 사고·손실의 발생 확률이 아니며 두 체계의 수치를 임의로 합산하지 않습니다.',
    uncertainty:years[1].uncertainty,timezone:'Asia/Seoul',
    method:'사주: 시빌라 annual-v1의 합충형파해·십성·대운·세운. 자미두수: 원국의 별 위치와 음력 유월 사화 대조. 유월 명궁 이동을 계산했다고 표현하지 않습니다.'};
}
