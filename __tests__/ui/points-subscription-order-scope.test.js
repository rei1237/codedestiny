const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.resolve(__dirname, '../../app/points/PointsClient.tsx'), 'utf8');
const ast = ts.createSourceFile('PointsClient.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const names = ['readPendingSubscriptionOrder', 'clearPendingSubscriptionOrder'];
const code = ast.statements.filter(node => ts.isFunctionDeclaration(node) && names.includes(node.name?.text))
  .map(node => node.getText(ast)).join('\n');

function boot() {
  const values = new Map();
  const context = vm.createContext({ window: {}, localStorage: {
    getItem: key => values.get(key) ?? null,
    removeItem: key => values.delete(key),
  } });
  vm.runInContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return { values, context };
}

test('returning order A never borrows tier or payment method from pending order B', () => {
  const { values, context } = boot();
  values.set('fortune_pending_subscription_order', JSON.stringify({ merchantUid: 'order-b', tier: 'family', paymentMethod: 'kakaopay' }));
  assert.equal(context.readPendingSubscriptionOrder('order-a'), null);
  assert.equal(context.readPendingSubscriptionOrder('order-b').tier, 'family');
  assert.equal(context.readPendingSubscriptionOrder().merchantUid, 'order-b');
});

test('completion of order A preserves a newer pending order B', () => {
  const { values, context } = boot();
  values.set('fortune_pending_subscription_order', JSON.stringify({ merchantUid: 'order-b', tier: 'family' }));
  values.set('fortune_pending_subscription_pass', JSON.stringify({ merchantUid: 'order-b' }));
  context.clearPendingSubscriptionOrder('order-a');
  assert.equal(values.size, 2);
  context.clearPendingSubscriptionOrder('order-b');
  assert.equal(values.size, 0);
});

test('redirect reads and completion are scoped to the returned order', () => {
  assert.match(source, /readPendingSubscriptionOrder\(merchantUidFromQuery\)/);
  const redirect = source.slice(source.indexOf('const redirectMarked ='), source.indexOf('const hasRedirectMarker ='));
  assert.match(redirect, /clearPendingSubscriptionOrder\(merchantUid\)/);
});
