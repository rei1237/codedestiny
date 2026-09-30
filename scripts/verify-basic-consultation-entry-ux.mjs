// Browser evidence for the four basic question consultations. All APIs are fixtures.
import { chromium, webkit, devices } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const iphone = process.argv.includes('--iphone');
const chrome = process.argv.includes('--chrome');
const capture = !process.argv.includes('--metrics-only');
assert.ok(!(iphone && chrome), 'Choose --chrome or --iphone, not both');
const output = resolve(process.env.CD_CONSULTATION_EVIDENCE_DIR || (iphone
  ? 'artifacts/fortune-consultation-ux/basic-entry-iphone-v1'
  : 'artifacts/fortune-consultation-ux/basic-entry-v1'));
await mkdir(output, { recursive: true });
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  for (const candidate of [resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname)), resolve(root, 'public', '.' + pathname)]) {
    if (!candidate.startsWith(root + '/') && !candidate.startsWith(root + '\\')) continue;
    try {
      const data = await readFile(candidate);
      res.setHeader('content-type', ({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'})[extname(candidate)] || 'application/octet-stream');
      res.end(data); return;
    } catch {}
  }
  res.writeHead(404).end();
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await (iphone ? webkit : chromium).launch({headless:true,...(chrome ? {channel:'chrome'} : {})});
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
  const context = await browser.newContext({... (iphone ? devices['iPhone 13'] : {}), viewport:{width:390,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) {
      requests.push({path:url.pathname,method:route.request().method()});
      // Result entry requires a verified session; this response is a local fixture only.
      if (url.pathname === '/api/auth/me') return route.fulfill({json:{ok:true,user:{id:'ux-fixture-owner'},authenticated:true}});
      const payload = url.pathname === '/api/billing/features'
        ? {legacyFeatureTable:targets.map(t=>({featureKey:t.key+'_ai_prompt_generator',amountKRW:5000,cost:50}))}
        : {ok:true,user:null,unlocks:[],profiles:[],data:null};
      return route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
    }
    return url.origin === origin ? route.continue() : route.abort();
  });
  await context.addInitScript(() => sessionStorage.setItem('privacyAgreed','true'));
  const page = await context.newPage();
  page.on('pageerror', error => { errors.push(error.message.replace(/^Error: (?=google_translate_script_failed$)/,'')); console.error('Browser error: '+error.message); });
  if (iphone) page.on('console', message => { if (message.type()==='error') console.error('WebKit console: '+message.text()); });
  page.on('dialog', dialog => { console.log('Dismissed fixture dialog: '+dialog.message()); return dialog.dismiss(); });
  await page.goto(origin, {waitUntil:'domcontentloaded'});
  const entryLink=page.locator('#cdQuickServices a[href*="cdOneStepFreeSajuEntry"]');
  if (iphone) await entryLink.tap(); else await entryLink.click();
  await page.locator('#nameInput').fill(profile.name);
  await page.locator('#birthDate').fill('1990-05-15');
  await page.waitForFunction(() => window.__codeDestinyGlobalActionsBound);
  if (iphone) await page.locator('#run-btn').tap(); else await page.locator('#run-btn').click();
  await page.waitForFunction(() => window.G_PILLARS && window.G_NATAL, null, {timeout:30000}).catch(async error => {
    await page.screenshot({path:resolve(output,'initialization-failure.png')});
    console.error(await page.evaluate(() => ({birthDate:document.querySelector('#birthDate')?.value, status:document.querySelector('#sajuFormStatus')?.textContent, coreReady:window.__cdSajuCoreReady, readyState:document.readyState})));
    throw error;
  });
  await page.waitForFunction(() => document.querySelector('#resultPage')?.style.display !== 'none' && !document.querySelector('.saju-calc-loading-overlay--visible'));
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
    await card.waitFor({state:'visible',timeout:45000}).catch(async error => {
      await page.screenshot({path:resolve(output,target.key+'-visibility-failure.png')});
      console.error(await card.evaluate(el=>{const ancestors=[];for(let a=el;a;a=a.parentElement){const s=getComputedStyle(a);const b=a.getBoundingClientRect();ancestors.push({id:a.id,display:s.display,visibility:s.visibility,width:b.width,height:b.height});}return ancestors;}));
      throw error;
    });
    if (target.key !== 'vedic') assert.equal(await card.evaluate(el=>el.closest('[id$="ModalOverlay"]')?.parentElement===document.body),true,'modal must escape hidden intake: '+target.key);
    await card.locator('[data-fc-price]').filter({hasText:'5,000원'}).waitFor();
    for (const width of (iphone ? [320,375,390,430,844] : [360,390,430,1440])) {
      await page.setViewportSize({width,height:iphone && width===844 ? 390 : 900});
      await card.locator('.fc-form').evaluate(el=>{el.open=false;});
      await card.evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
      await card.locator('img').scrollIntoViewIfNeeded();
      await page.waitForFunction(({selector,width})=>{
        const img=document.querySelector(selector+' img');
        return img?.complete && img.naturalWidth>0 && img.currentSrc.includes('/images/feature-details/') && img.getBoundingClientRect().height>100 && getComputedStyle(img).visibility==='visible' && getComputedStyle(img).opacity==='1';
      },{selector:target.card,width}).catch(async error=>{
        console.error(await card.locator('img').evaluate(img=>({src:img.currentSrc,complete:img.complete,naturalWidth:img.naturalWidth,innerWidth:window.innerWidth,viewport:window.visualViewport?.width})));
        throw error;
      });
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
      if (capture && (!iphone || width===390)) await card.locator('.fc-entry').screenshot({path:resolve(output,`${target.key}-entry-${width}.png`),animations:'disabled',scale:'css'});
      if (iphone) await opener.tap();
      else { await opener.focus(); await page.keyboard.press('Enter'); }
      assert.equal(await opener.getAttribute('aria-expanded'),'true');
      await card.locator(target.question).waitFor({state:'visible'});
      if (iphone) await card.locator('[data-fc-example]').first().tap();
      else await card.locator('[data-fc-example]').first().click();
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
      if (capture && (!iphone || width===390)) await page.screenshot({path:resolve(output,`${target.key}-form-${width}.png`),animations:'disabled',scale:'css'});
      if (iphone) {
        // A reduced viewport is a layout check, not a native iOS keyboard measurement.
        await page.setViewportSize({width,height:320});
        await question.fill('일과 관계에서 반복되는 선택을 살펴보고 싶어요. 다음에 확인할 조건을 알려주세요.');
        const submit=card.locator('.fc-form .fc-primary');
        await submit.scrollIntoViewIfNeeded();
        const box=await submit.boundingBox();
        assert.ok(box && box.y>=0 && box.y+box.height<=320, 'short viewport CTA: '+target.key+'/'+width);
        assert.ok(await card.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'short viewport overflow: '+target.key+'/'+width);
        if (capture && (width===320 || width===844)) await page.screenshot({path:resolve(output,`${target.key}-short-${width}.png`),animations:'disabled',scale:'css'});
      }
      evidence.push({service:target.key,width,overflow:false,price:'5,000원 from fixture registry',keyboardDisclosure:!iphone,touchDisclosure:iphone,exampleInput:true,shortViewport:iphone});
    }
    await page.setViewportSize({width:390,height:900});
    await page.evaluate(()=>document.documentElement.style.fontSize='200%');
    assert.ok(await card.evaluate(el=>el.scrollWidth<=el.clientWidth+1),'zoom overflow: '+target.key);
    await page.evaluate(()=>document.documentElement.style.fontSize='');
    // iPhone scope ends before payment; result rendering remains in the desktop suite.
    if (!iphone) {
    // Existing result container only: this prose is explicitly a rendering fixture.
    await card.locator(target.answer).evaluate(el=>{
      el.style.display='block';
      el.innerHTML='<h4>지금의 선택을 읽는 한 줄</h4><p>이 문단은 화면 검증용 대역입니다. 실제 AI 상담이나 저장된 결과가 아닙니다.</p><p>이미 알고 있는 강점을 살피고, 지금의 상황에서 먼저 확인할 조건을 정리해 보세요. 짧은 문단 사이의 간격과 긴 문장의 줄바꿈을 확인합니다.</p><h4>오늘 해볼 일</h4><p>중요한 선택 하나를 적고, 필요한 정보와 확인할 사람을 나누어 정리합니다.</p>';
    });
    if (capture) await card.locator(target.answer).screenshot({path:resolve(output,`${target.key}-result-390.png`),animations:'disabled',scale:'css'});
    await page.evaluate(()=>document.body.classList.add('neo-mode'));
    if (capture) await card.locator('.fc-entry').screenshot({path:resolve(output,`${target.key}-neo-390.png`),animations:'disabled',scale:'css'});
    await page.evaluate(()=>document.body.classList.remove('neo-mode'));
    }
    if(target.close) {
      await page.evaluate(action=>window[action](),target.close);
      if (target.key==='ziwei' || target.key==='sukuyo') await page.waitForFunction(() => !['ziwei','sukuyo'].includes(window.history.state?.cdBasicFortuneModal));
    }
  }
  const result={browser:iphone?'WebKit with iPhone 13 emulation':chrome?'Google Chrome':'Chromium',capturesWritten:capture,physicalDevice:false,nativeKeyboard:false,network:'Every API mocked; every external origin blocked; no payment/LLM/DB operations',resultSource:iphone?'none; pre-payment input only':'explicit rendering fixture',evidence,requests,errors};
  assert.deepEqual(errors.filter(message=>message!=='google_translate_script_failed'), [], 'unexpected browser exception');
  await writeFile(resolve(output,'metrics.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({scenarios:evidence.length,errors,network:result.network}));
  await context.close();
} finally {await browser.close();await new Promise(done=>server.close(done));}
