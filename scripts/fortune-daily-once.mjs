/**
 * 일일 패키지는 “한국 자정이 지난 뒤의 그날”(KST 달력) 기준으로 1회만 생성하는 것을 전제로 함.
 *
 * - FORTUNE_SCHEDULED=1 (GitHub Actions 자정 슬롯): 대상 날짜 = 그 시점의 KST ‘오늘’(= 방금 시작된 날)
 * - 일반 배포(build:cf)에서는 이 스크립트를 호출하지 않음
 * - FORTUNE_PREGENERATE_NEXT_DAY=1: 수동으로 KST ‘내일’분만 미리 생성(선택)
 * - FORTUNE_FORCE=1: 동일 날짜 파일이 있어도 덮어씀
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'node:child_process';
import { kstYmdToday, kstYmdTomorrow } from './lib/fortune-date.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const force = process.env.FORTUNE_FORCE === '1' || process.env.FORTUNE_FORCE === 'true';
const scheduled = process.env.FORTUNE_SCHEDULED === '1';

function resolveDateStr() {
  const explicit = process.env.FORTUNE_DATE?.trim();
  if (explicit) return explicit;
  if (scheduled) {
    const d = kstYmdToday();
    console.log('[fortune-daily-once] Scheduled (KST midnight slot): target date =', d);
    return d;
  }
  if (process.env.FORTUNE_PREGENERATE_NEXT_DAY === '1') {
    const d = kstYmdTomorrow();
    console.log('[fortune-daily-once] Pregenerate next KST day:', d);
    return d;
  }
  return kstYmdToday();
}

const dateStr = resolveDateStr();

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
  env: {
    ...process.env,
    FORTUNE_DATE: dateStr,
    FORTUNE_IDEMPOTENT: '1',
  },
});

process.exit(r.status === null ? 1 : r.status);
