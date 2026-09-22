// Development preview only: the report fixture is local and no paid service is called.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const origin = process.env.KARMA_SHARE_ORIGIN || 'http://127.0.0.1:3107';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Local origin required');
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const state of ['success', 'legacy']) {
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${origin}/karma-destiny-ai/result/?preview=${state}`, { waitUntil: 'domcontentloaded' });
      const share = page.locator('[data-consultation-share="karma"]');
      await share.waitFor();
      await share.locator('summary').first().click();
      await share.locator('select').waitFor();
      assert.ok(await share.locator('select option').count() >= 2, `${state}: saved choices`);
      await share.locator('textarea').first().fill('내가 고른 작은 선택');
      await share.locator('figure img').waitFor();
      assert.equal(await page.locator('[data-kdai-pdf-page] [data-consultation-share]').count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${state} ${width}px overflow`);
      const imageSave = share.getByRole('button', { name: '이미지 저장' });
      await imageSave.scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      assert.equal(await imageSave.evaluate(element => {
        const bounds = element.getBoundingClientRect();
        return document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)?.closest('button') === element;
      }), true, `${state} ${width}px image action covered`);
      if (process.env.KARMA_SHARE_SCREENSHOT_DIR) await share.screenshot({ path: `${process.env.KARMA_SHARE_SCREENSHOT_DIR}/karma-${state}-${width}.png` });
      console.log(`PASS karma ${state} ${width}px: saved excerpt editor, preview, PDF separation, overflow`);
    }
  }
  for (const state of ['truncated', 'failed']) {
    await page.goto(`${origin}/karma-destiny-ai/result/?preview=${state}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    assert.equal(await page.locator('[data-consultation-share="karma"]').count(), 0, `${state} result must not share`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
