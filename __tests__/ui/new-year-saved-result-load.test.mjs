import '../../scripts/lib/mock-network-guard.cjs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Execute the actual page callback, including its owner guard and finally path.
const source = fs.readFileSync('app/new-year-ai-consultation/NewYearAiClient.tsx', 'utf8');
const ast = ts.createSourceFile('page.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let callback;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'loadSession') callback = node.initializer.arguments[0].getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(callback);
const executable = ts.transpileModule(`globalThis.load = (${callback});`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
function harness() {
  let epoch = 0;
  const requests = [], delivered = [], errors = [];
  const state = {
    startLockRef: { current: false }, resultLoadScopeRef: { current: null },
    captureDeliveryScope: () => { const started = epoch; return () => started === epoch; },
    authFetch: url => new Promise((resolve, reject) => requests.push({ url, resolve, reject })),
    applyResult: result => delivered.push(result),
    startConsultation: () => { throw new Error('Completed result must not generate'); },
    idempotencyKeyRef: { current: 'original-key' },
    setError: error => errors.push(error), setStatus: () => {},
    friendlyErrorMessage: error => error.message, SERVER_ERROR_MESSAGE: 'mock error',
  };
  vm.runInNewContext(executable, state);
  const finish = index => requests[index].resolve({ ok: true, status: 200, json: async () => ({ ok: true, status: 'completed', sessionId: 'saved', messages: [{ content: 'original purchased text' }] }) });
  return { state, requests, delivered, errors, finish, invalidate: () => { epoch++; } };
}
test('same-scope duplicate reads are suppressed without generating or changing saved text', async () => {
  const h = harness(), pending = h.state.load('saved');
  assert.equal(await h.state.load('saved'), false); assert.equal(h.requests.length, 1);
  h.finish(0); assert.equal(await pending, true);
  assert.equal(h.delivered[0].messages[0].content, 'original purchased text');
  assert.equal(h.state.startLockRef.current, false);
});
test('discarded mount does not block the next read or release its newer lock', async () => {
  const h = harness(), stale = h.state.load('saved'); h.invalidate();
  const current = h.state.load('saved'); assert.equal(h.requests.length, 2);
  h.finish(0); assert.equal(await stale, false);
  assert.equal(h.delivered.length, 0); assert.equal(h.state.startLockRef.current, true);
  assert.equal(await h.state.load('saved'), false);
  h.finish(1); assert.equal(await current, true); assert.equal(h.delivered.length, 1);
  assert.equal(h.state.startLockRef.current, false);
});
test('failed read permits a retry, while an active generation still excludes reads', async () => {
  const h = harness(), pending = h.state.load('saved');
  h.requests[0].reject(new Error('mock offline')); assert.equal(await pending, false);
  assert.equal(h.state.startLockRef.current, false);
  const retry = h.state.load('saved'); h.finish(1); assert.equal(await retry, true);
  h.state.startLockRef.current = true;
  assert.equal(await h.state.load('saved'), false); assert.equal(h.requests.length, 2);
  assert.deepEqual(h.errors, ['mock offline']);
});
