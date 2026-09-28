/** @jest-environment node */
import { jest } from '@jest/globals';
import { normalizeNarrativeParagraphs, normalizeNarrativeEndings } from '../../worker/lib/narrative-format.js';
import { completeNarrativeBody } from '../../worker/lib/paid-narrative-candidate.js';
import { countPaidReportBodyChars } from '../../worker/lib/paid-report-quality.js';

const sentences = Array.from({ length: 24 }, (_, i) => `${i}번째 선택에서는 서로 다른 생활 조건을 살피고 각자의 속도를 비교하며 행동을 정리합니다.`);
const compact = text => text.replace(/\s/gu, '');
test.each([4, 10])('normalizes too few/excess paragraphs to %i without losing or duplicating text', count => {
  for (const body of [sentences.join(' '), sentences.join('\n\n'), sentences.slice(0, count).join('\n\n')]) {
    const result = normalizeNarrativeParagraphs(body, count);
    expect(result.split('\n\n')).toHaveLength(count);
    expect(compact(result)).toBe(compact(body));
    expect(countPaidReportBodyChars(result)).toBe(countPaidReportBodyChars(body));
    expect(normalizeNarrativeParagraphs(result, count)).toBe(result);
  }
});
test('CJK sentences, closing quotes and emoji remain intact', () => {
  const body = '「まず状況を確認します。」次は条件を比べます。選択には時間があります！🌙自分のペースを守ります。';
  const result = normalizeNarrativeParagraphs(body, 4);
  expect(result.split('\n\n')).toHaveLength(4);
  expect(compact(result)).toBe(compact(body));
});
test('never fabricates missing substantive items or coerces nonstrings', () => {
  expect(normalizeNarrativeParagraphs('짧은 설명', 10)).toBe('짧은 설명');
  for (const value of [null, {}, [], 2, '']) expect(normalizeNarrativeParagraphs(value, 4)).toBe(value);
});
test('adds only missing ending punctuation, before quotes, in each paragraph', () => {
  const body = '관찰할 조건을 정리해 보세요\n\n“상대가 답할 시간을 남겨두세요”';
  const result = normalizeNarrativeEndings(body);
  expect(result).toBe('관찰할 조건을 정리해 보세요.\n\n“상대가 답할 시간을 남겨두세요.”');
  expect(completeNarrativeBody(result)).toBe(true);
  expect(normalizeNarrativeEndings(result)).toBe(result);
  const japanese = normalizeNarrativeEndings('条件を比べます\n\n「自分のペースを守ります」', 'ja');
  expect(japanese).toBe('条件を比べます。\n\n「自分のペースを守ります。」');
  expect(completeNarrativeBody(japanese)).toBe(true);
});

let love, mind, question;
const provider = jest.fn();
beforeAll(async () => {
  jest.unstable_mockModule('../../worker/lib/gemini.js', () => ({ callGeminiText: provider }));
  ({ loveTarotNarrativeAdapter: love } = await import('../../worker/lib/love-tarot-delivery.js'));
  ({ mindscanNarrativeAdapter: mind } = await import('../../worker/lib/mindscan-delivery.js'));
  ({ featureQuestionNarrativeAdapter: question } = await import('../../worker/lib/feature-question-delivery.js'));
});
const state = { prompt: '', locale: 'ko', evidenceHash: 'fixed', facts: [{ id: 'fact-1', value: 'Sun' }] };
const result = body => ({ evidenceHash: 'fixed', claims: [{ factId: 'fact-1', value: 'Sun' }], body });
function reply(value, extra = {}) { provider.mockResolvedValue({ ok: true, provider: 'gemini', text: JSON.stringify(value), ...extra }); }
test.each([['love', 4], ['mind', 10]])('%s repairs paragraphs at the producer boundary', async (kind, count) => {
  const adapter = kind === 'love' ? love({}) : mind({});
  const task = { id: kind === 'love' ? 'matrix-0' : 'summary', minChars: 1400 };
  for (const body of [sentences.join(' '), sentences.join('\n\n')]) {
    reply(result(body));
    const value = await adapter.produce(task, state);
    expect(value.body.split('\n\n')).toHaveLength(count);
    expect(compact(value.body)).toBe(compact(body));
    expect(value.evidenceHash).toBe('fixed');
  }
  for (const value of [null, result([]), result(''), result('# 제목'), result('한 항목뿐입니다.')]) {
    reply(value); expect(await adapter.produce(task, state)).toBeNull();
  }
  reply(result(sentences.join(' ')), { truncated: true });
  expect((await adapter.produce(task, state)).body.split('\n\n')).toHaveLength(count);
});
test('question locally repairs punctuation, citation metadata and duplicate paragraphs', async () => {
  const adapter = question({}, 'astrology_ai_prompt_generator'), task = { id: 'part-1', minChars: 2200 };
  const body = '선택에 필요한 조건과 자신의 일상에서 바꿀 수 있는 부분을 비교해 보세요\n\n서로의 속도가 다른 만큼 상대의 반응을 관찰할 시간을 남겨두세요';
  reply(result(body));
  expect((await adapter.produce(task, state)).body).toBe(normalizeNarrativeEndings(body));
  for (const extra of [{ isMock: true }, { ok: false }]) {
    reply(result(body), extra); expect(await adapter.produce(task, state)).toBeNull();
  }
  for (const value of [{ ...result(body), claims: [null] }, { ...result(body), claims: [{ factId: 'fake', value: 'Sun' }] }, result(`${body}\n\n${body}`)]) { reply(value, {truncated:true}); expect((await adapter.produce(task,state)).body).toBe(normalizeNarrativeEndings(body)); }
  for (const value of [null, result('# 제목'), result([body])]) {
    reply(value); expect(await adapter.produce(task, state)).toBeNull();
  }
});
