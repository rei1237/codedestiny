const { test } = require('node:test');
const assert = require('node:assert/strict');

test('PR creation cannot switch to an unverified branch or repository', async () => {
  const { validatedPrArguments } = await import('../../scripts/pr-create.mjs');
  for (const flag of ['--head=other', '--base', '--repo=other/repo', '-Hother', '-Bmain', '-Rother/repo']) assert.throws(() => validatedPrArguments([flag], 'codex/test'), /덮어쓰지 않는다/);
  assert.deepEqual(validatedPrArguments(['--title', 'Verified change'], 'codex/test'), ['pr', 'create', '--base', 'main', '--head', 'codex/test', '--title', 'Verified change']);
});
