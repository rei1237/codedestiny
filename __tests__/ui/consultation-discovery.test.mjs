import '../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {CONSULTATION_CONCERNS, CONSULTATION_MASTERS, renderConsultationDiscovery} from '../../lib/marketing/consultation-discovery.mjs';
import {observeConsultationSamples} from '../../js/consultation-sample-exposure.mjs';

test('concern and master links use existing routes and canonical assets', () => {
  for (const row of [...CONSULTATION_CONCERNS, ...CONSULTATION_MASTERS]) {
    assert.ok(['page.tsx','page.js'].some(file=>existsSync('app'+row.href+file)),row.href);
    if (row.image) assert.ok(existsSync('public'+row.image),row.image);
  }
  const dom=new JSDOM(renderConsultationDiscovery());
  assert.equal(dom.window.document.querySelectorAll('.consultation-discovery__concerns a').length,7);
  assert.equal(dom.window.document.querySelectorAll('.consultation-discovery > .consultation-discovery__concerns a').length,3);
  assert.equal(dom.window.document.querySelectorAll('.consultation-discovery__more a').length,4);
  assert.equal(dom.window.document.querySelector('.consultation-discovery__more').hasAttribute('open'),false);
  assert.equal(dom.window.document.querySelector('.consultation-discovery__masters'),null,'Master discovery belongs to fusion');
  for(const image of dom.window.document.querySelectorAll('.consultation-discovery__scene img')) assert.ok(existsSync('public'+image.getAttribute('src')));
  assert.ok(!dom.window.document.querySelector('form'),'does not introduce a mandatory intake');
  dom.window.close();
});

test('discovery clicks reuse the existing home section event with public concern keys', () => {
  const dom=new JSDOM(renderConsultationDiscovery(),{url:'https://code-destiny.com/',runScripts:'outside-only'});
  const w=dom.window,events=[];
  w.eval(readFileSync('js/core/analytics.js','utf8'));
  w.cdTrack=(name,payload)=>events.push({name,payload});
  w.document.addEventListener('click',event=>event.preventDefault());
  w.document.querySelector('[data-cd-question="love-pattern"]').click();
  const observed=events.filter(event=>event.name==='home_section_click');
  assert.equal(observed.length,1);
  assert.deepEqual(JSON.parse(JSON.stringify(observed[0].payload)),{section:'consultation_discovery',destination:'/master-love-codex/',question_id:'love-pattern'});
  dom.window.close();
});

test('sample exposure counts visible headings once and excludes input from payloads', () => {
  const dom=new JSDOM('<main><article data-consultation-item="master-love-codex"><section data-example-kind="result"><h3>예시</h3><p>private content</p></section></article><input value="private name"></main>');
  let callback;const observed=new Set();let disconnected=false;const events=[];
  dom.window.IntersectionObserver=class {
    constructor(fn){callback=fn;} observe(node){observed.add(node);} unobserve(node){observed.delete(node);}
    disconnect(){disconnected=true;observed.clear();}
  };
  const stop=observeConsultationSamples(dom.window.document.querySelector('main'),(...event)=>events.push(event));
  const target=[...observed][0];
  callback([{target,isIntersecting:false,intersectionRatio:0}]);assert.equal(events.length,0);
  callback([{target,isIntersecting:true,intersectionRatio:0.1}]);assert.equal(events.length,0);
  callback([{target,isIntersecting:true,intersectionRatio:0.5}]);assert.equal(events.length,1);assert.equal(observed.size,0);
  assert.equal(events[0][0],'sample_view');
  assert.equal(events[0][1].item_id,'master-love-codex');
  assert.ok(!JSON.stringify(events).includes('private'));
  stop();assert.ok(disconnected);dom.window.close();
});

test('October consultation campaign accepts only declared sources and public content codes', async () => {
  const {normalizeGrowthAttribution}=await import('../../lib/marketing/growth-attribution.mjs');
  for (const channel of ['naver_blog','youtube']) {
    const url='https://code-destiny.com/master-love-codex/?utm_source='+channel+'&utm_medium=social&utm_campaign=growth_20261021&utm_content=V01_ko&question=private';
    const dom=new JSDOM('<head></head>',{url,runScripts:'outside-only'}),w=dom.window;
    w.eval(readFileSync('js/core/analytics.js','utf8'));
    assert.equal(w.cdReadGrowthAttribution(),null);
    w.document.cookie='cd_cookie_consent=accepted; path=/';
    const attribution=w.cdReadGrowthAttribution();
    assert.equal(attribution.campaignId,'growth_20261021_'+channel);
    assert.equal(normalizeGrowthAttribution(attribution).content,'V01_ko');
    assert.ok(!JSON.stringify(attribution).includes('private'));
    w.document.cookie='cd_cookie_consent=essential; path=/';
    assert.equal(w.cdReadGrowthAttribution(),null);
    dom.window.close();
  }
  for (const channel of ['threads','tiktok','x']) assert.equal(normalizeGrowthAttribution({consent:true,version:'growth-20261012-v2',campaignId:'growth_20261021_'+channel}),undefined);
});
