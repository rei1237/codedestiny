import { buildSajuProfile } from './destiny-bias-engine.js';
import { standardMeridianForTimezone } from './birth-time-context.js';
const labels = { year: '년주', month: '월주', day: '일주', hour: '시주' };
const elements = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' };
// 엔진은 경도가 없으면 서울 경도로 지방시를 보정해 뉴욕 출생이 열세 시간 넘게 밀린다.
// 한국 밖의 유효한 IANA 시간대인데 경도가 없으면 그 시간대 표준 자오선으로 보아 보정을 0으로 둔다.
export function withTeaSajuLongitude(input) {
  if (!input || Number.isFinite(input.longitude)) return input;
  let zone;
  try {
    zone = new Intl.DateTimeFormat('en-US', { timeZone: String(input.timezone || '').trim() }).resolvedOptions().timeZone;
  } catch {
    return input;
  }
  if (!input.timezone || zone === 'Asia/Seoul') return input;
  const [year, month, day] = String(input.birthDate || '').split('-').map(Number);
  if (![year, month, day].every(Number.isFinite)) return input;
  const [hour, minute] = input.birthTimeUnknown ? [12, 0] : String(input.birthTime || '12:00').split(':').map(Number);
  const longitude = standardMeridianForTimezone(zone, null, year, month, day, Number.isFinite(hour) ? hour : 12, Number.isFinite(minute) ? minute : 0);
  return Number.isFinite(longitude) ? { ...input, longitude } : input;
}
// Use the same canonical natal engine as Yeongnyangi; never accept client pillars.
export function teaSajuProfile(rawInput) {
  const input = withTeaSajuLongitude(rawInput);
  return buildSajuProfile({
    name: input.nickname || input.name || '손님', gender: input.gender,
    birth: {
      birthDate: input.birthDate, birthTime: input.birthTimeUnknown ? undefined : input.birthTime,
      birthTimeKnown: !input.birthTimeUnknown && Boolean(input.birthTime), unknownTime: input.birthTimeUnknown || !input.birthTime,
      calendarType: input.calendarType, isLeapMonth: input.isLeapMonth === true,
      timezone: input.timezone || 'Asia/Seoul',
      birthPlace: input.birthPlace || input.timezone || '서울',
      ...(Number.isFinite(input.longitude) ? { longitude: input.longitude } : {}),
    },
  });
}
// The engine's legacy daewoon rows carry years only; timing facts need the current one flagged.
function teaDaewoonRows(rows, now) {
  const year = new Date(now.getTime() + 9 * 3600000).getUTCFullYear();
  return rows.map(row => {
    const isCurrent = Number.isFinite(row.startYear) && Number.isFinite(row.endYear) && row.startYear <= year && year <= row.endYear;
    return { ...row, pillar: row.ganji, label: `${row.index}대운 ${row.startAge}~${row.endAge}세${isCurrent ? ' (현재 대운)' : ''}`, ...(isCurrent ? { isCurrent } : {}) };
  });
}
export function canonicalTeaSaju(input, previous = {}, now = new Date()) {
  const profile = teaSajuProfile(input);
  const scores = profile.fiveElements.scores;
  return {
    ...previous,
    calculationMeta: profile.calculationMeta,
    dayMaster: profile.dayMaster?.stemKo || profile.pillars.day.stem,
    birthSummary: { ...(previous.birthSummary || {}), birthDate: input.birthDate, birthTime: input.birthTime,
      birthTimeUnknown: !profile.calendar.includeHour, calendarType: input.calendarType, timezone: input.timezone || 'Asia/Seoul' },
    pillars: Object.entries(labels).map(([key,label]) => {
      const pillar = key === 'hour' && !profile.calendar.includeHour ? null : profile.pillars[key];
      return { key,label,ganji:pillar?.ganji,heavenlyStem:pillar?.stem,earthlyBranch:pillar?.branch,
        element:pillar ? elements[pillar.stemElement] : undefined,available:Boolean(pillar),
        ...(!pillar ? {note:'출생시간 미상으로 시주는 계산하지 않았습니다.'} : {}) };
    }),
    fiveElements: Object.entries(elements).map(([key,nameKo]) => ({
      key,nameKo,value:profile.fiveElements.percentages[key],strengthLabel:'가중 분포',
      tone:({wood:'green',fire:'rose',earth:'gold',metal:'silver',water:'blue'})[key],
      reading:'명식의 천간·지지·지장간 가중치 비중입니다. 운의 좋고 나쁨이나 성공 확률이 아닙니다.',
    })),
    elementMethod: { source:'destiny-bias-engine',scores,total:Object.values(scores).reduce((a,b)=>a+b,0) },
    usefulGodEvidence: profile.usefulGods,
    daewoon: teaDaewoonRows(profile.daewoon, now),
  };
}
