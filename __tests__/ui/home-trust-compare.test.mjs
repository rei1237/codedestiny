import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderTrustBar, renderCompareSection, HOME_TRUST_COMPARE_COPY, ht } from '../../lib/marketing/home-trust-compare.mjs';
import { trustRecordCopy } from '../../lib/marketing/trust-record.mjs';
import { PRESS_COVERAGE } from '../../lib/seo/press-coverage.mjs';

test('trust bar uses only sourced facts: record link, press date, no user count or rating', () => {
  const html = renderTrustBar();
  assert.equal((html.match(/<li class="yh-trustbar__item">/g) || []).length, 4);
  assert.ok(html.includes(`href="${trustRecordCopy.href}"`));
  assert.ok(html.includes(PRESS_COVERAGE.dateLabel));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  assert.doesNotMatch(html, /평점|누적|만\s*명|\d\.\d\s*\/\s*5|★/);
  assert.match(html, /data-cd-korean-only/);
});

test('compare section pairs 4 muted ✗ rows with 4 highlighted ✓ rows', () => {
  const html = renderCompareSection();
  assert.equal((html.match(/yh-compare__col--old/g) || []).length, 1);
  assert.equal((html.match(/yh-compare__col--new/g) || []).length, 1);
  assert.equal((html.match(/\u2717/g) || []).length, 4);
  assert.equal((html.match(/\u2713/g) || []).length, 4);
  assert.doesNotMatch(html, /<a /);
});

test('copy lookup is fail-closed and the shell contains both sections in order', () => {
  assert.throws(() => ht('homeTrust.nope'));
  assert.ok(Object.keys(HOME_TRUST_COMPARE_COPY).length >= 19);
  const shell = readFileSync(new URL('../../public/ggulggul/index.html', import.meta.url), 'utf8');
  const order = ['yh-trustbar"', 'class="yh-situations"', 'class="yh-supplement"', 'class="yh-compare"'].map((k) => shell.indexOf(k));
  assert.ok(order.every((i) => i > 0) && order.every((v, i) => i === 0 || v > order[i - 1]), String(order));
});
