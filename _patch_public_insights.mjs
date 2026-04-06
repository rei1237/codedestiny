// public/index.html의 인사이트 허브(구)+유명인 패널(구) → index.html의 새 통합 섹션으로 교체
import { readFileSync, writeFileSync } from 'fs';

const srcPath  = 'index.html';
const destPath = 'public/index.html';

const src  = readFileSync(srcPath,  'utf-8');
const dest = readFileSync(destPath, 'utf-8');

// 1) index.html에서 새 섹션 추출
const START_MARKER = '    <!-- ═══ 운세 인사이트 허브 ═══ -->';
const END_MARKER   = '    <!-- ═══ 운세 인사이트 허브 끝 ═══ -->';

const srcStart = src.indexOf(START_MARKER);
const srcEnd   = src.indexOf(END_MARKER) + END_MARKER.length;
if (srcStart === -1 || srcEnd <= START_MARKER.length) {
  console.error('❌ index.html에서 마커를 찾지 못했습니다.');
  process.exit(1);
}
const newSection = src.slice(srcStart, srcEnd);
console.log(`✅ 새 섹션 추출: ${newSection.length}자`);

// 2) public/index.html에서 교체 범위 결정
//    시작: <!-- ═══ 운세 인사이트 허브 ═══ -->
//    끝  : <!-- ═══ 유명인 사주 분석 패널 끝 ═══ --> (구 독립 패널 포함)
const OLD_END_MARKER = '    <!-- ═══ 유명인 사주 분석 패널 끝 ═══ -->';

const destStart = dest.indexOf(START_MARKER);
let destEnd     = dest.indexOf(OLD_END_MARKER);

if (destStart === -1) {
  console.error('❌ public/index.html에서 시작 마커를 찾지 못했습니다.');
  process.exit(1);
}

let after;
if (destEnd === -1) {
  // 구 유명인 패널이 없으면 원래 인사이트 허브 끝 마커까지만
  console.warn('⚠️  구 유명인 패널 마커 없음 — 인사이트 허브 끝 마커까지만 교체합니다.');
  destEnd = dest.indexOf(END_MARKER) + END_MARKER.length;
  after   = dest.slice(destEnd);
} else {
  destEnd += OLD_END_MARKER.length;
  after   = dest.slice(destEnd);
}

const before = dest.slice(0, destStart);
const result = before + newSection + after;

writeFileSync(destPath, result, 'utf-8');
console.log('✅ public/index.html 교체 완료');
console.log(`   원본 길이: ${dest.length}자 → 새 길이: ${result.length}자`);
