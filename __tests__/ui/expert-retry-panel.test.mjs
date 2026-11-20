// 2026-11-20 R10 전문가 상담 다시 시도 우선: 공용 패널의 보류 판정·문구·서비스 배선.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const FILE = 'app/components/ExpertRetryPanel.tsx';
const source = fs.readFileSync(FILE, 'utf8');
const ast = ts.createSourceFile(FILE, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const pick = (name) => {
  let found;
  const visit = (node) => {
    if ((ts.isFunctionDeclaration(node) && node.name?.text === name) || (ts.isVariableStatement(node) && node.declarationList.declarations.some((d) => d.name.getText(ast) === name))) found = node.getText(ast);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(found, name);
  return ts.transpile(found.replace(/^export\s+/, ''), { target: ts.ScriptTarget.ES2022 });
};
const ctx = vm.createContext({});
vm.runInContext(`${pick('EN')}\n${pick('EXPERT_RETRY_COPY')}\n${pick('expertRetryHoldOf')}\nthis.copy = EXPERT_RETRY_COPY; this.holdOf = expertRetryHoldOf;`, ctx);

test('only an open, unrefunded retry hold shows the retry panel', () => {
  assert.deepEqual({ ...ctx.holdOf({ refunded: false, retry: { available: true, sessionId: 'v1' } }) }, { sessionId: 'v1' });
  assert.deepEqual({ ...ctx.holdOf({ sessionId: 'v2', retry: { available: true } }) }, { sessionId: 'v2' });
  assert.equal(ctx.holdOf({ refunded: true, retry: { available: true, sessionId: 'v1' } }), null);
  assert.equal(ctx.holdOf({ retry: { available: false, sessionId: 'v1' } }), null);
  assert.equal(ctx.holdOf({ reason: 'LLM_FAILED' }), null);
  assert.equal(ctx.holdOf({ retry: { available: true } }), null);
});

test('retry copy covers five locales, states no extra charge and promises no date', () => {
  assert.deepEqual(Object.keys(ctx.copy).sort(), ['en', 'ja', 'ko', 'zh-CN', 'zh-TW']);
  assert.equal(ctx.copy.ko.retryLabel, '다시 시도 · 추가 결제·차감 없음');
  assert.equal(ctx.copy.ko.refundRequestLabel, '다시 시도 대신 환불 요청');
  for (const [locale, copy] of Object.entries(ctx.copy)) {
    for (const [key, text] of Object.entries(copy)) assert.doesNotMatch(text, /\d/, `${locale}.${key} must not promise a date or day count`);
  }
});

test('the panel posts only the session id to the service retry and refund-request routes', () => {
  assert.match(source, /postSession\(`\$\{apiBase\}\/retry`, hold\.sessionId\)/);
  assert.match(source, /postSession\(`\$\{apiBase\}\/refund-request`, hold\.sessionId\)/);
  assert.match(source, /body: JSON\.stringify\(\{ sessionId \}\)/);
  assert.doesNotMatch(source.replace(/^\s*\/\/.*$/gm, ''), /\/points|runBillingCoinGate|paymentPayload/);
});

test('vedic web flow routes a held failure to the result page retry panel', () => {
  const result = fs.readFileSync('app/vedic-ai/result/VedicAiResultClient.tsx', 'utf8');
  assert.match(result, /apiBase="\/api\/vedic-ai"/);
  assert.match(result, /probeExpertRetryHold\(`\/api\/vedic-ai\/result\?id=/);
  const client = fs.readFileSync('app/vedic-ai/VedicAiClient.tsx', 'utf8');
  assert.match(client, /expertRetryHoldOf\(data\)/);
  assert.match(client, /window\.location\.assign\(`\/vedic-ai\/result\/\?id=/);
});

test('astrology web flow routes a held failure to the result page retry panel, never on Toss', () => {
  const result = fs.readFileSync('app/astrology-ai/result/AstrologyAiResultClient.tsx', 'utf8');
  assert.match(result, /apiBase="\/api\/astrology-ai"/);
  assert.match(result, /response\.status === 409 \? expertRetryHoldOf\(payload, resultId\)/);
  assert.match(result, /retryHold && paymentSurface !== "toss"/);
  const client = fs.readFileSync('app/astrology-ai/AstrologyAiClient.tsx', 'utf8');
  assert.match(client, /paymentSurface === "toss" \? null : expertRetryHoldOf\(data\)/);
  assert.match(client, /paymentSurface === "toss" \? null : await probeExpertRetryHold\(`\/api\/astrology-ai\/result\//);
  assert.match(client, /window\.location\.assign\(`\/astrology-ai\/result\/\?id=/);
  assert.equal(client.match(/code\.startsWith\(ASTROLOGY_RETRY_HELD\)/g)?.length, 2, 'submit and paid resume both route a held failure');
});

test('ziwei web flow shows the retry panel in place for a held failure, never on Toss', () => {
  const client = fs.readFileSync('app/ziwei-ai/ZiweiAiClient.tsx', 'utf8');
  assert.match(client, /apiBase="\/api\/ziwei-ai"/);
  assert.match(client, /retryHold && paymentSurface !== "toss"/);
  assert.match(client, /paymentSurface === "toss" \? null : expertRetryHoldOf\(data\)/);
  assert.match(client, /paymentSurface === "toss" \|\| !id \? null : await probeExpertRetryHold\(`\/api\/ziwei-ai\/result\?id=/);
  assert.equal(client.match(/await heldRetryFor\(/g)?.length, 2, 'saved resume and submit polling both check for a held failure');
});

test('sukuyo compatibility web flow shows the retry panel in place for a held failure, never on Toss', () => {
  const client = fs.readFileSync('app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx', 'utf8');
  assert.match(client, /apiBase="\/api\/sukuyo-compatibility-ai"/);
  assert.match(client, /retryHold && paymentSurface !== "toss"/);
  assert.match(client, /paymentSurface === "toss" \? null : expertRetryHoldOf\(data, id\)/);
  assert.equal(client.match(/= !data\.ok && "retry" in data \? heldRetryOf\(data, /g)?.length, 2, 'saved result and start both check for a held failure');
});

test('karma web result shows the retry panel for a held failure, never on Toss', () => {
  const client = fs.readFileSync('app/karma-destiny-ai/result/KarmaDestinyAiResultClient.tsx', 'utf8');
  assert.match(client, /apiBase="\/api\/karma-destiny-ai"/);
  assert.match(client, /paymentSurface === "toss" \|\| result\?\.status !== "generation_failed" \? null : expertRetryHoldOf\(result, sessionId\)/);
  assert.match(client, /status === 503 && code === "LLM_ERROR"\) \{ setResumeEpoch\(value => value \+ 1\); return; \}/);
});
