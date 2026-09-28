// Browser evidence for the four basic question consultations. All APIs are fixtures.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const output = resolve('artifacts/fortune-consultation-ux/basic-entry-v1');
await mkdir(output, { recursive: true });
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  for (const candidate of [resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname)), resolve(root, 'public', '.' + pathname)]) {
    if (!candidate.startsWith(root + '/') && !candidate.startsWith(root + '\\')) continue;
    try {
      const data = await readFile(candidate);
      res.setHeader('content-type', ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'})[extname(candidate)] || 'application/octet-stream');
      res.end(data); return;
    } catch {}
  }
  res.writeHead(404).end();
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({headless:true});
const evidence = [];
const requests = [];
const errors = [];
const profile = {id:'entry-ui-fixture',name:'검증용 프로필',gender:'F',birth:{year:1990,month:5,day:15,hour:12,minute:0,calType:'solar'},location:{tz:'Asia/Seoul',tzOffset:9,baseTzOffset:9,lng:126.978,lat:37.5665,label:'대한민국 (서울)'}};
const targets = [
  {key:'ziwei',open:'openZiweiModal',close:'closeZiweiModal',card:'#zwDeepAiPromptPanel',answer:'#zwDeepAiAnswer',question:'#zwDeepAiPromptQuestion',count:'#zwDeepAiPromptCount'},
  {key:'sukuyo',open:'openSukuyoModal',close:'closeSukuyoModal',card:'#sySoloAiConsultCard',answer:'[data-sy-ai-answer]',question:'#sySoloAiQuestion',count:'[data-sy-ai-count]'},
  {key:'astrology',open:'openAstroModal',close:'closeAstroModal',card:'#astroAiPromptSection',answer:'#astroAiPromptAnswer',question:'#astroAiPromptQuestionInput',count:'#astroAiPromptQuestionCount'},
  {key:'vedic',card:'#vedicConsultation',answer:'#vedicAiAnswer',question:'#vedicAiQuestion',count:'#vedicAiCharCount'}
];
try {
  const context = await browser.newContext({viewport:{width:390,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) {
      requests.push({path:url.pathname,method:route.request().method()});
      const payload = url.pathname === '/api/billing/features'
        ? {legacyFeatureTable:targets.map(t=>({featureKey:t.key+'_ai_prompt_generator',amountKRW:5000,cost:50}))}
        : {ok:true,user:null,unlocks:[],profiles:[],data:null};
      return route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
    }
    return url.origin === origin ? route.continue() : route.abort();
  });
  await context.addInitScript(() => sessionStorage.setItem('privacyAgreed','true'));
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('dialog', dialog => dialog.dismiss());
  await page.goto(origin, {waitUntil:'domcontentloaded'});
  await page.locator('#cdQuickServices a[href*="cdOneStepFreeSajuEntry"]').click();
  await page.locator('#nameInput').fill(profile.name);
  await page.locator('#birthDate').fill('1990-05-15');
  await page.locator('#run-btn').click();
  await page.waitForFunction(() => window.G_PILLARS && window.G_NATAL, {timeout:30000});
  await page.waitForFunction(() => window.DestinyProfileManager?.storage);
  await page.evaluate(p => {window.DestinyProfileManager.storage.add(p);window.DestinyProfileManager.storage.setCurrent(p.id);},profile);
  for (const target of targets) {
    console.log('Opening '+target.key);
    if (target.key === 'vedic') {
      await page.goto(origin+'/vedic-astrology.html',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(() => typeof window.doCalculateFromProfile === 'function');
      await page.evaluate(p => window.doCalculateFromProfile(p),profile);
    } else {
      await page.evaluate(action => window[action](),target.open);
    }
    const card=page.locator(target.card);
    await card.waitFor({state:'visible',timeout:45000});
    await card.locator('[data-fc-price]').filter({hasText:'5,000원'}).waitFor();
    for (const width of [360,390,430,1440]) {
      await page.setViewportSize({width,height:900});
      await card.locator('.fc-form').evaluate(el=>{el.open=false;});
      await card.evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
      await page.waitForFunction(({selector,width})=>{
        const img=document.querySelector(selector+' img');
        return img?.complete && img.naturalWidth>0 && img.currentSrc.endsWith((width<760?'640':'1280')+'.webp');
      },{selector:target.card,width});
      assert.ok(await card.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'card overflow: '+target.key+'/'+width);
      const clipped = await card.evaluate(el=>{
        const box=el.getBoundingClientRect();
        for(let ancestor=el.parentElement;ancestor;ancestor=ancestor.parentElement){
          if(!['hidden','clip','auto','scroll'].includes(getComputedStyle(ancestor).overflowX)) continue;
          const parent=ancestor.getBoundingClientRect();
          if(box.left<parent.left-1 || box.right>parent.left+ancestor.clientWidth+1) return ancestor.id || ancestor.tagName;
        }
        return '';
      });
      assert.equal(clipped,'','ancestor clips card: '+target.key+'/'+width);
      const opener=card.locator('[data-fc-open]');
      assert.ok(await opener.evaluate(el=>el.getBoundingClientRect().height>=44));
      await card.locator('.fc-entry').screenshot({path:resolve(output,`${target.key}-entry-${width}.png`),animations:'disabled'});
      await opener.focus();
      await page.keyboard.press('Enter');
      assert.equal(await opener.getAttribute('aria-expanded'),'true');
      await card.locator(target.question).waitFor({state:'visible'});
      await card.locator('[data-fc-example]').first().click();
      const question = card.locator(target.question);
      assert.ok((await question.inputValue()).length>20);
      assert.ok((await card.locator(target.count).textContent()).includes(String((await question.inputValue()).length)), 'existing input counter: '+target.key);
      assert.equal(await question.getAttribute('maxlength'),'1000');
      assert.equal(await question.evaluate(el=>getComputedStyle(el).fontSize),'16px');
      assert.ok(await card.locator('.fc-form .fc-primary').evaluate(el=>el.getBoundingClientRect().height>=44));
      assert.equal(await card.locator('.fc-form .fc-primary').textContent(),'상담 시작하기');
      await question.evaluate(el=>{el.scrollIntoView({block:'center',behavior:'instant'});el.focus({preventScroll:true});});
      await page.waitForTimeout(350);
      assert.ok((await question.inputValue()).length>20);
      assert.equal(await card.locator('.fc-form .fc-primary').isVisible(),true);
      await page.screenshot({path:resolve(output,`${target.key}-form-${width}.png`),animations:'disabled'});
      evidence.push({service:target.key,width,overflow:false,price:'5,000원 from fixture registry',keyboardDisclosure:true,exampleInput:true});
    }
    await page.setViewportSize({width:390,height:900});
    await page.evaluate(()=>document.documentElement.style.fontSize='200%');
    assert.ok(await card.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'zoom overflow: '+target.key);
    await page.evaluate(()=>document.documentElement.style.fontSize='');
    // Existing result container only: this prose is explicitly a rendering fixture.
    await card.locator(target.answer).evaluate(el=>{
      el.style.display='block';
      el.innerHTML='<h4>지금의 선택을 읽는 한 줄</h4><p>이 문단은 화면 검증용 대역입니다. 실제 AI 상담이나 저장된 결과가 아닙니다.</p><p>이미 알고 있는 강점을 살피고, 지금의 상황에서 먼저 확인할 조건을 정리해 보세요. 짧은 문단 사이의 간격과 긴 문장의 줄바꿈을 확인합니다.</p><h4>오늘 해볼 일</h4><p>중요한 선택 하나를 적고, 필요한 정보와 확인할 사람을 나누어 정리합니다.</p>';
    });
    await card.locator(target.answer).screenshot({path:resolve(output,`${target.key}-result-390.png`),animations:'disabled'});
    await page.evaluate(()=>document.body.classList.add('neo-mode'));
    await card.locator('.fc-entry').screenshot({path:resolve(output,`${target.key}-neo-390.png`),animations:'disabled'});
    await page.evaluate(()=>document.body.classList.remove('neo-mode'));
    if(target.close) await page.evaluate(action=>window[action](),target.close);
  }
  const result={network:'Every API mocked; every external origin blocked; no payment/LLM/DB operations',resultSource:'explicit rendering fixture',evidence,requests,errors};
  assert.deepEqual(errors.filter(message=>message!=='google_translate_script_failed'), [], 'unexpected browser exception');
  await writeFile(resolve(output,'metrics.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({scenarios:evidence.length,errors,network:result.network}));
  await context.close();
} finally {await browser.close();await new Promise(done=>server.close(done));}
