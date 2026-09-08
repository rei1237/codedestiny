// Local static-shell integration: no live APIs, payment providers or remote assets.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { resolve, join, sep, extname } from 'node:path';
import assert from 'node:assert/strict';

const root = resolve('public');
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  const path = resolve(root, `.${new URL(req.url, 'http://localhost').pathname}`);
  if (path !== root && !path.startsWith(root + sep)) return res.writeHead(403).end();
  const file = existsSync(path) && statSync(path).isDirectory() ? join(path, 'index.html') : path;
  if (!existsSync(file)) return res.writeHead(404).end();
  res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
  res.end(readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const results = [];
try {
  browser = await chromium.launch({ headless: true });
  for (const [path, lang] of [['en', 'en'], ['ja', 'ja'], ['zh', 'zh-CN'], ['zh-tw', 'zh-TW']]) {
    for (const [width, preference] of [[390, 'ko'], [1440, null]]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) return route.abort();
        if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"data":null}' });
        return route.continue();
      });
      if (preference) await context.addInitScript(() => {
        localStorage.setItem('cd_lang', 'ko');
        localStorage.setItem('cd_lang_ack', '1');
        localStorage.setItem('cd_lang_explicit', '1');
      });
      const page = await context.newPage();
      await page.goto(`${origin}/${path}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(expected => window.cdGetCurrentLanguage?.() === expected && document.documentElement.lang === expected && !/[가-힣]/.test(document.querySelector('#cdhTitle')?.textContent || '한국어'), lang);
      const reading = await page.evaluate(() => ({
        lang: document.documentElement.lang,
        title: document.querySelector('#cdhTitle').textContent,
        remainingKoreanLeaves: [...document.querySelectorAll('#cdHomeFunnel *')].filter(el => !el.children.length && /[가-힣]/.test(el.textContent)).length,
      }));
      await page.locator('[data-cdh-free]').first().click();
      await page.locator('#destinyCardForm').waitFor({ state: 'visible' });
      await page.evaluate(() => window.changeLanguage('ko'));
      await page.waitForFunction(() => document.documentElement.lang === 'ko' && window.cdGetCurrentLanguage() === 'ko');
      await page.evaluate(expected => window.changeLanguage(expected), lang);
      await page.waitForFunction(expected => document.documentElement.lang === expected && window.cdGetCurrentLanguage() === expected, lang);
      assert.equal(await page.locator('#destinyCardForm').isVisible(), true);
      results.push({ path: `/${path}/`, width, preference, ...reading, formVisibleAfterLanguageSwitch: true });
      await context.close();
    }
  }
  writeFileSync('docs/seo/LOCALE_RUNTIME_VALIDATION.json', JSON.stringify({ mode: 'local public shell, external requests blocked, API mocked; not field CWV or production evidence', results }, null, 2) + '\n');
  console.log(JSON.stringify({ passed: true, cases: results.length, results }));
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
