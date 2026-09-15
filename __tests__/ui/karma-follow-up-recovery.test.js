const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
const raw = fs.readFileSync('app/karma-destiny-ai/KarmaDestinyAiClient.tsx', 'utf8'), tree = ts.createSourceFile('ui.tsx', raw, 99, true, ts.ScriptKind.TSX);
let declaration; function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(tree) === 'handleFollowUp') declaration = node.getText(tree); ts.forEachChild(node, visit); } visit(tree);
const code = ts.transpileModule('const ' + declaration + ';', { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
function fixture(replies) {
  const calls = [], shown = []; let current = true;
  const context = vm.createContext({ followUp: '같은 질문', sessionId: 'original-session', sending: false, captureOwner: () => () => current, setSending() {}, setError: value => shown.push(['error', value]), setMessages: value => shown.push(['messages', value]), setFollowUp() {}, setStatus() {}, copy: { llmErrorMessage: '재시도' }, window: { setTimeout: fn => fn() }, postJson: async (path, body) => { calls.push({ path, body }); const next = replies.shift(); if (next === 'switch') { current = false; return { response: { status: 200 }, payload: { ok: true, messages: ['foreign'] } }; } if (next instanceof Error) throw next; return { response: { status: next }, payload: next === 200 ? { ok: true, messages: ['저장된 마지막 답변'] } : { ok: false, retryable: true } }; } });
  vm.runInContext(code, context); return { calls, shown, run: () => vm.runInContext('handleFollowUp({preventDefault(){}})', context) };
}
test('storage and transport loss retry the original question without another gate', async () => { const f = fixture([new TypeError('lost'), 503, 202, 200]); await f.run(); assert.equal(f.calls.length, 4); assert.equal(new Set(f.calls.map(c => JSON.stringify(c))).size, 1); assert.equal(f.shown.at(-1)[0], 'messages'); });
test('account switch discards a completed response', async () => { const f = fixture(['switch']); await f.run(); assert.equal(f.shown.some(row => row[0] === 'messages'), false); });
test('bounded failures keep question editable and never mark success', async () => { const f = fixture([503, 503, 503, 503]); await f.run(); assert.equal(f.calls.length, 4); assert.equal(f.shown.at(-1)[0], 'error'); });
