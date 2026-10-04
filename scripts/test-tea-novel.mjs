import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const origin=process.env.TEA_NOVEL_ORIGIN || 'http://127.0.0.1:26524';
if (!['127.0.0.1','localhost'].includes(new URL(origin).hostname)) throw new Error('Local mock verification only');
const out=process.env.TEA_NOVEL_OUTPUT || '.tmp/novel-visual';
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch();
const errors=[];
const calls=[]; let probePage;
try {
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'});
 await context.route('**/*',route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.pathname.startsWith('/api/')) { calls.push(req.method()+' '+url.pathname); return route.fulfill({status:200,json:{ok:false,authenticated:false,user:null,items:[],data:[]}}); }
  if(url.origin===origin || (req.method()==='GET' && ['image','font'].includes(req.resourceType()) && url.hostname==='assets.code-destiny.com'))return route.continue();
  return route.abort();
 });
 await context.addInitScript(()=>localStorage.setItem('code-destiny-fortune-tea-house-bgm:v1','off'));
 const page=await context.newPage(); probePage=page; page.setDefaultTimeout(20000);
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin+'/fortune-tea-house/',{waitUntil:'networkidle',timeout:120000});
 await page.getByRole('button',{name:'연이의 이야기 읽기',exact:true}).waitFor({timeout:60000});
 for(const width of [360,390,430,1280]){
  await page.setViewportSize({width,height:844});
  await page.waitForTimeout(500); await page.screenshot({path:out+'/landing-'+width+'.png',fullPage:false});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'landing overflow '+width);
 }
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'연이의 이야기 읽기',exact:true}).click();
 await page.locator('[data-entry-stage="doorOpened"]').waitFor();
 await page.getByRole('button',{name:'다음 대사',exact:true}).click();
 await page.getByRole('button',{name:'다음 대사',exact:true}).click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('fortuneTeaHouse.novelBookmark.v1')));
 assert.equal(saved.line,2);
 await page.getByRole('button',{name:'돌아가기',exact:true}).click();
 await page.getByRole('button',{name:'이야기 이어 읽기',exact:true}).click();
 await page.locator('[data-entry-stage="doorOpened"]').waitFor();
 await page.waitForTimeout(150);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('fortuneTeaHouse.novelBookmark.v1')).line),2);
 await page.getByRole('button',{name:'대화 기록',exact:true}).click();
 assert.equal(await page.locator('dialog[open]').count(),1);
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('dialog[open]').count(),0);
 for(let i=0;i<4;i++) await page.getByRole('button',{name:'다음 대사',exact:true}).click();
 await page.locator('[data-entry-stage="pigGreeting"]').waitFor();
 await page.getByRole('button',{name:'이전 대사',exact:true}).click();
 await page.locator('[data-entry-stage="doorOpened"]').waitFor();
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('fortuneTeaHouse.novelBookmark.v1')).line),5);
 await page.getByRole('button',{name:'다음 대사',exact:true}).click();
 await page.waitForTimeout(500); await page.screenshot({path:out+'/pig-greeting-390.png',fullPage:true});
 for(let i=0;i<11;i++) await page.getByRole('button',{name:'다음 대사',exact:true}).click();
 await page.getByRole('button',{name:'조금 지쳤어요',exact:true}).click();
 await page.getByRole('button',{name:'다음 대사',exact:true}).click();
 await page.locator('[data-entry-stage="transformPreview"]').waitFor();
 for(let i=0;i<6;i++) await page.getByRole('button',{name:'다음 대사',exact:true}).click();
 await page.locator('[data-entry-stage="yeoniReveal"]').waitFor();
 await page.getByRole('button',{name:'대화 기록',exact:true}).click();
 await page.getByRole('dialog').getByText('조금 지쳤어요',{exact:true}).waitFor();
 await page.keyboard.press('Escape');
 for(const width of [360,390,430,1280]){
  await page.setViewportSize({width,height:844});
  await page.waitForTimeout(500); await page.screenshot({path:out+'/story-'+width+'.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'story overflow '+width);
 }
 await page.getByRole('button',{name:'예화 감상',exact:true}).click();
 await page.getByRole('button',{name:'이야기로 돌아가기',exact:true}).click();
 // Complete all 36 cuts through the existing cup flow.
 for(let i=0;i<6;i++) await page.getByRole('button',{name:'다음 대사',exact:true}).click();
 await page.locator('[data-entry-stage="teaIntro"]').waitFor();
 for(let i=0;i<5;i++) await page.getByRole('button',{name:'다음 대사',exact:true}).click();
 await page.getByRole('button',{name:'찻잔 고르기',exact:true}).last().click();
 await page.locator('[data-cup-id="lotus-moon"]').waitFor();
 for(const width of [360,390,430,1280]){
  await page.setViewportSize({width,height:844});
  await page.waitForTimeout(500); for (const cup of await page.locator('[data-cup-id]').all()) { await cup.scrollIntoViewIfNeeded(); await cup.locator('[data-loaded="true"]').waitFor(); }
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:out+'/cups-'+width+'.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'cups overflow '+width);
 }
 assert.equal(await page.locator('[data-cup-id]').count(),6);
 await page.locator('[data-cup-id="honey-peach"]').click();
 await page.getByRole('button',{name:'이 차로 이야기하기',exact:true}).click();
 await page.getByRole('button',{name:'다른 찻잔 보기',exact:true}).click();
 assert.equal(await page.locator('[data-cup-id="honey-peach"]').getAttribute('aria-pressed'),'true');
 await page.getByRole('button',{name:'이 차로 이야기하기',exact:true}).click();
 await page.getByRole('button',{name:'이 찻잔으로 이야기하기',exact:true}).waitFor();
 await page.waitForTimeout(700); await page.screenshot({path:out+'/ritual-1280.png',fullPage:true});
 await page.getByRole('button',{name:'이 찻잔으로 이야기하기',exact:true}).click();
 await page.locator('#fortuneTeaQuestion').fill('우리 관계의 속도를 어떻게 맞추면 좋을까요?');
 for(const width of [360,390,430,1280]){
  await page.setViewportSize({width,height:844});
  await page.waitForTimeout(500); await page.screenshot({path:out+'/question-'+width+'.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'question overflow '+width);
 }
 const modes=page.locator('[class*=consultModeGrid] [role=radio]');
 assert.equal(await modes.count(),4);
 for(let i=0;i<4;i++){
  await modes.nth(i).click();
  assert.equal(await modes.nth(i).getAttribute('aria-checked'),'true');
 }
 await modes.first().click();
 await page.setViewportSize({width:1280,height:844});
 await page.locator('#fortuneTeaQuestion').scrollIntoViewIfNeeded();
 const inputBox=await page.locator('#fortuneTeaQuestion').boundingBox();
 const actionBox=await page.getByRole('button',{name:'상담 내용과 가격 확인',exact:true}).boundingBox();
 assert.ok(actionBox.y>=inputBox.y+inputBox.height,'actions do not overlap question input');
 await page.locator('[class*=consultModeGrid]').screenshot({path:out+'/consult-methods.png'});
 await page.getByRole('button',{name:'상담 내용과 가격 확인',exact:true}).scrollIntoViewIfNeeded();
 await page.screenshot({path:out+'/buttons-1280.png'});
 await page.getByRole('button',{name:'돌아가기',exact:true}).click();
 await page.getByRole('button',{name:'연이의 이야기 읽기',exact:true}).click();
 await page.locator('[data-entry-stage="doorOpened"]').waitFor();
 await page.getByRole('button',{name:'찻잔 고르기',exact:true}).click();
 await page.locator('[data-cup-id="lotus-moon"]').waitFor();
 assert.ok(calls.every(x=>!x.includes('/consult')&&!x.includes('/ensure-access')),'No paid generation requested');
 assert.deepEqual(errors,[]);
 fs.writeFileSync(out+'/result.json',JSON.stringify({pass:true,widths:[360,390,430,1280],checks:['resume','previous across chapter','choices','dialog keyboard dismissal','art mode','six cups','cup confirmation and back','question input','no horizontal overflow','no live API calls'],errors,calls},null,2));
 console.log('PASS novel flow and 4 viewport screenshots; all API mocked',out);
}catch(e){ console.log("FAIL BODY",await probePage?.locator("body").innerText());console.log("ERRORS",errors);throw e;}finally{await browser.close();}
