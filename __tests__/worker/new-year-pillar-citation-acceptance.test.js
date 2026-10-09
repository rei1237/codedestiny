/** @jest-environment node */
import { jest } from '@jest/globals';
let utils, provider, fetchBlock, monthlyIndex;
beforeAll(async () => {
  const gemini = await import('../../worker/lib/gemini.js');
  jest.unstable_mockModule('../../worker/lib/gemini.js', () => ({ ...gemini, callGeminiText: (...args) => provider(...args) }));
  ({ __newYearAiTestUtils: utils } = await import('../../worker/routes/new-year-ai.js'));
  monthlyIndex = utils.NEW_YEAR_AI_SECTIONS.findIndex(section => section.key === 'monthly');
});
beforeEach(() => { provider = jest.fn(); fetchBlock = jest.spyOn(globalThis, 'fetch').mockImplementation(() => { throw Error('External fetch blocked'); }); });
afterEach(() => { expect(fetchBlock).not.toHaveBeenCalled(); fetchBlock.mockRestore(); });
const pillars = ['임인', '계묘', '갑진', '을사', '정미', '무신', '기유', '경술', '신해', '임자', '계축', '갑인'];
const facts = { targetYear: { pillar: '병오' }, monthlyFlow: pillars.map((pillar, i) => ({ month: i + 1, pillar })) };
const input = { birthInfo: {}, targetYear: 2026, focusArea: 'overall' };
const anchors = '일간 용신 조후 대운 천간 선택 학업 연애 재물 직업 건강 가족 병오 1월 2월 3월 4월 5월 6월 7월 8월 9월 10월 11월 12월';
function text(key, size, extra = '') {
  const body = Array.from({ length: size }, (_, i) => String.fromCharCode(0xac00 + i % 11172)).join('');
  return `${key} ${extra}\n\n${key}${body.slice(0, size / 2)}\n\n${key}${body.slice(size / 2)}`;
}
function options(savedSections, attempts = {}) {
  return { savedSections, attempts, deadlineAt: Date.now() + 80000, onCheckpoint: jest.fn(),
    onReserve: async key => { attempts[key] = (attempts[key] || 0) + 1; } };
}
it('first section citing a few monthly pillars is adopted while the monthly section is still empty', async () => {
  provider.mockResolvedValue({ ok: true, provider: 'gemini', text: text('opening', 3000, pillars.slice(0, 3).join(' ')) });
  const result = await utils.generateConsultationText({}, input, facts, options([]));
  expect(provider).toHaveBeenCalledTimes(1);
  expect(result.savedSections[0].text).toContain('임인');
});
for (const previousCount of [9, 7]) it(`a rewrite that lowers monthly pillar citations from ${previousCount} to 2 is not adopted`, async () => {
  const saved = utils.NEW_YEAR_AI_SECTIONS.map(section => ({ key: section.key, section, ok: true,
    text: text(section.key, Math.min(5000, section.maxChars), section.key === 'overview' ? anchors : '') }));
  const previous = text('monthly', 5000, pillars.slice(0, previousCount).join(' '));
  saved[monthlyIndex] = { ...saved[monthlyIndex], text: previous, truncated: true };
  provider.mockResolvedValue({ ok: true, provider: 'gemini', text: text('monthly', 5000, pillars.slice(0, 2).join(' ')) });
  const result = await utils.generateConsultationText({}, input, facts, options(saved, { monthly: 1 }));
  expect(provider).toHaveBeenCalledTimes(1);
  expect(result.savedSections[monthlyIndex].text).toBe(previous);
});
