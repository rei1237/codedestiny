import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
const origin = process.env.MOBILE_AUDIT_ORIGIN || 'http://127.0.0.1:26504';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Mock localhost only');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'share', { value: async () => { throw new DOMException('Cancelled', 'AbortError'); } });
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new DOMException('Denied', 'NotAllowedError'); } } });
  });
  await page.goto(origin + '/animal/mbti/', { waitUntil: 'networkidle', timeout: 120000 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const widget = page.getByRole('region', { name: '공유하기', exact: true });
  await widget.getByRole('button', { name: '공유하기', exact: true }).click();
  await widget.getByRole('button', { name: '카카오톡', exact: true }).click();
  const manual = widget.getByRole('textbox', { name: '공유 링크 복사' });
  await manual.waitFor();
  assert.equal(new URL(await manual.inputValue()).search, '');
  await widget.getByRole('button', { name: '기기 공유', exact: true }).click();
  assert.equal(await widget.getByRole('status').innerText(), '공유를 취소했습니다.');
  assert.equal(await manual.count(), 0);
  await widget.getByRole('button', { name: '공유 링크 복사', exact: true }).click();
  await manual.waitFor();
  await manual.focus();
  assert.ok(await manual.evaluate(input => input.selectionEnd === input.value.length));
  console.log('PASS missing Kakao, native cancellation, clipboard denial and manual selection');
} finally { await browser.close(); }
