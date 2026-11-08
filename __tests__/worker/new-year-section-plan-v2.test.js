/** @jest-environment node */
// 신년운세 구성 V2: 성향·공감 전용 첫 장(nature) + 질문 답변은 총운(overview)이 한 번만.
// 버전 없는 예전 세션은 V1 6섹션을 그대로 쓴다.
import { jest } from '@jest/globals';
let utils, buildAdminLabPrompt, provider;
beforeAll(async () => {
  const gemini = await import('../../worker/lib/gemini.js');
  jest.unstable_mockModule('../../worker/lib/gemini.js', () => ({ ...gemini, callGeminiText: (...args) => provider(...args) }));
  ({ __newYearAiTestUtils: utils, buildAdminLabPrompt } = await import('../../worker/routes/new-year-ai.js'));
});
beforeEach(() => { provider = jest.fn(); });

const QUESTION = '올해 이직해도 괜찮을까요?';
const body = {
  targetYear: 2027, focusArea: 'overall', question: QUESTION,
  birthInfo: { name: '검증', gender: 'male', birthDate: '1990-03-15', birthTime: '10:30', birthTimeUnknown: false, calendarType: 'solar', isLeapMonth: false },
};
const v2 = key => utils.NEW_YEAR_AI_SECTIONS_V2.find(section => section.key === key);
const promptFor = key => buildAdminLabPrompt(body, { section: v2(key) }).prompt;
// 질문 원문은 계산 데이터 JSON에도 들어 있어, 질문을 따로 꺼내 보여 주는 블록 머리로 센다.
const quoted = '[사용자가 직접 남긴 질문';

it('a session without a plan version keeps the six V1 sections and version 2 uses seven', () => {
  expect(utils.newYearSectionsForPlan(undefined).map(s => s.key)).toEqual(['opening', 'overview', 'wealth', 'romance', 'monthly', 'health']);
  expect(utils.newYearSectionsForPlan(2).map(s => s.key)).toEqual(['nature', 'overview', 'money', 'career', 'romance', 'monthly', 'health']);
});

it('the nature section explains temperament and empathy without quoting or answering the question', () => {
  const prompt = promptFor('nature');
  expect(prompt).not.toContain(quoted);
  expect(prompt).not.toContain('질문에 대한 답변**을 굵게 쓰고');
  expect(prompt).toContain('쉬운 뜻');
  expect(prompt).toContain('생활 장면');
  expect(prompt).toContain('이 장만 맡는 관점');
});

it('only the overview section quotes the question and answers it before the year overview', () => {
  const overview = promptFor('overview');
  expect(overview.split(quoted)).toHaveLength(2);
  expect(overview).toContain('[사용자가 직접 남긴 질문 — 최우선으로 답할 것]');
  expect(overview).toContain(`"${QUESTION}"
`);
  expect(overview).toContain('질문에 대한 답변을 마친 뒤 소제목 **올해의 총운**');
  for (const key of ['nature', 'money', 'career', 'romance', 'monthly', 'health']) expect(promptFor(key)).not.toContain(quoted);
});

it('every V2 section names its own perspective and bans filler connectors', () => {
  for (const section of utils.NEW_YEAR_AI_SECTIONS_V2) {
    const prompt = promptFor(section.key);
    expect(prompt).toContain(`이 장만 맡는 관점: ${section.perspective}`);
    expect(prompt).toContain("'결국 중요한 것은', '다시 말해', '앞서 말했듯'");
  }
});

it('V2 section ceilings fit the V2 output cap with 1,500 extra tokens', async () => {
  const { tokensRequiredForChars } = await import('../../worker/lib/llm-budget.js');
  for (const section of utils.NEW_YEAR_AI_SECTIONS_V2) expect(tokensRequiredForChars(section.maxChars) + 1500).toBeLessThanOrEqual(utils.NEW_YEAR_AI_V2_SECTION_MAX_OUTPUT_TOKENS);
  const target = utils.NEW_YEAR_AI_SECTIONS_V2.reduce((sum, s) => sum + s.targetMinChars, 0);
  const v1Target = utils.NEW_YEAR_AI_SECTIONS.reduce((sum, s) => sum + s.targetMinChars, 0);
  expect(target).toBeGreaterThan(v1Target);
});

it('the V2 system prompt states the longer recommended total and V1 keeps its numbers', () => {
  expect(utils.buildSystemPrompt(null, { planVersion: 2 })).toContain('권장 분량은 41,000~46,000자');
  expect(utils.buildSystemPrompt()).toContain('권장 분량은 28,500~32,000자');
});

it('V2 issues route the question answer to overview and each category to its own section', () => {
  const results = utils.NEW_YEAR_AI_SECTIONS_V2.map(section => ({ key: section.key, section, text: '본문' }));
  const targets = utils.mapIssuesToSections({ issues: ['QUESTION_ANSWER_SECTION_MISSING', 'MISSING_CATEGORIES:money,career'] }, results);
  expect(targets.get('overview')).toEqual(['QUESTION_ANSWER_SECTION_MISSING']);
  expect(targets.get('money')).toEqual(['MISSING_CATEGORIES:money']);
  expect(targets.get('career')).toEqual(['MISSING_CATEGORIES:career']);
});

it('a V2 wave starts with the nature section and saves V2 keys', async () => {
  provider.mockResolvedValue({ ok: true, provider: 'gemini', model: 'm', text: '성향 본문입니다. '.repeat(400) });
  const input = utils.normalizeConsultationInput(body).input;
  const attempts = {};
  const result = await utils.generateConsultationText({}, input, utils.calculateNewYearFortuneData(input), {
    sections: utils.newYearSectionsForPlan(2), hasCustomQuestion: true,
    savedSections: [], attempts, deadlineAt: Date.now() + 80000, onCheckpoint: jest.fn(),
    onReserve: async key => { attempts[key] = (attempts[key] || 0) + 1; },
  });
  expect(Object.keys(attempts)).toEqual(['nature']);
  expect(result.savedSections.map(row => row.key)).toEqual(['nature', 'overview', 'money', 'career', 'romance', 'monthly', 'health']);
  expect(provider.mock.calls[0][2].systemPrompt).toContain('권장 분량은 41,000~46,000자');
});

it('later V2 sections receive the overview question answer as the decision to keep', () => {
  const input = utils.normalizeConsultationInput(body).input;
  const fortuneData = utils.calculateNewYearFortuneData(input);
  const prior = [{ key: 'overview', section: v2('overview'), text: '**질문에 대한 답변**\n지금은 옮기지 말고 준비해라.\n\n**올해의 총운**\n총운 본문' }];
  const prompt = utils.buildSectionPrompt(input, fortuneData, v2('money'), [], '', prior);
  expect(prompt).toContain('[앞 장의 질문 답변 — 판단의 연속성]');
  expect(prompt).toContain('지금은 옮기지 말고 준비해라.');
  expect(prompt).not.toContain('총운 본문');
});

it('the public session reports progress against the plan the session was created with', () => {
  const doc = { id: 's1', status: 'partial', messages: [], llmMeta: { savedSections: [] } };
  expect(utils.publicSession(doc).progress.total).toBe(6);
  expect(utils.publicSession({ ...doc, llmMeta: { savedSections: [], sectionPlanVersion: 2 } }).progress.total).toBe(7);
});

// 2026-11-08 샘플 후속(1-2 보정): 커리어·건강은 2~3개 달만, 월별 소제목 키워드는 달마다 다르게, 숫자 점수·풀지 않은 용어 금지.
it('V2 career and health pick only two or three key months and monthly keywords must differ', () => {
  expect(promptFor('career')).toContain('2~3개 달만');
  expect(promptFor('career')).toContain('사정(질문 속 상황)을 이 장에서 다시 요약하지 않습니다');
  expect(promptFor('health')).toContain('2~3개 달만');
  expect(promptFor('monthly')).toContain('핵심 키워드는 달마다 모두 달라야 합니다');
  ['nature', 'overview', 'money', 'career', 'romance', 'monthly', 'health'].forEach(key => {
    expect(promptFor(key)).toContain("'4.7점', '토 기운 4개' 금지");
    expect(promptFor(key)).toContain('귀문관살');
  });
  expect(promptFor('overview')).not.toContain('사정(질문 속 상황)을 이 장에서 다시 요약하지 않습니다');
});

it('V1 section prompts carry none of the V2 readability rules', () => {
  // 바이트 동일성은 HEAD(96282eecc) 모듈과 sha256 을 맞대어 확인했다(4ffc7bdb…, 211,188자).
  utils.NEW_YEAR_AI_SECTIONS_V1.forEach(section => {
    const prompt = buildAdminLabPrompt(body, { section }).prompt;
    expect(prompt).not.toContain("'4.7점', '토 기운 4개' 금지");
    expect(prompt).not.toContain('2~3개 달만');
    expect(prompt).not.toContain('핵심 키워드는 달마다 모두 달라야 합니다');
  });
});
