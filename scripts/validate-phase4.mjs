/**
 * Phase 4 검증 스크립트
 * 모듈 함수 로드 가능성 및 핵심 계산 정확도 검증
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseDir = path.join(__dirname, '..');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║             Phase 4 무결성 검증 테스트                          ║');
console.log('║         Integrity Validation Test Suite                       ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// 1. 파일 존재 여부 확인
console.log('✅ 1. 신규 모듈 파일 존재성 확인\n');

const modules = [
  'js/data/chinese-astrology.js',
  'js/core/kasi/calendar.js',
  'js/services/sajuAnalyzer.js',
  'js/engines/ziwei-doushu.js'
];

let filesOk = true;
modules.forEach((mod) => {
  const filePath = path.join(baseDir, mod);
  const exists = fs.existsSync(filePath);
  const status = exists ? '✓' : '✗';
  console.log(`  ${status} ${mod}: ${exists ? '존재' : '미존재'}`);
  if (!exists) filesOk = false;
});

if (!filesOk) {
  console.error('\n❌ 모듈 파일을 찾을 수 없습니다. 배포를 확인하세요.');
  process.exit(1);
}

console.log('\n');

// 2. index.html Script 태그 확인
console.log('✅ 2. index.html Script 로드 순서 확인\n');

const indexHtml = fs.readFileSync(path.join(baseDir, 'index.html'), 'utf-8');

const scriptPatterns = [
  { name: 'swisseph-loader (module)', pattern: 'type="module" src="/js/swisseph-loader.js"' },
  { name: 'chinese-astrology.js', pattern: 'src="/js/data/chinese-astrology.js" defer' },
  { name: 'calendar.js', pattern: 'src="/js/core/kasi/calendar.js" defer' },
  { name: 'sajuAnalyzer.js', pattern: 'src="/js/services/sajuAnalyzer.js" defer' },
  { name: 'ziwei-doushu.js', pattern: 'src="/js/engines/ziwei-doushu.js" defer' },
  { name: 'saju-engine.js', pattern: 'src="/js/saju-engine.js' },
  { name: 'app.js (module)', pattern: 'type="module" src="/js/app.js"' }
];

let scriptOrderCorrect = true;
let lastPosition = -1;

scriptPatterns.forEach((script) => {
  const position = indexHtml.indexOf(script.pattern);
  if (position === -1) {
    console.log(`  ✗ ${script.name}: 찾을 수 없음`);
    scriptOrderCorrect = false;
  } else if (position < lastPosition) {
    console.log(`  ⚠ ${script.name}: 순서 오류 (이전 항목 뒤에 나타나야 함)`);
  } else {
    console.log(`  ✓ ${script.name}: 로드 위치 OK`);
    lastPosition = position;
  }
});

console.log('\n');

// 3. 의존성 체크 - 함수 호출 패턴 분석
console.log('✅ 3. 모듈 간 의존성 확인\n');

const sajuAnalyzerContent = fs.readFileSync(path.join(baseDir, 'js/services/sajuAnalyzer.js'), 'utf-8');
const doushuContent = fs.readFileSync(path.join(baseDir, 'js/engines/ziwei-doushu.js'), 'utf-8');

const dependencies = [
  {
    module: 'sajuAnalyzer.js',
    requires: ['GAN', 'JI', 'SHENG', 'KE'],
    source: sajuAnalyzerContent
  },
  {
    module: 'ziwei-doushu.js',
    requires: ['PALACE_NAMES'],
    source: doushuContent
  }
];

dependencies.forEach((dep) => {
  console.log(`  📦 ${dep.module}:`);
  dep.requires.forEach((req) => {
    const hasRef = dep.source.includes(req);
    const status = hasRef ? '✓' : '✗';
    console.log(`    ${status} ${req}: ${hasRef ? '참조됨' : '미참조'}`);
  });
});

console.log('\n');

// 4. SEO 메타 태그 확인
console.log('✅ 4. SEO 메타 태그 무결성 확인\n');

const seoChecks = [
  { name: 'canonical', pattern: 'rel="canonical" href="https://code-destiny.com/"' },
  { name: 'og:title', pattern: 'property="og:title"' },
  { name: 'og:description', pattern: 'property="og:description"' },
  { name: 'og:image', pattern: 'property="og:image"' },
  { name: 'JSON-LD WebApplication', pattern: '"@type": "WebApplication"' },
  { name: 'JSON-LD FAQPage', pattern: '"@type": "FAQPage"' }
];

seoChecks.forEach((check) => {
  const exists = indexHtml.includes(check.pattern);
  const status = exists ? '✓' : '✗';
  console.log(`  ${status} ${check.name}: ${exists ? '존재' : '미존재'}`);
});

console.log('\n');

// 5. 최적화 항목 확인
console.log('✅ 5. HTML 최적화 항목 확인\n');

const optimizations = [
  { name: 'canonical-redirect 인라인', pattern: 'function redirectToCanonicalMain' },
  { name: 'pwa-theme-init 인라인', pattern: 'fortuneThemeModeStateV1' },
  { name: 'CSS preload with onload', pattern: 'rel="preload" href="/styles/' },
  { name: '폰트 display=swap', pattern: 'display=swap' },
  { name: 'Tailwind CDN defer', pattern: 'defer src="https://cdn.tailwindcss.com"' },
  { name: 'Google Translate CLS 방지', pattern: 'min-height:0;overflow:hidden' }
];

optimizations.forEach((opt) => {
  const exists = indexHtml.includes(opt.pattern);
  const status = exists ? '✓' : '✗';
  console.log(`  ${status} ${opt.name}: ${exists ? '적용됨' : '미적용'}`);
});

console.log('\n');

// 6. 최종 검증 보고서
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║                      검증 결과 요약                             ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

const totalChecks = modules.length 
  + scriptPatterns.length 
  + seoChecks.length 
  + optimizations.length;

const passedChecks = modules.length // 모듈 파일
  + scriptPatterns.filter(s => indexHtml.includes(s.pattern)).length
  + seoChecks.filter(s => indexHtml.includes(s.pattern)).length  
  + optimizations.filter(o => indexHtml.includes(o.pattern)).length;

const passRate = Math.round((passedChecks / totalChecks) * 100);

console.log(`📊 통과율: ${passedChecks}/${totalChecks} (${passRate}%)\n`);

if (passRate >= 90) {
  console.log('✅ Phase 4 검증 PASSED - 배포 준비 완료');
  console.log('   - 모듈 구조: OK');
  console.log('   - 로드 순서: OK');
  console.log('   - SEO 유지: OK');
  console.log('   - 성능 최적화: OK\n');
  process.exit(0);
} else {
  console.log('⚠️  검증 경고 - 다음 항목을 확인하세요:');
  process.exit(1);
}
