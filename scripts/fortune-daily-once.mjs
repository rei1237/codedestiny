/**
 * KST 기준 "오늘" 일일 패키지가 이미 있으면 생성 스킵 (하루 1회 원칙)
 * FORTUNE_FORCE=1 이면 기존 파일이 있어도 덮어씀
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'node:child_process';
import { kstYmdToday } from './lib/fortune-date.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const dateStr = process.env.FORTUNE_DATE?.trim() || kstYmdToday();
const force = process.env.FORTUNE_FORCE === '1' || process.env.FORTUNE_FORCE === 'true';

const dailyPath = path.join(root, 'fortune', 'data', `daily-${dateStr}.json`);

if (!force && fs.existsSync(dailyPath)) {
  try {
    const raw = fs.readFileSync(dailyPath, 'utf8');
    const j = JSON.parse(raw);
    if (j && j.date === dateStr) {
      console.log('[fortune-daily-once] Skip: already have daily package for', dateStr, '→', dailyPath);
      process.exit(0);
    }
  } catch {
    console.warn('[fortune-daily-once] Existing file invalid, regenerating:', dailyPath);
  }
}

const r = spawnSync(process.execPath, [path.join(__dirname, 'gen-daily.mjs')], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, FORTUNE_DATE: dateStr },
});

process.exit(r.status === null ? 1 : r.status);
