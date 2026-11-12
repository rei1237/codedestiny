import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FREE_PROMO, FREE_PROMO_COPY_KO, freePromoDaysLeft, freePromoDayLabel } from '../../lib/marketing/free-promo.mjs';

const read = (path) => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');

test('free promo countdown follows the KST calendar and is display-only', () => {
  const end = FREE_PROMO.endsAt;
  assert.equal(end, '2027-02-12T23:59:59+09:00');
  assert.equal(freePromoDaysLeft(end, Date.parse('2026-11-12T09:00:00+09:00')), 92);
  assert.equal(freePromoDayLabel(92), 'D-92');
  // Late on the eve and early on the final day of the promotion.
  assert.equal(freePromoDaysLeft(end, Date.parse('2027-02-11T23:59:00+09:00')), 1);
  assert.equal(freePromoDaysLeft(end, Date.parse('2027-02-12T00:01:00+09:00')), 0);
  assert.equal(freePromoDayLabel(0), 'D-DAY');
  assert.equal(freePromoDaysLeft(end, Date.parse('2027-02-13T00:00:00+09:00')), null);
  assert.equal(freePromoDayLabel(null), '');
});

test('free promo Korean copy, authored i18n and baked shell stay in sync', () => {
  const authored = JSON.parse(read('i18n/authored/freePromo-01.json'));
  for (const [key, ko] of Object.entries(FREE_PROMO_COPY_KO)) {
    const entry = authored['freePromo.' + key];
    assert.ok(entry, 'missing authored key freePromo.' + key);
    assert.equal(entry.ko, ko, 'ko drift: freePromo.' + key);
    assert.equal(Object.keys(entry).length, 12, 'freePromo.' + key + ' must cover 12 locales');
  }
  const shell = read('index.html');
  assert.ok(shell.includes(`data-ends="${FREE_PROMO.endsAt}"`), 'index.html banner must carry FREE_PROMO.endsAt');
  assert.ok(shell.includes('data-cd-trans="freePromo.tileBadge">' + FREE_PROMO_COPY_KO.tileBadge + '<'));
});

test('free promo end date never gates access', () => {
  for (const path of ['lib/payment/free-fortune-policy.mjs', 'worker/lib/paid-feature-registry.js']) {
    assert.ok(!read(path).includes('free-promo'), path + ' must not read the display-only promo');
  }
});
