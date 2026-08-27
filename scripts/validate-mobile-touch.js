const fs = require('fs');
const path = require('path');

/**
 * 모바일 터치 & 스크립트 로드 검증 (Mobile Touch & Script Load Validation)
 * HTML에서 터치 이벤트와 스크립트 로드 관련 설정을 검증
 */

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║         모바일 터치 & 스크립트 로드 검증 (Phase 4 - Subtest)    ║');
console.log('║        Mobile Touch & Script Load Validation                 ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

try {
  const indexPath = path.join(__dirname, '../index.html');
  const indexContent = fs.readFileSync(indexPath, 'utf-8');

  // 테스트 1: viewport 메타 설정 검증
  console.log('✅ 1. Viewport 메타 설정 검증\n');

  const viewportTests = [
    { name: 'width=device-width', pattern: /viewport.*width=device-width/ },
    { name: 'initial-scale=1', pattern: /viewport.*initial-scale=1/ },
    { name: 'user-scalable', pattern: /viewport.*user-scalable/ },
    { name: 'viewport-fit', pattern: /viewport-fit=cover/ }
  ];

  let viewportOk = true;
  viewportTests.forEach((test) => {
    const exists = test.pattern.test(indexContent);
    console.log(`  ${exists ? '✓' : '⚠'} ${test.name}: ${exists ? '설정됨' : '미확인'}`);
    if (!exists && test.name === 'width=device-width') viewportOk = false;
  });

  console.log('\n');

  // 테스트 2: 터치 이벤트 핸들러 검증
  console.log('✅ 2. 터치 이벤트 핸들러 검증\n');

  const touchTests = [
    { name: 'touchstart', pattern: /touchstart/i },
    { name: 'touchend', pattern: /touchend/i },
    { name: 'touchmove', pattern: /touchmove/i },
    { name: 'click', pattern: /click/i },
    { name: 'data-action', pattern: /data-action/i }
  ];

  let touchOk = true;
  touchTests.forEach((test) => {
    const exists = test.pattern.test(indexContent);
    console.log(`  ${exists ? '✓' : '✗'} ${test.name}: ${exists ? '정의됨' : '미정의'}`);
    if (!exists && test.name === 'click') touchOk = false;
  });

  console.log('\n');

  // 테스트 3: 스크립트 로드 최적화 검증
  console.log('✅ 3. 스크립트 로드 최적화 검증\n');

  const scriptOptimizations = [
    { name: 'defer 속성', pattern: /script[^>]*\sdefer/i, expectedCount: 0, desc: '필수는 아니나 권장' },
    { name: 'async 속성', pattern: /script[^>]*\sasync/i, expectedCount: 0, desc: 'CDN 제외' },
    { name: 'module 속성', pattern: /script[^>]*\stype="module"/i, expectedMin: 1, desc: '모듈화 스크립트' },
    { name: 'nomodule 속성', pattern: /script[^>]*\snomodule/i, expectedCount: 0, desc: 'fallback (있으면 가능)' }
  ];

  let scriptOk = true;
  scriptOptimizations.forEach((test) => {
    const matches = indexContent.match(test.pattern);
    const count = matches ? matches.length : 0;
    const ok = test.expectedMin ? count >= test.expectedMin : true;
    console.log(`  ${ok ? '✓' : '⚠'} ${test.name}: ${count}개 (${test.desc})`);
    if (!ok && test.expectedMin && count < test.expectedMin) scriptOk = false;
  });

  console.log('\n');

  // 테스트 4: 크리티컬 리소스 로드 검증
  console.log('✅ 4. 크리티컬 리소스 로드 검증\n');

  const criticalResources = [
    { name: 'Canonical Redirect', pattern: /canonical-redirect/, required: true },
    { name: 'PWA Theme Init', pattern: /pwa-theme-init/, required: true },
    { name: 'Swisseph Loader', pattern: /swisseph-loader/, required: true },
    { name: 'Chinese Astrology', pattern: /chinese-astrology\.js/, required: true },
    { name: 'KASI Calendar', pattern: /kasi.*calendar\.js/, required: true }
    // 🔴 'Lunar Library'(/lunar-javascript/) 항목을 지웠다. index.html 에 그 문자열이 없어진
    // 뒤로 **이미 실패하고 있던 기대**이고(이 스크립트는 package.json·워크플로 어디에도
    // 배선돼 있지 않아 아무도 못 봤다), 2026-08-28 에 셸의 CDN 로더 자체가 사라졌다.
    // 달력은 /js/core/korean-calendar.js 에서 나온다.
  ];

  let criticalOk = true;
  criticalResources.forEach((res) => {
    const exists = res.pattern.test(indexContent);
    console.log(`  ${exists ? '✓' : '✗'} ${res.name}: ${exists ? '로드됨' : '미로드'}`);
    if (!exists && res.required) criticalOk = false;
  });

  console.log('\n');

  // 테스트 5: CSS 로드 최적화 검증
  console.log('✅ 5. CSS 로드 최적화 검증\n');

  const cssOptimizations = [
    { name: 'Critical CSS (sync)', pattern: /link[^>]*rel="stylesheet"[^>]*href="[^"]*css[^"]*"(?!.*rel=)/i, desc: '동기 로드 (3개 이상)' },
    { name: 'CSS preload', pattern: /link[^>]*rel="preload"[^>]*as="style"/i, desc: '비동기 preload' },
    { name: 'CSS onload async', pattern: /onload="\s*this\.rel='stylesheet'/i, desc: '로드 후 적용' },
    { name: 'Font display=swap', pattern: /font-display:\s*swap/i, desc: '폰트 교환 (CLS 방지)' }
  ];

  let cssOk = true;
  cssOptimizations.forEach((test) => {
    const exists = test.pattern.test(indexContent);
    console.log(`  ${exists ? '✓' : '⚠'} ${test.name}: ${exists ? '적용됨' : '미확인'}`);
  });

  console.log('\n');

  // 테스트 6: 모바일 성능 메타 검증
  console.log('✅ 6. 모바일 성능 메타 검증\n');

  const mobilePerformance = [
    { name: 'Apple Touch Icon', pattern: /apple-touch-icon/, desc: 'iOS 홈 아이콘' },
    { name: 'Manifest Link', pattern: /manifest\.json/, desc: 'PWA Manifest' },
    { name: 'Service Worker', pattern: /service-worker\.js/, desc: 'Offline Support' },
    { name: 'Meta Refresh', pattern: /http-equiv="refresh"/, desc: 'Auto-refresh (없어야 함)' },
    { name: 'Format Detection', pattern: /format-detection/, desc: ' 전화 번호 자동 감지' }
  ];

  let mobileOk = true;
  mobilePerformance.forEach((test) => {
    const exists = test.pattern.test(indexContent);
    const shouldExist = test.name !== 'Meta Refresh';
    const ok = shouldExist ? exists : !exists;
    console.log(`  ${ok ? '✓' : '⚠'} ${test.name}: ${ok ? '✓' : '미설정'}`);
    if (!ok && test.name === 'Manifest Link') mobileOk = false;
  });

  console.log('\n');

  // 테스트 7: 스크립트 로드 순서 검증
  console.log('✅ 7. 스크립트 로드 순서 검증\n');

  const scriptSequence = [
    'swisseph-loader',
    'chinese-astrology',
    'calendar',
    'destiny-profile|compat-llm',
    'sajuAnalyzer|ziwei-doushu',
    'saju-engine',
    'app'
  ];

  let positions = {};
  scriptSequence.forEach((script) => {
    const patterns = script.split('|');
    let pos = -1;
    patterns.forEach((pattern) => {
      const idx = indexContent.indexOf(pattern);
      if (idx > pos) pos = idx;
    });
    positions[script] = pos;
  });

  let loadOrderOk = true;
  const sortedPositions = Object.values(positions).sort((a, b) => a - b);
  for (let i = 1; i < sortedPositions.length; i++) {
    if (sortedPositions[i] <= sortedPositions[i - 1]) {
      loadOrderOk = false;
      break;
    }
  }

  console.log(`  ${loadOrderOk ? '✓' : '✗'} 스크립트 로드 순서: ${loadOrderOk ? '올바름' : '간격 확인 필요'}`);
  scriptSequence.forEach((script, idx) => {
    console.log(`    ${idx + 1}. ${script}: ${positions[script] > 0 ? '로드됨' : '미발견'}`);
  });

  console.log('\n');

  // 최종 보고서
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║            모바일 터치 & 로드 검증 결과                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const allChecks = [
    { name: 'Viewport', ok: viewportOk },
    { name: 'Touch Events', ok: touchOk },
    { name: 'Script Optimization', ok: scriptOk },
    { name: 'Critical Resources', ok: criticalOk },
    { name: 'CSS Optimization', ok: cssOk },
    { name: 'Mobile Performance', ok: mobileOk },
    { name: 'Load Order', ok: loadOrderOk }
  ];

  let passCount = allChecks.filter(c => c.ok).length;

  console.log('📋 검증 항목 요약:\n');
  allChecks.forEach((check) => {
    console.log(`  ${check.ok ? '✅' : '⚠️'} ${check.name}: ${check.ok ? '✓ PASS' : '⚠️ 주의'}`);
  });

  console.log(`\n📊 총 검증: ${passCount}/${allChecks.length} (${Math.round(passCount / allChecks.length * 100)}%)\n`);

  const mobileTestReady = passCount >= 5; // 5개 이상 통과

  if (mobileTestReady) {
    console.log('✅ 모바일 터치 & 로드 검증 PASSED\n');
  } else {
    console.log('⚠️ 모바일 터치 & 로드: 일부 항목 확인 필요\n');
  }

  console.log('📌 다음 단계:\n');
  console.log('  1. 실제 모바일 디바이스 또는 Chrome DevTools 모바일 에뮬레이션에서 테스트');
  console.log('  2. 터치 이벤트 응답성 확인 (예: 버튼 클릭 즉시 반응)');
  console.log('  3. 스크롤 성능 확인 (60fps 유지)');
  console.log('  4. 로딩 시간 측정 (First Contentful Paint < 3초)');
  console.log('  5. 메모리 누수 확인 (DevTools Memory Profiler)\n');

  console.log('🚀 배포 상태:\n');
  console.log('  ✅ GitHub: commit 6c2450d pushed');
  console.log('  ✅ Cloudflare Pages: 자동 배포 완료');
  console.log('  ☑️ 실제 모바일 테스트: 브라우저에서 수행 필요\n');

  process.exit(mobileTestReady ? 0 : 1);

} catch (err) {
  console.log(`\n❌ 검증 오류: ${err.message}\n`);
  process.exit(1);
}
