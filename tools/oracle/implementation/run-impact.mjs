import { spawn } from 'node:child_process';
import { REPO } from '../service-runner.mjs';
const codes = await Promise.all([0, 1, 2, 3].map(shard => new Promise(resolve => {
  const child = spawn(process.execPath, ['tools/oracle/implementation/impact.mjs', String(shard)], { cwd: REPO, stdio: 'inherit', windowsHide: true, env: { ...process.env, TZ: 'UTC' } });
  child.on('error', e => { console.error(e.message); resolve(1); }); child.on('exit', code => resolve(code ?? 1));
})));
if (codes.some(c => c !== 0)) process.exitCode = 1;
