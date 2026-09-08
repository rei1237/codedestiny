import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import os from 'node:os';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const shell = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const template = [...shell.matchAll(/<template\b[^>]*>([\s\S]*?)<\/template>/g)].map(match => match[1]).find(text => text.includes('id="tilePvwOverlay"'));
assert.ok(template, 'actual popup template');
const styles = [...shell.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/g)].map(match => match[0]).join('\n');
const siteShare = shell.match(/<section id="cdPublicSiteShare"[\s\S]*?<\/section>/)?.[0];
assert.ok(siteShare, 'actual site share section');
const fixture = `<!doctype html><html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles/theme-tokens.css">${styles}<style>body{margin:0;background:#100d14}.tile-pvw-overlay{transition:none!important}</style></head><body>${template}${siteShare}<script type="module">import {mountFeatureDetailPreview} from '/js/feature-detail-preview.mjs';window.openDetail=async slug=>{const overlay=document.getElementById('tilePvwOverlay');overlay.classList.add('pvw-open');overlay.setAttribute('aria-hidden','false');document.getElementById('tilePvwTitle').textContent=slug;document.getElementById('tilePvwPaywall').style.display='block';document.getElementById('tilePvwPaywallTitle').textContent='가격·이용 방법 확인 영역';await mountFeatureDetailPreview(overlay,[slug]);};window.nativeClicks=0;document.getElementById('tilePvwCtaBtn').addEventListener('click',()=>window.nativeClicks++);</script></body></html>`;
const server = http.createServer((request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;
  if (pathname === '/') { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(fixture); return; }
  const relative = decodeURIComponent(pathname).replace(/^\//, '');
  if (!/^(js|styles|feature-details|fonts)\//.test(relative) || relative.split('/').includes('..')) { response.writeHead(404).end(); return; }
  const file = [path.join(root, relative), path.join(root, 'public', relative)].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (!file) { response.writeHead(404).end(); return; }
  response.setHeader('Content-Type', ({ '.mjs': 'text/javascript', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream');
  response.end(fs.readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'public/feature-details/catalog.json'), 'utf8'));
const captureDir = path.join(os.tmpdir(), 'code-destiny-popup-journey');
fs.mkdirSync(captureDir, { recursive: true });
let browser;
try {
  browser = await chromium.launch();
  for (const width of [360, 390, 430, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: 'reduce' });
    const errors = [], external = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { window.sharedPayload = data; } });
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async url => { window.copiedUrl = url; } } });
    });
    await page.route('**/*', route => {
      if (route.request().resourceType() === 'image' && new URL(route.request().url()).hostname === 'assets.code-destiny.com') return route.continue();
      if (new URL(route.request().url()).origin !== origin) { external.push(route.request().url()); return route.abort(); }
      return route.continue();
    });
    await page.goto(origin);
    await page.waitForFunction(() => typeof window.openDetail === 'function');
    for (const entry of catalog) {
      await page.evaluate(slug => window.openDetail(slug), entry.slug);
      const prompt = page.locator('[data-feature-conversion-request]').first();
      await prompt.waitFor();
      assert.equal(await page.locator('.featureDetailStandaloneLink').count(), 0);
      await prompt.click();
      assert.equal(await page.evaluate(() => window.nativeClicks), 0, `${entry.slug}: no implicit checkout`);
      const layout = await page.evaluate(() => {
        const sheet = document.querySelector('.tile-pvw-sheet');
        const scroll = document.querySelector('.tile-pvw-scroll');
        const cta = document.getElementById('tilePvwCtaBtn').getBoundingClientRect();
        return { overflow: sheet.scrollWidth > sheet.clientWidth + 1, ctaBottom: cta.bottom, ctaHeight: cta.height, scrollBottom: scroll.getBoundingClientRect().bottom, footerTop: document.querySelector('.tile-pvw-cta-sticky').getBoundingClientRect().top };
      });
      assert.equal(layout.overflow, false, `${width}/${entry.slug}: overflow`);
      assert.ok(layout.ctaBottom <= 845 && layout.ctaHeight >= 44, `${width}/${entry.slug}: CTA visible and touchable ${JSON.stringify(layout)}`);
      assert.ok(layout.scrollBottom <= layout.footerTop + 1, `${width}/${entry.slug}: body behind CTA`);
      await page.locator('[data-feature-share="copy"]').click();
      const copied = await page.evaluate(() => window.copiedUrl);
      assert.equal(new URL(copied).pathname, `/features/${entry.slug}/`);
      assert.equal(new URL(copied).searchParams.get('utm_medium'), 'share');
      assert.equal(await page.evaluate(() => window.nativeClicks), 0);
      if (['sukyo', 'ziwei', 'neo-operation-room'].includes(entry.slug) && width === 390) {
        await page.evaluate(() => { document.querySelector('.tile-pvw-scroll').scrollTop = 0; });
        await page.screenshot({ path: path.join(captureDir, `${entry.slug}-${width}.png`) });
      }
    }
    // Closing/reopening to another feature must leave only the current visual host.
    assert.equal(await page.locator('[data-feature-visual-host]').count(), 1);
    await page.locator('[data-feature-visual-host] [data-feature-share="site"]').click();
    assert.equal(new URL(await page.evaluate(() => window.sharedPayload.url)).pathname, '/');
    await page.evaluate(() => document.getElementById('tilePvwOverlay').classList.remove('pvw-open'));
    await page.locator('#cdPublicSiteShare [data-feature-share="site-copy"]').click();
    assert.equal(new URL(await page.evaluate(() => window.copiedUrl)).pathname, '/');
    await page.evaluate(() => { document.documentElement.lang = 'en'; });
    assert.equal(await page.locator('#cdPublicSiteShare').isVisible(), false);
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    await page.close();
  }
  console.log(`PASS: ${catalog.length} actual popup details × 4 widths; no checkout/API calls (existing CDN images allowed); captures ${captureDir}`);
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
