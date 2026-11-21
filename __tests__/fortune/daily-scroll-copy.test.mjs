import test from 'node:test';
import assert from 'node:assert/strict';
import { LUCKY_COLOR_NAMES, PRACTICE_POOLS, luckyFor, practiceFor, swatchFor } from '../../lib/fortune/scroll-lucky.mjs';
import { allYeoniScrollLines, toneForScore, yeoniScrollSay } from '../../lib/fortune/yeoni-scroll-say.mjs';

const BANNED = /반드시|절대|틀림없|무조건|100%|운명|저주|재앙/u;
const EMOJI = /\p{Extended_Pictographic}/u;
const sentences = (text) => text.split(/(?<=[.!?])\s+/u).filter(Boolean);

test('두루마리 연이 한마디·실천 문구는 60자·2문장·해요체·단정어 금지 규칙을 지킨다', () => {
  const lines = [
    ...allYeoniScrollLines().map((row) => row.text),
    ...Object.values(PRACTICE_POOLS).flat(),
  ];
  for (const text of lines) {
    assert.ok(text.length <= 60, `60자 초과: ${text}`);
    assert.ok(sentences(text).length <= 2, `2문장 초과: ${text}`);
    assert.ok(/(요|죠)[.!]?$/u.test(text), `해요체 아님: ${text}`);
    assert.doesNotMatch(text, BANNED, `단정어: ${text}`);
    assert.doesNotMatch(text, EMOJI, `이모지: ${text}`);
  }
  for (const pool of Object.values(PRACTICE_POOLS)) assert.ok(pool.length >= 6);
});

test('같은 날짜·키는 같은 값이고, 이웃한 두 날짜는 같은 문구를 받지 않는다', () => {
  const a = { dateKey: '2026-11-21', key: 'rat' };
  assert.deepEqual(yeoniScrollSay({ ...a, score: 8 }), yeoniScrollSay({ ...a, score: 8 }));
  assert.deepEqual(luckyFor({ dateKey: a.dateKey, key: 'saju' }), luckyFor({ dateKey: a.dateKey, key: 'saju' }));
  for (let day = 1; day < 30; day += 1) {
    const d1 = `2026-11-${String(day).padStart(2, '0')}`;
    const d2 = `2026-11-${String(day + 1).padStart(2, '0')}`;
    assert.notEqual(yeoniScrollSay({ dateKey: d1, key: 'rat', score: 6 }).text, yeoniScrollSay({ dateKey: d2, key: 'rat', score: 6 }).text);
    assert.notEqual(practiceFor({ dateKey: d1, key: 'saju', system: 'saju' }), practiceFor({ dateKey: d2, key: 'saju', system: 'saju' }));
  }
});

test('행운의 색은 스와치가 있는 8색, 숫자는 1~9, 점수는 톤으로 나뉜다', () => {
  for (const name of LUCKY_COLOR_NAMES) assert.match(swatchFor(name), /^#[0-9a-f]{6}$/u);
  assert.equal(swatchFor('없는 색'), null);
  for (let day = 1; day <= 28; day += 1) {
    const { colorKr, number } = luckyFor({ dateKey: `2026-11-${String(day).padStart(2, '0')}`, key: 'vedic', birthKey: '1990-01-01' });
    assert.ok(LUCKY_COLOR_NAMES.includes(colorKr));
    assert.ok(Number.isInteger(number) && number >= 1 && number <= 9);
  }
  assert.deepEqual([toneForScore(9), toneForScore(6), toneForScore(2), toneForScore(undefined)], ['high', 'mid', 'low', 'mid']);
});
