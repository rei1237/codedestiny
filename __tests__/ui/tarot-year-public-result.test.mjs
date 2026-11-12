import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// 2026-11-12: the free (public) year reading is not stored server-side (stored:false), so a refresh
// lost the result and offered a new draw. The client keeps it per account/year and restores it.
const source = readFileSync('js/tarot-year-fortune-experience.js', 'utf8');
function slice(name) {
  const start = source.indexOf('  function ' + name + '(');
  assert.ok(start > 0, name);
  const end = source.indexOf('\n  }\n', start) >= 0 ? source.indexOf('\n  }\n', start) : source.indexOf('\n  }\r\n', start);
  return source.slice(start, end + 4);
}
function harness(serverResult) {
  const store = new Map();
  const applied = [];
  const context = {
    state: { year: 2026 },
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) },
    callTarotYearResult: () => (serverResult instanceof Error ? Promise.reject(serverResult) : Promise.resolve(serverResult)),
    applyYearResultData: data => { applied.push(data); return true; },
    console: { info() {} },
    Date, JSON, String, Number, Promise,
  };
  vm.createContext(context);
  for (const name of ['getPublicYearResultKey', 'savePublicYearResult', 'readPublicYearResult', 'restoreStoredYearResult']) vm.runInContext(slice(name), context);
  return { context, store, applied };
}
const year = new Date().getFullYear();
const publicResult = { ok: true, stored: false, accessSource: 'public', year, cards: [{ cardId: 'a' }], reading: { year } };

test('public year result is saved per account and restored when the server has none', async () => {
  const h = harness(null);
  h.store.set('fortune_auth_user', JSON.stringify({ id: 'u1' }));
  h.context.savePublicYearResult(publicResult);
  assert.ok(h.store.has('cd:tarot-year:public-result:u1:' + year));
  assert.equal(await h.context.restoreStoredYearResult(), true);
  assert.deepEqual(h.applied[0].cards, publicResult.cards);
  h.store.set('fortune_auth_user', JSON.stringify({ id: 'u2' }));
  h.applied.length = 0;
  assert.equal(await h.context.restoreStoredYearResult(), false);
});

test('paid/stored results are not copied locally and the server copy wins', async () => {
  const stored = { ok: true, stored: true, resultId: 'r', year, cards: [{ cardId: 'b' }] };
  const h = harness(stored);
  h.context.savePublicYearResult(stored);
  assert.equal(h.store.size, 0);
  h.context.savePublicYearResult(publicResult);
  assert.equal(await h.context.restoreStoredYearResult(), true);
  assert.equal(h.applied[0], stored);
});

test('guest (401) falls back to the local public copy', async () => {
  const h = harness(Object.assign(new Error('401'), { status: 401 }));
  h.context.savePublicYearResult(publicResult);
  assert.ok(h.store.has('cd:tarot-year:public-result:guest:' + year));
  assert.equal(await h.context.restoreStoredYearResult(), true);
});
