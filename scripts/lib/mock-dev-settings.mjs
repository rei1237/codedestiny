import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
export function mockDevSettings(cwd, inherited = process.env) {
  const workspace = createHash('sha256').update(resolve(cwd).toLowerCase()).digest('hex').slice(0, 8);
  const port = Number(inherited.MOCK_DEV_PORT || 12000 + (parseInt(workspace, 16) % 12000) * 2);
  const apiPort = Number(inherited.MOCK_DEV_API_PORT || port + 1);
  if (![port, apiPort].every(value => Number.isInteger(value) && value > 1024 && value < 65536) || port === apiPort) {
    throw new Error('Mock frontend/API ports must be distinct ports between 1025 and 65535');
  }
  const apiBase = `http://127.0.0.1:${apiPort}`;
  const env = { ...inherited };
  for (const key of Object.keys(env)) {
    if (/TOKEN|SECRET|API_KEY|MONGO|CLOUDFLARE|PORTONE|AUTH.*URL|API.*URL/i.test(key)) delete env[key];
  }
  Object.assign(env, {
    CD_MOCK_DEV: '1', NEXT_PUBLIC_MOCK_DEV: '1', NODE_ENV: 'development',
    NEXT_TELEMETRY_DISABLED: '1', LOCAL_DEV_AUTH_API_PORT: String(apiPort),
    API_WORKER_ORIGIN: apiBase,
    NEXT_PUBLIC_API_URL: '', NEXT_PUBLIC_AUTH_API_BASE_URL: '', NEXT_PUBLIC_API_BASE_URL: '',
    NEXT_PUBLIC_CODE_DESTINY_API_URL: '', NEXT_PUBLIC_EFFECTIVE_API_BASE_URL: '',
    NODE_OPTIONS: `--require="${resolve(cwd, 'scripts/lib/mock-network-guard.cjs').replaceAll('\\', '/')}"`,
  });
  return { workspace, port, apiPort, env };
}
