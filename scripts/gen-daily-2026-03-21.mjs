/**
 * 하위 호환: 특정 날짜(2026-03-21) 패키지 생성
 * 일반적으로는 `npm run fortune:generate` 또는 `node scripts/gen-daily.mjs` 사용
 */
import { spawnSync } from 'node:child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const r = spawnSync(process.execPath, [path.join(__dirname, 'gen-daily.mjs')], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, FORTUNE_DATE: '2026-03-21' },
});
process.exit(r.status === null ? 1 : r.status);
