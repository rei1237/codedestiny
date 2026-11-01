import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRobotsRules, renderRobotsTxt } from '../../lib/seo/robots-policy.mjs';
import { robotsAllows } from './health-policy.mjs';

test('every declared crawler retains private boundaries while search crawlers can read public hubs', () => {
  const result = buildRobotsRules('https://code-destiny.com');
  const text = renderRobotsTxt('https://code-destiny.com');
  for(const group of result.rules) for(const agent of [].concat(group.userAgent)) {
    for(const path of ['/records/','/yeongnyangi/library/','/yeongnyangi/room/','/points/','/admin/','/checkout/','/api/billing/']) assert.equal(robotsAllows(text,path,agent),false,`${agent} ${path}`);
  }
  for(const agent of ['Googlebot','Bingbot','Yeti','OAI-SearchBot','PerplexityBot']) {
    for(const path of ['/','/faq/','/en/faq/','/ja/faq/','/saju/','/api/og']) assert.equal(robotsAllows(text,path,agent),true,`${agent} ${path}`);
  }
});
