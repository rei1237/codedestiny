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
const retentionDaysRaw = Number(process.env.FORTUNE_RETENTION_DAYS || '45');
const retentionDays = Number.isFinite(retentionDaysRaw) && retentionDaysRaw > 0 ? Math.floor(retentionDaysRaw) : 45;

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
const dailyPublicPath = path.join(root, 'public', 'fortune', 'data', `daily-${dateStr}.json`);

function parseYmd(ymd) {
  const m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function pruneOldDailyFiles(baseDir, keepDays, todayYmd) {
  if (!fs.existsSync(baseDir)) return { scanned: 0, deleted: 0 };
  const today = parseYmd(todayYmd);
  if (!today) return { scanned: 0, deleted: 0 };
  const cutoffMs = today.getTime() - (keepDays - 1) * 24 * 60 * 60 * 1000;
  const names = fs.readdirSync(baseDir);
  let scanned = 0;
  let deleted = 0;
  for (const name of names) {
    const m = name.match(/^daily-(\d{4}-\d{2}-\d{2})\.json$/);
    if (!m) continue;
    scanned += 1;
    const dt = parseYmd(m[1]);
    if (!dt) continue;
    if (dt.getTime() < cutoffMs) {
      const filePath = path.join(baseDir, name);
      try {
        fs.unlinkSync(filePath);
        deleted += 1;
      } catch {
        // keep going; missing permissions or race should not abort daily generation
      }
    }
  }
  return { scanned, deleted };
}

if (!force && fs.existsSync(dailyPath) && fs.existsSync(dailyPublicPath)) {
  try {
    const rootJson = JSON.parse(fs.readFileSync(dailyPath, 'utf8'));
    const publicJson = JSON.parse(fs.readFileSync(dailyPublicPath, 'utf8'));
    if (rootJson && publicJson && rootJson.date === dateStr && publicJson.date === dateStr) {
      console.log('[fortune-daily-once] Skip: already have daily package for', dateStr, '→', dailyPath, 'and', dailyPublicPath);
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
    FORTUNE_IDEMPOTENT: force ? '0' : '1',
  },
});

if ((r.status ?? 1) === 0) {
  const roots = [
    path.join(root, 'fortune', 'data'),
    path.join(root, 'public', 'fortune', 'data'),
  ];
  for (const baseDir of roots) {
    const stat = pruneOldDailyFiles(baseDir, retentionDays, dateStr);
    console.log('[fortune-daily-once] prune', baseDir, 'scanned=', stat.scanned, 'deleted=', stat.deleted, 'retentionDays=', retentionDays);
  }
}

process.exit(r.status === null ? 1 : r.status);
