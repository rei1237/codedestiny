#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function batchVerificationArgs(argv) {
  const sha = argv.find(value => value.startsWith('--sha='))?.slice(6);
  if (!/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('배치 마지막 병합의 전체 SHA가 필요합니다: --sha=<40자리 SHA>');
  if (argv.some(value => !value.startsWith('--sha=')) || argv.length !== 1) throw new Error('--sha=<40자리 SHA> 하나만 지정하세요. 양쪽 SHA 검증은 생략할 수 없습니다.');
  return ['scripts/verify-deployed-sha.mjs', `--sha=${sha}`, '--origin=https://staging.code-destiny.com'];
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = spawnSync(process.execPath, batchVerificationArgs(process.argv.slice(2)), { stdio: 'inherit', windowsHide: true });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } catch (error) {
    console.error(`[delivery-verify-batch] FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
