import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const origin = process.env.MOBILE_AUDIT_ORIGIN || 'http://127.0.0.1:26504';
if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)) throw new Error('Mock localhost only');
const output = path.resolve('test-results/mobile-platform');
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.route('**/*', route => {
    const req = route.request(), url = new URL(req.url());
    return url.origin === origin || (req.method() === 'GET' && ['image', 'font'].includes(req.resourceType()) && url.hostname === 'assets.code-destiny.com') ? route.continue() : route.abort();
  });
  await context.addInitScript(() => localStorage.setItem('code-destiny-fortune-tea-house-entry-prologue-seen:v1', 'seen'));
  let page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(origin + '/fortune-tea-house/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.getByRole('button', { name: '운명의 찻집 상담 바로 시작하기', exact: true }).click();
  await page.getByLabel('운명의 찻집 상담 메뉴판').waitFor();
  assert.equal(await page.locator('[data-cup-id]').count(), 6);
  await page.getByLabel('운명의 찻집 상담 메뉴판').screenshot({ path: path.join(output, 'tea-selection.png') });
  await page.locator('[data-cup-id="lotus-moon"]').click();
  // The scene's primary action is the existing confirmation button.
  await page.getByRole('button', { name: '이 찻잔으로 이야기하기', exact: true }).click();
  await page.locator('#fortuneTeaQuestion').fill('테스트 질문: 지금 관계의 흐름을 정리하고 싶어요.');
  await page.locator('#tea-question-form').screenshot({ path: path.join(output, 'tea-question.png') });
  const back = page.locator('button').filter({ hasText: /찻잔.*다시|찻잔.*돌아|이전/ }).last();
  await back.click();
  await page.locator('[data-cup-id="lotus-moon"]').click();
  await page.getByRole('button', { name: '이 찻잔으로 이야기하기', exact: true }).click();
  assert.equal(await page.locator('#fortuneTeaQuestion').inputValue(), '테스트 질문: 지금 관계의 흐름을 정리하고 싶어요.');
  console.log('PASS tea UI back preserves unsubmitted question');
  await page.goto(origin + '/life-book-ai/result/?attemptId=mock-preview&preview=success', { waitUntil: 'domcontentloaded', timeout: 120000 });
  const summary = page.getByRole('heading', { name: '안정 속에서 꾸준히 성장하는 흐름을 타고난 사람입니다.', exact: true });
  await summary.waitFor();
  await summary.locator('..').screenshot({ path: path.join(output, 'life-book-summary.png') });
  assert.equal(await page.getByRole('heading', { name: '타고난 사주의 원형', exact: true }).count(), 1);
  console.log('PASS life book fixture renders summary and chapter');
  await page.close();
  page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto(origin + '/saju/animal-destiny/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => {
    const input = document.querySelector('[data-cd-birth-date]');
    return input && Object.keys(input).some(key => key.startsWith('__reactProps$'));
  });
  await page.getByPlaceholder('YYYY-MM-DD').fill('1995-06-15');
  await page.getByPlaceholder('YYYY-MM-DD').press('Tab');
  await page.locator('button').filter({ hasText: '내 동물 찾기' }).last().click();
  await page.waitForTimeout(3500);
  const animalCard = page.getByText('운명의 동물 도감 · 결과 요약 카드', { exact: true }).locator('..');
  await animalCard.waitFor();
  assert.equal(await animalCard.getByRole('heading', { name: '보물 햄스터', exact: true }).count(), 1);
  await animalCard.screenshot({ path: path.join(output, 'animal-summary.png') });
  console.log('PASS animal local calculation renders its summary card');
  await page.screenshot({ path: path.join(output, 'animal-result.png'), fullPage: true });
  assert.equal(pageErrors.length, 0, pageErrors.join('\n'));
} finally { await browser.close(); }
