import { buildSajuProfile } from './destiny-bias-engine.js';
const labels = { year: '년주', month: '월주', day: '일주', hour: '시주' };
const elements = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' };
// Use the same canonical natal engine as Yeongnyangi; never accept client pillars.
export function teaSajuProfile(input) {
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
export function canonicalTeaSaju(input, previous = {}) {
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
    daewoon: profile.daewoon.map(row => ({...row,pillar:row.ganji})),
  };
}
