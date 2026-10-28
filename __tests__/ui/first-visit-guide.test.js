const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const root = path.resolve(__dirname, '../..');
const stateSource = fs.readFileSync(path.join(root,'js/first-visit-state.mjs'),'utf8').replace(/export /g,'');
const copySource = fs.readFileSync(path.join(root,'js/first-visit-copy.mjs'),'utf8').replace(/export /g,'');
const guideSource = copySource + '\n' + fs.readFileSync(path.join(root,'js/core/first-visit-guide.mjs'),'utf8').replace(/^import .*;\r?\n/gm,'');
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
test('home tutorial is inside the dialog and can be reopened without starting a consultation',()=>{
 const ctx=setup(),{w}=ctx;let entries=0;w.cdOneStepFreeSajuEntry=()=>{entries++;};
 ctx.run();ctx.tick();
 const dialog=w.document.querySelector('dialog');
 assert.ok(dialog.querySelector('.cd-first__story'));
 assert.ok(dialog.querySelector('.cd-first__howto'));
 assert.equal(w.document.querySelector('#cdHomeFunnel .cd-first__story'),null);
 dialog.querySelector('[data-first-close]').click();
 w.document.querySelector('[data-first-replay]').click();
 assert.equal(dialog.open,true);assert.equal(entries,0);
 ctx.dom.window.close();
});
test('one-day guide preference uses a non-identifying cookie and expires',()=>{
 const {w,dom}=setup();const now=w.Date.now();w.Date.now=()=>now;
 w.eval('hideYeongnyangiGuide()');
 assert.match(w.document.cookie,/cd_yeongnyangi_guide_hidden=1/);
 assert.equal(w.eval('readYeongnyangiGuideHidden()'),true);
 assert.equal(Number(w.localStorage.getItem('cd:yeongnyangi:guide-hidden-until')),now+86400000);
 w.document.cookie='cd_yeongnyangi_guide_hidden=; Max-Age=0; Path=/';
 w.Date.now=()=>now+86400001;
 assert.equal(w.eval('readYeongnyangiGuideHidden()'),false);
 dom.window.close();
});
test('one-day guide preference works when cookies are unavailable',()=>{
 const {w,dom}=setup();
 Object.defineProperty(w.document,'cookie',{get(){return '';},set(){throw new Error('blocked');}});
 w.eval('hideYeongnyangiGuide()');
 assert.equal(w.eval('readYeongnyangiGuideHidden()'),true);
 w.eval('clearYeongnyangiGuideHidden()');
 assert.equal(w.eval('readYeongnyangiGuideHidden()'),false);
 dom.window.close();
});
test('one-day guide preference still uses cookies when local storage is unavailable',()=>{
 const {w,dom}=setup(undefined,true);
 w.eval('hideYeongnyangiGuide()');
 assert.match(w.document.cookie,/cd_yeongnyangi_guide_hidden=1/);
 assert.equal(w.eval('readYeongnyangiGuideHidden()'),true);
 dom.window.close();
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
test('English and Japanese first entry use translated guide text and accessible names',()=>{
 for(const locale of ['en','en-GB','ja','ja-JP']) {
  const ctx=setup();ctx.w.document.documentElement.lang=locale;ctx.run();ctx.tick();
  const guide=ctx.w.document.querySelector('.cd-first');
  assert.equal(guide.hidden,false);
  assert.doesNotMatch(guide.textContent,/[가-힣]/);
  assert.doesNotMatch(ctx.w.document.querySelector('dialog').textContent,/[가-힣]/);
  assert.doesNotMatch(guide.getAttribute('aria-label'),/[가-힣]/);
  assert.ok(ctx.w.document.querySelector('[data-first-start]').textContent.includes(locale.startsWith('ja')?'無料':'free'));
  ctx.dom.window.close();
 }
});

test('illustrated scene browsing never starts analysis or advances actual onboarding',()=>{
 const ctx=setup(),{w}=ctx;let entries=0;
 w.cdOneStepFreeSajuEntry=()=>{entries++;};ctx.run();ctx.tick();
 w.document.querySelector('[data-first-scene="2"]').click();
 assert.equal(w.document.querySelector('[data-first-scene="2"]').getAttribute('aria-pressed'),'true');
 w.document.querySelector('[data-first-next]').click();
 w.document.querySelector('[data-first-close]').click();
 assert.equal(entries,0);assert.equal(ctx.read().status,'dismissed');
 assert.equal(w.document.querySelector('#cdHomeFunnel .cd-first').hasAttribute('data-pwa-block'),false);
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

test('language switch translates result guidance while preserving existing result access',async()=>{
 const ctx=setup(),{w}=ctx;
 w.CodeDestinyAccessStore={isUnlocked:()=>true,subscribe:()=>()=>{}};
 ctx.run();ctx.tick();w.document.querySelector('[data-first-close]').click();
 w.document.getElementById('resultPage').hidden=false;
 w.dispatchEvent(new w.CustomEvent('cd:saju-summary-ready'));
 assert.ok([...w.document.querySelectorAll('.cd-first__offers li a')].every(a=>a.getAttribute('href')==='/records/'));
 assert.ok([...w.document.querySelectorAll('.cd-first__offers li span')].every(el=>el.hidden));
 w.document.documentElement.lang='en';
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(w.document.getElementById('cdFirstResultHelp').hidden,false);
 assert.equal(w.document.querySelector('.cd-first__offers').hidden,false);
 assert.doesNotMatch(w.document.getElementById('cdFirstResultHelp').textContent,/[가-힣]/);
 assert.doesNotMatch(w.document.querySelector('.cd-first__offers').textContent,/[가-힣]/);
 assert.ok([...w.document.querySelectorAll('.cd-first__offers li a')].every(a=>a.getAttribute('href')==='/records/'));
 assert.equal(ctx.read().status,'dismissed');
 ctx.dom.window.close();
});

test('switching supported languages keeps the active profile step without restarting analysis',async()=>{
 const ctx=setup(),{w}=ctx;let entries=0;w.cdOneStepFreeSajuEntry=()=>{entries++;};
 ctx.run();ctx.tick();w.document.querySelector('[data-first-start]').click();
 for(const locale of ['en','ja','ko']) {
  w.document.documentElement.lang=locale;
  w.dispatchEvent(new w.Event('cd:locale-ready'));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(ctx.read().status,'active');assert.equal(ctx.read().step,1);assert.equal(entries,1);
  assert.equal(w.document.querySelectorAll('.cd-first__story').length,1);
  if(locale!=='ko')assert.doesNotMatch(w.document.querySelector('.cd-first__story').textContent,/[가-힣]/);
 }
 ctx.dom.window.close();
});

test('an unsupported entry stays hidden and can later switch to a translated guide',async()=>{
 const ctx=setup(),{w}=ctx;w.document.documentElement.lang='fr';ctx.run();ctx.tick();
 assert.equal(w.document.querySelector('.cd-first').hidden,true);
 assert.equal(w.document.querySelector('dialog').open,false);
 w.document.documentElement.lang='ja';await new Promise(resolve=>setImmediate(resolve));
 assert.equal(w.document.querySelector('.cd-first').hidden,false);
 assert.doesNotMatch(w.document.querySelector('.cd-first').textContent,/[가-힣]/);
 ctx.dom.window.close();
});
