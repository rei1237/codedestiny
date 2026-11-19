import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import nextConfig from '../../next.config.mjs';

const require = createRequire(import.meta.url);
const { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } = require('next/constants');
const { createValidFileMatcher } = require('next/dist/server/lib/find-page-file');
const app = fileURLToPath(new URL('../../app/', import.meta.url));
const conventional = new URL('../../app/dev/guided-flow/page.tsx', import.meta.url);
const devOnly = new URL('../../app/dev/guided-flow/page.dev.tsx', import.meta.url);
const page = fileURLToPath(devOnly);
const defaults = ['tsx', 'ts', 'jsx', 'js'];

test('Next does not discover the dev-only page in the production router or static export', () => {
  assert.equal(existsSync(conventional), false);
  assert.equal(existsSync(devOnly), true);
  const extensions = nextConfig(PHASE_PRODUCTION_BUILD).pageExtensions ?? defaults;
  assert.deepEqual(extensions, defaults);
  const matcher = createValidFileMatcher(extensions, app);
  assert.equal(matcher.isAppRouterPage(page), false);
  assert.equal(matcher.isAppRouterPage(fileURLToPath(new URL('../../app/page.js', import.meta.url))), true);
});

test('Next dev discovers the same route and the page keeps its noindex metadata and demo', () => {
  const extensions = nextConfig(PHASE_DEVELOPMENT_SERVER).pageExtensions;
  assert.deepEqual(extensions, ['dev.tsx', ...defaults]);
  const matcher = createValidFileMatcher(extensions, app);
  assert.equal(matcher.isAppRouterPage(page), true);
  const code = ts.transpileModule(readFileSync(devOnly, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const output = {};
  function load(name) {
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }) };
    if (name === './GuidedFlowDemo') return { default: function GuidedFlowDemo() {} };
    throw new Error('Unexpected import: ' + name);
  }
  new Function('require', 'exports', code)(load, output);
  assert.deepEqual(output.metadata.robots, { index: false, follow: false });
  assert.equal(output.default().type, 'main');
});
