/** @jest-environment node */
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { JSDOM } from 'jsdom';
import { jest } from '@jest/globals';

const source = ts.createSourceFile('billing-client.ts', fs.readFileSync('app/_lib/billing-client.ts', 'utf8'), 99, true);
const code = ['prefetchPaidServiceRuntimeGate', 'loadPaidServiceRuntimeGate'].map(name => {
  const fn = source.statements.find(node => node.name?.text === name);
  return ts.transpileModule(fn.getText(source).replace('export ', ''), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}).join('\n');

test('entry prefetch never executes the runtime; demand still waits for the real gate', async () => {
  const dom = new JSDOM('<head></head>', { url: 'https://fixture.test/' });
  let gate = null;
  const bridge = jest.fn(), fetch = jest.fn();
  const scope = vm.createContext({ window: dom.window, document: dom.window.document, fetch,
    getPaidServiceRuntimeGate: () => gate, installReactPaymentChoiceBridge: bridge,
    PAID_SERVICE_RUNTIME_SRC: '/js/destiny-profile.js?v=fixture', paidServiceRuntimePromise: null });
  vm.runInContext(code, scope);
  scope.prefetchPaidServiceRuntimeGate();
  scope.prefetchPaidServiceRuntimeGate();
  const link = dom.window.document.querySelector('link');
  expect(link.rel).toBe('prefetch'); expect(link.as).toBe('script');
  expect(dom.window.document.querySelectorAll('link')).toHaveLength(1);
  expect(dom.window.document.querySelector('script')).toBeNull();
  expect(fetch).not.toHaveBeenCalled(); expect(bridge).not.toHaveBeenCalled();
  const pending = scope.loadPaidServiceRuntimeGate();
  const same = scope.loadPaidServiceRuntimeGate();
  expect(same).toBe(pending);
  const script = dom.window.document.querySelector('script');
  expect(script.src).toBe(link.href);
  expect(dom.window.document.querySelectorAll('script')).toHaveLength(1);
  gate = jest.fn(); script.dispatchEvent(new dom.window.Event('load'));
  await expect(pending).resolves.toBe(gate);
  expect(gate).not.toHaveBeenCalled(); // Loading is never a purchase or an unlock.
  dom.window.close();
});

test('prefetch is safe on the server and does nothing when the gate is already ready', () => {
  const server = vm.createContext({ getPaidServiceRuntimeGate: () => null });
  vm.runInContext(code, server);
  expect(() => server.prefetchPaidServiceRuntimeGate()).not.toThrow();
  const dom = new JSDOM('<head></head>');
  const ready = vm.createContext({ document: dom.window.document, getPaidServiceRuntimeGate: () => () => {} });
  vm.runInContext(code, ready); ready.prefetchPaidServiceRuntimeGate();
  expect(dom.window.document.head.children).toHaveLength(0); dom.window.close();
});
