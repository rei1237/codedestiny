// Local-only visual and interaction verification for the responsive home reassembly.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const origin = process.env.HOME_UI_ORIGIN || 'http://127.0.0.1:4180';
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) throw new Error('Local mock origin required');
const out = path.resolve('build-cache/home-ui');
fs.mkdirSync(out, { recursive: true });

function luminance(rgb) {
  const values = String(rgb).match(/[\d.]+/g).slice(0, 3).map((value) => {
    const channel = Number(value) / 255;
    return channel <= .03928 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  return .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
}
function contrast(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  // Never let UI fixtures reach external services, even when the shell loads SDKs.
  const originalNewPage = browser.newPage.bind(browser);
  browser.newPage = async function (options) {
    const page = await originalNewPage(options);
    await page.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.hostname !== '127.0.0.1') return route.abort();
      // Emulate the CDN resize path with the same local asset; no CDN network calls.
      const resized = url.pathname.match(/^\/cdn-cgi\/image\/[^/]+\/(.+)$/);
      if (resized) {
        const root = path.resolve('public');
        const asset = path.resolve(root, decodeURIComponent(resized[1]));
        if (asset.startsWith(root + path.sep) && fs.existsSync(asset)) return route.fulfill({ path: asset });
      }
      return route.continue();
    });
    return page;
  };
  const results = [];
  try {
    for (const [width, height] of [[360, 760], [390, 844], [430, 932], [768, 960], [1280, 900], [1440, 960]]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(origin + '/static/index.html', { waitUntil: 'domcontentloaded' });
      await page.locator('#cdhConcernSlot #cdConcernPick').waitFor({ state: 'attached', timeout: 10000 });
      await page.waitForTimeout(250);
      assert.equal(await page.locator('#fortuneGatewaySearch').isVisible(), false, 'search starts folded');
      assert.equal(await page.locator('#cdhCollections').isVisible(), false, 'collections start folded');
      assert.ok(await page.locator('#cdhDiarySlot #cdDiaryPlannerEntry').isVisible(), 'diary restored');
      assert.ok(await page.locator('#cdhExpertsSlot #cdAiFeatures').isVisible(), 'experts restored');
      await page.locator('#cdHomeExpandToggle').click();
      assert.ok(await page.locator('#cdhCollections').isVisible(), 'collections expand inline');
      assert.ok(await page.locator('#cdhCollections > .feature-card-grid').count(), 'existing cards live below trigger');
      assert.equal(await page.locator('#fortuneGatewaySearch').isVisible(), false, 'collections do not open search');
      await page.locator('#cdHomeExpandToggle').click();
      await page.locator('#cdhFinderDisclosure summary').click();
      assert.ok(await page.locator('#fortuneGatewaySearch').isVisible(), 'search opens on request');
      await page.locator('#cdhFinderDisclosure summary').click();
      assert.equal(await page.locator('#fortuneGatewaySearch').isVisible(), false, 'search closes again');
      if (width <= 430) {
        await page.locator('#cdMobileBottomNav [data-nav-key="fortunes"]').click();
        await page.locator('#cdMobileFortuneOverview.is-open').waitFor();
        assert.ok(await page.locator('#cdMobileFortuneOverview .cd-fov__cat').count() >= 8, 'bottom nav restores all categories');
        await page.locator('#cdMobileFortuneOverview .cd-fov__cat').filter({ hasText: '타로' }).click();
        assert.ok(await page.locator('#tarotCollection.cd-mobile-collection-fullscreen').isVisible(), 'fullscreen collection remains visible outside home containment');
        await page.keyboard.press('Escape');
        assert.ok(await page.locator('#cdhCollections > .feature-card-grid').count(), 'closing restores inline collection parent');
        assert.equal(await page.locator('#cdhCollections').isVisible(), false, 'closing overlay restores folded home');
      }
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        width: document.getElementById('cdHomeFunnel').getBoundingClientRect().width,
        unique: ['cdQuickServices', 'cdTodayHub', 'cdConcernPick', 'cdSignatureConsult', 'fortuneGatewayEntry', 'cdHomeGuideTitle'].every((id) => document.querySelectorAll('#' + id).length === 1),
        neoButton: Boolean(document.querySelector('#cdhThemeSlot [data-theme-mode="neo"]')),
        feedback: Boolean(document.querySelector('#cdhFeedbackSlot #cdFeedbackGate')),
        feedbackCta: Boolean(document.querySelector('#cdhFeedbackSlot .cd-feedback__cta[href="/feedback/"]')),
        feedbackReward: Boolean(document.querySelector('#cdhFeedbackSlot .cd-feedback__reward strong')),
        moved: Boolean(document.querySelector('#cdhQuickSlot #cdQuickServices') && document.querySelector('#cdhPassSlot .membership-recap-cta')),
        shareEvent: Boolean(document.querySelector('#cdhShareControls #dpKakaoReferralShareBtn') && document.querySelector('#cdhShareControls #dpKakaoReferralNote')),
        profileCardOnHome: Boolean(document.querySelector('#cdHomeFunnel #dpMasterCard')),
      }));
      assert.equal(layout.overflow, false, `${width}px overflow`);
      assert.ok(layout.unique && layout.moved, `${width}px reuses unique legacy nodes`);
      assert.ok(layout.neoButton, `${width}px Neo control visible in common header`);
      assert.ok(layout.feedback && layout.feedbackCta && layout.feedbackReward, `${width}px bug report entry and reward copy are visible in the primary home flow`);
      assert.ok(layout.shareEvent, `${width}px reuses the Kakao referral event`);
      assert.equal(layout.profileCardOnHome, false, `${width}px keeps the full profile card under My`);
      if (width >= 1280) assert.ok(layout.width > 1000, `${width}px uses expanded desktop canvas`);
      if (width <= 430) assert.ok(layout.width <= width, `${width}px fits mobile canvas`);

      for (const mode of ['yeoni', 'neo']) {
        if (mode === 'neo') await page.locator('#cdhThemeSlot [data-theme-mode="neo"]').click({ force: true });
        else await page.evaluate(() => { document.documentElement.classList.remove('neo-mode'); document.body.classList.remove('neo-mode'); });
        await page.waitForTimeout(80);
        const colors = await page.locator('#cdhGatewaySlot #fortuneGatewayEntry').evaluate((gateway) => ({
          title: getComputedStyle(gateway.querySelector('h2')).color,
          lead: getComputedStyle(gateway.querySelector('.fortune-gateway__entry-copy > p:last-child')).color,
          background: getComputedStyle(document.body).backgroundColor,
        }));
        assert.ok(contrast(colors.title, colors.background) >= 4.5, `${width}px ${mode} gateway title contrast`);
        assert.ok(contrast(colors.lead, colors.background) >= 4.5, `${width}px ${mode} gateway lead contrast`);
        if (mode === 'neo') {
          const passColors = await page.locator('#cdhPass').evaluate((host) => ({
            title: getComputedStyle(host.querySelector('.membership-recap-cta__title')).color,
            desc: getComputedStyle(host.querySelector('.membership-recap-cta__desc')).color,
            button: getComputedStyle(host.querySelector('.membership-recap-cta__btn')).color,
          }));
          assert.equal(passColors.title, 'rgb(255, 247, 218)', `${width}px Neo pass title is readable`);
          assert.equal(passColors.desc, 'rgb(231, 222, 247)', `${width}px Neo pass description is readable`);
          assert.equal(passColors.button, 'rgb(36, 21, 63)', `${width}px Neo pass CTA is readable`);
        }
        await page.screenshot({ path: path.join(out, `home-${mode}-${width}.png`), fullPage: true });
      }

      if (width === 390) {
        await page.locator('#cdSignatureConsult').scrollIntoViewIfNeeded();
        await page.waitForTimeout(250);
        const fusionImage = page.locator('.cd-sig-card--fusion .cd-sig-card__img');
        await fusionImage.scrollIntoViewIfNeeded();
        await page.waitForFunction(() => document.querySelector('.cd-sig-card--fusion .cd-sig-card__img')?.naturalWidth > 0);
        assert.ok(await fusionImage.evaluate((image) => image.naturalWidth > 0), 'fusion consultation image loads from the local CDN fixture');
      }

      await page.evaluate(() => { document.documentElement.classList.remove('neo-mode'); document.body.classList.remove('neo-mode'); location.hash = 'services'; });
      await page.waitForSelector('#fortuneGatewayRecs .fortune-gateway__rec');
      const searchBorders = await page.locator('.fortune-gateway__search').evaluate((shell) => ({
        shell: getComputedStyle(shell).borderTopWidth,
        input: getComputedStyle(shell.querySelector('input')).borderTopWidth,
      }));
      assert.equal(searchBorders.shell, '1px');
      assert.equal(searchBorders.input, '0px');
      await page.locator('#fortuneGatewaySearch').fill('나크샤트라');
      await page.locator('[data-price="free"]').click();
      await page.waitForTimeout(250);
      assert.ok(await page.locator('#fortuneGatewayRecs .fortune-gateway__rec').count() > 0, 'search and free filter');
      assert.ok(await page.locator('[data-cd-finder-reset]').isVisible(), 'reset appears for active filters');
      await page.locator('[data-cd-finder-reset]').click();
      assert.equal(await page.locator('#fortuneGatewaySearch').inputValue(), '', 'reset clears search');
      await page.locator('[data-price="low"]').click();
      assert.ok(await page.locator('#fortuneGatewayRecs .fortune-gateway__rec').filter({ hasText: '음악' }).count(), '1000 won filter includes music');
      await page.locator('#cdhServices').screenshot({ path: path.join(out, `finder-${width}.png`) });
      await page.locator('[data-cd-finder-reset]').click();
      if (width === 390 || width === 1440) {
        await page.locator('#cdhDiarySlot').scrollIntoViewIfNeeded();
        await page.waitForTimeout(250);
        await page.locator('#cdhDiarySlot').screenshot({ path: path.join(out, `diary-${width}.png`) });
        await page.locator('#cdhExpertsSlot').scrollIntoViewIfNeeded();
        await page.waitForTimeout(250);
        await page.locator('#cdhExpertsSlot').screenshot({ path: path.join(out, `experts-${width}.png`) });
        await page.locator('#cdhGatewaySlot').scrollIntoViewIfNeeded();
        await page.waitForTimeout(250);
        await page.locator('#cdhGatewaySlot').screenshot({ path: path.join(out, `chat-${width}.png`) });
      }
      await page.screenshot({ path: path.join(out, `search-${width}.png`), fullPage: true });
      results.push({ width, layout, search: true, contrast: true, errors });
      await page.close();
    }

    const member = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    let profiles = [];
    let mutations = 0;
    const user = { id: 'ui-fixture-user', _id: 'ui-fixture-user', email: 'ui@example.invalid', name: '화면 검증', nickname: '화면 검증', hasLocalAuth: true };
    await member.addInitScript((fixture) => {
      localStorage.setItem('fortune_auth_user', JSON.stringify(fixture));
      localStorage.setItem('fortune_auth_token', 'mock-ui-token');
    }, user);
    await member.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.hostname !== '127.0.0.1') return route.continue();
      if (!url.pathname.startsWith('/api/')) return route.continue();
      let data = { ok: true };
      if (url.pathname === '/api/auth/me') data = { ok: true, user };
      else if (url.pathname === '/api/profile' && route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        const profile = { ...body.profile, id: body.profileId };
        profiles = [profile]; mutations += 1;
        data = { ok: true, profile, profiles, currentId: profile.id };
      } else if (url.pathname.startsWith('/api/profile')) data = { ok: true, profiles, currentId: profiles[0]?.id || '', subscription: { tier: 'none', isActive: false, profileLimit: 1 } };
      else if (/access-state|subscription|pass/.test(url.pathname)) data = { ok: true, user, profiles, currentId: profiles[0]?.id || '', subscription: { tier: 'none', isActive: false }, access: { unlocked: [], features: {} }, entitlements: [] };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
    member.on('dialog', (dialog) => dialog.type() === 'confirm' ? dialog.accept() : dialog.dismiss());
    await member.goto(origin + '/static/index.html', { waitUntil: 'domcontentloaded' });
    await member.waitForSelector('#cdAuthLogoutBtn', { state: 'attached' });
    await member.locator('[data-cdh-free]').first().click();
    await member.locator('#nameInput').fill('꽃길 테스트');
    await member.locator('#birthDate').fill('1995-05-15');
    await member.locator('#birthDate').dispatchEvent('change');
    await member.locator('#dpSaveBtn').click();
    await member.waitForFunction(() => document.getElementById('dpMasterCard')?.textContent.includes('꽃길 테스트'), null, { timeout: 15000 });
    await member.locator('.cdh-input-return').click();
    await member.locator('.cdh-nav [data-action="dpOpenList"]').click();
    await member.waitForFunction(() => document.querySelector('#dpMasterCardHost #dpMasterCard') && document.getElementById('dpListSheet')?.classList.contains('dp-sheet--open'));
    assert.equal(mutations, 1, 'profile creation uses original controller once');
    assert.ok(await member.locator('#dpMasterCardHost #dpMasterCard').isVisible(), 'active profile card and level strip are visible under My');
    assert.ok(await member.locator('#dpMasterCardHost #dpMasterCard .dp-lvl').isVisible(), 'level benefits remain visible under My');
    await member.locator('#dpListSheet .dp-sheet-close').click();
    await member.waitForFunction(() => document.querySelector('#dpDestinyPanel #dpMasterCard'));
    results.push({ memberControls: true, profileCardUnderMy: true, mutations, mockOnly: true });
    await member.close();
  } finally {
    fs.writeFileSync(path.join(out, 'verification.json'), JSON.stringify(results, null, 2));
    await browser.close();
  }
  console.log(JSON.stringify(results, null, 2));
})().catch((error) => { console.error(error); process.exit(1); });
