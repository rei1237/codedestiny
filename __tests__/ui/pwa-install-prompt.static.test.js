const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(require('node:path').join(__dirname,'../../js/pwa-lifecycle.js'),'utf8');
function runtime(options={}){
 const dom=new JSDOM('<button data-pwa-install>앱으로 사용하기</button><button id="read">읽기</button>',{url:'https://example.test/insights/test/',runScripts:'outside-only'});
 const w=dom.window;w.matchMedia=()=>({matches:!!options.standalone});w.fetch=()=>Promise.reject(new Error('offline fixture'));
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 if(options.native)w.__CODE_DESTINY_RUNTIME_TARGET='mobile-app';
 w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));w.__cdPwaLifecycle.policy.delay=0;
 return dom;
}
const tick=()=>new Promise(r=>setTimeout(r,15));
test('install event is consumed only by explicit click and decline sets a 30-day snooze',async()=>{
 const dom=runtime(),w=dom.window;let calls=0;const e=new w.Event('beforeinstallprompt',{cancelable:true});e.prompt=()=>{calls++;return Promise.resolve();};e.userChoice=Promise.resolve({outcome:'dismissed'});w.dispatchEvent(e);assert.equal(calls,0);assert.equal(e.defaultPrevented,true);
 w.document.getElementById('read').dispatchEvent(new w.Event('pointerdown',{bubbles:true}));await tick();assert.ok(w.document.querySelector('.cd-moon-install'));
 w.document.querySelector('.cd-moon-install button').click();await tick();assert.equal(calls,1);assert.ok(Number(w.localStorage.getItem('cd.pwa.snooze'))>Date.now()+29*86400000);assert.equal(w.document.querySelector('.cd-moon-install'),null);dom.window.close();
});
test('manual fallback describes supported browser menus without claiming installation',()=>{
 const dom=runtime(),w=dom.window;w.__cdPwaLifecycle.install();assert.match(w.document.querySelector('dialog').textContent,/공유 또는 메뉴/);assert.doesNotMatch(w.document.querySelector('dialog').textContent,/Safari에서 이 페이지/);assert.equal(w.localStorage.getItem('installed'),null);dom.window.close();
});
test('standalone and native runtime hide manual installation',()=>{
 for(const option of [{standalone:true},{native:true}]){const dom=runtime(option);assert.equal(dom.window.document.querySelector('[data-pwa-install]').hidden,true);dom.window.close();}
});
test('unsaved input makes update safety false even after blur',()=>{
 const dom=runtime(),w=dom.window;const input=w.document.createElement('input');w.document.body.appendChild(input);input.value='private';input.dispatchEvent(new w.Event('input',{bubbles:true}));input.blur();assert.equal(w.__cdPwaLifecycle.isSafe(),false);assert.equal(w.localStorage.length,0);dom.window.close();
});
