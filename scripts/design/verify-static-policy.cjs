const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = process.env.HOME_UI_ORIGIN || 'http://127.0.0.1:22740';
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) throw new Error('Local verification only');
(async () => {
  const browser = await chromium.launch();
  const results = [];
  try {
    const page = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 360, height: 800 } });
    await page.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
    for (const route of ['terms', 'terms-of-service', 'privacy', 'privacy-policy', 'refund-policy', 'contact', 'contact-us', 'about', 'faq']) {
      const response = await page.goto(`${origin}/${route}/`, { waitUntil: 'load' });
      assert.equal(response.status(), 200, route);
      assert.equal(await page.locator('body.cd-policy-static').count(), 1);
      for (const width of [360, 390, 430, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route}: ${width}px overflow`);
      }
      if (route === 'privacy') {
        await page.locator('#privacy-at-a-glance summary').click();
        assert.notEqual(await page.locator('#privacy-at-a-glance').getAttribute('open'), null, 'native details opens without JS');
      }
      if (route === 'faq') {
        await page.locator('#faq-list details summary').first().click();
        assert.notEqual(await page.locator('#faq-list details').first().getAttribute('open'), null, 'native FAQ opens without JS');
      }
      if (route === 'contact') assert(await page.locator('.policy-nojs a[href^="mailto:"]').isVisible());
      results.push({ route, status: 200, noJavaScript: true, widths: [360, 390, 430, 1280] });
    }
    const reactPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const documents = [];
    await reactPage.route('**/*', r => {
      const url = new URL(r.request().url());
      if (url.hostname !== '127.0.0.1') return r.abort();
      if (url.pathname.startsWith('/api/')) return r.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
      return r.continue();
    });
    reactPage.on('request', r => { if (r.resourceType() === 'document') documents.push(r.url()); });
    await reactPage.goto(origin + '/account/delete/', { waitUntil: 'load', timeout: 90000 });
    const privacyLink = reactPage.getByRole('link', { name: '개인정보처리방침', exact: true }).first();
    await privacyLink.evaluate(a => { a.href = '/privacy/?from=policy-check#retention'; });
    await privacyLink.click();
    await reactPage.waitForSelector('body.cd-policy-static');
    assert.ok(documents.some(url => new URL(url).pathname === '/privacy/'), 'React link performs a document navigation');
    assert.equal(new URL(reactPage.url()).search, '?from=policy-check');
    assert.equal(new URL(reactPage.url()).hash, '#retention');
    results.push({ reactToStaticDocument: true, queryAndHashPreserved: true });
  } finally { await browser.close(); }
  fs.mkdirSync('build-cache/static-policies', { recursive: true });
  fs.writeFileSync('build-cache/static-policies/verification.json', JSON.stringify(results, null, 2));
  console.log('[static-policies] 9 URLs, 4 widths, native FAQ/details and no-JS contact fallback passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
