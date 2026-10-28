import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';

import { mkdir } from 'node:fs/promises';

import { buildSajuSectionHtml } from '../worker/lib/saju-section/report.js';

const root = process.cwd();
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  // This suite tests a member's paid summary; guest/result access is covered by verify-saju-result-login.mjs.
  if (pathname === '/api/auth/me') { res.writeHead(200, {'content-type':'application/json'}); res.end(JSON.stringify({ok:true,authenticated:true,user:{id:'summary-race-user',name:'회귀검증'}})); return; }
  if (pathname === '/api/saju/section') {
    // 종합·대운 본문은 서버가 만든다. 해금 판정은 워커 테스트가 맡고, 여기서는 같은 렌더러로 배달 흐름만 본다.
    let raw = '';
    for await (const chunk of req) raw += chunk;
    let status = 200, payload;
    try {
      const body = JSON.parse(raw || '{}');
      const birth = body.birth || {};
      const result = buildSajuSectionHtml({
        featureKey: body.featureKey,
        birth: {calendarDate: birth.date, calType: birth.calType, timeKnown: birth.timeKnown !== false, hour: birth.hour, minute: birth.minute},
        gender: body.gender, name: body.name, mode: body.mode, lang: body.lang, place: body.place, daewun: body.daewun,
      });
      payload = {ok:true, unlocked:true, featureKey:body.featureKey, ...result};
    } catch (error) { status = 400; payload = {ok:false, message:error.message}; }
    sectionRequests.push({ case: activeCase, featureKey: payload.featureKey, status, message: payload.message });
    res.writeHead(status, {'content-type':'application/json'}); res.end(JSON.stringify(payload)); return;
  }
  if (pathname.startsWith('/api/')) { res.writeHead(200, {'content-type':'application/json'}); res.end('{"ok":true,"unlocks":[],"profiles":[]}'); return; }
  const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + '/') && !file.startsWith(root + '\\')) { res.writeHead(403); res.end(); return; }
  try {
    const data = await readFile(file).catch(() => readFile(resolve(root, 'public', '.' + pathname)));
    res.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp'})[extname(file)] || 'application/octet-stream');
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({headless:true});
const sectionRequests=[];let activeCase='nature';
const out=resolve(process.env.CD_SAJU_NATURE_EVIDENCE_DIR || resolve(root,'.impeccable/review'));await mkdir(out,{recursive:true});
try {
for(const width of [360,390,430,1440]){
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 await context.addInitScript(()=>sessionStorage.setItem('privacyAgreed','true'));
 const page=await context.newPage();page.setDefaultTimeout(20000);
 page.on('dialog',dialog=>dialog.dismiss());
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>typeof window.cdOneStepFreeSajuEntry==='function');
 await page.evaluate(()=>cdOneStepFreeSajuEntry());
 await page.locator('#nameInput').fill('물상검증');
 await page.locator('#birthDate').fill('1990-05-15');
 await page.locator('#birthTimeText').fill('08:35');await page.locator('#birthTimeText').press('Tab');
 await page.locator('#run-btn').click();
 await page.waitForFunction(()=>window.G_PILLARS&&window.G_DAEWUN&&window.__cdLastSummaryArgs&&document.querySelector('#sajuIljuRich .saju-nature'));
 assert.equal(await page.locator('#dwGrid .dw-item').count(),0);
 assert.equal(await page.locator('#dwDetail .saju-nature').count(),0);
 const unchanged=await page.evaluate(()=>JSON.stringify({p:G_PILLARS,power:G_POWER,n:G_NATAL,dw:G_DAEWUN}));
 async function shot(id,name){
  await page.locator(id).scrollIntoViewIfNeeded();
  await page.evaluate(id=>document.querySelector(id).scrollIntoView({block:'start',behavior:'instant'}),id);
  await page.waitForTimeout(800);
  await page.locator(id+' img').evaluateAll(imgs=>Promise.all(imgs.filter(i=>i.getBoundingClientRect().top<innerHeight).map(i=>{i.loading="eager";return i.decode().catch(()=>{});})));
  await page.screenshot({path:resolve(out,name+'-'+width+'.png')});
  assert.equal(await page.locator(id).evaluate(el=>el.scrollWidth>el.clientWidth+1),false,name+' overflow');
 }
 await shot('#sajuIljuRich','ilju');
 await shot('#sajuMonthReading','month');
 await page.evaluate(()=>{
  const birth={year:1990,month:5,day:15,hour:8,minute:35};
  window.__cdCurrentDestinyProfile={profileId:'nature-test',birth};window.__cdActiveBirthProfile={profileId:'nature-test',birth};
  for(const key of ['section_summary','section_daewun'])window._cdFinalizeUnlockState(key,{data:{featureKey:key,profileId:'nature-test',accessGranted:true,accessGrant:{featureKey:key,profileId:'nature-test',evidenceId:'nature-local-mock'}}});
  renderDaewun(window.__cdLastDaewunBazi);
  window.CdSajuSectionClient.loadSummary({force:true});
  const r=G_DAEWUN[2];window.CdSajuSectionClient.showDaewun(r.age,r.g,r.j);
 });
 await page.waitForFunction(()=>document.querySelector('#dwDetail .saju-nature')&&document.querySelector('#summaryArea .saju-nature'));
 assert.ok(await page.locator('#dwGrid .saju-nature-thumb').count()>0);
 await shot('#dwDetail','daewun');
 await shot('#summaryArea','summary');
 const chapters=page.locator('#summaryArea .saju-summary-chapter');
 assert.equal(await chapters.count(),16,'all delivered summary chapters');
 assert.equal(await page.locator('#summaryArea [data-summary-art]').count(),16,'one illustration per chapter');
 for (let i=0;i<await chapters.count();i++) {
  const chapter=chapters.nth(i),art=chapter.locator('.saju-summary-chapter__body > [data-summary-art]');
  assert.equal(await art.count(),1,'chapter '+i+' owns its illustration');
  await art.scrollIntoViewIfNeeded();
  await art.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(async image=>{image.loading='eager';try{await image.decode();}catch(error){throw new Error(image.getAttribute('src')+': '+error.message);}})));
  assert.equal(await art.locator('img').evaluate(image=>image.complete&&image.naturalWidth>0),true);
  assert.equal(await chapter.evaluate(el=>el.scrollWidth>el.clientWidth+1),false,'chapter '+i+' overflow');
 }
 for(const key of ['chongpyeong','eokbu','yeonae','olhae'])await shot('#sajuSummaryChapter-'+key,'summary-'+key);
 const first=chapters.first();await first.locator('.saju-summary-toggle').click();
 assert.equal(await first.locator('[data-summary-art]').isVisible(),false,'collapsed chapter hides its image');
 await first.locator('.saju-summary-toggle').click();
 assert.equal(await first.locator('[data-summary-art]').isVisible(),true,'expanded chapter restores its image');
 await page.evaluate(()=>document.body.classList.add('neo-mode'));
 await shot('#sajuIljuRich','ilju-dark');await shot('#dwDetail','daewun-dark');
 const after=await page.evaluate(()=>JSON.stringify({p:G_PILLARS,power:G_POWER,n:G_NATAL,dw:G_DAEWUN}));
 assert.equal(after,unchanged,'presentation must preserve chart values');
 console.log(JSON.stringify({width,status:'pass',requests:sectionRequests.length}));
 await context.close();
}
}finally{await browser.close();await new Promise(r=>server.close(r));}
