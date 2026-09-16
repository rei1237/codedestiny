/** Local mock: actual chart/prompt/route/checkpoints -> fresh customer page, no external API. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { webcrypto } from 'node:crypto';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { chromium } from 'playwright';
import { __ziweiDeepReportTestUtils as utils } from '../worker/routes/ziwei-deep-report.js';
import { calculateZiweiAiChart } from '../worker/lib/ziwei-ai-chart.js';
import { ZIWEI_DEEP_CHAPTERS, ZIWEI_DEEP_PDF_META, buildZiweiDeepChapterPrompt } from '../worker/lib/ziwei-deep-report-prompt.mjs';

const base = process.argv[2] || 'http://127.0.0.1:13070', output = process.argv[3] && path.resolve(process.argv[3]);
const beforeSha = process.argv[4] || '20fd46f68016cdfd7e6c5fe085ce8bdfa3f50b34';
const pdfOnly = process.argv.includes('--pdf-only'), pdfs = [], fontRequests = [];
assert.equal(new URL(base).hostname, '127.0.0.1'); assert.ok(!process.argv.includes('--live')); assert.match(beforeSha, /^[a-f0-9]{40}$/);
if (pdfOnly) assert.ok(output, '--pdf-only requires an output directory with public font fixtures');
if (output) await mkdir(output, { recursive: true });
const fixtureFile = '__tests__/ui/ziwei-deep-paid-delivery.behavior.test.js';
const ast = ts.createSourceFile(fixtureFile, fs.readFileSync(fixtureFile, 'utf8'), ts.ScriptTarget.Latest, true);
const helper = vm.createContext({ vm, ts, fs, Request, Response, Headers, URL, assert, webcrypto, console });
for (const node of ast.statements) {
  if (ts.isVariableStatement(node) && node.declarationList.declarations.some(d => ['clone', 'get'].includes(d.name.getText(ast)))) vm.runInContext(node.getText(ast), helper);
  if (ts.isFunctionDeclaration(node) && ['set', 'matches', 'load', 'fixture'].includes(node.name?.text)) vm.runInContext(node.getText(ast), helper);
}
const body = { birthInfo: { name: '검수 사용자', birthDate: '1995-04-18', birthTime: '08:30', gender: 'female', calendarType: 'solar' }, focusArea: 'career', topic: '직업', question: '올해 이직을 준비할 때 어떤 순서로 움직이면 좋을까요?', locale: 'ko' };
const routeFile = 'worker/routes/ziwei-deep-report.js', currentSource = fs.readFileSync(routeFile, 'utf8');
function loadFunctions(ctx, source, names) {
  const parsed = ts.createSourceFile(routeFile, source, ts.ScriptTarget.Latest, true);
  for (const node of parsed.statements) if (ts.isFunctionDeclaration(node) && names.includes(node.name?.text)) vm.runInContext(node.getText(parsed).replace(/^export /, ''), ctx);
}
function createFixture(source = currentSource) {
  const f = helper.fixture('paid'), rows = [];
  Object.assign(f.ctx, { normalizeInput: utils.normalizeInput, calculateZiweiAiChart, ZIWEI_DEEP_CHAPTERS, ZIWEI_DEEP_PDF_META,
    buildZiweiDeepChapterPrompt, createLlmCacheStore: () => ({}),
    callGeminiText: async (_env, prompt, options) => {
      const definition = ZIWEI_DEEP_CHAPTERS.find(d => prompt.includes(d.title)); assert.ok(definition);
      const text = Array.from({ length: 65 }, (_, i) => `${definition.id}의 ${i + 1}번째 흐름은 계산한 명반의 ${definition.palaceKey || '전체 12궁'} 조건을 바탕으로 현실에서 선택할 수 있는 행동을 구체적으로 설명합니다.`).join('\n');
      assert.ok(text.length >= definition.minChars); assert.equal(options.maxOutputTokens, 9000); assert.equal(options.timeoutMs, 60000);
      rows.push({ chapter: definition.id, inputChars: prompt.length, outputChars: text.length, model: 'gemini-2.5-flash (source default)' });
      return { ok: true, text, provider: 'gemini', truncated: false };
    },
  });
  loadFunctions(f.ctx, source, ['handleGenerate', 'generateChapter', 'finishDeepDelivery', 'runZiweiDeepReportDeliveryBatch', 'syncDeepExecution', 'replayCompletedDeepReport']);
  return { f, rows, post: extra => f.post({ ...body, ...extra }) };
}
const metrics = [];
let completed;
for (const [label, source] of [['before', execFileSync('git', ['show', `${beforeSha}:${routeFile}`], { encoding: 'utf8' })], ['after', currentSource]]) {
  const fixture = createFixture(source);
  for (let i = 0; i < 4; i++) { const response = await fixture.post(); assert.equal(response.status, i === 3 ? 200 : 202, await response.clone().text()); completed = await response.json(); }
  assert.equal(completed.chapters.length, 15); assert.equal(completed.degraded, false); assert.equal(completed.saved, true);
  const count = fixture.rows.length; assert.equal((await fixture.post()).status, 200); assert.equal(fixture.rows.length, count);
  metrics.push({ label, providerCalls: count, inputChars: fixture.rows.reduce((sum, row) => sum + row.inputChars, 0), outputChars: fixture.rows.reduce((sum, row) => sum + row.outputChars, 0), rows: fixture.rows });
}
assert.deepEqual(metrics[0].rows, metrics[1].rows);
const screenshots = [], requests = [], pageErrors = [], consoleErrors = [], browser = await chromium.launch({ headless: true });
async function compute(page) {
  await page.goto(base + '/ziwei/chart/');
  await page.getByLabel('출생 연도', { exact: true }).fill('1995');
  await page.getByPlaceholder('MM', { exact: true }).fill('04'); await page.getByPlaceholder('DD', { exact: true }).fill('18');
  await page.getByPlaceholder('HH', { exact: true }).fill('08');
  await page.getByRole('button', { name: '심화 자미두수 상담 열기', exact: true }).click();
  await page.locator('#ziwei-result-pdf').waitFor({ timeout: 60000 });
}
async function contextFor(width, respond, blocked = false) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.addCookies([{ name: 'fortune_auth_role', value: 'user', url: base }]);
  if (pdfOnly) await context.addInitScript(() => {
    const fetchFontFixture = window.fetch;
    window.fetch = (input, init) => {
      const url = new URL(typeof input === 'string' || input instanceof URL ? input.toString() : input.url, location.href);
      if (url.hostname === 'assets.code-destiny.com' && /\/(?:Mulmaru|Paperlogy-5Medium)\.ttf$/.test(url.pathname)) {
        return fetchFontFixture(`/__pdf_fixture_fonts/${url.pathname.split('/').at(-1)}`, init);
      }
      return fetchFontFixture(input, init);
    };
  });
  if (blocked) await context.addInitScript(() => { for (const method of ['getItem', 'setItem', 'removeItem']) Storage.prototype[method] = () => { throw new DOMException('blocked', 'SecurityError'); }; });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (pdfOnly && /\.ttf$/.test(url.pathname)) fontRequests.push(url.href);
    if (url.pathname.startsWith('/api/')) {
      requests.push({ width, path: url.pathname, method: request.method(), query: url.search });
      assert.ok(!(/billing|payments|consume/.test(url.pathname) && request.method() !== 'GET'), 'financial mutation forbidden');
      const response = await respond(request, url);
      return route.fulfill({ status: response?.status || 200, contentType: 'application/json', body: JSON.stringify(response?.body || (url.pathname === '/api/auth/me' ? { ok: true, user: { id: 'owner', _id: 'owner', nickname: '모의 사용자' } } : { ok: true })) });
    }
    if (pdfOnly && url.origin === new URL(base).origin && /^\/__pdf_fixture_fonts\/(?:Mulmaru|Paperlogy-5Medium)\.ttf$/.test(url.pathname)) {
      return route.fulfill({ contentType: 'font/ttf', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(path.join(output, 'fonts', path.basename(url.pathname))) });
    }
    if (url.origin === new URL(base).origin) return route.continue(); return route.abort();
  });
  const page = await context.newPage(); page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 2000)); });
  return { context, page };
}
async function readLast(page) {
  const last = page.locator('#ziwei-deep-pdf-report article').last();
  await last.locator('summary').click(); const paragraph = last.locator('details p');
  const text = await paragraph.innerText(); assert.equal(text, completed.chapters.at(-1).body);
  await paragraph.evaluate(element => element.scrollIntoView({ block: 'end' })); await page.evaluate(() => window.scrollBy(0, 96));
  const bounds = await paragraph.evaluate(element => { const node = element.firstChild, range = document.createRange(); range.setStart(node, node.textContent.length - 6); range.setEnd(node, node.textContent.length); const box = range.getBoundingClientRect(); return { top: box.top, bottom: box.bottom, viewportHeight: innerHeight, overflow: document.documentElement.scrollWidth - innerWidth }; });
  assert.ok(bounds.top >= 0 && bounds.bottom <= bounds.viewportHeight, JSON.stringify(bounds)); assert.equal(bounds.overflow, 0);
  return bounds;
}
try {
  for (const width of process.argv.includes('--storage-only') ? [] : pdfOnly ? [390] : [390, 430, 1280]) {
    const { context, page } = await contextFor(width, async (_request, url) => {
      if (url.pathname.includes('/generate')) throw new Error('completed reopen attempted generation');
      if (url.pathname === '/api/ziwei-deep-report/result') return { body: url.searchParams.has('id') ? completed : { ok: true, reports: [{ id: completed.reportId, name: '검수 사용자', topic: '직업', status: 'completed', createdAt: '2026-09-17T00:00:00Z' }] } };
    });
    await compute(page); const panel = page.locator('#ziwei-result-pdf');
    await panel.getByRole('button', { name: '지난 리포트 다시 보기', exact: true }).click(); await panel.locator('li button').first().click();
    await page.locator('#ziwei-deep-pdf-report article').last().waitFor();
    const bounds = await readLast(page); screenshots.push({ width, ...bounds });
    if (output) await page.screenshot({ path: path.join(output, `ziwei-closing-${width}.png`) });
    if (pdfOnly) {
      const downloading = page.waitForEvent('download', { timeout: 90000 });
      await panel.getByRole('button', { name: 'PDF 저장하기', exact: true }).click();
      const download = await downloading.catch(async error => { console.error(JSON.stringify({ fontRequests, consoleErrors, panelText: (await panel.innerText()).slice(0, 1800) })); throw error; }); assert.equal(await download.failure(), null);
      const file = path.join(output, 'ziwei-paid-mock.pdf'); await download.saveAs(file);
      assert.ok(fs.statSync(file).size > 100000); pdfs.push({ file, suggestedFilename: download.suggestedFilename(), bytes: fs.statSync(file).size, fontFixtures: ['Mulmaru.ttf', 'Paperlogy-5Medium.ttf'] });
    }
    await context.close();
  }
  for (const event of pdfOnly ? [] : process.argv.includes('--storage-only') ? ['storage-blocked'] : ['pageshow', 'focus', 'online', 'visibilitychange', 'storage-blocked']) {
    const fixture = createFixture(); await fixture.post(); let available = false, lookups = 0, batches = 0;
    const { context, page } = await contextFor(390, async (request, url) => {
      if (url.pathname === '/api/ziwei-deep-report/result') {
        if (!url.searchParams.has('id')) { lookups++; return { body: { ok: true, reports: available ? [{ id: fixture.f.doc.id, status: fixture.f.doc.status }] : [] } }; }
        return { status: 202, body: fixture.f.ctx.publicStoredReport(fixture.f.doc) };
      }
      if (url.pathname === '/api/ziwei-deep-report/generate') { batches++; const response = await fixture.f.post(request.postDataJSON()); return { status: response.status, body: await response.json() }; }
    }, event === 'storage-blocked');
    try { await compute(page); } catch (error) {
      console.error(JSON.stringify({ event, pageErrors, consoleErrors: consoleErrors.filter(text => /blocked|Storage|Security|readCurrent/i.test(text)), text: (await page.locator('body').innerText()).slice(0, 600) }));
      if (output) await page.screenshot({ path: path.join(output, 'ziwei-wake-debug.png') }); throw error;
    }
    await page.waitForFunction(() => document.querySelector('#ziwei-result-pdf')); await new Promise(resolve => setTimeout(resolve, 300));
    assert.ok(lookups >= 1); available = true;
    await page.evaluate(event => { if (event === 'visibilitychange') document.dispatchEvent(new Event(event)); else window.dispatchEvent(event === 'pageshow' || event === 'storage-blocked' ? new PageTransitionEvent('pageshow', { persisted: true }) : new Event(event)); }, event);
    await page.waitForFunction(() => document.querySelectorAll('#ziwei-deep-pdf-report article').length === 15, { timeout: 30000 });
    assert.equal(fixture.f.doc.status, 'completed'); assert.equal(fixture.rows.length, 15); assert.equal(batches, 3); assert.equal(fixture.f.starts, 1); assert.equal(fixture.f.refunds, 0);
    await readLast(page); screenshots.push({ event, batches, providerCalls: fixture.rows.length, financialMutations: 0 }); await context.close();
  }
  assert.deepEqual(pageErrors, []);
  const evidence = { mock: true, beforeSha, metrics, screenshots, pdfs, fontRequests, requests, pageErrors, visibleChars: completed.totalChars, usageMeasured: false, billedTokensMeasured: false };
  if (output) await writeFile(path.join(output, pdfOnly ? 'pdf-evidence.json' : 'evidence.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ ...evidence, requests: requests.length, metrics: metrics.map(({ rows, ...summary }) => summary) }, null, 2));
} finally { await browser.close(); }
