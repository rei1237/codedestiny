import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function catalogue() {
  const window = { addEventListener() {} };
  const document = { readyState: 'loading', addEventListener() {}, querySelectorAll: () => [] };
  const context = vm.createContext({ window, document, URL, console });
  for (const file of ['js/core/service-registry.js', 'js/core/home-service-finder.js']) {
    vm.runInContext(readFileSync(file, 'utf8'), context, { filename: file });
  }
  return { filter: window.CodeDestinyAllFortunes.filter, registry: window.__cdServiceRegistry };
}

test('familiar concern words lead to existing relevant products', () => {
  const { filter } = catalogue();
  for (const [query, expected] of [
    ['남친', 'master-love-codex'], ['여자친구', 'master-love-codex'],
    ['돈', 'saju'], ['이직', 'career-style'], ['재회', 'master-love-codex'],
    ['내년', 'new-year-ai'], ['신년', 'new-year-ai']
  ]) assert(filter({ query }).some(item => item.id === expected), `${query} should find ${expected}`);
  assert.equal(filter({ query: '존재하지않는상품zz' }).length, 0);
});

test('search keeps catalogue coverage and access flags unchanged', () => {
  const { filter, registry } = catalogue();
  assert.equal(filter({}).length, registry.length);
  const free = filter({ query: '사주' }).find(item => item.id === 'saju');
  assert.equal(free.paid, false);
  assert.equal(free.price, registry.find(item => item.id === 'saju').price);
  const paid = filter({ query: '신년' }).find(item => item.id === 'new-year-ai');
  assert.equal(paid.paid, true);
  assert.equal(paid.price, registry.find(item => item.id === 'new-year-ai').price);
  assert(paid.resultFormat.length > 0);
});
