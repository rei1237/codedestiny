// 전생 관상(PastLifeFaceUI.js) 회귀 검증 — jsdom 실렌더 기반
//
// 이 기능은 관상(PhysiognomyUI.js)에서 분리해 나온 무료 독립 모달이다. 여기서 지키는 계약:
//   1) PhysiognomyUI.js 와 함께 로드해도 최상위 식별자가 충돌하지 않는다.
//      (PhysiognomyUI 는 IIFE 없이 `let faceMesh` 등을 최상위에 선언하는 클래식 스크립트라,
//       새 파일이 IIFE 를 잃으면 두 파일이 같이 로드되는 순간 SyntaxError 로 페이지가 죽는다)
//   2) AnalysisEngine.js 를 수정하지 않는다 — 전생 메서드를 호출만 한다.
//   3) 동물상 27종이 전부 서로 다른 리딩을 낸다. 엔진의 profiles 는 11종만 덮고 나머지 16종은
//      같은 fallback 문장을 받으므로, 서사 레이어가 27종을 전부 커버해야 한다.
//   4) 전생 인연 궁합은 회당 5,000원(50코인) 유료로 남아 있고 공용 게이트를 경유한다.
//   5) 루트/public 사본이 동일하다.
//
// LLM 실호출 없음 — 전생 리딩은 전부 결정론적 테이블이라 mock 조차 필요 없다.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (p) => readFileSync(resolve(root, p), 'utf8');

// ── 1. 루트/public 사본 동기화 ──
assert.equal(read('PastLifeFaceUI.js'), read('public/PastLifeFaceUI.js'), 'PastLifeFaceUI.js: 루트와 public/ 사본이 동일해야 함');

const source = read('PastLifeFaceUI.js');
const physiognomy = read('PhysiognomyUI.js');
const registry = read('worker/lib/paid-feature-registry.js');

// ── 2. 격리 계약 ──
assert.match(source, /\(function initPastLifeFaceApp\(\)\s*\{/, 'PastLifeFaceUI 는 IIFE 로 감싸야 한다 (PhysiognomyUI 와 최상위 식별자 충돌 방지)');

// ── 3. 결제 계약: 궁합은 유료로 남는다 ──
assert.match(registry, /"physiognomy-pastlife-compatibility":\s*\{\s*cost:\s*50/, '전생 궁합 가격표 등록(50코인=5,000원)');
assert.match(registry, /PER_USE_PAID_FEATURE_KEY_LIST[\s\S]*?"physiognomy-pastlife-compatibility"/, '전생 궁합 회당결제 목록 등록');
assert.match(source, /featureKey:\s*['"]physiognomy-pastlife-compatibility['"]/, '전생 궁합은 공용 결제 게이트에 canonical featureKey 를 넘겨야 함');
assert.match(source, /window\._cdCoinGatePerUse\(/, '전생 궁합은 공용 게이트(_cdCoinGatePerUse)를 경유해야 함 — 커스텀 체크아웃 금지');

// ── 4. 관상 쪽은 전생을 더 이상 들고 있지 않다 ──
assert.doesNotMatch(physiognomy, /physiognomy-pastlife-compatibility/, '전생 궁합 게이트는 PhysiognomyUI 에서 제거되어 PastLifeFaceUI 로 이관되어야 함');
assert.doesNotMatch(physiognomy, /pastLifeCompatMode/, 'PhysiognomyUI 에 전생 궁합 모드 플래그가 남아있으면 안 됨');
assert.doesNotMatch(physiognomy, /showPastLifePhysiognomy|renderPastLifeResult|renderPastLifeCompatResult|startPastLifeCompatMode/, 'PhysiognomyUI 에 전생 렌더러/진입점이 남아있으면 안 됨');
assert.match(physiognomy, /openPastLifeFaceApp/, '관상 결과 화면에 전생 관상 유도 배너가 있어야 함');

// ── 5. 엔진 계약 ──
// 🔴 전생 기능이 그동안 동작하지 않던 진짜 원인: 엔진의 얼굴형 분류 메서드 이름은
//    classifyFaceShape 인데 전생 함수 2개가 존재하지 않는 analyzeFaceShape 를 부르고 있었다.
//    전생 리딩·전생 궁합이 호출 즉시 TypeError 로 죽었고, 궁합은 5,000원 결제 후에 죽었다.
//    같은 오타가 되살아나지 않게 여기서 막는다.
const engineSource = read('AnalysisEngine.js');
assert.match(engineSource, /classifyFaceShape\(features\)\s*\{/, '엔진의 얼굴형 분류 메서드는 classifyFaceShape 이다');
assert.doesNotMatch(engineSource, /this\.analyzeFaceShape\(/, '존재하지 않는 this.analyzeFaceShape 호출 금지 — 실제 이름은 classifyFaceShape');
assert.doesNotMatch(source, /\.analyzeFaceShape\(/, 'PastLifeFaceUI 도 classifyFaceShape 를 써야 함');
assert.match(engineSource, /calculatePastLifePhysiognomy\(result\)\s*\{/, '엔진의 전생 메서드는 그대로 유지되어야 함');
assert.match(engineSource, /calculatePastLifeCompatibility\(result1, result2\)\s*\{/, '엔진의 전생 궁합 메서드는 그대로 유지되어야 함');

// ── 6. jsdom 실렌더 ──
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'https://code-destiny.com/' });
const { window } = dom;
window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

const context = vm.createContext(window);
const runScript = (file) => vm.runInContext(read(file), context, { filename: file });

// PhysiognomyUI 를 사이에 끼워 "같은 페이지 동시 로드"를 실제로 재현한다.
runScript('AnalysisEngine.js');
runScript('PhysiognomyUI.js');
runScript('PastLifeFaceUI.js');

const engine = window.faceAnalysisEngine;
await engine.loadDatabase();
const animals = engine.animalDb.animals;
assert.ok(animals.length >= 20, `동물상 DB 가 비정상적으로 작음 (${animals.length}종)`);

const seedFor = (animal, features) => ({
  primaryAnimal: animal.name,
  emoji: animal.emoji,
  extractedFeatures: features,
});

const FACE_CASES = [
  { label: 'round/upper', faceRatio: 0.88, chinLength: 0.30, samjung: { upper: 0.40, middle: 0.32, lower: 0.28 } },
  { label: 'long/middle', faceRatio: 0.74, chinLength: 0.35, samjung: { upper: 0.28, middle: 0.40, lower: 0.32 } },
  { label: 'square/lower', faceRatio: 0.84, chinLength: 0.38, samjung: { upper: 0.28, middle: 0.32, lower: 0.40 } },
];

// 6-1. seed 핸드오프 → 사진 재업로드 없이 결과 직행
window.openPastLifeFaceApp({ seed: seedFor(animals[0], FACE_CASES[0]) });
const app = window.document.getElementById('pastlife-face-app');
assert.ok(app, '모달이 마운트되어야 함');
assert.equal(app.style.display, 'flex', '모달이 열려야 함');
assert.ok(
  window.document.getElementById('plfStageReveal').classList.contains('is-active'),
  'seed 를 주면 업로드를 건너뛰고 결과 화면으로 직행해야 함 (관상 → 전생 핸드오프)',
);

// 6-2. 리딩 구성 요소가 전부 렌더되는가
const revealText = window.document.getElementById('plfRevealBody').textContent;
for (const marker of [
  '전생의 문이 열렸습니다',
  '전생 기억의 선명도',
  '이번 생 숙제 진행도',
  '전생의 자리',
  '업(業)으로 남은 것',
  '미완의 약속',
  '전생이 스치는 순간',
  '이번 생의 과제',
  '전생이 남긴 부적',
  '전생 인연 궁합',
]) {
  assert.ok(revealText.includes(marker), `리딩 섹션 누락: ${marker}`);
}
assert.ok(window.document.getElementById('plfCompatBtn'), '전생 인연 궁합 CTA 가 렌더되어야 함');

// 6-3. 27종 × 3 얼굴형이 전부 서로 다른 리딩을 내는가
const seen = new Map();
const collisions = [];
for (const animal of animals) {
  for (const faceCase of FACE_CASES) {
    window.openPastLifeFaceApp({ seed: seedFor(animal, faceCase) });
    const text = window.document.getElementById('plfRevealBody').textContent.trim();
    const label = `${animal.name}/${faceCase.label}`;
    if (seen.has(text)) collisions.push(`${label} === ${seen.get(text)}`);
    else seen.set(text, label);
  }
}
assert.equal(
  collisions.length,
  0,
  `동물상별 전생 리딩이 중복됨 (${collisions.length}건). 서사 레이어가 27종을 전부 덮어야 한다:\n  ${collisions.join('\n  ')}`,
);

// 6-4. seed 없이 열면 문 앞 화면, 문구는 솔로 기본값
window.openPastLifeFaceApp();
assert.ok(window.document.getElementById('plfStageGate').classList.contains('is-active'), 'seed 없이 열면 문 앞 화면이어야 함');
assert.match(window.document.getElementById('plfGateLine').textContent, /마지막 문장/, '문 앞 문구가 솔로 기본값으로 복구되어야 함');
assert.match(window.document.getElementById('plfPickBtn').textContent, /전생의 문 열기/, 'CTA 문구가 솔로 기본값으로 복구되어야 함');

// 6-5. 닫기
window.closePastLifeFaceApp();
assert.equal(app.style.display, 'none', '닫기가 동작해야 함');

console.log(`[verify-past-life-face] PASS — 동물상 ${animals.length}종 × 얼굴형 ${FACE_CASES.length}종 = ${animals.length * FACE_CASES.length}개 조합 전부 고유, 관상 동시 로드 충돌 없음`);
