/** @jest-environment node */
import { jest } from "@jest/globals";
import { buildHeukwolAnalysis, heukwolProfileBirth } from '../../worker/lib/heukwol-analysis.js';
import { calculateLifeBookAiSaju } from '../../worker/lib/life-book-ai-saju.js';
import { calculateZiweiConsumerChart } from '../../worker/lib/ziwei-consumer-chart.js';
import { buildNeoBasisPayload } from '../../worker/lib/neo-operation-room-basis.js';
import { HEUKWOL_CHAPTERS, HEUKWOL_CHAPTER_MIN_CHARS, HEUKWOL_PROMPT_PREFIX, HEUKWOL_REPAIR_HINTS, isHeukwolTransientError, heukwolPrompt, chapterEvidence, generateHeukwolChapter, heukwolShinsalBlock, HEUKWOL_SHINSAL_RULE, HEUKWOL_SHINSAL_PROMPT_BUDGET, validateHeukwolChapter, validateHeukwolChapterV2 } from '../../worker/lib/heukwol-report.js';
import { assertWorkersAiInputTokenLimit, workersAiInputTokenUpperBound, WORKERS_AI_INPUT_TOKEN_HARD_LIMIT } from '../../lib/workers-ai-input-token-limit.mjs';

const now = new Date('2026-11-06T00:00:00Z');
const card = {
  gender: 'F',
  birth: { year: 1990, month: 7, day: 15, hour: 23, minute: 45, timeUnknown: false, calType: 'solar' },
  location: { label: 'New York', tz: 'America/New_York', lng: -74.006, lat: 40.7128 },
};
const birth = heukwolProfileBirth(card);
const analysis = buildHeukwolAnalysis(birth, 2027, now);

test('Heukwol uses the same Ming-palace axis adapter as the existing Neo strategy room', () => {
  const chart = analysis.chart;
  const expected = buildNeoBasisPayload({ method:'ziwei', mingGong:chart.lifePalace, shenGong:chart.bodyPalace,
    palaces:chart.palaces, fourTransformations:chart.fourTransformations,
    sanFangSiZheng:{core:chart.sanFangSiZheng.core, lifePalace:chart.sanFangSiZheng.byPalace[chart.lifePalace]} });
  expect(analysis.neoBasis.ziwei).toEqual(expected);
  expect(JSON.stringify(expected)).toContain('삼방사정(명궁)');
});

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

// R6b: 12개월 근거를 싣는 주제 장이 Workers AI 입력 상한(50k)을 넘어 마지막 시도의 폴백이 결정적으로 막혔다.
// 최대 질문(3,000자 한글)·이전 26장·가장 긴 보완 요청까지 실어도 모든 장이 상한의 95% 안에 들어야 한다.
test.each([
  ['New York 2027', analysis],
  ['Seoul 1984 / 2026', buildHeukwolAnalysis(heukwolProfileBirth({ gender: 'M', birth: { year: 1984, month: 2, day: 3, hour: 4, minute: 10, timeUnknown: false, calType: 'solar' } }), 2026, now)],
  ['New York 2028', buildHeukwolAnalysis(birth, 2028, now)],
])('every chapter prompt fits the Workers AI fallback input limit with the longest question (%s)', (_label, target) => {
  const question = '흑'.repeat(3000);
  const longestHint = Object.values(HEUKWOL_REPAIR_HINTS).sort((a, b) => b.length - a.length)[0];
  const bounds = {};
  for (const chapter of HEUKWOL_CHAPTERS) {
    const previous = HEUKWOL_CHAPTERS.filter(c => c.key !== chapter.key).map(c => ({ title: c.title, strategy: '대응'.repeat(400) }));
    const messages = [{ role: 'user', content: heukwolPrompt(target, chapter, question, previous, longestHint) }];
    bounds[chapter.key] = workersAiInputTokenUpperBound(messages);
    expect(() => assertWorkersAiInputTokenLimit({ model: '@cf/zai-org/glm-4.7-flash', messages, maxOutputTokens: 16000 })).not.toThrow();
  }
  for (const [key, bound] of Object.entries(bounds)) expect([key, bound <= WORKERS_AI_INPUT_TOKEN_HARD_LIMIT * 0.95]).toEqual([key, true]);
});

test('the twelve-month digest keeps every monthly evidence ID once; month and natal chapters keep the original evidence', () => {
  const allIds = [...new Set(analysis.months.flatMap(m => [...m.saju, ...m.ziwei].map(e => e.id)))].sort();
  for (const chapter of HEUKWOL_CHAPTERS.filter(c => !c.phase && !c.month)) {
    const evidence = chapterEvidence(analysis, chapter);
    expect(evidence.months.flatMap(m => [...m.saju, ...m.ziwei].map(e => e.id)).sort()).toEqual(allIds);
    expect(evidence.periodLuck.length).toBeGreaterThan(0);
    const json = JSON.stringify(evidence.months);
    expect(json).not.toContain('"annual"');
    expect(json).not.toContain('"action"');
  }
  expect(chapterEvidence(analysis, HEUKWOL_CHAPTERS.find(c => c.key === 'money')).domainGuides.map(d => d.id)).toEqual(['money']);
  expect(chapterEvidence(analysis, HEUKWOL_CHAPTERS.find(c => c.key === 'safety')).domainGuides).toBeUndefined();
  expect(chapterEvidence(analysis, HEUKWOL_CHAPTERS.find(c => c.key === 'month-3')).months).toEqual(analysis.months.filter(m => m.month === 3));
  expect(chapterEvidence(analysis, HEUKWOL_CHAPTERS.find(c => c.key === 'nature-love')).months).toEqual([]);
});

// R6c: 실호출에서 "12월(음력 11월)"처럼 음력 월을 잘못 붙이고, 같은 자미 구간을 두 달에 나눠 이중 표기했다.
test('the twelve-month digest pairs each lunar segment with its full solar range once, and marks saju segments as solar-term months', () => {
  const evidence = chapterEvidence(analysis, HEUKWOL_CHAPTERS.find(c => c.key === 'health'));
  const source = new Map();
  for (const m of analysis.months) for (const z of m.ziwei) {
    const seen = source.get(z.id);
    source.set(z.id, seen ? { ...seen, end: z.end } : z);
  }
  const ziwei = evidence.months.flatMap(m => m.ziwei);
  expect(ziwei.map(z => z.id)).toEqual([...source.keys()]);
  for (const z of ziwei) {
    const s = source.get(z.id);
    const label = `음력 ${s.lunarYear !== analysis.year ? `${s.lunarYear}년 ` : ''}${s.leap ? '윤' : ''}${s.lunarMonth}월`;
    const lastDay = new Date(Date.parse(`${s.end.slice(0, 10)}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
    expect(z.when).toBe(`양력 ${s.start.slice(0, 10)}~${lastDay} = ${label}`);
  }
  expect(ziwei[0].when).toContain(`음력 ${analysis.year - 1}년 `);
  const saju = evidence.months.flatMap(m => m.saju);
  expect(new Set(saju.map(s => s.id)).size).toBe(saju.length);
  saju.forEach(s => expect(s.when).toMatch(/^양력 .+ 전 = 절기 .월\(.+ 기준, 음력 월 아님\)$/));
  expect(evidence.digestRules.join(' ')).toContain('음력 월은 ziwei');
});

// R6c: 압축이 충합의 운 종류·글자를 빼서 "일간 을신충"·"대운 vs 세운 축미충" 같은 근거 밖 귀속이 나왔다.
test('the twelve-month digest names both pillars, the luck kind and the characters of every relation', () => {
  const evidence = chapterEvidence(analysis, HEUKWOL_CHAPTERS.find(c => c.key === 'money'));
  const json = JSON.stringify(evidence.months) + JSON.stringify(evidence.periodLuck);
  expect(json).not.toMatch(/\(운·|·운\)/);
  const segments = evidence.months.flatMap(m => m.saju);
  for (const seg of segments) {
    const raw = analysis.months.flatMap(m => m.saju).find(s => s.id === seg.id);
    const relations = [...(raw.tensions || []), ...(raw.supports || [])];
    if (!relations.length) { expect(seg.relations).toBe('원국과 맺는 합충형파해 없음'); continue; }
    for (const t of relations) {
      const text = [...seg.tensions, ...seg.supports].find(line => line.startsWith(`${t.label}`));
      expect(text).toBeDefined();
      expect(text).toContain('월운');
      t.pillarLabels.filter(p => p !== '운').forEach(p => expect(text).toContain(`원국 ${p}`));
      (t.values || []).forEach(v => expect(text).toContain(v));
    }
  }
  expect(segments.some(seg => seg.tensions?.length)).toBe(true);
  const major = evidence.periodLuck.find(p => p.label === '대운');
  [...(major.tensions || []), ...(major.supports || [])].forEach(line => expect(line).toMatch(/대운|원국/));
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

test.each(['nature-love','month-2'])('mock LLM receives computed Ziwei and Saju evidence for %s', async key => {
  const chapter = HEUKWOL_CHAPTERS.find(item => item.key === key);
  const evidence = chapterEvidence(analysis, chapter);
  const evidenceIds = chapter.month
    ? [evidence.months[0].saju[0].id, evidence.months[0].ziwei[0].id]
    : ['natal-saju','natal-ziwei'];
  const capture = jest.fn(async (_env, prompt) => {
    expect(prompt).toContain(JSON.stringify(evidence));
    expect(evidence.neoBasis.saju).toBeDefined();
    expect(evidence.neoBasis.ziwei).toBeDefined();
    expect(evidence.natalEvidence[1].palaces.length).toBeGreaterThan(0);
    if (chapter.month) expect(evidence.months[0].ziwei[0].marks.length).toBe(4);
    else expect(JSON.stringify(evidence.neoBasis.ziwei)).toContain('삼방사정(명궁)');
    return {ok:true,text:JSON.stringify({...value,evidenceIds})};
  });
  const result = await generateHeukwolChapter({}, analysis, chapter, '이번 흐름에서 확인할 조건은?', [], capture);
  expect(capture).toHaveBeenCalledTimes(1);
  expect(result.evidenceIds).toEqual(evidenceIds);
});

test('a later chapter cannot reuse the same long passages to reach the paid length minimum', async () => {
  const first = await generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '확인할 조건은 무엇인가요?', [], provider);
  const saved = structuredClone(first);
  await expect(generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[1], '확인할 조건은 무엇인가요?', [first], provider))
    .rejects.toThrow('HEUKWOL_CHAPTER_INVALID');
  expect(first).toEqual(saved);
});

describe('delivery plan v2 chapter acceptance', () => {
  const v2 = (extra = {}) => ({ deliveryPlanVersion: 2, ...extra });
  const shortValue = { ...value, interpretation: '연이는 이 조건을 천천히 살펴보길 권해요.', strategy: '네오는 오늘 할 일 하나만 정해.' };
  const providerOf = v => async () => ({ ok: true, text: JSON.stringify(v) });
  test('only the final chapter attempt lets the provider fall back to the auxiliary model (Gemini first)', async () => {
    const seen = [];
    const capture = async (_env, _prompt, options) => { seen.push(options.finalProviderAttempt); return { ok: true, text: JSON.stringify(value) }; };
    await generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '질문', [], capture, v2()).catch(() => {});
    await generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '질문', [], capture, v2({ finalAttempt: true })).catch(() => {});
    await generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '질문', [], capture, { finalAttempt: false }).catch(() => {});
    await generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '질문', [], capture).catch(() => {});
    expect(seen).toEqual([false, true, false, undefined]);
  });
  test('non-final short draft is a soft issue; the final attempt delivers it as-is', async () => {
    await expect(generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '질문', [], providerOf(shortValue), v2()))
      .rejects.toMatchObject({ heukwolIssue: 'HEUKWOL_CHAPTER_SHORT' });
    const out = await generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '질문', [], providerOf(shortValue), v2({ finalAttempt: true }));
    expect(out.totalChars).toBeLessThan(1500);
    expect(out.interpretation).toBe(shortValue.interpretation);
  });
  test('final attempt scrubs only the unsupported sentence and filters unknown evidence IDs', async () => {
    const risky = { ...value, warning: '서두르면 균열이 커져. 반드시 사고가 난다.', evidenceIds: ['natal-saju', 'made-up-id'] };
    await expect(generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '질문', [], providerOf(risky), v2()))
      .rejects.toMatchObject({ heukwolIssue: 'HEUKWOL_UNSUPPORTED_CLAIM' });
    const out = await generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '질문', [], providerOf(risky), v2({ finalAttempt: true }));
    expect(out.warning).toBe('서두르면 균열이 커져.');
    expect(out.evidenceIds).toEqual(['natal-saju']);
  });
  // S16: 빈 칸 장은 전달하지 않는다. 앞 장과 겹쳐 비워진 칸은 마지막 시도에서 원문으로 되살려 세 칸을 채운다.
  test('final attempt restores a field emptied only by duplicate removal instead of delivering an empty field', async () => {
    const first = await generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '질문', [], provider, v2({ finalAttempt: true }));
    const later = { ...value, warning: '이번 장의 새 경고는 약속의 속도를 늦추는 데서 시작해.' };
    await expect(generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[1], '질문', [first], providerOf(later), v2()))
      .rejects.toMatchObject({ heukwolIssue: 'HEUKWOL_CHAPTER_INVALID' });
    const out = await generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[1], '질문', [first], providerOf(later), v2({ finalAttempt: true }));
    expect(out.warning).toBe(later.warning);
    expect(out.interpretation).toBe(later.interpretation);
    expect(out.strategy).toBe(later.strategy);
  });
  test('a fully empty body or a missing field is rejected on every attempt, final included', async () => {
    await expect(generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '질문', [], providerOf({ warning: '', interpretation: '', strategy: '', checkpoints: [], evidenceIds: [] }), v2({ finalAttempt: true })))
      .rejects.toThrow('HEUKWOL_CHAPTER_INVALID');
    await expect(generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '질문', [], providerOf({ ...value, strategy: '' }), v2({ finalAttempt: true })))
      .rejects.toMatchObject({ heukwolIssue: 'HEUKWOL_CHAPTER_INVALID' });
  });
  // S16 완화 수용: 2번째 시도부터 장 하한의 60%면 받고, 확정 표현·근거 ID·점검 기준 수는 거절 대신 정리한다. 말투는 계속 고친다.
  test('a relaxed attempt accepts 60% of the chapter minimum and cleans claims and evidence instead of rejecting', async () => {
    const banmal = n => Array.from({ length: n }, (_, i) => `네오가 정리한 ${i + 1}번째 기준은 약속 범위를 먼저 적고 확인할 사람과 날짜를 정한 뒤 움직이는 거야.`).join(' ');
    const yeoni = n => Array.from({ length: n }, (_, i) => `연이의 ${i + 1}번째 점검에서는 맡은 책임과 진행 중인 약속을 따로 기록하고 확인 가능한 근거를 바탕으로 행동의 순서를 정리합니다.`).join('\n');
    const mid = { warning: '서두르면 균열이 커져. 반드시 사고가 난다.', interpretation: yeoni(9), strategy: banmal(7),
      checkpoints: ['약속 조건을 문서로 확인하기'], evidenceIds: ['natal-saju', 'made-up-id'] };
    await expect(generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '질문', [], providerOf(mid), v2()))
      .rejects.toMatchObject({ heukwolIssue: 'HEUKWOL_CHECKPOINTS_REQUIRED' });
    const out = await generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '질문', [], providerOf(mid), v2({ relaxed: true }));
    expect(out.totalChars).toBeGreaterThanOrEqual(Math.round(HEUKWOL_CHAPTER_MIN_CHARS * 0.6));
    expect(out.totalChars).toBeLessThan(HEUKWOL_CHAPTER_MIN_CHARS);
    expect(out.warning).toBe('서두르면 균열이 커져.');
    expect(out.evidenceIds).toEqual(['natal-saju']);
    await expect(generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '질문', [], providerOf({ ...mid, interpretation: yeoni(2), strategy: banmal(2) }), v2({ relaxed: true })))
      .rejects.toMatchObject({ heukwolIssue: 'HEUKWOL_CHAPTER_SHORT' });
    await expect(generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '질문', [], providerOf({ ...mid, strategy: Array.from({ length: 7 }, (_, i) => `네오의 ${i + 1}번째 대응은 일정표를 다시 열고 미룰 약속과 지킬 약속을 나누어 적는 것입니다.`).join(' ') }), v2({ relaxed: true })))
      .rejects.toMatchObject({ heukwolIssue: 'HEUKWOL_CHAPTER_REGISTER' });
  });
  // R6c: 실호출 strict 시도 4장이 evidenceIds 에 장 키·항목 이름을 넣어 탈락했다. 형식 실수는 거르고, 지어낸 구간 ID 만 다시 쓴다.
  test('strict attempts drop chapter keys and field names from evidenceIds but still reject made-up segment IDs', async () => {
    const opening = HEUKWOL_CHAPTERS.find(c => c.key === 'opening');
    const segmentId = chapterEvidence(analysis, opening).months[0].saju[0].id;
    const neo = Array.from({ length: 18 }, (_, i) => `네오가 정리한 ${i + 1}번째 기준은 약속 범위를 먼저 적고 확인할 사람과 날짜를 정한 뒤 움직이는 거야.`).join(' ');
    const draft = { ...value, strategy: neo,
      evidenceIds: ['natal-saju', segmentId, 'relationships', 'luckJudgement', 'domainGuides', 42] };
    const out = await generateHeukwolChapter({}, analysis, opening, '질문', [], providerOf(draft), v2());
    expect(out.evidenceIds).toEqual(['natal-saju', segmentId]);
    await expect(generateHeukwolChapter({}, analysis, opening, '질문', [], providerOf({ ...draft, evidenceIds: ['natal-saju', 'saju-2099-month-1'] }), v2()))
      .rejects.toMatchObject({ heukwolIssue: 'HEUKWOL_EVIDENCE_INVALID' });
    await expect(generateHeukwolChapter({}, analysis, opening, '질문', [], providerOf({ ...draft, evidenceIds: ['luckJudgement'] }), v2()))
      .rejects.toMatchObject({ heukwolIssue: 'HEUKWOL_EVIDENCE_INVALID' });
    expect(HEUKWOL_PROMPT_PREFIX).toContain('장 이름이나 항목 이름(luckJudgement·domainGuides·periodLuck·relationships 등)은 ID가 아닙니다.');
  });
  test('register drift is a soft issue that adds a repair hint only on the retry', async () => {
    const prompts = [];
    const drift = { ...value, interpretation: Array.from({ length: 6 }, (_, i) => `연이가 보기엔 ${i + 1}번째 조건부터 다시 봐야 해.`).join(' ') + prose('연이') };
    const capture = async (_env, prompt) => { prompts.push(prompt); return { ok: true, text: JSON.stringify(drift) }; };
    await expect(generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '질문', [], capture, v2()))
      .rejects.toMatchObject({ heukwolIssue: 'HEUKWOL_CHAPTER_REGISTER' });
    await generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '질문', [], capture, v2({ finalAttempt: true, repairIssue: 'HEUKWOL_CHAPTER_REGISTER' }));
    expect(prompts[0]).toBe(heukwolPrompt(analysis, HEUKWOL_CHAPTERS[0], '질문', []));
    expect(prompts[1].startsWith(prompts[0])).toBe(true);
    expect(prompts[1]).toContain('보완 요청:');
  });
  // 원칙 17: 폴백 하한은 장 하한의 30%. 하한과 같으면 정상 폴백 답변까지 버려 결과가 안 나온다.
  test('Workers AI fallback floor is 30% of the chapter minimum, not the minimum itself', async () => {
    let seen;
    await generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '질문', [], async (_env, _prompt, options) => { seen = options; return { ok: true, text: JSON.stringify(shortValue) }; }, v2({ finalAttempt: true }));
    expect(seen.fallbackToWorkersAI).toBe(true);
    expect(seen.fallbackMinChars).toBe(Math.round(HEUKWOL_CHAPTER_MIN_CHARS * 0.3));
  });
  // R6b: 공용 ko 지시가 존댓말을 최우선으로 강제하면 네오의 반말 대응이 합니다체가 되어 말투 판정에서 결정적으로 탈락한다.
  test('every chapter call leaves the speech level to the personas (outputRegister persona) on v1 and v2', async () => {
    const { buildOutputLanguageDirective } = await import('../../lib/i18n/ai-locale.js');
    const seen = [];
    const capture = async (_env, _prompt, options) => { seen.push(options.outputRegister); return { ok: true, text: JSON.stringify(value) }; };
    await generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '질문', [], capture, v2()).catch(() => {});
    await generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '질문', [], capture, v2({ finalAttempt: true })).catch(() => {});
    await generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '질문', [], capture).catch(() => {});
    expect(seen).toEqual(['persona', 'persona', 'persona']);
    expect(buildOutputLanguageDirective('ko', { register: 'persona' })).not.toContain('존댓말로 작성');
  });
  // R6b: 공급자 실패·JSON 파싱 실패는 품질 탈락과 구분되는 일시 오류로 표시하고, 파싱 실패는 수리 힌트 이슈를 단다.
  test('provider and JSON parse failures are tagged transient; quality issues are not', async () => {
    const outcome = p => p.then(() => null, e => e);
    const down = await outcome(generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '질문', [], async () => ({ ok: false, error: 'http_503' }), v2()));
    expect(down.message).toBe('HEUKWOL_GENERATION_UNAVAILABLE');expect(isHeukwolTransientError(down)).toBe(true);
    const thrown = await outcome(generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '질문', [], async () => { throw new Error('fetch failed'); }, v2()));
    expect(isHeukwolTransientError(thrown)).toBe(true);
    const broken = await outcome(generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '질문', [], async () => ({ ok: true, text: '{"warning": "끊긴' }), v2()));
    expect(isHeukwolTransientError(broken)).toBe(true);expect(broken.heukwolIssue).toBe('HEUKWOL_JSON_INVALID');
    expect(HEUKWOL_REPAIR_HINTS.HEUKWOL_JSON_INVALID).toBeTruthy();
    const weak = await outcome(generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '질문', [], providerOf(shortValue), v2()));
    expect(weak.heukwolIssue).toBe('HEUKWOL_CHAPTER_SHORT');expect(isHeukwolTransientError(weak)).toBe(false);
  });
  test('without the v2 option the v1 validator still rejects short chapters', async () => {
    await expect(generateHeukwolChapter({}, analysis, HEUKWOL_CHAPTERS[0], '질문', [], providerOf(shortValue)))
      .rejects.toThrow('HEUKWOL_CHAPTER_QUALITY');
  });
});

test('S15 luck judgement: natal once, month chapters get scoped month verdicts, the rule lives in the shared prefix', async () => {
  const { SAJU_LUCK_JUDGEMENT_RULE } = await import('../../worker/lib/saju-temperament.js');
  expect(HEUKWOL_PROMPT_PREFIX).toContain(SAJU_LUCK_JUDGEMENT_RULE);
  expect(analysis.luckJudgement.natal.yongsin.reason).toBeTruthy();
  expect(analysis.luckJudgement.year.label).toBe('2027년');
  const byKey = key => chapterEvidence(analysis, HEUKWOL_CHAPTERS.find(c => c.key === key));
  expect(byKey('temperament').luckJudgement.natal).toBeDefined();
  expect(byKey('nature-love').luckJudgement).toBeUndefined();
  const may = byKey('month-5');
  expect(may.luckJudgement.natal).toBeUndefined();
  expect(may.luckJudgement.year.pillar).toBe(analysis.luckJudgement.year.pillar);
  may.months[0].saju.forEach(seg => {
    expect(seg.luckJudgement.pillar).toBe(seg.pillar);
    expect(seg.luckJudgement.reasons.length).toBeGreaterThan(0);
  });
  const money = byKey('money');
  expect(money.months).toHaveLength(12);
  // R6c: 12개월 장은 구간별 판정과 그 이유를 싣는다(R6b 에서 뺀 이유가 없어 근거 밖 충 해석이 나왔다). 한 줄 설명은 뺀다.
  money.months.flatMap(m => m.saju).forEach(seg => {
    expect(Object.keys(seg.luckJudgement)).toEqual(['verdict', 'reasons']);
    expect(seg.luckJudgement.reasons.length).toBeGreaterThan(0);
  });
  expect(money.luckJudgement.year).toBeDefined();
});

describe('Trait-First (TRAIT_FIRST_SAJU)', () => {
  const temperament = HEUKWOL_CHAPTERS.find(c => c.key === 'temperament');
  const traitOn = { traitFirst: 'v1', traitSeed: 'owner|heukwol' };
  test('off is byte-identical for every chapter, with and without a repair hint', () => {
    for (const chapter of HEUKWOL_CHAPTERS) {
      const base = heukwolPrompt(analysis, chapter, '질문', []);
      expect(heukwolPrompt(analysis, chapter, '질문', [], '', {})).toBe(base);
      expect(heukwolPrompt(analysis, chapter, '질문', [], '', { traitFirst: null })).toBe(base);
      expect(heukwolPrompt(analysis, chapter, '질문', [], '힌트', {})).toBe(heukwolPrompt(analysis, chapter, '질문', [], '힌트'));
      if (chapter.key !== 'temperament') expect(heukwolPrompt(analysis, chapter, '질문', [], '', traitOn)).toBe(base);
    }
  });
  test('on adds the fact block to the temperament suffix only; removing it restores the off prompt', () => {
    const off = heukwolPrompt(analysis, temperament, '질문', []);
    const on = heukwolPrompt(analysis, temperament, '질문', [], '', traitOn);
    expect(on.startsWith(`${HEUKWOL_PROMPT_PREFIX}\n`)).toBe(true);
    const start = on.indexOf('\n[타고난 성향 핵심 근거]');
    expect(start).toBe(off.length);
    expect(on.slice(0, start)).toBe(off);
    expect(on.slice(start)).toContain('신금 일간');
    expect(on.slice(start).split('\n').at(-1).startsWith('사용 규칙: 성향 장은')).toBe(true);
    const hinted = heukwolPrompt(analysis, temperament, '질문', [], '힌트', traitOn);
    expect(hinted).toBe(`${on}\n보완 요청: 힌트`);
  });
  test('the generator forwards the pinned value and the shadow check never blocks delivery', async () => {
    const prompts = [];
    const text = '흑월이 짚는 조건이 있습니다. '.repeat(40);
    const reply = { warning: text, interpretation: text, strategy: '먼저 확인해. '.repeat(60), checkpoints: ['하나', '둘', '셋'], evidenceIds: ['natal-saju'] };
    const capture = async (_env, prompt) => { prompts.push(prompt); return { ok: true, text: JSON.stringify(reply) }; };
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const info = jest.spyOn(console, 'info').mockImplementation(() => {});
    try {
      const chapter = await generateHeukwolChapter({}, analysis, temperament, '질문', [], capture, { deliveryPlanVersion: 2, finalAttempt: true, ...traitOn });
      expect(chapter.key).toBe('temperament');
      expect(prompts[0]).toBe(heukwolPrompt(analysis, temperament, '질문', [], '', traitOn));
      expect([...warn.mock.calls, ...info.mock.calls].some(c => c[0] === '[Heukwol] Trait First Shadow')).toBe(true);
    } finally { warn.mockRestore(); info.mockRestore(); }
  });
});

describe('신살 사실 블록 (SAJU_SHINSAL_FACTS_V1)', () => {
  const natal = HEUKWOL_CHAPTERS.filter(c => c.phase === 'natal');
  const temperament = natal.find(c => c.key === 'temperament');
  const traitOn = { traitFirst: 'v1', traitSeed: 'owner|heukwol' };
  const HEADER = '[신살 계산값 — 서버 계산. 이 목록 밖의 신살은 쓰지 않는다]';
  const count = (text, part) => text.split(part).length - 1;
  const bound = content => workersAiInputTokenUpperBound([{ role: 'user', content }]);
  // 블록에 적힌 신살 이름을 인용하고 근거를 natal-saju 로 적은 답변. 문장마다 번호·주제가 달라 반복 검사에 걸리지 않는다.
  const citingReply = (block) => {
    const names = block.split('\n').filter(l => l.startsWith('- ') && !l.startsWith('- 시주:')).map(l => l.slice(2).split(':')[0]);
    const topics = ['약속을 잡는', '돈을 쓰는', '말을 꺼내는', '쉬는 시간을 정하는', '부탁을 거절하는', '새 일을 맡는', '연락을 미루는', '계획을 바꾸는'];
    const lines = fn => Array.from({ length: 24 }, (_, i) => fn(names[i % names.length], topics[i % topics.length], i + 1)).join(' ');
    return {
      warning: `${lines((n, t, i) => `흑월이 ${i}번째로 짚는 조건은 ${t} 순간에 ${n} 신호가 겹치는 경우예요.`)}\n${block}`,
      interpretation: lines((n, t, i) => `${i}번째 근거인 ${n}은 ${t} 장면에서 서두르지 않는 편이 좋다는 보조 단서로 읽어요.`),
      strategy: lines((n, t, i) => `${i}번째 대응은 ${t} 상황에서 ${n}을 떠올리고 한 번 더 확인하는 거야.`),
      checkpoints: ['하루 일정에 쉬는 칸을 먼저 적었는가', '큰 지출 전에 하루를 기다렸는가', '부탁을 받으면 답을 미루고 조건을 확인했는가'],
      evidenceIds: ['natal-saju'],
    };
  };

  test('off is byte-identical for every chapter; on adds the block once to the six natal chapters only', () => {
    expect(natal).toHaveLength(6);
    for (const chapter of HEUKWOL_CHAPTERS) for (const hint of ['', '힌트']) {
      const base = heukwolPrompt(analysis, chapter, '질문', [], hint);
      for (const off of [{}, { shinsalFacts: false }, { shinsalFacts: 'true' }, { shinsalFacts: 1 }]) expect(heukwolPrompt(analysis, chapter, '질문', [], hint, off)).toBe(base);
      const on = heukwolPrompt(analysis, chapter, '질문', [], hint, { shinsalFacts: true });
      if (chapter.phase !== 'natal') { expect(on).toBe(base); continue; }
      const block = heukwolShinsalBlock(analysis, chapter);
      expect(count(on, HEADER)).toBe(1);
      expect(on.length - base.length).toBe(block.length + 1);
      const plain = heukwolPrompt(analysis, chapter, '질문', []);
      expect(on).toBe(hint ? `${plain}\n${block}\n보완 요청: ${hint}` : `${plain}\n${block}`);
      expect(on.replace(`\n${block}`, '')).toBe(base);
    }
  });

  test('the block is natal-only, at most 500 chars, ends with the natal-saju rule and sits between Trait-First and the repair hint', () => {
    const block = heukwolShinsalBlock(analysis, temperament);
    expect(block.length).toBeLessThanOrEqual(500);
    expect(block.startsWith(`${HEADER}\n`)).toBe(true);
    expect(block.split('\n').at(-1)).toBe(HEUKWOL_SHINSAL_RULE);
    expect(block).not.toMatch(/- (?:대운|세운|월운) /);
    expect(block.match(/(?:^|[^-\w])(?:saju|ziwei)-[\w-]+/g) ?? []).toEqual([]);
    for (const chapter of natal) expect(heukwolShinsalBlock(analysis, chapter)).toBe(block);
    for (const chapter of HEUKWOL_CHAPTERS.filter(c => c.phase !== 'natal')) expect(heukwolShinsalBlock(analysis, chapter)).toBe('');
    const both = heukwolPrompt(analysis, temperament, '질문', [], '힌트', { ...traitOn, shinsalFacts: true });
    const traitAt = both.indexOf('\n[타고난 성향 핵심 근거]'), blockAt = both.indexOf(`\n${HEADER}`), hintAt = both.indexOf('\n보완 요청: 힌트');
    expect(traitAt).toBeGreaterThan(0);
    expect(traitAt < blockAt && blockAt < hintAt).toBe(true);
  });

  test('a missing hour gives the time-unknown line; broken input drops only the block', () => {
    const noHour = { ...analysis, pillars: analysis.pillars.filter(p => p.label !== '시주') };
    const block = heukwolShinsalBlock(noHour, temperament);
    expect(block).toContain('- 시주: 출생 시간 미상이라 시주 신살은 계산하지 않았다');
    expect(block).not.toMatch(/시지\(|시간\(/);
    for (const bad of [{ pillars: [{ label: '일주', pillar: 'XX' }] }, { pillars: null }, null, undefined]) expect(heukwolShinsalBlock(bad, temperament)).toBe('');
    const broken = { ...analysis, pillars: [{ label: '일주', pillar: 'XX' }] };
    expect(heukwolPrompt(broken, temperament, '질문', [], '', { shinsalFacts: true })).toBe(heukwolPrompt(broken, temperament, '질문', []));
  });

  test.each([
    ['New York 2027', analysis],
    ['Seoul 1984 / 2026', buildHeukwolAnalysis(heukwolProfileBirth({ gender: 'M', birth: { year: 1984, month: 2, day: 3, hour: 4, minute: 10, timeUnknown: false, calType: 'solar' } }), 2026, now)],
    ['New York 2028', buildHeukwolAnalysis(birth, 2028, now)],
  ])('the block never pushes a natal prompt past the 95%% budget, and survives the real chapter order (%s)', (_label, target) => {
    const question = '흑'.repeat(3000);
    const longestHint = Object.values(HEUKWOL_REPAIR_HINTS).sort((a, b) => b.length - a.length)[0];
    expect(HEUKWOL_SHINSAL_PROMPT_BUDGET).toBe(Math.floor(WORKERS_AI_INPUT_TOKEN_HARD_LIMIT * 0.95));
    let dropped = 0;
    for (const chapter of natal) for (const trait of [{}, traitOn]) {
      const everyOther = HEUKWOL_CHAPTERS.filter(c => c.key !== chapter.key).map(c => ({ title: c.title, strategy: '대응'.repeat(400) }));
      for (const previous of [[], everyOther]) {
        const off = heukwolPrompt(target, chapter, question, previous, longestHint, trait);
        const on = heukwolPrompt(target, chapter, question, previous, longestHint, { ...trait, shinsalFacts: true });
        if (on === off) { dropped++; continue; }
        expect(count(on, HEADER)).toBe(1);
        expect([chapter.key, bound(on) <= HEUKWOL_SHINSAL_PROMPT_BUDGET]).toEqual([chapter.key, true]);
      }
    }
    // 최장 질문·26장 이전 목록·최장 보완 요청에 Trait-First 까지 실린 성향 장만 예산을 넘어 블록이 빠진다.
    expect(dropped).toBeGreaterThan(0);
    expect(heukwolPrompt(target, temperament, question, [], longestHint, { ...traitOn, shinsalFacts: true })).toContain(HEADER);
  });

  test('a reply that quotes the block and cites natal-saju passes the v1 and v2 validators unchanged', () => {
    const charts = [analysis, ...[[1957, 3, 1], [1969, 11, 7], [1978, 6, 13], [1993, 9, 19], [2004, 12, 22]].map(([year, month, hour], i) =>
      buildHeukwolAnalysis(heukwolProfileBirth({ gender: i % 2 ? 'F' : 'M', birth: { year, month, day: 4 + i * 5, hour, minute: 20, timeUnknown: false, calType: 'solar' } }), 2027, now))];
    for (const target of charts) for (const chapter of natal) {
      const block = heukwolShinsalBlock(target, chapter);
      expect(block).toContain(HEADER);
      const reply = citingReply(block);
      expect(validateHeukwolChapter(reply, target, chapter).evidenceIds).toEqual(['natal-saju']);
      for (const flags of [{}, { relaxed: true }, { finalAttempt: true }]) {
        const accepted = validateHeukwolChapterV2(reply, target, chapter, flags);
        expect(accepted.evidenceIds).toEqual(['natal-saju']);
        expect(accepted.warning).toContain(block);
      }
    }
  });

  test('the generator forwards only a true pin into the prompt', async () => {
    const prompts = [];
    const reply = citingReply(heukwolShinsalBlock(analysis, temperament));
    const capture = async (_env, prompt) => { prompts.push(prompt); return { ok: true, text: JSON.stringify(reply) }; };
    for (const options of [{ deliveryPlanVersion: 2 }, { deliveryPlanVersion: 2, shinsalFacts: true }, { deliveryPlanVersion: 2, shinsalFacts: 'shinsal-facts-v1' }, {}, { shinsalFacts: true }]) {
      await generateHeukwolChapter({}, analysis, temperament, '질문', [], capture, options);
    }
    const plain = heukwolPrompt(analysis, temperament, '질문', []);
    const withBlock = heukwolPrompt(analysis, temperament, '질문', [], '', { shinsalFacts: true });
    expect(prompts).toEqual([plain, withBlock, plain, plain, withBlock]);
  });
});
