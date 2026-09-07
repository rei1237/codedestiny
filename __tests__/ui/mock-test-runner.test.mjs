import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { mockTestInvocation } from '../../scripts/run-mock-tests.mjs';
import { NODE_TEST_PATTERNS, JEST_BASE_ARGS } from '../../scripts/lib/mock-test-config.mjs';

test('both runners use canonical targets and preserve test selection arguments', () => {
  assert.deepEqual(mockTestInvocation('node', ['--test-name-pattern=fixture'], {}).args,
    ['--test', ...NODE_TEST_PATTERNS, '--test-name-pattern=fixture']);
  assert.deepEqual(mockTestInvocation('jest', ['--listTests'], {}).args.slice(1), [...JEST_BASE_ARGS, '--listTests']);
  assert.throws(() => mockTestInvocation('live'), /Usage/);
  assert.match(mockTestInvocation('node', [], { NODE_OPTIONS: '--no-warnings' }).env.NODE_OPTIONS, /^--no-warnings /);
});

test('both runner environments preload offline guard in children with a different cwd', () => {
  for (const mode of ['node', 'jest']) {
    const { env } = mockTestInvocation(mode, [], { ...process.env, NODE_OPTIONS: '' });
    const result = spawnSync(process.execPath, ['-e', `
      const assert = require('node:assert/strict');
      assert.throws(() => require('node:net').connect(443, '203.0.113.1'), /MOCK_NETWORK_BLOCKED/);
      const child = require('node:child_process').spawnSync(process.execPath, ['-e',
        "require('node:assert/strict').throws(() => require('node:net').connect(443, '203.0.113.1'), /MOCK_NETWORK_BLOCKED/)"
      ], {encoding:'utf8'});
      assert.equal(child.status, 0, child.stderr);
    `], { cwd: tmpdir(), env, encoding: 'utf8', windowsHide: true, timeout: 10000 });
    assert.equal(result.status, 0, result.stderr);
  }
});

test('dev port conflict preserves the existing listener and starts no API child', { timeout: 20000 }, async () => {
  const existing = http.createServer((_req, res) => res.end('existing-task'));
  const apiReservation = http.createServer();
  await new Promise(resolve => existing.listen(0, '127.0.0.1', resolve));
  await new Promise(resolve => apiReservation.listen(0, '127.0.0.1', resolve));
  const port = existing.address().port;
  const apiPort = apiReservation.address().port;
  await new Promise(resolve => apiReservation.close(resolve));
  try {
    const child = spawn(process.execPath, ['scripts/dev-with-local-auth.mjs'], {
      env: { ...process.env, MOCK_DEV_PORT: String(port), MOCK_DEV_API_PORT: String(apiPort) },
      stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
    });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    const code = await new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('exit', resolve);
    });
    assert.notEqual(code, 0, output);
    assert.match(output, /EADDRINUSE|address already in use/);
    assert.doesNotMatch(output, /\[dev:mock-api\] ready/);
    assert.equal(await (await fetch(`http://127.0.0.1:${port}`)).text(), 'existing-task');
    await assert.rejects(fetch(`http://127.0.0.1:${apiPort}/api/health`, { signal: AbortSignal.timeout(1000) }));
  } finally {
    existing.closeAllConnections();
    await new Promise(resolve => existing.close(resolve));
  }
});
