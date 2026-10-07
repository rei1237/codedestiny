// Local-only UI regression: real shell/engine, mocked APIs, no external requests.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(process.env.ZIWEI_SCREENSHOT_DIR || path.join(root, '.impeccable/ziwei-mobile'));
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
  await page.goto('http://127.0.0.1:47831/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async profile => {
    await window.__cdEnsureDestinyProfileLoaded();
    window.DestinyProfileManager.storage.save([profile]);
    window.DestinyProfileManager.storage.setCurrent(profile.id);
    await window.__cdEnsureBirthModalDepsLoaded();
    window.openZiweiModal();
  }, profile);
  await page.locator('#fr-ziwei-chart .fr-map-toggle').waitFor();
  const chart = page.locator('#fr-ziwei-chart');
  const dataBefore = await page.evaluate(() => JSON.stringify(window._currentZiweiData));
  for (const width of [320, 360, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await chart.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    const result = await chart.evaluate(el => {
      const grid = el.querySelector('.zw-grid');
      const box = grid.getBoundingClientRect();
      const cells = [...grid.querySelectorAll('.zw-cell')];
      return { width: innerWidth, display: getComputedStyle(grid).display, gridWidth: box.width, count: cells.length,
        overflow: grid.scrollWidth - grid.clientWidth,
        clipped: cells.filter(c => c.scrollWidth > c.clientWidth + 1 || c.scrollHeight > c.clientHeight + 1).map(c => c.className),
        outside: cells.filter(c => { const r = c.getBoundingClientRect(); return r.left < box.left - 1 || r.right > box.right + 1; }).length };
    });
    metrics.push(result);
    assert.equal(result.display, 'grid');
    assert.equal(result.count, 12);
    assert.ok(result.gridWidth <= width);
    assert.ok(result.overflow <= 1, JSON.stringify(result));
    assert.equal(result.outside, 0);
    assert.deepEqual(result.clipped, [], JSON.stringify(result));
    await chart.screenshot({ path: path.join(output, `chart-${width}.png`) });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await chart.locator('.zw-cell-meng').getAttribute('aria-pressed'), 'true');
  await chart.locator('.fr-map-toggle').click();
  assert.equal(await chart.locator('.zw-grid').evaluate(el => getComputedStyle(el).display), 'flex');
  await page.evaluate(() => window._zwSetChartView('detail', { silent: true }));
  await chart.screenshot({ path: path.join(output, 'chart-list-390.png') });
  await chart.locator('.fr-map-toggle').click();
  for (let i = 0; i < 12; i++) {
    const cell = chart.locator(`.zw-cell-${i}`);
    await cell.focus();
    // Shell keyboard focus scrolls smoothly; measure selection after focus has settled.
    await page.waitForTimeout(400);
    const top = await page.locator('#ziweiModalSheet').evaluate(el => el.scrollTop);
    await page.keyboard.press('Enter');
    assert.equal(await cell.getAttribute('aria-pressed'), 'true');
    const afterTop = await page.locator('#ziweiModalSheet').evaluate(el => el.scrollTop);
    assert.ok(Math.abs(afterTop - top) <= 1, `selection ${i} moves mobile scroll ${top} -> ${afterTop}`);
    assert.ok((await page.locator('#zwDetailPanel').innerText()).length > 80);
  }
  const portfolio = page.locator('#zwDestinyPortfolioMount');
  await portfolio.evaluate(el => { for (let p = el.parentElement; p; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true; });
  assert.equal(await portfolio.locator('.zwp-cell').count(), 12);
  for (const width of [320, 360, 390, 430, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await portfolio.evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    const fit = await portfolio.locator('.zwp-grid').evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth, clipped: [...el.querySelectorAll('.zwp-cell,.zwp-core')].filter(c => c.scrollWidth > c.clientWidth + 1 || c.scrollHeight > c.clientHeight + 1).map(c => c.className) }));
    assert.ok(fit.scroll <= fit.width + 1, JSON.stringify(fit));
    if (width <= 600) assert.deepEqual(fit.clipped, []);
    if (width <= 600) {
      const positions = await portfolio.locator('.zwp-grid').evaluate(el => ({
        core: getComputedStyle(el.querySelector('.zwp-core')).gridArea,
        cells: [...el.querySelectorAll('.zwp-cell')].map(c => getComputedStyle(c).gridArea),
      }));
      assert.equal(positions.core, '2 / 2 / 4 / 4');
      assert.equal(new Set(positions.cells).size, 12, 'each palace must retain its traditional position');
      assert.ok(positions.cells.every(area => !area.startsWith('auto')));
    }
    await portfolio.locator('.zwp-grid').screenshot({ path: path.join(output, `personality-${width}.png`) });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (let i = 0; i < 12; i++) {
    const cell = portfolio.locator(`.zwp-cell-${i}`);
    await cell.focus();
    await page.keyboard.press('Space');
    assert.equal(await cell.getAttribute('aria-pressed'), 'true');
    assert.ok((await portfolio.locator('.zwp-inline-body').innerText()).length > 100);
    assert.equal(await page.locator('.zwp-modal-overlay.is-open').count(), 0);
  }
  const next = page.locator('.fr-reading-next-link').first();
  await next.click();
  const targetId = (await next.getAttribute('href')).slice(1);
  assert.equal(await page.locator('#' + targetId).evaluate(el => !!el.closest('details:not([open])')), false);
  assert.equal(await page.locator('#' + targetId + ' .cd-section-gate__btn').count(), 1, 'original paid action stays intact');
  const animal = page.locator('#zwLifeAnimalPanel');
  await animal.evaluate(el => { for(let p=el.parentElement;p;p=p.parentElement) if(p.tagName==='DETAILS')p.open=true; el.scrollIntoView({block:'start',behavior:'instant'}); });
  await animal.locator('.zwla-hero-image').scrollIntoViewIfNeeded();
  await animal.locator('.zwla-hero-image').evaluate(img => img.decode());
  assert.equal(await animal.locator('.zwla-hero-image').evaluate(img => !img.hidden && img.naturalWidth === 640), true);
  await page.screenshot({path:path.join(output,'animal-basic-390.png')});
  assert.equal(await page.evaluate(() => JSON.stringify(window._currentZiweiData)), dataBefore, 'presentation must not mutate calculated chart');
  await page.evaluate(() => window.closeZiweiModal());
  await page.waitForFunction(() => getComputedStyle(document.getElementById('ziweiModalOverlay')).display === 'none');
  await page.evaluate(() => window.openZiweiModal());
  await page.locator('#fr-ziwei-chart .fr-map-toggle').waitFor();
  assert.equal(await page.locator('#fr-ziwei-chart .fr-map-toggle').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('.zwp-modal-overlay[data-zwp-id="zwDestinyPortfolioMount"]').count(), 1);
  if (process.env.ZIWEI_NEXT_URL) {
    const base = process.env.ZIWEI_NEXT_URL;
    assert.equal(new URL(base).hostname, '127.0.0.1');
    const reactContext = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await reactContext.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ok: true, user: null, profiles: [], reports: [], data: null }) });
      return url.origin === new URL(base).origin ? route.continue() : route.abort();
    });
    const reactPage = await reactContext.newPage();
    await reactPage.goto(base + '/ziwei/chart/', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await reactPage.getByLabel('이름', { exact: true }).fill('서연');
    for (const [label, value] of [['출생 연도', '1990'], ['출생 월', '5'], ['출생 일', '15'], ['출생 시', '10']]) await reactPage.getByLabel(label, { exact: true }).fill(value);
    await reactPage.getByRole('button', { name: '심화 자미두수 상담 열기', exact: true }).click();
    await reactPage.locator('#ziwei-result-answer').waitFor();
    await reactPage.locator('#ziwei-result-deep').evaluate(el => { el.open = true; });
    for (const width of [320, 360, 390, 430, 768, 1280]) {
      await reactPage.setViewportSize({ width, height: 900 });
      const chartSection = reactPage.locator('#ziwei-result-chart');
      await chartSection.scrollIntoViewIfNeeded();
      const fit = await chartSection.evaluate(el => ({ overflow: el.scrollWidth - el.clientWidth, cells: [...el.querySelectorAll('button[aria-pressed]')].map(c => ({ width: c.clientWidth, scroll: c.scrollWidth, height: c.clientHeight, scrollHeight: c.scrollHeight })) }));
      assert.ok(fit.overflow <= 1, JSON.stringify(fit));
      assert.equal(fit.cells.length, 12);
      assert.ok(fit.cells.every(c => c.scroll <= c.width + 1 && c.scrollHeight <= c.height + 1), JSON.stringify(fit));
      await chartSection.screenshot({ path: path.join(output, `advanced-${width}.png`) });
    }
    const advancedCells = reactPage.locator('#ziwei-result-chart button[aria-pressed]');
    for (const cell of await advancedCells.all()) { await cell.click(); assert.equal(await cell.getAttribute('aria-pressed'), 'true'); }
    await reactPage.goto(base + '/ziwei/animal-destiny/', { waitUntil: 'domcontentloaded', timeout: 120000 });
    for (const [label, value] of [['출생 연도', '1990'], ['출생 월', '5'], ['출생 일', '15'], ['출생 시', '10']]) await reactPage.getByLabel(label, { exact: true }).fill(value);
    await reactPage.getByRole('button', { name: '내 영혼 동물 확인하기', exact: true }).click();
    await reactPage.getByRole('button', { name: /다시/ }).first().waitFor();
    await reactPage.locator('img[src*="/images/ziwei/animals/"]').evaluate(img => img.decode());
    assert.equal(await reactPage.locator('img[src*="/images/ziwei/animals/"]').getAttribute('src'), '/images/ziwei/animals/ziwei-owl-v1.webp');
    for (const width of [320, 390, 1280]) {
      await reactPage.setViewportSize({ width, height: 900 });
      assert.ok(await reactPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await reactPage.screenshot({ path: path.join(output, `animal-${width}.png`) });
    }
    await reactContext.close();
  }
  await fs.writeFile(path.join(output, 'metrics.json'), JSON.stringify(metrics, null, 2));
  console.log('PASS: mobile chart, list, 12-palace keyboard selection, personality grid, reopen, calculation preservation');
  console.log(output);
} finally { await browser.close(); }
