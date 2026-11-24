import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderTrustBar, renderCompareSection, HOME_TRUST_COMPARE_COPY, ht } from '../../lib/marketing/home-trust-compare.mjs';
import { trustRecordCopy } from '../../lib/marketing/trust-record.mjs';
import { LATEST_PRESS_COVERAGE, PRESS_COVERAGE, renderPressCoverageCopyHtml } from '../../lib/seo/press-coverage.mjs';

test('trust bar uses only sourced facts: record link, press date, no user count or rating', () => {
  const html = renderTrustBar();
  assert.equal((html.match(/<li class="yh-trustbar__item">/g) || []).length, 4);
  assert.ok(html.includes(`href="${trustRecordCopy.href}"`));
  assert.ok(html.includes(LATEST_PRESS_COVERAGE.dateLabel));
  assert.ok(html.includes(`href="${LATEST_PRESS_COVERAGE.url}"`));
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

test('My contains the sourced press record alongside the translated comparison', () => {
  assert.throws(() => ht('homeTrust.nope'));
  assert.ok(Object.keys(HOME_TRUST_COMPARE_COPY).length >= 19);
  const shell = readFileSync(new URL('../../public/ggulggul/index.html', import.meta.url), 'utf8');
  assert.ok(shell.includes(renderTrustBar()), 'the original press record is present in My');
  const order = ['class="yh-situations"', 'class="yh-supplement"', 'class="yh-compare"'].map((k) => shell.indexOf(k));
  assert.ok(order.every((i) => i > 0) && order.every((v, i) => i === 0 || v > order[i - 1]), String(order));
});

test('press coverage keeps both original links and lists the new article first', () => {
  const html = renderPressCoverageCopyHtml();
  assert.ok(html.indexOf('idxno=11118') >= 0);
  assert.ok(html.indexOf('idxno=10891') > html.indexOf('idxno=11118'));
  assert.ok(html.includes('<time datetime="2026-11-06">'));
  assert.ok(html.includes('초융합 운세와 캐릭터 서사로 확장'));
  assert.equal((html.match(/rel="noopener noreferrer"/g) || []).length, 2);
  assert.ok(html.includes(PRESS_COVERAGE.dateLabel));
});
