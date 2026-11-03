import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { expect } from '@playwright/test';

const base = process.env.CRO_BASE_URL || 'http://127.0.0.1:4310';
const output = resolve(process.env.CRO_AUDIT_DIR || '.tmp/cro-insights');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const rows = [];
try {
  for (const width of [375, 430, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    const resourceFailures = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => { if (new URL(request.url()).origin === base) resourceFailures.push({ path: new URL(request.url()).pathname, error: request.failure()?.errorText }); });
    page.on('response', response => { if (response.status() >= 400 && new URL(response.url()).origin === base && !new URL(response.url()).pathname.startsWith('/api/')) resourceFailures.push({ path: new URL(response.url()).pathname, status: response.status() }); });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== base) return route.abort();
      if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 503, json: { ok: false, reason: 'CRO_MOCK_ONLY' } });
      return route.continue();
    });
    await page.goto(base + '/insights/', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.locator('#insight-query').waitFor({ state: 'visible', timeout: 120000 });
    await page.waitForLoadState('load', { timeout: 120000 });
    await page.locator('.moon-library[aria-busy="false"]').waitFor({ state: 'visible', timeout: 30000 }).catch(error => { console.error(JSON.stringify({ width, errors, resourceFailures })); throw error; });
    assert.deepEqual(errors, [], 'page must hydrate before interaction');
    const essentialOnly = page.getByRole('button', { name: '필수만 사용', exact: true });
    if (await essentialOnly.isVisible()) await essentialOnly.click();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), 'https://code-destiny.com/insights/');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow at ${width}`);
    await page.screenshot({ path: resolve(output, `insights-after-${width}.png`) });
    const category = page.locator('.moon-category-tabs button').filter({ hasText: /^사주$/ });
    await category.click();
    await expect(category).toHaveAttribute('aria-pressed', 'true');
    const input = page.locator('#insight-query');
    await input.fill('존재하지않는운세zz');
    await input.press('Enter');
    const reset = page.getByRole('button', { name: '조건을 지우고 전체 글 보기' });
    await reset.waitFor({ state: 'visible' });
    await reset.click();
    await expect(input).toHaveValue('');
    await page.locator('.moon-article-card').first().waitFor({ state: 'visible' });
    await expect(page.locator('.moon-category-tabs button').filter({ hasText: /^전체$/ })).toHaveAttribute('aria-pressed', 'true');
    await input.focus();
    assert(await input.evaluate(node => node === document.activeElement && node.getBoundingClientRect().height >= 44));
    const cta = page.locator('.moon-article-card a').first();
    assert(await cta.getAttribute('href'), 'article remains linked');
    assert(await cta.evaluate(node => node.getBoundingClientRect().height >= 44));
    assert.deepEqual(errors, []);
    rows.push({ width, overflow: false, searchReset: true, categoryPressed: true, links: true, pageErrors: errors });
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(resolve(output, 'insights-checks.json'), JSON.stringify(rows, null, 2));
console.log('[insights discovery] PASS', rows.length, 'mock viewports');
