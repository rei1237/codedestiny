/** @jest-environment node */
import { buildHeukwolAnalysis, heukwolProfileBirth } from '../../worker/lib/heukwol-analysis.js';
import { calculateLifeBookAiSaju } from '../../worker/lib/life-book-ai-saju.js';
import { calculateZiweiConsumerChart } from '../../worker/lib/ziwei-consumer-chart.js';
import { HEUKWOL_CHAPTERS, HEUKWOL_PROMPT_PREFIX, heukwolPrompt, chapterEvidence, generateHeukwolChapter } from '../../worker/lib/heukwol-report.js';

const now = new Date('2026-11-06T00:00:00Z');
const card = {
  gender: 'F',
  birth: { year: 1990, month: 7, day: 15, hour: 23, minute: 45, timeUnknown: false, calType: 'solar' },
  location: { label: 'New York', tz: 'America/New_York', lng: -74.006, lat: 40.7128 },
};
const birth = heukwolProfileBirth(card);
const analysis = buildHeukwolAnalysis(birth, 2027, now);

test('all chapters share a cacheable instruction prefix while personal evidence stays request-specific', () => {
  for (const chapter of HEUKWOL_CHAPTERS) {
    const prompt = heukwolPrompt(analysis, chapter, '검수 질문', [{ title: '이전 장', strategy: '이전 조언' }]);
    expect(prompt.startsWith(HEUKWOL_PROMPT_PREFIX)).toBe(true);
    expect(prompt).toContain(JSON.stringify(chapterEvidence(analysis, chapter)));
    expect(prompt.slice(HEUKWOL_PROMPT_PREFIX.length)).toContain('검수 질문');
    expect(prompt.slice(HEUKWOL_PROMPT_PREFIX.length)).toContain('이전 조언');
  }
  expect(HEUKWOL_PROMPT_PREFIX).not.toContain('검수 질문');
});

test('the saved location reaches both existing engines at a DST and night-Zi boundary', () => {
  expect(birth.birthPlace).toEqual({ name: 'New York', timezone: 'America/New_York', longitude: -74.006, latitude: 40.7128 });
  const input = { birthDate: birth.date, birthTime: birth.time, calendarType: 'solar', gender: 'female', birthPlace: birth.birthPlace };
  const direct = calculateLifeBookAiSaju(input, { year: 2027 });
  expect(analysis.pillars.map(item => item.pillar)).toEqual([
    direct.pillarDetails.year.pillar, direct.pillarDetails.month.pillar,
    direct.pillarDetails.day.pillar, direct.pillarDetails.hour.pillar,
  ]);
  expect(analysis.chart).toEqual(calculateZiweiConsumerChart(input, { year: 2027 }));
  const assumedSeoul = buildHeukwolAnalysis({ ...birth, birthPlace: undefined }, 2027, now);
  expect(analysis.pillars.find(item => item.label === '일주').pillar).toBe('辛巳');
  expect(assumedSeoul.pillars.find(item => item.label === '일주').pillar).toBe('壬午');
  expect(analysis.chart.lunar.day).not.toBe(assumedSeoul.chart.lunar.day);
});

test('lunar conversion stays in the existing profile adapter and keeps the birthplace', () => {
  const converted = heukwolProfileBirth({ ...card, birth: { ...card.birth, year: 2023, month: 2, day: 16, calType: 'lunar_leap' } });
  expect(converted.date).toBe('2023-04-06');
  expect(converted.birthPlace).toEqual(birth.birthPlace);
  expect(() => buildHeukwolAnalysis({ ...converted, timeKnown: false }, 2027, now)).toThrow('HEUKWOL_BIRTH_TIME_REQUIRED');
  expect(heukwolProfileBirth({ ...card, location: undefined }).birthPlace).toBeUndefined();
});

test.each([2026, 2027, 2028, 2033, 2035])('solar-term and lunar-month segments cover every civil month in %i', year => {
  const result = buildHeukwolAnalysis(birth, year, now);
  for (const month of result.months) {
    for (const system of ['saju', 'ziwei']) {
      const segments = month[system];
      expect(segments[0].start).toBe(month.start);
      expect(segments.at(-1).end).toBe(month.end);
      segments.forEach((segment, index) => {
        expect(segment.start < segment.end).toBe(true);
        if (index) expect(segment.start).toBe(segments[index - 1].end);
      });
    }
  }
  expect(result.months[0].saju[0].id).toContain(`saju-${year - 1}`);
});

const prose = name => Array.from({ length: 17 }, (_, i) =>
  `${name}의 ${i + 1}번째 점검에서는 맡은 책임과 진행 중인 약속을 따로 기록하고 확인 가능한 근거를 바탕으로 행동의 순서를 정리합니다.`).join('\n');
const value = {
  warning: '당장 답해야 한다는 부담이 커진다면, 서명을 서두르게 만드는 조건부터 살펴봐.',
  interpretation: prose('연이'), strategy: prose('네오'),
  checkpoints: ['약속의 조건을 문서로 확인하기', '책임의 범위를 정하기', '결정할 시점을 다시 정하기'],
  evidenceIds: ['natal-saju', 'natal-ziwei'],
};
const provider = async () => ({ ok: true, text: JSON.stringify(value) });

test('a later chapter cannot reuse the same long passages to reach the paid length minimum', async () => {
  const first = await generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '확인할 조건은 무엇인가요?', [], provider);
  const saved = structuredClone(first);
  await expect(generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[1], '확인할 조건은 무엇인가요?', [first], provider))
    .rejects.toThrow('HEUKWOL_CHAPTER_INVALID');
  expect(first).toEqual(saved);
});
