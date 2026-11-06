import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { chromium } from 'playwright';
import { requestBody, samplePairs, llmResponse } from '../__tests__/fixtures/saju-compat-llm-fixture.mjs';
import { assembleSajuCompatSnapshot, normalizeSajuCompatInput, sajuCompatTasks, buildSajuCompatPart, shapeSajuCompatGroup } from '../worker/lib/saju-compat-schema.js';

const fixture = samplePairs(19,80).find(([a,b]) => requestBody(a,b).facts.pastLife.cross.filter(row => row.gan === 'he' || row.ji === 'he').length === 1);
const input = normalizeSajuCompatInput(requestBody(...fixture));
const tasks = sajuCompatTasks(input);
const parts = Object.fromEntries(tasks.map(task => [task.id,buildSajuCompatPart(task.id,shapeSajuCompatGroup(task.id,llmResponse(task.id,input),input))]));
const snapshot = assembleSajuCompatSnapshot({input,tasks,parts});
snapshot.narrative.overview = '두 사람은 약속을 정하는 방식이 달라요. 서로의 속도를 알아보세요.';
snapshot.narrative.prescription.conflictRoutine = '“저녁 여덟 시에 다시 이야기할까요?” 시간을 정해 보세요.';
snapshot.narrative.loveMarriage.emotion = '약속을 먼저 잡는 사람이 있는가 하면, 일정을 확인한 뒤에야 답할 수 있는 사람도 있어요. 바쁜 날에는 여유가 생길 시간을 짧게 알려 주세요.';
for (const reason of input.facts.reasons) {
  snapshot.narrative.reasonDetails[reason.code] = reason.polarity === '+' ? '서로 다른 제안을 듣고 약속을 구체적으로 정할 때 편안해질 수 있어요.' : '답을 기다리는 시간이 길어지면 먼저 연락한 쪽은 약속이 미뤄졌다고 느낄 수 있어요.';
}
const saved = {...snapshot,promptVersion:'saju-compat-basic-p2'};
const origin='http://127.0.0.1:37965';
const root=resolve('public');
const browser=await chromium.launch();
try {
  const page=await browser.newPage({locale:'ko-KR',viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
  const archiveCalls=[];
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin!==origin)return route.abort();
    if(url.pathname.startsWith('/api/saju-compat-basic/archive')){
      archiveCalls.push(route.request().method()+' '+url.pathname);
      const list=url.pathname.endsWith('/archive');
      return route.fulfill({json:list?{ok:true,items:[{resultId:'saved_pair_1',partnerName:'하늘',compatType:'love'}]}:{ok:true,result:saved}});
    }
    if(url.pathname.startsWith('/api/'))return route.fulfill({json:{}});
    const file=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/ggulggul/index.html':url.pathname));
    if(!file.startsWith(root+sep)||!existsSync(file)||url.pathname.endsWith('/')&&url.pathname!=='/')return route.abort();
    return route.fulfill({path:file});
  });
  await page.goto(origin,{waitUntil:'domcontentloaded',timeout:120000});
  // Isolate the feature on the actual shell after boot, retaining its form nodes and listeners.
  await page.evaluate(async(origin)=>{
    const card=document.getElementById('compatCard');
    const main=document.createElement('main');
    main.id='resultPage';
    main.style.cssText='display:block;max-width:800px;padding:12px;box-sizing:border-box;margin:auto';
    main.append(card);
    document.body.replaceChildren(main);
    card.style.display='block';
    window.CODE_DESTINY_API_BASE_URL=origin;
    for(const path of ['/styles/theme-tokens.css','/styles/fortune-ui.css']){
      const link=document.createElement('link');link.rel='stylesheet';link.href=path;document.head.append(link);
      await new Promise((ok,fail)=>{link.onload=ok;link.onerror=fail});
    }
  },origin);
  const captureDir = process.env.COMPAT_SCREENSHOT_DIR;
  if (captureDir) {
    await page.locator('.compat-entry-cover').scrollIntoViewIfNeeded();
    await page.screenshot({path:resolve(captureDir,'compat-entry-390.png')});
  }
  await page.locator('#compatType').selectOption('business');
  await page.getByText('역할을 나누고 중요한 결정을 함께 내리는 방식을 읽어요.').waitFor();
  await page.locator('#compatType').selectOption('friend');
  await page.getByText('연락 간격과 서로 편하게 지낼 수 있는 거리를 살펴봐요.').waitFor();
  await page.locator('#compatType').selectOption('love');
  await page.locator('#compatCard .compat-entry-cover img').evaluate(img=>img.decode());
  assert.equal(await page.locator('#compatCard details[open]').count(),0);
  await page.evaluate(async(snap)=>{
    const kit=await window.__cdEnsureSajuCompatModules();
    document.getElementById('compatResult').innerHTML=kit.render.renderSajuCompat(snap);
  },snapshot);
  for(const width of [360,390,430,1280]){
    await page.setViewportSize({width,height:844});
    const result=page.locator('#compatResult');
    const advice=result.getByText('“저녁 여덟 시에 다시 이야기할까요?”');
    const y=(await advice.boundingBox()).y-(await result.boundingBox()).y;
    assert.ok(y>=0 && y<844);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if (captureDir && width === 390) {
      await result.evaluate(el => el.scrollIntoView({block:'start'}));
      await page.screenshot({path:resolve(captureDir,'compat-result-390.png')});
    }
    for(const chapter of ['love','past']){
      await result.locator('button[aria-controls="compat-reading-'+chapter+'"]').click();
      assert.equal(await page.evaluate(()=>document.activeElement.id),'compat-reading-'+chapter);
    }
    console.log(width+'px: 대화 제안 +'+Math.round(y)+'px, 연애·전생 목차 이동 통과');
  }
  const disclosure=page.locator('.compat-reading-evidence summary').first();
  await disclosure.focus();await page.keyboard.press('Enter');
  assert.equal(await page.locator('.compat-reading-evidence').getAttribute('open'),'');
  const plate=page.locator('#compat-reading-past img');
  await plate.evaluate(img=>img.decode());
  await plate.evaluate(img=>{img.src='/missing-compat-plate.webp'});
  await page.waitForFunction(()=>{const img=document.querySelector('#compat-reading-past img');return img.complete&&!img.naturalWidth});
  assert.ok(await page.locator('#compat-reading-past .pastlife-story-text').isVisible());
  await page.addScriptTag({url:origin+'/js/saju-compat-archive.js'});
  await page.evaluate(()=>window.openSajuCompatArchive());
  await page.locator('[data-cd-compat-open="saved_pair_1"]').click();
  const archive=page.locator('#cdSajuCompatArchive');
  await archive.locator('button[aria-controls="compat-archive-past"]').click();
  assert.equal(await page.evaluate(()=>document.activeElement.id),'compat-archive-past');
  assert.equal(await archive.locator('img[src$="past-ferry.webp"]').count(),0);
  assert.deepEqual(archiveCalls,['GET /api/saju-compat-basic/archive','GET /api/saju-compat-basic/archive/saved_pair_1']);
  console.log('보관함 구버전 열람·이미지 실패·키보드 펼침 통과');
} finally {await browser.close();}
