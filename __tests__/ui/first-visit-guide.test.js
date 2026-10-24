const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '../..');
const stateSource = fs.readFileSync(path.join(root,'js/first-visit-state.mjs'),'utf8').replace(/export /g,'');
const guideSource = fs.readFileSync(path.join(root,'js/core/first-visit-guide.mjs'),'utf8').replace(/^import .*;\r?\n/,'');
function setup(url='https://local.test/ggulggul/', blocked=false){
 const dom=new JSDOM('<html lang="ko"><body><main id="cdHomeFunnel"><section class="cdh-free"></section></main><form id="destinyCardForm"></form><section id="resultPage" hidden><section class="saju-result-guide"></section></section><div id="cdCookieConsent"></div></body></html>',{url,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;
 w.HTMLElement.prototype.getClientRects=function(){return this.hidden?[]:[{width:100,height:40}];};
 w.HTMLElement.prototype.scrollIntoView=function(){};
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
 w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
 const timers=[];w.setTimeout=fn=>{timers.push(fn);return timers.length;};
 w.cdTrack=()=>{};
 if(blocked)Object.defineProperty(w,'localStorage',{get(){throw new Error('blocked');}});
 w.eval(stateSource);
 const close=w.close.bind(w);
 w.close=()=>{w.dispatchEvent(new w.Event('pagehide'));close();};
 return {dom,w,run(){w.eval(guideSource);},tick(){timers.splice(0).forEach(fn=>fn());},read:()=>w.eval("readFirstVisit('ggulggul')")};
}
test('home auto offer respects consent overlay and persists skip, replay is explicit',async()=>{
 const ctx=setup(),{w}=ctx;
 w.document.getElementById('cdCookieConsent').className='is-visible';
 ctx.run();ctx.tick();assert.equal(w.document.querySelector('dialog').open,false);
 w.document.getElementById('cdCookieConsent').className='';
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(w.document.querySelector('dialog').open,true);
 w.document.querySelector('[data-first-close]').click();
 assert.equal(ctx.read().status,'dismissed');
 w.document.querySelector('[data-first-replay]').click();
 assert.equal(w.document.querySelector('dialog').open,true);
 ctx.dom.window.close();
});
test('free result is the completion signal, not profile publication; no payment API is invoked',async()=>{
 const ctx=setup(),{w}=ctx;let entries=0;
 w.cdOneStepFreeSajuEntry=()=>{entries++;};
 w.fetch=()=>{throw new Error('Unexpected network call');};
 ctx.run();ctx.tick();w.document.querySelector('[data-first-start]').click();
 assert.equal(entries,1);assert.equal(ctx.read().status,'active');
 w.__cdCurrentDestinyProfile={birth:{year:1990,month:1,day:1}};
 w.document.dispatchEvent(new w.CustomEvent('cd:profile-card-published'));
 assert.equal(ctx.read().step,2);assert.equal(ctx.read().status,'active');
 w.document.getElementById('resultPage').hidden=false;
 w.dispatchEvent(new w.CustomEvent('cd:saju-summary-ready'));
 await new Promise(resolve=>setTimeout(resolve,35));
 assert.equal(ctx.read().status,'complete');
 assert.equal(w.document.querySelectorAll('.cd-first__offers li').length,1);
 assert.ok(w.document.querySelector('.cd-first__records[href="/records/"]'));
 w.dispatchEvent(new w.CustomEvent('cd:saju-summary-ready'));
 assert.equal(w.document.querySelectorAll('#cdFirstResultHelp').length,1);
 ctx.dom.window.close();
});
test('result, payment return, and deep link entry never auto open',()=>{
 for(const url of ['https://local.test/ggulggul/?paymentId=test','https://local.test/ggulggul/#resultPage','https://local.test/ggulggul/?action=cdOneStepFreeSajuEntry']){
  const ctx=setup(url);ctx.run();ctx.tick();assert.equal(ctx.w.document.querySelector('dialog').open,false);ctx.dom.window.close();
 }
});
test('optional storage failure does not prevent dismissal or active journey',()=>{
 const ctx=setup(undefined,true);ctx.run();ctx.tick();ctx.w.document.querySelector('[data-first-close]').click();
 assert.equal(ctx.read().status,'dismissed');
 ctx.w.document.querySelector('[data-first-replay]').click();ctx.w.document.querySelector('[data-first-start]').click();
 assert.equal(ctx.read().status,'active');ctx.dom.window.close();
});
test('service/account state is separate; only explicit guest login resumes',()=>{
 const {w,dom}=setup();
 w.eval("writeFirstVisit('ggulggul','complete',3);writeFirstVisit('yeongnyangi','active',1);firstVisitLogin('yeongnyangi')");
 w.localStorage.setItem('fortune_auth_user',JSON.stringify({id:'account-a'}));
 w.eval("resumeFirstVisitLogin('yeongnyangi')");
 assert.equal(w.eval("readFirstVisit('yeongnyangi').status"),'active');
 assert.equal(w.eval("readFirstVisit('ggulggul').status"),'new');
 w.localStorage.setItem('fortune_auth_user',JSON.stringify({id:'account-b'}));
 w.eval("resumeFirstVisitLogin('yeongnyangi')");
 assert.equal(w.eval("readFirstVisit('yeongnyangi').status"),'new');
 const saved=Object.keys(w.localStorage).filter(k=>k.startsWith('cd:first-visit')).map(k=>JSON.parse(w.localStorage.getItem(k)));
 for(const value of saved)assert.deepEqual(Object.keys(value).sort(),['status','step']);
 dom.window.close();
});
test('non-Korean shell does not create a Korean guide',()=>{
 const ctx=setup();ctx.w.document.documentElement.lang='ja';ctx.run();ctx.tick();
 assert.equal(ctx.w.document.querySelector('.cd-first'),null);ctx.dom.window.close();
});

test('illustrated scene browsing never starts analysis or advances actual onboarding',()=>{
 const ctx=setup(),{w}=ctx;let entries=0;
 w.cdOneStepFreeSajuEntry=()=>{entries++;};ctx.run();ctx.tick();
 w.document.querySelector('[data-first-close]').click();
 w.document.querySelector('[data-first-scene="2"]').click();
 assert.equal(w.document.querySelector('[data-first-scene="2"]').getAttribute('aria-pressed'),'true');
 w.document.querySelector('[data-first-next]').click();
 assert.equal(entries,0);assert.equal(ctx.read().status,'dismissed');
 assert.equal(w.document.querySelector('[data-first-scene="0"]').getAttribute('aria-pressed'),'true');
 ctx.dom.window.close();
});

test('cross-tab dismissal replaces cached state and account changes discard profile progress',()=>{
 const ctx=setup(),{w}=ctx;ctx.run();ctx.tick();w.document.querySelector('[data-first-start]').click();
 w.localStorage.setItem('cd:first-visit:v1:ggulggul:guest',JSON.stringify({status:'dismissed',step:0}));
 w.dispatchEvent(new w.StorageEvent('storage',{key:'cd:first-visit:v1:ggulggul:guest'}));
 assert.equal(ctx.read().status,'dismissed');
 w.__cdCurrentDestinyProfile={birth:{year:1990,month:1,day:1}};
 w.localStorage.setItem('fortune_auth_user',JSON.stringify({id:'different-account'}));
 w.dispatchEvent(new w.CustomEvent('cd:auth-changed'));
 w.document.querySelector('[data-first-replay]').click();w.document.querySelector('[data-first-start]').click();
 assert.equal(ctx.read().step,1);
 ctx.dom.window.close();
});

test('existing result access points to records and language switch hides Korean result guidance',async()=>{
 const ctx=setup(),{w}=ctx;
 w.CodeDestinyAccessStore={isUnlocked:()=>true,subscribe:()=>()=>{}};
 ctx.run();ctx.tick();w.document.querySelector('[data-first-close]').click();
 w.document.getElementById('resultPage').hidden=false;
 w.dispatchEvent(new w.CustomEvent('cd:saju-summary-ready'));
 assert.ok([...w.document.querySelectorAll('.cd-first__offers li a')].every(a=>a.getAttribute('href')==='/records/'));
 assert.ok([...w.document.querySelectorAll('.cd-first__offers li span')].every(el=>el.hidden));
 w.document.documentElement.lang='en';
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(w.document.getElementById('cdFirstResultHelp').hidden,true);
 assert.equal(w.document.querySelector('.cd-first__offers').hidden,true);
 ctx.dom.window.close();
});
