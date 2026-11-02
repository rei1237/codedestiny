import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';
import { installMockBrowser } from '../../tools/oracle/next-delivery/browser-init.mjs';

function guarded(source) {
  const result = spawnSync(process.execPath, ['--require', './tools/oracle/next-delivery/guard.cjs', '-e', source], {
    encoding: 'utf8', windowsHide: true,
    env: Object.fromEntries(Object.entries(process.env).filter(([key]) => /^(PATH|SYSTEMROOT|WINDIR|COMSPEC|TEMP|TMP|USERPROFILE|APPDATA|LOCALAPPDATA|PATHEXT)$/i.test(key))),
  });
  assert.equal(result.status, 0, result.stderr);
}

test('Next mock loader refuses Swiss and real DB modules before evaluation', () => {
  guarded(`const assert = require('node:assert/strict');
    for (const name of ['sweph-wasm', 'swisseph', 'jyotish', './worker/lib/swiss-ephemeris.js', './worker/lib/db.js', './worker/lib/models.js']) {
      assert.throws(() => require(name), /AUDIT_FORBIDDEN_MODULE/);
    }`);
});

test('Next env loader never reads local environment files and preserves module interop', () => {
  guarded(`const assert = require('node:assert/strict');
    const fs = require('node:fs'), path = require('node:path');
    for (const name of ['readFileSync', 'statSync']) {
      const original = fs[name];
      fs[name] = (...args) => {
        assert.ok(!/^\\.env(?:\\.|$)/.test(path.basename(String(args[0]))), 'Environment file touched');
        return original(...args);
      };
    }
    const env = require('@next/env');
    assert.equal(env.__esModule, true);
    assert.deepEqual(env.loadEnvConfig(process.cwd(), true).loadedEnvFiles, []);`);
});

test('actual Next custom-server config loader applies fixture config and blocks outbound HTTP', () => {
  guarded(`const assert = require('node:assert/strict');
    const { createRequire } = require('node:module');
    const nextRequire = createRequire(require.resolve('next/dist/server/next.js'));
    const config = nextRequire('./config');
    assert.equal(typeof config.default, 'function');
    globalThis.__auditConfigureNext = value => ({ ...value, distDir: 'audit-fixture-only' });
    (async () => {
      const loaded = await config.default('phase-development-server', process.cwd(), { customConfig: {} });
      assert.equal(loaded.distDir, 'audit-fixture-only');
      await assert.rejects(fetch('https://example.invalid/'), /MOCK_NETWORK_BLOCKED/);
    })().catch(error => { console.error(error); process.exitCode = 1; });`);
});

function browserBootstrap(seedFirst) {
  const values = new Map(), callbacks = [], calls = [];
  const receipt = JSON.stringify({ descriptor: { kind: 'ziwei-ai-consultation' }, proof: { requestId: 'synthetic' } });
  const seed = () => values.set('__audit_mock_paid_return', receipt);
  if (seedFirst) seed();
  const storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  const window = { __cdCheckoutEntry: { runPaidResume: async (...args) => { calls.push(args); return true; } } };
  vm.runInNewContext(`(${installMockBrowser.toString()})()`, { window, localStorage: storage, sessionStorage: storage,
    crypto: { randomUUID: () => 'synthetic-document' }, document: { cookie: '' }, location: { search: '?auditReturn=1' },
    URLSearchParams, performance: { now: () => 100 }, setInterval: callback => { callbacks.push(callback); return 1; }, clearInterval() {} });
  return { seed, callbacks, calls, window, values };
}

test('mock payment return works in both page/context init-script orders', async () => {
  for (const seedFirst of [false, true]) {
    const fixture = browserBootstrap(seedFirst);
    if (!seedFirst) fixture.seed();
    assert.equal(fixture.callbacks.length, 1);
    fixture.callbacks[0]();
    await Promise.resolve();
    assert.equal(fixture.calls.length, 1);
    assert.equal(fixture.window.__audit.resumed, true);
    assert.equal(fixture.values.has('__audit_mock_paid_return'), false);
  }
});

test('missing mock receipt never dispatches a new payment or calculation', () => {
  const fixture = browserBootstrap(false);
  fixture.callbacks[0]();
  assert.equal(fixture.calls.length, 0);
  assert.equal(fixture.window.__audit.gateCalls, 0);
});
