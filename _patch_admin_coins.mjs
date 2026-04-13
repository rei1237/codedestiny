import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, extname, relative } from 'path';

const SKIP_DIRS = new Set(['node_modules','.next','.open-next','build','out','.git','_scripts-archive','memory']);

// --- 패턴 1: loadBalance() 에 admin bypass 삽입 ---
// Before:
//   function loadBalance() {
//     var user = readAuthUser();
//     var points = Number(user && user.points);
//     userBalance = Number.isFinite(points) && points >= 0 ? points : 0;
//   }
// After: 위 앞에 admin 체크 삽입

const LOAD_BALANCE_OLD =
`  function loadBalance() {
    var user = readAuthUser();
    var points = Number(user && user.points);
    userBalance = Number.isFinite(points) && points >= 0 ? points : 0;
  }`;

const LOAD_BALANCE_NEW =
`  function loadBalance() {
    if (typeof isAdminUser === 'function' && isAdminUser()) {
      userBalance = 9999;
      syncAuthUserPoints(9999);
      return;
    }
    var user = readAuthUser();
    var points = Number(user && user.points);
    userBalance = Number.isFinite(points) && points >= 0 ? points : 0;
  }`;

// --- 패턴 2: syncBalanceFromServer() 에 admin bypass 삽입 ---
// Before:
//   async function syncBalanceFromServer() {
//     if (!hasAuthToken() || syncInFlight) return;
//     syncInFlight = true;
// After: 첫 줄에 admin bypass 추가

const SYNC_OLD =
`  async function syncBalanceFromServer() {
    if (!hasAuthToken() || syncInFlight) return;
    syncInFlight = true;`;

const SYNC_NEW =
`  async function syncBalanceFromServer() {
    if (typeof isAdminUser === 'function' && isAdminUser()) {
      userBalance = 9999;
      syncAuthUserPoints(9999);
      updateBadge();
      return;
    }
    if (!hasAuthToken() || syncInFlight) return;
    syncInFlight = true;`;

const TARGETS = [LOAD_BALANCE_OLD, SYNC_OLD];
const REPLACEMENTS = [LOAD_BALANCE_NEW, SYNC_NEW];

function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(full);
    } else if (e.isFile() && extname(e.name).toLowerCase() === '.html') {
      try {
        let src = readFileSync(full, 'utf8');
        let changed = false;
        for (let i = 0; i < TARGETS.length; i++) {
          if (src.includes(TARGETS[i]) && !src.includes(REPLACEMENTS[i])) {
            src = src.split(TARGETS[i]).join(REPLACEMENTS[i]);
            changed = true;
          }
        }
        if (changed) {
          writeFileSync(full, src, 'utf8');
          console.log('PATCHED:', relative(process.cwd(), full));
        }
      } catch (err) {
        console.error('ERR:', full, err.message);
      }
    }
  }
}

walk('.');
console.log('Done.');
