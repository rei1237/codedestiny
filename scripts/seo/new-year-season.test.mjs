import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checklist, evaluateSeason, seasonPaths, seasonTargets } from './new-year-season.mjs';

const base = 'https://example.com';
const page = path => ({ url: `${base}${path}`, status: 200, html: `<html><head><title>t</title>
  <meta name="description" content="d"><link rel="canonical" href="${base}${path}"></head></html>` });

test('next year is a warning from August, a failure from October (KST), and this year always counts', () => {
  assert.deepEqual(seasonTargets(new Date('2026-07-31T14:59:00Z')), []);
  assert.deepEqual(seasonTargets(new Date('2026-08-15T00:00:00Z')), [{ year: 2027, severity: 'warn' }]);
  // 2026-09-30 15:00 UTC is already 1 October in Korea.
  assert.deepEqual(seasonTargets(new Date('2026-09-30T15:00:00Z')), [{ year: 2027, severity: 'fail' }]);
  assert.deepEqual(seasonTargets(new Date('2027-03-01T00:00:00Z')), [{ year: 2027, severity: 'fail' }]);
  assert.deepEqual(seasonTargets(new Date('2027-09-10T00:00:00Z')),
    [{ year: 2027, severity: 'fail' }, { year: 2028, severity: 'warn' }]);
});

test('season paths are the hub plus one trailing-slash URL per registered sign', () => {
  const paths = seasonPaths(2028);
  assert.equal(paths.length, 13);
  assert.equal(paths[0], '/fortune/2028/');
  assert.ok(paths.includes('/fortune/2028/pig/'));
});

test('an unpublished hub is a single issue and gets no crawl checklist', () => {
  const result = evaluateSeason({ year: 2028, severity: 'fail' }, [{ url: `${base}/fortune/2028/`, status: 404, html: '' }], new Set());
  assert.equal(result.live, false);
  assert.deepEqual(result.issues, ['/fortune/2028/: HTTP 404 — 시즌 페이지 미발행']);
  assert.match(checklist([result], base, [`${base}/sitemap-index.xml`]).join('\n'), /아직 운영에 없다/);
});

test('live pages must be in the sitemap and crawlable before the checklist lists them', () => {
  const paths = seasonPaths(2027, ['rat']);
  const rows = paths.map(page);
  const missing = evaluateSeason({ year: 2027, severity: 'fail' }, rows, new Set([rows[0].url]), 'User-agent: Yeti\nDisallow: /fortune/2027/rat/');
  assert.deepEqual(missing.issues, ['/fortune/2027/rat/: missing from sitemap', '/fortune/2027/rat/: robots blocks yeti']);
  const ok = evaluateSeason({ year: 2027, severity: 'fail' }, rows, new Set(rows.map(row => row.url)), 'User-agent: *\nAllow: /');
  assert.deepEqual(ok.issues, []);
  const text = checklist([ok], base, [`${base}/sitemap-index.xml`]).join('\n');
  assert.match(text, /### 2027년/);
  assert.match(text, /https:\/\/example\.com\/fortune\/2027\/pig\//);
});
