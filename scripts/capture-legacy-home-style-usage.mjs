// Re-record now and then so new markup and rules can be split too. Edits made
// after a capture never break the page: they only keep more CSS (see
// optimize-legacy-home-paint.mjs). Run against a clean production export built
// with CD_RECORD_HOME_STYLES=1 (the final split is skipped).
// node scripts/capture-legacy-home-style-usage.mjs <dist-directory>
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { JSDOM, VirtualConsole } from 'jsdom';
import postcss from 'postcss';
import { homeSignatures, ruleKey, trackedSheet, usageFile } from './optimize-legacy-home-paint.mjs';

const dist = path.resolve(process.argv[2] || 'dist');
const shell = readFileSync(path.join(dist, 'ggulggul/index.html'), 'utf8');
if (shell.includes('data-home-workflow-css')) throw new Error('Rebuild with CD_RECORD_HOME_STYLES=1 before capturing.');
const dom = new JSDOM(shell, { includeNodeLocations:true, virtualConsole: new VirtualConsole() });
const elements = homeSignatures(dom.window.document);
dom.window.close();

const origin = 'http://127.0.0.1:51389';
const mime = { css:'text/css', js:'text/javascript', mjs:'text/javascript', html:'text/html; charset=utf-8', woff2:'font/woff2', json:'application/json', webp:'image/webp', avif:'image/avif', svg:'image/svg+xml' };
const usage = new Map();
const browser = await chromium.launch({ channel:'chrome' });
try {
  for (const width of [390,1440]) for (const theme of ['pig','neo']) {
    const ctx = await browser.newContext({ viewport:{ width,height:width === 390 ? 844 : 960 }, isMobile:width === 390, serviceWorkers:'block', locale:'ko-KR', reducedMotion:theme === 'neo' ? 'reduce' : 'no-preference' });
    await ctx.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname.startsWith('/api/')) return route.fulfill({ status:401, contentType:'application/json', body:'{"ok":false}' });
      const file = path.join(dist, decodeURIComponent(url.pathname), url.pathname.endsWith('/') ? 'index.html' : '');
      if (!file.startsWith(dist + path.sep) || !existsSync(file) || !statSync(file).isFile()) return route.fulfill({status:404, body:''});
      return route.fulfill({path:file, contentType:mime[path.extname(file).slice(1)] || 'application/octet-stream'});
    });
    await ctx.addInitScript(theme => { localStorage.setItem('fortuneThemeModeStateV1',theme); }, theme);
    const page = await ctx.newPage();
    await page.coverage.startCSSCoverage({ resetOnNavigation:false });
    await page.goto(origin + '/ggulggul/', { waitUntil:'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.locator(width === 390 ? '#cdMobileBottomNav [data-nav-key=my]' : '#cdhGuestGardenBtn').click();
    await page.locator('#cdAccountSheet[open]').waitFor();
    await page.keyboard.press('Escape');
    await page.locator('.yh-finder-cta').click();
    await page.locator('#homeFinderQuery').fill('흑월');
    await page.locator('[data-home-search] button[type=submit]').first().click();
    await page.locator('#cdAllFortunesResults a[href="/heukwol/"]').waitFor();
    for (const sheet of await page.coverage.stopCSSCoverage()) {
      if (!sheet.url.startsWith(origin)) continue;
      const name = new URL(sheet.url).pathname;
      if (!trackedSheet(name, statSync(path.join(dist,name)).size)) continue;
      if (!usage.has(name)) usage.set(name, []);
      usage.get(name).push(...sheet.ranges);
    }
    await ctx.close();
  }
} finally { await browser.close(); }

// A selector counts as used if any of its rules ran in any sheet or session.
const seen = new Set(), used = new Set();
for (const [name, ranges] of usage) {
  postcss.parse(readFileSync(path.join(dist,name),'utf8')).walkRules(rule => {
    if (rule.parent?.name?.endsWith('keyframes')) return;
    const key = ruleKey(rule), { start, end } = rule.source;
    seen.add(key);
    if (ranges.some(r => r.start < end.offset && r.end > start.offset)) used.add(key);
  });
}
const unused = [...seen].filter(key => !used.has(key)).sort();
writeFileSync(usageFile, JSON.stringify({version:2,elements,unused},null,0) + '\n');
console.log('[capture] ' + usage.size + ' sheets, ' + seen.size + ' selectors, ' + unused.length + ' unused, ' + elements.length + ' element signatures');
