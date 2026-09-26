import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const base=process.env.SAJU_READING_URL||'http://127.0.0.1:34350';
if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base))throw new Error('Use the local mock server only');
const out=resolve(process.env.SAJU_READING_SHOTS||'.codex-saju-reading-shots');mkdirSync(out,{recursive:true});
const baseline=process.argv.includes('--baseline');
const browser=await chromium.launch({headless:true});
const results=[];
try {
  for(const width of [360,390,430,1440]){
    const context=await browser.newContext({viewport:{width,height:width===1440?1000:844},reducedMotion:'reduce'});
    const page=await context.newPage();const requests=[];const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await context.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(!['127.0.0.1','localhost'].includes(url.hostname))return route.abort();
      if(url.pathname==='/api/yeongnyangi/products')return route.fulfill({json:{products:[{id:'saju_mackerel',priceKRW:1000}]}});
      return route.continue();
    });
    await page.goto(base+'/ggulggul/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(baseline=>document.querySelector('.cd-soulcat-entry')&&(baseline||window.SajuReadingPresentation),baseline);
    await page.evaluate(()=>{document.getElementById('cdhMore').open=true;document.querySelector('.cd-soulcat-entry').scrollIntoView({behavior:'instant'});});
    await page.waitForFunction(()=>{const i=document.querySelector('.cd-soulcat-entry img');return i.complete&&i.naturalWidth>0;});
    await page.locator('.cd-soulcat-entry').screenshot({path:resolve(out,`cat-${width}.png`)});
    const catHeight=await page.locator('.cd-soulcat-entry').evaluate(el=>el.getBoundingClientRect().height);
    if(!baseline&&width===360)assert.ok(catHeight<=140,`Compact entry height ${catHeight}`);
    await page.evaluate(()=>document.querySelector('[aria-label="사주 분석 시작하기"]').click());
    await page.waitForFunction(()=>typeof window.calculate==='function');
    await page.locator('#nameInput').fill('테스트');await page.locator('#birthDate').fill('19910220');
    await page.locator('#birthTimeText').fill('12:00');await page.locator('#birthTimeText').press('Tab');
    if(width===430)await page.locator('#birthTimeTip').click();
    if(!baseline){await page.locator('#sajuInputModes [data-saju-mode="neo"]').focus();
    await page.locator('#sajuInputModes [data-saju-mode="neo"]').press('Enter');
    await page.waitForFunction(()=>document.activeElement?.closest('#sajuInputModes'));
    assert.equal(await page.locator('#nameInput').inputValue(),'테스트');
    await page.evaluate(()=>document.querySelector('#sajuInputModes [data-saju-mode="pig"]').click());}
    await page.locator('#destinyCardForm').screenshot({path:resolve(out,`input-${width}.png`)});
    await page.evaluate(()=>document.querySelector('[data-action="checkPrivacyAndCalculate"]').click());
    await page.evaluate(()=>{const b=document.querySelector('[data-action="agreeAndCalculate"]');if(b)b.click();});
    await page.waitForFunction(baseline=>window.G_PILLARS&&(baseline||document.querySelector('#tsGrid [data-saju-god]')&&document.querySelector('#dailyPanel .saju-reading')),baseline,{timeout:60000});
    if(baseline){await page.locator('#iljuCard').scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,`result-before-${width}.png`)});await page.locator('[data-unlock-key="section_summary"]').first().scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,`paid-before-${width}.png`)});results.push({width,catHeight});await context.close();continue;}
    const facts=()=>page.evaluate(()=>JSON.stringify({p:G_PILLARS,n:G_NATAL,power:G_POWER,johu:G_JOHU,dw:G_DAEWUN,price:[...document.querySelectorAll('[data-saju-price-key]')].map(e=>e.textContent)}));
    const before=await facts();
    await page.locator('#sajuReadingHeader').scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,`result-yeon-${width}.png`)});
    await page.locator('#tenshinCard').scrollIntoViewIfNeeded();
    const textBefore=await page.locator('#tsGrid').innerText();
    const yBefore=await page.locator('#tenshinCard').evaluate(el=>el.getBoundingClientRect().top);
    // Use the same controller as the accessible comparison buttons, without scrolling to them.
    page.on('request',req=>requests.push(req.url()));
    await page.evaluate(()=>{window.__readingStart=performance.now();document.querySelector('#sajuReadingHeader [data-saju-mode="neo"]').click();window.__readingSyncMs=performance.now()-window.__readingStart;requestAnimationFrame(()=>window.__readingFrameMs=performance.now()-window.__readingStart);});
    await page.waitForFunction(()=>document.querySelector('#dailyPanel [data-reading-mode="neo"]'));
    const elapsed=await page.evaluate(()=>window.__readingFrameMs);
    const synchronousMs=await page.evaluate(()=>window.__readingSyncMs);
    await page.screenshot({path:resolve(out,`ten-neo-${width}.png`)});
    assert.equal(await facts(),before,'The same chart and prices must survive switching');
    assert.notEqual(await page.locator('#tsGrid').innerText(),textBefore);
    const yAfter=await page.locator('#tenshinCard').evaluate(el=>el.getBoundingClientRect().top);
    assert.ok(Math.abs(yAfter-yBefore)<80,`Reading position shifted ${yAfter-yBefore}px`);
    const paidOrGeneration=requests.filter(url=>/\/api\/(billing|payments|fortune|.*generate|.*ai)/.test(url));
    assert.deepEqual(paidOrGeneration,[],'Switch must not trigger paid/AI requests');
    await page.locator('[data-saju-god]').first().click();
    await page.waitForFunction(()=>document.getElementById('tsModal')?.classList.contains('show'));
    assert.match(await page.locator('#modalBody').innerText(),/네오의 진단/);
    await page.evaluate(()=>window.closeModal());
    await page.locator('[data-saju-offer="section_summary"]').scrollIntoViewIfNeeded();
    await page.locator('[data-saju-sample="section_summary"] summary').click();
    assert.equal(await page.locator('#summaryArea').innerText(),'','A sample cannot populate locked content');
    await page.screenshot({path:resolve(out,`paid-${width}.png`)});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
    assert.equal(overflow,false,'No horizontal overflow');
    if(width===430)assert.equal(await page.evaluate(()=>window.__cdSajuTimeUnknown),true);
    await page.evaluate(()=>{window.__cdSajuTimeUnknown=true;window.SajuReadingPresentation.changed();});
    assert.match(await page.locator('#johuContent').textContent(),/出|출생시간 미상/);
    await page.locator('#johuCard').scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,`unknown-${width}.png`)});
    assert.deepEqual(errors,[],'No browser exceptions');
    if(width===360){await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.locator('[data-saju-offer="section_summary"]').scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,'text-200-percent.png')});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);}
    await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#sajuInputModes [data-saju-mode="neo"]')?.getAttribute('aria-pressed')==='true');
    results.push({width,catHeight,synchronousMs,modeChangeMs:Math.round(elapsed),anchorDelta:yAfter-yBefore,paidOrGenerationRequests:paidOrGeneration.length,errors});
    await context.close();
  }
  writeFileSync(resolve(out,'metrics.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({out,results},null,2));
}finally{await browser.close();}
