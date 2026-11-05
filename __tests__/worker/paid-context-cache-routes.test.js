/** @jest-environment node */
import { jest } from '@jest/globals';
import { requestBody, samplePairs } from '../fixtures/saju-compat-llm-fixture.mjs';

// 라우트가 만든 실제 프롬프트로 컨텍스트 캐시 배선을 본다. 제공자·DB·결제는 쓰지 않는다.
const env = { GEMINIF_API_KEY: 'fixture' };
const HANDLE = 'cachedContents/fixture';
let provider, create, restore, records;
const routes = [];
const lastPrompt = () => provider.mock.calls.at(-1)[1];
const lastOptions = () => provider.mock.calls.at(-1)[2];

beforeAll(async () => {
  const gemini = await import('../../worker/lib/gemini.js');
  jest.unstable_mockModule('../../worker/lib/gemini.js', () => ({
    ...gemini,
    callGeminiText: (...args) => provider(...args),
    createGeminiContextCache: (...args) => create(...args),
    restoreGeminiContextCache: (...args) => restore(...args),
  }));
  jest.unstable_mockModule('../../worker/lib/llm-cache-store.js', () => ({
    createLlmCacheStore: () => ({
      get: async (key) => records.get(key) || null,
      set: async (key, value) => { records.set(key, value); },
    }),
  }));
  jest.unstable_mockModule('../../worker/lib/cms-prompts.js', () => ({
    cmsPromptModelConfig: async () => ({ temperature: 0.5, maxOutputTokens: 48000 }),
    cmsPromptText: async (_env, _key, fallback) => fallback,
  }));

  const { __ziweiAiTestUtils: ziwei } = await import('../../worker/routes/ziwei-ai.js');
  const { __nakshatraAiTestUtils: nakshatra } = await import('../../worker/routes/nakshatra-ai.js');
  const { sajuCompatNarrativeAdapter } = await import('../../worker/routes/saju-compat-basic.js');
  const { calculateZiweiAiChart } = await import('../../worker/lib/ziwei-ai-chart.js');
  const { NAKSHATRA_SECTIONS, buildSectionPrompt } = await import('../../worker/lib/nakshatra-ai-prompt.js');
  const { buildSajuCompatFactsBlock } = await import('../../worker/lib/saju-compat-prompts.js');
  const { sajuCompatTasks } = await import('../../worker/lib/saju-compat-schema.js');
  const { runWithPaidGenerationContext } = await import('../../worker/lib/paid-generation-context.js');

  const birthInfo = { name: '테스트', gender: 'female', birthDate: '1990-01-01', birthTime: '12:00', birthTimeUnknown: false, calendarType: 'solar', isLeapMonth: false };
  const normalized = ziwei.normalizeConsultationInput({ focusArea: 'overall', topic: '전체 명반 해석', userQuestion: '큰 흐름을 알고 싶습니다.', birthInfo });
  const input = normalized.input;
  const chart = calculateZiweiAiChart(input, { year: 2026 });
  const specs = ziwei.SECTION_GROUP_SPECS;
  const savedGroups = Object.fromEntries(specs.map((spec, index) => [spec.id, Object.fromEntries(spec.sections.map((key) => [key, {
    title: key, body: `${index}번 묶음 ${key} 장의 본문은 저장된 초안이며 이 문장은 사십 자를 넘겨 유효한 본문으로 인정받도록 길게 적습니다.`,
  }]))]));
  const everyGroupSpent = Object.fromEntries(specs.map((spec) => [spec.id, 99]));

  const sajuInput = samplePairs(20261105, 50).map(([a, b]) => requestBody(a, b)).find((body) => buildSajuCompatFactsBlock(body).length > 4200);
  const sajuGroups = sajuCompatTasks(sajuInput).map((task) => task.id);
  const naksha = { summaryText: `【확인된 행성·하우스·D9】${'계산 근거 '.repeat(800)}`, question: '', writtenMemory: '' };

  routes.push(
    ['ziwei group', (attempt) => ziwei.generateInitialConsultation(env, {
      input, chart, cacheScope: ['user', 'session'], checkpoint: async () => {},
      attempts: attempt > 1 ? { [specs[0].id]: attempt - 1 } : {},
    }).catch(() => null)],
    ['ziwei meta after the groups', (attempt, index) => (index === 0
      ? ziwei.generateInitialConsultation(env, { input, chart, cacheScope: ['user', 'session'], checkpoint: async () => {} }).catch(() => null)
      : attempt > 1
        ? ziwei.generateInitialConsultation(env, { input, chart, cacheScope: ['user', 'session'], checkpoint: async () => {}, attempts: { [specs[0].id]: attempt - 1 } }).catch(() => null)
        : ziwei.generateInitialConsultation(env, { input, chart, cacheScope: ['user', 'session'], checkpoint: async () => {}, groups: savedGroups, attempts: everyGroupSpent }))],
    ['nakshatra sections', (attempt, index) => {
      const section = NAKSHATRA_SECTIONS[index];
      return nakshatra.generateSectionOnce(env, section, buildSectionPrompt(section, { ...naksha, writtenMemory: index ? `- 앞 장 ${index}` : '' }), null, false, { scope: ['user', 'session'], attempt, context: naksha });
    }],
    ['saju compat groups', (attempt, index) => runWithPaidGenerationContext({ requestId: 'paid-narrative:fixture', attempt }, () => sajuCompatNarrativeAdapter(env).produce(
      { id: sajuGroups[index] }, { input: sajuInput, locale: 'ko', attempts: { [sajuGroups[index]]: attempt }, parts: {} },
    ))],
  );
});

beforeEach(() => {
  records = new Map();
  provider = jest.fn(async () => ({ ok: true, text: '{}', provider: 'gemini', model: 'fixture' }));
  create = jest.fn(async (_env, input) => ({ name: HANDLE, prefix: input.prefix, systemPrompt: input.systemPrompt }));
  restore = jest.fn(async (input) => ({ name: input.name, prefix: input.prefix, systemPrompt: input.systemPrompt }));
});

const runs = (name) => routes.find((row) => row[0] === name)[1];
const NAMES = ['ziwei group', 'ziwei meta after the groups', 'nakshatra sections', 'saju compat groups'];

describe.each(NAMES)('%s', (name) => {
  test('the first part goes plain, the second creates the cache, the third reuses it', async () => {
    const run = runs(name);
    await run(1, 0);
    expect(lastOptions().geminiCachedContent).toBeUndefined();
    expect(create).not.toHaveBeenCalled();

    await run(1, 1);
    const handle = lastOptions().geminiCachedContent;
    expect(handle?.name).toBe(HANDLE);
    expect(handle.prefix.length).toBeGreaterThanOrEqual(4000);
    expect(lastPrompt().startsWith(handle.prefix)).toBe(true);
    expect(handle.systemPrompt).toBe(lastOptions().systemPrompt);

    await run(1, 2);
    expect(lastOptions().geminiCachedContent?.name).toBe(HANDLE);
    expect(lastPrompt().startsWith(handle.prefix)).toBe(true);
    expect(create).toHaveBeenCalledTimes(1);
  });

  test('a retry never uses the cache', async () => {
    const run = runs(name);
    await run(1, 0);
    await run(1, 1);
    const before = provider.mock.calls.length;
    await run(2, 2);
    expect(create).toHaveBeenCalledTimes(1);
    expect(provider.mock.calls.length).toBe(before + 1);
    expect(lastOptions().geminiCachedContent).toBeUndefined();
  });

  test('a failed create still sends the part', async () => {
    create = jest.fn(async () => undefined);
    const run = runs(name);
    await run(1, 0);
    await run(1, 1);
    expect(create).toHaveBeenCalledTimes(1);
    expect(lastOptions().geminiCachedContent).toBeUndefined();
    expect(lastOptions().timeoutMs).toBeGreaterThan(0);
  });
});
