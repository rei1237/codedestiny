/**
 * _verify_coingate_fix.mjs
 * 6개 패치 모두 정상 적용됐는지 검증
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

const FILES = [
  'index.html',
  'public/index.html',
  'public/static/index.html',
  'public/nl-nl/index.html',
  'public/ms-my/index.html',
  'public/ja-jp/index.html',
  'public/hi-in/index.html',
  'public/fr-fr/index.html',
  'public/es-es/index.html',
  'public/en-us/index.html',
  'public/de-de/index.html',
  'public/zh-cn/index.html',
];

const CHECKS = [
  // 패치 1: isAdminUser 구문 오류 - 깨진 구조 제거됐는지 (없어야 함)
  ['isAdminUser 깨진 구조 제거',
   '    }\n    // 3) flower_admin_token: admin panel login',
   null, false], // false = 이 BROKEN 패턴이 없어야 함

  // 패치 1: 올바른 구조 존재 확인 (있어야 함)
  ['isAdminUser 올바른 구조 확인',
   '      // 3) flower_admin_token: admin panel login -> all features available without coins\n      try { if (sessionStorage.getItem(\'flower_admin_token\')) return true; } catch (_ss) {}\n    } catch (_e) {}',
   null, true], // true = 이 CORRECT 패턴이 있어야 함

  // 패치 2: 코인 게이트 구독 체크
  ['코인게이트 구독 플랜 체크',
   '// \uD504\uB9AC\uBBF8\uC5C4 \uAD6C\uB3C5 \uD50C\uB79C \uBCF4\uC720\uC790: \uCF54\uC778 \uCC28\uAC10 \uC5C6\uC774 \uC989\uC2DC \uC2E4\uD589',
   null, true],

  // 패치 3: 영구 해금 게이트 구독 체크
  ['영구해금 구독 플랜 체크',
   '// \uD504\uB9AC\uBBF8\uC5C4 \uAD6C\uB3C5 \uD50C\uB79C \uBCF4\uC720\uC790: \uCF54\uC778 \uC5C6\uC774 \uC601\uAD6C \uD574\uAE08',
   null, true],

  // 패치 4: D 객체 새 항목들
  ['D객체 openLifeBookModal', "openLifeBookModal:{cat:'", null, true],
  ['D객체 openAstroModal', "openAstroModal:{cat:'", null, true],
  ['D객체 openZiweiModal', "openZiweiModal:{cat:'", null, true],
  ['D객체 navigateToVedic', "navigateToVedic:{cat:'", null, true],
  ['D객체 openOlympusOracleModal', "openOlympusOracleModal:{cat:'", null, true],

  // 패치 5: lifebook-tile 인터셉터
  ['lifebook-tile 인터셉터', "e.target.closest('.tarot-tile,.lifebook-tile')", null, true],

  // 패치 6: 구독 안내 paywall
  ['paywall 구독 안내', '_pvwHasSub', null, true],
];

let totalOk = 0;
let totalFail = 0;

for (const relPath of FILES) {
  const absPath = join(__dir, relPath);
  let content;
  try {
    content = readFileSync(absPath, 'utf8');
  } catch (_) {
    console.warn(`[SKIP] 파일 없음: ${relPath}`);
    continue;
  }

  let fileOk = true;
  const failures = [];

  for (const [name, searchStr, , shouldExist] of CHECKS) {
    if (searchStr === null) continue;
    const exists = content.includes(searchStr);
    if (shouldExist && !exists) {
      failures.push(`✗ 누락: ${name}`);
      fileOk = false;
    } else if (!shouldExist && exists) {
      failures.push(`✗ 구 패턴 잔존: ${name}`);
      fileOk = false;
    }
  }

  if (fileOk) {
    console.log(`✅ ${relPath} — 모든 패치 정상`);
    totalOk++;
  } else {
    console.log(`❌ ${relPath}`);
    failures.forEach(f => console.log(`   ${f}`));
    totalFail++;
  }
}

// isAdminUser 구문 오류가 완전히 제거됐는지 별도 확인
console.log('\n=== isAdminUser JS 파싱 검증 ===');
const main = readFileSync(join(__dir, 'index.html'), 'utf8');
// isAdminUser 함수 추출
const fnStart = main.indexOf('function isAdminUser() {');
const fnEnd = main.indexOf('\n  function loadBalance()', fnStart);
const fnBody = main.slice(fnStart, fnEnd);
try {
  new Function(fnBody);
  console.log('✅ isAdminUser 함수 파싱 성공 (SyntaxError 없음)');
} catch (e) {
  console.error('❌ isAdminUser 파싱 실패:', e.message);
}

console.log(`\n검증 결과: ${totalOk}개 파일 정상, ${totalFail}개 파일 문제`);
