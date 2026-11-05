import { chromium } from 'playwright';
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, resolve, sep } from 'node:path';
import assert from 'node:assert/strict';
import { buildSajuSectionHtml } from '../worker/lib/saju-section/report.js';

// 기본은 public/ 정적 서버를 직접 띄운다(개발 서버 없이 실행). /api 는 아래 route 에서 모두 mock 이라 서버 코드를 타지 않는다.
const publicRoot=resolve('public');
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const staticServer=process.env.SAJU_READING_URL?null:createServer((request,response)=>{
  let pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
  if(pathname.endsWith('/'))pathname+='index.html';
  const file=resolve(publicRoot,'.'+pathname);
  if(!file.startsWith(publicRoot+sep)||!existsSync(file)||!statSync(file).isFile()){response.writeHead(404);response.end();return;}
  response.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');createReadStream(file).pipe(response);
});
if(staticServer)await new Promise(done=>staticServer.listen(0,'127.0.0.1',done));
const base=process.env.SAJU_READING_URL||('http://127.0.0.1:'+staticServer.address().port);
if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base))throw new Error('Use the local mock server only');
const ENTRY='#cdhYeongnyangiSlot .cdh-choice-card--yeongnyangi';
// 저장소 밖에 쓴다: 저장소 안 쓰기는 Next dev 재컴파일(HMR)을 일으켜 측정을 흔든다.
const out=resolve(process.env.SAJU_READING_SHOTS||resolve(tmpdir(),'code-destiny-saju-reading-shots'));mkdirSync(out,{recursive:true});
const baseline=process.argv.includes('--baseline');
const entryOnly=process.argv.includes('--entry-only');
const browser=await chromium.launch({headless:true});
const results=[];
try {
  for(const width of [360,390,430,1440]){
    const context=await browser.newContext({viewport:{width,height:width===1440?1000:844},reducedMotion:'reduce'});
    // 무료 사주 결과는 검증된 로그인 세션이 필요하다(932a22824). 결과 게이트의 세션 확인만 mock 으로 통과시킨다.
    await context.addInitScript(()=>sessionStorage.setItem('cd_signature_consult_session_closed_v1','1')); // 홈 상담 팝업이 클릭을 가리지 않게 한다
    await context.addInitScript(()=>Object.defineProperty(window,'__dpVerifyResultSession',{configurable:true,get:()=>async()=>'authenticated',set(){}}));
    let bundleOwned=false;const page=await context.newPage();const requests=[];const errors=[];const swissRequests=[];
    page.on('pageerror',error=>errors.push(error.message));
    await context.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(!['127.0.0.1','localhost'].includes(url.hostname))return route.abort();
      // 이 검사는 Swiss Ephemeris 를 돌리지 않는다. 불러오려 하면 막고 결과에 횟수만 남긴다.
      if(/swisseph|sweph/i.test(url.pathname)){swissRequests.push(url.pathname);return route.abort();}
      // 묶음 본문은 구매 뒤에만 서버가 준다. 해금 판정은 워커 테스트가 맡는다.
      if(url.pathname==='/api/saju/section'){const body=route.request().postDataJSON()||{};const birth=body.birth||{};if(!bundleOwned)return route.fulfill({status:402,json:{ok:false}});return route.fulfill({json:{ok:true,unlocked:true,featureKey:body.featureKey,...buildSajuSectionHtml({featureKey:body.featureKey,birth:{calendarDate:birth.date,calType:birth.calType,timeKnown:birth.timeKnown!==false,hour:birth.hour,minute:birth.minute},gender:body.gender,name:body.name,mode:body.mode,lang:body.lang,place:body.place})}});}
      if(url.pathname==='/api/yeongnyangi/products')return route.fulfill({json:{products:[{id:'saju_mackerel',priceKRW:1000}]}});
      if(url.pathname.startsWith('/api/'))return route.fulfill({status:401,json:{ok:false,error:'mock-auth'}});
      return route.continue();
    });
    await page.goto(base+'/ggulggul/',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(([selector,baseline])=>document.querySelector(selector)&&(baseline||window.SajuReadingPresentation),[ENTRY,baseline],{timeout:30000});
    // 부팅 게이트가 걷히는 중에는 스크롤바가 빠져 body 폭이 달라지므로 끝난 뒤에 잰다.
    await page.waitForFunction(()=>{const c=document.documentElement.classList;return !c.contains('cd-boot-gate')&&!c.contains('cd-boot-gate-out');});
    await page.evaluate(selector=>{const entry=document.querySelector(selector);if(entry.closest('#cdhMore'))throw new Error('Yeongnyangi entry is incorrectly folded');entry.scrollIntoView({behavior:'instant'});},ENTRY);
    await page.waitForFunction(selector=>{const i=document.querySelector(selector+' img');return i.complete&&i.naturalWidth>0;},ENTRY);
    await page.locator(ENTRY).screenshot({path:resolve(out,`cat-${width}.png`)});
    const catHeight=await page.locator(ENTRY).evaluate(el=>el.getBoundingClientRect().height);
    if(!baseline&&width===360)assert.ok(catHeight<=480,`Mobile entry height ${catHeight}`);
    if(entryOnly){
      const entryState=await page.evaluate(selector=>{const entry=document.querySelector(selector);const buttons=[...entry.querySelectorAll('.cdh-choice-card__cta')].map(button=>{const rect=button.getBoundingClientRect();return {width:rect.width,height:rect.height,text:button.innerText.trim()};});return {count:document.querySelectorAll(selector).length,overflow:document.documentElement.scrollWidth>innerWidth+2,buttons};},ENTRY);
      assert.equal(entryState.count,1,'Yeongnyangi entry is unique');
      assert.equal(entryState.overflow,false,'Yeongnyangi entry has no horizontal overflow');
      assert.ok(entryState.buttons.length>=1,'Yeongnyangi entry keeps its action');
      for(const button of entryState.buttons){assert.ok(button.height>=44,`CTA touch target ${button.height}px`);assert.ok(button.text,`CTA text is visible at ${width}px`);}
      assert.deepEqual(errors,[],'No entry rendering exceptions');
      results.push({width,catHeight,entryState});await context.close();continue;
    }
    await page.evaluate(()=>window.cdOneStepFreeSajuEntry());
    await page.waitForFunction(()=>typeof window.calculate==='function');
    await page.locator('#nameInput').fill('테스트');await page.locator('#birthDate').fill('19910220');
    await page.locator('#birthTimeText').fill('12:00');await page.locator('#birthTimeText').press('Tab');
    if(width===430)await page.locator('#birthTimeTip').click();
    if(!baseline){
    assert.equal(await page.locator('#sajuInputModes [data-saju-mode]').count(),0,'Profile input keeps Yeoni only');
    assert.match(await page.locator('#sajuInputModes img').getAttribute('src'),/yeoni-profile-guide/);
    assert.equal(await page.locator('#nameInput').inputValue(),'테스트');
    }
    await page.locator('#destinyCardForm').screenshot({path:resolve(out,`input-${width}.png`)});
    await page.evaluate(()=>document.querySelector('[data-action="checkPrivacyAndCalculate"]').click());
    await page.evaluate(()=>{const b=document.querySelector('[data-action="agreeAndCalculate"]');if(b)b.click();});
    await page.waitForFunction(()=>window.G_PILLARS,null,{timeout:60000});
    if(baseline){await page.locator('#iljuCard').scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,`result-before-${width}.png`)});await page.locator('[data-unlock-key="section_summary"]').first().scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,`paid-before-${width}.png`)});results.push({width,catHeight});await context.close();continue;}
    // 잠금 전(사주 영구 묶음 미보유): 원국과 한 줄 성향만 있고 묶음 안의 카드는 아직 그려지지 않는다. 해금 이벤트 뒤에 나타난다.
    await page.waitForFunction(()=>(document.getElementById('sajuNatalOneLiner')?.textContent||'').trim().length>0);
    assert.equal(await page.locator('#dailyPanel .saju-reading').count(),0,'Bundle cards stay hidden before unlock');
    assert.equal(await page.evaluate(()=>window.CdSajuBundleOffer.isOpen()),false);
    assert.equal(await page.locator('#tsGrid [data-saju-god]').count(),0,'Ten-god cards stay hidden before unlock');
    bundleOwned=true;
    // 묶음은 저장 프로필 단위 권리다. 입력과 같은 출생 정보의 프로필을 고른 상태로 해금한다.
    await page.evaluate(async()=>{const PID='mock-personas-profile';await window.__cdEnsureDestinyProfileLoaded();const profile={id:PID,name:'검증',gender:window.__cdActiveBirthProfile.gender,birth:{...window.__cdActiveBirthProfile.birth},location:{lat:37.5665,lng:126.978,tzOffset:9,name:'서울'}};window.DestinyProfileManager.storage.save([profile]);window.DestinyProfileManager.storage.setCurrent(PID);if(window._cdFinalizeUnlockState('saju_lifetime_bundle',{ok:true})!==true)throw new Error('Real unlock path did not open the bundle');window.dispatchEvent(new Event('cd:unlocks-changed'));});
    assert.equal(await page.evaluate(()=>window.CdSajuBundleOffer.isOpen()),true,'Real isTileKeyUnlocked opens the bundle');
    await page.waitForFunction(()=>document.querySelector('#dailyPanel .saju-reading')&&document.querySelector('#tsGrid [data-saju-god]'),null,{timeout:60000});
    const facts=()=>page.evaluate(()=>JSON.stringify({p:G_PILLARS,n:G_NATAL,power:G_POWER,johu:G_JOHU,dw:G_DAEWUN,price:[...document.querySelectorAll('[data-saju-price-key]')].map(e=>e.textContent)}));
    const before=await facts();
    await page.locator('#sajuReadingHeader').scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,`result-yeon-${width}.png`)});
    // 카드는 content-visibility:auto 라 화면에 그려지기 전 높이는 추정값이다. 실제 높이로 자리 잡은 뒤에 위치를 잰다.
    await page.waitForFunction(async()=>{const card=document.getElementById('tenshinCard');for(let i=0;i<12;i+=1){card.scrollIntoView({block:'start',behavior:'instant'});await new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(done,60))));const top=card.getBoundingClientRect().top;if(top>=0&&top<innerHeight/2)return true;}return false;});
    const textBefore=await page.locator('#tsGrid').textContent();
    const yBefore=await page.locator('#tenshinCard').evaluate(el=>el.getBoundingClientRect().top);
    // Use the same controller as the accessible comparison buttons, without scrolling to them.
    page.on('request',req=>requests.push(req.url()));
    await page.evaluate(()=>{window.__readingStart=performance.now();document.querySelector('#sajuReadingHeader [data-saju-mode="neo"]').click();window.__readingSyncMs=performance.now()-window.__readingStart;requestAnimationFrame(()=>window.__readingFrameMs=performance.now()-window.__readingStart);});
    await page.waitForFunction(()=>document.querySelector('#dailyPanel [data-reading-mode="neo"]'));
    const elapsed=await page.evaluate(()=>window.__readingFrameMs);
    const synchronousMs=await page.evaluate(()=>window.__readingSyncMs);
    await page.screenshot({path:resolve(out,`ten-neo-${width}.png`)});
    assert.equal(await facts(),before,'The same chart and prices must survive switching');
    assert.notEqual(await page.locator('#tsGrid').textContent(),textBefore);
    // 위치 보정은 두 프레임 뒤에 끝난다(reading-personas.js).
    await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(done,100)))));
    const yAfter=await page.locator('#tenshinCard').evaluate(el=>el.getBoundingClientRect().top);
    assert.ok(Math.abs(yAfter-yBefore)<80,`Reading position shifted ${yAfter-yBefore}px`);
    const paidOrGeneration=requests.filter(url=>/\/api\/(billing|payments|fortune|.*generate|.*ai)/.test(url));
    assert.deepEqual(paidOrGeneration,[],'Switch must not trigger paid/AI requests');
    await page.locator('[data-saju-god]').first().click();
    await page.waitForFunction(()=>document.getElementById('tsModal')?.classList.contains('show'));
    assert.match(await page.locator('#modalBody').innerText(),/영냥이의 조언/);
    await page.evaluate(()=>window.closeModal());
    await page.locator('[data-saju-offer="section_summary"]').scrollIntoViewIfNeeded();
    await page.locator('[data-saju-sample="section_summary"] summary').click();
    assert.equal(await page.locator('#summaryArea').innerText(),'','A sample cannot populate locked content');
    await page.screenshot({path:resolve(out,`paid-${width}.png`)});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
    assert.equal(overflow,false,'No horizontal overflow');
    // 430px 는 시간 미상으로 입력했다. 시간 미상 프로필도 실제 해금 경로로 열려 본문까지 받는지 본다(플래그를 손으로 바꾸지 않는다).
    if(width===430){
      assert.equal(await page.evaluate(()=>window.__cdSajuTimeUnknown),true);
      assert.match(await page.locator('#johuContent').textContent(),/出|출생시간 미상/);
      await page.locator('#johuCard').scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,`unknown-${width}.png`)});
    }
    assert.deepEqual(errors,[],'No browser exceptions');
    if(width===360){await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.locator('[data-saju-offer="section_summary"]').scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,'text-200-percent.png')});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);}
    await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#sajuInputModes img'));
    assert.equal(await page.locator('#sajuInputModes [data-saju-mode]').count(),0,'Reload keeps the input guide Yeoni-only');
    results.push({width,catHeight,synchronousMs,modeChangeMs:Math.round(elapsed),anchorDelta:yAfter-yBefore,paidOrGenerationRequests:paidOrGeneration.length,swissBlocked:swissRequests.length,errors});
    await context.close();
  }
  writeFileSync(resolve(out,'metrics.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({out,results},null,2));
}finally{await browser.close();staticServer?.close();}
