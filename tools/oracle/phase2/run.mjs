import { spawn } from 'node:child_process';
import path from 'node:path';
import { REPO } from '../service-runner.mjs';
// Independent processes partition a single immutable synthetic corpus. No agents,
// remote endpoints, oracle installs, service writes, or Swiss domain calls.
const jobs = Array.from({ length: 4 }, (_, n) => [process.execPath, ['tools/oracle/phase2/node-batch.mjs', String(n), '4']]);
jobs.push([path.join(REPO, 'tools/oracle-py/.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python'), ['-I', '-X', 'utf8', 'tools/oracle-py/batch.py']]);
const results = await Promise.all(jobs.map(([command, args]) => new Promise(resolve => {
  const child = spawn(command, args, { cwd: REPO, stdio: 'inherit', windowsHide: true, env: { ...process.env, TZ: 'UTC', PYTHONDONTWRITEBYTECODE: '1' } });
  child.on('error', error => { console.error(error.message); resolve(1); });
  child.on('exit', code => resolve(code ?? 1));
})));
if (results.some(code => code !== 0)) process.exitCode = 1;
