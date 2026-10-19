const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('app/karma-destiny-ai/KarmaDestinyAiClient.tsx', 'utf8');
const ast = ts.createSourceFile('client.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let handler;
function visit(node) { if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'updateRelationshipContext') handler = node.initializer; ts.forEachChild(node, visit); }
visit(ast);
test('editing the relationship preserves birth fields and resets the paid attempt', () => {
  let state = { birthDate: '1993-07-21', relationshipContext: { scene: 'old' } };
  let resets = 0;
  const context = vm.createContext({ setForm: fn => { state = fn(state); }, resetAttempt: () => { resets++; } });
  vm.runInContext(ts.transpileModule('var run = ' + handler.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, context);
  context.run({ person: 'A', scene: 'changed' });
  assert.equal(state.birthDate, '1993-07-21');
  assert.equal(state.relationshipContext.scene, 'changed');
  assert.equal(resets, 1);
  context.run({});
  assert.equal(resets, 2);
});
