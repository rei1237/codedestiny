const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.resolve(__dirname, '../../app/points/PointsClient.tsx'), 'utf8');
const ast = ts.createSourceFile('PointsClient.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ['assertSubscriptionGrantReady', 'getPaymentErrorStatus', 'isUncertainSubscriptionConfirmError', 'isUncertainPaymentConfirmError',
  'isPgNotPaidConfirmError', 'nextSubscriptionAutoRecheckDelay', 'readPendingSubscriptionPass'];
const constNames = ['PENDING_SUBSCRIPTION_NOT_PAID_GRACE_MS', 'SUBSCRIPTION_AUTO_RECHECK_DELAYS_MS', 'SUBSCRIPTION_AUTO_RECHECK_BUDGET_MS',
  'PENDING_SUBSCRIPTION_PASS_TTL_MS', 'PENDING_SUBSCRIPTION_PASS_RETENTION_MS'];
const code = ast.statements.filter(node => (ts.isFunctionDeclaration(node) && names.includes(node.name?.text))
  || (ts.isVariableStatement(node) && node.declarationList.declarations.some(d => constNames.includes(d.name.getText(ast)))))
  .map(node => node.getText(ast)).join('\n');
const storage = new Map();
const localStorage = { getItem: k => (storage.has(k) ? storage.get(k) : null), setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k) };
const context = vm.createContext({ window: {}, localStorage });
vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);

for (const response of [{ code: 'GRANT_PENDING' }, { activationPending: true }, { code: 'GRANT_PENDING', subscription: { active: true } }]) {
  test(`HTTP 200 with ${JSON.stringify(response)} preserves the pending confirmation path`, () => {
    assert.throws(() => context.assertSubscriptionGrantReady(response), error => {
      assert.equal(error.code, 'GRANT_PENDING');
      assert.equal(context.isUncertainSubscriptionConfirmError(error), true);
      return true;
    });
  });
}
test('completed and idempotent confirmations proceed normally', () => {
  context.assertSubscriptionGrantReady({ subscription: { active: true } });
  context.assertSubscriptionGrantReady({ idempotent: true, activationPending: false });
});
test('grant check precedes access refresh and consumes no return ticket', () => {
  const helper = source.slice(source.indexOf('const confirmSubscriptionWithServer ='), source.indexOf('const markSubscriptionPaymentUnknown ='));
  assert.ok(helper.indexOf('assertSubscriptionGrantReady(data)') < helper.indexOf('refreshUserAccessAfterPayment()'));
  assert.ok(helper.indexOf('assertSubscriptionGrantReady(data)') < helper.indexOf('await scheduleCheckoutReturn('));
  const pending = source.slice(source.indexOf('const markSubscriptionPaymentUnknown ='), source.indexOf('const checkPendingSubscriptionPayment ='));
  assert.match(pending, /setSubscription\(backup\)/);
  assert.doesNotMatch(pending, /clearPendingSubscriptionOrder|scheduleCheckoutReturn/);
});
// 🔴 2026-11-18 결함 E: '결제 상태 다시 확인'(지급 대기 → 지급 완료) 경로만 이용권 캐시를 쓰지 않아,
// 지급이 끝나도 셸·독립 정적이 읽는 구독 스냅샷·레거시 캐시가 '미보유'로 남았다. 다른 확정 경로와 같이 쓴다.
test('pending grant recheck persists the granted pass like the other confirm paths', () => {
  const recheck = source.slice(
    source.indexOf('const checkPendingSubscriptionPayment ='),
    source.indexOf('subscriptionStatusCheckHandlerRef.current = checkPendingSubscriptionPayment;'),
  );
  const confirmAt = recheck.indexOf('await confirmSubscriptionWithServer(pending.payload)');
  const persistAt = recheck.indexOf('persistSubscriptionCache(');
  assert.ok(confirmAt > 0, 'recheck must still confirm with the server first');
  assert.ok(persistAt > confirmAt, 'granted pass must be persisted after the server confirm');
  assert.ok(persistAt < recheck.indexOf('await syncSubscriptionAppliedStage('), 'persist before announcing the pass as applied');
  assert.match(recheck.slice(confirmAt, persistAt), /setSubscription\(\(prev\) => mergeSubscriptionState\(prev, /);
  assert.match(recheck.slice(recheck.lastIndexOf('}, [')), /\bpersistSubscriptionCache,/);
});
// 🔴 2026-11-26 '이용권 구매 후 결제 조회 멈춤': 결제 직후 PG_PAYMENT_NOT_PAID(409 retryable)를 실패로 보고
// 대기 기록을 버렸다. 결제 직후 유예 안에서는 '확인 중'이고, 유예를 넘기면 종전처럼 실패다.
test('PG_PAYMENT_NOT_PAID right after payment stays pending; after the grace it is a failure', () => {
  const notPaid = Object.assign(new Error('not paid'), { status: 409, code: 'PG_PAYMENT_NOT_PAID', retryable: true });
  const now = 1_800_000_000_000;
  assert.equal(context.isUncertainSubscriptionConfirmError(notPaid, now - 5_000, now), true);
  assert.equal(context.isUncertainSubscriptionConfirmError(notPaid, now - 11 * 60_000, now), false);
  assert.equal(context.isUncertainSubscriptionConfirmError(notPaid, undefined, now), false);
  assert.equal(context.isUncertainSubscriptionConfirmError(Object.assign(new Error('x'), { status: 409, code: 'PAYMENT_CANCELLED' }), now - 5_000, now), false);
});
test('auto recheck backs off 3→5→10→20s and stops within about 2 minutes', () => {
  const delays = [];
  let elapsed = 0;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const delay = context.nextSubscriptionAutoRecheckDelay(attempt, elapsed);
    if (delay === null) break;
    delays.push(delay);
    elapsed += delay;
  }
  assert.deepEqual(delays.slice(0, 4), [3000, 5000, 10000, 20000]);
  assert.ok(elapsed <= 120_000 && elapsed >= 100_000, `budget ends near 2 minutes (got ${elapsed})`);
  const pending = source.slice(source.indexOf('const markSubscriptionPaymentUnknown ='), source.indexOf('const checkPendingSubscriptionPayment ='));
  assert.match(pending, /nextSubscriptionAutoRecheckDelay\(/);
  assert.match(pending, /window\.setTimeout\([\s\S]*subscriptionStatusCheckHandlerRef\.current\?\.\(\)/);
  assert.match(pending, /고객센터/, 'after the budget the manual button carries a contact hint');
});
test('pending record survives 24h for the boot retry while the optimistic display keeps 15 minutes', () => {
  const key = 'fortune_pending_subscription_pass';
  storage.set(key, JSON.stringify({ merchantUid: 'm1', startedAt: Date.now() - 30 * 60_000 }));
  assert.equal(context.readPendingSubscriptionPass(), null, 'display window is still 15 minutes');
  assert.ok(storage.has(key), 'the record is kept for the boot retry');
  assert.equal(context.readPendingSubscriptionPass(24 * 60 * 60_000)?.merchantUid, 'm1');
  storage.set(key, JSON.stringify({ merchantUid: 'm1', startedAt: Date.now() - 25 * 60 * 60_000 }));
  assert.equal(context.readPendingSubscriptionPass(24 * 60 * 60_000), null);
  assert.ok(!storage.has(key), 'older than 24h is removed');
  const boot = source.slice(source.indexOf('부팅 시 미확정 이용권 주문 재확인'), source.indexOf('checkPendingSubscriptionPayment({ silentFailure: true })'));
  assert.match(boot, /readPendingSubscriptionPass\(PENDING_SUBSCRIPTION_PASS_RETENTION_MS\)/);
  assert.match(boot, /startedAt: pendingPass\.startedAt/);
  // 부팅 재확인의 유예 안 미결제는 조용히 기록을 남긴다(버리지 않는다).
  const recheck = source.slice(source.indexOf('const checkPendingSubscriptionPayment ='), source.indexOf('subscriptionStatusCheckHandlerRef.current = checkPendingSubscriptionPayment;'));
  const silentBranch = recheck.slice(recheck.indexOf('options?.silentFailure && isPgNotPaidConfirmError(error)'), recheck.indexOf('} else if (uncertain)'));
  assert.ok(silentBranch.length > 0);
  assert.doesNotMatch(silentBranch, /discardPendingSubscriptionPass|clearPendingSubscriptionOrder/);
});
