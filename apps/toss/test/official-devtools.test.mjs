import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

test('official Toss DevTools mock: grant, cancellation and pending recovery use a fake server',()=>{
  const fixture=fileURLToPath(new URL('./official-devtools-check.cjs',import.meta.url));
  const output=execFileSync(process.execPath,[fixture],{encoding:'utf8',timeout:120000});
  assert.match(output,/Official devtools .* PASS/);
});
