import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { chromium } from '@playwright/test';

const base = process.env.CONSULTATION_TEST_BASE || 'http://127.0.0.1:14123';
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(base).hostname));
const directory = 'build-cache/consultation-sharing';
await mkdir(directory, { recursive: true });
const built = await build({ entryPoints: ['src/features/fortune-tea-house/lib/buildConsultResult.ts'], bundle: true, platform: 'node', format: 'cjs', write: false, loader: { '.wasm': 'binary' } });
const fixtureModule = { exports: {} };
new Function('require', 'module', 'exports', built.outputFiles[0].text)(createRequire(import.meta.url), fixtureModule, fixtureModule.exports);
const teaResults = {};
for (const tarotSpread of ['three', 'five']) {
  const result = fixtureModule.exports.buildFortuneTeaHouseConsultResult({ selectedTeaCupId: 'lotus-moon', selectedTeaCupName: '연꽃 달차', selectedTeaCupTopic: '마음의 진심', question: 'PRIVATE_QUESTION', tarotSpread });
  result.resultId = `PRIVATE_TEA_ID_${tarotSpread}`;
  result.synthesis.summary = '내 마음이 가는 속도를 차분히 살펴보세요.';
  result.actionPrescription = '오늘은 내가 바라는 한 가지를 적어보세요.';
  result.closingLine = '작은 선택을 응원해요.';
  teaResults[tarotSpread] = result;
}
const results = [];
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: 'block', acceptDownloads: true });
    context.setDefaultTimeout(30000); context.setDefaultNavigationTimeout(120000);
    await context.addCookies([{ name: 'fortune_auth_role', value: 'user', url: base }]);
    let teaMode = 'tarot';
    let teaResult = teaResults.three;
    let neoResult = { ok: true, id: 'PRIVATE_NEO_ID', sessionId: 'PRIVATE_NEO_ID', status: 'completed', selectedMethod: 'saju', question: 'PRIVATE_QUESTION', initialBriefing: { operationTitle: '이번 주 작전', frontlineSummary: '내가 바꿀 수 있는 선택부터 정리해라.', actionOrders: ['작은 실행부터 시작해라.'] } };
    const writes = [], errors = [];
    await context.addInitScript(() => {
      window.__copies = []; window.__native = []; window.__kakao = []; window.__cancelShare = false; window.__denyCopy = false;
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { if (window.__denyCopy) throw new Error('DENIED'); window.__copies.push(text); } } });
      Object.defineProperty(navigator, 'share', { configurable: true, value: async data => { if (window.__cancelShare) throw new DOMException('cancelled', 'AbortError'); window.__native.push({ ...data, files: data.files?.map(file => ({ type: file.type, size: file.size })) }); } });
      Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
      window.Kakao = { isInitialized: () => true, Share: { sendDefault: data => window.__kakao.push(data) } };
    });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname;
      const send = (body, status = 200) => route.fulfill({ status, json: body, headers: { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Credentials': 'true' } });
      if (url.origin !== base && !(url.hostname === 'yeongnyangi-qa.example.invalid' && path.startsWith('/api/'))) return route.fulfill({ status: 403, body: 'QA_EXTERNAL_NETWORK_BLOCKED' });
      if (!path.startsWith('/api/')) return route.continue();
      if (request.method() !== 'GET' && path !== '/api/billing/funnel-event') writes.push(path);
      if (path === '/api/auth/me') return send({ ok: true, authenticated: true, user: { id: 'qa-owner', _id: 'qa-owner', name: 'QA', email: 'qa@example.invalid', role: 'user' } });
      if (path === '/api/auth/refresh') return send({ ok: false }, 401);
      if (path === '/api/fortune-tea-house/results') return send({ ok: true, items: [{ resultId: teaResult.resultId, consultationMode: teaMode, questionSummary: 'QA 저장된 상담' }] });
      if (path === `/api/fortune-tea-house/results/${teaResult.resultId}`) return send({ ok: true, result: { ...teaResult, consultationMode: teaMode } });
      if (path === '/api/fortune-tea-house/honey-drops/balance') return send({ ok: true, honeyDrops: { balance: 0, authenticated: true } });
      if (path === '/api/fortune-tea-house/pending') return send({ ok: true });
      if (path === '/api/neo-operation-room/result') return send(neoResult, neoResult.status === 'generation_failed' ? 422 : 200);
      if (path === '/api/billing/funnel-event') return send({ ok: true });
      return send({ ok: false, reason: 'QA_UNMOCKED_API' }, 503);
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    async function verifyEditor(brand, label, detailed = false) {
      const editor = page.locator(`[data-consultation-share="${brand}"]`);
      await editor.locator('summary').first().click();
      await editor.getByAltText('보내기 전 확인하는 상담 이미지').waitFor();
      const summary = editor.locator('summary').first();
      assert.ok((await summary.boundingBox()).height >= 44);
      await editor.getByRole('button', { name: '문구 복사', exact: true }).click();
      const copied = await page.evaluate(() => window.__copies.at(-1));
      assert.doesNotMatch(copied, /PRIVATE_/);
      assert.match(copied, new RegExp(brand === 'tea' ? '/fortune-tea-house/' : '/neo-operation-room/'));
      assert.match(copied, /utm_medium=share/);
      const metrics = await editor.getByAltText('보내기 전 확인하는 상담 이미지').evaluate(image => ({ width: image.naturalWidth, height: image.naturalHeight }));
      assert.equal(metrics.width, 1080); assert.ok(metrics.height >= 1080);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (detailed) {
        await editor.getByLabel('공유할 이야기', { exact: true }).selectOption({ index: 1 });
        await editor.getByLabel('보낼 문구', { exact: true }).fill('내가 고른 이야기만 나눠요.');
        await editor.getByRole('button', { name: '카카오톡 요약 보내기' }).click();
        const kakao = await page.evaluate(() => window.__kakao.at(-1));
        assert.equal(kakao.content.description, '내가 고른 이야기만 나눠요.');
        assert.doesNotMatch(JSON.stringify(kakao), /PRIVATE_/);
        await editor.getByRole('button', { name: '문구 공유', exact: true }).click();
        assert.match((await page.evaluate(() => window.__native.at(-1))).text, /내가 고른 이야기만/);
        await page.evaluate(() => { window.__cancelShare = true; });
        await editor.getByRole('button', { name: '문구 공유', exact: true }).click();
        await editor.getByText('공유를 취소했어요. 상담은 그대로 남아 있어요.').waitFor();
        await page.evaluate(() => { window.__cancelShare = false; window.__denyCopy = true; });
        await editor.getByRole('button', { name: '문구 복사', exact: true }).click();
        await editor.getByLabel('복사용 전체 공유 문구').waitFor({ state: 'visible' });
        await page.evaluate(() => { window.__denyCopy = false; });
        await editor.getByLabel('보낼 문구', { exact: true }).fill('오늘 할 수 있는 일을 하나씩 정리해요. '.repeat(12));
        await editor.getByRole('button', { name: '단톡방용 180자로 줄이기' }).click();
        assert.equal(Array.from(await editor.getByLabel('보낼 문구', { exact: true }).inputValue()).length, 180);
        await editor.getByRole('button', { name: '이미지로 공유', exact: true }).click();
        assert.equal((await page.evaluate(() => window.__native.at(-1))).files[0].type, 'image/png');
        const download = page.waitForEvent('download');
        await editor.getByRole('button', { name: '이미지 저장', exact: true }).click();
        await (await download).saveAs(`${directory}/${brand}-card-${width}.png`);
        await editor.screenshot({ path: `${directory}/${brand}-${width}.png` });
      }
      results.push({ width, brand, label, status: 'PASS' });
    }
    for (const mode of ['tarot', 'tarotFive', 'saju', 'sajuCompatibility', 'sukuyo']) {
      teaMode = mode === 'tarotFive' ? 'tarot' : mode;
      teaResult = mode === 'tarotFive' ? teaResults.five : teaResults.three;
      await page.goto(base + '/fortune-tea-house/');
      await page.getByRole('button', { name: '운명의 찻집 상담 기록 보기' }).click();
      await page.getByRole('button', { name: /QA 저장된 상담/ }).click();
      await verifyEditor('tea', mode, mode === 'tarot');
    }
    for (const method of ['saju', 'vedic', 'ziwei', 'astrology']) {
      neoResult.selectedMethod = method;
      await page.goto(base + '/neo-operation-room/result/?id=PRIVATE_NEO_ID');
      await verifyEditor('neo', method, method === 'saju');
    }
    neoResult.refinedOrder = { verdict: { statement: '지금은 작은 실행이 맞다.' }, thisWeekFirstStep: '오늘 선택지 두 개를 적어라.' };
    await page.goto(base + '/neo-operation-room/result/?id=PRIVATE_NEO_ID');
    await verifyEditor('neo', 'refined');
    assert.equal(await page.getByLabel('보낼 문구', { exact: true }).inputValue(), '오늘 선택지 두 개를 적어라.');
    await page.goto(base + '/neo-operation-room/result/?neoPreview=loading');
    await page.getByRole('link', { name: '1차 브리핑', exact: true }).waitFor();
    assert.equal(await page.locator('[data-consultation-share]').count(), 0);
    neoResult = { ...neoResult, ok: false, status: 'generation_failed', reason: 'LLM_ERROR' };
    await page.goto(base + '/neo-operation-room/result/?id=PRIVATE_NEO_ID');
    await page.getByRole('button', { name: /다시/ }).first().waitFor();
    assert.equal(await page.locator('[data-consultation-share]').count(), 0);
    assert.deepEqual(writes, [], 'Sharing must not purchase, generate, refine, or unlock benefits');
    assert.deepEqual(errors, []);
    results.push({ width, label: 'unfinished-and-failed-hidden', status: 'PASS' });
    await context.close();
  }
} finally { await browser.close(); await writeFile(`${directory}/results.json`, JSON.stringify(results, null, 2)); }
console.log(JSON.stringify(results, null, 2));
