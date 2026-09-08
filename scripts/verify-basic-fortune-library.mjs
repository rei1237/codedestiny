import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const phase = process.argv.includes('--baseline') ? 'before' : 'after';
const output = path.join(root, '.impeccable', 'basic-fortune', phase);
await fs.mkdir(output, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.wasm': 'application/wasm', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const profile = { id: 'mock-reader', name: '서연', gender: 'F', birth: { year: 1990, month: 10, day: 14, hour: 14, minute: 30, calType: 'solar' }, location: { lat: 37.5665, lng: 126.978, tzOffset: 9, name: '서울' } };
const browser = await chromium.launch();
const results = [];
const baselineFiles = new Map();
if (phase === 'before') {
  const changed = execFileSync('git', ['diff', '--name-only', 'origin/main'], { cwd: root, encoding: 'utf8' }).trim().split('\n');
  for (const name of changed) {
    try { baselineFiles.set(path.resolve(root, name), execFileSync('git', ['show', 'origin/main:' + name], { cwd: root, maxBuffer: 20 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] })); } catch {}
  }
}
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  const requests = [];
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    // Fail closed: no test traffic ever reaches a live API, analytics or asset host.
    if (url.pathname.startsWith('/api/')) {
      requests.push({ path: url.pathname, method: route.request().method() });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, authenticated: false, profiles: [], unlocked: false, data: [] }) });
    }
    if (url.hostname !== '127.0.0.1') return route.abort();
    const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname).slice(1);
    const candidates = [path.resolve(root, relative), path.resolve(root, 'public', relative)];
    for (const candidate of candidates) {
      if (!candidate.startsWith(root + path.sep)) continue;
      try { return await route.fulfill({ status: 200, contentType: mime[path.extname(candidate)] || 'application/octet-stream', body: baselineFiles.get(candidate) || await fs.readFile(candidate) }); } catch {}
    }
    return route.fulfill({ status: 404, body: 'Local fixture not found' });
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__fortuneMetrics = { lcp: 0, cls: 0 };
    new PerformanceObserver(list => list.getEntries().forEach(e => { window.__fortuneMetrics.lcp = e.startTime; })).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver(list => list.getEntries().forEach(e => { if (!e.hadRecentInput) window.__fortuneMetrics.cls += e.value; })).observe({ type: 'layout-shift', buffered: true });
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:47831/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async profile => {
    await window.__cdEnsureDestinyProfileLoaded();
    const storage = window.DestinyProfileManager.storage;
    storage.save([profile]); storage.setCurrent(profile.id);
    await window.__cdEnsureBirthModalDepsLoaded();
  }, profile);
  for (const type of ['sukuyo', 'astro', 'ziwei']) {
    const ids = { sukuyo: 'sukuyoSection', astro: 'astroResult', ziwei: 'ziweiModalSection' };
    const start = Date.now();
    await page.evaluate(() => window.dpLoadProfile());
    await page.locator('.dp-fsel-btn--' + type).click();
    await page.waitForFunction(({ type, id }) => {
      const area = document.getElementById(id);
      return area && (type === 'sukuyo' ? area.querySelector('#lunarNexusApp') : type === 'astro' ? area.querySelector('#astroBodyWrap') : area.querySelector('.zw-dashboard'));
    }, { type, id: ids[type] }, { timeout: 45000 });
    const readyMs = Date.now() - start;
    await page.waitForTimeout(350);
    const data = await page.evaluate(type => {
      if (type === 'sukuyo') return window._syLastSukuyoBasicResult;
      if (type === 'ziwei') return window.getZiweiStructuredData();
      const b = window._astroBirth;
      return { birth: b, chart: window.calcAstroSwissChartOrThrow(b.year, b.month, b.day, b.hour + b.minute / 60, b.lat, b.lon, b.tz, window.ASTRO_HOUSE_SYSTEM || 'P') };
    }, type);
    await fs.writeFile(path.join(output, `${type}-data.json`), JSON.stringify(data, null, 2));
    if (phase === 'after') {
      const previous = JSON.parse(await fs.readFile(path.join(root, '.impeccable/basic-fortune/before', `${type}-data.json`), 'utf8'));
      const stable = value => JSON.parse(JSON.stringify(value, (key, item) => key === 'generatedAt' ? undefined : item));
      assert.deepEqual(stable(data), stable(previous), type + ': calculation result changed');
    }
    if (type !== 'astro') await fs.writeFile(path.join(output, `${type}.html`), await page.locator('#' + ids[type]).innerHTML());
    for (const width of [360, 390, 430, 768, 1280]) {
      await page.setViewportSize({ width, height: width >= 768 ? 1000 : 844 });
      await page.locator(`#${type}ModalSheet`).evaluate(el => { el.scrollTop = 0; });
      if (type !== 'astro') await page.screenshot({ path: path.join(output, `${type}-${width}.png`) });
      const metric = await page.locator(`#${type}ModalOverlay`).evaluate(el => ({ scrollWidth: el.scrollWidth, width: el.clientWidth, left: el.getBoundingClientRect().left, position: getComputedStyle(el).position, text: el.innerText.slice(0, 750) }));
      assert.ok(metric.scrollWidth <= metric.width + 1, `${type} overflow at ${width}`);
      results.push({ type, viewport: width, readyMs, ...metric });
    }
    if (phase === 'after' && type !== 'astro') {
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.locator(`[data-fortune-library="${type}"]`).count(), 1);
      if (type === 'ziwei') {
        assert.equal(await page.locator('.fr-palace-choice').count(), 5);
        await page.locator('.fr-palace-choice').first().click();
        assert.equal(await page.locator('.fr-palace-choice').first().getAttribute('aria-pressed'), 'true');
        assert.ok((await page.locator('#zwDetailPanel').innerText()).length > 150);
        await fs.writeFile(path.join(output, 'ziwei-selected.html'), await page.locator('#zwDetailPanel').innerHTML());
        await page.locator('#zwDetailPanel').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
        await page.screenshot({ path: path.join(output, 'ziwei-selection-390.png') });
        await page.locator('#fr-ziwei-chart > summary').click();
        await page.locator('.zw-grid').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
        await page.screenshot({ path: path.join(output, 'ziwei-chart-390.png') });
      } else {
        await page.locator('#fr-sukuyo-chart > summary').click();
        await page.locator('#syWheelCardHost').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
        await page.screenshot({ path: path.join(output, 'sukuyo-chart-390.png') });
      }
    }
    await page.evaluate(type => window[{ sukuyo: 'closeSukuyoModal', astro: 'closeAstroModal', ziwei: 'closeZiweiModal' }[type]](), type);
  }
  const performance = await page.evaluate(() => window.__fortuneMetrics);
  const states = [];
  if (phase === 'after') {
    const opens = { sukuyo: 'openSukuyoModal', ziwei: 'openZiweiModal' };
    const closes = { sukuyo: 'closeSukuyoModal', ziwei: 'closeZiweiModal' };
    for (const locale of ['ko', 'en', 'ja', 'zh', 'zh-TW']) {
      for (const type of Object.keys(opens)) {
        await page.evaluate(({ profile, locale, type, opens }) => {
          localStorage.setItem('cd_lang', locale); document.documentElement.lang = locale;
          const next = { ...profile, name: '서연 Alexandria 星月 '.repeat(8) };
          if (locale === 'ko') { next.birth = { ...profile.birth, hour: null }; next.location = {}; }
          const storage = window.DestinyProfileManager.storage; storage.save([next]); storage.setCurrent(next.id);
          window[opens[type]]();
        }, { profile, locale, type, opens });
        console.log('State check', locale, type);
        await page.waitForFunction(type => document.querySelector(`[data-fortune-library="${type}"] .fr-profile-name`)?.textContent.includes('Alexandria'), type);
        const report = page.locator(`[data-fortune-library="${type}"]`);
        assert.equal(await report.locator('.fr-profile-name').evaluate(el => el.children.length), 0);
        const layout = await report.evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth, offenders: Array.from(el.querySelectorAll('*')).filter(x => x.clientWidth && x.scrollWidth > x.clientWidth + 2).slice(0,8).map(x => ({ cls: x.className, width: x.clientWidth, scroll: x.scrollWidth })) }));
        if (layout.scroll > layout.width + 1) { console.log(layout); await page.screenshot({ path: path.join(output, 'state-failure.png') }); }
        assert.ok(layout.scroll <= layout.width + 1, type + ': long name overflow');
        if (locale === 'ko' && type === 'astro') assert.equal(await report.locator('.fr-profile-notice').count(), 1);
        states.push({ type, locale, longName: true, partialProfile: locale === 'ko' });
        await page.evaluate(({ type, closes }) => window[closes[type]](), { type, closes });
      }
    }
    await page.evaluate(() => { localStorage.setItem('cd_lang', 'ko'); window.DestinyProfileManager.storage.save([]); window.DestinyProfileManager.storage.setCurrent(''); });
    for (const type of Object.keys(opens)) {
      await page.evaluate(({ type, opens }) => window[opens[type]](), { type, opens });
      await page.locator(`#${type}NoProfile`).waitFor({ state: 'visible' });
      states.push({ type, emptyProfile: true });
      await page.evaluate(({ type, closes }) => window[closes[type]](), { type, closes });
    }
    await page.evaluate(profile => { const storage = window.DestinyProfileManager.storage; storage.save([profile]); storage.setCurrent(profile.id); }, profile);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => { await window.__cdEnsureDestinyProfileLoaded(); await window.__cdEnsureBirthModalDepsLoaded(); });
    assert.equal(await page.evaluate(() => window.DestinyProfileManager.storage.current()?.id), profile.id);
    states.push({ refreshProfile: true });
    await page.evaluate(() => { window.__savedZiweiRenderer = window.renderZiwei; window.renderZiwei = function () { throw new Error('Mock render failure'); }; window.openZiweiModal(); });
    await page.locator('#ziweiModalSection [role="alert"]').waitFor({ state: 'visible' });
    await page.evaluate(() => { window.renderZiwei = window.__savedZiweiRenderer; window.closeZiweiModal(); });
    await page.evaluate(() => window.openZiweiModal());
    await page.locator('#ziweiModalSection .fr-profile').waitFor({ state: 'visible' });
    await page.evaluate(() => window.closeZiweiModal());
    states.push({ errorRecovery: true });
    await page.evaluate(() => {
      window.__savedLunarResolver = window._resolveSukuyoLunarObj;
      window._resolveSukuyoLunarObj = () => new Promise(resolve => { window.__finishMockLoading = resolve; });
      window.openSukuyoModal();
    });
    await page.locator('#sukuyoSection [role="status"]').waitFor({ state: 'visible' });
    await page.evaluate(async () => {
      window._resolveSukuyoLunarObj = window.__savedLunarResolver;
      window.__finishMockLoading(await window._resolveSukuyoLunarObj(window.DestinyProfileManager.storage.current()));
    });
    await page.locator('#sukuyoSection .fr-profile').waitFor({ state: 'visible' });
    await page.evaluate(() => window.closeSukuyoModal());
    states.push({ loading: true });
    await page.evaluate(async () => {
      await window.__cdLoadScriptOnce('/js/share.js');
      window.__mockShares = [];
      Object.defineProperty(navigator, 'share', { configurable: true, value: payload => { window.__mockShares.push(payload); return Promise.resolve(); } });
      window.shareWithReward = fn => fn();
    });
    for (const type of ['sukuyo', 'ziwei', 'astro']) {
      await page.evaluate(type => window[{ sukuyo: 'shareSukuyoKakao', ziwei: 'shareZiweiKakao', astro: 'shareAstroKakao' }[type]](), type);
    }
    const shares = await page.evaluate(() => window.__mockShares);
    assert.equal(shares.length, 3);
    assert.ok(shares.every(share => share.url && share.text.includes(profile.name)));
    states.push({ mockSharePayloads: shares.length });
  }
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ results, errors, requests, performance, states }, null, 2));
  console.log(JSON.stringify({ phase, results, errors }, null, 2));
} finally { await browser.close(); }
