/** @jest-environment node */
// Gemini discounts only a repeated leading prefix, so per-section text must come after the fortune data.
import { jest } from '@jest/globals';
let utils, buildAdminLabPrompt, provider;
beforeAll(async () => {
  const gemini = await import('../../worker/lib/gemini.js');
  jest.unstable_mockModule('../../worker/lib/gemini.js', () => ({ ...gemini, callGeminiText: (...args) => provider(...args) }));
  ({ __newYearAiTestUtils: utils, buildAdminLabPrompt } = await import('../../worker/routes/new-year-ai.js'));
});
beforeEach(() => { provider = jest.fn(); });

const body = {
  targetYear: 2027, focusArea: 'overall', question: '올해 이직해도 괜찮을까요?',
  birthInfo: { name: '검증', gender: 'male', birthDate: '1990-03-15', birthTime: '10:30', birthTimeUnknown: false, calendarType: 'solar', isLeapMonth: false },
};
const FACTS = '[계산된 사주와 세운 데이터]';
const commonPrefix = (a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i += 1; return a.slice(0, i); };
const sections = () => utils.NEW_YEAR_AI_SECTIONS.slice(0, 3);

it('sections share one system prompt with no section label in it', () => {
  const prompts = sections().map(section => buildAdminLabPrompt(body, { section }).systemPrompt);
  expect(new Set(prompts).size).toBe(1);
  for (const section of sections()) expect(prompts[0]).not.toContain(`"${section.label}"`);
});

it('sections share a user prompt prefix that carries every fortune fact', () => {
  const [first, second] = sections().map(section => buildAdminLabPrompt(body, { section }).prompt);
  const shared = commonPrefix(first, second);
  const factsEnd = first.indexOf('[카테고리별 참고 신호');
  expect(first.indexOf(FACTS)).toBeGreaterThan(-1);
  expect(shared.length).toBeGreaterThan(factsEnd);
});

it('each section still receives its own scope and the question after the shared facts', () => {
  for (const section of sections()) {
    const { prompt } = buildAdminLabPrompt(body, { section });
    const scope = prompt.indexOf(`이번 요청은 완성 상담문 전체가 아니라 "${section.label}" 부분만 쓰는 작업입니다.`);
    expect(scope).toBeGreaterThan(prompt.indexOf(FACTS));
    expect(prompt).toContain('인사말·자기소개·전체 총평·마무리 인사를 새로 만들지 말고');
    expect(prompt).toContain('지침 13번의 전체 분량 기준은 여러 부분을 합친 최종 결과에 적용됩니다.');
  }
});

it('the whole-report form keeps the question before the facts and adds no section scope', () => {
  const { prompt, systemPrompt } = buildAdminLabPrompt(body);
  const question = prompt.indexOf('[사용자가 직접 남긴 질문 — 최우선으로 답할 것]');
  expect(question).toBeGreaterThan(-1);
  expect(question).toBeLessThan(prompt.indexOf(FACTS));
  expect(prompt).not.toContain('이번 요청은 완성 상담문 전체가 아니라');
  expect(systemPrompt).not.toContain('이번 요청은 완성 상담문 전체가 아니라');
});

it('real generation sends the shared system prompt instead of a per-section one', async () => {
  provider.mockResolvedValue({ ok: false, provider: 'gemini', text: '' });
  const input = utils.normalizeConsultationInput(body).input;
  const attempts = {};
  await utils.generateConsultationText({}, input, utils.calculateNewYearFortuneData(input), {
    savedSections: [], attempts, deadlineAt: Date.now() + 80000, onCheckpoint: jest.fn(),
    onReserve: async key => { attempts[key] = (attempts[key] || 0) + 1; },
  }).catch(() => null);
  expect(provider).toHaveBeenCalled();
  for (const call of provider.mock.calls) expect(call[2].systemPrompt).not.toContain('이번 요청은 완성 상담문 전체가 아니라');
});
