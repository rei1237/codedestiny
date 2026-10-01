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
const fixture = `<!doctype html><html lang="ko"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles/theme-tokens.css"><link rel="stylesheet" href="/styles/feature-marketing-detail.css">${styles}<style>body{margin:0;background:#100d14}.tile-pvw-overlay{transition:none!important}</style></head><body>${template}${siteShare}<script type="module">import {mountFeatureDetailPreview} from '/js/feature-detail-preview.mjs';window.openDetail=async slug=>{const overlay=document.getElementById('tilePvwOverlay');overlay.classList.add('pvw-open');overlay.setAttribute('aria-hidden','false');document.getElementById('tilePvwTitle').textContent=slug;document.getElementById('tilePvwPaywall').style.display='block';document.getElementById('tilePvwPaywallTitle').textContent='가격·이용 방법 확인 영역';await mountFeatureDetailPreview(overlay,[slug]);};window.nativeClicks=0;document.getElementById('tilePvwCtaBtn').addEventListener('click',()=>window.nativeClicks++);</script></body></html>`;
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
// Contract (2026-10-01): the Korean visual detail mirrors the original CTA into the hero and hides the sticky
// footer until that hero CTA scrolls away — exactly one CTA is visible at every scroll position. Colors vary by
// theme/material, so readability is a WCAG AA contrast floor, not fixed values. Each product has its own hero.
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(resolve, 50)))));
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
    // Fallback popup (non-Korean or no reviewed detail) keeps the legacy palette.
    const basePalette = await page.evaluate(() => {
      const overlay = document.getElementById('tilePvwOverlay');
      overlay.classList.add('pvw-open');
      document.getElementById('tilePvwTitle').textContent = '상세 제목';
      document.getElementById('tilePvwTagline').textContent = '상세 설명';
      document.getElementById('tilePvwFeats').innerHTML = '<li>상세 항목</li>';
      const palette = {
        title: getComputedStyle(document.getElementById('tilePvwTitle')).color,
        tagline: getComputedStyle(document.getElementById('tilePvwTagline')).color,
        feature: getComputedStyle(document.querySelector('.tile-pvw-feats li')).color,
      };
      overlay.classList.remove('pvw-open');
      return palette;
    });
    assert.deepEqual(basePalette, {
      title: 'rgb(60, 24, 48)',
      tagline: 'rgb(112, 68, 92)',
      feature: 'rgb(60, 24, 48)',
    }, `${width}: base popup palette`);
    for (const entry of catalog) {
      const label = `${width}/${entry.slug}`;
      const detailJson = JSON.parse(fs.readFileSync(path.join(root, 'public/feature-details', `${entry.slug}.json`), 'utf8'));
      // Close before reopening like the shell's _close(); closing is what disconnects the previous CTA observers.
      await page.evaluate(() => { window.nativeClicks = 0; document.getElementById('tilePvwOverlay').classList.remove('pvw-open'); });
      await settle(page);
      await page.evaluate(slug => window.openDetail(slug), entry.slug);
      const heroButton = page.locator('[data-feature-visual-host] [data-fortune-hero-action] .fortuneAction button');
      await heroButton.waitFor();
      await page.evaluate(async () => {
        document.querySelector('.tile-pvw-scroll').scrollTop = 0;
        try { await document.querySelector('.featureVisualDetail .featureDetailHero img')?.decode(); } catch {}
      });
      await settle(page);
      const measure = () => page.evaluate(() => {
        const parse = value => { const [r, g, b, a = 1] = value.match(/[\d.]+/g).map(Number); return { r, g, b, a }; };
        const over = (top, base) => ({ r: top.r * top.a + base.r * (1 - top.a), g: top.g * top.a + base.g * (1 - top.a), b: top.b * top.a + base.b * (1 - top.a), a: 1 });
        const backdrop = node => {
          const layers = [];
          for (let current = node; current; current = current.parentElement) {
            const color = parse(getComputedStyle(current).backgroundColor);
            if (color.a > 0) layers.push(color);
            if (color.a >= 1) break;
          }
          return layers.reduceRight((base, layer) => over(layer, base), { r: 255, g: 255, b: 255, a: 1 });
        };
        const luminance = ({ r, g, b }) => [r, g, b].map(channel => { const c = channel / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
        const contrast = node => {
          if (!node) return 0;
          const background = backdrop(node);
          const [hi, lo] = [luminance(over(parse(getComputedStyle(node).color), background)), luminance(background)].sort((a, b) => b - a);
          return Math.round((hi + 0.05) / (lo + 0.05) * 100) / 100;
        };
        const visible = rect => rect.height > 0 && rect.top >= -1 && rect.bottom <= window.innerHeight + 1;
        const scroll = document.querySelector('.tile-pvw-scroll');
        const scrollRect = scroll.getBoundingClientRect();
        const footer = document.querySelector('.tile-pvw-cta-sticky');
        const footerRect = footer.getBoundingClientRect();
        const cta = document.getElementById('tilePvwCtaBtn').getBoundingClientRect();
        const hero = document.querySelector('.featureVisualDetail .featureDetailHero');
        const heroButton = hero.querySelector('[data-fortune-hero-action] .fortuneAction button');
        const heroRect = heroButton.getBoundingClientRect();
        const art = hero.querySelector('img');
        return {
          overflow: document.querySelector('.tile-pvw-sheet').scrollWidth > document.querySelector('.tile-pvw-sheet').clientWidth + 1,
          heroVisible: visible(heroRect) && heroRect.bottom > scrollRect.top && heroRect.top < scrollRect.bottom,
          heroHeight: heroRect.height,
          footerShown: getComputedStyle(footer).display !== 'none' && footerRect.height > 0,
          ctaVisible: visible(cta),
          ctaHeight: cta.height,
          scrollBottom: scrollRect.bottom,
          footerTop: footerRect.top,
          conversionPrompts: document.querySelectorAll('[data-feature-conversion-request]').length,
          heading: contrast(hero.querySelector('.featureDetailBody > :is(h2,h3)')),
          body: contrast(hero.querySelector('.featureDetailBody > :is(h2,h3) + p')),
          button: contrast(heroButton),
          artSrc: art?.getAttribute('src'),
          artLoaded: Boolean(art?.complete && art.naturalWidth > 0),
        };
      });
      const atOpen = await measure();
      assert.equal(atOpen.overflow, false, `${label}: overflow at open`);
      assert.equal(atOpen.conversionPrompts, 0, `${label}: hero CTA mirror replaces the conversion prompt`);
      assert.ok(atOpen.heroVisible && atOpen.heroHeight >= 44, `${label}: hero CTA visible and touchable at open ${JSON.stringify(atOpen)}`);
      assert.equal(atOpen.footerShown, false, `${label}: sticky CTA hidden while hero CTA is reachable`);
      for (const [key, value] of Object.entries({ heading: atOpen.heading, body: atOpen.body, button: atOpen.button })) {
        assert.ok(value >= 4.5, `${label}: hero ${key} contrast ${value} < 4.5`);
      }
      assert.equal(atOpen.artSrc, detailJson.image, `${label}: product hero art`);
      assert.equal(atOpen.artLoaded, true, `${label}: hero art loaded`);
      await page.evaluate(() => { const scroll = document.querySelector('.tile-pvw-scroll'); scroll.scrollTop = scroll.scrollHeight; });
      await settle(page);
      const atEnd = await measure();
      assert.equal(atEnd.overflow, false, `${label}: overflow at end`);
      if (atEnd.heroVisible) {
        assert.equal(atEnd.footerShown, false, `${label}: never two CTAs ${JSON.stringify(atEnd)}`);
      } else {
        assert.ok(atEnd.footerShown && atEnd.ctaVisible && atEnd.ctaHeight >= 44, `${label}: sticky CTA visible and touchable after hero CTA scrolls away ${JSON.stringify(atEnd)}`);
        assert.ok(atEnd.scrollBottom <= atEnd.footerTop + 1, `${label}: body behind CTA`);
      }
      await page.locator('[data-feature-share="copy"]').click();
      const copied = await page.evaluate(() => window.copiedUrl);
      assert.equal(new URL(copied).pathname, `/features/${entry.slug}/`);
      assert.equal(new URL(copied).searchParams.get('utm_medium'), 'share');
      assert.equal(await page.evaluate(() => window.nativeClicks), 0, `${label}: no implicit checkout`);
      await page.evaluate(() => { document.querySelector('.tile-pvw-scroll').scrollTop = 0; });
      await heroButton.click();
      assert.equal(await page.evaluate(() => window.nativeClicks), 1, `${label}: hero CTA delegates exactly once`);
      if (['sukyo', 'ziwei', 'neo-operation-room'].includes(entry.slug) && width === 390) {
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
  console.log(`PASS: ${catalog.length} actual popup details × 4 widths; one CTA at every scroll position, hero CTA delegates once, AA contrast, per-product hero; no checkout/API calls (existing CDN images allowed); captures ${captureDir}`);
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
