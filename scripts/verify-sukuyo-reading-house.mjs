import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const phase = 'house';
const output = path.join(root, '.impeccable', 'basic-fortune', phase);
await fs.mkdir(output, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const profile = { id: 'mock-reader', name: '서연', gender: 'F', birth: { year: 1990, month: 10, day: 14, hour: 14, minute: 30, calType: 'solar' }, location: { lat: 37.5665, lng: 126.978, tzOffset: 9, name: '서울' } };
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const requests = [];
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    // Fail closed: no test traffic ever reaches a live API, analytics or asset host.
    if (url.pathname.startsWith('/api/')) {
      requests.push({ path: url.pathname, method: route.request().method() });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, authenticated: false, profiles: [], unlocked: false, data: [] }) });
    }
    if (url.hostname !== '127.0.0.1') return route.abort();
    const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname).slice(1);
    const candidates = [path.resolve(root, relative), path.resolve(root, 'public', relative)];
    for (const candidate of candidates) {
      if (!candidate.startsWith(root + path.sep)) continue;
      try { return await route.fulfill({ status: 200, contentType: mime[path.extname(candidate)] || 'application/octet-stream', body: await fs.readFile(candidate) }); } catch {}
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
    window.openSukuyoModal();
  });
  await page.waitForSelector('.sy-house-mansions button');
  await page.waitForFunction(()=>document.querySelectorAll('.sy-house-story').length===26);
  const coverage=await page.evaluate(()=>window.__syOriginalControls.every(item=>window.__syNewControls.some(next=>JSON.stringify(next)===JSON.stringify(item))));
  assert.equal(coverage,true,'Original control/ID coverage');
  const privateCopyExposed=await page.evaluate(()=>{
    const traits=window._syLastSukuyoBasicResult.traits;
    const text=document.querySelector('#syHouseNatal').textContent;
    return ['hidden','karma','mantra','health','timing'].some(key=>traits[key]&&text.includes(traits[key]));
  });
  assert.equal(privateCopyExposed,false,'Deep-dive prose stays in its existing gated renderer');
  const originalData=await page.evaluate(()=>JSON.stringify({natal:window._syLastSukuyoBasicResult,wheel:window._syWheelState}));
  for(let index=0;index<27;index++){
    await page.locator('.sy-house-mansions button').nth(index).click();
    assert.ok((await page.locator('.sy-house-mansion-reader').innerText()).length>400);
    assert.equal(await page.evaluate(()=>JSON.stringify({natal:window._syLastSukuyoBasicResult,wheel:window._syWheelState})),originalData);
  }
  await page.locator('#syHouseDirectory input').fill('위');assert.equal(await page.locator('.sy-house-mansions button:visible').count(),2);
  await page.locator('#syHouseDirectory input').fill('');
  for(let index=0;index<26;index++){
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
  const summary={originalControlsPreserved:coverage,mansions:27,articles:26,natalUnchanged:true,viewports:[360,390,430,1280],errors};
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'house-report.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
} finally { await browser.close(); }
