import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { mockDevSettings } from './lib/mock-dev-settings.mjs';

const require = createRequire(import.meta.url);
const settings = mockDevSettings(process.cwd());
const children = new Set();
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) {
    if (!child.pid) continue;
    // Only descendants of this launcher's still-running children are targets.
    // Never discover/kill a process by port: another task may own that listener.
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    } else {
      try { process.kill(-child.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
    }
  }
}
function start(args) {
  const child = spawn(process.execPath, args, { stdio: 'inherit', env: settings.env, detached: process.platform !== 'win32', windowsHide: true });
  children.add(child);
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => { children.delete(child); stop(code ?? 1); });
}
console.log(`[dev:mock] http://127.0.0.1:${settings.port} — fixtures only; external Node/browser API requests blocked`);
console.log('[dev:mock] Unsupported API routes return MOCK_ROUTE_NOT_IMPLEMENTED. Live integration: npm run dev:live');
process.on('SIGINT', () => stop(130));
process.on('SIGTERM', () => stop(143));
// Refuse a conflicting port before creating any descendants. Never replace an
// existing task's listener. A subsequent bind race still fails in the child.
const reservations = [];
try {
  for (const port of [settings.port, settings.apiPort]) {
    const server = createServer();
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen({ host: '127.0.0.1', port, exclusive: true }, resolve);
    });
    reservations.push(server);
  }
} catch (error) {
  console.error(`[dev:mock] ${error.code}: requested port is unavailable; existing processes were not changed`);
  process.exitCode = 1;
} finally {
  await Promise.all(reservations.map(server => new Promise(resolve => server.close(resolve))));
}
if (process.exitCode) process.exit(process.exitCode);
start(['--watch', 'scripts/mock-dev-api.mjs']);
start(['--require=./scripts/next-manifest-read-guard.cjs', require.resolve('next/dist/bin/next'),
  'dev', '--hostname', '127.0.0.1', '--port', String(settings.port)]);
