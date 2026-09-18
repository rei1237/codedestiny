const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

/* 베다 AI 상담(vedic_ai_prompt_generator)의 유일한 화면은 vedic-astrology.html 인라인 스크립트다.
   워커는 유료 서사 전달 원시함수를 쓰므로 첫 POST 가 202(부분 생성)로 돌아오고, 200(completed)이
   나올 때까지 resumeBody 로 이어서 요청해야 10개 파트가 모두 채워진다. 실제 함수 본문을 그대로
   꺼내 실행한다 — 모킹은 화면·네트워크 경계뿐이다. */
function extractFunction(file, name) {
  const html = fs.readFileSync(file, 'utf8');
  const at = html.search(new RegExp('(async )?function ' + name + '\\b'));
  assert.ok(at > 0, `${name} not found in ${file}`);
  const start = html.lastIndexOf('<script', at);
  const open = html.indexOf('>', start) + 1;
  const end = html.indexOf('</script>', at);
  const script = html.slice(open, end);
  const ast = ts.createSourceFile(file, script, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const node = ast.statements.find(statement => statement.name?.text === name);
  assert.ok(node, `${name} declaration not found in the enclosing script block`);
  return node.getText(ast);
}

const NAMES = ['vedicAiDeliverUntilSaved', 'vedicAiRecoverSavedConsultation', 'vedicAiMountWakeRecovery', 'vedicAiGeneratePromptCore'];

function run(responses, options = {}) {
  const state = { question: '', inFlight: false, statusError: false, statusMessage: '', resultText: '', prompt: '', paidEvidence: null, paidRequestId: '', requestEpoch: 0, ...(options.state || {}) };
  const calls = [];
  const listeners = [];
  const context = {
    console: { error() {} },
    setTimeout: run => run(),
    document: {
      visibilityState: options.visibilityState || 'visible',
      getElementById: () => ({ value: '지금의 선택을 어떻게 준비하면 좋을까요?' }),
      addEventListener: (type, handler) => listeners.push({ type, handler }),
      removeEventListener: () => {},
    },
    localStorage: { getItem: () => 'saved-token' },
    G: { chart: { asc: 'Mesha' }, report: {}, vedicCompatibilityResult: null },
    buildCurrentVedicDataSnapshot: () => ({ planet: 'Sun' }),
    vedicAiEnsureState: () => state,
    vedicAiRefreshUi: () => {},
    _vedicSetPaymentPending: () => {},
    vedicAiCreateRequestId: () => 'vedic-request',
    vedicAiPaidGate: async () => ({ ok: true, status: 200, requestId: 'vedic-request', accessGrant: {}, accessDecision: {}, consume: {}, payment: {}, _paymentContext: {} }),
    buildVedicAiResumeDescriptor: () => null,
    vedicAiStatusText: (code, message) => String(message || code || ''),
    VEDIC_AI_RETRY_HINT: '',
    vedicAiShouldRetainEvidence: payload => payload?.paymentRetainedForRetry === true,
    vedicAiSyncBalance: () => {},
    vedicPrashnaReadAuthHeaders: () => ({ 'Content-Type': 'application/json', Authorization: options.token === null ? '' : 'Bearer saved-token' }),
    fetch: async (url, init) => {
      const method = (init && init.method) || 'GET';
      calls.push({ url, method, body: init && init.body ? JSON.parse(init.body) : null });
      const next = responses[Math.min(calls.length - 1, responses.length - 1)];
      return { ok: next.status >= 200 && next.status < 300, status: next.status, json: async () => next.payload };
    },
  };
  context.window = { cdStandaloneAiLocale: { current: () => 'ko' }, addEventListener: (type, handler) => listeners.push({ type, handler }), removeEventListener: () => {} };
  vm.createContext(context);
  for (const name of NAMES) vm.runInContext(extractFunction('vedic-astrology.html', name), context);
  const fire = (type, event) => Promise.all(listeners.filter(entry => entry.type === type).map(entry => entry.handler(event)));
  return { state, calls, listeners, fire, context, core: context.vedicAiGeneratePromptCore, mount: context.vedicAiMountWakeRecovery };
}

const partialPayload = {
  ok: true, status: 'partial', saved: false, retryable: true, retryAfterMs: 1,
  resultId: 'vedic-result', resumeBody: { resumeResultId: 'vedic-result' },
  resultText: '## 질문의 핵심과 한 줄 답변\n\n앞부분만 작성된 상태입니다.',
  completedParts: ['part-1'], totalParts: 10, chargedCoins: 100,
};
const completedPayload = {
  ok: true, status: 'completed', saved: true, resultId: 'vedic-result',
  resultText: '## 질문의 핵심과 한 줄 답변\n\n열 부분이 모두 채워진 상담 본문입니다.',
  generatedPrompt: '완성된 상담 프롬프트', questionType: 'general', chargedCoins: 100, balanceAfter: 0,
};
const partial = { status: 202, payload: partialPayload };
const completed = { status: 200, payload: completedPayload };
const missing = { status: 404, payload: { ok: false, code: 'NOT_FOUND' } };

test('202 부분 응답을 완성으로 확정하지 않고 저장된 본문이 나올 때까지 이어서 받는다', async () => {
  const { state, calls, core } = run([partial, completed]);
  const ok = await core(null, '');

  assert.equal(ok, true, '이어받기에 성공하면 true 를 돌려줘야 한다');
  assert.ok(calls.length >= 2, '202 를 받고도 재요청하지 않으면 결제한 상담의 7/10 이 영영 생성되지 않는다');
  assert.deepEqual(calls[1].body, { resumeResultId: 'vedic-result' }, '재요청은 서버가 준 resumeBody 를 그대로 보내야 같은 결제에 이어 붙는다');
  assert.equal(state.resultText, completedPayload.resultText, '부분 본문을 최종 결과로 남기면 결제 후 잘린 상담이 확정된다');
  assert.equal(state.paidEvidence, null, '완성 후에는 결제 증거를 비워 재결제 없는 무한 재생성이 열리지 않게 한다');
});

/* 모바일에서 생성 도중 탭이 내려가면 진행 중이던 요청이 끊긴다. 결제와 저장은 서버에 남아 있으므로
   전경 복귀 신호마다 저장본을 다시 붙여야 한다 — 붙이지 않으면 결제한 상담을 영영 못 본다. */
test('잠들었다 깨어나면 저장된 상담을 다시 붙이고 남은 부분을 이어받는다', async () => {
  const { state, calls, fire, mount } = run([{ status: 202, payload: partialPayload }, completed]);
  mount();
  await fire('pageshow', { persisted: true });

  assert.equal(calls[0].method, 'GET', '복구는 저장본 조회로 시작해야 한다 — 새 POST 는 같은 상담을 다시 결제·생성할 위험이 있다');
  assert.match(String(calls[0].url), /\/api\/fortune\/vedic\/ai-result$/);
  assert.deepEqual(calls[1].body, { resumeResultId: 'vedic-result' }, '저장본이 아직 부분이면 resumeBody 로 이어받아야 한다');
  assert.equal(state.resultText, completedPayload.resultText, '깨어난 화면에 완성 본문이 돌아와야 한다');
  assert.equal(state.statusError, false);
});

test('복구가 끝난 뒤 다시 깨어나도 추가 요청을 보내지 않는다', async () => {
  const { calls, fire, mount } = run([{ status: 200, payload: completedPayload }]);
  mount();
  await fire('focus', {});
  const afterFirst = calls.length;
  await fire('focus', {});
  await fire('online', {});
  assert.equal(calls.length, afterFirst, '복구에 성공한 뒤에도 신호마다 조회하면 화면이 서버를 반복해서 두드린다');
});

test('첫 진입 pageshow·숨은 문서·생성 중·비로그인에서는 조회하지 않는다', async () => {
  const fresh = run([missing]);
  fresh.mount();
  await fresh.fire('pageshow', { persisted: false });
  assert.equal(fresh.calls.length, 0, '첫 진입 pageshow 는 bfcache 복귀가 아니다');

  const hidden = run([missing], { visibilityState: 'hidden' });
  hidden.mount();
  await hidden.fire('visibilitychange', {});
  assert.equal(hidden.calls.length, 0, '숨은 문서에서 조회하면 배터리만 쓰고 화면은 갱신되지 않는다');

  const busy = run([missing], { state: { inFlight: true } });
  busy.mount();
  await busy.fire('focus', {});
  assert.equal(busy.calls.length, 0, '생성이 도는 중에 복구가 끼어들면 같은 상담을 두 번 이어받는다');

  const anonymous = run([missing], { token: null });
  anonymous.mount();
  await anonymous.fire('focus', {});
  assert.equal(anonymous.calls.length, 0, '토큰이 없으면 조회는 401 만 만든다');
});

test('저장본이 없으면 화면에 오류를 남기지 않는다', async () => {
  const { state, calls, fire, mount } = run([missing]);
  mount();
  await fire('focus', {});
  assert.equal(calls.length, 1);
  assert.equal(state.statusError, false, '결제한 적 없는 방문자에게 복구 실패 문구를 띄우면 안 된다');
  assert.equal(state.resultText, '');
});
