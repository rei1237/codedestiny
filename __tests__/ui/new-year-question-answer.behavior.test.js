const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// 모듈을 CommonJS로 옮겨 실제 의존성째 싣는다. '@/' 별칭은 저장소 루트로 푼다.
function load(file) {
  const resolved = ['', '.ts', '.tsx', '.js'].map(ext => file + ext).find(path => fs.existsSync(path) && fs.statSync(path).isFile());
  const loaded = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(resolved, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.compileFunction(output, ['exports', 'require', 'module'])(loaded.exports, id => id.startsWith('@/') ? load(id.slice(2)) : require(id), loaded);
  return loaded.exports;
}
const sections = load('app/new-year-ai-consultation/_lib/answer-sections');
for (const gap of ['\n', '\n\n']) test('질문 답변의 모든 문단을 보존하며 성향 카드에 중복하지 않는다: ' + JSON.stringify(gap), () => {
  const answer = '지금은 제안받은 업무의 조건을 확인한 뒤 결정하는 편이 좋겠습니다.';
  const continuation = '부담이 커질 수 있는 역할과 실제로 받을 지원을 비교한 다음 원하는 조건을 정리해 보세요.';
  const nature = '책임을 오래 붙드는 강점이 있지만 역할의 경계가 흐려지면 혼자 부담을 떠안을 수 있습니다.';
  const text = '**질문에 대한 답변**' + gap + answer + '\n\n' + continuation +
    '\n\n**타고난 성향과 지금의 마음**' + gap + nature;
  const parsed = sections.classifySections(sections.splitAssistantSections(text));
  assert.ok(parsed.questionAnswer.body.includes(answer));
  assert.ok(parsed.questionAnswer.body.includes(continuation));
  const cards = sections.buildDomainBodies([{ key: 'opening', text }], parsed.domains);
  assert.ok(cards.get('opening').includes(nature));
  assert.ok(!cards.get('opening').includes(answer));
  assert.ok(!cards.get('opening').includes(continuation));
});
test('직접 쓴 질문과 선택한 예시 질문을 모두 질문으로 표시한다', () => {
  assert.equal(sections.isGenuineCustomQuestion('이직해도 될까요?'), true);
  assert.equal(sections.isGenuineCustomQuestion('올해 전체적인 흐름이 궁금해요.'), true);
  assert.equal(sections.isGenuineCustomQuestion(' '), false);
});

async function submit({ failAccessOnce = false, generationError = false, denied = false } = {}) {
  const source = fs.readFileSync('app/new-year-ai-consultation/NewYearAiClient.tsx', 'utf8');
  const ast = ts.createSourceFile('client.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'handleSubmit') declaration = node;
    ts.forEachChild(node, visit);
  }
  visit(ast);
  const calls = { checks: [], starts: [], failed: [] };
  const ctx = vm.createContext({
    setTimeout, clearTimeout,
    captureDeliveryScope: () => () => true, startLockRef: { current: false }, isBusy: false,
    pendingGenerationRef: { current: null }, readDevPreviewState: () => null,
    validateConsultationForm: () => '', form: {}, idempotencyKeyRef: { current: 'saved-request' },
    buildConsultationPayload: () => ({ question: '이직해도 될까요?' }),
    buildBillingGateInput: () => ({}), primePaymentEligibility: async () => {},
    setError: () => {}, setNotice: () => {}, setStatus: () => {},
    friendlyErrorMessage: load('app/_lib/friendly-error').friendlyErrorMessage,
    beginPaidFeatureGateCheck: () => {}, completePaidFeatureGateCheck: () => {},
    failPaidFeatureGateCheck: event => calls.failed.push(event),
    FEATURE_KEY: 'new-year-ai-consultation', SERVER_ERROR_MESSAGE: 'server',
    LOGIN_REQUIRED_MESSAGE: 'login', PAYMENT_VERIFY_FAILED_MESSAGE: 'payment failed',
    PAYMENT_CANCELLED_MESSAGE: 'cancelled', LLM_ERROR_MESSAGE: 'generation failed',
    postJson: async (url, payload, key) => {
      calls.checks.push({ url, payload, key });
      if (failAccessOnce && calls.checks.length === 1) throw new Error('network interrupted');
      return { response: { status: denied ? 401 : 200 }, payload: denied
        ? { ok: false, reason: 'LOGIN_REQUIRED' } : { ok: true, accessToken: 'saved-grant' } };
    },
    startConsultation: async (...args) => { calls.starts.push(args); if (generationError) throw new Error('generation failed'); },
  });
  const retry = load('app/_lib/consultationResultPolling').runAccessCheckWithTransientRetry;
  ctx.runAccessCheckWithTransientRetry = attempt => retry(attempt, { baseDelayMs: 0 });
  vm.runInContext(ts.transpileModule('var ' + declaration.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, ctx);
  await ctx.handleSubmit({ preventDefault() {} });
  assert.equal(ctx.startLockRef.current, false);
  return calls;
}

test('일시적인 이용권 확인 실패는 같은 요청으로 재시도하고 생성은 한 번 시작한다', async () => {
  const calls = await submit({ failAccessOnce: true });
  assert.equal(calls.checks.length, 2);
  assert.ok(calls.checks.every(call => call.key === 'saved-request' && call.payload.requestId === 'saved-request'));
  assert.equal(calls.starts.length, 1);
  assert.equal(calls.starts[0][1], 'saved-request');
  assert.equal(calls.failed.length, 0);
});
test('확정 인증 실패는 재시도하거나 생성을 시작하지 않는다', async () => {
  const calls = await submit({ denied: true });
  assert.equal(calls.checks.length, 1);
  assert.equal(calls.starts.length, 0);
});
test('이용권 확인 후 생성 실패를 이용권 오류로 안내하지 않는다', async () => {
  const calls = await submit({ generationError: true });
  assert.equal(calls.failed[0].title, '상담 생성이 잠시 중단됐어요');
});
