// Mock the saved session. No paid generation or real account is used.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const origin = process.env.CONSULTATION_TEST_BASE || 'http://127.0.0.1:14123';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Local origin required');
const chapters = Array.from({ length: 20 }, (_, index) => ({
  id: `chapter-${index + 1}`, order: index + 1, title: `제${index + 1}장 · 관계의 리듬`,
  body: '서로의 속도를 살피며 이번 주 대화 시간을 정해 보세요.',
  content: { keySentence: '관계의 속도를 다시 맞춰 보세요.', insight: '서로의 신호를 천천히 읽어 보세요.', actions: ['이번 주 대화 시간을 정해 보세요.'] },
}));
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/master-love-codex/session') {
      const partial = url.searchParams.get('sessionId') === 'partial';
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
        ok: true, sessionId: partial ? 'partial' : 'complete', status: partial ? 'generating' : 'completed',
        retryable: false, chapters: partial ? chapters.slice(0, 19) : chapters,
        generationProgress: { completed: partial ? 19 : 20, total: 20, step: partial ? 'failed' : 'complete' },
        birthInfo: { name: '테스트' }, totalCharCount: 12000, loveDna: null,
      }) });
    }
    return url.origin === origin ? route.continue() : route.abort();
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${origin}/master-love-codex/result/?sessionId=complete`, { waitUntil: 'domcontentloaded' });
    const share = page.locator('[data-consultation-share="codex"]');
    await share.waitFor({ timeout: 15000 }).catch(async error => {
      console.log('VISIBLE TEXT', (await page.locator('body').innerText()).slice(0, 700));
      console.log('PAGE ERRORS', errors);
      throw error;
    });
    await share.locator('summary').first().click();
    await share.locator('select').waitFor();
    assert.equal(await share.locator('select option').count(), 3);
    assert.equal(await page.locator('#master-love-codex-document [data-consultation-share]').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    console.log(`PASS codex ${width}px: completed saved result opens, share editor outside PDF`);
  }
  await page.goto(`${origin}/master-love-codex/result/?sessionId=partial`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-codex-chapter="19"]').waitFor({ timeout: 15000 });
  assert.equal(await page.locator('[data-consultation-share="codex"]').count(), 0);
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
