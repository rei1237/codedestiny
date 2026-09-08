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
  const ziweiPosts = [];
  let ziweiMockFailure = false;
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    // Fail closed: no test traffic ever reaches a live API, analytics or asset host.
    if (url.pathname.startsWith('/api/')) {
      requests.push({ path: url.pathname, method: route.request().method() });
      if (url.pathname === '/api/fortune/ziwei/ai-prompt') {
        ziweiPosts.push(route.request().postDataJSON());
        return route.fulfill({ status: ziweiMockFailure ? 422 : 200, contentType:'application/json', body:JSON.stringify(ziweiMockFailure ? { ok:false, code:'MOCK_GENERATION_FAILED', message:'mock generation failure', paymentRetainedForRetry:true, refundOk:false } : { ok:true, resultText:'명반의 실제 근거를 바탕으로 정리한 mock 상담입니다.', generatedPrompt:'mock prompt' }) });
      }
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
  const modalIds = { sukuyo: 'sukuyoModalOverlay', astro: 'astroModalOverlay', ziwei: 'ziweiModalOverlay' };
  const closeNames = { sukuyo: 'closeSukuyoModal', astro: 'closeAstroModal', ziwei: 'closeZiweiModal' };
  const closeModalAndWait = async type => {
    await page.evaluate(({ type, closeNames }) => window[closeNames[type]](), { type, closeNames });
    await page.waitForFunction(({ type, id }) => {
      const overlay = document.getElementById(id);
      const marker = history.state && history.state.cdBasicFortuneModal;
      return overlay && getComputedStyle(overlay).display === 'none' && (type === 'astro' || marker !== type);
    }, { type, id: modalIds[type] });
  };
  const pressTabUntil = async (selector, reverse = false, max = 120) => {
    for (let i = 0; i < max; i += 1) {
      if (await page.evaluate(selector => document.activeElement?.matches(selector), selector)) return;
      await page.keyboard.press(reverse ? 'Shift+Tab' : 'Tab');
    }
    assert.fail(`Keyboard focus did not reach ${selector}`);
  };
  const openBasicFortuneWithKeyboard = async type => {
    await page.evaluate(profile => {
      localStorage.setItem('cd_lang', 'ko');
      document.documentElement.lang = 'ko';
      const storage = window.DestinyProfileManager.storage;
      storage.save([profile]);
      storage.setCurrent(profile.id);
      window.dpEditProfile(profile.id);
    }, profile);
    const entry = page.locator('.dp-mc-load-btn:visible').first();
    await entry.scrollIntoViewIfNeeded();
    await entry.focus();
    await page.keyboard.press('Enter');
    const selector = page.locator('.dp-fsel-overlay');
    await selector.waitFor({ state: 'visible' });
    assert.equal(await selector.getAttribute('role'), 'dialog');
    assert.equal(await selector.getAttribute('aria-modal'), 'true');
    assert.equal(await selector.getAttribute('aria-hidden'), 'false');
    assert.equal(await page.evaluate(() => document.activeElement?.matches('.dp-fsel-close-btn')), true);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.closest('.dp-fsel-overlay') !== null), true);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement?.matches('.dp-fsel-close-btn')), true);
    await pressTabUntil(`.dp-fsel-btn--${type}`);
    await page.keyboard.press('Enter');
    await page.waitForFunction(({ type, id }) => {
      const overlay = document.getElementById(id);
      const rendered = type === 'sukuyo' ? overlay?.querySelector('#lunarNexusApp') : overlay?.querySelector('.zw-dashboard');
      return rendered && getComputedStyle(overlay).display !== 'none' && overlay.getAttribute('aria-hidden') === 'false';
    }, { type, id: modalIds[type] }, { timeout: 45000 });
    assert.equal(await page.evaluate(id => document.activeElement?.matches(`#${id} .modal-top-nav button`), modalIds[type]), true);
  };
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
      // The approved edit changes recovery/timing prose, not mansion or daily calculation.
      const stable = value => JSON.parse(JSON.stringify(value, (key, item) => key === 'generatedAt' || (type === 'sukuyo' && ['health','timing'].includes(key)) ? undefined : item));
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
        assert.equal(await page.locator('.fr-palace-choice').count(), 12);
        assert.equal(await page.locator('#fr-ziwei-chart .zw-cell').count(), 12);
        assert.equal(await page.locator('#fr-ziwei-chart').evaluate(el => el.closest('details') === null), true);
        for (const cell of await page.locator('#fr-ziwei-chart .zw-cell').all()) {
          assert.equal(await cell.evaluate(el => getComputedStyle(el).opacity), '1');
          await cell.click();
          assert.equal(await cell.getAttribute('aria-pressed'), 'true');
          assert.ok((await page.locator('.fr-energy').innerText()).length > 300);
          assert.equal(await page.locator('.fr-radar-value').count(), 1);
          assert.equal(await page.locator('.fr-radar-values dd').count(), 5);
          assert.deepEqual(await page.locator('.fr-radar-values dd').allTextContents(), await page.locator('#zwDetailPanel').evaluate(el => el.__zwVisualMetrics.radar.values.map(String)));
        }
        assert.equal(await page.locator('.fr-flow-point').count(), 12);
        assert.equal(await page.locator('.fr-flow-curve').count(), 1);
        await page.locator('.fr-flow-tabs button').nth(1).click();
        assert.equal(await page.locator('.fr-flow-curve').count(), 2);
        await page.locator('.fr-flow-point').nth(2).click();
        assert.equal(await page.locator('.fr-flow-point').nth(2).getAttribute('aria-pressed'), 'true');
        await page.locator('.fr-flow-point').nth(2).focus();
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.locator('.fr-flow-point').nth(3).getAttribute('aria-pressed'), 'true');
        assert.ok((await page.locator('.fr-flow-readout').innerText()).length > 20);
        assert.equal(await page.locator('.fr-flow-curve').evaluateAll(els => els.some(el => /NaN|undefined/.test(el.getAttribute('d')))), false);
        assert.equal(await page.locator('#zwDeepAiPromptDomain option').count(), 14);
        await page.locator('#zwDeepAiPromptDomain').selectOption('study');
        await page.locator('#zwDeepAiPromptExample').click();
        assert.ok((await page.locator('#zwDeepAiPromptQuestion').inputValue()).includes('공부'));
        ziweiMockFailure = true;
        await page.evaluate(() => window._zwAiPromptResumeCore('가족 관계의 거리감을 조율하고 싶어요.', { requestId:'mock-ziwei-paid-resume', accessGrant:{ mock:true } }, 'family'));
        assert.equal(ziweiPosts.at(-1).domain, 'family');
        assert.equal(ziweiPosts.at(-1).requestId, 'mock-ziwei-paid-resume');
        ziweiMockFailure = false;
        await page.locator('#zwDeepAiPromptGenerateBtn').click();
        await page.waitForFunction(() => document.querySelector('#zwDeepAiPromptStatus').textContent.includes('완성'));
        assert.equal(ziweiPosts.at(-1).requestId, 'mock-ziwei-paid-resume', 'retry must retain paid request id');
        assert.equal(ziweiPosts.at(-1).domain, 'family');
        await page.locator('.fr-palace-choice').first().click();
        assert.equal(await page.locator('.fr-palace-choice').first().getAttribute('aria-pressed'), 'true');
        assert.ok((await page.locator('#zwDetailPanel').innerText()).length > 150);
        await fs.writeFile(path.join(output, 'ziwei-selected.html'), await page.locator('#zwDetailPanel').innerHTML());
        await page.locator('#zwDetailPanel').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
        await page.screenshot({ path: path.join(output, 'ziwei-selection-390.png') });
        for (const width of [360,390,430,1280]) {
          await page.setViewportSize({width,height:width >= 768 ? 1000 : 844});
          await page.locator('.fr-energy').evaluate(el => el.scrollIntoView({block:'start',behavior:'instant'}));
          await page.screenshot({path:path.join(output,`ziwei-energy-${width}.png`)});
          for (const [selector,label] of [['.fr-radar','radar'],['.fr-life-graph','curves']]) {
            await page.locator(selector).evaluate(el => el.scrollIntoView({block:'start',behavior:'instant'}));
            await page.waitForTimeout(300);
            await page.screenshot({path:path.join(output,`ziwei-${label}-${width}.png`)});
          }
        }
        await page.setViewportSize({width:390,height:844});
        for (const [selector,label] of [['#fr-ziwei-flow','flow'],['#zwDeepAiPromptPanel','consult']]) {
          await page.locator(selector).evaluate(el => el.scrollIntoView({block:'start',behavior:'instant'}));
          await page.waitForTimeout(300);
          if (label === 'consult') console.log('Consult render', await page.locator(selector).evaluate(el => Array.from(el.children).slice(0,5).map(child => ({text:child.textContent.slice(0,80),display:getComputedStyle(child).display,opacity:getComputedStyle(child).opacity,visibility:getComputedStyle(child).visibility,top:child.getBoundingClientRect().top,height:child.getBoundingClientRect().height,clip:getComputedStyle(child).clipPath}))));
          await page.screenshot({path:path.join(output,`ziwei-${label}-390.png`)});
        }
        await page.locator('.zw-grid').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
        await page.screenshot({ path: path.join(output, 'ziwei-chart-390.png') });
      } else {
        assert.equal(await page.locator('#syWheelCardHost').evaluate(el => !!el.closest('details:not([open])')), false);
        await page.locator('#syWheelCardHost').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
        await page.screenshot({ path: path.join(output, 'sukuyo-chart-390.png') });
      }
    }
    await closeModalAndWait(type);
  }
  const performance = await page.evaluate(() => window.__fortuneMetrics);
  const states = [];
  const localizationAudit = [];
  if (phase === 'after') {
    const opens = { sukuyo: 'openSukuyoModal', ziwei: 'openZiweiModal' };
    for (const type of Object.keys(opens)) {
      await page.setViewportSize({ width: 390, height: 844 });
      await openBasicFortuneWithKeyboard(type);
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(id => document.activeElement?.closest(`#${id}`) !== null, modalIds[type]), true);
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(id => document.activeElement?.matches(`#${id} .modal-top-nav button`), modalIds[type]), true);
      if (type === 'sukuyo') {
        await pressTabUntil(`#fr-${type}-chart > summary`);
        await page.keyboard.press('Enter');
        assert.equal(await page.locator(`#fr-${type}-chart`).evaluate(el => el.open), true);
        await page.waitForFunction(selector => document.querySelector(selector)?.getAttribute('aria-expanded') === 'true', `#fr-${type}-chart > summary`);
        assert.equal(await page.locator(`#fr-${type}-chart > summary`).getAttribute('aria-expanded'), 'true');
      } else {
        await pressTabUntil('#fr-ziwei-chart .zw-cell');
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-pressed')), 'true');
      }
      if (type === 'sukuyo') {
        await pressTabUntil('.sy-house-nav button:nth-child(2)');
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => document.activeElement?.id), 'syHouseTools');
        assert.equal(await page.locator('#syWheelCardHost').evaluate(el => !!el.closest('details:not([open])')), false);
        await page.keyboard.press('Escape');
      } else {
        await pressTabUntil(`#fr-${type}-chart > summary`);
        await page.keyboard.press('Enter');
        assert.equal(await page.locator(`#fr-${type}-chart`).evaluate(el => el.open), true);
        assert.equal(await page.locator(`#fr-${type}-chart > summary`).getAttribute('aria-expanded'), 'true');
        await pressTabUntil(`#${modalIds[type]} .modal-nav-close`, true);
        await page.keyboard.press('Enter');
      }
      await page.waitForFunction(id => getComputedStyle(document.getElementById(id)).display === 'none', modalIds[type]);
      await page.waitForFunction(() => document.activeElement?.matches('.dp-mc-load-btn'));
      assert.equal(await page.evaluate(() => document.activeElement?.matches('.dp-mc-load-btn')), true);
      states.push({ type, keyboardNavigation: true, disclosureKeyboard: true, focusReturn: true });

      await openBasicFortuneWithKeyboard(type);
      const beforeHistory = await page.evaluate(type => ({
        href: location.href,
        scrollY,
        length: history.length,
        marker: history.state && history.state.cdBasicFortuneModal,
        type
      }), type);
      assert.equal(beforeHistory.marker, type);
      await page.evaluate(({ type, opens }) => window[opens[type]](), { type, opens });
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => history.length), beforeHistory.length);
      await page.goBack({ waitUntil: 'commit' }).catch(() => null);
      await page.waitForFunction(id => getComputedStyle(document.getElementById(id)).display === 'none', modalIds[type]);
      const afterBack = await page.evaluate(() => ({ href: location.href, scrollY, marker: history.state && history.state.cdBasicFortuneModal }));
      assert.equal(afterBack.href, beforeHistory.href);
      assert.equal(afterBack.marker == null, true);
      assert.ok(Math.abs(afterBack.scrollY - beforeHistory.scrollY) <= 2, `${type}: scroll changed on Back`);
      await page.waitForFunction(() => document.activeElement?.matches('.dp-mc-load-btn'));
      assert.equal(await page.evaluate(() => document.activeElement?.matches('.dp-mc-load-btn')), true);
      await page.goForward({ waitUntil: 'commit' }).catch(() => null);
      await page.waitForFunction(({ type, id }) => {
        const overlay = document.getElementById(id);
        return getComputedStyle(overlay).display !== 'none' && history.state?.cdBasicFortuneModal === type;
      }, { type, id: modalIds[type] });
      assert.equal(await page.evaluate(() => history.length), beforeHistory.length);
      await closeModalAndWait(type);
      states.push({ type, historyBackCloses: true, historyForwardRestores: true, historyDeduplicated: true, urlPreserved: true, scrollPreserved: true });
    }
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
        if (locale !== 'ko') {
          await report.locator('details').evaluateAll(nodes => nodes.forEach(node => { node.open = true; node.querySelector(':scope > summary')?.setAttribute('aria-expanded', 'true'); }));
          const presentationText = await report.locator('.fr-heading, .fr-disclosure > summary, .fr-palace-choice strong, .fr-map-toggle').evaluateAll(nodes => nodes.filter(node => !node.closest('#zwDetailPanel, #zwComprehensiveReport')).map(node => node.textContent));
          assert.equal(presentationText.some(text => /[가-힣]/.test(text)), false, `${type}/${locale}: new presentation label contains Hangul`);
          localizationAudit.push(await report.evaluate((root, { locale, type }) => {
            const samples = [];
            const owners = {};
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
            let node;
            while ((node = walker.nextNode())) {
              const parent = node.parentElement;
              const text = node.nodeValue.replace(/\s+/g, ' ').trim();
              if (!text || !/[가-힣]/.test(text) || !parent || parent.closest('.fr-profile-name, script, style, noscript')) continue;
              const owner = parent.closest('#lunarNexusApp') ? 'renderSukuyo' : parent.closest('.zw-dashboard, #ziweiModalSection') ? 'renderZiwei' : 'presentation';
              owners[owner] = (owners[owner] || 0) + 1;
              const anchor = parent.closest('[id], [class]');
              const selector = anchor?.id ? `#${anchor.id}` : anchor?.classList?.length ? `.${Array.from(anchor.classList).slice(0, 2).join('.')}` : parent.tagName.toLowerCase();
              if (samples.length < 8 && !samples.some(sample => sample.text === text)) samples.push({ owner, selector, text: text.slice(0, 160) });
            }
            return { locale, type, total: Object.values(owners).reduce((sum, count) => sum + count, 0), owners, samples };
          }, { locale, type }));
        }
        states.push({ type, locale, longName: true, partialProfile: locale === 'ko' });
        await closeModalAndWait(type);
      }
    }
    await page.evaluate(() => { localStorage.setItem('cd_lang', 'ko'); window.DestinyProfileManager.storage.save([]); window.DestinyProfileManager.storage.setCurrent(''); });
    for (const type of Object.keys(opens)) {
      await page.evaluate(({ type, opens }) => window[opens[type]](), { type, opens });
      await page.locator(`#${type}NoProfile`).waitFor({ state: 'visible' });
      states.push({ type, emptyProfile: true });
      await closeModalAndWait(type);
    }
    await page.evaluate(profile => { const storage = window.DestinyProfileManager.storage; storage.save([profile]); storage.setCurrent(profile.id); }, profile);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => { await window.__cdEnsureDestinyProfileLoaded(); await window.__cdEnsureBirthModalDepsLoaded(); });
    assert.equal(await page.evaluate(() => window.DestinyProfileManager.storage.current()?.id), profile.id);
    states.push({ refreshProfile: true });
    await page.evaluate(() => { window.__savedZiweiRenderer = window.renderZiwei; window.renderZiwei = function () { throw new Error('Mock render failure'); }; window.openZiweiModal(); });
    await page.locator('#ziweiModalSection [role="alert"]').waitFor({ state: 'visible' });
    await page.evaluate(() => { window.renderZiwei = window.__savedZiweiRenderer; });
    await closeModalAndWait('ziwei');
    await page.evaluate(() => window.openZiweiModal());
    await page.locator('#ziweiModalSection .fr-profile').waitFor({ state: 'visible' });
    await closeModalAndWait('ziwei');
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
    await closeModalAndWait('sukuyo');
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
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify({ results, errors, requests, performance, states, localizationAudit }, null, 2));
  console.log(JSON.stringify({ phase, results, errors }, null, 2));
} finally { await browser.close(); }
