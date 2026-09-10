import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NODE_TEST_PATTERNS, JEST_BASE_ARGS } from './lib/mock-test-config.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

export function mockTestInvocation(mode, extraArgs = [], inherited = process.env) {
  if (!['jest', 'node'].includes(mode)) throw new Error('Usage: node scripts/run-mock-tests.mjs <jest|node> [test arguments]');
  const guard = resolve(root, 'scripts/lib/mock-network-guard.cjs').replaceAll('\\', '/');
  return {
    args: mode === 'jest'
      ? [require.resolve('jest/bin/jest'), ...JEST_BASE_ARGS, ...extraArgs]
      : ['--test', ...NODE_TEST_PATTERNS, ...extraArgs],
    env: {
      ...inherited,
      NODE_OPTIONS: `${inherited.NODE_OPTIONS || ''} --experimental-vm-modules --require="${guard}"`.trim(),
      LLM_DRY_RUN: 'true', WORKERS_AI_ENABLED: 'false', NEXT_TELEMETRY_DISABLED: '1',
    },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const mode = process.argv[2];
    const invocation = mockTestInvocation(mode, process.argv.slice(3), {
      ...process.env,
      ...(mode === 'jest' ? { CD_MOCK_TESTS: 'true' } : {}),
    });
    const result = spawnSync(process.execPath, invocation.args, {
      cwd: root, env: invocation.env, stdio: 'inherit', windowsHide: true,
    });
    if (result.error) console.error(result.error.message);
    process.exitCode = result.status ?? 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
