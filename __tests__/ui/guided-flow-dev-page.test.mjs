import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../../app/dev/guided-flow/page.tsx', import.meta.url), 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function loadPage(nodeEnv) {
  const output = {};
  const missing = new Error('next-not-found');
  let misses = 0;
  function require(name) {
    if (name === 'next/navigation') return { notFound() { misses += 1; throw missing; } };
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }) };
    if (name === './GuidedFlowDemo') return { default: function GuidedFlowDemo() {} };
    throw new Error('Unexpected import: ' + name);
  }
  new Function('require', 'exports', 'process', code)(require, output, { env: { NODE_ENV: nodeEnv } });
  return { output, missing, getMisses: () => misses };
}

test('production leaves a single automatic noindex to Next and never renders the demo', () => {
  const { output, missing, getMisses } = loadPage('production');
  assert.strictEqual(output.metadata.robots, null, 'explicit null suppresses inherited robots; undefined does not');
  assert.throws(() => output.default(), (error) => error === missing);
  assert.equal(getMisses(), 1);
});

test('development keeps the demo reachable and explicitly non-indexable', () => {
  const { output, getMisses } = loadPage('development');
  assert.deepEqual(output.metadata.robots, { index: false, follow: false });
  assert.equal(output.default().type, 'main');
  assert.equal(getMisses(), 0);
});
