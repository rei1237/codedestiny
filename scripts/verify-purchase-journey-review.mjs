import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../docs/purchase-journey/', import.meta.url));
const captures = path.join(os.tmpdir(), 'code-destiny-purchase-journey');
fs.mkdirSync(captures, { recursive: true });
const allowed = new Set(['review.html', 'review.css', 'review.js', 'inventory.json']);
const server = http.createServer((request, response) => {
  const name = new URL(request.url, 'http://localhost').pathname.slice(1);
  if (!allowed.has(name)) { response.writeHead(404); response.end(); return; }
  response.setHeader('Content-Type', { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', json: 'application/json' }[name.split('.').pop()]);
  response.end(fs.readFileSync(path.join(root, name)));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const errors = [], forbidden = [];
  for (const width of [360, 390, 430, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
      if (new URL(route.request().url()).origin !== origin) { forbidden.push(route.request().url()); return route.abort(); }
      return route.continue();
    });
    await page.goto(`${origin}/review.html`);
    await page.locator('#shown').filter({ hasText: '후보 표시' }).waitFor({ state: 'attached' });
    for (const view of ['home', 'detail', 'checkout', 'result', 'audit']) {
      await page.locator(`.review-tools [data-view=${view}]`).click();
      assert.equal(await page.locator(`#${view}`).isVisible(), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow ${width}/${view}`);
      const small = await page.locator('button:visible').evaluateAll(nodes => nodes.filter(n => n.getBoundingClientRect().height < 44).map(n => n.textContent));
      assert.deepEqual(small, [], `touch targets ${width}/${view}`);
      if (view !== 'audit') await page.screenshot({ path: path.join(captures, `${width}-${view}.png`), fullPage: true });
    }
    await page.locator('#search').fill('sukuyo');
    assert.ok(await page.locator('.record').count() > 0);
    await page.locator('.review-tools [data-view=home]').click();
    await page.locator('.concerns [data-concern=self]').click();
    assert.equal(await page.locator('#recommend-title').textContent(), '자미두수');
    await page.locator('.recommend [data-view=detail]').click();
    assert.equal(await page.locator('#product-name').textContent(), '자미두수');
    await page.locator('.review-tools [data-view=checkout]').click();
    assert.equal(await page.locator('.choice button:disabled').count(), 3);
    await page.close();
  }
  assert.deepEqual(errors, [], 'browser errors');
  assert.deepEqual(forbidden, [], 'external network requests');
  console.log(`PASS: 4 widths × 5 views; concern/detail navigation; inventory search; no external requests. Captures: ${captures}`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
