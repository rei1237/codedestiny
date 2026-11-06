// 질문 직답 계약·마스터 조언 렌즈(CONSULTATION_ANSWER_VOICE_V1). LLM·DB·CMS 를 부르지 않는다.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';
import {
  ANSWER_VOICE_VERSION, answerLensKey, answerVoiceBlock, appendAnswerVoice, pinAnswerVoice, resolveAnswerVoice, selectAnswerVoice,
} from '../../worker/lib/consultation-answer-contract.js';
import { buildGuardianFortunePrompt } from '../../worker/lib/guardian-fortune-prompt.js';

const fixtures = createRequire(import.meta.url)('../fixtures/guardian-fortune-prompt-fixtures.js');
const ON = { CONSULTATION_ANSWER_VOICE_V1: 'true' };
const lensOf = text => text.slice(text.indexOf('[조언 렌즈'));

test('OFF adds nothing, so prompts stay byte-identical', () => {
  assert.equal(selectAnswerVoice({}), null);
  assert.equal(selectAnswerVoice({ CONSULTATION_ANSWER_VOICE_V1: 'false' }), null);
  assert.equal(selectAnswerVoice(ON), ANSWER_VOICE_VERSION);
  assert.equal(answerVoiceBlock(null, { master: 'yeoni' }), '');
  const base = '[사실]\n일간 丙火, 용신 후보 木·火';
  assert.equal(appendAnswerVoice(base, null, { master: 'neo' }), base);
  assert.ok(appendAnswerVoice(base, ANSWER_VOICE_VERSION, { master: 'neo' }).startsWith(`${base}\n\n[질문 직답 상담 계약`));
});

test('same facts: yeoni and neo share the facts and the contract, only the lens differs', () => {
  const facts = '[확정 사실]\n일간 丙火 · 신약\n용신 후보 木·火(확정 아님)\n출생 시각 미상: 시주 판정 보류';
  const yeoni = appendAnswerVoice(facts, ANSWER_VOICE_VERSION, { master: 'yeoniLove' });
  const neo = appendAnswerVoice(facts, ANSWER_VOICE_VERSION, { master: 'neoNewYear' });
  assert.equal(yeoni.slice(0, yeoni.indexOf('[조언 렌즈')), neo.slice(0, neo.indexOf('[조언 렌즈')));
  assert.notEqual(lensOf(yeoni), lensOf(neo));
  assert.match(lensOf(yeoni), /연이/); assert.match(lensOf(neo), /네오/);
  for (const text of [yeoni, neo]) {
    assert.match(text, /첫 문단은 고객의 질문에 대한 답으로 시작한다/);
    assert.match(text, /후보·보류·판정 보류로 주어진 값.*확정으로 바꾸지 않는다/);
    assert.match(text, /결론과 확실성은 같다/);
    assert.doesNotMatch(text, /먼저 연락해도 될까요/);
  }
  assert.match(lensOf(neo), /모욕·겁주기 금지/);
});

test('only registered masters get a lens; anything else is neutral', () => {
  for (const [key, lens] of [['yunLifeBook', 'yun'], ['musung', 'musung'], ['hanbiLove', 'hanbi'], ['yeongnyangi', 'yeongnyangi'], ['master', 'master'], ['unknown-guest', 'neutral'], [undefined, 'neutral']]) {
    assert.equal(answerLensKey(key), lens);
  }
});

test('locale follows the customer and the block never sets a register', () => {
  const en = answerVoiceBlock(ANSWER_VOICE_VERSION, { master: 'yeoni', locale: 'en' });
  assert.match(en, /^\[Answer-first consultation contract/);
  assert.match(answerVoiceBlock(ANSWER_VOICE_VERSION, { master: 'yeoni', locale: 'ko-KR' }), /^\[질문 직답 상담 계약/);
  for (const locale of ['ko', 'en', 'ja']) {
    const block = answerVoiceBlock(ANSWER_VOICE_VERSION, { master: 'neo', locale });
    assert.doesNotMatch(block, /반말로 (쓴|답)|존댓말로 (쓴|답)|해요체로|합니다체로/);
  }
});

test('a started generation keeps its pinned voice when the flag changes', () => {
  assert.equal(pinAnswerVoice(null, ON), ANSWER_VOICE_VERSION); // new generation
  assert.equal(pinAnswerVoice({ groups: {} }, ON), null); // started before the contract: stays OFF
  assert.equal(pinAnswerVoice({ answerVoice: ANSWER_VOICE_VERSION }, {}), ANSWER_VOICE_VERSION); // flag turned off mid-run
  assert.equal(resolveAnswerVoice({ answerVoice: null }, ON), null);
  assert.equal(resolveAnswerVoice({}, ON), ANSWER_VOICE_VERSION);
});

test('guardian yeoni: OFF keeps the legacy order, ON answers within the first two sentences', () => {
  const input = fixtures.topicInputs.yeoni;
  const off = buildGuardianFortunePrompt({ input, context: fixtures.mockContext });
  assert.deepEqual(buildGuardianFortunePrompt({ input, context: fixtures.mockContext, answerVoice: null }), off);
  assert.match(off.systemPrompt, /결론을 첫 문장에 못 박지 않는다/);
  const on = buildGuardianFortunePrompt({ input, context: fixtures.mockContext, answerVoice: ANSWER_VOICE_VERSION });
  assert.doesNotMatch(on.systemPrompt, /결론을 첫 문장에 못 박지 않는다/);
  assert.match(on.systemPrompt, /첫 두 문장 안에서 지금의 마음을 짚으며 질문에 대한 답을 말하고/);
  assert.match(on.systemPrompt, /\[조언 렌즈 — 연이\]/);
  assert.equal(on.userPrompt, off.userPrompt); // facts and question are untouched
});

test('different topics and questions keep their own facts under one lens', () => {
  const build = (topic, concern) => buildGuardianFortunePrompt({ input: { ...fixtures.topicInputs.yeoni, topic, concern }, context: { ...fixtures.mockContext, inputSummary: { ...fixtures.mockContext.inputSummary, topic } }, answerVoice: ANSWER_VOICE_VERSION });
  const work = build('money_work', '올해 이직해도 될까요?');
  const love = build('love', '그 사람과 다시 만날 수 있을까요?');
  assert.ok(work.userPrompt.includes('money_work') && love.userPrompt.includes('love')); // the prompt answers the topic without quoting the concern
  assert.notEqual(work.userPrompt, love.userPrompt);
  assert.equal(lensOf(work.systemPrompt), lensOf(love.systemPrompt));
});
