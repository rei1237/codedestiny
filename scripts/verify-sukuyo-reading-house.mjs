import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { HONEY_UNLOCK_PRODUCTS } from '../worker/lib/honey-unlock-catalog.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expectedArticles = JSON.parse(await fs.readFile(path.join(root, 'public/data/sukuyo-reading/index.json'), 'utf8'));
assert.ok(expectedArticles.length > 0, 'Public Sukuyo catalogue must not be empty');
const baseline = process.argv.includes('--baseline-performance');
const phase = baseline ? 'house-baseline' : 'house';
const baselineFiles = new Set(['js/core/saju/basicFortunePresentation.js','js/saju-engine-tarot-sukuyo-quantum.js','styles/basic-fortune-library.css','styles/theme-tokens.css']);
const output = path.join(root, '.impeccable', 'basic-fortune', phase);
await fs.mkdir(output, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const profile = { id: 'mock-reader', name: '서연', gender: 'F', birth: { year: 1990, month: 10, day: 14, hour: 14, minute: 30, calType: 'solar' }, location: { lat: 37.5665, lng: 126.978, tzOffset: 9, name: '서울' } };
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const requests = [];
  let archiveAttempts = 0, attendanceDone = false;
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    // Fail closed: no test traffic ever reaches a live API, analytics or asset host.
    if (url.pathname === '/data/sukuyo-reading/index.json') requests.push({path:url.pathname,method:'GET'});
    if (url.pathname.startsWith('/api/')) {
      requests.push({ path: url.pathname, method: route.request().method() });
      if (url.pathname === '/api/honey/attendance') { attendanceDone ||= route.request().method() === 'POST'; return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,balance:attendanceDone?8:7,attended:attendanceDone})}); }
      if (url.pathname.includes('/archive') && route.request().method() === 'POST' && ++archiveAttempts <= 4) return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({ok:false,code:'MOCK_STORAGE_UNAVAILABLE'})});
      if (url.pathname === '/api/honey/catalog') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, products: HONEY_UNLOCK_PRODUCTS, otherUses: [] }) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, authenticated: false, profiles: [], unlocked: false, data: [] }) });
    }
    if (url.hostname !== '127.0.0.1') return route.abort();
    const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname).slice(1);
    const candidates = [path.resolve(root, relative), path.resolve(root, 'public', relative)];
    for (const candidate of candidates) {
      if (!candidate.startsWith(root + path.sep)) continue;
      try { return await route.fulfill({ status: 200, contentType: mime[path.extname(candidate)] || 'application/octet-stream', body: baseline && baselineFiles.has(path.relative(root,candidate).split(path.sep).join('/')) ? execFileSync('git',['show','HEAD:'+path.relative(root,candidate).split(path.sep).join('/')],{cwd:root,maxBuffer:20*1024*1024}) : await fs.readFile(candidate) }); } catch {}
    }
    return route.fulfill({ status: 404, body: 'Local fixture not found' });
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__fortuneMetrics = { lcp: 0, cls: 0 };
    new PerformanceObserver(list => list.getEntries().forEach(e => { window.__fortuneMetrics.lcp = e.startTime; })).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(list => list.getEntries().forEach(e => { if (!e.hadRecentInput) window.__fortuneMetrics.cls += e.value; })).observe({ type: 'layout-shift', buffered: true });
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:47831/', { waitUntil: 'domcontentloaded' });
  if (!baseline) {
    const honeyDetails = page.locator('.cdh-honey__details');
    assert.equal(await honeyDetails.evaluate(element => element.open), false);
    // Attendance lives in the My profile sheet. Exercise its real entry instead
    // of clicking the deliberately hidden home placeholder.
    await page.evaluate(async () => {
      await window.__cdEnsureDestinyProfileLoaded();
      window.dpOpenList();
    });
    await page.locator('#dpMasterCardHost .cdh-honey').waitFor({state:'visible'});
    assert.equal(await honeyDetails.evaluate(element => element.open), true);
    await honeyDetails.locator('summary').click();
    assert.equal(await honeyDetails.evaluate(element => element.open), false);
    await honeyDetails.locator('summary').click();
    const attendance=page.locator('[data-cd-honey-attend]');
    await attendance.waitFor();
    await page.waitForFunction(()=>!document.querySelector('[data-cd-honey-attend]').disabled);
    assert.equal(await attendance.textContent(),'출석 체크 하기');
    await attendance.click();
    await page.waitForFunction(()=>document.querySelector('[data-cd-honey-attend]').textContent==='오늘 출석 체크 완료');
    for (const width of [360,390,430,1280]) {
      await page.setViewportSize({width,height:900});
      await page.locator('.cdh-honey').scrollIntoViewIfNeeded();
      // Image decoding does not guarantee that the async shell CSS has settled.
      // Wait for the same strict visual condition; missing CSS still times out.
      await page.waitForFunction(() => {
        const images = Array.from(document.querySelectorAll('.cdh-honey img'));
        return images.length >= 2 && images.every(img => img.complete && img.naturalWidth
          && getComputedStyle(img).backgroundColor === 'rgba(0, 0, 0, 0)');
      });
      const imageBackgrounds = await page.locator('.cdh-honey img').evaluateAll(images => images.map(img => getComputedStyle(img).backgroundColor));
      assert.ok(imageBackgrounds.length >= 2 && imageBackgrounds.every(color => color === 'rgba(0, 0, 0, 0)'), `Honey image backgrounds: ${JSON.stringify(imageBackgrounds)}`);
      await page.locator('.cdh-honey').screenshot({path:path.join(output,`honey-${width}.png`)});
    }
    await page.locator('[data-cd-sheet-open="cdHoneySheet"]').click();
    await page.waitForFunction(()=>document.querySelectorAll('#cdHoneySheet .cd-honey-use').length===24);
    for (const width of [360,390,430,1280]) {
      await page.setViewportSize({width,height:900});
      const sheet=page.locator('#cdHoneySheet');
      assert.equal(await sheet.locator('.cd-honey-use-group').count(),6);
      assert.equal(await sheet.locator('.cd-honey-use .cd-honey-eligible').count(),24);
      assert.ok(await sheet.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
      await sheet.screenshot({path:path.join(output,`honey-guide-${width}.png`)});
    }
    const firstGroup=page.locator('#cdHoneySheet .cd-honey-use-group').first();
    await firstGroup.locator('summary').focus();await page.keyboard.press('Enter');assert.equal(await firstGroup.getAttribute('open'),'');
    await page.locator('#cdHoneySheet [data-cd-sheet-close]').click();
    await page.locator('#dpListSheet [data-action="dpCloseList"]').click();
    assert.equal(await page.locator('[data-cd-honey-widget]').evaluate(element => element.hidden), true);
    await page.setViewportSize({width:390,height:844});
  }
  await page.evaluate(async profile => {
    await window.__cdEnsureDestinyProfileLoaded();
    const storage = window.DestinyProfileManager.storage;
    storage.save([profile]); storage.setCurrent(profile.id);
    await window.__cdEnsureBirthModalDepsLoaded();
  }, profile);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(() => {
    const present=window.BasicFortunePresentation.sukuyo;
    window.BasicFortunePresentation.sukuyo=function(area,data){
      const snapshot = root => Array.from(root.querySelectorAll('[id],button,input,select,textarea,a')).filter(el=>!el.matches('style,script')).map(el=>({tag:el.tagName,id:el.id,action:el.getAttribute('onclick')||'',data:Array.from(el.attributes).filter(a=>a.name.startsWith('data-sy')).map(a=>[a.name,a.value])}));
      window.__syOriginalControls=snapshot(area);
      present(area,data);
      window.__syNewControls=snapshot(area);
    };
    var entry=document.createElement('button'); entry.id='mock-sukuyo-entry'; entry.textContent='숙요점 열기'; document.body.appendChild(entry); entry.focus();
    window.__syEntryStarted = performance.now();
    window.openSukuyoModal();
  });
  await page.waitForSelector('#syHouseNatal');
  const entry = await page.evaluate(() => ({entryMs: Math.round(performance.now()-window.__syEntryStarted), nodes: document.querySelectorAll('#lunarNexusApp *').length}));
  entry.initialCatalogueRequests = requests.filter(r=>r.path==='/data/sukuyo-reading/index.json').length;
  if (baseline) { console.log(JSON.stringify(entry)); await fs.writeFile(path.join(output,'performance.json'),JSON.stringify(entry)); await browser.close(); process.exit(0); }
  assert.equal(entry.initialCatalogueRequests,0,'Reading catalogue must not block the initial result');
  assert.equal(await page.locator('#syHouseAnimal').getAttribute('open'),null);
  await page.locator('#syHouseNatal summary').first().click();
  await page.waitForFunction(()=>document.querySelector('#syHouseNatal .sy-disclosure-action').textContent==='접기');
  await page.locator('#syHouseNatal summary').first().press('Enter');
  await page.waitForFunction(()=>document.querySelector('#syHouseNatal .sy-disclosure-action').textContent==='내용 펼치기');
  await page.locator('#syHouseDirectory > summary').click();
  await page.waitForSelector('.sy-house-mansions button');
  await page.locator('#syHouseJournal > summary').click();
  await page.waitForFunction(count=>document.querySelectorAll('.sy-house-story').length===count, expectedArticles.length);
  assert.deepEqual(await page.locator('.sy-house-story').evaluateAll(links=>links.map(link=>link.getAttribute('href'))),
    expectedArticles.map(article=>article.href), 'Every public Sukuyo article is reachable in catalogue order');
  const coverage=await page.evaluate(()=>window.__syOriginalControls.every(item=>window.__syNewControls.some(next=>JSON.stringify(next)===JSON.stringify(item))));
  assert.equal(coverage,true,'Original control/ID coverage');
  const privateCopyExposed=await page.evaluate(()=>{
    const traits=window._syLastSukuyoBasicResult.traits;
    const text=document.querySelector('#syHouseNatal').textContent;
    return ['hidden','karma','mantra','health','timing'].some(key=>traits[key]&&text.includes(traits[key]));
  });
  assert.equal(privateCopyExposed,false,'Deep-dive prose stays in its existing gated renderer');
  // 결제 패널이 무료 결과 사이에 끼면 어디까지가 내 기본 결과인지 알 수 없다. astro 화면이 이미
  // 같은 규칙을 지키고 있다(verify-basic-fortune-library.mjs:181-186). 숙요점에도 같은 것을 세운다.
  const paidLeak=await page.evaluate(()=>{
    const free=document.getElementById('syHouseTools');const deep=document.getElementById('syHouseDeeper');
    const label=el=>(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,40);
    // 화면에 실제로 박혀 있는 표식으로만 판정한다 — 가격 문자열이나 잠금 상태.
    const priced=el=>/[0-9][0-9,]*\s*원|잠금/.test(el.textContent||'')||!!el.querySelector('.is-locked')||el.classList.contains('is-locked');
    return {
      deeperExists:!!deep,
      freeLeaks:free?Array.from(free.children).filter(priced).map(label):['#syHouseTools 자체가 없다'],
      collapsedPaid:deep?Array.from(deep.children).filter(el=>el.closest('details:not([open])')).map(label):[],
    };
  });
  assert.equal(paidLeak.deeperExists,true,'유료 구역(#syHouseDeeper)이 없다');
  assert.deepEqual(paidLeak.freeLeaks,[],'무료 구역에 결제 패널이 남아 있다');
  assert.deepEqual(paidLeak.collapsedPaid,[],'결제 패널이 접힌 서랍 안에 들어갔다');
  // Public compatibility is local and must not touch paid content, billing or archive endpoints.
  await page.locator('#sy3BirthY').selectOption('1992');
  await page.locator('#sy3BirthM').selectOption('3');
  await page.locator('#sy3BirthD').selectOption('16');
  const beforeFree = requests.length;
  await page.locator('#sy3AnalyzeBtn').click();
  await page.waitForSelector('.sy-free-compat [data-sy-detail-open]');
  assert.ok((await page.locator('.sy-free-compat').innerText()).includes('정오 기준'));
  assert.deepEqual(requests.slice(beforeFree).filter(r=>r.method==='POST'),[],'Free summary must never charge or save');
  await page.waitForSelector('[data-honey-use="compat-sukuyo-compatibility"]');
  assert.match(await page.locator('[data-honey-use="compat-sukuyo-compatibility"]').innerText(),/30개/);
  await page.evaluate(() => { window.__paidGateCalls=0; window._cdOpenPaidServiceGate=async()=>{window.__paidGateCalls++;return {status:'cancelled'};}; });
  await page.locator('[data-sy-detail-open]').click();
  await page.waitForFunction(()=>window.__paidGateCalls===1);
  assert.equal(await page.locator('.sy-free-compat').count(),1,'Cancelling preserves the free result');
  for (const width of [360,390,430,1280]) {
    await page.setViewportSize({width,height:900});
    await page.locator('.sy-free-compat').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(output,`compat-free-${width}.png`)});
    assert.ok(await page.locator('#lunarNexusApp').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  }
  // A receipt opens the existing server loader, and the archive has visible delivery feedback.
  await page.evaluate(() => {
    window.__honeyCalls=[];
    window.SY_ARCHIVE_RETRY_DELAYS_MS=[1,2,3];
    window.CdHoney.unlockUse=async (_button,key,input,requestId)=>{
      window.__honeyCalls.push({key,input,requestId});
      return {featureKey:key,profileId:'mock-reader',requestId,unlocked:true,accessGrant:{accessMethod:'HONEY'}};
    };
    window.CdSajuSectionClient.loadSukuyoCompat=async options=>{
      window.__detailInput=options;
      return {html:'<article class="sy-card"><h4>상세 궁합</h4><p>서로의 속도를 확인하고 필요한 간격을 함께 조율해 보세요.</p></article>',
        lastCompat:{myIdx:25,partnerIdx:1,partnerMansion:'항(亢)',relationType:'안괴',forwardDistance:3,reverseDistance:24},relationLabel:'안괴',temperature:50};
    };
  });
  await page.locator('[data-honey-use="compat-sukuyo-compatibility"]').click();
  await page.getByRole('button',{name:'추가 차감 없이 저장 재시도'}).click();
  await page.waitForFunction(()=>document.querySelector('.sy-archive-status')?.textContent.includes('보관함에 저장했어요'));
  assert.equal(archiveAttempts,5);
  assert.equal(await page.locator('.sy-archive-status a').getAttribute('href'),'/records/');
  assert.equal(await page.evaluate(()=>window.__honeyCalls.length),1);
  assert.equal(await page.evaluate(()=>window.__detailInput.access.accessMethod),'honey');
  assert.equal(await page.evaluate(()=>window.__detailInput.partner.date),'1992-03-16');
  const originalData=await page.evaluate(()=>JSON.stringify({natal:window._syLastSukuyoBasicResult,wheel:window._syWheelState}));
  for(let index=0;index<27;index++){
    await page.locator('.sy-house-mansions button').nth(index).click();
    assert.ok((await page.locator('.sy-house-mansion-reader').innerText()).length>400);
    assert.equal(await page.evaluate(()=>JSON.stringify({natal:window._syLastSukuyoBasicResult,wheel:window._syWheelState})),originalData);
  }
  await page.locator('#syHouseDirectory input').fill('위');assert.equal(await page.locator('.sy-house-mansions button:visible').count(),2);
  await page.locator('#syHouseDirectory input').fill('');
  for(let index=0;index<expectedArticles.length;index++){
    const link=page.locator('.sy-house-story').nth(index);await link.click();
    await page.waitForFunction(()=>document.querySelector('.sy-house-article-body')?.textContent.length>300);
    await page.locator('.sy-house-article-reader > button').click();
    assert.equal(await link.evaluate(el=>el===document.activeElement),true);
  }
  for(const width of [360,390,430,1280]){
    await page.setViewportSize({width,height:900});
    await page.locator('#sukuyoModalSheet').evaluate(el=>el.scrollTop=0);
    await page.screenshot({path:path.join(output,`house-${width}.png`)});
    const metric=await page.locator('#lunarNexusApp').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth}));
    assert.ok(metric.scroll<=metric.width+1,JSON.stringify(metric));
  }
  await page.setViewportSize({width:390,height:900});
  for(const section of ['#syHouseTools','#syHouseDirectory','#syHouseJournal']){
    await page.locator(section).evaluate(el=>el.scrollIntoView());await page.screenshot({path:path.join(output,section.slice(1)+'.png')});
  }
  await page.locator('.modal-nav-close-sukuyo').click();
  await page.waitForFunction(()=>document.getElementById('sukuyoModalOverlay').getAttribute('aria-hidden')==='true' && document.activeElement.id==='mock-sukuyo-entry');
  const summary={performance:entry,originalControlsPreserved:coverage,mansions:27,articles:expectedArticles.length,natalUnchanged:true,viewports:[360,390,430,1280],errors};
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'house-report.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
} finally { await browser.close(); }
