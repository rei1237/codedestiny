import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
let build=1;
const server=createServer((req,res)=>{
 const path=new URL(req.url,'http://local').pathname;
 if(path==='/service-worker.js'){res.setHeader('content-type','application/javascript');res.setHeader('cache-control','no-store');res.end(readFileSync('service-worker.js','utf8').replace("'moon-library-1'",`'moon-library-${build}'`));return;}
 if(path==='/version.json'){res.setHeader('content-type','application/json');res.end(JSON.stringify({commit:'a'.repeat(40),appRelease:{id:`moon-library-${build}`,notes:['검증용 실제 변경']}}));return;}
 if(path==='/js/pwa-lifecycle.js'){res.setHeader('content-type','application/javascript');res.end(readFileSync('js/pwa-lifecycle.js'));return;}
 if(path==='/styles/pwa-lifecycle.css'){res.setHeader('content-type','text/css');res.end(readFileSync('styles/pwa-lifecycle.css'));return;}
 if(path.endsWith('.webp')){res.setHeader('content-type','image/webp');res.end(readFileSync('public/assets/yeongnyangi/original/hero-800.webp'));return;}
 res.setHeader('content-type','text/html; charset=utf-8');res.end('<!doctype html><html lang="ko"><head><script defer src="/js/pwa-lifecycle.js"></script></head><body><h1>공개 글</h1><button id="read">계속 읽기</button><input aria-label="미저장 입력"><div style="height:2000px">본문</div></body></html>');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();
 await page.goto(origin+'/insights/test/');await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.waitForFunction(()=>navigator.serviceWorker.controller);
 // A browser event is mocked; the real OS installation UI is intentionally not claimed tested.
 await page.evaluate(()=>{window.__cdPwaLifecycle.policy.delay=0;window.calls=0;const event=new Event('beforeinstallprompt',{cancelable:true});event.prompt=()=>{window.calls++;return Promise.resolve();};event.userChoice=Promise.resolve({outcome:'dismissed'});window.dispatchEvent(event);});
 await page.locator('#read').click();await page.locator('.cd-moon-install').waitFor();
 await page.locator('.cd-moon-install button').first().click();await page.waitForFunction(()=>Number(localStorage.getItem('cd.pwa.snooze'))>Date.now()+29*86400000);
 assert.equal(await page.evaluate(()=>window.calls),1);
 await page.reload();await page.locator('#read').click();assert.equal(await page.locator('.cd-moon-install').count(),0);
 const busy=await context.newPage();await busy.goto(origin+'/insights/test/');await busy.getByLabel('미저장 입력').fill('보존할 내용');
 build=2;await page.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
 await page.waitForFunction(async()=>Boolean((await navigator.serviceWorker.getRegistration()).waiting));
 await page.getByRole('dialog').waitFor();
 // Verification must not mutate tracked screenshots on different OS/font stacks.
 if(process.argv.includes('--capture'))await page.screenshot({path:'docs/design/moon-library/update-fixture-390.png'});
 await page.getByRole('button',{name:'새 버전으로 만나기'}).click();await page.getByRole('status').filter({hasText:'화면을 유지'}).waitFor();
 assert.equal(await busy.getByLabel('미저장 입력').inputValue(),'보존할 내용');
 assert.equal(await page.evaluate(async()=>Boolean((await navigator.serviceWorker.getRegistration()).waiting)),true);
 await busy.close();
 let loads=0;page.on('load',()=>loads++);
 await page.getByRole('button',{name:'새 버전으로 만나기'}).click();await page.waitForEvent('load');
 assert.equal(loads,1);await page.waitForFunction(()=>navigator.serviceWorker.controller);
 assert.equal(await page.locator('dialog[open]').count(),0);
 await context.close();
 console.log('PASS: prompt click-only/once, decline cooldown, initial SW without update, waiting update, busy tab veto, input preserved, one consenting-tab reload');
}finally{await browser.close();await new Promise(r=>server.close(r));}
