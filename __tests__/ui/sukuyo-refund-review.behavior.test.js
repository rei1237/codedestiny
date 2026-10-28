const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function makeStart(data, status) {
  const path = process.env.SUKUYO_CLIENT_SOURCE || 'app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.tsx';
  const source = fs.readFileSync(path, 'utf8');
  const tree = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'startConsultation') found = node;
    ts.forEachChild(node, visit);
  }
  visit(tree); assert.ok(found);
  const notices = [], phases = [], consultations = [];
  let requests = 0;
  const pendingGenerationRef = { current: null }, submitKeyRef = { current: 'key' };
  const context = { captureDeliveryScope: () => () => true, pendingGenerationRef, submitKeyRef,
    payload: {}, document: { hidden: false }, setPhase: value => phases.push(value),
    postJson: async () => { requests++; return { status, data }; },
    rememberConsultationUrl: () => {}, setConsultation: value => consultations.push(value),
    setNotice: value => notices.push(value), setError: () => {}, sleep: async () => {},
  };
  const code = ts.transpileModule('(' + found.getText(tree) + ')', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return { start: vm.runInNewContext(code, context), notices, phases, consultations, requests: () => requests, pendingGenerationRef };
}

test('review state stops repeated generation and tells the owner how to seek help', async () => {
  const consultation = { id: '64b7f2a1c3d4e5f600000008', status: 'partial' };
  const f = makeStart({ ok: true, status: 'partial', reviewRequired: true, consultation }, 202);
  assert.equal(await f.start('original-key', {}), false);
  assert.equal(f.requests(), 1); assert.equal(f.consultations[0], consultation);
  assert.match(f.notices.at(-1), /고객센터/); assert.equal(f.phases.at(-1), 'idle');
  assert.equal(f.pendingGenerationRef.current.sessionId, consultation.id);
});

test('a completed consultation still finishes without another request', async () => {
  const f = makeStart({ ok: true, status: 'completed', consultation: { id: '64b7f2a1c3d4e5f600000008', status: 'completed' } }, 200);
  assert.equal(await f.start('original-key', {}), true);
  assert.equal(f.requests(), 1); assert.equal(f.pendingGenerationRef.current, null);
});
