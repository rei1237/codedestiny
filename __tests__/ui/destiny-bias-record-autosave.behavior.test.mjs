import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url)).replaceAll('\\', '/').replace(/\/$/, '');
const require = createRequire(`${root}/package.json`);
require(`${root}/scripts/lib/mock-network-guard.cjs`);
const ts = require('typescript');
const { transform, build } = require('esbuild');
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const { JSDOM } = require('jsdom');

// Select the production hook declarations and effect bodies through the TS AST.
// React state/effects run in a real DOM root; only auth/HTTP/analytics are fixtures.
// esbuild erases TS types: this behavior suite does not replace the project's typecheck.
const clientPath = `${root}/app/saju/destiny-bias/DestinyBiasClient.tsx`;
const source = await readFile(clientPath, 'utf8');
const ast = ts.createSourceFile(clientPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const component = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'DestinyBiasClient');
assert.ok(component?.body, 'production DestinyBiasClient body must exist');
const bindings = new Set([
  'outcome', 'loggedIn', 'shareBusy', 'shareStatus', 'savedToCollection', 'archiveId',
  'savingRecord', 'saveError', 'authRevision', 'activeRecordRef', 'archiveMountedRef',
  'recordRequestsRef', 'completedRecordsRef', 'clearRecordState', 'publishOutcome',
  'saveReading', 'handleSaveCollection',
]);
const found = new Set();
function bindingNames(name) {
  if (ts.isIdentifier(name)) return [name.text];
  return name.elements.flatMap(element => ts.isBindingElement(element) ? bindingNames(element.name) : []);
}
const statements = component.body.statements.filter(node => {
  if (ts.isVariableStatement(node)) {
    const names = node.declarationList.declarations.flatMap(declaration => bindingNames(declaration.name));
    const selected = names.filter(name => bindings.has(name));
    selected.forEach(name => found.add(name));
    return selected.length > 0;
  }
  if (!ts.isExpressionStatement(node) || !ts.isCallExpression(node.expression) || node.expression.expression.getText(ast) !== 'useEffect') return false;
  const body = node.getText(ast);
  return body.includes('archiveMountedRef.current = true') || body.includes('void saveReading(outcome)');
});
for (const name of bindings) assert.ok(found.has(name), `production archive hook ${name} must be selected`);
assert.equal(statements.filter(node => ts.isExpressionStatement(node)).length, 2, 'mount/auth and automatic save effects must both execute');
const helpers = ['readLocalToken', 'isLoggedInNow', 'readArchiveOwner'].map(name => {
  const node = ast.statements.find(item => ts.isFunctionDeclaration(item) && item.name?.text === name);
  assert.ok(node, `production auth helper ${name} must exist`);
  return node.getText(ast);
}).join('\n');
const authClientSource = await readFile(`${root}/app/_lib/auth-client.ts`, 'utf8');
const invalidationConstant = authClientSource.match(/export (const AUTH_SESSION_INVALIDATED_EVENT = [^;]+;)/)?.[1];
assert.ok(invalidationConstant, 'canonical invalidation event must exist');
const harnessSource = `
${invalidationConstant}
const readSanitizedAuthUser = () => globalThis.__biasAuthUser;
const authFetch = (...args) => globalThis.__biasAuthFetch(...args);
const trackClick = () => {};
${helpers}
export function ArchiveHookHarness() {
  const { useState, useRef, useCallback, useEffect } = globalThis.__biasReact;
  ${statements.map(node => node.getText(ast)).join('\n')}
  globalThis.__biasControls = {
    publishOutcome, saveReading, handleSaveCollection, clearRecordState, setLoggedIn,
    recordRequestsRef,
    state: { outcome, loggedIn, shareBusy, shareStatus, savedToCollection, archiveId, savingRecord, saveError },
  };
  return null;
}`;
const compiled = await transform(harnessSource, { loader: 'tsx', format: 'esm', target: 'es2022' });
const { ArchiveHookHarness } = await import(`data:text/javascript;base64,${Buffer.from(compiled.code).toString('base64')}`);

// Build the real birthday-stripping bridge for a synthetic birth input. This is
// deterministic local calculation only; no LLM, payment, API or DB dependency runs.
const bundledBridge = await build({
  entryPoints: [`${root}/app/saju/destiny-bias/engine/chemiReportBridge.ts`],
  bundle: true, format: 'esm', platform: 'node', write: false,
  absWorkingDir: root, alias: { '@': root },
});
const bridge = await import(`data:text/javascript;base64,${Buffer.from(bundledBridge.outputFiles[0].text).toString('base64')}`);
const { ROSTER_PARTNERS } = await import('../../lib/idol-chemi/index.js');
const syntheticBirth = '1994-08-17';
const partner = ROSTER_PARTNERS[0];
assert.ok(partner, 'public roster fixture must exist');
const report = bridge.buildChemiReport({
  user: { birthDate: syntheticBirth, calendarType: 'solar' }, partner,
  referenceDate: '2026-10-05', themeKey: 'moonlight_neon', themeLabel: 'Fixture theme',
});
function outcome(id = 'fixture-result-a') {
  return { report, result: report.result, copy: report.copy, partner,
    recordRequestId: id, recordThemeKey: 'moonlight_neon' };
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function response(id, status = 200) {
  return new Response(JSON.stringify(status === 200 ? { ok: true, item: { id } } : { ok: false }), {
    status, headers: { 'Content-Type': 'application/json' },
  });
}
async function fixture(run, owner = 'fixture-owner-a') {
  const previous = new Map();
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'https://fixture.invalid/' });
  const globals = {
    window: dom.window, document: dom.window.document, localStorage: dom.window.localStorage,
    HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true,
    __biasReact: React, __biasAuthUser: owner ? { id: owner } : {},
  };
  for (const [key, value] of Object.entries(globals)) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  for (const key of ['__biasAuthFetch', '__biasControls']) previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  localStorage.setItem('fortune_auth_token', 'synthetic-session-token');
  const calls = [];
  globalThis.__biasAuthFetch = (path, init) => {
    assert.equal(path, '/api/destiny-bias/cards');
    assert.equal(init.method, 'POST');
    const pending = deferred();
    calls.push({ ...pending, body: JSON.parse(init.body) });
    return pending.promise;
  };
  const rootNode = createRoot(document.getElementById('root'));
  await act(async () => rootNode.render(React.createElement(ArchiveHookHarness)));
  const h = {
    calls,
    get api() { return globalThis.__biasControls; },
    async publish(next = outcome()) {
      await act(async () => { h.api.setLoggedIn(true); h.api.publishOutcome(next); });
    },
    async reply(index, id, status = 200) {
      await act(async () => { calls[index].resolve(response(id, status)); });
    },
    async account(nextOwner, event = 'cd:auth-changed') {
      await act(async () => {
        globalThis.__biasAuthUser = nextOwner ? { id: nextOwner } : {};
        if (nextOwner) localStorage.setItem('fortune_auth_token', 'synthetic-session-token');
        else localStorage.removeItem('fortune_auth_token');
        window.dispatchEvent(new window.CustomEvent(event));
      });
    },
  };
  try { await run(h); }
  finally {
    await act(async () => rootNode.unmount());
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
}

await test('automatic and manual collection saves share the same in-flight promise and completed cache', () => fixture(async h => {
  const next = outcome();
  await h.publish(next);
  assert.equal(h.calls.length, 1);
  assert.equal(h.api.state.savingRecord, true);
  const job = h.api.recordRequestsRef.current.get(`fixture-owner-a:${next.recordRequestId}`);
  assert.equal(h.api.saveReading(next), job);
  let manual;
  await act(async () => { manual = h.api.handleSaveCollection(); });
  assert.equal(h.calls.length, 1);
  await h.reply(0, 'stored-a');
  await manual;
  assert.equal(h.api.state.archiveId, 'stored-a');
  assert.equal(h.api.state.savedToCollection, true);
  assert.equal(h.api.state.savingRecord, false);
  let cached;
  await act(async () => { cached = await h.api.saveReading(next); });
  assert.equal(cached, 'stored-a');
  assert.equal(h.calls.length, 1);
}));

await test('a failed save ends loading and retries the exact same result id and payload', () => fixture(async h => {
  await h.publish();
  await h.reply(0, '', 503);
  assert.equal(h.api.state.saveError, true);
  assert.equal(h.api.state.savingRecord, false);
  let retry;
  await act(async () => { retry = h.api.handleSaveCollection(); });
  assert.equal(h.calls.length, 2);
  assert.deepEqual(h.calls[1].body, h.calls[0].body);
  await h.reply(1, 'retry-stored');
  await retry;
  assert.equal(h.api.state.archiveId, 'retry-stored');
  assert.equal(h.api.state.saveError, false);
}));

await test('an earlier result response cannot change the newly generated result state', () => fixture(async h => {
  await h.publish(outcome('fixture-result-a'));
  await h.publish(outcome('fixture-result-b'));
  assert.equal(h.calls.length, 2);
  await h.reply(0, 'stale-result-a');
  assert.equal(h.api.state.archiveId, '');
  assert.equal(h.api.state.savingRecord, true);
  assert.equal(h.api.state.savedToCollection, false);
  await h.reply(1, 'current-result-b');
  assert.equal(h.api.state.archiveId, 'current-result-b');
}));

await test('an account switch isolates in-flight promises and rejects the previous owner response', () => fixture(async h => {
  await h.publish();
  await h.account('fixture-owner-b');
  assert.equal(h.calls.length, 2);
  assert.equal(h.api.recordRequestsRef.current.size, 2);
  await h.reply(0, 'owner-a-private-id');
  assert.equal(h.api.state.archiveId, '');
  assert.equal(h.api.state.savingRecord, true);
  await h.reply(1, 'owner-b-id');
  assert.equal(h.api.state.archiveId, 'owner-b-id');
}));

await test('a token without a verified owner sends no HTTP request and shows a save error', () => fixture(async h => {
  await h.publish();
  assert.equal(h.calls.length, 0);
  assert.equal(h.api.state.saveError, true);
  assert.equal(h.api.state.savingRecord, false);
  assert.equal(h.api.state.savedToCollection, false);
}, ''));

await test('401 for the active account ends loading and preserves the error and login-required state', () => fixture(async h => {
  await h.publish();
  await h.reply(0, '', 401);
  assert.equal(h.api.state.loggedIn, false);
  assert.equal(h.api.state.saveError, true);
  assert.equal(h.api.state.savingRecord, false);
  assert.equal(h.api.state.savedToCollection, false);
  assert.equal(h.calls.length, 1);
}));

await test('auth invalidation before a late 401 resets loading without resurrecting stale error state', () => fixture(async h => {
  await h.publish();
  await h.account('', 'cd:auth-session-invalidated');
  await h.reply(0, '', 401);
  assert.equal(h.api.state.loggedIn, false);
  assert.equal(h.api.state.savingRecord, false);
  assert.equal(h.api.state.saveError, false);
  assert.equal(h.api.state.archiveId, '');
  assert.equal(h.calls.length, 1);
}));

await test('canonical stores the complete real Chemi report and all tabs without either raw birthday', () => fixture(async h => {
  await h.publish();
  const body = h.calls[0].body;
  assert.equal(body.recordRequestId, 'fixture-result-a');
  assert.equal(body.canonical.version, 'destiny-bias-record-v1');
  assert.equal(body.canonical.themeKey, 'moonlight_neon');
  assert.deepEqual(body.canonical.viewModel, JSON.parse(JSON.stringify(report.vm)));
  assert.deepEqual(body.canonical.chemiReport, JSON.parse(JSON.stringify(report)));
  assert.ok(body.canonical.chemiReport.result.pillars.user.day.ganji);
  assert.ok(body.canonical.chemiReport.result.signals.length);
  assert.ok(body.canonical.chemiReport.subScores.length);
  assert.ok(body.canonical.viewModel.detailedTabs.length);
  assert.ok(body.reportText.includes(report.copy.caution.evidenceKo));
  const serialized = JSON.stringify(body);
  assert.equal(serialized.includes(syntheticBirth), false, 'synthetic user DOB must be omitted');
  assert.equal(serialized.includes(partner.birthDate), false, 'raw partner DOB must be omitted');
  assert.equal(body.canonical.viewModel.userBirthDate, '');
  assert.equal(body.canonical.viewModel.biasBirthDate, '');
  assert.equal(body.canonical.viewModel.cardSvg, '');
  assert.equal('birthDate' in body.canonical.partner, false);
  await h.reply(0, 'canonical-stored');
}));
