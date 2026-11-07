import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {consultationStories,storyBenefits} from '../../lib/brand/consultation-stories.mjs';
import {consultationWebtoons} from '../../lib/brand/consultation-webtoons.mjs';

const LEAD_WORKS=new Set(['tea','neo','love-secret','heukwol','fusion']);
import {RECORD_SERVICES} from '../../lib/records/service-registry.js';

test('all 13 stories retain an existing service, art, three benefits and a dedicated entry cover',()=>{
  const dom=new JSDOM(readFileSync('index.html','utf8'));
  assert.equal(Object.keys(consultationStories).length,13);
  for(const id of Object.keys(consultationStories)){
    const service=RECORD_SERVICES.find(s=>s.id===id);
    assert.ok(service?.href && service.featureKey,id);
    assert.equal(storyBenefits[id].length,3,id);
    const cuts=consultationWebtoons[id]?.cuts||[];
    const [min,max]=LEAD_WORKS.has(id)?[10,16]:[8,12];
    assert.ok(cuts.length>=min && cuts.length<=max,id+' cut count '+cuts.length);
    assert.ok(cuts.some(cut=>cut.cover),id+' cover cut');
    assert.equal(new Set(cuts.map(cut=>cut.src)).size,cuts.length,id+' distinct art');
    for(const cut of cuts){
      assert.ok(cut.alt && cut.w>0 && cut.h>0,cut.src);
      assert.ok(existsSync('public'+cut.src+'-'+cut.fallback+'.webp'),cut.src);
      for(const w of cut.widths)assert.ok(existsSync('public'+cut.src+'-'+w+'.avif'),cut.src+' '+w);
    }
    assert.ok(existsSync('public/images/consultation-webtoons/covers/'+id+'.webp'),id+' entry cover');
    for (const link of dom.window.document.querySelectorAll('a[href="/consultations/'+id+'/"]')) {
      assert.ok(link.matches('.yh-story-option > .yh-story-link'), id);
      assert.equal(link.previousElementSibling.getAttribute('href'), service.href, id);
    }
  }
  // 2026-11-07 고민 칩 단일화로 홈의 고민별 카드(웹툰 링크 포함)는 빠졌다. 웹툰 목록은 /#homeStoryTitle 로 간다.
  assert.equal(dom.window.document.querySelectorAll('.yh-story-link').length, 0);
  assert.ok(dom.window.document.querySelector('a[href="/#homeStoryTitle"]'));
  assert.equal(dom.window.document.querySelectorAll('#cdSigGrid .cd-sig-card[data-cd-service-id][data-cd-popup-copy]').length,6);
  assert.equal(dom.window.document.querySelectorAll('a a').length,0);
  dom.window.close();
});

async function fixture({standalone=false,native=false,inApp=false}={}){
  const dom=new JSDOM('<!doctype html><aside data-pwa-install-entry hidden><button data-pwa-install>추가</button></aside><section id="cdAppInstall" hidden></section>',{url:'https://fixture.test/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window;
  w.matchMedia=()=>({matches:standalone,addEventListener(){}});
  w.fetch=async()=>({ok:false});
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  if(native)w.__CODE_DESTINY_RUNTIME_TARGET='mobile-app';
  if(inApp)Object.defineProperty(w.navigator,'userAgent',{value:'KAKAOTALK'});
  w.eval(readFileSync('js/pwa-lifecycle.js','utf8'));
  await new Promise(r=>setTimeout(r,0));
  return dom;
}
test('manual prompt is user-triggered and consumed only once; completion hides every entry',async()=>{
  const dom=await fixture(),w=dom.window;let calls=0;
  try{
    assert.equal(w.document.querySelector('[data-pwa-install-entry]').hidden,false);
    const event=new w.Event('beforeinstallprompt',{cancelable:true});
    event.prompt=()=>{calls++;return Promise.resolve();};event.userChoice=Promise.resolve({outcome:'accepted'});
    w.dispatchEvent(event);assert.equal(calls,0);
    w.document.querySelector('button').click();await Promise.resolve();assert.equal(calls,1);
    w.dispatchEvent(new w.Event('appinstalled'));
    for(const el of w.document.querySelectorAll('[data-pwa-install-entry],[data-pwa-install],#cdAppInstall'))assert.equal(el.hidden,true);
    w.__cdPwaLifecycle.install();assert.equal(calls,1);assert.equal(w.document.querySelectorAll('dialog').length,0);
  }finally{dom.window.close();}
});
test('declining does not claim installation; next manual request offers guidance',async()=>{
  const dom=await fixture(),w=dom.window;
  try{
    const event=new w.Event('beforeinstallprompt');event.prompt=()=>Promise.resolve();event.userChoice=Promise.resolve({outcome:'dismissed'});w.dispatchEvent(event);
    w.__cdPwaLifecycle.install();await new Promise(r=>setTimeout(r,0));
    assert.ok(Number(w.localStorage.getItem('cd.pwa.snooze'))>Date.now());
    assert.equal(w.document.querySelector('[data-pwa-install-entry]').hidden,false);
    w.__cdPwaLifecycle.install();assert.equal(w.document.querySelector('dialog').open,true);
  }finally{dom.window.close();}
});
for(const state of ['standalone','native'])test(state+' hides both old and new entries',async()=>{
  const dom=await fixture({[state]:true});
  try{assert.equal(dom.window.document.querySelector('[data-pwa-install-entry]').hidden,true);assert.equal(dom.window.document.getElementById('cdAppInstall').hidden,true);dom.window.__cdPwaLifecycle.install();assert.equal(dom.window.document.querySelectorAll('dialog').length,0);}finally{dom.window.close();}
});
test('unsupported and in-app browsers use existing guidance and restore focus',async()=>{
  for(const inApp of [false,true]){
    const dom=await fixture({inApp}),w=dom.window;
    try{const button=w.document.querySelector('button');button.focus();button.click();const dialog=w.document.querySelector('dialog');assert.ok(dialog.textContent.includes(inApp?'외부 브라우저':'브라우저의 공유'));dialog.dispatchEvent(new w.Event('cancel',{cancelable:true}));assert.equal(w.document.activeElement,button);}finally{w.close();}
  }
});
