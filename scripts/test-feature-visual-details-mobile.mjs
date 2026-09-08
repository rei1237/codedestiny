import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const origin = process.env.MOBILE_AUDIT_ORIGIN || 'http://127.0.0.1:26504';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Mock localhost only');
const output = path.resolve('test-results/mobile-platform');
fs.mkdirSync(output, { recursive: true });
const catalog = JSON.parse(fs.readFileSync('public/feature-details/catalog.json', 'utf8'));
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.goto(origin + '/features/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForLoadState('networkidle');
  const catalogLinks = page.locator('.featureCatalogList a');
  assert.equal(await catalogLinks.count(), catalog.length, 'catalog must show each published feature once');
  const hrefs = await catalogLinks.evaluateAll(links => links.map(link => link.getAttribute('href')));
  assert.equal(new Set(hrefs).size, hrefs.length, 'catalog has duplicate destinations');
  await page.getByRole('searchbox', { name: '기능 이름이나 고민으로 찾기' }).fill('초융합');
  await page.waitForFunction(() => [...document.querySelectorAll('.featureCatalogList li')].filter(item => item.getClientRects().length).length === 1);
  await page.getByRole('searchbox', { name: '기능 이름이나 고민으로 찾기' }).fill('없는기능검색어');
  await page.getByRole('heading', { name: '찾는 소개가 없어요.' }).waitFor();
  await page.getByRole('button', { name: '전체 기능 보기' }).click();
  await page.waitForFunction(expected => document.querySelectorAll('.featureCatalogList li').length === expected, catalog.length);
  console.log(`PASS catalog search, unique links, empty-state recovery: ${catalog.length} features`);
  for (const entry of catalog) {
    const detail = JSON.parse(fs.readFileSync(path.join('public', 'feature-details', `${entry.slug}.json`), 'utf8'));
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(`${origin}/features/${entry.slug}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    assert.equal(response.status(), 200, `${entry.slug}: direct entry returned ${response.status()}`);
    const html = await response.text();
    assert.ok(html.includes('property="og:title"') && html.includes('rel="canonical"'));
    await page.getByRole('heading', { level: 1, name: entry.title, exact: true }).waitFor();
    assert.equal(await page.locator('.featureVisualDetail').count(), 1);
    assert.equal(await page.getByRole('link', { name: detail.ctaLabel, exact: true }).last().getAttribute('href'), entry.href);
    for (const width of [320, 360, 375, 390, 412, 430, 768, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${entry.slug} ${width}px`);
      if (width === 390 || width === 1280) await page.screenshot({ path: path.join(output, `detail-live-${entry.slug}-${width}.png`), fullPage: true });
    }
    let refresh = await page.reload({ waitUntil: 'domcontentloaded' });
    // Next dev can return one transient 500 while recompiling generated detail JSON after a full-page capture.
    // Retry only once; a persistent response remains a real route failure.
    if (refresh.status() >= 500) refresh = await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal(refresh.status(), 200, `${entry.slug}: refresh returned ${refresh.status()}`);
    console.log(`PASS ${entry.slug}: direct entry, refresh, OG, CTA, 8 viewports`);
  }
  assert.equal((await page.goto(origin + '/features/missing-feature/')).status(), 404);
  console.log('PASS unknown feature is 404');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin + '/app/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  const neoLink = page.locator('a[href="/neo-operation-room/"]').first();
  assert.equal(await neoLink.count(), 1, 'React hub must expose the current Neo direct-entry link');
  await neoLink.click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  await dialog.locator('.featureVisualDetail').waitFor();
  assert.equal(await dialog.locator('a[href="/neo-operation-room/"]').last().getAttribute('href'), '/neo-operation-room/');
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'detached' });
  assert.equal(await neoLink.evaluate(link => link === document.activeElement), true, 'closing the detail modal must restore card focus');
  console.log('PASS React hub Neo detail modal, CTA, Escape, focus restore');
} finally { await browser.close(); }
