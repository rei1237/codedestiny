import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { startBrowserFixture } from './serve.mjs';
import { digest, wire } from '../delivery-integration/harness.mjs';

const runtime = await startBrowserFixture();
const mode = process.argv.find(arg => arg.startsWith('--case='))?.slice(7) || (process.argv.includes('--boundary') ? 'boundary' : 'normal');
const boundary = mode === 'boundary';
const legacy = mode === 'legacy';
assert.ok(['normal', 'boundary', 'partial', 'storage-failure', 'delayed-auth', 'concurrent', 'legacy'].includes(mode));
if (mode === 'partial') runtime.backend.partialOnce = true;
if (mode === 'storage-failure') runtime.backend.failCompletion = true;
if (['delayed-auth', 'concurrent'].includes(mode)) runtime.backend.mockGenerationDelay = 2000;
const output = 'docs/engine-audit/results/browser-delivery-20261102';
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
const page = await context.newPage(), errors = [], blocked = [], responses = [];
if (boundary || legacy) {
  runtime.backend.year = 2034;
  await context.addInitScript(() => {
    const Original = Date, offset = Original.parse('2035-01-01T00:00:00Z') - Original.now();
    window.Date = class extends Original {
      constructor(...args) { super(...(args.length ? args : [Original.now() + offset])); }
      static now() { return Original.now() + offset; }
    };
  });
}
page.setDefaultTimeout(10000);
page.on('pageerror', error => errors.push(error.message));
page.on('response', async response => { if (response.url().includes('/api/ziwei-ai/')) responses.push({ path: new URL(response.url()).pathname, status: response.status(), data: await response.json().catch(() => null) }); });
await context.route('**/*', route => {
  const url = new URL(route.request().url());
  if (url.origin === runtime.origin) return route.continue();
  blocked.push(url.origin + url.pathname); return route.abort();
});
const checks = [];
try {
  await page.goto(runtime.origin + '/ziwei-ai/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: '별궁 전문가 상담 받기', exact: true })).toBeVisible();
  if (process.argv.includes('--inspect')) {
    console.log(JSON.stringify({ text: (await page.locator('body').innerText()).slice(0,4000), errors, requests: runtime.requests, bundleInputs: runtime.bundleInputs.length }));
  } else {
    if (mode === 'delayed-auth') await page.evaluate(() => sessionStorage.setItem('__audit_delayed_auth', '1'));
    if (mode === 'partial') await page.setViewportSize({ width: 390, height: 844 });
    await page.getByLabel('이름 또는 닉네임', { exact: true }).fill('합성 브라우저');
    await page.locator('label').filter({ hasText: '성별' }).locator('select').selectOption('male');
    await page.getByLabel('생년월일', { exact: true }).fill('2023-02-04');
    await page.getByRole('textbox', { name: '태어난 시간', exact: true }).fill('11:42');
    await page.getByRole('button', { name: '별궁 전문가 상담 받기', exact: true }).click();
    await expect(page.getByRole('dialog', { name: '합성 PG 결제' })).toBeVisible({ timeout: 20000 });
    const originalDocument = await page.evaluate(() => window.__audit.documentId);
    assert.equal(runtime.backend.preparations.length, 1);
    assert.equal(runtime.backend.preparations[0].authorityVersion, 'legacy');
    const chart = digest(runtime.backend.preparations[0].chartSnapshot);
    await page.getByRole('button', { name: 'mock 결제 승인', exact: true }).click();
    await expect(page.getByRole('button', { name: '서비스로 복귀', exact: true })).toBeVisible();
    runtime.backend.year = boundary || legacy ? 2035 : 2027;
    let duplicatePage;
    if (mode === 'concurrent') {
      const returnData = await page.evaluate(() => sessionStorage.getItem('__audit_mock_paid_return'));
      duplicatePage = await context.newPage();
      duplicatePage.on('pageerror', error => errors.push(error.message));
      await duplicatePage.addInitScript(value => sessionStorage.setItem('__audit_mock_paid_return', value), returnData);
      await Promise.all([
        page.getByRole('button', { name: '서비스로 복귀', exact: true }).click(),
        duplicatePage.goto(runtime.origin + '/ziwei-ai/?auditReturn=1'),
      ]);
    } else await page.getByRole('button', { name: '서비스로 복귀', exact: true }).click();
    await expect(page.getByText(runtime.bodyText, { exact: true }).first()).toBeVisible({ timeout: 20000 });
    assert.notEqual(await page.evaluate(() => window.__audit.documentId), originalDocument);
    await expect.poll(() => page.evaluate(() => window.__audit.resumed), { timeout: 15000 }).toBe(true);
    assert.equal(await page.evaluate(() => window.__audit.gateCalls), 0);
    assert.equal(runtime.backend.consultations.length, 1);
    assert.equal(digest(runtime.backend.consultations[0].llmMeta.chartSnapshot), chart);
    assert.equal(digest(runtime.backend.llmInputs[0].chart), chart);
    assert.equal(runtime.backend.usageApplications, 1);
    if (duplicatePage) {
      await expect(duplicatePage.getByText(runtime.bodyText, { exact: true }).first()).toBeVisible({ timeout: 20000 });
      await expect.poll(() => duplicatePage.evaluate(() => window.__audit.resumed)).toBe(true);
      assert.equal(await duplicatePage.evaluate(() => window.__audit.gateCalls), 0);
      assert.equal(runtime.backend.llmInputs.length, 1);
      assert.equal(runtime.backend.consultations.length, 1);
      checks.push('two-return-documents-one-result-one-generation-one-usage');
      await duplicatePage.close();
    }
    if (mode === 'partial' || mode === 'storage-failure') {
      assert.ok(runtime.requests.some(request => request.body.resumeSessionId), 'Expected actual client retry');
      if (mode === 'partial') assert.ok(Object.keys(runtime.backend.llmInputs[1].groups).length);
      checks.push(mode === 'partial' ? 'partial-resumes-existing-groups' : 'failed-save-retries-without-regeneration');
    }
    if (boundary) {
      const savedLuck = JSON.parse(runtime.backend.consultations[0].messages.at(-1).content).meta.dayun;
      const shown = await page.locator('.zwvSegment.isCurrent strong').innerText();
      console.log(JSON.stringify({ savedLuck, timelineRange: shown }));
      assert.equal(shown, savedLuck.age_range, 'Timeline must use the delivered major luck');
    }
    checks.push('real-browser-payment-return-generation');
    if (legacy) {
      // Synthetic historic schema only: no production record or migration.
      const saved = runtime.backend.consultations[0];
      delete saved.llmMeta.calculationPreparationId;
      delete saved.llmMeta.resumeBody.calculationProtocol;
      saved.ziweiChart = saved.llmMeta.chartSnapshot;
      delete saved.llmMeta.chartSnapshot;
      const report = JSON.parse(saved.messages.at(-1).content);
      delete report.meta.dayun;
      saved.messages.at(-1).content = JSON.stringify(report);
      runtime.backend.preparations.length = 0;
    }
    const stored = digest(wire(runtime.backend.consultations));
    const preserved = digest(wire({ payments: runtime.backend.payments, preparations: runtime.backend.preparations }));
    const writes = runtime.backend.writes.length, pgLookups = runtime.backend.pgCalls.length;
    const generateRequests = runtime.requests.filter(r => r.path === '/api/ziwei-ai/generate').length;
    await page.locator('#ziwei-saved-result').screenshot({ path: `${output}/${mode}.png` });
    await expect.poll(() => runtime.backend.consultations[0]?.status).toBe('completed');
    await page.reload();
    await expect(page.getByText(runtime.bodyText, { exact: true }).first()).toBeVisible({ timeout: 15000 });
    if (legacy) {
      await expect(page.locator('.zwvSegment.isCurrent strong')).toHaveText('13-22');
      checks.push('historic-no-preparation-no-dayun-reread-and-legacy-display');
    }
    assert.equal(digest(wire(runtime.backend.consultations)), stored);
    assert.equal(runtime.backend.llmInputs.length, mode === 'partial' ? 2 : 1);
    assert.equal(runtime.pgReturns.length, 1);
    assert.equal(runtime.requests.filter(r => r.path === '/api/ziwei-ai/generate').length, generateRequests);
    checks.push('reload-stored-result-no-recharge-or-regeneration');
    await page.goto(runtime.origin + '/ziwei-ai/');
    const history = page.getByLabel('지난 자미두수 상담 다시 보기', { exact: true });
    await expect(history).toBeVisible();
    await history.getByRole('button').first().click();
    await expect(page.getByText(runtime.bodyText, { exact: true }).first()).toBeVisible();
    assert.equal(digest(wire(runtime.backend.consultations)), stored);
    assert.equal(runtime.requests.filter(r => r.path === '/api/ziwei-ai/generate').length, generateRequests);
    checks.push('archive-reopen-stored-original');
    assert.equal(digest(wire({ payments: runtime.backend.payments, preparations: runtime.backend.preparations })), preserved);
    assert.equal(runtime.backend.writes.length, writes);
    assert.equal(runtime.backend.pgCalls.length, pgLookups);
    for (const width of [360, 390, 430, 960, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Horizontal overflow ${width}`);
    }
    checks.push('360-390-430-960-1440-no-overflow');
    const evidence = { mode, checks, browser: await browser.version(), flags: 'OFF', pg: 'mock', llm: 'mock', db: 'memory',
      chartHash: chart, resultHash: stored, generations: runtime.backend.llmInputs.length, usageApplications: runtime.backend.usageApplications,
      mockApprovals: runtime.pgReturns.length, mockPgLookups: runtime.backend.pgCalls.length, externalCalls: runtime.backend.externalCalls,
      requests: runtime.requests.map(x => ({ method: x.method, path: x.path })), errors, serverErrors: runtime.errors, blocked,
      bundleInputs: runtime.bundleInputs, responseChartHashes: responses.filter(r => r.data?.consultation?.ziweiChart).map(r => digest(r.data.consultation.ziweiChart)) };
    assert.ok(evidence.responseChartHashes.length > 0 && evidence.responseChartHashes.every(hash => hash === chart));
    assert.equal(runtime.backend.externalCalls, 0);
    assert.equal(runtime.backend.refunds, 0);
    assert.deepEqual(blocked, []);
    fs.writeFileSync(`${output}/${mode}.json`, JSON.stringify(evidence, null, 2) + '\n');
    console.log(JSON.stringify({ mode, checks, generations: evidence.generations, mockApprovals: evidence.mockApprovals, errors }));
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(runtime.errors, []);
} catch (error) {
  console.error(JSON.stringify({ mode, errors, serverErrors: runtime.errors, requests: runtime.requests.map(r => r.path), text: (await page.locator('body').innerText()).slice(-900), state: await page.evaluate(() => window.__audit).catch(() => null) }));
  await page.screenshot({ path: `${output}/failure.png`, fullPage: true });
  throw error;
} finally {
  await browser.close();
  await new Promise(resolve => runtime.http.close(resolve));
}
