import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const base = 'http://127.0.0.1:15734';
const directory = 'docs/design/moon-library';
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  page.setDefaultNavigationTimeout(120000);
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return ['127.0.0.1', 'localhost'].includes(url.hostname) || url.protocol === 'data:' ? route.continue() : route.abort();
  });
  const response = await page.goto(base + '/insights/famous-saju/', { waitUntil: 'domcontentloaded', timeout: 120000 });
  assert.equal(response.status(), 200);
  const html = await response.text();
  assert.ok(html.includes('href="/insights/famous-saju/park-wi/"'), 'server-rendered directory link');
  const search = page.getByRole('searchbox');
  await search.waitFor();
  for (const [query, slug] of [['박위 사주', 'park-wi'], ['WERACLE', 'park-wi'], ['이말년', 'chimchakman'], ['곽준빈', 'kwaktube'], ['이상혁', 'faker'], ['입짧은 햇님', 'haetnim'], ['민규 사주','seventeen-mingyu'], ['조승연','woodz'], ['추영우 사주','choo-young-woo'], ['Kim Yoo-jung','kim-yoo-jung']]) {
    await search.fill(query);
    await page.locator(`.moon-person[href="/insights/famous-saju/${slug}/"]`).waitFor();
    results.push({ query, slug, matched: true });
  }
  await search.fill('박위 사주');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('input[type=search]')?.value === '박위 사주');
  await page.screenshot({ path: directory + '/expansion-search-390.png' });
  await page.locator('.moon-person').click({ noWaitAfter: true });
  await page.waitForURL(/\/park-wi\//, { timeout: 120000 });
  await page.locator('[data-public-profile]').waitFor();
  assert.ok((await page.locator('[data-public-profile]').innerText()).includes('1987-03-13'));
  assert.ok(!(await page.locator('meta[name=robots]').getAttribute('content')).includes('noindex'));
  assert.ok((await page.locator('[data-public-profile]').innerText()).includes('공개 승인 박병하(네오)'));
  assert.ok((await page.title()).includes('박위 사주'));
  await page.locator('[data-public-profile]').screenshot({ path: directory + '/publication-article-390.png' });
  for (const width of [320, 360, 390, 430, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    assert.equal(overflow, false, 'profile overflow ' + width);
    results.push({ width, overflow });
    if (width === 390) await page.screenshot({ path: directory + '/expansion-profile-390.png' });
  }
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelector('input[type=search]')?.value === '박위 사주');
  await page.getByRole('button', { name: '초기화' }).click();
  await page.getByRole('button', { name: '분야별', exact: true }).click();
  await page.locator('.moon-filters select').first().selectOption('유튜버·크리에이터');
  await page.locator('.moon-person').first().waitFor();
  const before = await page.locator('.moon-person').first().getAttribute('href');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  assert.notEqual(await page.locator('.moon-person').first().getAttribute('href'), before);
  assert.ok(new URL(page.url()).searchParams.get('field') === '유튜버·크리에이터');
  results.push({ reloadAndBack: true, creatorFilterAndPagination: true });
  fs.writeFileSync(directory + '/profile-expansion-browser.json', JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
