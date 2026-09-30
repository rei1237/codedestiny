import { buildSajuGuests, guestGrade, kstDate } from '../../lib/fortune-tea-house/saju-guests.js';
import { resolveQuestionCategory, selectQuestionGuests } from '../../lib/fortune-tea-house/saju-category.js';
import { buildGuestPrompt } from '../../lib/fortune-tea-house/saju-guest-prompt.js';

const facts = {
  heavenlyStemTenGods: { year: { stem: '甲', tenGod: '겁재' }, month: { stem: '丁', tenGod: '상관' }, day: { stem: '乙', tenGod: '본인' } },
  hiddenStemsByBranch: { year: { branch: '寅', hiddenStems: [{ stem: '甲', tenGod: '겁재', layer: '정기' }] } },
  fixedTenGodTable: [{ stem: '甲', stemKorean: '갑', tenGod: '겁재' }, { stem: '丁', stemKorean: '정', tenGod: '상관' }],
};
const timing = { daewoonRows: [{ pillar: '갑자', startYear: 2020, endYear: 2029, isCurrent: true }], sewoonRows: [{ pillar: '정미', year: 2027 }] };

test('weak chart helpful rob-wealth is not assigned a negative grade by traditional nature', () => {
  const guests = buildSajuGuests({ facts, timing, decisions: { yong: 'wood', hee: ['wood'], strength: 'weak' } });
  expect(guests.filter(g => g.tenGod === '겁재').every(g => g.grade === 'yong' && g.traditional === 'challenging')).toBe(true);
  expect(guests.map(g => g.scope)).toEqual(['natal', 'natal', 'natal', 'daewoon', 'sewoon']);
  expect(guests.some(g => g.tenGod === '본인')).toBe(false);
});
test('output-star helpful grade and strong chart caution follow decisions, not fixed labels', () => {
  const guests = buildSajuGuests({ facts, decisions: { yong: 'fire', gi: ['wood'], strength: 'strong' } });
  expect(guests.find(g => g.tenGod === '상관').grade).toBe('yong');
  expect(guests.find(g => g.tenGod === '겁재').grade).toBe('gi');
});
test('missing decisions are not neutral grades and missing facts are not fabricated', () => {
  expect(buildSajuGuests()).toEqual([]);
  expect(buildSajuGuests({ facts }).every(g => g.grade === 'unavailable')).toBe(true);
  expect(guestGrade('metal', { yong: 'wood' })).toBe('unavailable');
  expect(guestGrade('wood', { hee: ['목'] })).toBe('hee');
});
test('deterministic result preserves input, distinct occurrences and time evidence', () => {
  const input = { facts, timing, decisions: { yong: 'wood' } };
  const before = JSON.stringify(input);
  const first = buildSajuGuests(input);
  expect(first).toEqual(buildSajuGuests(input));
  expect(new Set(first.map(g => g.id)).size).toBe(first.length);
  expect(JSON.stringify(input)).toBe(before);
  expect(first.find(g => g.scope === 'daewoon').evidence.endYear).toBe(2029);
});
test('KST date crosses UTC year boundary without changing engine computation', () => {
  expect(kstDate(new Date('2026-12-31T15:00:00Z'))).toBe('2027-01-01');
});
test.each([
  ['재회할 수 있을까요', 'love'], ['남자친구와 연락', 'love'],
  ['이직을 준비합니다', 'career'], ['취업과 진로', 'career'],
  ['사업을 시작할까요', 'wealth'], ['돈과 수익', 'wealth'],
  ['시험 준비', 'study'], ['공부 방향', 'study'],
  ['수면과 피로', 'health'], ['건강 관리', 'health'],
  ['부모와 관계', 'family'], ['동료와 갈등', 'family'],
  ['결혼 준비', 'marriage'], ['출산 계획', 'marriage'],
  ['궁합이 궁금해요', 'compatibility'], ['두 사람의 관계', 'compatibility'],
  ['이사 시기', 'timing'], ['언제 움직일까요', 'timing'],
  ['올해 총운', 'annual'], ['내년 흐름', 'annual'],
])('category %s → %s', (question, primary) => expect(resolveQuestionCategory({ question }).primary).toBe(primary));
test('explicit category wins; mixed question keeps one auxiliary; unknown asks once', () => {
  expect(resolveQuestionCategory({ questionCategory: 'study', question: '취업과 돈' })).toMatchObject({ primary: 'study', secondary: 'career' });
  expect(resolveQuestionCategory({ question: '뭘 봐야 할까요' }).needsClarification).toBe(true);
});
test('prompt contains immutable guests and category-scoped time limits without provider calls', () => {
  const guests = buildSajuGuests({ facts, timing });
  const prompt = buildGuestPrompt({ questionCategory: 'annual' }, guests, '2027-01-01');
  expect(prompt.guests[0].scope).toBe('sewoon');
  expect(prompt.todayKst).toBe('2027-01-01');
  expect(selectQuestionGuests(guests, 'career').find(g => g.tenGod === '상관')).toBeDefined();
  expect(prompt.rules.join(' ')).toContain('용신을 다시 판정하지 않는다');
});
