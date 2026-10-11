import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { mountAstroCraftedDetails } from '../../js/core/astro/crafted-details.mjs';

for (const guideFirst of [true, false]) test(`astro guide stays beside its purchase entry when guide mounts ${guideFirst?'before':'after'} presentation`, () => {
 const dom=new JSDOM('<html lang="ko"><head></head><body><div id="astroModalOverlay"><div id="astroResult"><div id="astroBodyWrap"><section data-astro-server-detail><button>기존 해금</button></section><section class="astro-compat-panel astro-compat-panel--direct"><button id="buy">기존 궁합</button></section><section class="astro-compat-panel" id="astroSynastrySection"><button>유명인 선택</button></section></div></div></div></body></html>',{url:'https://example.test',runScripts:'outside-only'});
 globalThis.document=dom.window.document;globalThis.window=dom.window;
 dom.window.fetch=async()=>({ok:true,json:async()=>[]});
 dom.window.eval(fs.readFileSync(new URL('../../js/core/saju/basicFortunePresentation.js',import.meta.url),'utf8'));
 const area=document.querySelector('#astroResult'),buy=document.querySelector('#buy');let calls=0;buy.addEventListener('click',()=>calls++);
 if(guideFirst)mountAstroCraftedDetails(area);
 dom.window.BasicFortunePresentation.astro(area);
 if(!guideFirst)mountAstroCraftedDetails(area);
 const guide=area.querySelector('[data-astro-crafted="compat-astro-direct-synastry"]');
 assert(guide.closest('#fr-astro-consult'));assert.equal(guide.parentElement,buy.parentElement.parentElement);
 assert(!guide.closest('#fr-astro-record'));assert.equal(document.querySelector('#buy'),buy);
 buy.click();assert.equal(calls,1);mountAstroCraftedDetails(area);assert.equal(area.querySelectorAll('[data-astro-crafted="compat-astro-direct-synastry"]').length,1);
 dom.window.close();
});

test('a delayed celebrity initializer only populates the chart that scheduled it', () => {
 const html='<div id="astroBodyWrap"><div id="astroCtryTabs"></div><div id="astroCatTabs"></div><input id="astroSyQ"><div id="astroSyCelebs"></div></div>';
 const dom=new JSDOM('<html><body>'+html+'</body></html>',{url:'https://example.test',runScripts:'outside-only'});
 const queued=[];dom.window.setTimeout=fn=>queued.push(fn);
 Object.assign(dom.window,{sunIndex:0,chart:{planets:{}},CELEBS:[],COUNTRY_CONFIG:{KR:{flag:'KR',label:'한국',order:0}},CELEB_CATS:['가수']});
 const source=fs.readFileSync(new URL('../../js/saju-engine.js',import.meta.url),'utf8');
 const start=source.indexOf('    var astroSynastryRoot ='),end=source.indexOf('    /* ── 시나스트리 정밀 계산 공통 유틸 ── */',start);
 assert(start>0&&end>start);const initialize=source.slice(start,end);
 // Separate function invocations reproduce two renderer closures, with one replaced DOM.
 dom.window.eval('(function(){'+initialize+'})()');const old=dom.window.document.querySelector('#astroBodyWrap');
 old.outerHTML=html;dom.window.eval('(function(){'+initialize+'})()');queued.forEach(fn=>fn());
 for(const root of [old,dom.window.document.querySelector('#astroBodyWrap')]){
  assert.equal(root.querySelectorAll('#astroCtryTabs button').length,2);
  assert.equal(root.querySelectorAll('#astroCatTabs button').length,2);
 }
 dom.window.close();
});
