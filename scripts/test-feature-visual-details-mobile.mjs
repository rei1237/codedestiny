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
  for (const entry of catalog) {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(`${origin}/features/${entry.slug}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    assert.equal(response.status(), 200);
    const html = await response.text();
    assert.ok(html.includes('property="og:title"') && html.includes('rel="canonical"'));
    await page.getByRole('heading', { level: 1, name: entry.title, exact: true }).waitFor();
    assert.equal(await page.locator('.featureVisualDetail').count(), 1);
    assert.equal(await page.locator('a').filter({ hasText: /고르기|시작하기|찾기/ }).last().getAttribute('href'), entry.href);
    for (const width of [320, 360, 375, 390, 412, 430, 768, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${entry.slug} ${width}px`);
      if (width === 390 || width === 1280) await page.screenshot({ path: path.join(output, `detail-live-${entry.slug}-${width}.png`), fullPage: true });
    }
    assert.equal((await page.reload({ waitUntil: 'domcontentloaded' })).status(), 200);
    console.log(`PASS ${entry.slug}: direct entry, refresh, OG, CTA, 8 viewports`);
  }
  assert.equal((await page.goto(origin + '/features/missing-feature/')).status(), 404);
  console.log('PASS unknown feature is 404');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin + '/app/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  console.log('React hub Neo links:', await page.locator('a[href="/neo-operation-room"]').count());
  await page.locator('a[href="/neo-operation-room"]').first().click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('[data-feature-visual-detail="neo-operation-room"]').waitFor({ timeout: 30000 });
  await dialog.screenshot({ path: path.join(output, 'detail-react-popup.png') });
  await page.keyboard.press('Escape');
  assert.equal(await dialog.count(), 0);
  console.log('PASS React Neo detail popup and Escape close');
} finally { await browser.close(); }
