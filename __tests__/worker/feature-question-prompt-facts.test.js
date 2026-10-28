/** @jest-environment node */
import { buildVedicAIPrompt } from '../../worker/lib/vedic-ai-prompt.js';
import { buildZiweiAIPromptWithDomain } from '../../worker/lib/ziwei-ai-prompt.js';
import { buildSukuyoAIPromptWithDomain } from '../../worker/lib/sukuyo-ai-prompt.js';
import { questionFacts } from '../../worker/lib/feature-question-delivery.js';

// Fixed test profile (not a real person): 1987-06-23 07:41, 35.1796 / 129.0756, partner 1989-03-14.
const BIRTH_VALUES = /1987|07:41|35\.1796|129\.0756|1989|부산/u;
const QUESTION = '6년째 백엔드 개발자인데 이직을 할지 지금 회사에서 자리를 넓힐지 알고 싶어요.';

const SIGNS = ['Pisces', 'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius'];
const LORDS = ['Jupiter', 'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn'];
function vedicResult() {
  return {
    profile: { name: '검사', birth: { year: 1987, month: 6, day: 23, hour: 7, minute: 41, gender: 'F', timezone: 9, lat: 35.1796, lon: 129.0756 } },
    calculationMeta: { engineVersion: 'vedic-fixture-1', birthInstantUtc: '1987-06-22T22:41:00Z' },
    lagna: { sign: 'Pisces', signKo: '물고기자리', degree: 8.5, lord: 'Jupiter' },
    moonNakshatra: { name: 'Ashwini', pada: 4, lord: 'Ketu' },
    karakas: { atmakaraka: 'Mercury', amatyakaraka: 'Mars', darakaraka: 'Venus' },
    yogas: ['Gajakesari'],
    planets: [
      { graha: 'Moon', grahaKo: '달', rashi: 'Aries', rashiKo: '양자리', bhava: 2, nakshatra: 'Ashwini', pada: 4, dignity: 'neutral' },
      { graha: 'Mars', grahaKo: '화성', rashi: 'Taurus', rashiKo: '황소자리', bhava: 3, nakshatra: 'Krittika', pada: 2, dignity: 'neutral' },
    ],
    bhavas: SIGNS.map((rashi, index) => ({ number: index + 1, rashi, lord: LORDS[index], planets: [] })),
    dasha: [{ planet: 'Rahu', start: '2020-01-01', end: '2038-01-01', active: true }],
  };
}

test('vedic consultation states the computed house lords so a planet position is not read as rulership', () => {
  const built = buildVedicAIPrompt({ question: QUESTION, vedicResult: vedicResult() });
  // Mars sits in house 3 but rules 2 and 9; the Moon sits in house 2 but rules 5 (B7).
  expect(built.houseRulers).toEqual({ 태양: '6H', 달: '5H', 화성: '2H·9H', 수성: '4H·7H', 목성: '1H·10H', 금성: '3H·8H', 토성: '11H·12H' });
  expect(built.generatedPrompt).toMatch(/행성별 지배 하우스: 태양 6H, 달 5H, 화성 2H·9H/u);
  const rows = questionFacts({ houseRulers: built.houseRulers, vedicResult: vedicResult() });
  expect(rows.slice(0, 3)).toEqual([
    { id: 'fact-1', path: 'chart.houseRulers.태양', value: '6H' },
    { id: 'fact-2', path: 'chart.houseRulers.달', value: '5H' },
    { id: 'fact-3', path: 'chart.houseRulers.화성', value: '2H·9H' },
  ]);
});

test('vedic consultation no longer asks for Western element, modality or timing data it does not have', () => {
  const prompt = buildVedicAIPrompt({ question: QUESTION, vedicResult: vedicResult() }).generatedPrompt;
  expect(prompt).not.toMatch(/원소·양식|상승궁·MC|프로펙션|피르다리아|어스펙트/u);
  expect(prompt).toMatch(/베다 점성술사가 눈앞의 사용자/u);
});

test('vedic, ziwei and sukuyo prompts carry no birth date, clock, place or partner birth', () => {
  const compatibilityResult = { partner: { name: '상대', birth: { year: 1989, month: 3, day: 14 } }, total: 24, totalMax: 36, verdict: '좋음' };
  const vedic = buildVedicAIPrompt({ question: `${QUESTION} 궁합도 함께 봐 주세요.`, vedicResult: vedicResult(), compatibilityResult }).generatedPrompt;
  expect(vedic).not.toMatch(BIRTH_VALUES);
  // Non-clock calculation metadata stays; the instant does not.
  expect(vedic).toContain('"calculationMeta":{"engineVersion":"vedic-fixture-1"}');

  const names = ['명궁', '형제궁', '부부궁', '자녀궁', '재백궁', '질액궁', '천이궁', '교우궁', '관록궁', '전택궁', '복덕궁', '부모궁'];
  const chartResult = {
    user: { name: '검사', gender: 'F', birthYear: 1987, birthMonth: 6, birthDay: 23, birthHour: 7, birthMinute: 41, calendarType: 'solar', unknownHour: false, birthPlace: '부산', timezone: 'Asia/Seoul' },
    mingGong: '명궁', shenGong: '관록궁',
    palaceStarData: names.map((palace) => ({ palace, stars: [{ name: '자미', strength: '평', borrowed: false }], auxStars: [], badStars: [] })),
  };
  const ziwei = buildZiweiAIPromptWithDomain({ question: QUESTION, chartResult, domain: 'career' }).generatedPrompt;
  expect(ziwei).not.toMatch(BIRTH_VALUES);
  expect(ziwei).toContain('"mingGong":"명궁"');

  const sukuyo = buildSukuyoAIPromptWithDomain({ question: QUESTION, basicResult: sukuyoBasic(), domain: 'career' }).generatedPrompt;
  expect(sukuyo).not.toMatch(BIRTH_VALUES);
});

function sukuyoBasic() {
  return {
    mansion: '묘(昴)', mansionIdx: 16, displayIndex: 17, talent: 94,
    birth: { year: 1987, month: 6, day: 23 },
    traits: { core: '묘숙(昴宿)은 보호와 공감의 숙입니다.', hidden: '자신의 욕구를 늦게 알아차립니다.', love: '헌신적입니다.', work: '사람을 살피는 일에 강합니다.', wealth: '감정 지출을 조심합니다.', karma: '믿을 수 있는 사람', mantra: '머물 자리' },
    daily: { overall: 78, moon: { label: '반달' }, insight: '묘(昴)별은 오늘 돈을 다루는 습관을 점검하게 합니다.', ritual: { food: '귤 하나' } },
  };
}

test('sukuyo consultation drops the date-seeded daily signal from the prompt', () => {
  const prompt = buildSukuyoAIPromptWithDomain({ question: QUESTION, basicResult: sukuyoBasic(), domain: 'career' }).generatedPrompt;
  // The daily insight is seeded by today's date; B5 used it as career evidence.
  expect(prompt).not.toMatch(/오늘의 신호|오늘의 달빛|오늘 인사이트|돈을 다루는 습관|반달/u);
  expect(prompt).toContain('사람을 살피는 일에 강합니다.');
});

test('sukuyo consultation forbids addressing the user by the mansion name', () => {
  const prompt = buildSukuyoAIPromptWithDomain({ question: QUESTION, basicResult: sukuyoBasic(), domain: 'career' }).generatedPrompt;
  expect(prompt).toMatch(/호칭은 '당신'만 씁니다\. '묘숙님'·'묘숙\(昴宿\)님'처럼 본명숙 이름을 호칭으로 쓰지 않습니다\./u);
});
