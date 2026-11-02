import '../../../scripts/lib/mock-network-guard.cjs';
import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fork, spawnSync } from 'node:child_process';
import { startBrowserFixture } from '../browser-delivery/serve.mjs';
import { installMockBrowser } from './browser-init.mjs';
import { digest, wire } from '../delivery-integration/harness.mjs';
import { mockDevSettings } from '../../../scripts/lib/mock-dev-settings.mjs';

const output = 'docs/engine-audit/results/next-delivery-20261102';
const mode = process.argv.find(arg => arg.startsWith('--case='))?.slice(7) || 'normal';
assert.ok(['normal', 'boundary', 'partial', 'storage-failure', 'concurrent', 'legacy', 'delayed-auth'].includes(mode));
const frameworkEnv = fs.readFileSync('next-env.d.ts');
fs.mkdirSync(output, { recursive: true });
const runtime = await startBrowserFixture({ compileUi: false, extraMockApi: async ({ url, backend }) => {
  if (url.pathname === '/api/auth/me') {
    if (backend.mockAuthDelay) await new Promise(resolve => setTimeout(resolve, backend.mockAuthDelay));
    return { data: { ok: true, authenticated: true, user: { id: backend.userId, _id: backend.userId, nickname: '합성 검증' } } };
  }
  const fixtures = {
    '/api/activation-rewards/status': { ok: true, tutorial: { eligible: false }, wallet: { balance: 0 } },
    '/api/activation-rewards/snu/status': { ok: true, verified: false },
    '/api/version': { ok: true, version: 'mock-next-audit', gitSha: '50c697d8d' },
  };
  return fixtures[url.pathname] ? { data: fixtures[url.pathname] } : null;
} });
if (['boundary', 'legacy'].includes(mode)) runtime.backend.year = 2034;
if (mode === 'partial') runtime.backend.partialOnce = true;
if (mode === 'storage-failure') runtime.backend.failCompletion = true;
if (mode === 'concurrent') runtime.backend.mockGenerationDelay = 2000;
const inherited = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
  /^(PATH|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|PATHEXT|PROCESSOR_ARCHITECTURE|NUMBER_OF_PROCESSORS)$/i.test(key)));
const { env } = mockDevSettings(process.cwd(), { ...inherited, MOCK_DEV_API_PORT: String(runtime.http.address().port), MOCK_DEV_PORT: '12002' });
env.NODE_OPTIONS += ` --require="${path.resolve('tools/oracle/next-delivery/guard.cjs').replaceAll('\\', '/')}"`;
const child = fork('tools/oracle/next-delivery/server.mjs', [], { env, execArgv: [], windowsHide: true, silent: true });
const moduleInputs = {};
child.on('message', value => { if (value.type === 'inventory') moduleInputs[value.compiler] = value.files; });
let serverLog = '';
child.stdout.on('data', data => { serverLog += data; });
child.stderr.on('data', data => { serverLog += data; });
let browser;
const cases = [], errors = [], blocked = [], httpFailures = [];
try {
  const origin = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Next startup timed out')), 120000);
    child.on('message', value => { if (value.type === 'ready') { clearTimeout(timer); resolve(value.origin); } });
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Next exited: ${code}`)); });
  });
  console.log('Full Next mock server ready');
  browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
  await context.addInitScript(installMockBrowser);
  if (['boundary', 'legacy'].includes(mode)) await context.addInitScript(() => {
    const Original = Date, offset = Original.parse('2035-01-01T00:00:00Z') - Original.now();
    window.Date = class extends Original {
      constructor(...args) { super(...(args.length ? args : [Original.now() + offset])); }
      static now() { return Original.now() + offset; }
    };
  });
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin || /swiss|sweph|swisseph|jyotish|\/js\/destiny-profile\.js/i.test(url.pathname)) {
      blocked.push(url.origin + url.pathname); return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => errors.push(error.stack || error.message));
  page.on('response', response => { if (response.status() >= 400) httpFailures.push({ path: new URL(response.url()).pathname, status: response.status() }); });
  const first = await page.goto(origin + '/ziwei-ai/', { waitUntil: 'domcontentloaded', timeout: 180000 });
  assert.equal(first.status(), 200);
  const html = await first.text();
  assert.ok(html.includes('self.__next_f.push') && html.includes('/_next/static/'));
  await expect(page.getByRole('button', { name: '별궁 전문가 상담 받기', exact: true })).toBeVisible({ timeout: 90000 });
  console.log(JSON.stringify({ mode, mounted: true, errors, blockedAssets: blocked.length }));
  if (!process.argv.includes('--inspect')) {
    const essentialCookies = page.getByRole('button', { name: '필수만 사용', exact: true });
    if (await essentialCookies.isVisible()) await essentialCookies.click();
    if (mode === 'delayed-auth') await page.evaluate(() => sessionStorage.setItem('__audit_delayed_auth', '1'));
    if (mode === 'partial') await page.setViewportSize({ width: 390, height: 844 });
    await page.getByLabel('이름 또는 닉네임', { exact: true }).fill('합성 Next 검증');
    await page.locator('label').filter({ hasText: '성별' }).locator('select').selectOption('male');
    await page.getByLabel('생년월일', { exact: true }).fill('2023-02-04');
    await page.getByRole('textbox', { name: '태어난 시간', exact: true }).fill('11:42');
    await page.getByRole('button', { name: '별궁 전문가 상담 받기', exact: true }).click();
    await expect(page.getByRole('dialog', { name: '합성 PG 결제' })).toBeVisible();
    const initialDocument = await page.evaluate(() => window.__audit.documentId);
    const chartHash = digest(runtime.backend.preparations[0].chartSnapshot);
    assert.equal(runtime.backend.preparations[0].authorityVersion, 'legacy');
    await page.getByRole('button', { name: 'mock 결제 승인', exact: true }).click();
    await expect(page.getByRole('button', { name: '서비스로 복귀', exact: true })).toBeVisible();
    runtime.backend.year = ['boundary', 'legacy'].includes(mode) ? 2035 : 2027;
    if (mode === 'delayed-auth') runtime.backend.mockAuthDelay = 1500;
    let duplicatePage;
    if (mode === 'concurrent') {
      const returnData = await page.evaluate(() => sessionStorage.getItem('__audit_mock_paid_return'));
      duplicatePage = await context.newPage();
      duplicatePage.on('pageerror', error => errors.push(error.stack || error.message));
      await duplicatePage.addInitScript(value => sessionStorage.setItem('__audit_mock_paid_return', value), returnData);
      await Promise.all([
        page.getByRole('button', { name: '서비스로 복귀', exact: true }).click(),
        duplicatePage.goto(origin + '/ziwei-ai/?auditReturn=1'),
      ]);
    } else await page.getByRole('button', { name: '서비스로 복귀', exact: true }).click();
    await expect(page.getByText(runtime.bodyText, { exact: true }).first()).toBeVisible({ timeout: 45000 });
    await expect.poll(() => page.evaluate(() => window.__audit.resumed)).toBe(true);
    assert.notEqual(await page.evaluate(() => window.__audit.documentId), initialDocument);
    assert.equal(await page.evaluate(() => window.__audit.gateCalls), 0);
    assert.equal(runtime.backend.consultations.length, 1);
    assert.equal(digest(runtime.backend.consultations[0].llmMeta.chartSnapshot), chartHash);
    for (const call of runtime.backend.llmInputs) assert.equal(digest(call.chart), chartHash);
    assert.equal(runtime.backend.usageApplications, 1);
    if (duplicatePage) {
      await expect(duplicatePage.getByText(runtime.bodyText, { exact: true }).first()).toBeVisible({ timeout: 45000 });
      await expect.poll(() => duplicatePage.evaluate(() => window.__audit.resumed)).toBe(true);
      assert.equal(await duplicatePage.evaluate(() => window.__audit.gateCalls), 0);
      assert.equal(runtime.backend.llmInputs.length, 1);
      assert.equal(runtime.backend.consultations.length, 1);
      cases.push('two-documents-one-generation-and-usage');
      await duplicatePage.close();
    }
    if (mode === 'partial' || mode === 'storage-failure') {
      assert.ok(runtime.requests.some(request => request.body.resumeSessionId));
      if (mode === 'partial') assert.ok(Object.keys(runtime.backend.llmInputs[1].groups).length);
      cases.push(mode === 'partial' ? 'resume-existing-groups' : 'retry-save-without-regeneration');
    }
    if (mode === 'boundary') await expect(page.locator('.zwvSegment.isCurrent strong')).toHaveText('3-12');
    if (mode === 'delayed-auth') assert.ok(runtime.requests.some(request => request.path === '/api/auth/me'));
    cases.push('full-next-payment-return-generation');
    if (mode === 'legacy') {
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
    const preserved = () => digest(wire({ results: runtime.backend.consultations, payments: runtime.backend.payments, preparations: runtime.backend.preparations }));
    const stored = preserved(), writes = runtime.backend.writes.length, pg = runtime.backend.pgCalls.length;
    const requests = runtime.requests.filter(r => r.path === '/api/ziwei-ai/generate').length;
    if (mode === 'normal' || mode === 'boundary') await page.locator('#ziwei-saved-result').screenshot({ path: `${output}/${mode}.png` });
    await page.reload();
    await expect(page.getByText(runtime.bodyText, { exact: true }).first()).toBeVisible();
    if (mode === 'boundary') await expect(page.locator('.zwvSegment.isCurrent strong')).toHaveText('3-12');
    if (mode === 'legacy') await expect(page.locator('.zwvSegment.isCurrent strong')).toHaveText('13-22');
    await page.goto(origin + '/ziwei-ai/');
    const history = page.getByLabel('지난 자미두수 상담 다시 보기', { exact: true });
    await history.getByRole('button').first().click();
    await expect(page.getByText(runtime.bodyText, { exact: true }).first()).toBeVisible();
    assert.equal(preserved(), stored);
    assert.equal(runtime.backend.writes.length, writes);
    assert.equal(runtime.backend.pgCalls.length, pg);
    assert.equal(runtime.backend.llmInputs.length, mode === 'partial' ? 2 : 1);
    assert.equal(runtime.pgReturns.length, 1);
    assert.equal(runtime.requests.filter(r => r.path === '/api/ziwei-ai/generate').length, requests);
    cases.push('full-next-reload-and-archive-preserve-paid-original');
    for (const width of [360, 390, 430, 960, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow ${width}`);
      if (width === 390 && mode === 'normal') await page.locator('#ziwei-saved-result').screenshot({ path: `${output}/mobile.png` });
    }
    cases.push('full-layout-responsive-no-overflow');
    if (mode === 'normal') {
      const unmapped = await fetch(origin + '/api/__engine_audit_unmapped/');
      assert.equal(unmapped.status, 501);
      assert.equal((await unmapped.json()).reason, 'MOCK_ROUTE_NOT_IMPLEMENTED');
      cases.push('next-api-rewrite-fails-closed');
      await page.screenshot({ path: `${output}/full-next-page.png`, fullPage: true });
    }
  }
  const modules = [...new Set(Object.values(moduleInputs).flat())];
  for (const file of ['app/layout.js', 'app/ziwei-ai/page.tsx', 'app/ziwei-ai/ZiweiAiClient.tsx', 'app/providers/UserSessionProvider.tsx']) assert.ok(modules.includes(file), `Missing compiled ${file}`);
  assert.ok(modules.every(file => !/swiss(?!-franc)|sweph|swisseph|jyotish/i.test(file)));
  assert.ok(blocked.every(url => url.startsWith('https://assets.code-destiny.com/') && /\.woff2?$/.test(url)), 'Unexpected blocked request');
  assert.ok(httpFailures.every(row => row.status === 402 && row.path === '/api/ziwei-ai/prepare/' || row.status === 503 && row.path === '/api/ziwei-ai/generate/'));
  assert.equal(runtime.backend.externalCalls + runtime.backend.refunds, 0);
  fs.writeFileSync(`${output}/${mode}.json`, JSON.stringify({ mode, cases, browser: await browser.version(), flags: 'OFF',
    errors, blocked: [...new Set(blocked)], httpFailures, requests: runtime.requests.map(r => ({ method: r.method, path: r.path })),
    resultHash: digest(wire(runtime.backend.consultations)), chartHashes: runtime.backend.llmInputs.map(call => digest(call.chart)),
    compiledModules: modules.length,
    llmCalls: runtime.backend.llmInputs.length, mockPgApprovals: runtime.pgReturns.length, usageApplications: runtime.backend.usageApplications }, null, 2));
  assert.deepEqual(errors, []);
  assert.deepEqual(runtime.errors, []);
  console.log(JSON.stringify({ mode, cases, errors, blockedFonts: new Set(blocked).size, httpFailures }));
} catch (error) {
  const failure = { mode, message: error.message.split('Call log:')[0], errors, blocked: [...new Set(blocked)], httpFailures,
    api: runtime.requests.map(r => ({ method: r.method, path: r.path })), serverTail: serverLog.slice(-1800), pages: [] };
  if (browser) for (const context of browser.contexts()) for (const page of context.pages()) {
    failure.pages.push(await page.evaluate(() => ({ url: location.pathname + location.search, state: window.__audit,
      visibility: document.visibilityState, result: !!document.querySelector('#ziwei-saved-result'), text: document.body.innerText.slice(0, 1800) })).catch(() => null));
    await page.screenshot({ path: `${output}/failure.png`, fullPage: true }).catch(() => {});
  }
  fs.writeFileSync(`${output}/${mode}-failure.json`, JSON.stringify(failure, null, 2));
  console.error(JSON.stringify({ mode, message: failure.message.slice(0, 500), pages: failure.pages.map(p => ({ url: p?.url, state: p?.state, result: p?.result })) }));
  throw error;
} finally {
  if (browser) await browser.close();
  if (child.connected) child.send('stop');
  if (child.exitCode === null) await new Promise(resolve => {
    const timer = setTimeout(() => {
      if (child.exitCode === null) spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
      resolve();
    }, 10000);
    child.once('exit', () => { clearTimeout(timer); resolve(); });
  });
  await new Promise(resolve => runtime.http.close(resolve));
  fs.writeFileSync(`${output}/${mode}-server.json`, JSON.stringify({ log: serverLog }, null, 2));
  fs.writeFileSync(`${output}/${mode}-modules.json`, JSON.stringify(moduleInputs, null, 2));
  const actualEnv = fs.readFileSync('next-env.d.ts');
  if (!actualEnv.equals(frameworkEnv)) {
    const normalize = value => value.toString().replaceAll('\r\n', '\n');
    assert.equal(normalize(actualEnv), normalize(frameworkEnv).replace('./.next/types/routes.d.ts', './.tmp/engine-audit-next/.next/types/routes.d.ts'), 'Unexpected concurrent next-env change');
    fs.writeFileSync('next-env.d.ts', frameworkEnv);
  }
}
