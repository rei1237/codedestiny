// 전생 관상(PastLifeFaceUI.js) 회귀 검증 — jsdom 실렌더 기반
//
// 이 기능은 관상(PhysiognomyUI.js)에서 분리해 나온 무료 독립 모달이다. 여기서 지키는 계약:
//   1) PhysiognomyUI.js 와 함께 로드해도 최상위 식별자가 충돌하지 않는다.
//      (PhysiognomyUI 는 IIFE 없이 `let faceMesh` 등을 최상위에 선언하는 클래식 스크립트라,
//       새 파일이 IIFE 를 잃으면 두 파일이 같이 로드되는 순간 SyntaxError 로 페이지가 죽는다)
//   2) AnalysisEngine.js 를 수정하지 않는다 — 전생 메서드를 호출만 한다.
//   3) 🔴 동물상은 전생 신분을 결정하지 않는다 (2026-08 리뉴얼의 정의).
//      신분은 얼굴 기하가 정하고 동물은 "전생 수호령"으로만 등장한다. 아래 6-3 이 이걸 강제한다.
//      예전에는 PLF_LIVES[animalId] 가 신분을 1:1로 정해서 "전생 관상 = 동물상"이 되어 있었다.
//   4) 동물상 27종이 전부 서로 다른 리딩을 낸다(수호령·징후·부적·게이지가 갈린다).
//   5) 전생 인연 궁합은 회당 5,000원(50코인) 유료로 남아 있고 공용 게이트를 경유한다.
//      결제 후 뜨는 화면이므로 렌더까지 실제로 확인한다(6-6).
//   6) 루트/public 사본이 동일하다.
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

// ── 2-1. 얼굴 감지 계약 (2026-08-08 NO_FACE_FOUND 장애) ──
// 관상은 카메라 모드가 매 프레임 send() 를 돌려 그래프를 데우지만, 전생은 업로드 전용이라
// 첫 추론이 cold graph 로 들어가 프레임째 버려졌다. 예열 + 콜백 resolve + 1회 재시도가 그 방어다.
assert.match(source, /plfFaceMesh\.onResults\(function \(results\) \{[\s\S]{0,240}?resolve\(/, '랜드마크는 onResults 콜백에서 resolve 해야 한다 — send() resolve 뒤 공유 변수를 읽으면 콜백 순서가 뒤집힐 때 빈 값을 읽는다');
assert.match(source, /async function plfWarmUpFaceMesh\(\)/, 'cold graph 첫 프레임 유실을 막는 예열 함수가 있어야 한다');
assert.match(source, /await plfWarmUpFaceMesh\(\);/, '엔진 기동 직후 예열을 실행해야 한다');
assert.doesNotMatch(source, /\bplfLandmarks\b/, '공유 변수 기반 랜드마크 전달은 제거되어야 한다 (경쟁 조건의 원인)');
assert.match(source, /if \(!landmarks\) \{[\s\S]{0,400}?plfResetFaceMeshRuntime\(\)/, '첫 추론이 비면 런타임을 리셋하고 1회 재시도해야 한다');

// ── 2-2. UI 구조 계약 (관상의 고급 장치 이식) ──
assert.match(source, /class="plf-dossier plf-reveal-item"/, '결과 상단에 도시에 메타 슬랩이 있어야 한다');
assert.match(source, /PAST LIFE DOSSIER/, '도시에 킥커가 있어야 한다');
// 공유 카드는 html2canvas 캡처 대상이라 처음부터 전부 렌더돼 있어야 한다.
// 스크롤 공개로 늦게 채우면 빈 카드가 찍힌다(master-love-codex 의 CodexReveal 에 같은 사고가 기록돼 있다).
assert.match(source, /function plfShareCardHtml\(reading\)/, '공유용 전생 프로필 카드 빌더가 있어야 한다');
assert.doesNotMatch(source, /plf-sharecard[^\n]*plf-reveal-item/, '공유 카드에 등장 애니메이션 클래스를 붙이면 안 된다 — 캡처 시 빈 카드가 찍힌다');
assert.match(source, /typeof window\.cdShareResultCardImage === 'function'/, '공유는 js/share.js 존재를 확인하고 써야 한다 (지연 로더라 보장되지 않는다)');
assert.match(source, /function plfShareText\(\)/, '이미지 공유 실패 시 텍스트 공유 폴백이 있어야 한다');
assert.match(source, /<details class="plf-chapter plf-reveal-item" id="plfChapter-/, '장(章)은 details 아코디언이어야 한다');
assert.match(source, /plf-chapter__index/, '장 번호 뱃지가 있어야 한다');
assert.match(source, /function plfBindChapterNav\(chapters\)/, '칩 네비 ↔ 아코디언 연동 배선이 있어야 한다');
assert.match(source, /details\.addEventListener\('toggle'/, '아코디언을 직접 펼쳐도 칩이 따라오는 역방향 연동이 있어야 한다');
assert.match(source, /function plfShowPreviewSkeleton\(show\)/, '사진 디코드 전 shimmer 스켈레톤이 있어야 한다');
assert.match(source, /plfLongWaitTimer = setTimeout/, '30초 지연 안내가 있어야 한다');
assert.match(source, /plfVeryLongWaitTimer = setTimeout/, '60초 지연 안내 + 재시도 노출이 있어야 한다');
// 모션은 기본 노출을 해치면 안 된다 — 전환이 안 뛰면 콘텐츠가 빈 채로 남는다.
assert.match(source, /@media \(prefers-reduced-motion: no-preference\)\{/, '등장 애니메이션은 모션 허용 환경에서만 얹어야 한다');

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

// 유료 궁합 렌더러는 공개 API 로 도달할 수 없다(결제 게이트 → 파일 업로드 → MediaPipe 가 필요).
// 검증 전용으로 IIFE 마지막에 내부 함수를 노출시켜 실렌더까지 확인한다.
// 프로덕션 소스는 그대로 두고 이 스크립트 안에서만 변형한다.
const TEST_HOOK = `window.__plfTestHooks = { buildReading: plfBuildReading, renderCompat: plfRenderCompatResult };\n})();`;
const plfSource = source.replace(/\}\)\(\);\s*$/, TEST_HOOK);
assert.notEqual(plfSource, source, '검증용 훅 주입에 실패했다 — PastLifeFaceUI.js 의 IIFE 종료 형태가 바뀌었는지 확인할 것');
vm.runInContext(plfSource, context, { filename: 'PastLifeFaceUI.js' });

const engine = window.faceAnalysisEngine;
await engine.loadDatabase();
const animals = engine.animalDb.animals;
assert.ok(animals.length >= 20, `동물상 DB 가 비정상적으로 작음 (${animals.length}종)`);

const seedFor = (animal, features) => ({
  primaryAnimal: animal.name,
  emoji: animal.emoji,
  extractedFeatures: features,
});

// 얼굴형(4) × 삼정 우세(3) 를 실제로 그 분류로 떨어지게 만드는 수치 조합.
// classifyFaceShape 의 가중치를 그대로 계산해 맞춘 값이라 임의로 바꾸면 분류가 흔들린다.
const SHAPE_CASES = [
  { label: 'round/upper',    faceRatio: 0.88, chinLength: 0.30, samjung: { upper: 0.40, middle: 0.32, lower: 0.28 } },
  { label: 'round/middle',   faceRatio: 0.88, chinLength: 0.30, samjung: { upper: 0.30, middle: 0.40, lower: 0.30 } },
  { label: 'round/lower',    faceRatio: 0.88, chinLength: 0.32, samjung: { upper: 0.28, middle: 0.32, lower: 0.40 } },
  { label: 'square/upper',   faceRatio: 0.84, chinLength: 0.38, samjung: { upper: 0.40, middle: 0.32, lower: 0.28 } },
  { label: 'square/middle',  faceRatio: 0.84, chinLength: 0.38, samjung: { upper: 0.29, middle: 0.41, lower: 0.30 } },
  { label: 'square/lower',   faceRatio: 0.84, chinLength: 0.38, samjung: { upper: 0.28, middle: 0.32, lower: 0.40 } },
  { label: 'long/upper',     faceRatio: 0.74, chinLength: 0.35, samjung: { upper: 0.40, middle: 0.32, lower: 0.28 } },
  { label: 'long/middle',    faceRatio: 0.74, chinLength: 0.35, samjung: { upper: 0.28, middle: 0.40, lower: 0.32 } },
  { label: 'long/lower',     faceRatio: 0.74, chinLength: 0.35, samjung: { upper: 0.28, middle: 0.33, lower: 0.39 } },
  { label: 'triangle/upper', faceRatio: 0.82, chinLength: 0.28, samjung: { upper: 0.40, middle: 0.32, lower: 0.28 } },
  { label: 'triangle/middle',faceRatio: 0.82, chinLength: 0.28, samjung: { upper: 0.33, middle: 0.39, lower: 0.28 } },
  { label: 'triangle/lower', faceRatio: 0.79, chinLength: 0.28, samjung: { upper: 0.30, middle: 0.31, lower: 0.39 } },
];

// 신분 레인(0·1·2) = 코 너비 · 입 크기 · 귀 길이의 합산 구간. 12 × 3 = 36 신분 전수 커버.
const LANE_CASES = [
  { label: 'lane0', noseWidthRatio: 0.80, mouthRatio: 1.20, earRatio: 0.14 },
  { label: 'lane1', noseWidthRatio: 0.90, mouthRatio: 1.35, earRatio: 0.18 },
  { label: 'lane2', noseWidthRatio: 0.98, mouthRatio: 1.50, earRatio: 0.22 },
];

const FACE_CASES = SHAPE_CASES.flatMap((shape) =>
  LANE_CASES.map((lane) => ({ ...shape, ...lane, label: `${shape.label}/${lane.label}` })),
);

const roleOf = () => window.document.querySelector('.plf-sharecard__role').textContent.trim();
const guardianOf = () => window.document.querySelector('.plf-sharecard__guardian').textContent.trim();

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
  '얼굴의 첫인상',
  '전생의 신분',
  '전생의 사건',
  '전생 수호령',
  '현생의 흔적',
  '전생이 스치는 순간',
  '전생이 남긴 부적',
  '전생을 더 깊게 열어보기',
]) {
  assert.ok(revealText.includes(marker), `리딩 섹션 누락: ${marker}`);
}
assert.ok(window.document.getElementById('plfCompatBtn'), '전생 인연 궁합 CTA 가 렌더되어야 함');

// 6-2a. 공유 카드 + 유형 분류 배지
const shareCard = window.document.getElementById('plfShareCard');
assert.ok(shareCard, '공유용 전생 프로필 카드가 렌더되어야 함');
for (const selector of ['.plf-sharecard__role', '.plf-sharecard__guardian', '.plf-sharecard__traits', '.plf-sharecard__tag']) {
  assert.ok(shareCard.querySelector(selector), `공유 카드 구성 누락: ${selector}`);
}
const tierBadge = window.document.querySelector('.plf-tier__label');
assert.ok(tierBadge, '유형 분류 배지가 렌더되어야 함');
assert.match(
  tierBadge.textContent.trim(),
  /^(COMMON|UNCOMMON|RARE|EPIC|LEGENDARY|MYTHIC)$/,
  `유형 분류 라벨이 정의된 6등급 밖이다: ${tierBadge.textContent}`,
);
// 확률 표기는 "임의로 조작했다"는 인상을 준다. 어디에도 %를 적지 않는다.
assert.doesNotMatch(revealText, /\d+(\.\d+)?\s*%/, '결과 화면에 확률(%) 표기가 있으면 안 된다 — 유형 분류는 관상 분석 결과일 뿐이다');

// 6-2d. 심화 CTA 5장 — 신규 유료 기능이 아니라 기존 기능으로 인계한다
const ctaNodes = window.document.querySelectorAll('[data-plf-cta]');
assert.equal(ctaNodes.length, 5, `심화 CTA 는 5장이어야 함 (실제 ${ctaNodes.length})`);
assert.equal(ctaNodes[0].id, 'plfCompatBtn', '첫 CTA 는 이 모달 안의 유료 전생 인연 궁합이어야 함');

// 6-2b. 도시에 슬랩 + 6장 아코디언 + 칩 네비가 실제로 붙는가
assert.ok(window.document.querySelector('.plf-dossier'), '도시에 메타 슬랩이 렌더되어야 함');
const chapterNodes = window.document.querySelectorAll('.plf-chapter');
assert.equal(chapterNodes.length, 6, `장(章)은 6개여야 함 (실제 ${chapterNodes.length})`);
const chipNodes = window.document.querySelectorAll('.plf-chip');
assert.equal(chipNodes.length, 6, `칩은 장 수와 같아야 함 (실제 ${chipNodes.length})`);
// 리딩이 하나의 이야기라 중간을 접으면 스크롤만으로 안 읽힌다. 참조표인 마지막 장(부적)만 접는다.
assert.equal(
  Array.prototype.filter.call(chapterNodes, (node) => node.open).length,
  5,
  '마지막 장(부적)을 뺀 5장은 기본으로 펼쳐져 있어야 함 — 서사가 스크롤만으로 이어져야 한다',
);
assert.equal(chapterNodes[5].open, false, '마지막 장(부적)은 접혀 있어야 함');
assert.equal(chipNodes[0].getAttribute('aria-pressed'), 'true', '첫 칩이 활성 상태여야 함');

// 6-2c. 칩 클릭 → 해당 장이 열리고 칩이 활성화되는가 (양방향 연동)
const lastChapter = chapterNodes[5];
assert.equal(lastChapter.open, false, '마지막 장은 접혀 있어야 함');
chipNodes[5].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert.equal(lastChapter.open, true, '칩을 누르면 해당 장이 열려야 함');
assert.equal(chipNodes[5].getAttribute('aria-pressed'), 'true', '누른 칩이 활성화되어야 함');
assert.equal(chipNodes[0].getAttribute('aria-pressed'), 'false', '이전 활성 칩은 해제되어야 함');

// 역방향: 아코디언을 직접 열면 칩이 따라온다
chapterNodes[4].open = true;
chapterNodes[4].dispatchEvent(new window.Event('toggle'));
assert.equal(chipNodes[4].getAttribute('aria-pressed'), 'true', '장을 직접 펼치면 칩이 따라와야 함');

// ── 6-3. 🔴 이번 리뉴얼의 정의: 동물상은 전생 신분을 결정하지 않는다 ──
// (a) 같은 얼굴 + 다른 동물 → 신분은 같고 수호령만 달라진다
const fixedFace = FACE_CASES[0];
const rolesForOneFace = new Set();
const guardiansForOneFace = new Set();
for (const animal of animals) {
  window.openPastLifeFaceApp({ seed: seedFor(animal, fixedFace) });
  rolesForOneFace.add(roleOf());
  guardiansForOneFace.add(guardianOf());
}
assert.equal(
  rolesForOneFace.size,
  1,
  `같은 얼굴이면 동물상이 달라도 전생 신분은 하나여야 한다 (실제 ${rolesForOneFace.size}종: ${[...rolesForOneFace].join(', ')}).\n` +
    '동물상이 신분을 결정하는 옛 구조로 되돌아갔는지 확인할 것 — PastLifeFaceUI.js 의 plfBuildReading 참조.',
);
assert.equal(
  guardiansForOneFace.size,
  animals.length,
  `수호령은 동물상 27종이 전부 달라야 한다 (실제 ${guardiansForOneFace.size}종)`,
);

// (b) 얼굴이 다르면 신분이 달라진다 — 얼굴형 12 × 레인 3 = 36 신분 전수 커버
const sampleAnimal = animals[0];
const rolesByFace = new Map();
for (const faceCase of FACE_CASES) {
  window.openPastLifeFaceApp({ seed: seedFor(sampleAnimal, faceCase) });
  const role = roleOf();
  if (rolesByFace.has(role)) {
    assert.fail(`서로 다른 얼굴이 같은 전생 신분을 냈다: ${faceCase.label} === ${rolesByFace.get(role)} (${role})`);
  }
  rolesByFace.set(role, faceCase.label);
}
assert.equal(rolesByFace.size, 36, `전생 신분 풀은 36종이어야 함 (실제 도달 ${rolesByFace.size}종)`);

// 6-4. 27종 × 36 얼굴 조합이 전부 서로 다른 리딩을 내는가
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
  `전생 리딩이 중복됨 (${collisions.length}건). 서사 레이어가 27종 × 36 얼굴을 전부 덮어야 한다:\n  ${collisions.join('\n  ')}`,
);

// ── 6-5. 유료 궁합(5,000원) 실렌더 — 결제 후 빈 화면이 되는 회귀를 막는다 ──
const { buildReading, renderCompat } = window.__plfTestHooks;
const meSeed = seedFor(animals[0], FACE_CASES[0]);
const youSeed = seedFor(animals[5], FACE_CASES[20]);
const compat = engine.calculatePastLifeCompatibility(meSeed, youSeed);
assert.ok(compat && compat.sections, '엔진의 궁합 계산이 살아 있어야 함');
renderCompat(compat, buildReading(meSeed), buildReading(youSeed));

const compatText = window.document.getElementById('plfRevealBody').textContent;
for (const marker of [
  '전생 인연 궁합',
  '전생에서 두 사람은',
  '두 사람의 사건이 겹친 지점',
  '두 수호령이 함께 있을 때',
  '이번 생에 다시 만난 이유',
  '이번 생의 관계 미션',
]) {
  assert.ok(compatText.includes(marker), `궁합 리딩 섹션 누락: ${marker}`);
}
// 점수·게이지는 엔진 값을 그대로 통과시켜야 한다 — 사용자가 5,000원을 내고 산 수치다.
assert.ok(compatText.includes(String(compat.score)), '궁합 점수는 엔진 값 그대로 렌더되어야 함');
assert.equal(
  window.document.querySelectorAll('.plf-gauge').length,
  compat.metrics.length,
  '궁합 5축 게이지가 전부 렌더되어야 함',
);
assert.equal(window.document.querySelectorAll('.plf-chapter').length, 5, '궁합은 5장이어야 함');
assert.ok(compatText.trim().length > 600, '궁합 결과가 비정상적으로 짧다 — 서사 조립이 깨졌는지 확인할 것');

// 6-6. seed 없이 열면 문 앞 화면, 문구는 솔로 기본값
window.openPastLifeFaceApp();
assert.ok(window.document.getElementById('plfStageGate').classList.contains('is-active'), 'seed 없이 열면 문 앞 화면이어야 함');
assert.match(window.document.getElementById('plfGateLine').textContent, /마지막 문장/, '문 앞 문구가 솔로 기본값으로 복구되어야 함');
assert.match(window.document.getElementById('plfPickBtn').textContent, /전생의 문 열기/, 'CTA 문구가 솔로 기본값으로 복구되어야 함');

// 6-7. 닫기
window.closePastLifeFaceApp();
assert.equal(app.style.display, 'none', '닫기가 동작해야 함');

console.log(
  `[verify-past-life-face] PASS — 전생 신분 ${rolesByFace.size}종(동물 무관) × 수호령 ${guardiansForOneFace.size}종, ` +
    `${animals.length * FACE_CASES.length}개 조합 전부 고유, 유료 궁합 실렌더 통과, 관상 동시 로드 충돌 없음`,
);
