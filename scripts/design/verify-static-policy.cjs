const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const origin = process.env.HOME_UI_ORIGIN || 'http://127.0.0.1:22740';
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) throw new Error('Local verification only');

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 360, height: 800 } });
    await page.route('**/*', (route) => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
    for (const routeName of ['terms', 'terms-of-service', 'privacy', 'privacy-policy', 'refund-policy', 'contact', 'contact-us', 'about', 'faq']) {
      const response = await page.goto(`${origin}/${routeName}/`, { waitUntil: 'load' });
      assert.equal(response.status(), 200, routeName);
      assert.equal(await page.locator('body.cd-policy-static').count(), 1, routeName);
      assert.ok(await page.locator('main h1').first().isVisible(), `${routeName}: visible h1`);
      for (const width of [360, 390, 430, 768, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${routeName}: ${width}px overflow`);
      }
      if (routeName === 'contact') assert.ok(await page.locator('.policy-nojs a[href^="mailto:"]').isVisible());
    }
    console.log('[static-policies] 9 URLs, 5 widths and no-JS body passed');
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
