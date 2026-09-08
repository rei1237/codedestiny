import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const base = process.argv[2] || 'http://127.0.0.1:59210';
const directory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'captures');
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const metrics = [], errors = [], blocked = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || (url.hostname === 'assets.code-destiny.com' && url.pathname.startsWith('/fonts/'))) return route.continue();
    blocked.push(url.origin + url.pathname);
    return route.abort();
  });
  await page.goto(base, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  for (const width of [360, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
    const result = await page.evaluate(() => ({ width: innerWidth, overflow: document.documentElement.scrollWidth - innerWidth, height: document.documentElement.scrollHeight, heroActionsBottom: document.querySelector('.hero-actions').getBoundingClientRect().bottom }));
    assert.equal(result.overflow, 0, `horizontal overflow at ${width}`);
    if (width === 390) assert.ok(result.heroActionsBottom < 844, 'hero action must be in first viewport');
    metrics.push(result);
    if ([390, 1440].includes(width)) {
      const name = width === 390 ? 'mobile' : 'desktop';
      await page.screenshot({ path: path.join(directory, `${name}.png`), fullPage: true });
      await page.screenshot({ path: path.join(directory, `${name}-first.png`) });
    }
  }
  const questions = page.locator('.question');
  assert.equal(await questions.count(), 8);
  for (let i = 1; i < 8; i++) {
    await questions.nth(i).locator(':scope > summary').click();
    assert.equal(await page.locator('.question[open]').count(), 1);
    assert.equal(await questions.nth(i).getAttribute('open'), '');
  }
  await page.locator('[data-question="career"]>summary').click();
  assert.match(await page.locator('#hero-title').innerText(), /사람과 아이디어/);
  await page.getByRole('button', { name: '요약 공유', exact: true }).click();
  const sharedText = await page.locator('.share-preview').innerText();
  assert.doesNotMatch(sharedText, /서윤|1990|10:00/);
  await page.screenshot({ path: path.join(directory, 'share.png') });
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog[open]').count(), 0);
  await page.locator('[data-question="career"] .evidence>summary').click();
  await page.locator('[data-question="career"] [data-palace-link]').click();
  assert.equal(await page.locator('[data-palace="career"]').getAttribute('aria-pressed'), 'true');
  for (const width of [360, 390, 430, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
  }
  await page.screenshot({ path: path.join(directory, 'chart.png') });
  await page.getByRole('button', { name: '상담 시작', exact: true }).click();
  await page.screenshot({ path: path.join(directory, 'input-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(directory, 'input-mobile.png'), fullPage: true });
  await page.getByLabel('출생 시각을 몰라요').check();
  assert.ok(await page.locator('input[type="time"]').isDisabled());
  await page.getByLabel('일과 진로', { exact: true }).check();
  await page.locator('input[name="name"]').fill('아주긴이름으로모바일줄바꿈을확인하는샘플프로필');
  await page.getByRole('button', { name: '나의 상담 시작하기' }).click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
  assert.match(await page.locator('#hero-title').innerText(), /사람과 아이디어/);
  await page.getByRole('button', { name: 'PDF 디자인', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: path.join(directory, 'pdf.png'), fullPage: true });
  const pages = page.locator('.paper');
  assert.equal(await pages.count(), 3);
  for (let i = 0; i < 3; i++) await pages.nth(i).screenshot({ path: path.join(directory, `pdf-page-${i + 1}.png`) });
  for (const width of [360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    const colliding = await page.locator('.pdf-body').evaluate(el => el.querySelector('.paper-ending').getBoundingClientRect().bottom > el.querySelector('.paper-footer').getBoundingClientRect().top);
    assert.equal(colliding, false, `PDF footer overlaps at ${width}`);
  }
  await page.getByRole('button', { name: '상태·색상', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: path.join(directory, 'states.png'), fullPage: true });
  assert.deepEqual(errors, []);
  assert.deepEqual(blocked, []);
  const result = { scope: 'Isolated mockup only; not application regression or generated PDF verification', metrics, questions: 8, calculatedPalaces: 12, errors, blocked, checks: ['8 question switches', 'related palace selection', 'share preview privacy', 'dialog escape', 'missing time', 'long name overflow', 'input topic transfer', '3 PDF design pages', 'PDF mobile footer clearance'] };
  await writeFile(path.join(directory, 'metrics.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
