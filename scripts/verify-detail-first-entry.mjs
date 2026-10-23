import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { FEATURE_KEY_PRICE_TABLE } from '../worker/lib/paid-feature-registry.js';

// Without an explicit base, serve the tracked public/ build on a free port (CI guards job).
let server;
if (!process.env.CONSULTATION_TEST_BASE) {
  const root = resolve('public');
  server = createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    if (!file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    try {
      const data = await readFile(file);
      res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png' })[extname(file)] || 'application/octet-stream');
      res.end(data);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
}
const base = process.env.CONSULTATION_TEST_BASE || `http://127.0.0.1:${server.address().port}`;
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'mock localhost only');
const output = 'build-cache/detail-first-entry';
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  for (const width of [360, 390, 430, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 },
      isMobile: width < 500, hasTouch: width < 500, reducedMotion: 'reduce', serviceWorkers: 'block' });
    const paid = [], errors = [];
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/')) {
        if (/(generate|prepare|purchase|payment|checkout|confirm)/i.test(url.pathname)) paid.push(url.pathname);
        const headers = { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Credentials': 'true' };
        if (url.pathname === '/api/billing/features') return route.fulfill({ headers, json: { ok: true,
          legacyFeatureTable: Object.entries(FEATURE_KEY_PRICE_TABLE).map(([featureKey, value]) => ({ featureKey, ...value })) } });
        return route.fulfill({ headers, status: 401, json: { ok: false, authenticated: false } });
      }
      if (url.origin !== base) return route.fulfill({ status: 403, body: 'QA_EXTERNAL_NETWORK_BLOCKED' });
      if (/^\/(?:feature-details|images)\/[a-zA-Z0-9/_-]+\.webp$/.test(url.pathname)) {
        return route.fulfill({ contentType: 'image/webp', body: await readFile(`public${url.pathname}`) });
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/ggulggul/', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await expect(page.locator('.cd-sig__more')).toHaveJSProperty('open', false);
    const cards = page.locator('a[data-cd-service-id][data-pvw-paid]');
    const count = await cards.count();
    assert.ok(count >= 4);
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      const id = await card.getAttribute('data-cd-service-id');
      const href = await card.getAttribute('href');
      const disclosure = card.locator('xpath=ancestor::details[1]');
      if (await disclosure.count() && !await disclosure.evaluate(element => element.open)) {
        await disclosure.locator('summary').first().click();
      }
      await card.scrollIntoViewIfNeeded();
      await card.click();
      const dialog = page.locator('#tilePvwOverlay');
      await expect(dialog.locator('.featureVisualDetail')).toBeVisible({ timeout: 30000 });
      await expect.poll(() => dialog.locator('.featureVisualDetail img').evaluateAll(images => images.filter(img => {
        const rect = img.getBoundingClientRect();
        return img.checkVisibility() && rect.width > 0 && rect.height > 0 && rect.top < innerHeight && rect.bottom > 0;
      }).every(img => img.complete && img.naturalWidth > 0)), { timeout: 15000 }).toBe(true).catch(async error => {
        console.error(id, await dialog.locator('.featureVisualDetail img').evaluateAll(images => images.slice(0, 2).map(img => ({ src: img.src, currentSrc: img.currentSrc, complete: img.complete, width: img.naturalWidth }))));
        console.error(await page.evaluate(async () => {
          const img = document.querySelector('.featureVisualDetail img');
          const host = document.querySelector('[data-feature-visual-host]');
          await new Promise(resolve => setTimeout(resolve, 1000));
          return { imgConnected: img?.isConnected, hostConnected: host?.isConnected, price: document.querySelector('#tilePvwCost')?.textContent, image: img?.outerHTML };
        }));
        throw error;
      });
      assert.equal(new URL(page.url()).pathname, '/ggulggul/', 'card must stay on home until CTA');
      assert.deepEqual(paid, [], 'reading detail must not start paid work');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `${output}/${id}-${width}.png` });
      await page.locator('#tilePvwClose').click();
      await expect(dialog).not.toBeVisible();
      await expect(card).toBeFocused();
      // Observe the unchanged launch destination without running a paid service.
      // The destination response is a mock; this verifies navigation, not service internals.
      await context.route(base + href, route => route.fulfill({ contentType: 'text/html', body: '<main>Mock service input</main>' }));
      await card.click();
      await expect(dialog.locator('.featureVisualDetail')).toBeVisible();
      await dialog.locator('.fortuneAction button').first().click();
      await page.waitForURL(base + href);
      assert.deepEqual(paid, [], 'CTA navigation must not initiate a charge');
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await expect(page.locator('#tilePvwOverlay.pvw-open')).toHaveCount(0);
      console.log(`PASS ${id} ${width}px: detail, close/focus, CTA ${href}, back, no paid calls`);
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
} finally { await browser.close(); server?.close(); }
