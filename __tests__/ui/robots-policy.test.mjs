import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildRobotsRules, renderRobotsTxt } from '../../lib/seo/robots-policy.mjs';
import { robotsAllows, robotsSamples } from '../../scripts/lib/robots-groups.mjs';

const before = readFileSync(new URL('../fixtures/seo/robots-2026-11-01.txt', import.meta.url), 'utf8');
// UA 는 두 파일에 적힌 User-agent 전부(검색·인용·학습 크롤러)에 더해, 소문자 'googlebot'(대소문자 무시)과
// 표에 없는 봇('*' 그룹 상속)을 본다. 경로도 두 파일의 Allow·Disallow 전부에 대표 경로를 더한다.
const samples = (after) => robotsSamples([before, after], {
  agents: ['googlebot', 'SomeUnlistedBot'],
  paths: ['/', '/saju/', '/fortune/today/aries/', '/?auth=1', '/insights/x/?session=1',
    '/ggulggul/', '/yeongnyangi/', '/en/faq/', '/api/og?title=x', '/api/billing/'],
});

test('merged robots policy keeps every allow/disallow decision of the 2026-11-01 production file', () => {
  const after = renderRobotsTxt();
  const { agents, paths } = samples(after);
  assert.ok(agents.includes('GPTBot') && agents.includes('Claude-SearchBot') && agents.includes('CCBot'), agents.join(' '));
  // /points/ 는 2026-11-13 결정으로 크롤 차단을 풀었다(noindex 를 읽게 하려고). 아래에서 따로 확인한다.
  for (const ua of agents) for (const path of paths.filter((path) => !path.startsWith('/points/'))) {
    assert.equal(robotsAllows(after, path, ua), robotsAllows(before, path, ua), `${ua} ${path}`);
  }
  // 표본이 실제로 양쪽 판정을 다 밟는지(전부 허용·전부 차단이면 비교가 무의미하다).
  assert.equal(robotsAllows(before, '/points/', 'googlebot'), false);
  assert.equal(robotsAllows(after, '/points/', 'googlebot'), true);
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
