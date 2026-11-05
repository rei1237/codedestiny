import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://127.0.0.1:13240';
const output = process.argv[3] || 'build-cache/consultation-home';
assert.equal(new URL(base).hostname, '127.0.0.1');
await mkdir(output, { recursive: true });
const rows = [];
for (const channel of ['chrome', 'msedge']) {
  const browser = await chromium.launch({ channel, headless: true });
  try {
    for (const [width, dpr] of [[360,1],[390,1],[430,1],[768,1],[1280,1],[1280,1.25],[1440,1],[1440,1.25]]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: dpr, serviceWorkers: 'block', reducedMotion: 'reduce' });
      await context.addInitScript(() => sessionStorage.setItem('cd_signature_consult_session_closed_v1', '1'));
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { ok: true, authenticated: false, user: null, data: {}, items: [] } });
        return url.origin === base ? route.continue() : route.abort();
      });
      const page = await context.newPage();
      await page.goto(base + '/static/index.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForFunction(() => typeof window.__cdOpenGarden === 'function', { timeout: 60000 });
      await page.evaluate(() => document.fonts.ready);
      const main = page.locator('#cdHomeFunnel');
      // 홈: 히어로 버튼 하나 → 대표 상담 덱 → 초융합 시그니처 → 무료로 먼저 → 꿀방울 → 1:1 상담 → 영냥이 배너 → 질문 카테고리 → 이용권 → 뮤직비디오 → 모든 운세 보기 → 링크 → 달빛 이야기.
      assert.equal(await main.locator('.yh-hero .yh-free-start').getAttribute('href'), '/?action=cdOneStepFreeSajuEntry');
      assert.equal(await page.locator('#cdhMore').count(), 0, 'no folded catalog on home');
      const order = await page.evaluate(() => ['.yh-hero','.yh-concerns','.yh-results','#cdhPass','.yh-links','.cd-help-entry','#cdhMoonlightMv','#cdhFusionSignature','#cdhYeongnyangiSlot','#cdSignatureConsult','#cdQuickServices','.cdh-story'].map(sel => document.querySelector(sel).getBoundingClientRect().top + scrollY));
      assert(order.every((top,i) => i===0 || top>order[i-1]), JSON.stringify(order));
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
      const primary = main.locator('.yh-hero .yh-free-start');
      await primary.focus();
      assert(await primary.evaluate(el => el === document.activeElement && el.getBoundingClientRect().height >= 44));
      rows.push({ channel, width, dpr, overflow, order });
      await context.close();
    }
    if (channel === 'chrome') {
      const context = await browser.newContext({ viewport: { width: 390, height: 900 }, serviceWorkers: 'block' });
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { ok: true, authenticated: false, user: null, data: {}, items: [] } });
        return url.origin === base ? route.continue() : route.abort();
      });
      const page = await context.newPage();
      await page.goto(base + '/static/index.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.evaluate(() => { const modal = document.createElement('div'); modal.id = 'signaturePopupBlocker'; modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.textContent = 'Mock payment'; document.body.appendChild(modal); });
      await page.waitForFunction(() => typeof window.__cdOpenGarden === 'function', { timeout: 60000 });
      await page.waitForTimeout(1100);
      const cookie = page.locator('#cdCookieConsent');
      if (await cookie.evaluate(node => node.classList.contains('is-visible'))) await page.locator('#cdCookieEssentialBtn').evaluate(button => button.click());
      await page.waitForTimeout(1000);
      assert.equal(await page.locator('#cdSignatureConsultPopup').count(), 0, 'popup waits while another modal is open');
      await page.locator('#signaturePopupBlocker').evaluate(node => node.remove());
      const popup = page.locator('#cdSignatureConsultPopup');
      await popup.waitFor({ state: 'visible', timeout: 10000 });
      assert.equal(await popup.locator('[data-signature-popup-dots] button').count(), 6, 'popup has six signature consultations');
      assert.equal(await popup.getAttribute('data-service-id'), 'fortune-tea-house', 'popup starts with Yeoni tea house');
      const sourcePrice = (await page.locator('#cdSigGrid [data-cd-service-id="fortune-tea-house"] .cd-sig-card__price').textContent()).trim();
      assert.equal(await popup.locator('[data-signature-popup-price]').innerText(), sourcePrice, 'popup reuses registry-backed price text');
      await page.waitForFunction(() => document.querySelector('[data-signature-popup-image]')?.naturalWidth > 0);
      assert.ok(await popup.locator('[data-signature-popup-image]').evaluate(image => image.naturalWidth > 0), 'popup image loads');
      await page.addStyleTag({ content: '#cdGlobalErrorToast{display:none!important}' });
      await page.screenshot({ path: output + '/chrome-signature-popup-390.png' });
      await page.mouse.move(1, 1);
      const firstPopupService = await popup.getAttribute('data-service-id');
      await page.waitForTimeout(6300);
      assert.notEqual(await popup.getAttribute('data-service-id'), firstPopupService, 'popup advances automatically after six seconds');
      const popupPause = popup.locator('[data-signature-popup-pause]');
      await popupPause.click();
      assert.equal(await popupPause.getAttribute('aria-pressed'), 'true', 'popup pause control stops autoplay');
      await popupPause.click();
      assert.equal(await popupPause.getAttribute('aria-pressed'), 'false', 'popup pause control resumes autoplay');
      await popup.locator('[data-signature-popup-today]').click();
      const hideUntil = await page.evaluate(() => Number(localStorage.getItem('cd_signature_consult_hide_until_v1')));
      const nextMidnight = await page.evaluate(() => { const date = new Date(); date.setHours(24, 0, 0, 0); return date.getTime(); });
      assert.equal(hideUntil, nextMidnight, 'today dismissal lasts until local midnight');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      assert.equal(await page.locator('#cdSignatureConsultPopup').count(), 0, 'today dismissal prevents popup rebuild');

      await page.evaluate(() => { localStorage.removeItem('cd_signature_consult_hide_until_v1'); sessionStorage.removeItem('cd_signature_consult_session_closed_v1'); });
      await page.reload({ waitUntil: 'domcontentloaded' });
      const cookieAfterReload = page.locator('#cdCookieConsent');
      if (await cookieAfterReload.evaluate(node => node.classList.contains('is-visible'))) await page.locator('#cdCookieEssentialBtn').evaluate(button => button.click());
      await page.locator('#cdSignatureConsultPopup').waitFor({ state: 'visible', timeout: 10000 });
      await page.locator('[data-signature-popup-close]').click();
      assert.equal(await page.evaluate(() => sessionStorage.getItem('cd_signature_consult_session_closed_v1')), '1', 'ordinary close is remembered for the session');

      await page.evaluate(() => sessionStorage.removeItem('cd_signature_consult_session_closed_v1'));
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.locator('#cdSignatureConsultPopup').waitFor({ state: 'visible', timeout: 10000 });
      await page.locator('[data-signature-popup-today]').click();
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
      await page.screenshot({ path: output + '/chrome-signature-rail-autoplay-390.png' });
      rows.push({ channel: 'chrome', width: 390, popup: true, autoplay: true });
      await context.close();

      const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 960 }, serviceWorkers: 'block' });
      await desktopContext.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.pathname.startsWith('/api/')) return route.fulfill({ json: { ok: true, authenticated: false, user: null, data: {}, items: [] } });
        return url.origin === base ? route.continue() : route.abort();
      });
      const desktopPage = await desktopContext.newPage();
      await desktopPage.goto(base + '/static/index.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
      const desktopCookie = desktopPage.locator('#cdCookieConsent');
      await desktopPage.waitForTimeout(1100);
      if (await desktopCookie.evaluate(node => node.classList.contains('is-visible'))) await desktopPage.locator('#cdCookieEssentialBtn').evaluate(button => button.click());
      const desktopPopup = desktopPage.locator('#cdSignatureConsultPopup');
      await desktopPopup.waitFor({ state: 'visible', timeout: 10000 });
      await desktopPopup.locator('[data-signature-popup-image]').waitFor({ state: 'visible' });
      await desktopPage.waitForFunction(() => document.querySelector('[data-signature-popup-image]')?.naturalWidth > 0);
      const desktopSheet = await desktopPopup.locator('.cd-signature-popup__sheet').boundingBox();
      assert(desktopSheet && desktopSheet.width > 700 && Math.abs(desktopSheet.x + desktopSheet.width / 2 - 720) < 4, 'desktop popup is a centered split modal');
      await desktopPage.addStyleTag({ content: '#cdGlobalErrorToast{display:none!important}' });
      await desktopPage.screenshot({ path: output + '/chrome-signature-popup-1440.png' });
      const desktopClose = desktopPopup.locator('[data-signature-popup-close]');
      await desktopClose.focus();
      await desktopPage.keyboard.press('Shift+Tab');
      assert(await desktopPopup.evaluate(node => node.contains(document.activeElement)), 'popup traps backward keyboard focus');
      await desktopPage.keyboard.press('Escape');
      assert.equal(await desktopPopup.isHidden(), true, 'Escape closes the popup');
      assert.equal(await desktopPage.evaluate(() => sessionStorage.getItem('cd_signature_consult_session_closed_v1')), '1', 'Escape close is remembered for the session');
      await desktopPage.evaluate(() => sessionStorage.removeItem('cd_signature_consult_session_closed_v1'));
      await desktopPage.reload({ waitUntil: 'domcontentloaded' });
      await desktopPage.locator('#cdSignatureConsultPopup').waitFor({ state: 'visible', timeout: 10000 });
      await desktopPage.mouse.click(50, 500);
      assert.equal(await desktopPage.locator('#cdSignatureConsultPopup').isHidden(), true, 'backdrop click closes the popup');
      rows.push({ channel: 'chrome', width: 1440, popup: true, focusTrap: true, escape: true, backdrop: true });
      await desktopContext.close();
    }
  } finally { await browser.close(); }
}
await writeFile(output + '/home-metrics.json', JSON.stringify(rows,null,2));
console.log('[home browser] PASS', rows.length, 'mock viewport cases');
