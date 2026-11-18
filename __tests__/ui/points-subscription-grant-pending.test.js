const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.resolve(__dirname, '../../app/points/PointsClient.tsx'), 'utf8');
const ast = ts.createSourceFile('PointsClient.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ['assertSubscriptionGrantReady', 'getPaymentErrorStatus', 'isUncertainSubscriptionConfirmError', 'isUncertainPaymentConfirmError'];
const code = ast.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text))
  .map(node => node.getText(ast)).join('\n');
const context = vm.createContext({});
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
