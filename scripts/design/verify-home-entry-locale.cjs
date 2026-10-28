// Run against the mock development server; never changes a real user's preferences.
// HOME_ENTRY_TEST_URL=http://127.0.0.1:24210 node scripts/design/verify-home-entry-locale.cjs
const { chromium } = require('@playwright/test');
const assert = require('node:assert/strict');

const base = new URL(process.env.HOME_ENTRY_TEST_URL || 'http://127.0.0.1:3000');
assert.ok(['127.0.0.1', 'localhost'].includes(base.hostname), 'Use a local mock preview');
const locales = ['ko', 'ja', 'en', 'zh-CN', 'zh-TW', 'vi', 'hi', 'es', 'fr', 'de', 'nl', 'ms'];

(async () => {
  const browser = await chromium.launch();
  try {
    for (const locale of locales) {
      const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 900 } });
      try {
        await context.addInitScript(value => {
          localStorage.setItem('cd_lang', value);
          localStorage.setItem('cd_lang_ack', '1');
          localStorage.setItem('cd_lang_explicit', '1');
        }, locale);
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(base.href, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => typeof window.cdGetCurrentLanguage === 'function');
        assert.equal(await page.locator('[data-home-card]').count(), 2, locale + ': cards survive hydration');
        assert.equal(await page.locator('#homeCardTitle').textContent(), '어떤 운세를 만나볼까요?');
        assert.equal(await page.locator('[data-home-card="yeoni"] a').getAttribute('href'), '/ggulggul/');
        assert.equal(await page.locator('[data-home-card="yn"] a').getAttribute('href'), '/yeongnyangi/');
        assert.equal(await page.locator('#homeCardTitle').evaluate(e => e.closest('[lang]').lang), 'ko');
        assert.ok((await page.locator('[data-home-disclosure]').evaluateAll(es => es.map(e => e.open))).every(open => !open));
        assert.equal(await page.evaluate(() => localStorage.getItem('cd_lang')), locale);
        await page.locator('[data-home-disclosure="guide"] > summary').focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('.consultation-choice:visible').count(), 2);
        // Live native-app locale changes must not replace or collapse the guide.
        await page.evaluate(() => {
          window.__cdAppLanguage = 'ja';
          window.dispatchEvent(new CustomEvent('cd:locale-ready', { detail: { lang: 'ja', source: 'android' } }));
        });
        assert.equal(await page.locator('[data-home-card]').count(), 2);
        assert.equal(await page.locator('[data-home-disclosure="guide"]').evaluate(e => e.open), true);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.deepEqual(errors, []);
        console.log('PASS stored locale, live locale, cards and disclosure:', locale);
      } finally { await context.close(); }
    }
    const context = await browser.newContext({ serviceWorkers: 'block' });
    try {
      const page = await context.newPage();
      await page.goto(new URL('/?lang=ja#homeServices', base).href, { waitUntil: 'networkidle' });
      assert.equal(await page.locator('[data-home-card]').count(), 2);
      assert.equal(await page.locator('#homeExplore').evaluate(e => e.open), true);
      assert.equal(await page.evaluate(() => localStorage.getItem('cd_lang')), 'ja');
      console.log('PASS Japanese query and deep link');
    } finally { await context.close(); }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
