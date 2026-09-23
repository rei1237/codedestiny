import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';

const base = process.env.CONSULTATION_TEST_BASE || 'http://127.0.0.1:14123';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
const directory = 'build-cache/book-card-sharing';
await mkdir(directory, { recursive: true });
const products = [
  { key: 'life-book-ai', button: '표지 공유하기', kind: 'book', file: 'book-share.png' },
  { key: 'love-secret-ai', button: '요약 카드를 이미지로 저장하거나 공유', kind: 'letter', file: 'letter-share.png' },
];
const results = [];
const fontCache = new Map();
const built = await build({ entryPoints: ['lib/dev-preview/fixtures/love-secret.ts'], bundle: true, platform: 'node', format: 'cjs', write: false });
const fixtureModule = { exports: {} };
new Function('require', 'module', 'exports', built.outputFiles[0].text)(createRequire(import.meta.url), fixtureModule, fixtureModule.exports);
const unsavedLove = { ...fixtureModule.exports.buildLoveSecretPreviewPayload('success'), saved: false };
const browser = await chromium.launch({ headless: true });
try {
  for (const [width, colorScheme] of [[360, 'light'], [390, 'light'], [430, 'light'], [1280, 'light'], [390, 'dark']]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, colorScheme, reducedMotion: 'reduce', serviceWorkers: 'block', acceptDownloads: true });
    context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(120000);
    await context.addCookies([{ name: 'fortune_auth_role', value: 'user', url: base }]);
    const writes = [], errors = [];
    await context.addInitScript(() => {
      window.__native = []; window.__cancelShare = false;
      Object.defineProperty(navigator, 'share', { configurable: true, value: async data => {
        if (window.__cancelShare) throw new DOMException('cancelled', 'AbortError');
        const files = await Promise.all((data.files || []).map(async file => {
          const bytes = new Uint8Array(await file.arrayBuffer());
          let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
          return { name: file.name, type: file.type, size: file.size, base64: btoa(binary) };
        }));
        window.__native.push({ ...data, files });
      } });
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname;
      const send = (body, status = 200) => route.fulfill({ status, json: body, headers: { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Credentials': 'true' } });
      // Existing public font files are read-only assets; no external API is allowed.
      if (request.method() === 'GET' && url.origin === 'https://assets.code-destiny.com' && /^\/fonts\/serif-(kr|latin)\/[a-f0-9]+\.woff2$/.test(path)) {
        // Use cached copies of the public brand fonts. R2 production CORS does
        // not permit localhost; neither tests nor production policy bypass it.
        if (!fontCache.has(url.href)) fontCache.set(url.href, readFile(`build-cache/premium-fonts/${path.slice('/fonts/'.length)}`));
        return route.fulfill({ body: await fontCache.get(url.href), contentType: 'font/woff2', headers: { 'Access-Control-Allow-Origin': '*' } });
      }
      if (url.origin !== base && !(url.hostname === 'yeongnyangi-qa.example.invalid' && path.startsWith('/api/'))) return route.fulfill({ status: 403, body: 'QA_EXTERNAL_NETWORK_BLOCKED' });
      if (!path.startsWith('/api/')) return route.continue();
      if (request.method() !== 'GET' && path !== '/api/billing/funnel-event') writes.push(path);
      if (path === '/api/auth/me') return send({ ok: true, authenticated: true, user: { id: 'qa-owner', _id: 'qa-owner', name: 'QA', role: 'user' } });
      if (path === '/api/auth/refresh') return send({ ok: false }, 401);
      if (path === '/api/billing/funnel-event') return send({ ok: true });
      if (path === '/api/love-secret-ai/result/PRIVATE_UNSAVED') return send(unsavedLove);
      return send({ ok: false, reason: 'QA_UNMOCKED_API' }, 503);
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    for (const product of products) {
      for (const state of ['success', 'legacy']) {
        await page.goto(`${base}/${product.key}/result/?cid=PRIVATE_RESULT&attemptId=PRIVATE_ATTEMPT&preview=${state}`, { waitUntil: 'domcontentloaded' });
        const button = page.getByRole('button', { name: product.button, exact: true });
        try { await button.waitFor(); } catch (error) {
          await page.screenshot({ path: `${directory}/failure-${product.key}-${width}-${colorScheme}.png` });
          console.error(await page.locator('body').innerText());
          throw error;
        }
        if (state === 'success') {
          await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 0); });
          assert.ok(await page.evaluate(() => [...document.fonts].some(font => font.family === 'CodeDestinySerifKR' && font.status === 'loaded')), 'Korean serif loaded');
          await page.screenshot({ path: `${directory}/${product.key}-top-${width}-${colorScheme}.png` });
          const bounds = await button.boundingBox();
          assert.ok(bounds.height >= 44, 'Share button touch target');
        }
        await button.click();
        const editor = page.locator(`[data-premium-share="${product.kind}"]`);
        await editor.waitFor();
        assert.equal(await editor.evaluate(node => node.open), true, 'share editor opens before transmission');
        const card = editor.locator('figure > div');
        assert.doesNotMatch(await card.innerText(), /PRIVATE_RESULT|PRIVATE_ATTEMPT/);
        assert.equal(await editor.getByRole('checkbox').isChecked(), false, 'name hidden by default');
        await editor.getByRole('checkbox').check();
        assert.equal(await editor.getByRole('checkbox').isChecked(), true);
        await editor.getByRole('checkbox').uncheck();
        const message = `공유 전에 고른 문장 ${width}`;
        await editor.getByRole('textbox', { name: '공유할 문구' }).fill(message);
        assert.ok((await card.innerText()).includes(message), 'edited text appears in card preview');
        await editor.getByRole('button', { name: '이미지 공유' }).click();
        await page.waitForFunction(() => window.__native.length === 1);
        const shared = await page.evaluate(() => window.__native[0]);
        assert.equal(shared.url, `https://code-destiny.com/${product.key}/`);
        assert.equal(shared.files[0].name, product.file);
        assert.equal(shared.files[0].type, 'image/png');
        assert.ok(shared.files[0].size > 10000);
        assert.doesNotMatch(JSON.stringify({ ...shared, files: shared.files.map(({ name, type, size }) => ({ name, type, size })) }), /PRIVATE_/);
        if (state === 'success') {
          await writeFile(`${directory}/${product.key}-${width}-${colorScheme}.png`, Buffer.from(shared.files[0].base64, 'base64'));
          const reading = page.locator(product.key === 'life-book-ai' ? '#life-book-chapter-deck' : '[data-view]').first();
          if (await reading.count()) {
            await reading.evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
            await page.screenshot({ path: `${directory}/${product.key}-reading-${width}-${colorScheme}.png` });
          }
          await page.evaluate(() => { window.__cancelShare = true; });
          await editor.getByRole('button', { name: '이미지 공유' }).click();
          await editor.getByText('공유를 취소했어요.', { exact: true }).waitFor();
          assert.equal(await page.evaluate(() => window.__native.length), 1);
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        results.push({ width, colorScheme, product: product.key, state, passed: true });
        console.log(`PASS ${width} ${product.key} ${state}`);
      }
      await page.goto(`${base}/${product.key}/result/?cid=PRIVATE_RESULT&attemptId=PRIVATE_ATTEMPT&preview=failed`, { waitUntil: 'networkidle' });
      assert.equal(await page.getByRole('button', { name: product.button, exact: true }).count(), 0);
      results.push({ width, product: product.key, state: 'failed', passed: true });
      console.log(`PASS ${width} ${product.key} failed`);
    }
    await page.goto(`${base}/love-secret-ai/result/?sessionId=PRIVATE_UNSAVED`, { waitUntil: 'domcontentloaded' });
    const unsavedButton = page.getByRole('button', { name: products[1].button, exact: true });
    await unsavedButton.waitFor();
    assert.equal(await unsavedButton.isDisabled(), true);
    assert.equal(await page.evaluate(() => window.__native.length), 0);
    results.push({ width, product: 'love-secret-ai', state: 'unsaved', passed: true });
    console.log(`PASS ${width} love-secret-ai unsaved`);
    assert.deepEqual(writes, [], 'No paid/generation API writes are allowed');
    assert.deepEqual(errors, [], 'No uncaught page errors');
    await context.close();
  }
  await writeFile(`${directory}/results.json`, JSON.stringify(results, null, 2));
  console.log(`PASS ${results.length} book-card sharing scenarios`);
} finally { await browser.close(); }
