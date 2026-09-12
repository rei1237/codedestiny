import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
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

// 🔴 실과금 차단은 러너가 아니라 jest 설정이 져야 한다. `npx jest <파일>` 로 러너를 우회하면
//    NODE_OPTIONS 의 --require 가 없어 보호가 통째로 사라지기 때문이다(실측 2026-09-13:
//    그 상태의 jest 안에서 generativelanguage.googleapis.com 까지 요청이 실제로 나갔다).
test('jest 설정 자체가 외부 전송을 막고 LLM 클라이언트를 목으로 돌린다', () => {
  const require_ = createRequire(import.meta.url);
  const root = resolvePath(dirname(fileURLToPath(import.meta.url)), '../..');
  const config = require_('../../jest.config.cjs');
  const fromRootDir = value => resolvePath(root, String(value).replace('<rootDir>/', ''));

  const guard = resolvePath(root, 'scripts/lib/mock-network-guard.cjs');
  assert.ok((config.setupFiles || []).map(fromRootDir).includes(guard),
    'jest.config.cjs 의 setupFiles 가 mock-network-guard 를 싣지 않는다 — 러너를 우회한 jest 가 실호출을 낸다');
  // 가리키는 파일이 실제로 무는지까지 본다(도는 가드 ≠ 무는 가드).
  const bite = spawnSync(process.execPath, ['-r', guard, '-e',
    "require('node:assert/strict').throws(() => require('node:net').connect(443, '203.0.113.1'), /MOCK_NETWORK_BLOCKED/);"],
    { env: { ...process.env, NODE_OPTIONS: '' }, encoding: 'utf8', windowsHide: true, timeout: 10000 });
  assert.equal(bite.status, 0, bite.stderr);

  // 목 매퍼가 경로 **모양**에 걸리면 깊이가 다른 임포터가 목을 못 받는다. 대상에 걸렸는지 전수로 본다.
  const keys = Object.keys(config.moduleNameMapper).filter(key => key.includes('llm-client')).map(key => new RegExp(key));
  assert.ok(keys.length > 0, 'jest.config.cjs 에 llm-client 목 매퍼가 없다');
  const specifiers = [...new Set(execFileSync('git',
    ['grep', '-hoE', String.raw`(from|require\()[ ]*['"][^'"]*llm-client[^'"]*['"]`, '--', '.', ':!docs', ':!dist', ':!out'],
    { cwd: root, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean)
    .map(line => line.replace(/^(from|require\()[ ]*['"]/, '').replace(/['"]$/, '')))];
  assert.ok(specifiers.length >= 2, `llm-client 임포터를 못 찾았다 — 스캔이 고장났다 (${specifiers.length})`);
  for (const specifier of specifiers) {
    assert.ok(keys.some(key => key.test(specifier)),
      `목 매퍼가 ${specifier} 를 덮지 않는다 — 이 경로로 임포트하는 테스트는 실제 LLM 클라이언트를 받는다`);
  }
});
