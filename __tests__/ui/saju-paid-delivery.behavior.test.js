const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync('js/saju-engine.js', 'utf8');
const ast = ts.createSourceFile('saju.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const names = new Set(['_bindSajuQuestionPromptCard', '_sajuPromptOwnerId', '_sajuPromptPendingStorageKey', '_sajuPromptStorePendingJob', '_sajuPromptReadPendingJob', '_sajuPromptClearPendingJob', '_sajuPromptSavedResultsKey', '_sajuPromptReadSavedResult', '_sajuPromptStoreSavedResult', '_sajuPromptRenderChapters', '_sajuPromptReadPersonaMode', '_sajuPromptReadPersonaSummary', '_sajuPromptBuildPersonaSummaryText', '_sajuPromptBuildResultSummaryHtml', '_sajuPromptBuildCopyText', '_sajuPromptBuildShareText', '_sajuPromptChapterTitle', '_sajuPromptEscapeHtml']);
const code = ast.statements.filter(n => ts.isFunctionDeclaration(n) && names.has(n.name?.text)).map(n => n.getText(ast)).join('\n');
function setup() {
  const fields = ['question', 'count', 'generate', 'regenerate', 'resume', 'archive', 'output', 'output-panel', 'output-text', 'copy-result', 'save-result', 'share-result', 'reset-result', 'save-state', 'status', 'result-summary', 'result-question', 'result-basis', 'mode-status'];
  const dom = new JSDOM('<input id="themeCheckbox" type="checkbox"><main data-reading-mode="pig">' + fields.map(key => `<${key === 'question' || key === 'output' ? 'textarea' : key.startsWith('result-') || key === 'output-text' || key === 'mode-status' ? 'div' : 'button'} data-saju-ai-${key}></${key === 'question' || key === 'output' ? 'textarea' : key.startsWith('result-') || key === 'output-text' || key === 'mode-status' ? 'div' : 'button'}>`).join('') + '<button data-saju-ai-mode-button data-saju-mode="pig"></button><button data-saju-ai-mode-button data-saju-mode="neo"></button></main>', { url: 'https://mock.invalid', pretendToBeVisual: true });
  const w = dom.window;
  w.localStorage.setItem('fortune_auth_user', JSON.stringify({ id: 'owner' }));
  w.HTMLElement.prototype.scrollIntoView = function() {};
  const posts = [];
  const copies = [];
  let respond = async () => ({ ok: true, status: 200, payload: { ok: true, status: 'completed', saved: true, resultId: 'r', resultText: '1. 질문에 대한 핵심 답변\n완성된 상담입니다.' } });
  const ctx = {
    window: w, document: w.document, localStorage: w.localStorage, sessionStorage: w.sessionStorage, navigator: w.navigator,
    console, Date, setTimeout: (fn) => setTimeout(fn, 0), clearTimeout, setInterval: () => 1, clearInterval() {},
    _sajuEngineCurrentLang: () => 'ko', _sajuPromptBindCalibrationSection() {}, _sajuPromptResolveProfileId: () => 'p',
    _sajuPromptSetStatus: (el, text) => { el.textContent = text; }, _sajuPromptReadDomain: () => 'life_direction',
    _sajuPromptCopyText: async text => { copies.push(text); }, _sajuPromptToast() {},
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
  return { ctx, w, root, posts, copies, respond: fn => { respond = fn; }, bind: () => ctx._bindSajuQuestionPromptCard(root), close: () => { w._sajuPromptLocaleCleanup?.(); w.close(); } };
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


test('saved consultation stays in archive until explicitly opened, without charging or deleting', () => {
  const h = setup();
  h.ctx._sajuPromptClearPendingJob('p');
  h.ctx._sajuPromptStoreSavedResult({profileId: 'p', resultId: 'saved', question: 'Previous question', resultText: 'Archived reading'});
  const before = h.w.localStorage.getItem(h.ctx._sajuPromptSavedResultsKey('p'));
  h.root.querySelector('[data-saju-ai-output-panel]').style.display = 'none';
  h.bind();
  assert.equal(h.root.querySelector('[data-saju-ai-output-text]').textContent, '');
  assert.equal(h.root.querySelector('[data-saju-ai-question]').value, '');
  assert.equal(h.root.querySelector('[data-saju-ai-output-panel]').style.display, 'none');
  h.root.querySelector('[data-saju-ai-archive]').click();
  assert.match(h.root.querySelector('[data-saju-ai-output-text]').textContent, /Archived reading/);
  assert.equal(h.root.querySelector('[data-saju-ai-question]').value, '');
  h.root.querySelector('[data-saju-ai-reset-result]').click();
  assert.equal(h.root.querySelector('[data-saju-ai-output-panel]').style.display, 'none');
  assert.equal(h.w.localStorage.getItem(h.ctx._sajuPromptSavedResultsKey('p')), before);
  h.root.querySelector('[data-saju-ai-archive]').click();
  assert.match(h.root.querySelector('[data-saju-ai-output-text]').textContent, /Archived reading/);
  h.w.localStorage.setItem('fortune_auth_user', JSON.stringify({id: 'other'}));
  h.w.dispatchEvent(new h.w.Event('cd:auth-changed'));
  h.root.querySelector('[data-saju-ai-archive]').click();
  assert.equal(h.root.querySelector('[data-saju-ai-output-text]').textContent, '');
  assert.equal(h.posts.length, 0);
  h.close();
});


test('server-discovered completed reading does not become a pending job or reopen on focus', async () => {
  const h = setup();
  h.ctx._sajuPromptClearPendingJob('p');
  h.ctx._sajuPromptFetchStatus = async () => ({ok: true, payload: {jobId: 'done', resultId: 'done', status: 'completed', saved: true, resultText: 'Server archive', question: 'Old question'}});
  h.bind(); await tick();
  h.w.dispatchEvent(new h.w.Event('focus')); await tick();
  assert.equal(h.ctx._sajuPromptReadPendingJob('p'), null);
  assert.equal(h.root.querySelector('[data-saju-ai-question]').value, '');
  assert.equal(h.root.querySelector('[data-saju-ai-output-text]').textContent, '');
  h.root.querySelector('[data-saju-ai-archive]').click();
  assert.match(h.root.querySelector('[data-saju-ai-output-text]').textContent, /Server archive/);
  assert.equal(h.posts.length, 0);
  h.close();
});

test('twelve chapter bodies survive grouped navigation and historical bold headings', () => {
  const h = setup();
  const titles = ['질문에 대한 핵심 답변','이 명식의 중심 성향','십성 구조 해석','오행 균형 해석','현재 고민과 명식의 연결','일/돈/관계/연애/건강 리듬','대운의 전환점','올해의 흐름','조심해야 할 패턴','살리는 전략','30일 실천 가이드','마지막 한마디'];
  const raw = titles.map((title,i) => `**${i+1}. ${title}**\n본문 ${i+1}: 계산 근거와 질문에 대한 조건입니다.`).join('\n');
  const output = h.w.document.createElement('div');
  output.innerHTML = h.ctx._sajuPromptRenderChapters(raw);
  assert.equal(output.querySelectorAll('section').length,12);
  assert.equal(output.querySelectorAll('nav a').length,7);
  titles.forEach((_,i) => assert.ok(output.textContent.includes(`본문 ${i+1}: 계산 근거와 질문에 대한 조건입니다.`)));
  assert.equal(h.ctx._sajuPromptChapterTitle('이 명식의 중심 성향은 결론을 단정하는 근거가 아닙니다.'),'');
  assert.ok(h.ctx._sajuPromptRenderChapters('과거 단일 본문도 그대로 읽습니다.').includes('과거 단일 본문도 그대로 읽습니다.'));
  h.close();
});

test('question draft is scoped to the current owner and profile', () => {
  const h=setup();
  h.ctx._sajuPromptClearPendingJob('p');
  h.bind();
  const input=h.root.querySelector('[data-saju-ai-question]');
  input.value='이직과 잔류 중 무엇을 확인해야 할까요?';
  input.dispatchEvent(new h.w.Event('input'));
  const draft=h.w.sessionStorage.getItem('cd_saju_consultation_draft:owner:p');
  assert.ok(draft.includes('이직과 잔류'));
  h.w.localStorage.setItem('fortune_auth_user',JSON.stringify({id:'other'}));
  h.w.dispatchEvent(new h.w.Event('cd:auth-changed'));
  assert.equal(input.value,'');
  assert.equal(h.w.sessionStorage.getItem('cd_saju_consultation_draft:other:p'),null);
  assert.equal(h.posts.length,0);
  h.close();
});


test('legacy result opens as the previous format without regeneration', () => {
  const h=setup();
  const preview=h.ctx._sajuPromptBuildResultSummaryHtml({resultText:'## 1. 질문에 대한 핵심 답변\n먼저 **역할과 보상**을 확인하세요. <script>\n## 2. 이 명식의 중심 성향\n뒤 챕터의 본문입니다.'});
  assert.match(preview,/이전 형식의 상담문/);
  assert.match(preview,/먼저 역할과 보상을 확인하세요/);
  assert.ok(!preview.includes('##') && !preview.includes('뒤 챕터') && !preview.includes('<script>'));
  assert.ok(h.ctx._sajuPromptBuildResultSummaryHtml({resultText:'과거 단일 본문'}).includes('과거 단일 본문'));
  h.close();
});

test('persona mode changes only presentation and copy while preserving the paid result and input state', async () => {
  const h=setup();
  h.ctx._sajuPromptClearPendingJob('p');
  const payload={
    profileId:'p', resultId:'same-result', requestId:'same-request', question:'이직 기준을 알려주세요', domain:'career',
    resultText:'1. 질문에 대한 핵심 답변\n공통 12챕터 상담문입니다.',
    factSnapshot:{dayMaster:{stem:'甲'}}, analysisBasis:{groups:[{title:'기준',items:[{label:'일간',value:'甲'}]}]},
    personaSummaries:{version:1,yeoni:{letter:'마음을 먼저 살펴보는 연이 편지입니다.',action:'조건 하나를 적어보세요.'},neo:{conclusion:'결론부터 확인합니다.',basis:'같은 일간 甲 근거입니다.',caution:'현실 조건이 다르면 재검토합니다.',nextCheck:'역할과 보상을 확인합니다.'}}
  };
  assert.equal(h.ctx._sajuPromptStoreSavedResult(payload),true);
  const storedBefore=JSON.parse(h.w.localStorage.getItem(h.ctx._sajuPromptSavedResultsKey('p')));
  assert.deepEqual(storedBefore.personaSummaries,payload.personaSummaries);
  assert.deepEqual(storedBefore.analysisBasis,payload.analysisBasis);
  h.bind();
  h.root.querySelector('[data-saju-ai-archive]').click();
  h.root.querySelector('[data-saju-ai-question]').value='작성 중인 새 질문';
  assert.match(h.root.querySelector('[data-saju-ai-result-summary]').textContent,/연이의 마무리 편지/);
  assert.equal(h.root.querySelector('.consultation-persona--yeoni').open,true);
  assert.equal(h.root.querySelector('.consultation-persona--yeoni').hasAttribute('data-mobile-detail-keep-open'),true);

  h.w.localStorage.setItem('fortuneThemeModeStateV1','neo');
  h.w.document.getElementById('themeCheckbox').checked=true;
  h.w.document.getElementById('themeCheckbox').dispatchEvent(new h.w.Event('change',{bubbles:true}));
  await tick();

  assert.equal(h.root.getAttribute('data-reading-mode'),'neo');
  assert.equal(h.root.querySelector('[data-saju-mode="neo"]').getAttribute('aria-pressed'),'true');
  assert.match(h.root.querySelector('[data-saju-ai-result-summary]').textContent,/네오의 판단 기록/);
  assert.doesNotMatch(h.root.querySelector('[data-saju-ai-result-summary]').textContent,/연이의 마무리 편지/);
  assert.match(h.root.querySelector('[data-saju-ai-output-text]').textContent,/공통 12챕터 상담문/);
  assert.equal(h.root.querySelector('[data-saju-ai-question]').value,'작성 중인 새 질문');
  assert.equal(h.posts.length,0,'화자 전환은 결제·생성·상태 조회 POST를 만들면 안 된다');
  assert.deepEqual(JSON.parse(h.w.localStorage.getItem(h.ctx._sajuPromptSavedResultsKey('p'))),storedBefore);

  h.root.querySelector('[data-saju-ai-copy-result]').click();
  await tick();
  assert.match(h.copies.at(-1),/네오의 판단 기록/);
  assert.match(h.copies.at(-1),/공통 12챕터 상담문/);
  assert.doesNotMatch(h.copies.at(-1),/연이의 마무리 편지/);
  const neoShare=h.ctx._sajuPromptBuildShareText(payload,'neo');
  assert.match(neoShare,/네오의 판단 기록/);
  assert.doesNotMatch(neoShare,/연이의 마무리 편지|이직 기준을 알려주세요/);
  h.close();
});


test('numbered chapter subtitles retain text and belong to the correct reading group', () => {
  const h=setup();
  const source='### 7. 대운의 전환점\n이전 챕터의 본문입니다.\n### 8. 올해의 흐름 (2026년 丙午)\n올해의 흐름 (참고)은 단정할 수 없습니다.';
  const el=h.w.document.createElement('div');
  el.innerHTML=h.ctx._sajuPromptRenderChapters(source);
  assert.equal(el.querySelectorAll('section').length,2);
  assert.equal(el.querySelectorAll('h4')[1].textContent,'올해의 흐름 (2026년 丙午)');
  assert.ok(el.querySelectorAll('section')[1].textContent.includes('올해의 흐름 (참고)은 단정할 수 없습니다.'));
  assert.equal(h.ctx._sajuPromptChapterTitle('올해의 흐름 (참고)'),'');
  assert.match(el.querySelector('nav a').title,/올해의 흐름/);
  h.close();
});
