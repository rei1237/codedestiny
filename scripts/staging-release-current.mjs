#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function shouldDeployStaging(sha, remoteOutput) {
  const latest = remoteOutput.trim().split(/\s+/)[0];
  if (!/^[a-f0-9]{40}$/.test(sha || '') || !/^[a-f0-9]{40}$/.test(latest || '')) throw new Error('staging release SHA 또는 최신 main을 확인할 수 없습니다.');
  return sha === latest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const latest = execFileSync('git', ['ls-remote', '--exit-code', 'origin', 'refs/heads/main'], { encoding: 'utf8', timeout: 30000, windowsHide: true });
    const current = shouldDeployStaging(process.env.GITHUB_SHA, latest);
    if (!process.env.GITHUB_OUTPUT) throw new Error('GITHUB_OUTPUT is required');
    appendFileSync(process.env.GITHUB_OUTPUT, `current=${current}\n`);
    console.log(current ? 'Latest staging SHA: deploy.' : 'Superseded staging SHA: yield to latest main before deployment.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
