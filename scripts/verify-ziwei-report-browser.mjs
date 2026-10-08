// Local-only UI regression: real shell/engine, mocked APIs, no external requests.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(process.env.ZIWEI_SCREENSHOT_DIR || path.join(root, '.impeccable/ziwei-report-after'));
await fs.mkdir(output, { recursive: true });
const art = JSON.parse(await fs.readFile(path.join(root, 'public/images/ziwei/animals/manifest.json'), 'utf8'));
assert.equal(art.assets.length, 23);
for (const asset of art.assets) {
  const bytes = await fs.readFile(path.join(root, 'public/images/ziwei/animals', asset.file));
  assert.equal(bytes.subarray(8, 12).toString(), 'WEBP');
  assert.ok(bytes.length < 100000, asset.file + ' exceeds mobile budget');
}

const browser = await chromium.launch();
const profile = { id: 'mock-ziwei-reader', name: '서연', gender: 'F', birth: { year: 1990, month: 10, day: 14, hour: 14, minute: 30, calType: 'solar' }, location: { lat: 37.5665, lng: 126.978, tzOffset: 9, name: '서울' } };
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const metrics = [];
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, authenticated: false, profiles: [], unlocked: false, data: [] }) });
    if (url.hostname !== '127.0.0.1') return route.abort();
    const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname).slice(1);
    for (const candidate of [path.resolve(root, relative), path.resolve(root, 'public', relative)]) {
      if (!candidate.startsWith(root + path.sep)) continue;
      try { return await route.fulfill({ contentType: mime[path.extname(candidate)] || 'application/octet-stream', body: await fs.readFile(candidate) }); } catch { /* next local source */ }
    }
    return route.fulfill({ status: 404, body: 'Missing local fixture' });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.goto('http://127.0.0.1:47831/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async profile => {
    await window.__cdEnsureDestinyProfileLoaded();
    window.DestinyProfileManager.storage.save([profile]);
    window.DestinyProfileManager.storage.setCurrent(profile.id);
    await window.__cdEnsureBirthModalDepsLoaded();
    window.openZiweiModal();
  }, profile);
  await page.locator('#fr-ziwei-chart .fr-map-toggle').waitFor();

  const dataBefore = await page.evaluate(()=>JSON.stringify(window._currentZiweiData));
  const entry = page.locator('.fr-compat-entry');
  await entry.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('.fr-compat-entry img')?.naturalWidth > 0);
  await entry.click();
  assert.equal(await page.evaluate(()=>document.activeElement.id), 'zwCompatBirthDate');
  const gate = page.locator('#zwBasicPaidGate_ziwei_twelve_palaces');
  await gate.evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});
  for(const width of [360,390,430,1280]) {
    await page.setViewportSize({width,height:900});
    for (const [name,selector] of [['entry','.fr-compat-entry'],['report','#zwComprehensiveReport'],['gate','#zwBasicPaidGate_ziwei_twelve_palaces'],['form','#zwCompatibility']]) {
      await page.locator(selector).evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
      await page.waitForTimeout(500); // Allow the compositor to settle after a large scroll/viewport change.
      await page.screenshot({path:path.join(output,name+'-'+width+'.png')});
    }
    assert.ok(await page.locator('#ziweiModalSection').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'overflow '+width);
    const fit=await gate.locator('.cd-section-gate__btn').evaluate(el=>({height:el.getBoundingClientRect().height,visible:el.getBoundingClientRect().bottom<=el.closest('.cd-section-gate').getBoundingClientRect().bottom}));
    assert.ok(fit.height>=44 && fit.visible,JSON.stringify(fit));
  }
  await page.locator('#zwCompatBirthDate').fill('19920518');
  await page.locator('#zwCompatBirthTime').fill('09:30');
  await page.locator('#zwCompatBirthCity').selectOption({index:1});
  // Gate is stubbed only in this isolated, network-blocked browser. Verify entry metadata before allowing the static calculation.
  await page.evaluate(()=>{
    window.__gateCalls=[];
    window._cdCoinGatePerUse=(cost,label,callback,options)=>{ window.__gateCalls.push({cost,options}); callback(); };
  });
  await page.locator('#zwCompatibility .zw-cosmic-btn').click();
  await page.locator('.fr-compat-chapter').first().waitFor();
  assert.equal(await page.locator('.fr-compat-chapter').count(),8);
  assert.equal(await page.locator('.fr-compat-topic').count(),5);
  console.log('report visible chars:', (await page.locator('.fr-compat-report').innerText()).length);
  assert.deepEqual(await page.evaluate(()=>window.__gateCalls.map(x=>[x.cost,x.options.featureKey])),[[30,'compat-ziwei-compatibility']]);
  assert.equal(await page.evaluate(()=>JSON.stringify(window._currentZiweiData)),dataBefore);
  for(const width of [360,390,430,1280]) {
    await page.setViewportSize({width,height:900});
    for(const [name,selector] of [['compat','.fr-compat-report'],['basis','#zwCompatChapter-basis'],['relationship','#zwCompatChapter-relationship']]) {
      await page.locator(selector).evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
      await page.screenshot({path:path.join(output,name+'-'+width+'.png')});
    }
    assert.ok(await page.locator('#ziweiModalSection').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'report overflow '+width);
  }
  await page.locator('.fr-compat-contents a').nth(4).click();
  assert.equal(await page.evaluate(()=>document.activeElement.id),'zwCompatChapter-repair');
  await page.waitForTimeout(100);
  assert.equal(await page.locator('.fr-ziwei-nav a[aria-current="page"]').getAttribute('href'),'#zwCompatibility');
  await page.evaluate(()=>{
    window.isTileKeyUnlocked = key => key === 'ziwei_twelve_palaces';
    window.unlockedFeatureMap.ziwei_twelve_palaces = true;
    window.dispatchEvent(new Event('cd:unlocks-changed'));
  });
  assert.equal(await gate.locator('.cd-section-gate__body').getAttribute('aria-hidden'),'false');
  assert.ok((await gate.locator('.cd-section-gate__body').innerText()).length>100);
  for(const width of [390,1280]) {
    await page.setViewportSize({width,height:900});
    await gate.evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
    await page.screenshot({path:path.join(output,'unlocked-'+width+'.png')});
  }
  await page.locator('#zwComprehensiveReport .fr-report-header button').click();
  await entry.click();
  assert.equal(await page.locator('#zwCompatBirthDate').count(),1);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'zwCompatBirthDate');
  console.log('PASS: 4 widths, 8 chapters, 5 domains, chart preserved, mocked paid entry, focus, reopen, gate CTA');
  console.log(output);
} finally { await browser.close(); }
