import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {consultationStories,storyBenefits,storyPreviewHeights} from '../../lib/brand/consultation-stories.mjs';
import {RECORD_SERVICES} from '../../lib/records/service-registry.js';

test('all 13 stories retain an existing service, art, three benefits and a dedicated entry cover',()=>{
  const dom=new JSDOM(readFileSync('index.html','utf8'));
  assert.equal(Object.keys(consultationStories).length,13);
  for(const id of Object.keys(consultationStories)){
    const service=RECORD_SERVICES.find(s=>s.id===id);
    assert.ok(service?.href && service.featureKey,id);
    assert.equal(storyBenefits[id].length,3,id);
    assert.ok(storyPreviewHeights[id]>250 && storyPreviewHeights[id]<500,id);
    assert.ok(existsSync('public/images/consultation-webtoons/'+id+'.webp'),id);
    assert.ok(existsSync('public/images/consultation-webtoons/covers/'+id+'.webp'),id+' entry cover');
    assert.equal(dom.window.document.querySelector('a[href="/consultations/'+id+'/"]'),null,id+' moved to entry');
  }
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
