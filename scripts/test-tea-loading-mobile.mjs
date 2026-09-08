import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const origin = process.env.MOBILE_AUDIT_ORIGIN || 'http://127.0.0.1:26504';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Mock localhost only');
const output = path.resolve('test-results/mobile-platform');
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
let releaseConsult;
const consultPending = new Promise(resolve => { releaseConsult = resolve; });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === origin && url.pathname === '/api/fortune-tea-house/ensure-access') return route.fulfill({ json: { ok: true } });
    if (url.origin === origin && url.pathname === '/api/fortune-tea-house/consult') {
      await consultPending;
      return route.fulfill({ status: 503, json: { ok: false, message: 'Mock loading inspection complete' } }).catch(() => {});
    }
    const asset = request.method() === 'GET' && ['image', 'font'].includes(request.resourceType()) && url.hostname === 'assets.code-destiny.com';
    return url.origin === origin || asset ? route.continue() : route.abort();
  });
  await context.addInitScript(() => localStorage.setItem('code-destiny-fortune-tea-house-entry-prologue-seen:v1', 'seen'));
  const page = await context.newPage();
  const requests = [];
  page.on('request', request => { if (request.resourceType() === 'image') requests.push(decodeURI(request.url())); });
  await page.goto(origin + '/fortune-tea-house/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.getByRole('button', { name: '운명의 찻집 상담 바로 시작하기', exact: true }).click();
  await page.locator('[data-cup-id="lotus-moon"]').click();
  await page.getByRole('button', { name: '이 찻잔으로 이야기하기', exact: true }).click();
  await page.locator('#fortuneTeaQuestion').fill('테스트 질문: 관계의 흐름을 정리하고 싶어요.');
  await page.locator('#tea-question-form button[type="submit"]').click();
  const scene = page.locator('main[data-stage="scentLoading"]');
  await scene.waitFor({ timeout: 30000 });
  await scene.locator('[data-sprite-status]').scrollIntoViewIfNeeded();
  await scene.locator('[data-sprite-status="loaded"]').waitFor({ timeout: 5000 });
  assert.equal(requests.some(url => url.includes('로딩 화면.webp')), false, 'Do not load the redundant illustration');
  assert.equal(requests.some(url => url.includes('cup-pose-sprite-sheet')), false, 'Mobile uses the still image');
  assert.ok(requests.some(url => url.includes('yeoni-cup-pose-still-mobile.webp')));
  for (const width of [320, 360, 375, 390, 412, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.waitForTimeout(80);
    assert.equal(await scene.getByRole('progressbar').count(), 1, `${width}px must still be waiting`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}px overflow`);
    await scene.getByRole('progressbar').scrollIntoViewIfNeeded();
    if (width === 390 || width === 1280) await page.screenshot({ path: path.join(output, `tea-loading-${width}.png`) });
    console.log(`PASS tea loading ${width}px: progress and no horizontal overflow`);
  }
  assert.equal(await scene.getByRole('progressbar').count(), 1);
} finally { releaseConsult(); await browser.close(); }
