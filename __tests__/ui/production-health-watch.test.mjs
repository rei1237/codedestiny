import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateProbe, consecutiveVerdict } from '../../scripts/production-health-watch.mjs';

const SHA = 'a'.repeat(40), OTHER = 'b'.repeat(40);
const healthy = { health: { status: 200, body: { ok: true } }, pages: { status: 200, body: { commit: SHA } }, worker: { status: 200, body: { gitSha: SHA.slice(0, 12) } } };

test('healthy: health ok and Pages/Worker on the same commit (short sha prefix counts)', () => {
  assert.deepEqual(evaluateProbe(healthy).problems, []);
});

test('each failure mode is reported', () => {
  assert.match(evaluateProbe({ ...healthy, health: { error: 'timeout' } }).problems[0], /health: timeout/);
  assert.match(evaluateProbe({ ...healthy, health: { status: 503, body: null } }).problems[0], /HTTP 503/);
  assert.match(evaluateProbe({ ...healthy, health: { status: 200, body: { ok: false } } }).problems[0], /ok=false/);
  assert.match(evaluateProbe({ ...healthy, worker: { status: 200, body: { commit: OTHER } } }).problems[0], /sha mismatch/);
  assert.match(evaluateProbe({ ...healthy, pages: { status: 200, body: {} } }).problems[0], /pages version: sha missing/);
});

test('only two failures in a row fail the run', () => {
  const bad = { ok: false }, good = { ok: true };
  assert.equal(consecutiveVerdict([good]).ok, true);
  assert.equal(consecutiveVerdict([bad, good]).ok, true);
  assert.equal(consecutiveVerdict([bad, bad]).ok, false);
});
