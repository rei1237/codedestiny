import './lib/mock-network-guard.cjs';
import { chromium, webkit } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = resolve(root, '.' + (['/', '/ggulggul/'].includes(pathname) ? '/index.html' : pathname));
  if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try {
    const data = await readFile(file).catch(() => readFile(resolve(root, 'public', '.' + pathname)));
    res.setHeader('content-type', ({ '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml' })[extname(file)] || 'application/octet-stream');
    res.end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
try {
  for (const [name, engine, width] of [['chromium', chromium, 1280], ['chromium', chromium, 390], ... (process.argv.includes('--chromium') ? [] : [['webkit', webkit, 390]])]) {
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.pathname.startsWith('/api/')) {
          await route.fulfill({ json: url.pathname === '/api/auth/me' ? { ok: true, authenticated: true, user: { id: 'mock-stability', name: '검증' } } : { ok: true, profiles: [], unlocks: [], data: {} } }); return;
        }
        if (url.origin !== origin) { await route.abort(); return; }
        await route.continue();
      });
      await context.addInitScript(() => {
        sessionStorage.setItem('privacyAgreed', 'true');
        window.__stabilityTrace = [];
        const descriptor = Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype, 'display');
        if (descriptor?.set) Object.defineProperty(CSSStyleDeclaration.prototype, 'display', { ...descriptor, set(value) {
          for (const id of ['resultPage', 'inputPage']) if (document.getElementById(id)?.style === this) window.__stabilityTrace.push({ id, value, stack: new Error().stack });
          descriptor.set.call(this, value);
        } });
      });
      const page = await context.newPage();
      page.on('dialog', d => d.dismiss());
      page.on('pageerror', e => console.log('pageerror', e.message));
      await page.goto(origin, { waitUntil: 'domcontentloaded' });
      if (await page.locator('#cdhMore:not([open]) > summary').count()) await page.locator('#cdhMore > summary').click();
      await page.locator('#cdQuickServices a[data-action="cdOneStepFreeSajuEntry"]').click();
      await page.locator('#birthDate').fill('19900515');
      await page.locator('#nameInput').fill('안정성검증');
      await page.evaluate(() => {
        for (const id of ['resultPage', 'inputPage']) {
          const style = document.getElementById(id)?.style;
          if (style) Object.defineProperty(style, 'display', { configurable: true, get() { return this.getPropertyValue('display'); }, set(value) { window.__stabilityTrace.push({ id, value, stack: new Error().stack }); this.setProperty('display', value); } });
        }
      });
      await page.locator('#run-btn').click();
      await page.waitForFunction(() => window.G_PILLARS && document.getElementById('resultPage')?.style.visibility === 'visible', null, { timeout: 60000 });
      await page.evaluate(() => {
        window.dispatchEvent(new ErrorEvent('error', { message: 'mock optional renderer error' }));
        window.dispatchEvent(new Event('pageshow'));
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await page.waitForTimeout(600);
      const state = await page.evaluate(() => ({ result: getComputedStyle(document.getElementById('resultPage')).display, input: getComputedStyle(document.getElementById('inputPage')).display, inputStyle: document.getElementById('inputPage').getAttribute('style'), resultStyle: document.getElementById('resultPage').getAttribute('style'), trace: window.__stabilityTrace, url: location.href }));
      console.log(JSON.stringify({ name, width, ...state }));
      assert.notEqual(state.result, 'none');
      assert.equal(state.input, 'none');
      await context.close();
    } finally { await browser.close(); }
  }
} finally { await new Promise(r => server.close(r)); }
