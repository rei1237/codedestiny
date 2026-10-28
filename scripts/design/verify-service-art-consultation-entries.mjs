import '../lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium, expect } from '@playwright/test';
import { FEATURE_KEY_PRICE_TABLE } from '../../worker/lib/paid-feature-registry.js';

// Remote fonts are deliberately blocked; capture the settled fallback font without waiting for font downloads.
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1';
const base = process.env.ART_TEST_ORIGIN || 'http://127.0.0.1:16883';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
const out = process.env.ART_REVIEW_OUTPUT || 'build-cache/service-introduction-review';
fs.mkdirSync(out, { recursive: true });
const evidence = [];
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [360, 390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 }, locale: 'ko-KR',
      reducedMotion: 'reduce', serviceWorkers: 'block',
    });
    const calls = [], errors = [];
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.pathname.startsWith('/api/')) {
        calls.push({ path: url.pathname, method: request.method() });
        if (url.origin !== base) return route.abort();
        if (url.pathname === '/api/billing/features') return route.fulfill({ json: {
          ok: true, legacyFeatureTable: Object.entries(FEATURE_KEY_PRICE_TABLE).map(([featureKey, value]) => ({ featureKey, ...value })),
        } });
        if (['/api/auth/me', '/api/auth/refresh'].includes(url.pathname)) {
          return route.fulfill({ status: 401, json: { ok: false, authenticated: false } });
        }
        return route.fulfill({ status: 503, json: { ok: false, reason: 'ART_REVIEW_MOCK' } });
      }
      if (url.origin !== base) return route.abort();
      return route.continue();
    });
    let page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(180000);
    page.on('pageerror', error => errors.push({ url: page.url(), message: error.message }));
    async function visit(path) {
      await page.close();
      page=await context.newPage();page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(180000);
      page.on('pageerror',error=>errors.push({url:page.url(),message:error.message}));
      console.log(`Checking ${width}px ${path}`);
      const response = await page.goto(base + path, { waitUntil: 'load' });
      assert.equal(response.status(), 200, path);
    }
    async function inspect(image, label, { uncropped = false } = {}) {
      await expect(image).toBeVisible({ timeout: 120000 });
      await expect(async()=>{await image.scrollIntoViewIfNeeded();}).toPass({timeout:10000});
      await expect.poll(()=>image.evaluate(node=>node.complete&&node.naturalWidth>0),{timeout:30000}).toBe(true);
      const metric = await image.evaluate(node => {
        const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
        const naturalRatio = node.naturalWidth / node.naturalHeight;
        const ratio = rect.width / rect.height;
        return {
          src: node.getAttribute('src'), currentSrc: node.currentSrc, alt: node.alt,
          naturalWidth: node.naturalWidth, naturalHeight: node.naturalHeight,
          width: rect.width, height: rect.height, left: rect.left, right: rect.right,
          objectFit: style.objectFit, objectPosition: style.objectPosition,
          retainedArea: style.objectFit === 'cover' ? Math.min(ratio / naturalRatio, naturalRatio / ratio) : 1,
        };
      });
      assert.ok(metric.alt.trim(), `${label}: meaningful alt missing`);
      assert.ok(metric.naturalWidth > 0 && metric.naturalHeight > 0, `${label}: image missing`);
      assert.ok(Math.abs(metric.naturalWidth / metric.naturalHeight - 1.5) < .01, `${label}: source must be 3:2`);
      assert.ok(metric.width > 0 && metric.height > 0 && metric.left >= -1 && metric.right <= width + 1, `${label}: image exceeds viewport`);
      if (uncropped) assert.ok(metric.retainedArea >= .98, `${label}: new scene is cropped`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${label}: page overflow`);
      await page.screenshot({ timeout:30000, path: `${out}/${width}-entry-${label}.png` });
      evidence.push({ width, label, path: new URL(page.url()).pathname, ...metric });
    }
    await visit('/fortune-tea-house/');
    await inspect(page.locator('img[src$="/images/service-introductions/fortune-tea-house-960.webp"]').first(), 'tea-hero');
    await inspect(page.locator('#tea-example img[src$="/images/service-introductions/fortune-tea-house-960.webp"]'), 'tea-preview');
    for (const method of ['saju', 'tarot', 'sukuyo']) {
      await inspect(page.locator(`img[src$="/images/service-introductions/tea-${method}-640.webp"]`), `tea-${method}`);
    }
    await inspect(page.locator('img[src$="/images/service-introductions/tea-saju-joint-640.webp"]'), 'tea-joint');

    await visit('/neo-operation-room/');
    // This button only reveals the input/method deck (enterWarRoom); never submit the form.
    const deck = page.locator('#neo-operation-command-deck');
    await expect(page.getByRole('button', { name: '고민부터 적어보기', exact: true })).toBeVisible({ timeout: 120000 });
    await page.getByRole('button', { name: '고민부터 적어보기', exact: true }).click();
    await expect(deck).toBeVisible({ timeout: 120000 });
    for (const method of ['saju', 'ziwei', 'vedic', 'astrology']) {
      const frame = deck.locator(`[data-neo-asset-role="method-${method}"]`);
      const image = frame.locator('img');
      await expect.poll(async()=>new URL(await image.getAttribute("src"),base).pathname,{timeout:30000}).toBe(`/images/service-introductions/neo-${method}-640.webp`);
      await inspect(image, `neo-${method}`, { uncropped: true });
      await expect(frame).toHaveAttribute('data-loaded', 'true');
      await expect(frame).toHaveAttribute('data-failed', 'false');
    }
    await visit('/master-love-codex/');
    await inspect(page.locator('img[src$="/images/service-introductions/master-love-codex-960.webp"]').first(), 'master-love-hero');
    assert.equal(calls.some(call => /(?:generate|purchase|confirm|prepare|consume|activate|checkout)/i.test(call.path)), false, JSON.stringify(calls));
    assert.deepEqual(errors, [], 'Client runtime errors');
    evidence.push({ width, kind: 'network', calls, errors });
    fs.writeFileSync(`${out}/consultation-entry-evidence.json`, JSON.stringify(evidence, null, 2) + '\n');
    await context.close();
  }
} finally {
  await browser.close();
}
console.log('PASS consultation entry artwork at 360, 390 and 1440px; no personal input, generation or payment');
