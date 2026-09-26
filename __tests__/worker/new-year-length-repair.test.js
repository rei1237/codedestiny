/** @jest-environment node */
import { jest } from '@jest/globals';
let utils, provider, fetchBlock;
beforeAll(async () => {
  const gemini = await import('../../worker/lib/gemini.js');
  jest.unstable_mockModule('../../worker/lib/gemini.js', () => ({ ...gemini, callGeminiText: (...args) => provider(...args) }));
  ({ __newYearAiTestUtils: utils } = await import('../../worker/routes/new-year-ai.js'));
});
beforeEach(() => { provider = jest.fn(); fetchBlock = jest.spyOn(globalThis, 'fetch').mockImplementation(() => { throw Error('External fetch blocked'); }); });
afterEach(() => { expect(fetchBlock).not.toHaveBeenCalled(); fetchBlock.mockRestore(); });
const anchors = '일간 용신 조후 대운 천간 선택 학업 연애 재물 직업 건강 가족 병오 1월 2월 3월 4월 5월 6월 7월 8월 9월 10월 11월 12월';
function text(key, size, basis = false) {
  const head = `${key} ${basis ? anchors : ''}\n\n`;
  const body = Array.from({ length: size }, (_, i) => String.fromCharCode(0xac00 + i % 11172)).join('');
  return head + key + body.slice(0, size / 2) + '\n\n' + key + body.slice(size / 2);
}
function fixture(short = 100) {
  const savedSections = utils.NEW_YEAR_AI_SECTIONS.map((section, i) => ({ key: section.key, section, ok: true, text: text(section.key, i ? 5000 : short, !i) }));
  const attempts = { overview: 1 };
  const options = { savedSections, attempts, deadlineAt: Date.now() + 80000,
    onReserve: async (key, repair) => { attempts[key] = (attempts[key] || 0) + 1; if (repair) attempts[`${key}:lengthRepair`] = 1; }, onCheckpoint: jest.fn() };
  return { savedSections, options };
}
const input = { birthInfo: {}, targetYear: 2026, focusArea: 'overall' };
const facts = { targetYear: { pillar: '병오' } };
for (const kind of ['missing_basis', 'truncated', 'empty', 'mock', 'repeated']) it(`real validator keeps short draft after ${kind} reinforcement`, async () => {
  const f = fixture();
  let body = text('overview', 5100, true);
  if (kind === 'missing_basis') body = body.replace('병오', '');
  if (kind === 'empty') body = '';
  if (kind === 'repeated') body += '\n\n' + f.savedSections[1].text;
  provider.mockResolvedValue({ ok: true, text: body, provider: kind === 'mock' ? 'mock' : 'gemini', truncated: kind === 'truncated' });
  const result = await utils.generateConsultationText({}, input, facts, f.options);
  expect(result.complete).toBe(true); expect(result.savedSections[0].text).toBe(f.savedSections[0].text);
  expect(provider).toHaveBeenCalledTimes(1); expect(f.options.attempts['overview:lengthRepair']).toBe(1);
});
it('real provider path preserves a first draft below the legacy 300-character floor', async () => {
  const f = fixture(); f.savedSections[0] = { ...f.savedSections[0], text: '', ok: false }; f.options.attempts.overview = 0;
  provider.mockResolvedValue({ ok: true, text: text('overview', 100, true), provider: 'gemini' });
  const first = await utils.generateConsultationText({}, input, facts, f.options);
  expect(first.complete).toBe(false);expect(first.savedSections[0].text).not.toBe('');expect(first.savedSections[0].text.length).toBeLessThan(300);
  const second = await utils.generateConsultationText({}, input, facts, { ...f.options, savedSections: first.savedSections });
  expect(second.complete).toBe(true);expect(provider).toHaveBeenCalledTimes(2);
});
it('a shorter repair can restore missing required evidence', async () => {
  const f = fixture(1000); f.savedSections[0].text = f.savedSections[0].text.replace('병오', '');
  provider.mockResolvedValue({ ok: true, text: text('overview', 100, true), provider: 'gemini' });
  const result = await utils.generateConsultationText({}, input, facts, f.options);
  expect(result.savedSections[0].text).toContain('병오'); expect(result.quality.issues).toEqual([]);
});
