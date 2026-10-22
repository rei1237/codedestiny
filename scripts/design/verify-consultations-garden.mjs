import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { RECORD_SERVICES } from '../../lib/records/service-registry.js';

const origin = process.env.CONSULTATIONS_TEST_ORIGIN || 'http://127.0.0.1:16772';
assert.match(origin, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
const out = path.resolve(process.env.CONSULTATIONS_TEST_OUTPUT || 'build-cache/consultations-garden');
fs.mkdirSync(out, { recursive: true });
// 강약: 대표 상담 여섯 장(홈 덱 순서 — 대표 3종이 먼저) → 다른 상담 일곱 개.
const expected = ['love-secret','new-year','life-book','neo','tea','codex','ziwei','astrology','vedic','sukuyo-compat','legacy-naming','karma','fusion'];
const browser = await chromium.launch({ headless: true });
const evidence = [];
const axeSource = fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
try {
  for (const width of [360,390,430,1280]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    const external = [], mutations = [], errors = [];
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== origin) { external.push(url.origin + url.pathname); return route.abort(); }
      if (url.pathname.startsWith('/api/')) {
        if (request.method() !== 'GET') mutations.push(url.pathname);
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, authenticated: false, user: null, profiles: [], entitlements: [] }) });
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin + '/consultations/', { waitUntil: 'networkidle', timeout: 180000 });
    await page.locator('[data-consultation-hub="garden"]').waitFor();
    assert.deepEqual(await page.locator('main article').evaluateAll(nodes => nodes.map(n => n.dataset.service)), expected);
    for (const id of expected) {
      const service = RECORD_SERVICES.find(row => row.id === id);
      assert.equal(await page.locator(`[data-service="${id}"] a`).getAttribute('href'), service.href);
      await page.locator(`[data-service="${id}"]`).scrollIntoViewIfNeeded();
      await page.locator(`[data-service="${id}"] img`).evaluate(img => img.decode());
    }
    await page.locator('main nav a[href="#others"]').click();
    assert.equal(new URL(page.url()).hash, '#others');
    assert.equal(await page.locator('#others').evaluate(n => Math.round(n.getBoundingClientRect().top)), 24);
    assert.equal(await page.locator('#others #experts [data-service="ziwei"]').count(), 1, 'legacy #experts anchor lands on the other readings');
    // 채움 행동은 첫 장(연애 비책) 하나뿐이고, 라벨이 상품 이름을 말한다.
    assert.match(await page.locator('#signature [data-service="love-secret"] a').innerText(), /연애 비책 시작하기/);
    assert.equal(await page.locator('#signature [data-service="love-secret"] a').evaluate(n => [...n.querySelectorAll('span')].some(s => getComputedStyle(s).backgroundColor === 'rgb(181, 54, 96)')), true);
    assert.equal(await page.locator('main').evaluate(m => [...m.querySelectorAll('a, a span')].filter(n => getComputedStyle(n).backgroundColor === 'rgb(181, 54, 96)').length), 1);
    for (const details of await page.locator('main details').all()) {
      await details.locator('summary').click();
      assert.equal(await details.getAttribute('open'), '');
      await details.locator('summary').click();
    }
    await page.keyboard.press('Tab');
    await page.locator('main a').first().focus();
    assert.equal(await page.locator('main a').first().evaluate(n => getComputedStyle(n).outlineStyle), 'solid');
    await page.addScriptTag({ content: axeSource });
    const audit = await page.evaluate(async () => {
      const main = document.querySelector('main');
      const result = await window.axe.run(main, { runOnly: { type: 'rule', values: ['color-contrast','link-name','heading-order','aria-valid-attr-value'] } });
      const controls = [...main.querySelectorAll('a,summary')].filter(n => n.getClientRects().length);
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        background: getComputedStyle(main).backgroundColor,
        smallTargets: controls.filter(n => n.getBoundingClientRect().height < 44 || n.getBoundingClientRect().width < 44).map(n => n.textContent),
        violations: result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })),
      };
    });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(out, `consultations-${width}.png`), fullPage: true });
    await page.screenshot({ path: path.join(out, `consultations-${width}-first.png`) });
    const firstCta = await page.locator('[data-service="love-secret"] a').boundingBox();
    const navBox = await page.locator('nav.cd-mnav').boundingBox();
    assert.ok(firstCta.y + firstCta.height < navBox.y, JSON.stringify({width, firstCta, navBox}));
    assert.equal(audit.overflow, false);
    assert.equal(audit.background, 'rgb(255, 249, 244)');
    assert.deepEqual(audit.smallTargets, []);
    assert.deepEqual(audit.violations, []);
    // Persona state must not recolor the consultation hub.
    await page.evaluate(() => { document.documentElement.classList.add('neo-mode'); document.body.classList.add('neo-mode'); });
    assert.equal(await page.locator('main').evaluate(n => getComputedStyle(n).backgroundColor), audit.background);
    const nav = page.locator('nav.cd-mnav a[data-nav-key="consult"]');
    assert.equal(await nav.getAttribute('aria-current'), 'page');
    if (width === 390) {
      for (const locale of ['en', 'ja', 'zh-CN', 'zh-TW', 'fr']) {
        await page.goto(origin + '/consultations/?lang=' + locale, { waitUntil: 'networkidle' });
        assert.equal(await page.locator('main article').count(), 13);
        for (const id of ['ziwei','astrology','vedic','sukuyo-compat','legacy-naming']) assert.ok((await page.locator(`[data-service="${id}"] h3`).innerText()).length > 0);
      }
      await context.route('**/feature-details/assets/**', route => route.abort());
      await page.goto(origin + '/consultations/', { waitUntil: 'networkidle' });
      assert.equal(await page.locator('main article a').count(), 13);
      assert.ok(await page.locator('[data-service="neo"] a').isVisible());
    }
    assert.deepEqual(mutations, []);
    assert.deepEqual(errors, []);
    evidence.push({ width, ...audit, cards: 13, externalBlocked: external.length, mutations, errors });
    await context.close();
  }
  fs.writeFileSync(path.join(out, 'evidence.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} finally { await browser.close(); }
