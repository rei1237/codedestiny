const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync('js/saju-engine.js', 'utf8');
const ast = ts.createSourceFile('saju.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const names = new Set(['_bindSajuQuestionPromptCard', '_sajuPromptOwnerId', '_sajuPromptPendingStorageKey', '_sajuPromptStorePendingJob', '_sajuPromptReadPendingJob', '_sajuPromptClearPendingJob', '_sajuPromptSavedResultsKey', '_sajuPromptReadSavedResult', '_sajuPromptStoreSavedResult', '_sajuPromptRenderChapters', '_sajuPromptChapterTitle', '_sajuPromptEscapeHtml']);
const code = ast.statements.filter(n => ts.isFunctionDeclaration(n) && names.has(n.name?.text)).map(n => n.getText(ast)).join('\n');
function setup() {
  const fields = ['question', 'count', 'generate', 'regenerate', 'resume', 'output', 'output-panel', 'output-text', 'copy-result', 'save-result', 'share-result', 'reset-result', 'save-state', 'status'];
  const dom = new JSDOM('<main>' + fields.map(key => `<${key === 'question' || key === 'output' ? 'textarea' : 'button'} data-saju-ai-${key}></${key === 'question' || key === 'output' ? 'textarea' : 'button'}>`).join('') + '</main>', { url: 'https://mock.invalid', pretendToBeVisual: true });
  const w = dom.window;
  w.localStorage.setItem('fortune_auth_user', JSON.stringify({ id: 'owner' }));
  w.HTMLElement.prototype.scrollIntoView = function() {};
  const posts = [];
  let respond = async () => ({ ok: true, status: 200, payload: { ok: true, status: 'completed', saved: true, resultId: 'r', resultText: '1. 질문에 대한 핵심 답변\n완성된 상담입니다.' } });
  const ctx = {
    window: w, document: w.document, localStorage: w.localStorage, sessionStorage: w.sessionStorage, navigator: w.navigator,
    console, Date, setTimeout: (fn) => setTimeout(fn, 0), clearTimeout, setInterval: () => 1, clearInterval() {},
    _sajuEngineCurrentLang: () => 'ko', _sajuPromptBindCalibrationSection() {}, _sajuPromptResolveProfileId: () => 'p',
    _sajuPromptSetStatus: (el, text) => { el.textContent = text; }, _sajuPromptReadDomain: () => 'life_direction',
    _sajuPromptApiUrls: () => ['https://mock.invalid/create'], _sajuPromptReadPrivacy: () => ({}),
    _sajuPromptBuildResultSummaryHtml: () => '', _sajuPromptBuildQuestionHtml: () => '', _sajuPromptBuildBasisHtml: () => '',
    _sajuPromptFetchStatus: async () => ({ ok: true, status: 202, payload: { status: 'partial', jobId: 'job', resultId: 'r', completedChapters: [1, 2], resultText: '1. 질문에 대한 핵심 답변\n저장된 첫 챕터입니다.' } }),
    _cdAIPromptRequestJson: async (_url, init) => { posts.push(JSON.parse(init.body)); return respond(); },
    _sajuPromptDomainLabel: () => '인생', _SE_SAJU_AI_RESUME_KIND: 'saju',
    fetch: () => { throw new Error('external fetch forbidden'); },
  };
  vm.createContext(ctx); vm.runInContext(code, ctx);
  const root = w.document.querySelector('main');
  ctx._sajuPromptStorePendingJob({ profileId: 'p', jobId: 'job', requestId: 'original', question: '저장된 질문입니다', paidEvidence: { requestId: 'original' } });
  return { ctx, w, root, posts, respond: fn => { respond = fn; }, bind: () => ctx._bindSajuQuestionPromptCard(root), close: () => { w._sajuPromptLocaleCleanup?.(); w.close(); } };
}
const tick = () => new Promise(resolve => setTimeout(resolve, 30));

test('partial report resumes by server job without checkout and clears proof only on completed saved response', async () => {
  const h = setup();
  let release;
  h.respond(() => new Promise(resolve => { release = resolve; }));
  h.bind(); h.root.querySelector('[data-saju-ai-resume]').click(); await tick();
  assert.deepEqual(h.posts, [{ resumeJobId: 'job' }]);
  assert.ok(h.ctx._sajuPromptReadPendingJob('p'));
  assert.match(h.root.querySelector('[data-saju-ai-output-text]').textContent, /첫 챕터/);
  assert.equal(h.root.querySelector('[data-saju-ai-save-result]').disabled, true);
  release({ ok: true, payload: { status: 'completed', saved: true, resultId: 'r', resultText: '완성된 상담입니다.' } });
  await tick();
  assert.equal(h.ctx._sajuPromptReadPendingJob('p'), null);
  assert.match(h.root.querySelector('[data-saju-ai-status]').textContent, /열렸습니다/);
  h.close();
});

test('storage failure retains original pending job and allows another same-job retry', async () => {
  const h = setup();
  h.respond(async () => ({ ok: false, status: 503, payload: { ok: false, reason: 'RESULT_STORAGE_UNAVAILABLE', message: '저장 확인 실패' } }));
  h.bind(); h.root.querySelector('[data-saju-ai-resume]').click(); await tick();
  assert.equal(h.ctx._sajuPromptReadPendingJob('p').requestId, 'original');
  h.root.querySelector('[data-saju-ai-regenerate]').click(); await tick();
  assert.equal(h.posts.length, 2);
  assert.deepEqual(h.posts[1], { resumeJobId: 'job' });
  h.close();
});

test('pageshow bfcache restore resumes the pending job without a click, but a fresh pageshow does not', async () => {
  const h = setup();
  h.bind();
  assert.equal(h.posts.length, 0);
  const fresh = new h.w.Event('pageshow');
  fresh.persisted = false;
  h.w.dispatchEvent(fresh);
  await tick();
  assert.equal(h.posts.length, 0, '새로고침(persisted:false) pageshow는 자동으로 이어받기를 시작하면 안 된다');
  const restored = new h.w.Event('pageshow');
  restored.persisted = true;
  h.w.dispatchEvent(restored);
  await tick();
  assert.deepEqual(h.posts, [{ resumeJobId: 'job' }]);
  h.close();
});

test('window focus after backgrounding resumes the pending job without a click', async () => {
  const h = setup();
  h.bind();
  h.w.dispatchEvent(new h.w.Event('focus'));
  await tick();
  assert.deepEqual(h.posts, [{ resumeJobId: 'job' }]);
  h.close();
});

test('account change discards in-flight result and isolates local recovery keys', async () => {
  const h = setup(); let release;
  h.respond(() => new Promise(resolve => { release = resolve; }));
  h.bind(); h.root.querySelector('[data-saju-ai-resume]').click(); await tick();
  h.w.localStorage.setItem('fortune_auth_user', JSON.stringify({ id: 'other' }));
  h.w.dispatchEvent(new h.w.Event('cd:auth-changed'));
  release({ ok: true, payload: { status: 'completed', saved: true, resultText: '다른 계정에는 보이면 안 되는 본문' } });
  await tick();
  assert.equal(h.ctx._sajuPromptReadPendingJob('p'), null);
  assert.equal(h.root.querySelector('[data-saju-ai-output-text]').textContent, '');
  h.w.localStorage.setItem('fortune_auth_user', JSON.stringify({ id: 'owner' }));
  assert.equal(h.ctx._sajuPromptReadPendingJob('p').requestId, 'original');
  h.close();
});
