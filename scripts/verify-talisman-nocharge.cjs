// Isolated component verification. No native device, Play purchase, API or DB access.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const { chromium } = require('playwright');

async function main() {
  const root = path.resolve(__dirname, '..');
  const output = path.resolve(process.argv[2] || path.join(root, '.tmp/talisman-nocharge'));
  fs.mkdirSync(output, { recursive: true });
  const bundle = await build({
    stdin: { contents: 'import React from "react"; import {createRoot} from "react-dom/client"; import Studio from "./app/app/talismans/TalismanStudio"; createRoot(document.getElementById("root")).render(<Studio/>);', resolveDir: root, loader: 'tsx' },
    bundle: true, write: false, platform: 'browser', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
    alias: { '@': root },
  });
  const css = ['app/yeongnyangi/night-tokens.css', 'app/app/talismans/talismans.css'].map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
  const html = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><style>body{margin:0;font-family:"Malgun Gothic",sans-serif;background:#0b1220}*{box-sizing:border-box}:root{--font-serif:Georgia,serif}' + css + '</style><div id="root"></div><script src="/bundle.js"></script>';
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); return; }
    if (url.pathname === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles[0].contents); return; }
    if (url.pathname.startsWith('/assets/talismans/originals/') && /^[a-z0-9-]+\.png$/.test(path.basename(url.pathname))) {
      const file = path.join(root, 'public', url.pathname);
      if (fs.existsSync(file)) { res.setHeader('Content-Type', 'image/png'); res.end(fs.readFileSync(file)); return; }
    }
    res.writeHead(404); res.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const results = [];
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    for (const locale of ['ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'vi', 'hi', 'es', 'fr', 'de', 'nl', 'ms']) {
      const context = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 });
      const denied = [];
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.hostname !== '127.0.0.1' || url.pathname.startsWith('/api/')) { denied.push(url.origin + url.pathname); return route.abort(); }
        return route.continue();
      });
      await context.addInitScript(() => {
        window.__exports = [];
        window.__exportResult = { status: 'applied' };
        window.Capacitor = { getPlatform: () => 'android', Plugins: { CodeDestinyWallpaper: {
          getScreenInfo: async () => ({ width: 1080, height: 2400 }),
          exportImage: async input => {
            window.__exports.push({ action: input.action, target: input.target, fileName: input.fileName, bytes: input.base64.length });
            if (window.__exportError) throw { code: window.__exportError };
            return window.__exportResult;
          },
        } } };
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}/?lang=${locale}`);
      const apply = page.locator('.cd-talisman-actions button').first();
      await page.waitForFunction(() => document.querySelector('.cd-talisman main') || document.querySelector('.cd-talisman img')?.complete);
      await apply.waitFor({ state: 'visible' });
      await page.waitForFunction(() => !document.querySelector('.cd-talisman-actions button')?.disabled);
      assert.equal(await page.locator('main').getAttribute('lang'), locale);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: path.join(output, `component-${locale}.png`), fullPage: true });
      await page.locator('.cd-talisman-controls fieldset').nth(3).evaluate(element => element.scrollIntoView({ block: 'start' }));
      const fitBox = await page.locator('.cd-talisman-controls fieldset').nth(3).boundingBox();
      const statusBox = await page.locator('[role="status"]').boundingBox();
      await page.screenshot({ path: path.join(output, `controls-${locale}.png`), clip: { x: fitBox.x, y: fitBox.y, width: fitBox.width, height: statusBox.y + statusBox.height - fitBox.y } });
      await apply.click();
      await page.waitForFunction(() => window.__exports.length === 1 && !document.querySelector('.cd-talisman-actions button')?.disabled);
      const exported = await page.evaluate(() => window.__exports[0]);
      assert.equal(exported.action, 'wallpaper'); assert.equal(exported.target, 'lock'); assert(exported.bytes > 1000);
      const applied = await page.locator('[role="status"]').innerText();
      const states = {};
      for (const code of ['WALLPAPER_UNSUPPORTED', 'WALLPAPER_NOT_ALLOWED', 'PHOTO_PERMISSION_DENIED', 'IMAGE_EXPORT_FAILED']) {
        await page.evaluate(value => { window.__exportError = value; }, code);
        await apply.click();
        await page.waitForFunction(() => !document.querySelector('.cd-talisman-actions button')?.disabled);
        states[code] = await page.locator('[role="status"]').innerText();
        assert(states[code] && states[code] !== applied);
      }
      const returnStates = {};
      for (const [status, button] of [['returned', 1], ['cancelled', 2], ['saved', 2], ['opened', 3]]) {
        await page.evaluate(value => { window.__exportError = null; window.__exportResult = { status: value }; }, status);
        await page.locator('.cd-talisman-actions button').nth(button).click();
        await page.waitForFunction(() => !document.querySelector('.cd-talisman-actions button')?.disabled);
        returnStates[status] = await page.locator('[role="status"]').innerText();
        assert(returnStates[status] && returnStates[status] !== applied);
      }
      assert.equal(new Set(Object.values(returnStates)).size, 4, 'Cancellation, save, picker return and chooser opening must differ');
      assert.equal(errors.length, 0, errors.join('\n'));
      assert.equal(denied.length, 0, 'Unexpected external request');
      results.push({ locale, applied, errorMessages: states, returnStates, externalRequests: denied.length, pageErrors: errors, source: 'actual React component; mocked Android bridge; not device evidence' });
      await context.close();
    }
    fs.writeFileSync(path.join(output, 'component-verification.json'), JSON.stringify({ status: 'passed', deviceVerified: false, results }, null, 2) + '\n');
    console.log('PASS: 12 locales; lock target PNG export; 4 error states per locale; no overflow or external requests. Android bridge mocked.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
