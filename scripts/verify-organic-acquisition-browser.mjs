import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Local-only inspection: never touch live APIs, analytics, auth, payment or LLM.
const origin = 'http://127.0.0.1:3187';
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
    const context = await browser.newContext({ viewport });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin || url.pathname.startsWith('/api/')) return route.abort();
      return route.continue();
    });
    const page = await context.newPage();
    for (const path of ['/', '/manse/', '/sukuyo/', '/fortune/today/']) {
      const response = await page.goto(origin + path, { waitUntil: 'domcontentloaded', timeout: 120000 });
      assert.equal(response.status(), 200, path);
      await page.locator('h1').waitFor();
      assert.equal(await page.locator('h1').count(), 1, path);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      assert.equal(canonical, 'https://code-destiny.com' + path, path);
      if (path === '/') assert.ok(await page.locator('a[href="/manse/"]').filter({ hasText: '무료 만세력' }).count());
      if (path === '/manse/') {
        assert.ok(await page.getByText('만세력 어플을 따로 설치해야 하나요?', { exact: true }).count());
        assert.ok(await page.locator('form').count());
      }
      if (path === '/sukuyo/') assert.ok(await page.locator('a[href="/sukuyo/guide/"]').count());
      if (path === '/fortune/today/') {
        assert.ok(await page.locator('#today-reading-choice').count());
        assert.equal(await page.locator('nav[aria-labelledby="choose-sign-heading"] a').count(), 24);
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `${viewport.width} ${path}: horizontal overflow`);
      console.log(`PASS ${viewport.width}px ${path}: status, heading, canonical, journey, overflow`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}