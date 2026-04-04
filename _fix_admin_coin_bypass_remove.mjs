/**
 * _fix_admin_coin_bypass_remove.mjs
 * 관리자 코인 무한/우회 제거 패치
 * - loadBalance() 9999999 제거
 * - saveBalance() admin 예외 제거
 * - tryUnlockFeature() admin bypass 제거
 * - _cdRunPerUseCoinGate() admin bypass 제거
 * - click 핸들러 영구해금 admin bypass 제거
 * - neville / yoga 페이지 flower_admin_token bypass 제거
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

// ─────────────────────────────────────────────
// 1. index.html 파일 목록 (root + public + locales)
// ─────────────────────────────────────────────
const INDEX_FILES = [
  'index.html',
  'public/index.html',
  'public/static/index.html',
  'public/zh-cn/index.html',
  'public/hi-in/index.html',
  'public/de-de/index.html',
  'public/nl-nl/index.html',
  'public/fr-fr/index.html',
  'public/ms-my/index.html',
  'public/ja-jp/index.html',
  'public/es-es/index.html',
  'public/en-us/index.html',
];

// ─────────────────────────────────────────────
// 2. neville / yoga 페이지 목록
// ─────────────────────────────────────────────
const PAGE_FILES = [
  'neville-meditation.html',
  'public/neville-meditation.html',
  'yoga-guru.html',
  'public/yoga-guru.html',
];

// ─────────────────────────────────────────────
// index.html 패치 목록
// ─────────────────────────────────────────────
const INDEX_PATCHES = [
  // ① loadBalance(): admin 9999999 제거
  {
    label: 'loadBalance admin 9999999 제거',
    old: `  function loadBalance() {
    // 관리자는 항상 충분한 잔액으로 시작 (UI 게이트 통과용)
    if (isAdminUser()) { userBalance = 9999999; return; }
    var user = readAuthUser();`,
    neo: `  function loadBalance() {
    var user = readAuthUser();`,
  },

  // ② saveBalance(): admin 예외 줄 제거
  {
    label: 'saveBalance admin 예외 제거',
    old: `  function saveBalance() {
    if (isAdminUser()) return; // 관리자는 잔액 덮어쓰기 방지
    syncAuthUserPoints(userBalance);`,
    neo: `  function saveBalance() {
    syncAuthUserPoints(userBalance);`,
  },

  // ③ tryUnlockFeature(): admin 즉시해금 블록 제거
  {
    label: 'tryUnlockFeature admin bypass 제거',
    old: `    // 관리자 모드: 코인 차감 없이 즉시 해금
    if (isAdminUser()) {
      unlockedFeatureMap[featureKey] = true;
      saveTileLocks();
      UnlockButton(button);
      return;
    }

    var confirmed = window.confirm`,
    neo: `    var confirmed = window.confirm`,
  },

  // ④ _cdRunPerUseCoinGate(): admin bypass 블록 제거
  {
    label: '_cdRunPerUseCoinGate admin bypass 제거',
    old: `      // 관리자 모드: 코인 차감 없이 즉시 실행
      if (isAdminUser()) {
        sessionStorage.setItem('cd_pa_' + action, '1');
        _cdInvokeActionDirect(action, actionNode);
        return;
      }
      // 프리미엄 구독 플랜 보유자: 코인 차감 없이 즉시 실행`,
    neo: `      // 프리미엄 구독 플랜 보유자: 코인 차감 없이 즉시 실행`,
  },

  // ⑤ click 핸들러 영구해금 admin bypass 블록 제거
  {
    label: 'click handler 영구해금 admin bypass 제거',
    old: `        // 관리자 모드: 코인 차감 없이 즉시 영구 해금
        if (isAdminUser()) {
          unlockedFeatureMap[tileLockKey] = true;
          saveTileLocks();
          applyTileLockVisuals();
          sessionStorage.setItem('cd_pa_' + action, '1');
          _cdInvokeActionDirect(action, actionNode);
          return;
        }
        // 프리미엄 구독 플랜 보유자: 코인 없이 영구 해금`,
    neo: `        // 프리미엄 구독 플랜 보유자: 코인 없이 영구 해금`,
  },
];

// ─────────────────────────────────────────────
// neville / yoga 페이지 패치
// ─────────────────────────────────────────────
const PAGE_PATCHES = [
  {
    label: 'flower_admin_token bypass 제거',
    old: `  if (sessionStorage.getItem(flag)) { sessionStorage.removeItem(flag); return; }
  // 관리자 패널 로그인: 코인 없이 바로 이용 가능
  try { if (sessionStorage.getItem('flower_admin_token')) return; } catch(_ae) {}
  var token`,
    neo: `  if (sessionStorage.getItem(flag)) { sessionStorage.removeItem(flag); return; }
  var token`,
  },
];

// ─────────────────────────────────────────────
// 패치 실행 함수
// ─────────────────────────────────────────────
function patchFile(relPath, patches) {
  const fullPath = join(__dir, relPath.replace(/\//g, '\\'));
  let content;
  try {
    content = readFileSync(fullPath, 'utf8');
  } catch (e) {
    console.warn(`  [SKIP] 파일 없음: ${relPath} — ${e.message}`);
    return 0;
  }

  let changed = false;
  for (const { label, old, neo } of patches) {
    if (content.includes(old)) {
      content = content.split(old).join(neo);
      changed = true;
      console.log(`  ✓ ${label}`);
    } else {
      // 이미 적용됐거나 패턴 없음
      console.log(`  · ${label} — 패턴 없음(이미 적용 또는 불일치)`);
    }
  }

  if (changed) {
    writeFileSync(fullPath, content, 'utf8');
    console.log(`  → 저장: ${relPath}`);
    return 1;
  }
  return 0;
}

let totalPatched = 0;

console.log('\n═══ [1] index.html 군 패치 ═══');
for (const f of INDEX_FILES) {
  console.log(`\n[파일] ${f}`);
  totalPatched += patchFile(f, INDEX_PATCHES);
}

console.log('\n═══ [2] neville / yoga 페이지 패치 ═══');
for (const f of PAGE_FILES) {
  console.log(`\n[파일] ${f}`);
  totalPatched += patchFile(f, PAGE_PATCHES);
}

console.log(`\n✅ 완료: 총 ${totalPatched}개 파일 수정됨`);
