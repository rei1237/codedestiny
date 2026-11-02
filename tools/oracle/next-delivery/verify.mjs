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
import { installTestSelection, IMPROVED_VERSION } from './selection.mjs';

const engine = process.argv.find(arg => arg.startsWith('--engine='))?.slice(9) || 'off';
assert.ok(['off', 'on', 'rollback'].includes(engine));
const customerView = process.argv.includes('--customer-view');
const output = 'docs/engine-audit/results/next-enabled-delivery-20261102' + (customerView ? '/customer-view' : '');
const mode = process.argv.find(arg => arg.startsWith('--case='))?.slice(7) || 'normal';
assert.ok(['normal', 'boundary', 'partial', 'storage-failure', 'concurrent', 'legacy', 'delayed-auth', 'unsupported', 'prepare-race'].includes(mode));
assert.ok(mode !== 'unsupported' || engine === 'on');
const caseId = `${engine}-${mode}`;
const frameworkEnv = fs.readFileSync('next-env.d.ts');
fs.mkdirSync(output, { recursive: true });
const runtime = await startBrowserFixture({ compileUi: false,
  // Synthetic rendering sample, not a live LLM reading or accuracy oracle.
  resultSections: customerView ? {
    core_answer: { title: '지금 필요한 선택', body: '새로운 일을 더 맡기 전에, 지금 가장 중요한 한 가지부터 정리해 보세요. 해야 할 일과 기대에 응답하는 일을 구분하면 에너지를 어디에 쓸지 결정하기가 수월해집니다.' },
    structure_core: { title: '나의 강점을 쓰는 방법', body: '결정을 내릴 때 스스로 납득할 기준을 먼저 세워 보세요. 주변의 조언은 참고하되, 내 상황에서 감당할 수 있는 시간과 비용을 함께 적어 보면 선택의 이유가 분명해집니다.' },
    action_plan: { title: '이번 주의 작은 실천', body: '미뤄 둔 일 하나를 골라 이번 주에 끝낼 수 있는 크기로 나누세요. 시작 전에 완료 기준을 한 문장으로 적고, 주말에는 실제로 달라진 점을 확인해 보세요.' },
    reading_guide: { title: '이 명반을 읽는 법', body: '궁과 별의 배치를 바탕으로 풀이한 상담입니다. 자세한 명반과 계산 근거를 함께 확인할 수 있습니다.' },
  } : undefined, extraMockApi: async ({ url, backend }) => {
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
const selection = installTestSelection(runtime.backend, engine !== 'off' && mode !== 'legacy');
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
let pdfDebugger;
const cases = [], errors = [], blocked = [], httpFailures = [], prepareRace = [];
const pdfExceptions = [];
const pdfStyleErrors = [];
let pdfEvidence = null;
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
  if (mode === 'prepare-race') await context.route(/\/api\/ziwei-ai\/prepare\/?(?:\?.*)?$/, async route => {
    const responses = await Promise.all([route.fetch(), route.fetch()]);
    const bodies = await Promise.all(responses.map(response => response.json()));
    prepareRace.push(...responses.map((response, i) => ({ status: response.status(), paymentId: bodies[i].paymentPayload?.paymentId })));
    await route.fulfill({ response: responses[0] });
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
  console.log(JSON.stringify({ caseId, mounted: true, errors, blockedAssets: blocked.length }));
  if (!process.argv.includes('--inspect')) {
    const essentialCookies = page.getByRole('button', { name: '필수만 사용', exact: true });
    if (await essentialCookies.isVisible()) await essentialCookies.click();
    if (mode === 'delayed-auth') await page.evaluate(() => sessionStorage.setItem('__audit_delayed_auth', '1'));
    if (mode === 'partial') await page.setViewportSize({ width: 390, height: 844 });
    await page.getByLabel('이름 또는 닉네임', { exact: true }).fill('합성 Next 검증');
    await page.locator('label').filter({ hasText: '성별' }).locator('select').selectOption('male');
    await page.getByLabel('생년월일', { exact: true }).fill(mode === 'unsupported' ? '1999-02-04' : '2023-02-04');
    await page.getByRole('textbox', { name: '태어난 시간', exact: true }).fill('11:42');
    await page.getByRole('button', { name: '별궁 전문가 상담 받기', exact: true }).click();
    if (mode === 'unsupported') {
      await expect.poll(() => httpFailures.some(row => row.status === 422)).toBe(true);
      await expect(page.getByRole('button', { name: '별궁 전문가 상담 받기', exact: true })).toBeEnabled();
      assert.equal(await page.evaluate(() => window.__audit.gateCalls), 0);
      assert.equal(runtime.backend.preparations.length + runtime.backend.payments.length + runtime.backend.consultations.length, 0);
      assert.equal(runtime.backend.llmInputs.length + runtime.backend.pgCalls.length + runtime.backend.writes.length, 0);
      assert.ok(selection.calls.some(call => call.error === 'CALCULATION_PREPARATION_INVALID'));
      cases.push('unsupported-on-denied-before-payment-without-legacy-fallback');
    } else {
    await expect(page.getByRole('dialog', { name: '합성 PG 결제' })).toBeVisible();
    const initialDocument = await page.evaluate(() => window.__audit.documentId);
    const chartHash = digest(runtime.backend.preparations[0].chartSnapshot);
    const prepared = wire(runtime.backend.preparations[0]);
    const expectedVersion = engine === 'off' || mode === 'legacy' ? 'legacy' : IMPROVED_VERSION;
    assert.equal(prepared.authorityVersion, expectedVersion);
    if (mode === 'prepare-race') {
      assert.equal(prepareRace.length, 2);
      assert.ok(prepareRace.every(row => row.status === 402 && row.paymentId === prepareRace[0].paymentId));
      assert.equal(runtime.backend.preparations.length, 1);
      assert.equal(runtime.backend.payments.length, 1);
      cases.push('concurrent-http-prepare-one-chart-one-order');
    }
    if (expectedVersion !== 'legacy') assert.equal(prepared.chartSnapshot.lunar.source, IMPROVED_VERSION);
    if (engine === 'rollback') selection.setEnabled(false);
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
    assert.equal(runtime.backend.consultations[0].llmMeta.calculationPreparationId, prepared._id);
    assert.deepEqual(wire(runtime.backend.preparations[0]), prepared);
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
      // A stored legacy record is never upgraded when new selection turns ON.
      selection.setEnabled(engine !== 'off');
    }
    const preserved = () => digest(wire({ results: runtime.backend.consultations, payments: runtime.backend.payments, preparations: runtime.backend.preparations }));
    const stored = preserved(), writes = runtime.backend.writes.length, pg = runtime.backend.pgCalls.length;
    const requests = runtime.requests.filter(r => r.path === '/api/ziwei-ai/generate').length;
    const delivered = [];
    page.on('response', response => {
      if (new URL(response.url()).pathname === '/api/ziwei-ai/result/' && response.status() === 200) {
        delivered.push(response.json());
      }
    });
    if (mode === 'normal' || mode === 'boundary') await page.locator('#ziwei-saved-result').screenshot({ path: `${output}/${caseId}.png` });
    await page.reload();
    await expect(page.getByText(runtime.bodyText, { exact: true }).first()).toBeVisible({ timeout: 45000 });
    if (mode === 'boundary') await expect(page.locator('.zwvSegment.isCurrent strong')).toHaveText('3-12');
    if (mode === 'legacy') await expect(page.locator('.zwvSegment.isCurrent strong')).toHaveText('13-22');
    await page.goto(origin + '/ziwei-ai/');
    const history = page.getByLabel('지난 자미두수 상담 다시 보기', { exact: true });
    await history.getByRole('button').first().click();
    await expect(page.getByText(runtime.bodyText, { exact: true }).first()).toBeVisible({ timeout: 45000 });
    assert.equal(preserved(), stored);
    assert.equal(runtime.backend.writes.length, writes);
    assert.equal(runtime.backend.pgCalls.length, pg);
    assert.equal(runtime.backend.llmInputs.length, mode === 'partial' ? 2 : 1);
    assert.equal(runtime.pgReturns.length, 1);
    assert.equal(runtime.requests.filter(r => r.path === '/api/ziwei-ai/generate').length, requests);
    const deliveries = await Promise.all(delivered);
    assert.ok(deliveries.filter(row => row.consultation).length >= 2, 'Reload and archive delivered actual stored chart');
    for (const row of deliveries.filter(row => row.consultation)) {
      assert.equal(digest(row.consultation.ziweiChart), chartHash);
      assert.equal(row.consultation.ziweiChart.lunar.source, prepared.chartSnapshot.lunar.source);
    }
    for (const call of selection.calls.filter(call => !call.error)) {
      assert.equal(call.chartHash, chartHash);
      assert.equal(call.preparationId, prepared._id);
    }
    assert.ok(selection.calls.some(call => call.action === 'basis'));
    assert.ok(selection.calls.some(call => call.action === 'generate'));
    if (engine === 'rollback') {
      assert.ok(selection.calls.some(call => call.action === 'generate' && !call.enabled && call.source === IMPROVED_VERSION));
      const original = runtime.requests.find(row => row.path === '/api/ziwei-ai/prepare/' || row.path === '/api/ziwei-ai/prepare').body;
      const next = await runtime.backend.request('/api/ziwei-ai/prepare', { ...original, idempotencyKey: 'mock-after-rollback-request-0002' });
      assert.equal(next.status, 402);
      assert.equal(runtime.backend.preparations.at(-1).authorityVersion, 'legacy');
      assert.deepEqual(wire(runtime.backend.preparations[0]), prepared);
      assert.equal(runtime.backend.llmInputs.length, mode === 'partial' ? 2 : 1);
      cases.push('off-switch-keeps-v2-preparation-next-request-legacy');
    }
    cases.push('full-next-reload-and-archive-preserve-paid-original');
    const chartDetails = page.locator('[data-ziwei-chart-details]');
    await expect(chartDetails).not.toHaveAttribute('open', '');
    await expect(page.locator('[data-ziwei-customer-reading]')).toBeVisible();
    await expect(page.locator('[data-external-image-guide]')).toBeHidden();
    if (customerView) {
      await expect(page.locator('[data-ziwei-customer-reading] h3').first()).toHaveText('지금 필요한 선택');
      await expect(page.getByRole('heading', { name: '이 명반을 읽는 법', exact: true })).toBeHidden();
    }
    assert.ok(await page.evaluate(() => {
      const reading = document.querySelector('[data-ziwei-customer-reading]');
      const details = document.querySelector('[data-ziwei-chart-details]');
      return Boolean(reading.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING);
    }));
    await chartDetails.locator(':scope > summary').click();
    await expect(page.locator('.palaceBoard')).toBeVisible();
    if (mode === 'boundary') await expect(page.locator('.zwvSegment.isCurrent strong')).toHaveText('3-12');
    await chartDetails.locator(':scope > summary').click();
    cases.push('customer-reading-before-collapsed-chart-and-image-tools');
    if (customerView && mode === 'normal' && engine === 'on') {
      const debuggerSession = await context.newCDPSession(page);
      pdfDebugger = debuggerSession;
      await debuggerSession.send('Debugger.enable');
      debuggerSession.on('Debugger.paused', async event => {
        pdfExceptions.push(String(event.data?.description || event.data?.value || event.reason));
        if (String(event.data?.description).includes('unsupported color')) {
          const frame = event.callFrames.find(frame => frame.functionName === 'ElementContainer');
          if (frame) {
            const result = await debuggerSession.send('Debugger.evaluateOnCallFrame', {
              callFrameId: frame.callFrameId,
              expression: `JSON.stringify({html:element.outerHTML.slice(0,500),styles:[...window.getComputedStyle(element)].map(k=>[k,window.getComputedStyle(element).getPropertyValue(k)]).filter(([,v])=>/color\\(|oklch\\(|lab\\(|lch\\(/.test(v))})`,
              returnByValue: true,
            });
            pdfStyleErrors.push(result.result.value);
          }
        }
        await debuggerSession.send('Debugger.resume').catch(() => {});
      });
      await debuggerSession.send('Debugger.setPauseOnExceptions', { state: process.argv.includes('--debug-pdf') ? 'all' : 'none' });
      await page.evaluate(() => {
        window.__audit.pdfDisclosure = [];
        const details = document.querySelector('[data-ziwei-chart-details]');
        details.addEventListener('toggle', () => window.__audit.pdfDisclosure.push({ open: details.open,
          sections: [...details.querySelectorAll('[data-ziwei-pdf-section]')].map(section => section.getBoundingClientRect().height) }));
      });
      const downloadEvent = Promise.race([
        page.waitForEvent('download', { timeout: 120000 }),
        page.getByText('PDF 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.', { exact: true }).waitFor({ state: 'visible', timeout: 120000 })
          .then(() => { throw new Error('PDF export failed: ' + pdfExceptions.filter(message => !message.includes('getImgProps')).slice(-6).join('\n')); }),
      ]);
      await page.getByRole('button', { name: 'PDF 다운로드', exact: true }).click();
      const download = await downloadEvent;
      assert.equal(await download.failure(), null);
      const pdf = fs.readFileSync(await download.path());
      assert.ok(pdf.subarray(0, 5).toString() === '%PDF-');
      const transitions = await page.evaluate(() => window.__audit.pdfDisclosure);
      assert.ok(transitions.some(row => row.open && row.sections.length >= 5 && row.sections.every(height => height > 0)));
      await expect(chartDetails).not.toHaveAttribute('open', '');
      await debuggerSession.detach();
      pdfDebugger = null;
      pdfEvidence = { bytes: pdf.length, pages: (pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length, transitions, pdfExceptions };
      cases.push('actual-pdf-download-includes-collapsed-chart-restores-reader-state');
    }
    for (const width of [360, 390, 430, 960, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow ${width}`);
      if (width === 390 && mode === 'normal') await page.locator('#ziwei-saved-result').screenshot({ path: `${output}/${caseId}-mobile.png` });
    }
    cases.push('full-layout-responsive-no-overflow');
    if (mode === 'normal') {
      const unmapped = await fetch(origin + '/api/__engine_audit_unmapped/');
      assert.equal(unmapped.status, 501);
      assert.equal((await unmapped.json()).reason, 'MOCK_ROUTE_NOT_IMPLEMENTED');
      cases.push('next-api-rewrite-fails-closed');
      await page.screenshot({ path: `${output}/${caseId}-full.png`, fullPage: true });
    }
    }
  }
  const modules = [...new Set(Object.values(moduleInputs).flat())];
  for (const file of ['app/layout.js', 'app/ziwei-ai/page.tsx', 'app/ziwei-ai/ZiweiAiClient.tsx', 'app/providers/UserSessionProvider.tsx']) assert.ok(modules.includes(file), `Missing compiled ${file}`);
  assert.ok(modules.every(file => !/swiss(?!-franc)|sweph|swisseph|jyotish/i.test(file)));
  assert.ok(blocked.every(url => url.startsWith('https://assets.code-destiny.com/') && /\.(?:woff2?|ttf)$/.test(url)), 'Unexpected blocked request');
  assert.ok(httpFailures.every(row => {
    const endpoint = row.path.replace(/\/$/, '');
    return row.status === 402 && endpoint === '/api/ziwei-ai/prepare'
      || row.status === 503 && endpoint === '/api/ziwei-ai/generate'
      || mode === 'unsupported' && row.status === 422 && endpoint === '/api/ziwei-ai/prepare';
  }));
  assert.equal(runtime.backend.externalCalls + runtime.backend.refunds, 0);
  fs.writeFileSync(`${output}/${caseId}.json`, JSON.stringify({ mode, engine, cases, browser: await browser.version(), productionFlags: 'OFF',
    customerView, pdfEvidence, selectionCalls: selection.calls, prepareRace, preparations: runtime.backend.preparations.map(row => ({ id: row._id, authorityVersion: row.authorityVersion, targetYear: row.targetYear, chartHash: digest(row.chartSnapshot) })),
    errors, blocked: [...new Set(blocked)], httpFailures, requests: runtime.requests.map(r => ({ method: r.method, path: r.path })),
    resultHash: digest(wire(runtime.backend.consultations)), chartHashes: runtime.backend.llmInputs.map(call => digest(call.chart)),
    compiledModules: modules.length,
    llmCalls: runtime.backend.llmInputs.length, mockPgApprovals: runtime.pgReturns.length, usageApplications: runtime.backend.usageApplications }, null, 2));
  assert.deepEqual(errors, []);
  assert.deepEqual(runtime.errors, []);
  console.log(JSON.stringify({ mode, cases, errors, blockedFonts: new Set(blocked).size, httpFailures }));
} catch (error) {
  const failure = { mode, engine, message: error.message.split('Call log:')[0], pdfExceptions, pdfStyleErrors, errors, blocked: [...new Set(blocked)], httpFailures,
    api: runtime.requests.map(r => ({ method: r.method, path: r.path })), serverTail: serverLog.slice(-1800), pages: [] };
  if (browser) for (const context of browser.contexts()) for (const page of context.pages()) {
    failure.pages.push(await page.evaluate(() => ({ url: location.pathname + location.search, state: window.__audit,
      visibility: document.visibilityState, result: !!document.querySelector('#ziwei-saved-result'), text: document.body.innerText.slice(0, 1800) })).catch(() => null));
    await page.screenshot({ path: `${output}/${caseId}-failure.png`, fullPage: true }).catch(() => {});
  }
  fs.writeFileSync(`${output}/${caseId}-failure.json`, JSON.stringify(failure, null, 2));
  console.error(JSON.stringify({ mode, message: failure.message.slice(0, 500), pages: failure.pages.map(p => ({ url: p?.url, state: p?.state, result: p?.result })) }));
  throw error;
} finally {
  if (pdfDebugger) {
    await pdfDebugger.send('Debugger.setPauseOnExceptions', { state: 'none' }).catch(() => {});
    await pdfDebugger.detach().catch(() => {});
  }
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
  fs.writeFileSync(`${output}/${caseId}-server.json`, JSON.stringify({ log: serverLog }, null, 2));
  fs.writeFileSync(`${output}/${caseId}-modules.json`, JSON.stringify(moduleInputs, null, 2));
  const actualEnv = fs.readFileSync('next-env.d.ts');
  if (!actualEnv.equals(frameworkEnv)) {
    const normalize = value => value.toString().replaceAll('\r\n', '\n');
    assert.equal(normalize(actualEnv), normalize(frameworkEnv).replace('./.next/types/routes.d.ts', './.tmp/engine-audit-next/.next/types/routes.d.ts'), 'Unexpected concurrent next-env change');
    fs.writeFileSync('next-env.d.ts', frameworkEnv);
  }
}
