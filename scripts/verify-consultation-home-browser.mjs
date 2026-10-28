import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://127.0.0.1:13240';
const output = process.argv[3] || 'build-cache/consultation-home';
assert.equal(new URL(base).hostname, '127.0.0.1');
await mkdir(output, { recursive: true });
const rows = [];
const listOpen = () => Boolean(document.getElementById('cdAllFortunes')?.open || document.getElementById('cdMobileFortuneOverview')?.classList.contains('is-open'));
for (const channel of ['chrome', 'msedge']) {
  const browser = await chromium.launch({ channel, headless: true });
  try {
    for (const [width, dpr] of [[360,1],[390,1],[430,1],[1280,1],[1280,1.25],[1440,1],[1440,1.25]]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: dpr, serviceWorkers: 'block', reducedMotion: 'reduce' });
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
      assert.equal(await main.locator('.cdh-hero .cdh-primary').getAttribute('href'), '#cdSignatureConsult');
      assert.equal(await page.locator('#cdhMore').count(), 0, 'no folded catalog on home');
      const order = await page.evaluate(() => ['#cdSignatureConsult','#cdhFusionSignature','#cdQuickServices','.cdh-honey','.cdh-consult-browser','#cdConcernPick','#cdhPass','#cdhMoonlightMv','.cdh-all-cta','.cdh-links','.cdh-story'].map(sel => document.querySelector(sel).getBoundingClientRect().top + scrollY));
      assert(order.every((top,i) => i===0 || top>order[i-1]), JSON.stringify(order));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert(overflow <= 0, 'home overflow: '+width+' / '+overflow);
      await page.screenshot({ path: output + '/' + channel + '-home-' + width + '.png' });
      await page.locator('#cdSignatureConsult').scrollIntoViewIfNeeded();
      await page.screenshot({ path: output + '/' + channel + '-signature-' + width + '.png' });
      await main.locator('.cdh-all-cta__btn').click();
      await page.waitForFunction(listOpen, null, { timeout: 5000 });
      await page.locator('#cdAllFortunesSearch').waitFor({ state: 'visible' });
      await page.locator('#cdAllFortunesSearch').fill('타로');
      await page.waitForTimeout(250);
      assert(await page.locator('#cdAllFortunesResults a, #cdAllFortunesResults button').count() > 0, 'search finds tarot: ' + width);
      await page.screenshot({ path: output + '/' + channel + '-search-' + width + '.png' });
      await page.locator('#cdAllFortunesSearch').fill('');
      if (width <= 900) await page.keyboard.press('Escape');
      else await page.locator('#cdAllFortunes [data-cd-sheet-close]').click();
      await page.waitForFunction(() => !(document.getElementById('cdAllFortunes')?.open || document.getElementById('cdMobileFortuneOverview')?.classList.contains('is-open')), null, { timeout: 5000 });
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
      const primary = main.locator('.cdh-hero .cdh-primary');
      await primary.focus();
      assert(await primary.evaluate(el => el === document.activeElement && el.getBoundingClientRect().height >= 44));
      rows.push({ channel, width, dpr, overflow, order, search: true });
      await context.close();
    }
  } finally { await browser.close(); }
}
await writeFile(output + '/home-metrics.json', JSON.stringify(rows,null,2));
console.log('[home browser] PASS', rows.length, 'mock viewport cases');
