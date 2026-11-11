import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {ENTRY_SKIP_KEY, isServiceEntryLocation, startServiceEntry} from '../../lib/ui/service-entry-lifecycle.mjs';
const source=readFileSync(new URL('../../index.html',import.meta.url),'utf8');
function windowFor(url='https://example.test/yeongnyangi/'){
 const dom=new JSDOM('<h1>Home</h1>',{url,pretendToBeVisual:true});
 const win=dom.window;Object.defineProperty(win.document,'readyState',{value:'interactive',configurable:true});
 const motion=new win.EventTarget();motion.matches=false;win.matchMedia=()=>motion;
 win.performance.getEntriesByType=()=>[{type:'navigate'}];
 let cap;win.setTimeout=(fn)=>{cap=fn;return 1};win.clearTimeout=()=>{};
 win.requestAnimationFrame=(fn)=>{fn();return 1};win.cancelAnimationFrame=()=>{};
 return {win,motion,cap:()=>cap?.(),close:()=>dom.window.close()};
}
test('only top-level entries accept presentation; payment, action, hash and record routes bypass',()=>{
 for(const url of ['/yeongnyangi/','/yeongnyangi/?lang=ko&utm_source=home'])assert.equal(isServiceEntryLocation(new URL(url,'https://example.test'),'yeongnyangi'),true);
 for(const url of ['/yeongnyangi/library/','/yeongnyangi/result/1','/yeongnyangi/?action=resume','/yeongnyangi/?paymentId=1','/yeongnyangi/#result'])assert.equal(isServiceEntryLocation(new URL(url,'https://example.test'),'yeongnyangi'),false);
});
test('actual load releases once without changing URL/history; repeated dismiss is safe',()=>{
 const t=windowFor();let shown=0,closed=0;const stop=startServiceEntry(t.win,'yeongnyangi',()=>shown++,()=>closed++);
 assert.equal(shown,1);assert.equal(closed,0);t.win.dispatchEvent(new t.win.Event('load'));stop();t.cap();assert.equal(closed,1);assert.equal(t.win.location.href,'https://example.test/yeongnyangi/');t.close();
});
test('skip, motion reduction, completed page, session repeat and history restoration never replay',()=>{
 for(const scenario of ['skip','motion','complete','shown','history']){
  const t=windowFor();let shown=0;
  if(scenario==='skip')t.win.localStorage.setItem(ENTRY_SKIP_KEY,'1');
  if(scenario==='motion')t.motion.matches=true;
  if(scenario==='complete')Object.defineProperty(t.win.document,'readyState',{value:'complete'});
  if(scenario==='shown')t.win.sessionStorage.setItem('cd:service-entry:shown:yeongnyangi','1');
  if(scenario==='history')t.win.performance.getEntriesByType=()=>[{type:'back_forward'}];
  startServiceEntry(t.win,'yeongnyangi',()=>shown++,()=>{});assert.equal(shown,0,scenario);t.close();
 }
});
test('timeout, new navigation, BFCache and changed reduced-motion cannot leave a cover',()=>{
 for(const scenario of ['timeout','pagehide','popstate','pageshow','motion']){
 const t=windowFor();let closed=0;startServiceEntry(t.win,'yeongnyangi',()=>{},()=>closed++);
 if(scenario==='timeout')t.cap();else if(scenario==='motion'){const event=new t.win.Event('change');event.matches=true;t.motion.dispatchEvent(event);}else{const event=new t.win.Event(scenario);event.persisted=true;t.win.dispatchEvent(event);}
 assert.equal(closed,1,scenario);t.close();}
});
test('storage denial still displays and closes safely',()=>{
 const t=windowFor();Object.defineProperty(t.win,'localStorage',{get(){throw Error('denied')}});Object.defineProperty(t.win,'sessionStorage',{get(){throw Error('denied')}});
 let shown=0,closed=0;const stop=startServiceEntry(t.win,'yeongnyangi',()=>shown++,()=>closed++);stop();assert.equal(shown,1);assert.equal(closed,1);t.close();
});
test('shell controls work even before boot release script loads and persist explicit skip',()=>{
 const script=source.match(/<script data-marker="cd-entry-controls-v20261111">([\s\S]*?)<\/script>/)[1];
 const t=windowFor('https://example.test/ggulggul/');t.win.document.documentElement.classList.add('cd-boot-gate');
 t.win.document.body.innerHTML='<section class="cd-boot-gate__veil"><button data-entry-enter>Enter</button><input type="checkbox" data-entry-skip></section>';
 t.win.Function('document','window','localStorage',script)(t.win.document,t.win,t.win.localStorage);
 const input=t.win.document.querySelector('input');input.checked=true;input.dispatchEvent(new t.win.Event('change'));
 assert.equal(t.win.localStorage.getItem(ENTRY_SKIP_KEY),'1');assert.equal(t.win.document.documentElement.classList.contains('cd-boot-gate'),false);t.close();
});
test('original readiness and deep-link signals survive; no paid or result routing added',()=>{
 assert.match(source,/var signals = \{ dom: false, auth: false, profile: false \}/);
 assert.match(source,/cd-deeplink-boot/);assert.match(source,/window\.__cdDismissBootGate = release/);assert.match(source,/duo-stars-entry-480\.webp/);
 const component=readFileSync(new URL('../../app/yeongnyangi/_components/ServiceEntryScene.tsx',import.meta.url),'utf8');assert.match(component,/cat-reading-entry-480\.webp/);assert.doesNotMatch(component,/router\.push|location\.assign|pushState|fetch\(/);
});
