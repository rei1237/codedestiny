import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../../scripts/verify-redirects-budget.mjs', import.meta.url), 'utf8');
const start = source.indexOf('let routesInclude = [];');
const end = source.indexOf('// ── 6.', start);
assert.ok(start >= 0 && end > start, 'route coverage gate must remain available');
function verify(include, exclude = []) {
  const failures = [];
  runInNewContext(source.slice(start, end), {
    routesText: JSON.stringify({ version: 1, include, exclude }),
    workerIncludes: ['/', '/index.html', '/api/*', '/fortune/*'],
    fail: message => failures.push(message), console, process,
  });
  return failures;
}

test('a catch-all covers the declared Worker routes while static asset exclusions remain valid', () => {
  assert.deepEqual(verify(['/*'], ['/_next/*', '/images/*']), []);
});

test('CI rejects the overlapping include and exclude rules rejected by Cloudflare Pages', () => {
  assert.ok(verify(['/*', '/api/*']).some(message => message.includes('include 규칙이 중복')));
  assert.ok(verify(['/*'], ['/images/*', '/images/neo.webp']).some(message => message.includes('exclude 규칙이 중복')));
});

test('a wildcard must not hide an excluded or uncovered required Worker route', () => {
  assert.ok(verify(['/*'], ['/api/*']).some(message => message.includes('"/api/*"')));
  assert.ok(verify(['/', '/index.html', '/api/*']).some(message => message.includes('"/fortune/*"')));
});
