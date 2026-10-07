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

// 첫 방문은 질문 상담과 무료 운세가 우선이며, 전체 카탈로그는 펼쳐서 탐색한다.
async function assertEssentials(page, label) {
  const essentials = [
    ['search', '#cdhServices #fortuneGatewaySearch'],
    ['methods', '#cdQuickServices'],
    ['concern', '#cdhConcern #cdConcernPick'],
    ['chat', '.cdh-room-link:visible'],
    ['signature', '#cdSignatureConsult'],
  ];
  for (const [name, selector] of essentials) {
    const node = page.locator(selector).first();
    assert.ok(await node.isVisible(), `${label}: ${name} is visible`);
    assert.equal(await node.evaluate((el) => Boolean(el.closest('details:not([open])'))), false, `${label}: ${name} is outside any closed fold`);
  }
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
    for (const [width, height] of [[320, 640], [360, 760], [375, 812], [390, 844], [430, 932], [768, 960], [1280, 900], [1440, 960]]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(origin + '/static/index.html', { waitUntil: 'domcontentloaded' });
      await page.locator('#cdhConcernSlot #cdConcernPick').waitFor({ state: 'attached', timeout: 10000 });
      await page.waitForTimeout(250);
      // 2026-10-07: 처음엔 고민 상담만 고르고 상세 목록은 요청할 때 연다.
      await assertEssentials(page, `${width}px first visit`);
      assert.equal(await page.locator('#fortuneGatewaySearch').getAttribute('placeholder'), '연애, 재물, 이직… 궁금한 운세를 찾아보세요', 'search placeholder');
      assert.equal(await page.locator('#fortuneGatewayRecs').isVisible(), false, 'no search results before input');
      assert.equal(await page.locator('#fortuneGatewayRecs .fortune-gateway__rec').count(), 0, 'no default list rendered before input');
      assert.equal(await page.locator('#fortuneGatewayFilterPanel').evaluate((panel) => panel.open), false, 'search filter panel starts closed');
      assert.equal(await page.locator('#cdhCollections').isVisible(), false, 'collections start folded');
      assert.equal(await page.locator('#cdhMore').evaluate((more) => more.open), false, 'secondary garden starts folded');
      assert.equal(await page.locator('#cdhDiarySlot #cdDiaryPlannerEntry').isVisible(), false, 'diary waits behind one tap');
      const passCta = page.locator('#cdhPass .cdh-pass__btn');
      assert.ok(await passCta.isVisible(), 'pass is visible in the primary flow');
      assert.equal(await passCta.evaluate((node) => Boolean(node.closest('details:not([open])'))), false, 'pass stays outside the closed garden');
      assert.ok(await page.locator('#cdhFeedbackSlot .cd-feedback__cta').isVisible(), 'bug report card stays in the primary flow');
      // 버그 제보실은 한 줄 행이 아니라 마스코트·본문이 보이는 큰 카드다(2026-10-01).
      const bugCard = await page.locator('#cdhFeedbackSlot .cd-feedback__card').evaluate((card) => ({
        height: card.getBoundingClientRect().height,
        cta: card.querySelector('.cd-feedback__cta').getBoundingClientRect().height,
        mascot: card.querySelector('.cd-feedback__mascot img').getBoundingClientRect().width,
        body: getComputedStyle(card.querySelector('.cd-feedback__body')).display,
      }));
      assert.ok(bugCard.height >= (width > 720 ? 160 : 200), `${width}px bug report card is a full card (${bugCard.height}px)`);
      assert.ok(bugCard.cta >= 48 && bugCard.mascot >= 80 && bugCard.body !== 'none', `${width}px bug report card shows its mascot, body and a large CTA`);
      // 닫힌 정원 안은 Tab 순회에 걸리지 않는다.
      assert.equal(await page.evaluate(() => {
        const body = document.getElementById('cdhGardenBody');
        return [...body.querySelectorAll('a[href],button,input,[tabindex]')].some((node) => { node.focus(); return document.activeElement === node; });
      }), false, 'closed garden content cannot take focus');
      const gardenSummary = page.locator('#cdhMore > summary');
      assert.equal(await gardenSummary.getAttribute('aria-controls'), 'cdhGardenBody', 'garden summary controls its body');
      assert.equal(await gardenSummary.getAttribute('aria-expanded'), 'false', 'garden summary reports closed');
      assert.ok(await page.locator('#cdhMore .cdh-more__on').isVisible(), 'closed label offers to open the garden');
      await gardenSummary.click();
      // details 의 toggle 이벤트는 비동기 태스크다 — aria-expanded 동기화를 기다린다(1초 안).
      await page.waitForFunction(() => document.querySelector('#cdhMore > summary').getAttribute('aria-expanded') === 'true', null, { timeout: 1000 });
      assert.ok(await page.locator('#cdhMore .cdh-more__off').isVisible(), 'open label offers to close the garden');
      assert.equal(await page.locator('#cdhMore .cdh-more__on').isVisible(), false, 'only one garden label shows');
      for(const selector of ['#cdQuickServices','#cdConcernPick','#cdSignatureConsult','.cdh-room-link'])assert.ok(await page.locator(selector).first().isVisible(), 'exploration restores '+selector);
      assert.ok(await page.locator('#cdhDiarySlot #cdDiaryPlannerEntry').isVisible(), 'diary restored');
      assert.ok(await page.locator('#cdhExpertsSlot #cdAiFeatures').isVisible(), 'experts restored');
      assert.equal(await page.locator('#cdHomeExpandToggle').count(), 0, 'the garden is the only home fold');
      assert.ok(await page.locator('#cdhCollections').isVisible(), 'collections open with the garden');
      assert.ok(await page.locator('#cdhCollections > .feature-card-grid').count(), 'existing cards live inside the garden');
      assert.ok(await passCta.isVisible(), 'pass remains visible after opening the garden');
      assert.ok(await page.locator('#cdhQuickSlot [data-cdh-free]').isVisible(), 'free saju entry opens with the garden');
      assert.equal(await page.locator('#fortuneGatewayRecs').isVisible(), false, 'opening the garden does not touch search');
      const closeButton = page.locator('#cdhMore [data-cdh-garden-close]');
      await closeButton.focus();
      await closeButton.click();
      assert.equal(await page.locator('#cdhMore').evaluate((more) => more.open), false, 'garden close button folds the garden');
      assert.equal(await gardenSummary.getAttribute('aria-expanded'), 'false', 'garden summary reports closed again');
      assert.ok(await gardenSummary.evaluate((node) => document.activeElement === node), 'closing returns focus to the garden summary');
      const summaryBox = await gardenSummary.boundingBox();
      // scrollIntoView 는 정수 스크롤로 맞추므로 소수 위치의 요약 줄은 위로 1px 미만 넘칠 수 있다(1280 실측 -0.469).
      assert.ok(summaryBox && summaryBox.y >= -1 && summaryBox.y + summaryBox.height <= height + 1, 'garden summary stays on screen after closing');
      if (width <= 430) {
        await page.locator('#cdMobileBottomNav [data-nav-key="fortunes"]').click();
        await page.locator('#cdMobileFortuneOverview.is-open').waitFor();
        assert.ok(await page.locator('#cdMobileFortuneOverview .cd-fov__cat').count() >= 8, 'bottom nav restores all categories');
        await page.locator('#cdMobileFortuneOverview .cd-fov__cat').filter({ hasText: '타로' }).click();
        assert.ok(await page.locator('#tarotCollection.cd-mobile-collection-fullscreen').isVisible(), 'fullscreen collection remains visible outside home containment');
        await page.keyboard.press('Escape');
        assert.ok(await page.locator('#cdhCollections > .feature-card-grid').count(), 'closing restores inline collection parent');
        // The bottom-nav observer removes the fullscreen body class on the next frame.
        await page.locator('#cdhCollections').waitFor({ state: 'hidden' });
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
        moved: Boolean(document.querySelector('#cdhQuickSlot #cdQuickServices') && document.querySelector('#cdhPassSlot .cdh-pass')),
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
        const passColors = await page.locator('#cdhPass').evaluate((host) => {
          const style = (selector) => getComputedStyle(host.querySelector(selector));
          return {
            title: style('.cdh-pass__title').color,
            price: style('.cdh-pass__tier-price').color,
            tierLine: style('.cdh-pass__tier-line').color,
            tierBg: style('.cdh-pass__tier-link').backgroundColor,
            button: style('.cdh-pass__btn').color,
            buttonBg: style('.cdh-pass__btn').backgroundColor,
            background: getComputedStyle(document.body).backgroundColor,
          };
        });
        assert.ok(contrast(passColors.title, passColors.background) >= 4.5, `${width}px ${mode} pass title contrast`);
        assert.ok(contrast(passColors.price, passColors.tierBg) >= 4.5, `${width}px ${mode} pass price contrast`);
        assert.ok(contrast(passColors.tierLine, passColors.tierBg) >= 4.5, `${width}px ${mode} pass tier detail contrast`);
        assert.ok(contrast(passColors.button, passColors.buttonBg) >= 4.5, `${width}px ${mode} pass CTA contrast`);
        await page.screenshot({ path: path.join(out, `home-${mode}-${width}.png`), fullPage: true });
      }

      if (width === 390) {
        await page.locator('#cdhMore > summary').click();
        await page.locator('#cdSignatureConsult').scrollIntoViewIfNeeded();
        await page.waitForTimeout(250);
        const fusionImage = page.locator('.cd-sig-card--fusion .cd-sig-card__img');
        await fusionImage.scrollIntoViewIfNeeded();
        await page.waitForFunction(() => document.querySelector('.cd-sig-card--fusion .cd-sig-card__img')?.naturalWidth > 0);
        assert.ok(await fusionImage.evaluate((image) => image.naturalWidth > 0), 'fusion consultation image loads from the local CDN fixture');
      }

      await page.evaluate(() => { window.__cdCloseGarden(); });
      await page.evaluate(() => { document.documentElement.classList.remove('neo-mode'); document.body.classList.remove('neo-mode'); location.hash = 'services'; });
      await page.waitForFunction(() => document.activeElement && document.activeElement.id === 'fortuneGatewaySearch');
      assert.equal(await page.locator('#cdhMore').evaluate((more) => more.open), false, 'search hash does not open the garden');
      assert.equal(await page.locator('#fortuneGatewayRecs .fortune-gateway__rec').count(), 0, 'search hash alone renders no results');
      const searchBorders = await page.locator('.fortune-gateway__search').evaluate((shell) => ({
        shell: getComputedStyle(shell).borderTopWidth,
        input: getComputedStyle(shell.querySelector('input')).borderTopWidth,
      }));
      assert.equal(searchBorders.shell, '1px');
      assert.equal(searchBorders.input, '0px');
      await page.locator('#fortuneGatewaySearch').fill('검색되지않는없는운세');
      await page.waitForTimeout(250);
      assert.ok(await page.locator('#fortuneGatewayRecs').filter({ hasText: '일치하는 서비스가 없어요' }).isVisible(), 'empty search explains no match');
      await page.locator('#fortuneGatewayDiscover [data-cd-search-clear]').click();
      assert.equal(await page.locator('#fortuneGatewayRecs').isVisible(), false, 'clearing the query hides results again');
      // 정원 안 컬렉션에만 있는 서비스도 검색된다(타일 스크랩). 검색은 정원을 열지 않는다.
      await page.locator('#fortuneGatewaySearch').fill('나크샤트라');
      await page.waitForTimeout(250);
      assert.ok(await page.locator('#fortuneGatewayRecs .fortune-gateway__rec').count() > 0, 'garden-only service is searchable');
      assert.equal(await page.locator('#cdhMore').evaluate((more) => more.open), false, 'search does not open the garden');
      await page.locator('#fortuneGatewayFilterPanel > summary').click();
      await page.locator('[data-price="free"]').click();
      assert.equal(await page.locator('[data-cd-filter-count]').textContent(), '1', 'filter toggle counts active panel filters');
      await page.waitForTimeout(250);
      assert.ok(await page.locator('#fortuneGatewayRecs .fortune-gateway__rec').count() > 0, 'search and free filter');
      assert.ok(await page.locator('#fortuneGatewayDiscover [data-cd-finder-reset]').isVisible(), 'reset appears for active filters');
      await page.locator('#fortuneGatewayDiscover [data-cd-finder-reset]').click();
      assert.equal(await page.locator('#fortuneGatewaySearch').inputValue(), '', 'reset clears search');
      await page.locator('[data-price="low"]').click();
      assert.ok(await page.locator('#fortuneGatewayRecs .fortune-gateway__rec').filter({ hasText: '음악' }).count(), '1000 won filter includes music');
      await page.locator('#cdhServices').screenshot({ path: path.join(out, `finder-${width}.png`) });
      await page.locator('#fortuneGatewayDiscover [data-cd-finder-reset]').click();
      assert.equal(await page.locator('#fortuneGatewayRecs').isVisible(), false, 'reset returns to the empty search state');
      if (width === 390 || width === 1440) {
        await page.locator('#cdhMore > summary').click();
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

    const deepLink = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await deepLink.goto(origin + '/static/index.html#cdhFeatured', { waitUntil: 'domcontentloaded' });
    await deepLink.locator('#cdhFeatured #cdSignatureConsult').waitFor({ state: 'visible', timeout: 10000 });
    assert.equal(await deepLink.locator('#cdhMore').evaluate((more) => more.open), false, 'featured is directly visible without opening more');
    await deepLink.goto(origin + '/static/index.html#cdhPass', { waitUntil: 'domcontentloaded' });
    await deepLink.locator('#cdhPass .cdh-pass__btn').waitFor({ state: 'visible', timeout: 10000 });
    assert.equal(await deepLink.locator('#cdhMore').evaluate((more) => more.open), false, '#cdhPass stays in the primary flow without opening the garden');

    for (const anchor of ['cdhExpertsSlot']) {
      await deepLink.goto(origin + '/static/index.html#' + anchor, { waitUntil: 'domcontentloaded' });
      await deepLink.waitForFunction(() => document.getElementById('cdhMore')?.open === true, null, { timeout: 10000 });
      await deepLink.waitForTimeout(250);
      const box = await deepLink.locator('#' + anchor).boundingBox();
      assert.ok(box && box.y < 844 && box.y + box.height > 0, `#${anchor} deep link opens only the garden and scrolls to the target`);
    }
    results.push({ deepLinkOpensFold: true });
    await deepLink.close();

    // 예전 상태(모두 펼치기 클래스·저장 테마)를 흉내 내도 필수 섹션이 가려지지 않는다.
    const legacy = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
    await legacy.addInitScript(() => {
      try { localStorage.setItem('cdHomeExpanded', '1'); } catch (_) {}
      document.addEventListener('DOMContentLoaded', () => document.documentElement.classList.add('cd-home-expanded'));
    });
    await legacy.goto(origin + '/static/index.html', { waitUntil: 'domcontentloaded' });
    await legacy.locator('#cdhConcernSlot #cdConcernPick').waitFor({ state: 'attached', timeout: 10000 });
    await legacy.waitForTimeout(250);
    await assertEssentials(legacy, 'legacy state');
    assert.equal(await legacy.locator('#cdhMore').evaluate((more) => more.open), false, 'legacy state starts with the garden closed');
    results.push({ legacyStateKeepsEssentials: true });
    await legacy.close();

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
    await assertEssentials(member, 'logged in');
    await member.locator('#cdhMore > summary').click();
    await member.locator('[data-cdh-free]').first().click();
    await member.locator('#nameInput').fill('꽃길 테스트');
    await member.locator('#birthDate').fill('1995-05-15');
    await member.locator('#birthDate').dispatchEvent('change');
    if (!await member.locator('#birthTimeText').isVisible()) {
      await member.locator('#cdMobileSajuDetailToggle').click();
    }
    await member.locator('#birthTimeText').fill('12:00');
    await member.locator('#birthTimeText').blur();
    await member.locator('#dpSaveBtn').click();
    await member.waitForFunction(() => document.getElementById('dpMasterCard')?.textContent.includes('꽃길 테스트'), null, { timeout: 15000 });
    await member.locator('.cdh-input-return').click();
    await member.locator('#cdhAccountBtn').click();
    await member.locator('#cdAccountSheet [data-action="dpOpenList"]').click();
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
