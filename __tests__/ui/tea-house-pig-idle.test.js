const test = require('node:test');
const assert = require('node:assert/strict');
test('rare long line is reachable, spaced, and capped without consecutive repeats', async () => {
  const { nextPigSpeech } = await import('../../lib/fortune-tea-house/pig-idle.js');
  let state = { index: 0, turn: 0, recent: [0], rareCount: 0, lastRare: -5 };
  const rareTurns = [];
  for (let i = 0; i < 80; i++) {
    const next = nextPigSpeech(state, 4, 0.99);
    assert.notEqual(next.index, state.index);
    if (next.index === 3) rareTurns.push(next.turn);
    state = next;
  }
  assert.equal(rareTurns.length, 2);
  assert.ok(rareTurns[0] >= 6);
  assert.ok(rareTurns[1] - rareTurns[0] >= 5);
});
