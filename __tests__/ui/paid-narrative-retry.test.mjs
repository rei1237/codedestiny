// 2026-11-22 C2-UI 서술형 유료 상담 다시 시도 우선: 공용 판정·문구(js/core/paid-narrative-retry.js)와 웹 배선.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const retry = require('../../js/core/paid-narrative-retry.js');
const read = (file) => fs.readFileSync(file, 'utf8');

test('only a held, unsaved paid narrative shows the retry panel', () => {
  const held = { ok: true, saved: false, retryable: false, reviewRequired: true, resultId: 'r1' };
  assert.deepEqual(retry.holdOf(held), { resultId: 'r1' });
  assert.deepEqual(retry.holdOf({ ...held, resultId: '' }, 'r2'), { resultId: 'r2' });
  assert.equal(retry.holdOf({ ...held, saved: true }), null);
  assert.equal(retry.holdOf({ ...held, retryable: true }), null);
  assert.equal(retry.holdOf({ ...held, reviewRequired: false }), null);
  assert.equal(retry.holdOf({ ...held, resultId: '' }), null);
  assert.equal(retry.holdOf(null), null);
});

test('retry replies map to resume, closed window, refund or failure', () => {
  assert.deepEqual(retry.retryOutcome(200, { ok: true, resumeBody: { resumeResultId: 'r1' } }, 'r1'), { kind: 'resume', resumeBody: { resumeResultId: 'r1' } });
  assert.deepEqual(retry.retryOutcome(409, { reason: 'STILL_GENERATING' }, 'r1'), { kind: 'resume', resumeBody: { resumeResultId: 'r1' } });
  assert.equal(retry.retryOutcome(409, { reason: 'RETRY_WINDOW_CLOSED' }, 'r1').kind, 'retry-closed');
  assert.equal(retry.retryOutcome(409, { reason: 'RETRY_LIMIT_REACHED' }, 'r1').kind, 'retry-closed');
  assert.equal(retry.retryOutcome(409, { reason: 'REFUND_IN_PROGRESS' }, 'r1').kind, 'refund-requested');
  assert.equal(retry.retryOutcome(409, { reason: 'NOT_RETRYABLE', status: 'refunded' }, 'r1').kind, 'refunded');
  assert.equal(retry.retryOutcome(409, { reason: 'NOT_RETRYABLE', status: 'completed' }, 'r1').kind, 'resume');
  assert.equal(retry.retryOutcome(404, { reason: 'RESULT_NOT_FOUND' }, 'r1').kind, 'failed');
});

test('refund request opens a finished result instead of refunding it', () => {
  assert.equal(retry.refundOutcome(200, { ok: true, refundStatus: 'refunded' }, 'r1').kind, 'refunded');
  assert.equal(retry.refundOutcome(202, { ok: true, nextAction: 'support' }, 'r1').kind, 'refund-requested');
  assert.deepEqual(retry.refundOutcome(409, { reason: 'RESULT_READY', resumeBody: { resumeResultId: 'r1' } }, 'r1'), { kind: 'ready', resumeBody: { resumeResultId: 'r1' } });
  const view = retry.nextView({ kind: 'ready', resumeBody: { resumeResultId: 'r1' } }, 'refund', retry.copyFor('ko'));
  assert.equal(view.closed, true);
  assert.deepEqual(view.resume, { resumeResultId: 'r1' });
  assert.equal(retry.nextView({ kind: 'retry-closed' }, 'retry', retry.copyFor('ko')).retryHidden, true);
});

test('buttons post only the result id to the shared routes, never a payment gate', async () => {
  const calls = [];
  const request = async (path, body) => { calls.push([path, body]); return { status: 200, payload: { ok: true, resumeBody: { resumeResultId: 'r9' } } }; };
  assert.equal((await retry.retry('r9', { request })).kind, 'resume');
  await retry.refundRequest('r9', { request });
  assert.deepEqual(calls, [['/api/paid-narrative/retry', { resultId: 'r9' }], ['/api/paid-narrative/refund-request', { resultId: 'r9' }]]);
  assert.equal((await retry.retry('r9', { request: async () => { throw new Error('offline'); } })).kind, 'failed');
  assert.doesNotMatch(read('js/core/paid-narrative-retry.js'), /["'`]\/points|["'`]\/checkout|useCoinGate|ensurePaidAccess/);
});

test('copy covers five locales, says there is no extra charge and promises no date', () => {
  assert.deepEqual(Object.keys(retry.COPY).sort(), ['en', 'ja', 'ko', 'zh-CN', 'zh-TW']);
  assert.equal(retry.copyFor('ko').retryLabel, '무료로 다시 시도 · 추가 결제·차감 없음');
  assert.equal(retry.copyFor('ko').refundRequestLabel, '다시 시도 대신 환불 요청');
  assert.match(retry.copyFor('ko').offer, /추가 결제·차감 없음/);
  for (const [locale, copy] of Object.entries(retry.COPY)) {
    assert.deepEqual(Object.keys(copy).sort(), Object.keys(retry.COPY.ko).sort(), locale);
    for (const [key, text] of Object.entries(copy)) assert.doesNotMatch(text, /\d/, `${locale}.${key}`);
  }
});

test('the four web narratives hide the partial result behind the panel while held', () => {
  const clients = {
    'app/tarot/prompt-maker/TarotPromptMakerClient.tsx': ['oracleHold', 'resumeHeldOracle'],
    'app/components/LoveRelationshipTarot.tsx': ['loveHold', 'resumeHeldLove'],
    'app/components/MindScanTarot.tsx': ['mindscanHold', 'resumeHeldMindscan'],
    'app/fortune-chat/FortuneChatClient.tsx': ['guardianHold', 'resumeHeldGuardian'],
  };
  for (const [file, [hold, resume]] of Object.entries(clients)) {
    const source = read(file);
    assert.match(source, /import PaidNarrativeRetryPanel, \{ paidNarrativeHoldOf/, file);
    assert.match(source, new RegExp(`<PaidNarrativeRetryPanel hold=\\{${hold}\\} onResume=`), file);
    assert.match(source, new RegExp(`function ${resume}|const ${resume} =`), file);
  }
  assert.match(read('app/tarot/prompt-maker/TarotPromptMakerClient.tsx'), /!oracleHold/);
  assert.match(read('app/components/LoveRelationshipTarot.tsx'), /!loveHold/);
  assert.match(read('app/components/MindScanTarot.tsx'), /mindscanHold && !readingLoading \? <PaidNarrativeRetryPanel/);
  assert.match(read('app/fortune-chat/FortuneChatClient.tsx'), /if \(hold\) \{ setError\(""\); setGuardianHold\(hold\); return false; \}/);
});

test('the mounted panel resumes for free and opens a finished result instead of refunding', async () => {
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<!doctype html><html lang="ko"><body><div id="host"><p>미완성</p></div></body></html>');
  const saved = { document: globalThis.document };
  globalThis.document = dom.window.document;
  try {
    const host = dom.window.document.getElementById('host');
    const calls = [];
    const resumed = [];
    const replies = [
      { status: 409, payload: { reason: 'RESULT_READY', resumeBody: { resumeResultId: 'r5' } } },
      { status: 200, payload: { ok: true, resumeBody: { resumeResultId: 'r5' } } },
    ];
    const request = async (path, body) => { calls.push([path, body]); return replies.pop(); };
    retry.mount(host, { resultId: 'r5', request, onResume: (body) => resumed.push(body) });
    retry.mount(host, { resultId: 'r5', request, onResume: (body) => resumed.push(body) });
    const panels = host.querySelectorAll('[data-paid-narrative-retry]');
    assert.equal(panels.length, 1);
    const [retryButton, refundButton] = panels[0].querySelectorAll('button');
    assert.equal(retryButton.textContent, '무료로 다시 시도 · 추가 결제·차감 없음');
    retryButton.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    refundButton.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.deepEqual(calls.map(([path]) => path), ['/api/paid-narrative/retry', '/api/paid-narrative/refund-request']);
    assert.deepEqual(resumed, [{ resumeResultId: 'r5' }, { resumeResultId: 'r5' }]);
  } finally {
    globalThis.document = saved.document;
  }
});

test('the six legacy narratives mount the shared panel and resume through their saved runner', () => {
  const pages = {
    'yoga-guru.html': [/CDPaidNarrativeRetry\?\.holdOf\(yogaLatest\)/, /function resumeHeldYoga\(body\)\{yogaLatest=null;[^\n]*runSavedYoga\(body\)/],
    'geomancy-oracle-v4.html': [/CDPaidNarrativeRetry\?\.holdOf\(geomancyLatest\);if\(hold\)\{document\.getElementById\('rs-ai-txt'\)\.textContent=''/, /function resumeHeldGeomancy\(body\)/],
    'js/psycho-dream-analyzer-freuds-study.js': [/if \(hold\) \{ showPaidHold\(progress, hold\.resultId\); return; \}/, /function resumeHeldDream\(body\)[\s\S]{0,200}runPaidDream\(body\)/],
    'js/animal-totem-experience.js': [/if \(state\.deliveryHold \|\| !narrative/, /function resumeHeldTotem\(body\)[\s\S]{0,200}continueTotemDelivery\(body\)/],
    'pet-saju.html': [/record\.held=window\.CDPaidNarrativeRetry\?window\.CDPaidNarrativeRetry\.holdOf\(payload,record\.resultId\)/, /if\(record\.held&&window\.CDPaidNarrativeRetry\)\{while\(host\.children\.length>1\)/],
    'js/saju-engine.js': [/outcome\.code === 'REVIEW_REQUIRED' && outcome\.resultId/, /store\.update\(inputKey, \{ resumeBody: next/],
  };
  for (const [file, patterns] of Object.entries(pages)) {
    const source = read(file);
    assert.match(source, /paid-narrative-retry\.js/, file);
    for (const pattern of patterns) assert.match(source, pattern, file);
  }
});
