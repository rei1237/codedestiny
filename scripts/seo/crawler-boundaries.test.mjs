import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import { robotsAllows } from './health-policy.mjs';

test('every declared crawler retains private boundaries while search crawlers can read public hubs', () => {
  const source = readFileSync(new URL('../../app/robots.ts', import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions:{ module:ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, require:()=>({SEO_V2_SITE:{siteUrl:'https://code-destiny.com'}}) });
  const result=exports.default();
  const text=result.rules.map(group=>[].concat(group.userAgent).map(agent=>`User-agent: ${agent}\n`+
    [].concat(group.allow||[]).map(path=>`Allow: ${path}`).join('\n')+'\n'+
    [].concat(group.disallow||[]).map(path=>`Disallow: ${path}`).join('\n')).join('\n\n')).join('\n\n');
  for(const group of result.rules) for(const agent of [].concat(group.userAgent)) {
    for(const path of ['/records/','/yeongnyangi/library/','/yeongnyangi/room/','/points/','/admin/','/checkout/','/api/billing/']) assert.equal(robotsAllows(text,path,agent),false,`${agent} ${path}`);
  }
  for(const agent of ['Googlebot','Bingbot','Yeti','OAI-SearchBot','PerplexityBot']) {
    for(const path of ['/','/faq/','/en/faq/','/ja/faq/','/saju/','/api/og']) assert.equal(robotsAllows(text,path,agent),true,`${agent} ${path}`);
  }
});
