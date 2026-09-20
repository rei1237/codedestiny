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
