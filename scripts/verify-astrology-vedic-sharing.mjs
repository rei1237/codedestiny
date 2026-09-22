// Local development fixtures only. No payment, LLM, or production API traffic.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const origin = process.env.CONSULTATION_TEST_BASE || 'http://127.0.0.1:14123';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Local origin required');
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const [brand, path] of [['astrology', '/astrology-ai/result/?id=fixture&preview=success'], ['vedic', '/vedic-ai/result/?id=fixture&preview=success']]) {
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded' });
      const share = page.locator(`[data-consultation-share="${brand}"]`);
      await share.waitFor();
      await share.locator('summary').first().click();
      await share.locator('select').waitFor();
      assert.equal(await share.locator('select option').count(), 2, `${brand}: stored choices`);
      await share.locator('textarea').first().fill('오늘 정한 작은 선택을 지켜 보겠습니다.');
      await share.locator('figure img').waitFor();
      if (process.env.CONSULTATION_SCREENSHOT_DIR) await share.screenshot({ path: `${process.env.CONSULTATION_SCREENSHOT_DIR}/${brand}-share-${width}.png` });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${brand} ${width}px overflow`);
      if (brand === 'astrology') assert.equal(await page.locator('#astrology-ai-result-document [data-consultation-share]').count(), 0);
      const imageSave = share.getByRole('button', { name: '이미지 저장' });
      await imageSave.scrollIntoViewIfNeeded();
      assert.equal(await imageSave.evaluate(element => {
        const rect = element.getBoundingClientRect();
        return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)?.closest('button') === element;
      }), true, `${brand} ${width}px image action covered`);
      console.log(`PASS ${brand} ${width}px: saved excerpt, editable card, PDF separation, overflow`);
    }
    await page.goto(`${origin}${path.replace('preview=success', 'preview=failed')}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(350);
    assert.equal(await page.locator(`[data-consultation-share="${brand}"]`).count(), 0, `${brand}: failed result cannot share`);
  }
  for (const [guide, target, label] of [
    ['/astrology/cosmic/', '/astrology-ai/', '서양 점성술 상담 살펴보기'],
    ['/vedic/jyotish/', '/vedic-ai/', '베다점 상담 살펴보기'],
  ]) {
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${origin}${guide}`, { waitUntil: 'domcontentloaded' });
      const link = page.getByRole('link', { name: label });
      await link.waitFor();
      assert.equal(new URL(await link.getAttribute('href'), origin).pathname, target);
      if (process.env.CONSULTATION_SCREENSHOT_DIR) {
        await link.scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${process.env.CONSULTATION_SCREENSHOT_DIR}/${guide === '/vedic/jyotish/' ? 'vedic' : 'astrology'}-guide-${width}.png` });
      }
      await Promise.all([page.waitForURL(`**${target}`), link.click()]);
      console.log(`PASS ${guide} ${width}px: public guide to consultation entry`);
    }
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
