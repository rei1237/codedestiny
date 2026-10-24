// Local-only visual and interaction verification for the simplified home (2026-10-17 "직관성").
// 홈 흐름: 짧은 히어로(골드 Brand CTA) → 대표 상담 덱 Ⅰ–Ⅵ(2열/3열 격자) → 초융합 띠 → 무료로 먼저(6장) → 꿀방울 출석 → 1:1 상담(연이·네오) → 이용권 → 뮤직비디오 → "모든 운세 보기" 버튼 → 달빛 이야기(노벨·음악 카드) → 푸터.
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

// 첫 방문에 보여야 하는 것은 이것뿐이다. 접힌 곳(details)에 들어가 있으면 안 된다.
async function assertEssentials(page, label) {
  assert.equal(await page.locator('a[href="/mini-games/"], a[href="/saju/love-simulation/"], a[href*="secret-house_real"]').count(), 0, label + ': paused content has no home entry');
  const essentials = [
    ['hero CTA', '.cdh-hero .cdh-primary'],
    ['signature deck', '#cdSignatureConsult'],
    ['sample guide', '#cdSignatureConsult .cd-sig__samples-link[href="/consultation-samples/"]'],
    ['free first', '#cdQuickServices'],
    ['pass', '#cdhPass .cdh-pass__btn'],
    ['all fortunes button', '.cdh-all-cta__btn'],
    // 미니게임은 쉬는 중이다(b8f2fcb7a). 마지막 줄은 "작은 운세 한 모금" 접힘이고, 접힘 버튼(summary)이 보이면 된다.
    ['light fortunes fold', '#cdhLightFortunes > summary'],
    ['yeoni consultation door', '#fortuneGatewayEntry'],
    ['neo letter consultation', '#cdhNeoLetterSlot .cdh-neo-letter'],
    ['yeongnyangi main banner', '#cdhYeongnyangiSlot .cd-soulcat-entry .cd-soulcat-entry__cta'],
    ['music video', '#cdhMoonlightMv'],
    ['moonlight story toggle', '.cdh-story__toggle'],
  ];
  for (const tab of await page.locator('[data-consult-tab]').all()) {
    await tab.click();
    assert.equal(await tab.getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('.cdh-consult > [role=tabpanel]:visible').count(), 1);
  }
  await page.locator('[data-consult-tab]').first().click();
  for (const [name, selector] of essentials) {
    const node = page.locator(selector).first();
    assert.ok(await node.isVisible(), `${label}: ${name} is visible`);
    // 닫힌 details 의 summary(접힘 버튼 자체)는 보이는 자리다 — 그 안쪽 내용만 접힌 곳으로 친다.
    assert.equal(await node.evaluate((el) => { const fold = el.closest('details:not([open])'); return Boolean(fold && !fold.querySelector(':scope > summary')?.contains(el)); }), false, `${label}: ${name} is outside any closed fold`);
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
      await page.locator('#cdSigGrid').waitFor({ state: 'attached', timeout: 10000 });
      await page.waitForTimeout(250);
      await assertEssentials(page, `${width}px first visit`);

      // 강약: 대표 상담 → 초융합 시그니처 → 무료로 먼저 → 꿀방울 → 1:1 상담 → 영냥이 배너 → 질문 카테고리 → 이용권 → 뮤직비디오 → 모든 운세 버튼 → 링크 → 달빛 이야기. DOM 순서와 화면 순서가 같다.
      const order = await page.evaluate(() => {
        const nodes = [document.getElementById('cdSignatureConsult'), document.getElementById('cdhFusionSignature'), document.getElementById('cdQuickServices'), document.querySelector('.cdh-honey'), document.querySelector('.cdh-consult-browser'), document.getElementById('cdConcernPick'), document.getElementById('cdhPass'), document.querySelector('.cdh-all-cta'), document.querySelector('.cdh-links'), document.getElementById('cdhMoonlightMv'), document.querySelector('.cdh-story')];
        return {
          dom: nodes.every((node, index) => index === 0 || Boolean(nodes[index - 1].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)),
          visual: nodes.map((node) => node.getBoundingClientRect().top + scrollY),
        };
      });
      assert.ok(order.dom, `${width}px home flow keeps signature → fusion → free → honey → consult → questions → pass → MV → all fortunes → links → story in DOM`);
      assert.ok(order.visual.every((top, index) => index === 0 || top > order.visual[index - 1]), `${width}px home flow keeps the same visual order (${order.visual.map(Math.round).join(' < ')})`);

      // 걷어낸 블록은 홈 마크업에 다시 생기지 않는다. 기능 페이지와 URL은 그대로다.
      for (const selector of ['#cdhMore', '#cdhServices', '#cdTodayHub', '#cdhFlowerTitle', '[data-cdh-chemi]', '#cdhFeedbackSlot', '#cdhSignupBenefit', '.cdh-moonstone-guide', '#cdhSamples', '.cdh-portals']) {
        assert.equal(await page.locator(selector).count(), 0, `${width}px ${selector} is gone from home`);
      }
      // 홈 밖 셸 블록은 화면에서만 숨긴다(마크업과 기능은 다른 화면이 쓴다).
      for (const selector of ['#cdStickyCta', '#cdMobileHeader', '#cdAppInstall', '#cdFinalCtaBand', '#authQuickLinks', '#cdhCollectionsWrap']) {
        assert.equal(await page.locator(selector).isVisible(), false, `${width}px ${selector} stays off the home screen`);
      }

      assert.match(await page.locator('#cdhTitle').innerText(), /명리학자/, `${width}px hero states who designed the consultations`);
      assert.equal(await page.locator('.cdh-hero .cdh-primary').getAttribute('href'), '#cdSignatureConsult', `${width}px hero CTA leads to the deck`);
      assert.match(await page.locator('.cdh-hero .cdh-primary').evaluate((node) => getComputedStyle(node).backgroundImage), /gradient/, `${width}px hero CTA is the gold Brand pill`);
      assert.equal(await page.locator('#cdQuickServices .cdh-free-card').count(), 6, `${width}px free first offers the six methods`);
      assert.equal(await page.locator('#cdQuickServices .cdh-free-card').first().getAttribute('data-cdh-free'), '', `${width}px the first free card opens the one-step saju`);
      // 초융합 시그니처 띠: 다섯 마스터 · 50,000원 · 초융합 페이지로.
      assert.equal(await page.locator('#cdhFusionSignature .cdh-fusion-sig__masters li').count(), 5, `${width}px fusion band shows the five masters`);
      assert.equal(await page.locator('#cdhFusionSignature .cdh-fusion-sig__cta').getAttribute('href'), '/fusion-fortune/?from=home_signature', `${width}px fusion band CTA opens fusion fortune`);
      assert.match(await page.locator('#cdhFusionSignature .cdh-fusion-sig__cta').textContent(), /50,000원/, `${width}px fusion band states 50,000원`);
      // 다른 재밌는 운세: 질문 카테고리 8개, 패널은 한 번에 하나('사랑'이 기본으로 열림), 카테고리를 누르면 그 패널만 남는다.
      assert.equal(await page.locator('#cdConcernPick .cd-concern__card').count(), 8, `${width}px eight question categories`);
      assert.equal(await page.locator('#cdConcernPick .cd-concern__panel:not([hidden])').count(), 1, `${width}px one question panel open`);
      assert.equal(await page.locator('#cdConcernPanelLove').isVisible(), true, `${width}px love panel opens first`);
      await page.locator('#cdConcernPick [data-cd-concern="future"]').click();
      assert.equal(await page.locator('#cdConcernPanelFuture').isVisible(), true, `${width}px future panel opens on tap`);
      assert.equal(await page.locator('#cdConcernPanelLove').isVisible(), false, `${width}px previous panel closes`);
      assert.equal(await page.locator('#cdConcernPanelFuture [data-cd-question="futureCross"]').getAttribute('data-cd-price-key'), 'fusion-fortune-consultation', `${width}px cross-check question leads to fusion fortune`);
      assert.equal(await page.locator('#cdConcernPick .cd-concern__q-link img').first().evaluate((img) => getComputedStyle(img).backgroundColor) !== 'rgb(229, 229, 229)', true, `${width}px question avatar has no grey box`);
      assert.equal(await page.locator('#cdhLightFortunes').evaluate((node) => node.open), false, `${width}px light fortunes start folded`);
      assert.ok(await page.locator('#cdhLightFortunes .cdh-light__list a').count() > 0, `${width}px light fortunes fold holds its links`);
      assert.equal(await page.locator('#fortuneGatewayEntry').count(), 1, `${width}px one Yeoni consultation door`);
      assert.match(await page.locator('#fortuneGatewayEntry').textContent(), /5,000원/, `${width}px Yeoni door states 5,000원`);
      assert.deepEqual(await page.locator('#cdQuickServices .cdh-free-card').evaluateAll((cards) => cards.map((card) => card.dataset.cdServiceId)), ['saju', 'tarot', 'ziwei', 'sukuyo', 'vedic', 'astrology'], `${width}px free cards keep the method order`);
      assert.equal(await page.locator('#cdQuickServices .cdh-free-card img').first().evaluate((img) => getComputedStyle(img).backgroundColor), 'rgba(0, 0, 0, 0)', `${width}px free card icon has no grey box`);
      // 달빛 이야기: 접혀 있다가 열면 노벨·음악 카드 두 장이 펼쳐진다.
      assert.equal(await page.locator('.cdh-story__card').first().isVisible(), false, `${width}px story cards start folded`);
      await page.locator('.cdh-story__toggle').click();
      const story = await page.locator('.cdh-story__card').evaluateAll((cards) => cards.map((card) => ({ href: card.getAttribute('href'), top: Math.round(card.getBoundingClientRect().top), visible: card.getBoundingClientRect().width > 0 })));
      assert.deepEqual(story.map((card) => card.href), ['/codedestiny-novel.html', '/music/'], `${width}px story holds novel and music`);
      // 640px 이하는 한 줄에 한 장씩 쌓는다(styles/home-funnel.css .cdh-story__spread).
      const sideBySide = width > 640;
      assert.ok(story.every((card) => card.visible) && (Math.abs(story[0].top - story[1].top) < 40) === sideBySide, `${width}px story cards open ${sideBySide ? 'side by side' : 'stacked'}`);
      await page.locator('.cdh-story__toggle').click();

      // 대표 상담 덱: 700 미만 2열, 이상 3열 격자(가로 스크롤·위치 점 없음). 대표 상담 3종이 첫 줄이고, 라벨은 텍스트 링크다.
      assert.equal(await page.locator('#cdSigGrid .cd-sig-card').count(), 6, `${width}px deck has six cards`);
      assert.equal(await page.locator('#cdSignatureConsult .cd-sig-card__img').count(), 6, `${width}px each card carries its visual`);
      assert.deepEqual(await page.locator('#cdSigGrid .cd-sig-card').evaluateAll((cards) => cards.slice(0, 3).map((card) => card.dataset.cdServiceId)), ['love-secret-ai', 'new-year-ai', 'life-book-ai'], `${width}px the three signature consultations lead the deck`);
      const grid = await page.locator('#cdSigGrid').evaluate((node) => { const cs = getComputedStyle(node); const cols = cs.gridTemplateColumns.split(' ').length; const row = [...node.querySelectorAll('.cd-sig-card')].slice(0, cols).map((card) => card.getBoundingClientRect()); return { flow: cs.gridAutoFlow, overflowX: cs.overflowX, cols, heights: row.map((r) => Math.round(r.height)), top: row[0].top }; });
      assert.ok(grid.flow.startsWith('row') && grid.overflowX === 'visible', `${width}px deck is a grid, not a carousel (${grid.flow}, ${grid.overflowX})`);
      assert.equal(grid.cols, width <= 700 ? 1 : 3, `${width}px deck shows ${width <= 700 ? 1 : 3} columns`);
      assert.equal(await page.locator('#cdSigGrid .cd-sig-card:visible').count(),3,'Three featured consultations');
      await page.locator('.cd-sig__more > summary').click();
      assert.equal(await page.locator('#cdSigGrid .cd-sig-card:visible').count(),6,'Six consultations remain reachable');
      await page.locator('.cd-sig__more > summary').click();
      // 카드 높이는 내용이 정한다(f75f35c88에서 2:3 고정을 뗐다). 같은 줄의 카드는 높이가 같아야 가격·라벨 줄이 맞는다.
      assert.ok(Math.max(...grid.heights) - Math.min(...grid.heights) <= 1, `${width}px first deck row cards share one height (${grid.heights.join(', ')})`);
      assert.equal(await page.locator('.cd-sig__dots, [data-cd-sig-dot]').count(), 0, `${width}px deck has no position dots`);
      // 첫 화면에서 덱의 첫 줄이 보이기 시작한다.
      assert.ok(grid.top < height, `${width}px first deck card starts inside the first viewport (${Math.round(grid.top)} < ${height})`);
      assert.equal(await page.locator('#cdSigGrid .cd-sig-card__cta').evaluateAll((labels) => labels.filter((label) => getComputedStyle(label).backgroundColor !== 'rgba(0, 0, 0, 0)').length), 0, `${width}px deck labels stay text links`);

      // 채움 CTA = 배경과 대비 1.5 이상인 불투명 채움이나 그라디언트를 가진 버튼 크기(72px 이하) 요소.
      const fills = await page.evaluate(() => {
        const parse = (c) => { const n = (c.match(/-?[0-9.]+/g) || []).map(Number); if (n.length < 3) return { r: 0, g: 0, b: 0, a: 0 }; const k = c.startsWith('color(') ? 255 : 1; return { r: n[0] * k, g: n[1] * k, b: n[2] * k, a: n.length > 3 ? n[3] : 1 }; };
        const lum = ({ r, g, b }) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
        const backdrop = (node) => { for (let el = node; el; el = el.parentElement) { const c = parse(getComputedStyle(el).backgroundColor); if (c.a >= 0.5) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
        // 그라디언트는 맨 위 층(버튼 면)의 색이 배경과 구분될 때만 채움이다. 하단 종이 질감 버튼(f0cd52449)은 면이 아이보리이고, 금박은 그 아래 테두리 층이다.
        const filled = (el) => { const cs = getComputedStyle(el); const back = lum(backdrop(el.parentElement)); const strong = (c) => { if (c.a < 0.5) return false; const [hi, lo] = [lum(c), back].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05) >= 1.5; }; const face = (cs.backgroundImage.match(/(?:repeating-)?(?:linear|radial|conic)-gradient\((?:[^()]|\([^()]*\))*\)/) || [''])[0]; return (face.match(/(?:rgba?|color)\([^)]*\)/g) || []).some((stop) => strong(parse(stop))) || strong(parse(cs.backgroundColor)); };
        // 상단 바·고정 유틸리티(언어 선택 등)는 콘텐츠 CTA가 아니다.
        const fixedAncestor = (node) => { if (node.closest('.cdh-top')) return true; for (let el = node; el; el = el.parentElement) { if (/fixed|sticky/.test(getComputedStyle(el).position)) return true; } return false; };
        const ctas = (root) => [...root.querySelectorAll('a,button')].filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height <= 72 && getComputedStyle(el).visibility !== 'hidden' && !fixedAncestor(el); });
        const label = (el) => el.className || el.textContent.trim().slice(0, 20);
        return {
          firstViewport: ctas(document.getElementById('cdHomeFunnel')).filter((el) => { const r = el.getBoundingClientRect(); return r.top + scrollY < innerHeight && r.bottom + scrollY > 0; }).filter(filled).map(label),
          allCta: filled(document.querySelector('.cdh-all-cta__btn')),
          links: [...document.querySelectorAll('.cdh-links a')].some(filled),
        };
      });
      assert.equal(fills.firstViewport.length, 1, `${width}px first viewport has one filled CTA (${fills.firstViewport.join(', ')})`);
      assert.match(fills.firstViewport[0], /cdh-primary/, `${width}px the one fill is the hero CTA`);
      assert.equal(fills.allCta, false, `${width}px "all fortunes" stays an outline button`);
      assert.equal(fills.links, false, `${width}px the closing link row stays text`);

      // "모든 운세 보기" 버튼 하나가 검색·방식·고민 목록을 연다.
      await page.locator('.cdh-all-cta__btn').click();
      await page.waitForFunction(() => Boolean(document.getElementById('cdAllFortunes')?.open || document.getElementById('cdMobileFortuneOverview')?.classList.contains('is-open')), null, { timeout: 3000 });
      const mobileList = width <= 900;
      assert.equal(await page.evaluate(() => document.getElementById('cdMobileFortuneOverview')?.classList.contains('is-open') === true), mobileList, `${width}px all fortunes opens the ${mobileList ? 'overview overlay' : 'sheet'}`);
      const search = page.locator('#cdAllFortunesSearch');
      assert.ok(await search.isVisible(), `${width}px all-fortunes search is visible`);
      await search.fill('');
      await page.locator('#cdAllFortunesRoot [data-cd-finder-reset]').evaluate((button) => { if (!button.hidden) button.click(); });
      await page.waitForTimeout(150);
      assert.ok(await page.locator('#cdAllFortunesResults a, #cdAllFortunesResults button').count() > 20, `${width}px the list shows every fortune before input`);
      await search.fill('검색되지않는없는운세');
      await page.waitForTimeout(250);
      assert.ok(await page.locator('#cdAllFortunesResults .cd-af__empty-title').isVisible(), `${width}px empty search explains no match`);
      assert.ok(await page.locator('#cdAllFortunesRoot [data-cd-search-clear]').isVisible(), `${width}px clear button appears with a query`);
      await page.locator('#cdAllFortunesRoot [data-cd-search-clear]').click();
      assert.equal(await search.inputValue(), '', `${width}px clear empties the query`);
      await search.fill('나크샤트라');
      await page.waitForTimeout(250);
      assert.ok(await page.locator('#cdAllFortunesResults a, #cdAllFortunesResults button').count() > 0, `${width}px a collection-only service is searchable`);
      await search.fill('');
      await page.locator('#cdAllFortunesRoot [data-method="tarot"]').click();
      assert.equal(await page.locator('#cdAllFortunesRoot [data-method="tarot"]').getAttribute('aria-pressed'), 'true', `${width}px method chip toggles on`);
      await page.waitForTimeout(250);
      assert.ok(await page.locator('#cdAllFortunesResults a, #cdAllFortunesResults button').count() > 0, `${width}px tarot filter finds services`);
      assert.ok(await page.locator('#cdAllFortunesRoot [data-cd-finder-reset]').isVisible(), `${width}px reset appears for an active filter`);
      await page.locator('#cdAllFortunesRoot [data-cd-finder-reset]').click();
      assert.equal(await page.locator('#cdAllFortunesRoot [data-method="tarot"]').getAttribute('aria-pressed'), 'false', `${width}px reset clears the filter`);
      if (width === 390 || width === 1440) await page.screenshot({ path: path.join(out, `all-fortunes-${width}.png`) });
      if (mobileList) await page.keyboard.press('Escape');
      else await page.locator('#cdAllFortunes [data-cd-sheet-close]').click();
      await page.waitForFunction(() => !(document.getElementById('cdAllFortunes')?.open || document.getElementById('cdMobileFortuneOverview')?.classList.contains('is-open')), null, { timeout: 3000 });
      assert.equal(await page.locator('#cdhCollectionsWrap').isVisible(), false, `${width}px closing the list leaves collections folded`);

      // 예전 검색 해시(#services)는 같은 모든 운세 목록을 연다. 모바일은 마지막으로 본 컬렉션을 다시 여는
      // 기존 동작이 있어서, 컬렉션을 열기 전(하단 탭 흐름 앞)에 확인한다.
      await page.evaluate(() => { location.hash = 'services'; });
      await page.waitForFunction(() => Boolean(document.getElementById('cdAllFortunes')?.open || document.getElementById('cdMobileFortuneOverview')?.classList.contains('is-open')), null, { timeout: 3000 });
      assert.equal(await page.evaluate(() => location.hash), '', `${width}px #services hash is consumed after opening the list`);
      if (mobileList) await page.keyboard.press('Escape');
      else await page.locator('#cdAllFortunes [data-cd-sheet-close]').click();
      await page.waitForFunction(() => !(document.getElementById('cdAllFortunes')?.open || document.getElementById('cdMobileFortuneOverview')?.classList.contains('is-open')), null, { timeout: 3000 });

      if (width <= 430) {
        await page.locator('#cdMobileBottomNav [data-nav-key="fortunes"]').click();
        await page.locator('#cdMobileFortuneOverview.is-open').waitFor();
        assert.ok(await page.locator('#cdMobileFortuneOverview .cd-fov__cat').count() >= 8, 'bottom nav restores all categories');
        await page.locator('#cdMobileFortuneOverview .cd-fov__cat').filter({ hasText: '타로' }).first().click();
        assert.ok(await page.locator('#tarotCollection.cd-mobile-collection-fullscreen').isVisible(), 'fullscreen collection remains visible outside home containment');
        await page.keyboard.press('Escape');
        assert.ok(await page.locator('#cdhCollections > .feature-card-grid').count(), 'closing restores inline collection parent');
        // The bottom-nav observer removes the fullscreen body class on the next frame.
        await page.locator('#cdhCollectionsWrap').waitFor({ state: 'hidden' });
        assert.equal(await page.locator('#cdhCollectionsWrap').isVisible(), false, 'closing overlay restores folded home');
      }

      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        width: document.getElementById('cdHomeFunnel').getBoundingClientRect().width,
        unique: ['cdQuickServices', 'cdSignatureConsult', 'cdhPass', 'cdAllFortunes', 'cdhTitle'].every((id) => document.querySelectorAll('#' + id).length === 1),
        neoButton: Boolean(document.querySelector('#cdhThemeSlot [data-theme-mode="neo"]')),
        moved: Boolean(document.querySelector('#cdhQuickSlot #cdQuickServices') && document.querySelector('#cdhPassSlot .cdh-pass')),
        profileCardOnHome: Boolean(document.querySelector('#cdHomeFunnel #dpMasterCard')),
      }));
      assert.equal(layout.overflow, false, `${width}px overflow`);
      assert.ok(layout.unique && layout.moved, `${width}px reuses unique legacy nodes`);
      assert.ok(layout.neoButton, `${width}px Neo control visible in common header`);
      assert.equal(layout.profileCardOnHome, false, `${width}px keeps the full profile card under My`);
      if (width >= 1280) assert.ok(layout.width > 1000, `${width}px uses expanded desktop canvas`);
      if (width <= 430) assert.ok(layout.width <= width, `${width}px fits mobile canvas`);

      for (const mode of ['yeoni', 'neo']) {
        if (mode === 'neo') await page.locator('#cdhThemeSlot [data-theme-mode="neo"]').click({ force: true });
        else await page.evaluate(() => { document.documentElement.classList.remove('neo-mode'); document.body.classList.remove('neo-mode'); });
        await page.waitForFunction((neo) => document.documentElement.classList.contains('neo-mode') === neo, mode === 'neo');
        await page.locator('body').evaluate(async (node) => { await Promise.all(node.getAnimations().map((animation) => animation.finished.catch(() => {}))); });
        // 글자색 대 가장 가까운 불투명 바탕색.
        const pairs = await page.evaluate(() => {
          const parse = (c) => { const n = (c.match(/-?[0-9.]+/g) || []).map(Number); return { a: n.length > 3 ? n[3] : 1 }; };
          const backdrop = (node) => { for (let el = node; el; el = el.parentElement) { const bg = getComputedStyle(el).backgroundColor; if (parse(bg).a >= 0.5) return bg; } return 'rgb(255, 255, 255)'; };
          const pair = (selector) => { const node = document.querySelector(selector); return node ? { selector, color: getComputedStyle(node).color, background: backdrop(node) } : { selector, missing: true }; };
          return ['#cdSignatureConsult h2', '.cdh-free h2', '.cdh-free-card', '.cdh-all-cta__btn', '.cdh-all-cta__label', '.cdh-links a', '.cdh-free-card__copy strong', '.cdh-story__label strong', '#cdhPass .cdh-pass__title', '#cdhPass .cdh-pass__tier-price', '#cdhPass .cdh-pass__tier-line', '#cdhPass .cdh-pass__btn'].map(pair);
        });
        for (const item of pairs) {
          assert.ok(!item.missing, `${width}px ${mode} ${item.selector} exists`);
          assert.ok(contrast(item.color, item.background) >= 4.5, `${width}px ${mode} ${item.selector} contrast (${contrast(item.color, item.background).toFixed(2)})`);
        }
        await page.screenshot({ path: path.join(out, `home-${mode}-${width}.png`), fullPage: true });
      }
      await page.evaluate(() => { document.documentElement.classList.remove('neo-mode'); document.body.classList.remove('neo-mode'); });

      if (width === 390) {
        const leadImage = page.locator('.cd-sig-card--love .cd-sig-card__img');
        await leadImage.scrollIntoViewIfNeeded();
        await page.waitForFunction(() => document.querySelector('.cd-sig-card--love .cd-sig-card__img')?.naturalWidth > 0);
        assert.ok(await leadImage.evaluate((image) => image.naturalWidth > 0), 'deck card image loads from the local CDN fixture');
      }

      assert.deepEqual(errors, [], `${width}px raises no page errors`);
      results.push({ width, layout, allFortunes: true, contrast: true, errors });
      await page.close();
    }

    const deepLink = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await deepLink.goto(origin + '/static/index.html#cdhFeatured', { waitUntil: 'domcontentloaded' });
    await deepLink.locator('#cdhFeatured #cdSignatureConsult').waitFor({ state: 'visible', timeout: 10000 });
    await deepLink.goto(origin + '/static/index.html#cdhPass', { waitUntil: 'domcontentloaded' });
    await deepLink.locator('#cdhPass .cdh-pass__btn').waitFor({ state: 'visible', timeout: 10000 });
    results.push({ deepLinks: ['#cdhFeatured', '#cdhPass'] });
    await deepLink.close();

    // 예전 상태(모두 펼치기 클래스)를 흉내 내도 필수 섹션이 가려지지 않는다.
    const legacy = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
    await legacy.addInitScript(() => {
      try { localStorage.setItem('cdHomeExpanded', '1'); } catch (_) {}
      document.addEventListener('DOMContentLoaded', () => document.documentElement.classList.add('cd-home-expanded'));
    });
    await legacy.goto(origin + '/static/index.html', { waitUntil: 'domcontentloaded' });
    await legacy.locator('#cdSigGrid').waitFor({ state: 'attached', timeout: 10000 });
    await legacy.waitForTimeout(250);
    await assertEssentials(legacy, 'legacy state');
    assert.equal(await legacy.locator('#cdhCollectionsWrap').isVisible(), false, 'legacy state keeps collections folded');
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
    await member.waitForFunction(() => document.getElementById('sajuCalcLoadingOverlay')?.getAttribute('aria-hidden') === 'true', null, { timeout: 30000 });
    await member.goto(origin + '/static/index.html', { waitUntil: 'domcontentloaded' });
    await member.waitForSelector('#cdAuthLogoutBtn', { state: 'attached' });
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
