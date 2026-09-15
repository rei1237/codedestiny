import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const cwd = fileURLToPath(new URL('../../', import.meta.url));
for (const script of ['extract-saju-runtime.mjs', 'verify-yeongnyangi-engines.mjs']) {
  test(`integrated Yeongnyangi: ${script}`, () => {
    const run = spawnSync(process.execPath, [`scripts/${script}`], {
      cwd, encoding:'utf8', timeout:60000, windowsHide:true,
    });
    assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}\n${run.error || ''}`);
  });
}
