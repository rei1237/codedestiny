import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://127.0.0.1:13240';
const output = process.argv[3] || 'build-cache/consultation-home';
assert.equal(new URL(base).hostname, '127.0.0.1');
await mkdir(output, { recursive: true });
const rows = [];
// Exercise the home with the independent first-visit tour already dismissed.
function returningVisitor() {
  localStorage.setItem('cd:first-visit:v1:ggulggul:guest', JSON.stringify({ status: 'dismissed', step: 0 }));
}
for (const channel of ['chrome', 'msedge']) {
  const browser = await chromium.launch({ channel, headless: true });
  try {
    for (const [width, dpr] of [[360,1],[390,1],[430,1],[768,1],[1280,1],[1280,1.25],[1440,1],[1440,1.25]]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: dpr, serviceWorkers: 'block', reducedMotion: 'reduce' });
      await context.addInitScript(returningVisitor);
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.pathname === '/api/honey/catalog') return route.fulfill({ json: { ok: true, products: [] } });
        if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { ok: true, authenticated: false, user: null, data: {}, items: [] } });
        return url.origin === base ? route.continue() : route.abort();
      });
      const page = await context.newPage();
      await page.goto(base + '/ggulggul/', { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForFunction(() => typeof window.__cdOpenGarden === 'function', { timeout: 60000 });
      await page.waitForLoadState('load');
      await page.evaluate(() => document.fonts.ready);
      const consent = page.locator('#cdCookieEssentialBtn');
      if (await consent.isVisible()) await consent.click();
      const main = page.locator('#cdHomeFunnel');
      // 홈: 히어로 버튼 하나 → 대표 상담 덱 → 초융합 시그니처 → 무료로 먼저 → 꿀방울 → 1:1 상담 → 영냥이 배너 → 질문 카테고리 → 이용권 → 뮤직비디오 → 모든 운세 보기 → 링크 → 달빛 이야기.
      assert.equal(await main.locator('.yh-hero .yh-free-start').getAttribute('href'), '/?action=cdOneStepFreeSajuEntry');
      assert.equal(await page.locator('#cdhMore').count(), 0, 'no folded catalog on home');
      const order = await page.evaluate(() => ['.yh-hero','.yh-find','.yh-links','#cdhPass','.cd-help-entry','#cdhMoonlightMv','#cdhFusionSignature','#cdhYeongnyangiSlot','#cdSignatureConsult','#cdQuickServices','.cdh-story'].map(sel => document.querySelector(sel)).filter(item => item.closest('.yh-secondary:not([open])') || item.getClientRects().length).map(item => { /* 700px 미만에서 숨긴 무료로 먼저는 화면 순서에서 뺀다 */ return (item.closest('.yh-secondary:not([open])') || item).getBoundingClientRect().top + scrollY; }));
      assert(order.every((top,i) => i===0 || top>order[i-1]), JSON.stringify(order));
      const letter = main.locator((width < 700 ? '.yh-entries' : '.cdh-free') + ' + .cd-consult-letter');
      await letter.waitFor({ state: 'visible' });
      assert.equal(await letter.evaluate(node => node.open && getComputedStyle(node).position !== 'fixed'), true);
      const pass = main.locator('.pb--honey');
      assert(await pass.isVisible(), 'pass is inline on both mobile and desktop');
      const dialogue = pass.locator('cd-pass-duet');
      await dialogue.locator('[data-next]').waitFor({ state: 'visible' });
      assert.equal(await dialogue.locator('[data-play]').innerText(), '자동 재생', 'reduced motion starts paused');
      const selectionY = () => pass.locator('fieldset').evaluate(n => n.getBoundingClientRect().top - n.closest('.pb').getBoundingClientRect().top);
      const beforeDialogue = await selectionY();
      for (let index = 0; index < 3; index++) {
        await dialogue.locator('[data-next]').click();
        assert.equal(await selectionY(), beforeDialogue, 'changing dialogue keeps the selector in place');
      }
      for (const choice of await pass.locator('.pb__choice').all()) {
        await choice.click();
        const name = await choice.locator('strong').innerText();
        const price = await choice.locator('span').innerText();
        const detail = pass.locator('.pb__detail:visible');
        assert.equal(await detail.locator('h3').innerText(), name);
        assert.equal(await detail.locator('.pb__prices strong').innerText(), price);
        assert.equal(new URL(await detail.locator('a.pb__cta').evaluate(a => a.href)).searchParams.get('plan'),
          ['standard','premium','vvip','family'][Number(await choice.locator('input').inputValue())]);
      }
      const lightList = pass.locator('.pb__light-list');
      await lightList.locator('summary').click();
      assert.ok((await lightList.locator('li').count()).toString() === (await lightList.locator('summary').innerText()).match(/\d+/)[0]);
      await lightList.locator('summary').click();
      assert.equal(await main.locator('.yh-webtoon-link').getAttribute('href'), '/#homeStoryTitle');
      await pass.screenshot({ path: output + '/' + channel + '-pass-' + width + '.png' });
      await letter.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await letter.locator('img').evaluate(image => image.decode());
      await letter.screenshot({ path: output + '/' + channel + '-letter-' + width + '.png' });
      await page.evaluate(() => window.scrollTo(0, 0));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert(overflow <= 0, 'home overflow: '+width+' / '+overflow);
      await page.screenshot({ path: output + '/' + channel + '-home-' + width + '.png' });
      await page.locator('#cdSignatureConsult').scrollIntoViewIfNeeded();
      await page.screenshot({ path: output + '/' + channel + '-signature-' + width + '.png' });
      if (channel === 'chrome' && width === 390) {
        const reducedViewport = page.locator('#cdSigViewport');
        await page.evaluate(() => document.activeElement?.blur());
        await page.mouse.move(1, 1);
        const reducedScroll = await reducedViewport.evaluate(node => node.scrollLeft);
        await page.waitForTimeout(6300);
        assert.equal(Math.round(await reducedViewport.evaluate(node => node.scrollLeft)), Math.round(reducedScroll), 'reduced motion disables home autoplay');
        assert.equal(await page.locator('[data-sig-pause]').isHidden(), true, 'reduced motion hides the autoplay control');
      }
      assert.equal(await page.locator('#cdhMemberBenefit, #cdhSignupBenefit').count(), 0, 'no balance or signup band on home');
      if (width === 390) {
        await page.evaluate(() => { document.getElementById('authQuickLinks').dataset.authState = 'guest'; const modal = document.createElement('div'); modal.id = 'mockDialog'; modal.setAttribute('aria-modal','true'); modal.textContent = 'Mock payment'; document.body.appendChild(modal); });
        assert.equal(await page.evaluate(() => window.__cdSignupBenefitExit.open()), false, 'no signup popup over payment');
        await page.locator('#mockDialog').evaluate(e => e.remove());
        assert.equal(await page.evaluate(() => window.__cdSignupBenefitExit.open()), true);
        await page.locator('#cdSignupBenefitExit [data-hide-today]').click();
        assert(await page.evaluate(() => Number(localStorage.getItem('cd_signup_benefit_exit_hide_until_v1')) > Date.now()));
        await page.evaluate(() => { document.documentElement.classList.add('neo-mode'); document.body.classList.add('neo-mode'); window.scrollTo(0,0); });
        await page.screenshot({ path: output + '/' + channel + '-dark-' + width + '.png' });
      }
      const primary = main.locator(width < 700 ? '.yh-entry[data-cd-service-id="saju"]' : '.yh-free-start');
      await primary.focus();
      const focused = await primary.evaluate(el => ({ active: el === document.activeElement, height: el.getBoundingClientRect().height, focusId: document.activeElement.id, url: location.href }));
      assert(focused.active && focused.height >= 44, channel + ' ' + width + ' ' + JSON.stringify(focused));
      rows.push({ channel, width, dpr, overflow, order });
      await context.close();
    }
    if (channel === 'chrome') {
      const context = await browser.newContext({ viewport: { width: 390, height: 900 }, serviceWorkers: 'block' });
      await context.addInitScript(returningVisitor);
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.pathname === '/api/honey/catalog') return route.fulfill({ json: { ok: true, products: [] } });
        if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { ok: true, authenticated: false, user: null, data: {}, items: [] } });
        return url.origin === base ? route.continue() : route.abort();
      });
      const page = await context.newPage();
      await page.goto(base + '/ggulggul/', { waitUntil: 'domcontentloaded', timeout: 120000 });
      const letter = page.locator('.cd-consult-letter');
      await letter.waitFor({ state: 'visible' });
      const cookie = page.locator('#cdCookieEssentialBtn');
      if (await cookie.isVisible()) await cookie.click();
      const first = await letter.locator('a').getAttribute('href');
      await letter.locator('[data-next]').click();
      assert.notEqual(await letter.locator('a').getAttribute('href'), first);
      await letter.locator('[data-prev]').click();
      assert.equal(await letter.locator('a').getAttribute('href'), first);
      await letter.locator('summary').click();
      assert.equal(await letter.locator('a').isVisible(), false);
      await letter.locator('summary').press('Enter');
      assert.equal(await letter.locator('a').isVisible(), true);
      await letter.locator('[data-hide]').click();
      const midnight = await page.evaluate(() => new Date().setHours(24,0,0,0));
      assert.equal(await page.evaluate(() => Number(localStorage.getItem('cd_signature_consult_hide_until_v1'))), midnight);
      await page.goto(base + '/ggulggul/', { waitUntil: 'load' });
      await page.waitForFunction(() => typeof window.__cdOpenGarden === 'function', null, { timeout: 60000 });
      assert.equal(await letter.count(), 0);
      await page.setViewportSize({ width: 1024, height: 900 });
      const viewport = page.locator('#cdSigViewport');
      await viewport.scrollIntoViewIfNeeded();
      await page.evaluate(() => document.activeElement?.blur());
      await page.mouse.move(1, 1);
      const firstScroll = await viewport.evaluate(node => node.scrollLeft);
      await page.waitForTimeout(6300);
      assert.notEqual(await viewport.evaluate(node => node.scrollLeft), firstScroll, 'home consultation rail advances automatically after six seconds');
      const pause = page.locator('[data-sig-pause]');
      await pause.click();
      assert.equal(await pause.getAttribute('aria-pressed'), 'true', 'home pause control stops autoplay');
      await pause.click();
      assert.equal(await pause.getAttribute('aria-pressed'), 'false', 'home pause control resumes autoplay');
      await page.locator('[data-sig-next]').click();
      await page.mouse.move(1, 1);
      await page.waitForTimeout(800);
      const manualScroll = await viewport.evaluate(node => node.scrollLeft);
      await page.waitForTimeout(6500);
      assert.equal(Math.round(await viewport.evaluate(node => node.scrollLeft)), Math.round(manualScroll), 'manual movement pauses autoplay temporarily');
      await page.waitForTimeout(6000);
      assert.notEqual(Math.round(await viewport.evaluate(node => node.scrollLeft)), Math.round(manualScroll), 'home rail resumes after twelve seconds');
      await page.locator('[data-sig-dots] button').last().click();
      await page.waitForTimeout(800);
      await page.locator('[data-sig-next]').click();
      await page.waitForTimeout(800);
      assert(Math.abs(await viewport.evaluate(node => node.scrollLeft)) < 4, 'home rail wraps from the last card to the first');
      await page.screenshot({ path: output + '/chrome-signature-rail-autoplay-1024.png' });
      rows.push({ channel: 'chrome', width: 1024, inlineLetter: true, autoplay: true });
      await context.close();

      const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 960 }, serviceWorkers: 'block' });
      await desktopContext.addInitScript(returningVisitor);
      await desktopContext.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.pathname === '/api/honey/catalog') return route.fulfill({ json: { ok: true, products: [] } });
        if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { ok: true, authenticated: false, user: null, data: {}, items: [] } });
        return url.origin === base ? route.continue() : route.abort();
      });
      const desktopPage = await desktopContext.newPage();
      await desktopPage.goto(base + '/ggulggul/', { waitUntil: 'domcontentloaded', timeout: 120000 });
      const desktopCookie = desktopPage.locator('#cdCookieConsent');
      await desktopPage.waitForTimeout(1100);
      if (await desktopCookie.evaluate(node => node.classList.contains('is-visible'))) await desktopPage.locator('#cdCookieEssentialBtn').evaluate(button => button.click());
      const desktopLetter = desktopPage.locator('.cdh-free + .cd-consult-letter');
      await desktopLetter.waitFor({ state: 'visible' });
      await desktopLetter.locator('summary').focus();
      await desktopPage.keyboard.press('Shift+Tab');
      assert.equal(await desktopLetter.evaluate(node => node.contains(document.activeElement)), false);
      rows.push({ channel: 'chrome', width: 1440, inlineLetter: true });
      await desktopContext.close();
    }
  } finally { await browser.close(); }
}
await writeFile(output + '/home-metrics.json', JSON.stringify(rows,null,2));
console.log('[home browser] PASS', rows.length, 'mock viewport cases');
