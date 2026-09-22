import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { JSDOM } from 'jsdom';
import { FEATURE_KEY_PRICE_TABLE } from '../worker/lib/paid-feature-registry.js';

const base = process.env.CONSULTATION_TEST_BASE || 'http://127.0.0.1:14125';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const output = 'build-cache/premium-detail';
await mkdir(output, { recursive: true });
const records = JSON.parse(await readFile('lib/brand/prediction-records.json', 'utf8'));
const fonts = new Map(), results = [];
const shell = JSDOM.fragment(await readFile('index.html', 'utf8'));
const popupFixture = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><link rel="stylesheet" href="/styles/fonts-serif.css">${[...shell.querySelectorAll('style')].map(style => style.outerHTML).join('')}</head><body>${shell.querySelector('#tilePvwOverlayTemplate').innerHTML}</body></html>`;
const browser = await chromium.launch();
try {
  for (const [width, colorScheme] of [[360, 'light'], [390, 'light'], [430, 'light'], [1280, 'light'], [390, 'dark']]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.addCookies([{ name: 'fortune_auth_role', value: 'user', url: base }]);
    const paid = [], errors = [];
    await context.route('**/*', async route => {
      const url = new URL(route.request().url()), path = url.pathname;
      if (url.origin === base && path === '/__qa-premium-popup') return route.fulfill({ contentType: 'text/html', body: popupFixture });
      // A dev server has no release artifact. Preserve its missing response
      // without compiling the catch-all locale route during screenshot capture.
      if (url.origin === base && path === '/version.json') return route.fulfill({ status: 404, body: 'QA_BUILD_VERSION_UNAVAILABLE' });
      if (url.origin === 'https://assets.code-destiny.com' && /^\/fonts\/serif-(kr|latin)\/[a-f0-9]+\.woff2$/.test(path)) {
        if (!fonts.has(path)) fonts.set(path, readFile(`build-cache/premium-fonts/${path.slice('/fonts/'.length)}`));
        return route.fulfill({ body: await fonts.get(path), contentType: 'font/woff2', headers: { 'Access-Control-Allow-Origin': '*' } });
      }
      if (url.origin !== base && !(url.hostname === 'yeongnyangi-qa.example.invalid' && path.startsWith('/api/'))) return route.fulfill({ status: 403, body: 'QA_EXTERNAL_NETWORK_BLOCKED' });
      if (!path.startsWith('/api/')) return route.continue();
      if (/(?:generate|prepare|purchase|payment|checkout|confirm)/i.test(path)) paid.push(path);
      const send = (json, status = 200) => route.fulfill({ json, status, headers: { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Credentials': 'true' } });
      if (path === '/api/auth/me') return send({ ok: true, authenticated: true, user: { id: 'qa-owner', _id: 'qa-owner', name: 'QA', role: 'user' } });
      if (path === '/api/billing/funnel-event') return send({ ok: true });
      return send({ ok: false, reason: 'QA_UNMOCKED_API' }, 503);
    });
    const page = await context.newPage();
    page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(120000);
    page.on('pageerror', error => errors.push(error.message));
    for (const [slug, material] of [['life-book-ai', 'book'], ['love-secret-ai', 'letter']]) {
      const detail = JSON.parse(await readFile(`public/feature-details/${slug}.json`, 'utf8'));
      const response = await page.goto(`${base}/features/${slug}/`, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200);
      const article = page.locator(`[data-fortune-material="${material}"]`);
      await article.waitFor();
      await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 0); });
      const image = article.locator('.fortuneObject img');
      const ratio = await image.evaluate(async el => { await el.decode(); return { painted: el.clientWidth / el.clientHeight, natural: el.naturalWidth / el.naturalHeight }; });
      assert.ok(Math.abs(ratio.painted - ratio.natural) < .01, 'Whole cover keeps its aspect ratio');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const sourceLinks = article.locator('.fortuneFounder li a');
      assert.deepEqual(await sourceLinks.evaluateAll(links => links.map(link => link.href)), records.map(record => record.url));
      assert.deepEqual(await article.locator('.fortuneFounder time').allTextContents(), records.map(record => record.date));
      const action = article.locator('.fortuneAction a');
      assert.equal(await action.getAttribute('href'), detail.href);
      assert.ok((await action.boundingBox()).height >= 44);
      assert.match(await article.locator('.fortuneFounderMethod').innerText(), /직접 답하는 방식은 아닙니다/);
      const stem = `${slug}-${width}-${colorScheme}`;
      await page.screenshot({ path: `${output}/${stem}-page.png`, caret: 'initial' });
      if ([360, 1280].includes(width) || colorScheme === 'dark') {
        await article.locator('.fortuneSample').screenshot({ path: `${output}/${stem}-sample.png`, caret: 'initial' });
        await article.locator('.fortuneFounder').screenshot({ path: `${output}/${stem}-founder.png`, caret: 'initial' });
      }
      results.push({ slug, width, colorScheme, surface: 'page', passed: true });
      console.log(`PASS ${stem} page`);
      if ([390, 1280].includes(width) && colorScheme === 'light') {
        // Component integration only: the actual host template and module, with
        // a mock original CTA. This does not claim catalogue-to-popup coverage.
        await page.goto(`${base}/__qa-premium-popup`, { waitUntil: 'load' });
        await page.evaluate(async ({ slug, title, price }) => {
          window.cdGetCurrentLanguage = () => 'ko';
          const overlay = document.getElementById('tilePvwOverlay');
          overlay.classList.add('pvw-open'); overlay.setAttribute('aria-hidden', 'false');
          document.getElementById('tilePvwTitle').textContent = title;
          document.getElementById('tilePvwCost').textContent = price;
          document.getElementById('tilePvwCtaBtn').textContent = '상담 시작하기';
          window.qaStarts = 0;
          document.getElementById('tilePvwCtaBtn').addEventListener('click', () => { window.qaStarts++; });
          const { mountFeatureDetailPreview } = await import('/js/feature-detail-preview.mjs');
          await mountFeatureDetailPreview(overlay, [slug]);
        }, { slug, title: detail.title, price: `${FEATURE_KEY_PRICE_TABLE[detail.featureKey].amountKRW.toLocaleString('ko-KR')}원` });
        const dialog = page.getByRole('dialog');
        await dialog.locator(`[data-fortune-material="${material}"]`).waitFor();
        await page.evaluate(async () => { await document.fonts.ready; });
        await dialog.locator('.fortuneObject img').evaluate(async el => { await el.decode(); });
        assert.equal(await dialog.locator('.fortuneFounder li').count(), 3);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.screenshot({ path: `${output}/${stem}-dialog.png`, caret: 'initial' });
        await dialog.locator('.fortuneAction button').click();
        assert.equal(await page.evaluate(() => window.qaStarts), 1, 'Hero delegates once to the existing host CTA');
        results.push({ slug, width, colorScheme, surface: 'popup-component', passed: true });
        console.log(`PASS ${stem} dialog`);
      }
      assert.deepEqual(paid, [], 'Detail viewing never starts paid work');
      assert.deepEqual(errors, []);
    }
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
}
console.log(`${results.length}/14 premium detail scenarios passed`);
