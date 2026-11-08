// 6c-5 후속: 배달 2판의 202 {partial:true}(남은 장 있음)는 클라이언트가 스스로 이어 부른다.
// partial 이 없는 202(다른 창이 잠금을 쥔 경우)는 기존처럼 수동 확인으로 남긴다.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const SIBYL = fs.readFileSync('js/sibyl-system.js', 'utf8');

function loadSibylHelpers() {
  const start = SIBYL.indexOf('var SIBYL_PARTIAL_MAX_WAVES');
  const end = SIBYL.indexOf('async function _generateDominatorReport');
  assert.ok(start > 0 && end > start, '시빌라 partial 이어 부르기 헬퍼를 찾지 못했다');
  const context = {};
  vm.runInNewContext(SIBYL.slice(start, end) + '\nthis.h={max:SIBYL_PARTIAL_MAX_WAVES,run:_sibylContinuePartialReport,markup:_sibylReportPendingMarkup};', context);
  return context.h;
}
function responses(list) {
  const calls = [];
  return { calls, post: async () => { calls.push(1); return list[Math.min(calls.length - 1, list.length - 1)]; } };
}
const PARTIAL = { ok: true, status: 202, payload: { status: 'generating', partial: true } };
const OTHER = { ok: true, status: 202, payload: { status: 'generating' } };
const DONE = { ok: true, status: 200, payload: { chapters: [] } };

test('sibyl-system: partial 202 is re-requested with 1s then 2s waits until the report completes', async () => {
  const h = loadSibylHelpers();
  const r = responses([PARTIAL, PARTIAL, DONE]); const waits = []; const waves = [];
  const out = await h.run(r.post, async ms => { waits.push(ms); }, wave => { waves.push(wave); });
  assert.equal(out, DONE); assert.equal(r.calls.length, 3);
  assert.deepEqual(waits, [1000, 2000]); assert.deepEqual(waves, [1, 2]);
});

test('sibyl-system: partial polling stops at the wave cap and hands back the partial response', async () => {
  const h = loadSibylHelpers();
  const r = responses([PARTIAL]); const waits = [];
  const out = await h.run(r.post, async ms => { waits.push(ms); });
  assert.equal(out.payload.partial, true);
  assert.equal(r.calls.length, h.max + 1); assert.equal(waits.length, h.max);
  assert.ok(h.max >= 3 && h.max <= 10);
});

test('sibyl-system: a 202 without partial (another window) and errors are not polled', async () => {
  const h = loadSibylHelpers();
  for (const first of [OTHER, { ok: false, status: 503, payload: {} }]) {
    const r = responses([first]); const waits = [];
    assert.equal(await h.run(r.post, async ms => { waits.push(ms); }), first);
    assert.equal(r.calls.length, 1); assert.equal(waits.length, 0);
  }
});

test('sibyl-system: a stale screen (year or profile changed) stops polling', async () => {
  const h = loadSibylHelpers();
  const r = responses([PARTIAL, DONE]);
  const out = await h.run(r.post, async () => {}, () => false);
  assert.equal(out, PARTIAL); assert.equal(r.calls.length, 1);
});

test('sibyl-system: partial copy is its own; the other-window copy stays unchanged', () => {
  const h = loadSibylHelpers();
  assert.match(h.markup('partial-running'), /남은 장을 이어서 쓰는 중/);
  assert.doesNotMatch(h.markup('partial-running'), /다른 창/);
  assert.match(h.markup('partial-stalled'), /_sibylRetryDominator\(\)/);
  assert.doesNotMatch(h.markup('partial-stalled'), /다른 창/);
  assert.match(h.markup('other-window'), /다른 창에서 시작한 분석을 이어서 확인할 수 있어요\. 잠시 후 진행 상태를 확인해 주세요\./);
  assert.match(h.markup('other-window'), />진행 상태 확인하기</);
  const body = SIBYL.slice(SIBYL.indexOf('async function _generateDominatorReport'), SIBYL.indexOf('function _renderMonthlyRiskPanel'));
  assert.match(body, /_sibylContinuePartialReport\(/);
  assert.match(body, /'partial-stalled' : 'other-window'/);
});

function loadSavedResume(fetchQueue) {
  const file = 'app/records/view/SavedSibylReading.tsx';
  const source = fs.readFileSync(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let fn = '';
  (function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'resume') fn = node.getText(ast);
    ts.forEachChild(node, visit);
  })(ast);
  assert.ok(fn, 'SavedSibylReading resume()를 찾지 못했다');
  const max = Number(/const SIBYL_PARTIAL_MAX_WAVES=(\d+)/.exec(source)?.[1]);
  assert.ok(max >= 3 && max <= 10);
  const js = ts.transpileModule(fn, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const state = { messages: [], reloads: 0, posts: 0, waits: [] };
  const context = {
    busy: false, setBusy() {}, setMessage: m => state.messages.push(m),
    report: { profileId: 'p1', year: 2027 }, SIBYL_PARTIAL_MAX_WAVES: max,
    copy: { resumeError: 'E', connectionError: 'C', resumePending: 'PENDING', resumePartial: 'PARTIAL', resumePartialStalled: 'STALLED' },
    window: { location: { reload: () => { state.reloads++; } } },
    setTimeout: (run, ms) => { state.waits.push(ms); run(); },
    authFetch: async () => { const next = fetchQueue[Math.min(state.posts, fetchQueue.length - 1)]; state.posts++; return { ok: next.status < 400, status: next.status, json: async () => next.body }; },
    Error,
  };
  vm.runInNewContext(js + '\nthis.resume=resume;', context);
  return { state, max, resume: context.resume };
}

test('SavedSibylReading: partial 202 auto-continues and reloads when done', async () => {
  const { state, resume } = loadSavedResume([{ status: 202, body: { partial: true } }, { status: 202, body: { partial: true } }, { status: 200, body: {} }]);
  await resume();
  assert.equal(state.posts, 3); assert.deepEqual(state.waits, [1000, 2000]); assert.equal(state.reloads, 1);
  assert.ok(state.messages.includes('PARTIAL'));
});

test('SavedSibylReading: wave cap shows the partial retry copy, not the other-window copy', async () => {
  const { state, max, resume } = loadSavedResume([{ status: 202, body: { partial: true } }]);
  await resume();
  assert.equal(state.posts, max + 1); assert.equal(state.reloads, 0);
  assert.equal(state.messages.at(-1), 'STALLED');
});

test('SavedSibylReading: another-window 202 keeps the existing pending copy without polling', async () => {
  const { state, resume } = loadSavedResume([{ status: 202, body: { status: 'generating' } }]);
  await resume();
  assert.equal(state.posts, 1); assert.equal(state.waits.length, 0); assert.equal(state.messages.at(-1), 'PENDING');
});
