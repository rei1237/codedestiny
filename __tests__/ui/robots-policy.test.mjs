import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildRobotsRules, renderRobotsTxt } from '../../lib/seo/robots-policy.mjs';
import { robotsAllows } from '../../scripts/seo/health-policy.mjs';

// 'googlebot'(소문자)은 UA 대소문자 무시를, 표에 없는 봇은 '*' 그룹 상속을 본다.
const UAS = ['Googlebot', 'googlebot', 'Bingbot', 'Yeti', 'Mediapartners-Google', 'GPTBot', 'CCBot', 'SomeUnlistedBot'];
const before = readFileSync(new URL('../fixtures/seo/robots-2026-11-01.txt', import.meta.url), 'utf8');
const samplePaths = () => [...new Set([
  ...[...before.matchAll(/^(?:Allow|Disallow):\s*(\S+)/gim)].map(([, p]) => p.replace(/\*/g, 'x')),
  '/', '/saju/', '/fortune/today/aries/', '/?auth=1', '/insights/x/?session=1',
  '/ggulggul/', '/yeongnyangi/', '/en/faq/', '/api/og?title=x', '/api/billing/',
])];

test('merged robots policy keeps every allow/disallow decision of the 2026-11-01 production file', () => {
  const after = renderRobotsTxt();
  for (const ua of UAS) for (const path of samplePaths()) {
    assert.equal(robotsAllows(after, path, ua), robotsAllows(before, path, ua), `${ua} ${path}`);
  }
  // 표본이 실제로 양쪽 판정을 다 밟는지(전부 허용·전부 차단이면 비교가 무의미하다).
  assert.equal(robotsAllows(after, '/?auth=1', 'googlebot'), false);
  assert.equal(robotsAllows(after, '/api/og', 'googlebot'), true);
  assert.equal(robotsAllows(after, '/saju/', 'CCBot'), false);
});

test('robots policy has two groups, no Host line and the index sitemap', () => {
  const text = renderRobotsTxt();
  assert.equal((text.match(/^(?:Allow|Disallow):/gim) || []).length > 0, true);
  assert.equal(text.split(/\n\s*\n/).filter((block) => /User-Agent:/i.test(block)).length, 2);
  assert.doesNotMatch(text, /^Host:/im);
  assert.match(text, /^Sitemap: https:\/\/code-destiny\.com\/sitemap-index\.xml$/m);
});

test('buildRobotsRules uses the given site URL and has no host', () => {
  const policy = buildRobotsRules('https://staging.example');
  assert.deepEqual(policy.sitemap, ['https://staging.example/sitemap-index.xml']);
  assert.equal('host' in policy, false);
  assert.equal(policy.rules.length, 2);
  assert.match(renderRobotsTxt('https://staging.example'), /^Sitemap: https:\/\/staging\.example\/sitemap-index\.xml$/m);
});
