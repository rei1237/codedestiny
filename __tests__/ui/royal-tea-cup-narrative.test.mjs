import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { isFreeFortuneFeatureKey } from '../../lib/payment/free-fortune-policy.mjs';

const html = readFileSync(new URL('../../royal-tea-oracle.html', import.meta.url), 'utf8');

function royalTeaFor(now) {
  const slice = (start, end) => {
    const from = html.indexOf(start);
    const to = html.indexOf(end, from + start.length);
    assert.ok(from >= 0 && to > from, start);
    return html.slice(from, to);
  };
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return Date.parse(now); }
  }
  return runInNewContext([
    slice('const SYMBOLS =', 'const canvas ='),
    slice('function getSymbolKeywords', 'function getDrinkerKey'),
    slice('function getKstDateKey', 'function buildCupMap(intent)'),
    slice('function buildCupMap(intent)', 'function setRoyalTeaPaymentPending'),
    slice('function escapeHtml', 'function syncCertMoreHint'),
    '({ INTENTS, buildCupMap, buildCertificateHtml })',
  ].join('\n'), { Date: FixedDate, getDrinkerKey: () => 'test-drinker' });
}

test('Royal Tea stays free, stable per KST day and supplies an intent-specific three-symbol reading', () => {
  assert.ok(isFreeFortuneFeatureKey('royal-tea-oracle'));
  const beforeMidnight = royalTeaFor('2026-11-26T14:59:59Z');
  const afterMidnight = royalTeaFor('2026-11-26T15:00:00Z');
  assert.deepEqual(Array.from(beforeMidnight.INTENTS, (intent) => intent.id), ['love', 'work', 'money', 'family', 'choice']);
  const readings = new Set();
  for (const { id } of beforeMidnight.INTENTS) {
    const cup = beforeMidnight.buildCupMap(id);
    assert.equal(cup.dateKey, '2026-11-26');
    assert.equal(afterMidnight.buildCupMap(id).dateKey, '2026-11-27');
    assert.equal(beforeMidnight.buildCupMap(id).serial, cup.serial);
    const certificate = beforeMidnight.buildCertificateHtml(cup);
    const summary = certificate.match(/<div class="cert-summary">([\s\S]+?)<\/div>/)?.[1];
    assert.ok(summary);
    assert.equal((summary.match(/<p>/g) || []).length, 4);
    assert.equal((certificate.match(/class="cert-zone"/g) || []).length, 3);
    for (const { codex } of cup.readings) {
      assert.ok(summary.includes(codex.ko));
      assert.ok(!certificate.includes(codex.ko.repeat(2)), codex.ko);
    }
    assert.doesNotMatch(certificate, /undefined|null|\[object Object\]|NaN/);
    readings.add(summary);
  }
  assert.equal(readings.size, 5);
});
