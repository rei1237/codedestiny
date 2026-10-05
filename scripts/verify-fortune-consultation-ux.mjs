// Static-shell browser evidence. Every API is mocked; external traffic is blocked.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const resultIndex = process.argv.indexOf('--result-file');
const reviewedResult = resultIndex < 0 ? '' : await readFile(process.argv[resultIndex + 1], 'utf8');
const phase = reviewedResult ? 'reviewed-result' : process.argv.includes('--before') ? 'before' : 'after';
const baseIndex = process.argv.indexOf('--base');
const remoteBase = baseIndex < 0 ? '' : process.argv[baseIndex + 1];
if (remoteBase && !['https://staging.code-destiny.com','https://code-destiny.com'].includes(remoteBase)) throw new Error('Only the two documented public hosts may be inspected');
const environment = remoteBase ? (remoteBase.includes('staging.') ? 'staging' : 'production') : 'local';
const output = resolve('artifacts/fortune-consultation-ux/saju', phase + (remoteBase ? '-' + environment : ''));
await mkdir(output, { recursive: true });
async function writeFileWithRetry(path, data) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await writeFile(path, data);
      return;
    } catch (error) {
      if (!['UNKNOWN', 'EBUSY', 'EPERM'].includes(error?.code) || attempt === 19) throw error;
      await new Promise(resolveWait => setTimeout(resolveWait, 75));
    }
  }
}
async function capture(subject, path) {
  if (subject.scrollIntoViewIfNeeded) {
    // Offscreen result sections use content-visibility; wait for their measured heights.
    for (let attempt=0;attempt<8;attempt++) {
      await subject.evaluate(el=>window.scrollBy({top:el.getBoundingClientRect().top-24,behavior:'instant'}));
      await new Promise(done=>setTimeout(done,200));
      if (await subject.evaluate(el=>Math.abs(el.getBoundingClientRect().top-24)<4)) break;
    }
    assert.ok(await subject.evaluate(el=>{const r=el.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;}),'capture target must be in the viewport');
  }
  // Capture the settled viewport; locator screenshots scroll again and invalidate virtual section heights.
  const image = await (subject.page ? subject.page() : subject).screenshot({ animations: 'disabled' });
  await writeFileWithRetry(path, image);
}
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + '/') && !file.startsWith(root + '\\')) { res.writeHead(403).end(); return; }
  for (const candidate of [file, resolve(root, 'public', '.' + pathname)]) {
    try {
      const data = await readFile(candidate);
      res.setHeader('content-type', ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'})[extname(candidate)] || 'application/octet-stream');
      res.end(data); return;
    } catch {}
  }
  res.writeHead(404).end();
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = remoteBase || `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({headless:true});
const evidence = [];
const apiRequests = [];
let fixtureSignedIn = false;
try {
  const context = await browser.newContext({ viewport: {width:390,height:844}, reducedMotion:'reduce', serviceWorkers:'block' });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) {
      apiRequests.push(url.pathname);
      // Result entry requires a verified session; this response is a local fixture only.
      if (url.pathname === '/api/auth/me') return route.fulfill({json:{ok:true,user:{id:'ux-fixture-owner'},authenticated:true}});
      const payload = url.pathname === '/api/billing/features' ? {legacyFeatureTable:[{featureKey:'saju_ai_question_prompt',amountKRW:10000,cost:100}]} : {ok:true,user:fixtureSignedIn ? {id:'ux-fixture-owner'} : null,unlocks:[],profiles:[],data:null};
      return route.fulfill({contentType:'application/json',body:JSON.stringify(payload)});
    }
    return url.origin === origin ? route.continue() : route.abort();
  });
  await context.addInitScript(() => sessionStorage.setItem('privacyAgreed','true'));
  const page = await context.newPage();
  page.on('dialog', dialog => dialog.dismiss());
  await page.goto(origin + (remoteBase ? '/ggulggul/' : ''), {waitUntil:'domcontentloaded'});
  // 무료 사주 카드(퀵 서비스)는 연이의 정원 안이다 — 사용자처럼 정원을 먼저 연다.
  if (await page.locator('#cdhMore:not([open]) > summary').count()) await page.locator('#cdhMore > summary').click();
  await page.locator('#cdQuickServices a[data-action="cdOneStepFreeSajuEntry"]').click();
  await page.locator('#nameInput').fill('검증용 프로필');
  await page.locator('#birthDate').fill('1990-05-15');
  await page.locator('#run-btn').click();
  await page.waitForFunction(() => window.G_PILLARS && window.G_NATAL, {timeout:30000});
  await page.locator('#sajuQuestionPromptGeneratorCard').waitFor({state:'attached',timeout:30000});
  for (const width of [360,390,430,1440]) {
    await page.setViewportSize({width,height:900});
    await page.locator('#sajuCard').evaluate(el => el.scrollIntoView({block:'start',behavior:'instant'}));
    const metrics = await page.evaluate(() => {
      const source=document.getElementById('sajuCard'), target=document.getElementById('sajuQuestionPromptGeneratorCard');
      const entry=document.getElementById('sajuConsultationEntry') || target;
      return {width:innerWidth,sourceY:source.getBoundingClientRect().top+scrollY,entryY:entry.getBoundingClientRect().top+scrollY,consultationY:target.getBoundingClientRect().top+scrollY,
        hiddenAncestor:!!entry.closest('details:not([open]),[aria-hidden="true"]'),overflow:entry.scrollWidth>entry.clientWidth+1,entryVisible:!!entry.offsetParent,heading:entry.querySelector('h2,h3,h4,.prem-title')?.textContent};
    });
    await capture(page, resolve(output,`chart-${width}.png`));
    for (const mode of ['pig','neo']) {
      await page.evaluate(mode=>document.querySelector('#sajuReadingHeader [data-saju-mode="'+mode+'"]').click(),mode);
      await page.waitForFunction(mode=>document.querySelector('#letterContent .saju-letter')?.dataset.readingMode===mode,mode);
      const letter=page.locator('#letterContent');
      await capture(letter,resolve(output,`letter-${mode}-${width}.png`));
      assert.ok(await letter.locator('.saju-letter__prose p').count()>=5);
      assert.ok(await letter.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
      await capture(page.locator('#sajuConsultationEntry'),resolve(output,`entry-${mode}-${width}.png`));
      const art=await page.locator('#sajuConsultationEntry').evaluate(el=>{
        const img=[...el.querySelectorAll('img')].find(i=>i.getBoundingClientRect().height>0);
        const rect=img.getBoundingClientRect(),frame=img.parentElement.getBoundingClientRect();
        return {height:rect.height,frameHeight:frame.height};
      });
      assert.ok(art.height<=art.frameHeight+1,'The entry artwork fits its frame');
      if(mode==='pig')assert.ok(Math.abs(art.height-art.frameHeight)<1,'Yeoni artwork fills the frame');

    }
    await page.evaluate(()=>document.querySelector('#sajuReadingHeader [data-saju-mode="pig"]').click());

    if (phase !== 'before') {
      await page.locator('#sajuConsultationEntry').evaluate(el => el.scrollIntoView({block:'start',behavior:'instant'}));
      await capture(page.locator('#sajuConsultationEntry'), resolve(output,`entry-${width}.png`));
    }
    if (phase !== 'before') {
      assert.equal(await page.locator('[data-consultation-price]').first().textContent(),'10,000원');
      assert.equal(metrics.entryVisible,true); assert.equal(metrics.hiddenAncestor,false); assert.equal(metrics.overflow,false);
      assert.equal(await page.locator('#sajuConsultationEntry').evaluate(el=>el.parentElement.previousElementSibling?.id),'sajuCard');
      await page.locator('[data-consultation-open]').focus();
      await page.keyboard.press('Enter');
      await page.locator('[data-saju-ai-question]').waitFor({state:'visible'});
      await capture(page.locator('[data-saju-ai-form]'), resolve(output,`consultation-${width}.png`));
      assert.equal(await page.locator('[data-saju-ai-question]').getAttribute('aria-label'),'상담할 질문');
      assert.ok(await page.locator('[data-saju-ai-generate]').evaluate(el=>el.getBoundingClientRect().height>=44));
    }
    evidence.push(metrics);
  }
  if (phase !== 'before') {
    await page.locator('[data-saju-ai-question]').fill('검증용 질문: 선택 기준을 알려 주세요.');
    await page.locator('[data-consultation-profile-edit]').click();
    await page.locator('#birthDate').waitFor({state:'visible'});
    assert.equal(await page.locator('#birthDate').inputValue(),'1990-05-15');
    assert.equal(await page.locator('#nameInput').inputValue(),'검증용 프로필');
    await page.locator('#birthTimeTip').click();
    // Observe completion of the real deferred render queue without shortening or skipping it.
    await page.evaluate(() => {
      window.__uxRecalculationRendered = false;
      const schedule = window.runDeferredSajuTasks;
      window.runDeferredSajuTasks = function(tasks) {
        if (tasks.length > 10) return schedule(tasks.concat([() => { window.__uxRecalculationRendered = true; }]));
        return schedule(tasks);
      };
    });
    await page.locator('#run-btn').click();
    await page.waitForFunction(() => window.__uxRecalculationRendered === true);
    await page.waitForFunction(() => window.__cdSajuTimeUnknown === true);
    await page.locator('[data-consultation-open]').click();
    assert.equal(await page.locator('[data-saju-ai-question]').inputValue(),'검증용 질문: 선택 기준을 알려 주세요.');
    await page.locator('[data-saju-ai-calib]').evaluate(el => { el.open=true; });
    assert.ok(await page.locator('[data-saju-ai-calib-when]').first().evaluate(el=>el.getBoundingClientRect().height>=44));
    await page.setViewportSize({width:390,height:900});
    await page.evaluate(() => { document.documentElement.style.fontSize='200%'; });
    assert.ok(await page.locator('#sajuQuestionPromptGeneratorCard').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
    await page.evaluate(() => { document.documentElement.style.fontSize=''; });
    await page.locator('[data-saju-ai-mode-button][data-saju-mode="neo"]').click();
    await page.waitForFunction(() => document.getElementById('sajuQuestionPromptGeneratorCard')?.dataset.readingMode === 'neo');
    await capture(page.locator('#sajuConsultationEntry'), resolve(output,'entry-neo-390.png'));
    await page.waitForTimeout(500);
    await page.locator('[data-saju-ai-mode-button][data-saju-mode="pig"]').click();
    await page.waitForFunction(() => document.getElementById('sajuQuestionPromptGeneratorCard')?.dataset.readingMode === 'pig');
    fixtureSignedIn = true;
    await page.evaluate((reviewedText) => {
      localStorage.setItem('fortune_auth_user',JSON.stringify({id:'ux-fixture-owner'}));
      const titles=['질문에 대한 핵심 답변','이 명식의 중심 성향','십성 구조 해석','오행 균형 해석','현재 고민과 명식의 연결','일/돈/관계/연애/건강 리듬','대운의 전환점','올해의 흐름','조심해야 할 패턴','살리는 전략','30일 실천 가이드','마지막 한마디'];
      window._sajuPromptStoreSavedResult({profileId:window._sajuPromptResolveProfileId(),resultId:'mock-consultation-ux',requestId:'mock-request',status:'completed',saved:true,resultText:reviewedText || titles.map((title,i)=>'## '+(i+1)+'. '+title+'\n이 문단은 화면 검증용 대역입니다. 실제 AI 상담의 품질을 증명하지 않습니다.\n서로 다른 조건과 선택 기준을 짧은 문단으로 읽을 수 있는지 확인합니다.').join('\n'),personaSummaries:{version:1,yeoni:{letter:'지금의 질문을 서두르지 않고 바라보면, 명식이 보여 준 선택 기준을 내 마음의 속도에 맞춰 확인할 수 있어요.',action:'오늘 가장 중요한 조건 하나를 종이에 적어보세요.'},neo:{conclusion:'지금은 결론을 서두르기보다 선택 기준을 먼저 고정할 때입니다.',basis:'공통 상담문에 제시된 일간과 오행 균형, 시기 흐름을 기준으로 판단했습니다.',caution:'실제 역할과 일정, 상대의 답변이 달라지면 판단도 다시 점검해야 합니다.',nextCheck:'역할, 보상, 일정, 상대의 답변 순서로 확인하세요.'}}});
      window._mountSajuQuestionPromptCard();
    }, reviewedResult);
    await page.locator('[data-saju-ai-archive]').click();
    assert.equal(await page.locator('.consultation-chapter').count(),12);
    assert.equal(await page.locator('.consultation-contents a').count(),7);
    for (const width of [360,390,430,1440]) {
      await page.setViewportSize({width,height:900});
      await page.waitForTimeout(600);
      await page.locator('[data-saju-ai-output-panel]').evaluate(el=>{el.scrollIntoView({block:'start',behavior:'instant'});window.scrollBy({top:-120,behavior:'instant'});});
      assert.ok(await page.locator('[data-saju-ai-output-panel]').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
      await capture(page, resolve(output,'result-yeoni-'+width+'.png'));
      const requestCountBeforeModeChange=apiRequests.length;
      await page.waitForTimeout(500);
      await page.locator('[data-saju-ai-mode-button][data-saju-mode="neo"]').click();
      await page.waitForFunction(() => document.getElementById('sajuQuestionPromptGeneratorCard')?.dataset.readingMode === 'neo');
      await page.waitForTimeout(600);
      await page.locator('[data-saju-ai-output-panel]').evaluate(el=>{el.scrollIntoView({block:'start',behavior:'instant'});window.scrollBy({top:250,behavior:'instant'});});
      assert.equal(apiRequests.length,requestCountBeforeModeChange,'화자 전환은 API 요청을 만들면 안 된다');
      assert.equal(await page.locator('[data-saju-ai-output-text]').textContent().then(text=>text.includes('화면 검증용 대역')),true);
      await capture(page, resolve(output,'result-neo-'+width+'.png'));
      await page.waitForTimeout(500);
      await page.locator('[data-saju-ai-mode-button][data-saju-mode="pig"]').click();
      await page.waitForFunction(() => document.getElementById('sajuQuestionPromptGeneratorCard')?.dataset.readingMode === 'pig');
      if (reviewedResult) {
        await page.locator('.consultation-chapter').nth(7).evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
        await capture(page, resolve(output,'result-chapter8-'+width+'.png'));
      }
    }
    await page.locator('[data-saju-ai-reset-result]').click();
    assert.equal(await page.locator('[data-saju-ai-output-panel]').isVisible(),false);
  }
  console.log(JSON.stringify({phase,evidence,network:'all APIs mocked; all external traffic blocked'},null,2));
  await writeFileWithRetry(resolve(output,'metrics.json'),JSON.stringify({phase,evidence,network:'mock',resultSource:reviewedResult?'reviewed-local-text; archive ownership and persistence mocked':'fixture'},null,2));
  await context.close();
} finally {await browser.close(); await new Promise(done=>server.close(done));}
