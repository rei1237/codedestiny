import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { FEATURE_KEY_PRICE_TABLE } from '../worker/lib/paid-feature-registry.js';

// Run against a Next dev server preloaded with mock-network-guard.cjs.
// Actual /ggulggul/ shell and product routes; no synthetic cards or forced visibility.
const base = process.env.CONSULTATION_TEST_BASE || 'http://127.0.0.1:14126';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const output = 'build-cache/premium-finder';
await mkdir(output, { recursive: true });
const results = [], fonts = new Map();
const records = JSON.parse(await readFile('lib/brand/prediction-records.json', 'utf8'));
const browser = await chromium.launch();
try {
  for (const [width, colorScheme] of [[360, 'light'], [390, 'light'], [430, 'light'], [1280, 'light'], [390, 'dark']]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme,
      isMobile: width < 500, hasTouch: width < 500, reducedMotion: 'reduce', serviceWorkers: 'block' });
    const paid = [], errors = [];
    await context.route('**/*', async route => {
      const url = new URL(route.request().url()), path = url.pathname;
      if (url.origin === 'https://assets.code-destiny.com' && /^\/fonts\/serif-(kr|latin)\/[a-f0-9]+\.woff2$/.test(path)) {
        if (!fonts.has(path)) fonts.set(path, readFile(`build-cache/premium-fonts/${path.slice('/fonts/'.length)}`));
        return route.fulfill({ body: await fonts.get(path), contentType: 'font/woff2', headers: { 'Access-Control-Allow-Origin': '*' } });
      }
      if (path.startsWith('/api/')) {
        if (/(?:generate|prepare|purchase|payment|checkout|confirm)/i.test(path)) paid.push(path);
        const send = (json, status = 200) => route.fulfill({ json, status,
          headers: { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Credentials': 'true' } });
        if (path === '/api/billing/features') return send({ ok: true,
          legacyFeatureTable: Object.entries(FEATURE_KEY_PRICE_TABLE).map(([featureKey, value]) => ({ featureKey, ...value })) });
        if (path === '/api/auth/me' || path === '/api/auth/refresh') return send({ ok: false, authenticated: false }, 401);
        if (path === '/api/billing/funnel-event') return send({ ok: true });
        return send({ ok: false, reason: 'QA_UNMOCKED_API' }, 503);
      }
      if (url.origin !== base) return route.fulfill({ status: 403, body: 'QA_EXTERNAL_NETWORK_BLOCKED' });
      if (path === '/version.json') return route.fulfill({ status: 404, body: 'QA_BUILD_VERSION_UNAVAILABLE' });
      return route.continue();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000); page.setDefaultNavigationTimeout(120000);
    page.on('pageerror', error => errors.push(error.message));
    for (const [slug, title, purpose, bucket, material] of [
      ['life-book-ai', '인생의 책', 'life', 'premium', 'book'],
      ['love-secret-ai', '연애 비책', 'love', 'vvip', 'letter'],
    ]) {
      const stem = `${slug}-${width}-${colorScheme}`;
      await page.goto(`${base}/ggulggul/`, { waitUntil: 'domcontentloaded' });
      await page.locator('#cdhFinderDisclosure summary').click();
      const input = page.locator('#fortuneGatewaySearch');
      const panel = page.locator('#fortuneGatewayRecs');
      const card = panel.locator(`a[href="/${slug}/"]`);
      const reset = page.locator('#fortuneGatewayDiscover [data-cd-finder-reset]');
      for (const query of [title, title.replace(/\s/g, ''), title.split('').join(' ')]) {
        await input.fill(query);
        await expect(panel.locator('.fortune-gateway__rec')).toHaveCount(1);
        await expect(card).toBeVisible();
        await expect(card.locator('[data-pvw-title]')).toHaveText(title);
      }
      await reset.click();
      await page.locator(`#fortuneGatewayDiscover [data-price="${bucket}"]`).click();
      await expect(card).toBeVisible();
      await page.locator(`#fortuneGatewayDiscover [data-purpose="${purpose}"]`).click();
      await page.locator('#fortuneGatewayDiscover [data-method="ai"]').click();
      await expect(card).toBeVisible();
      await input.fill(title.replace(/\s/g, ''));
      await expect(panel.locator('.fortune-gateway__rec')).toHaveCount(1);
      await input.fill('존재하지않는운세xyz');
      await expect(panel).toContainText('일치하는 서비스가 없어요');
      await page.locator('#fortuneGatewayDiscover [data-cd-search-clear]').click();
      await expect(input).toBeFocused();
      await expect(card).toBeVisible();
      await input.fill(title);
      // The same result already exists from the filter state; wait for the 120ms search debounce.
      await page.waitForTimeout(180);
      await expect(panel.locator('.fortune-gateway__rec')).toHaveCount(1);
      const img = card.locator('img');
      await expect(img).toHaveAttribute('src', `/feature-details/assets/${slug}-320.webp`);
      await img.evaluate(el => el.decode());
      const amount = FEATURE_KEY_PRICE_TABLE[`${slug}-consultation`].amountKRW.toLocaleString('ko-KR');
      await expect(card).toContainText(amount);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (width < 500) assert.equal(await page.locator('#resultPage').count(), 0, 'Search must preserve lazy detachment');
      await card.evaluate(el => el.scrollIntoView({ block: 'center' }));
      await page.screenshot({ path: `${output}/${stem}-search.png` });
      // Keyboard activation uses the actual delegated handler, including modal focus return.
      await card.focus();
      await page.keyboard.press('Enter');
      const dialog = page.locator('#tilePvwOverlay');
      try { await expect(dialog.locator(`[data-fortune-material="${material}"]`)).toBeVisible({ timeout: 30000 }); }
      catch (error) {
        await page.screenshot({ path: `${output}/${stem}-failure.png` });
        console.log(JSON.stringify({ url: page.url(), errors, active: await page.evaluate(() => document.activeElement?.outerHTML), dialog: await dialog.count() }));
        throw error;
      }
      await expect(dialog.locator('.fortuneAction')).toContainText(amount);
      assert.deepEqual(await dialog.locator('.fortuneFounder li a').evaluateAll(nodes => nodes.map(node => node.href)), records.map(record => record.url));
      await dialog.locator('.fortuneObject img').evaluate(el => el.decode());
      await page.screenshot({ path: `${output}/${stem}-detail.png` });
      if (width < 500) await page.locator('#tilePvwClose').tap();
      else await page.locator('#tilePvwClose').click();
      await expect(dialog).not.toBeVisible();
      try { await expect(card).toBeFocused(); } catch (error) {
        console.log('FOCUS', await page.evaluate(() => ({ active: document.activeElement?.outerHTML, state: history.state, url: location.href })));
        throw error;
      }
      await expect(input).toHaveValue(title);
      await expect(page.locator(`#fortuneGatewayDiscover [data-price="${bucket}"]`)).toHaveAttribute('aria-pressed', 'true');
      await card.focus();
      await page.keyboard.press('Enter');
      await expect(dialog.locator(`[data-fortune-material="${material}"]`)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await expect(card).toBeFocused();
      if (width < 500) await card.tap();
      else await card.click();
      await expect(dialog.locator(`[data-fortune-material="${material}"]`)).toBeVisible();
      const responsePromise = page.waitForResponse(response => new URL(response.url()).pathname.replace(/\/$/, '') === `/${slug}` && response.request().resourceType() === 'document');
      await dialog.locator('.fortuneAction button').click();
      assert.equal((await responsePromise).status(), 200);
      await page.waitForURL(`**/${slug}/`);
      await expect(page.locator('main header h2').first()).toBeVisible();
      await page.screenshot({ path: `${output}/${stem}-entry.png` });
      assert.deepEqual(paid, [], 'Discovery and entry must not initiate paid work');
      assert.deepEqual(errors, []);
      results.push({ slug, width, colorScheme, passed: true });
      console.log(`PASS ${stem}: search, filters, image, detail, focus return, entry`);
    }
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
}
console.log(`${results.length}/10 actual home-to-entry journeys passed`);
