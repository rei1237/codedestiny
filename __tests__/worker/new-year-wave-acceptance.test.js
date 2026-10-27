/** @jest-environment node */
import { jest } from '@jest/globals';
import { supportRecoveryPartHash } from '../../worker/lib/support-recovery-budget.js';
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

it('support recovery pins the approved provider options and never rewrites a preserved opening', async () => {
  const saved = filled();
  const opening = saved[0].text;
  saved[monthlyIndex] = { ...saved[monthlyIndex], text: '', ok: false };
  provider.mockResolvedValue({ ok: true, provider: 'gemini', text: text('monthly', 5000, pillars.join(' ')) });
  const recovery = { active: true, approvedProvider: 'gemini', approvedModel: 'gemini-2.5-flash', maxOutputTokens: 12000,
    preserved: { opening: supportRecoveryPartHash(opening) } };
  const result = await utils.generateConsultationText({}, input, facts, {
    ...options(saved), hasCustomQuestion: true, supportRecovery: recovery,
  });
  expect(provider).toHaveBeenCalledTimes(1);
  expect(provider.mock.calls[0][2]).toEqual(expect.objectContaining({ model: 'gemini-2.5-flash', fallbackToWorkersAI: false, maxProviderAttempts: 1, maxOutputTokens: 12000 }));
  expect(result.savedSections[0].text).toBe(opening);
  expect(result.complete).toBe(true);
});

it('support recovery rejects a changed preserved body before calling a provider', async () => {
  const saved = filled();
  const recovery = { active: true, approvedProvider: 'gemini', approvedModel: 'gemini-2.5-flash', maxOutputTokens: 12000,
    preserved: { opening: supportRecoveryPartHash('a different original body') } };
  await expect(utils.generateConsultationText({}, input, facts, { ...options(saved), supportRecovery: recovery }))
    .rejects.toMatchObject({ code: 'SUPPORT_RECOVERY_ORIGINAL_CHANGED' });
  expect(provider).not.toHaveBeenCalled();
});
for (const previousCount of [9, 7]) it(`a rewrite that lowers monthly pillar citations from ${previousCount} to 2 is not adopted`, async () => {
  const saved = utils.NEW_YEAR_AI_SECTIONS.map(section => ({ key: section.key, section, ok: true,
    text: text(section.key, Math.min(5000, section.maxChars), section.key === 'overview' ? anchors.replace(' 12월', '') : '') }));
  const previous = text('monthly', 5000, pillars.slice(0, previousCount).join(' '));
  saved[monthlyIndex] = { ...saved[monthlyIndex], text: previous };
  provider.mockResolvedValue({ ok: true, provider: 'gemini', text: text('monthly', 5000, `12월 ${pillars.slice(0, 2).join(' ')}`) });
  const result = await utils.generateConsultationText({}, input, facts, options(saved, { monthly: 1 }));
  expect(provider).toHaveBeenCalledTimes(1);
  expect(result.savedSections[monthlyIndex].text).toBe(previous);
});
function filled() {
  return utils.NEW_YEAR_AI_SECTIONS.map(section => ({ key: section.key, section, ok: true,
    text: text(section.key, Math.min(5000, section.maxChars), section.key === 'overview' ? anchors : section.key === 'monthly' ? pillars.join(' ') : '') }));
}
it('a section that used its attempts with an issue left is delivered instead of failing the whole consultation', async () => {
  const saved = filled();
  saved[monthlyIndex].text = text('monthly', 5000, pillars.slice(0, 5).join(' '));
  const result = await utils.generateConsultationText({}, input, facts, options(saved, { monthly: 2 }));
  expect(provider).not.toHaveBeenCalled();
  expect(result.complete).toBe(true);
  expect(result.quality.issues).toContain('MONTHLY_PILLAR_CITATIONS:5/12');
});
it('an empty section gets one rescue attempt that keeps a truncated reply up to its last full sentence', async () => {
  const saved = filled();
  saved[0] = { ...saved[0], text: '', ok: false };
  provider.mockResolvedValue({ ok: true, provider: 'gemini', truncated: true, text: `${text('opening', 3000)}.\n\n끊긴 문장` });
  const result = await utils.generateConsultationText({}, input, facts, options(saved, { opening: 2 }));
  expect(provider).toHaveBeenCalledTimes(1);
  expect(result.complete).toBe(true);
  expect(result.savedSections[0].text.endsWith('.')).toBe(true);
});
it('a reply repeating one stock sentence is adopted with the repeat removed instead of being discarded', async () => {
  const saved = filled();
  saved[monthlyIndex] = { ...saved[monthlyIndex], text: '', ok: false };
  const stock = '중요한 결정을 내릴 때는 주변의 조언을 귀담아듣고 신중하게 접근하는 자세가 필요합니다.';
  provider.mockResolvedValue({ ok: true, provider: 'gemini', text: `${text('monthly', 5000, pillars.join(' '))}\n\n1월은 흐름입니다. ${stock}\n\n2월은 기회입니다. ${stock}` });
  const result = await utils.generateConsultationText({}, input, facts, options(saved));
  expect(provider).toHaveBeenCalledTimes(1);
  expect(result.complete).toBe(true);
  expect(result.savedSections[monthlyIndex].text.split(stock)).toHaveLength(2);
});

it('later sections receive the accepted opening decision without another provider call',async()=>{
 const saved=filled(); const decision='확정 제안을 확인한 뒤 이직을 우선 검토하고, 부업은 준비 단계로만 두세요.';
 saved[0].text='**질문에 대한 답변**\n\n'+decision+'\n\n**타고난 성향과 지금의 마음**\n'+text('opening',3000);
 const target=saved.find(row=>row.key!=='opening'); target.text='';target.ok=false;
 provider.mockResolvedValue({ok:true,provider:'gemini',text:text(target.key,5000,anchors)});
 await utils.generateConsultationText({},input,facts,options(saved));
 expect(provider).toHaveBeenCalledTimes(1);
 const prompt=provider.mock.calls[0][1];
 expect(prompt).toContain('[앞 장의 질문 답변 — 판단의 연속성]');
 expect(prompt).toContain(decision);
 expect(prompt).toContain('병행·준비 단계와 최종 선택을 구분');
});
