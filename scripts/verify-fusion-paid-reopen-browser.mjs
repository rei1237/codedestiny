/** Local mock only: calculated two-stage report -> actual client -> fresh-document GET. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import {
  createMemoryFusionFortuneStore, generateFusionFortuneRequest, countFusionFortuneVisibleText,
} from '../worker/lib/fusion-fortune.js';

const base = process.argv[2] || 'http://127.0.0.1:13070';
assert.equal(new URL(base).hostname, '127.0.0.1', 'local mock only');
assert.ok(!process.argv.includes('--live'), 'live mode is forbidden');
const output = process.argv[3] && path.resolve(process.argv[3]);
if (output) await mkdir(output, { recursive: true });
const input = {
  contextVersion: 2, birthDate: '1995-04-18', birthTime: '08:30', calendarType: 'solar',
  gender: 'female', locale: 'ko', concern: '올해 이직을 준비할 때 어떤 순서로 움직이면 좋을까요?',
  birthPlace: { city: '서울', country: 'KR', latitude: 37.5665, longitude: 126.978, timezone: 'Asia/Seoul' },
};
let snapshot;
const args = {
  input, userId: '64b7f2a1c3d4e5f601234567', requestId: 'fusion-af-mock',
  store: createMemoryFusionFortuneStore(), env: { ENABLE_FUSION_FORTUNE_MOCK_FLOW: 'true' },
  now: new Date('2026-09-16T00:00:00Z'), resolvePaidAccess: async () => ({ ok: true }),
  onSnapshot: async value => { snapshot = structuredClone(value); },
};
const first = await generateFusionFortuneRequest({ ...args, stage: 1 });
assert.equal(first.ok, true, JSON.stringify(first));
assert.equal(first.stageStatus, 'partial');
const second = await generateFusionFortuneRequest({
  ...args, stage: 2, priorResult: first.result, priorSnapshot: snapshot, priorGenerationSource: first.generationSource,
});
assert.equal(second.ok, true, JSON.stringify(second));
assert.equal(second.stageStatus, 'completed');
const result = second.result;
assert.ok(countFusionFortuneVisibleText(result) >= 30000);
assert.equal(Object.keys(snapshot.context.systems).length, 6);
assert.equal(snapshot.context.tarotSpread.cards.length, 6);
const requests = [], errors = [], metrics = [];
const browser = await chromium.launch({ headless: true });
try {
  for (const width of [390, 430, 1280]) {
    // A separate browser document/context for every viewport, no preview injection.
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/api/')) {
        requests.push({ width, path: url.pathname, query: url.search, method: route.request().method() });
        let body = { ok: true };
        if (url.pathname === '/api/auth/me') body.user = { id: args.userId, _id: args.userId, nickname: '모의 사용자' };
        else if (url.pathname === '/api/fusion-fortune/result') body = url.searchParams.has('id')
          ? { ok: true, consultation: { id: 'af-saved', requestId: args.requestId, status: 'completed', stage: 2, result, qualityTier: 'full' } }
          : { ok: true, consultations: [] };
        else if (url.pathname === '/api/fusion-fortune/status') body = { ok: true, isLoggedIn: true, canGenerate: true, nextAction: 'generate', pricing: { featureKey: 'fusion-fortune-consultation' } };
        else if (/generate|billing|payments|consume/.test(url.pathname)) throw Error('reopen attempted generation/payment: ' + url.pathname);
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      }
      if (url.origin === new URL(base).origin) return route.continue();
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push({ width, message: error.message }));
    await page.goto(base + '/fusion-fortune/?cid=af-saved', { waitUntil: 'domcontentloaded', timeout: 60000 });
    const closing = page.locator('#fusion-closing-message');
    await closing.waitFor({ timeout: 60000 });
    assert.equal(await closing.textContent(), result.closingMessage);
    await closing.scrollIntoViewIfNeeded();
    assert.ok(await closing.isVisible());
    // A tall paragraph being visible alone does not prove its last line is readable.
    await closing.evaluate(el => window.scrollBy(0, el.getBoundingClientRect().bottom - innerHeight + 110));
    const lastLineBottom = await closing.evaluate(el => el.getBoundingClientRect().bottom);
    assert.ok(lastLineBottom > 0 && lastLineBottom <= 800, 'last line above the mobile dock');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.equal(overflow, 0, 'horizontal overflow at ' + width);
    for (const event of ['pageshow', 'online', 'focus', 'visibilitychange']) {
      await page.evaluate(name => (name === 'visibilitychange' ? document : window).dispatchEvent(new Event(name)), event);
    }
    assert.equal(await closing.textContent(), result.closingMessage);
    metrics.push({ width, closingChars: result.closingMessage.length, lastLineBottom, overflow });
    if (output) await page.screenshot({ path: path.join(output, `fusion-closing-${width}.png`) });
    await context.close();
  }
  // A server checkpoint may arrive while this document is asleep. Test each wake event alone.
  for (const event of ['pageshow', 'focus', 'online', 'visibilitychange', 'storage-blocked']) {
    let available = false, finished = false, streamCalls = 0, resolveInitial;
    const initialPending = new Promise(resolve => { resolveInitial = resolve; });
    const context = await browser.newContext({ viewport: { width: 390, height: 900 }, serviceWorkers: 'block' });
    await context.addCookies([{ name: 'fortune_auth_role', value: 'user', url: base }]);
    if (event === 'storage-blocked') await context.addInitScript(() => {
      for (const method of ['getItem', 'setItem', 'removeItem']) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function (key, ...args) {
          if (String(key).startsWith('cdFusionPaidRequest')) throw new DOMException('mock receipt storage blocked', 'SecurityError');
          return original.call(this, key, ...args);
        };
      }
    });
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (!url.pathname.startsWith('/api/')) return url.origin === new URL(base).origin ? route.continue() : route.abort();
      let body = { ok: true };
      if (url.pathname === '/api/auth/me') body.user = { id: args.userId, _id: args.userId, nickname: '모의 사용자' };
      else if (url.pathname === '/api/fusion-fortune/status') body = { ok: true, isLoggedIn: true, canGenerate: true, nextAction: 'generate', pricing: { featureKey: 'fusion-fortune-consultation' } };
      else if (url.pathname === '/api/fusion-fortune/result') {
        if (url.searchParams.has('pending')) {
          if (!available) resolveInitial();
          if (available && !finished) body.consultation = { id: 'af-partial', requestId: args.requestId, status: 'partial', stage: 1, nextStage: 2, resumeBody: input, result: first.result };
        } else if (url.searchParams.has('requestId')) body.consultation = { id: 'af-partial', requestId: args.requestId, status: finished ? 'completed' : 'partial', nextStage: finished ? null : 2, resumeBody: input, result: finished ? result : first.result };
        else body.consultations = [];
      } else if (url.pathname === '/api/fusion-fortune/generate/stream') {
        const sent = route.request().postDataJSON();
        assert.equal(sent.requestId, args.requestId); assert.equal(sent.stage, 2); assert.equal(sent.locale, input.locale);
        assert.equal(sent.birthDate, input.birthDate);
        streamCalls++; finished = true;
        return route.fulfill({ status: 200, contentType: 'text/event-stream', body: 'event: result\ndata: ' + JSON.stringify({ ...second, status: 'completed', consultationId: 'af-partial' }) + '\n\n' });
      } else if (/generate/.test(url.pathname) || (route.request().method() !== 'GET' && /billing|payments|consume/.test(url.pathname))) throw Error('wake attempted a new payment: ' + url.pathname);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const page = await context.newPage();
    await page.goto(base + '/fusion-fortune/', { waitUntil: 'domcontentloaded' });
    let initialTimer;
    try { await Promise.race([initialPending, new Promise((_, reject) => { initialTimer = setTimeout(() => reject(Error('initial owned pending GET missing')), 15000); })]); }
    finally { clearTimeout(initialTimer); }
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    available = true;
    await page.evaluate(name => (name === 'visibilitychange' ? document : window).dispatchEvent(name === 'pageshow' ? new PageTransitionEvent(name, { persisted: true }) : new Event(name)), event === 'storage-blocked' ? 'pageshow' : event);
    await page.locator('#fusion-closing-message').waitFor({ timeout: 10000 });
    assert.equal(await page.locator('#fusion-closing-message').textContent(), result.closingMessage);
    assert.equal(streamCalls, 1, event + ' resumes only stage two, without a payment');
    metrics.push({ event, resumedStage: 2, streamCalls, payments: 0 });
    await context.close();
  }
  assert.deepEqual(errors, []);
  assert.ok(requests.filter(row => row.path === '/api/fusion-fortune/result' && row.query.includes('id=af-saved')).length >= 3);
  const evidence = { mock: true, fullPageClient: true, calculatedSystems: 6, tarotCards: 6,
    visibleChars: countFusionFortuneVisibleText(result), metrics, errors, requests,
    reopenLlmCalls: 0, reopenPayments: 0, reopenDebits: 0,
    limitations: ['API responses and purchase entitlement are mocked', 'No physical device, live LLM, PG, database persistence or server recovery proof'] };
  if (output) await writeFile(path.join(output, 'evidence.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await browser.close();
}
