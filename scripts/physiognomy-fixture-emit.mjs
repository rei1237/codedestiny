// 관상 동물상 정확도 픽스처 생성기 (개발 전용 · 배포되지 않음)
//
// scripts/fixtures/physiognomy-landmark-vectors.json 은 calibration/(gitignore) 사진에서
// 얼굴 이미지·신원 정보 없이 엔진이 실제로 인덱싱하는 랜드마크 좌표만 뽑아 담은 파일이다.
// verify-physiognomy-scoring.mjs 가 이 픽스처로 실엔진을 돌려 라벨 적중률 하한을 지킨다.
//
// 사용법:
//   npm run physio:measure   (사진이 바뀌었을 때 한 번 — calibration/.measurements.json 갱신)
//   npm run physio:fixture   (그 결과를 커밋 가능한 픽스처로 변환)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const dump = resolve(root, opt('json', 'calibration/.measurements.json'));
if (!existsSync(dump)) {
  console.error(`[physio-fixture] ${relative(root, dump)} 가 없습니다. 먼저: npm run physio:measure`);
  process.exit(1);
}

// verify-physiognomy-scoring.mjs 가 읽는 인덱스와 반드시 같아야 한다 — AnalysisEngine.js 가
// analyze()/extractGeometricFeatures() 에서 실제로 참조하는 랜드마크 인덱스 38개.
const INDICES = [2, 6, 10, 13, 14, 46, 52, 55, 61, 70, 107, 116, 127, 129, 132, 133, 145, 149, 152, 159,
  164, 168, 226, 234, 276, 282, 285, 291, 300, 336, 345, 358, 362, 374, 378, 386, 446, 454];

const { rows } = JSON.parse(readFileSync(dump, 'utf8'));
const samples = rows
  .filter((r) => r.label && r.label !== '(라벨없음)' && Array.isArray(r.landmarks))
  .map((r) => ({
    label: r.label,
    aspect: r.aspect ?? 1,
    points: INDICES.map((idx) => r.landmarks[idx])
  }));

if (!samples.length) {
  console.error('[physio-fixture] 라벨이 있는 계측 행이 없습니다.');
  process.exit(1);
}

const out = resolve(root, 'scripts/fixtures/physiognomy-landmark-vectors.json');
writeFileSync(out, JSON.stringify({ indices: INDICES, samples }), 'utf8');
console.log(`[physio-fixture] ${samples.length}장 → ${relative(root, out)}`);
