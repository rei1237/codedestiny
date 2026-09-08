import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createMockApiServer } from '../../scripts/mock-dev-api.mjs';
import { mockDevSettings } from '../../scripts/lib/mock-dev-settings.mjs';
import { staticPolicyRewrites } from '../../lib/navigation/static-policy-routes.mjs';

test('workspace ports are deterministic, isolated, and explicit overrides validated', () => {
  const one = mockDevSettings('/workspace/one', {});
  assert.deepEqual(one, mockDevSettings('/workspace/one', {}));
  assert.notEqual(one.port, mockDevSettings('/workspace/two', {}).port);
  assert.throws(() => mockDevSettings('/workspace', { MOCK_DEV_PORT: 'bad' }));
  assert.equal(mockDevSettings('/workspace', { MOCK_DEV_PORT: '4567' }).port, 4567);
  assert.equal(mockDevSettings('/workspace', { MONGODB_URI: 'secret' }).env.MONGODB_URI, undefined);
});

test('fixtures, error, retry, delay and process-local profile state', async () => {
  const server = createMockApiServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = path => fetch(base + path, { method: 'POST' });
  try {
    for (const path of ['/api/fortune/saju/ai-prompt', '/api/ziwei-ai/start', '/api/tarot/crystal-soul']) {
      const first = await (await post(path)).json();
      assert.equal(first.mock, true);
      assert.deepEqual(first, await (await post(path)).json());
      assert.equal((await post(path + '?mockScenario=error')).status, 503);
      assert.equal((await post(path)).status, 200);
      const start = performance.now();
      assert.equal((await post(path + '?mockScenario=delay')).status, 200);
      assert.ok(performance.now() - start >= 250);
    }
    assert.equal((await fetch(base + '/api/auth/me')).status, 401);
    assert.equal((await post('/api/auth/login')).status, 200);
    assert.equal((await fetch(base + '/api/auth/me')).status, 200);
    await fetch(base + '/api/mock/profiles', { method: 'POST', body: JSON.stringify({ name: 'fixture' }) });
    assert.equal((await (await fetch(base + '/api/mock/profiles')).json()).profiles[0].name, 'fixture');
    assert.equal((await post('/api/billing/checkout')).status, 402);
    assert.equal((await post('/api/unknown')).status, 501);
    assert.equal((await fetch(base + '/api/mock/profiles', { method: 'POST', body: '{' })).status, 400);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});

test('Node HTTP, TLS, fetch and inherited child process transports reject external requests', () => {
  const guard = resolve('scripts/lib/mock-network-guard.cjs').replaceAll('\\', '/');
  const code = `
    const assert = require('node:assert/strict');
    assert.throws(() => require('node:net').connect(443, '203.0.113.1'), /MOCK_NETWORK_BLOCKED/);
    assert.throws(() => require('node:http').get('http://example.invalid'), /MOCK_NETWORK_BLOCKED/);
    assert.throws(() => require('node:tls').connect({host:'example.invalid',port:443}), /MOCK_NETWORK_BLOCKED/);
    assert.throws(() => require('node:dns').resolveSrv('_mongodb._tcp.example.invalid', () => {}), /MOCK_NETWORK_BLOCKED/);
    assert.throws(() => require('node:dgram').createSocket('udp4'), /MOCK_NETWORK_BLOCKED/);
    assert.rejects(fetch('https://example.invalid'), /MOCK_NETWORK_BLOCKED/).then(() => {
      const child = require('node:child_process').spawnSync(process.execPath, ['-e',
        "require('node:assert/strict').throws(() => require('node:net').connect(443, '203.0.113.1'), /MOCK_NETWORK_BLOCKED/)"
      ], { encoding: 'utf8' });
      assert.equal(child.status, 0, child.stderr);
    });`;
  const result = spawnSync(process.execPath, ['-e', code], {
    encoding: 'utf8', env: { ...process.env, NODE_OPTIONS: `--require="${guard}"` }, timeout: 10000,
  });
  assert.equal(result.status, 0, result.stderr);
});

test('mock Next rewrites intercept app API routes and CSP blocks remote browser fallbacks', async () => {
  const previous = { mock: process.env.CD_MOCK_DEV, port: process.env.LOCAL_DEV_AUTH_API_PORT };
  process.env.CD_MOCK_DEV = '1';
  process.env.LOCAL_DEV_AUTH_API_PORT = '18790';
  try {
    const { default: createConfig } = await import('../../next.config.mjs');
    const config = createConfig('phase-development-server');
    assert.deepEqual((await config.rewrites()).beforeFiles, [
      ...staticPolicyRewrites(),
      { source: '/api/:path*', destination: 'http://127.0.0.1:18790/api/:path*' },
    ]);
    const csp = (await config.headers())[0].headers[0].value;
    assert.match(csp, /connect-src 'self';/);
    assert.match(csp, /script-src 'self'/);
    assert.equal(createConfig('phase-production-build').headers, undefined);
  } finally {
    if (previous.mock === undefined) delete process.env.CD_MOCK_DEV; else process.env.CD_MOCK_DEV = previous.mock;
    if (previous.port === undefined) delete process.env.LOCAL_DEV_AUTH_API_PORT; else process.env.LOCAL_DEV_AUTH_API_PORT = previous.port;
  }
});
