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
//   4-a) 🔴 수호령은 3령 무리다 (2026-08 3차 개편). 엔진이 주는 top3 를 주령/곁령/그림자령에 배치하고
//        세 슬롯이 서로 다른 동물이어야 한다. 6-3a 가 이걸 강제한다 — top3 를 다시 버리면 걸린다.
//   4-b) 분량 하한: 솔로 3,000자 / 궁합 1,800자. 서사 필드를 떼거나 장면을 합치면 걸린다.
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

// ── 2-2. UI 구조 계약 (2026-08 2차 개편: 리포트 → 전생 영화) ──
// 예전 구조(도시에 슬랩 + 칩 네비 + <details> 아코디언)로 되돌아가면 "관상 보고서"로 다시 읽힌다.
assert.doesNotMatch(source, /<details class="plf-chapter/, '결과는 아코디언이 아니라 장면(scene)이어야 한다');
assert.doesNotMatch(source, /class="plf-dossier/, '도시에 슬랩은 제거되어야 한다 — 리포트 잔재');
assert.doesNotMatch(source, /class="plf-chip"/, '칩 네비는 제거되어야 한다 — 리포트 잔재');
assert.match(source, /function plfBuildScenes\(reading\)/, '장면 빌더가 있어야 한다');
assert.match(source, /data-plf-scene="/, '장면에 data-plf-scene 이 붙어야 한다');
assert.match(source, /function plfBindSceneReveal\(\)/, '스크롤 공개 배선이 있어야 한다');

// 🔴 히어로에 사진을 다시 깔지 못하게 막는다.
// 예전 R2 아트(관상 전생.webp)는 alt 와 달리 동물 그림이라 "전생 관상 = 동물상" 오해를 재생산했다.
assert.doesNotMatch(source, /const PLF_HERO_IMAGE/, '히어로 사진 상수를 되살리지 말 것 — 달·문·별은 CSS 로 그린다');
assert.doesNotMatch(source, /assets\.code-destiny\.com/, '전생 관상은 외부 이미지 자산을 쓰지 않는다');
assert.doesNotMatch(source, /class="plf-hero__img"/, '히어로에 <img> 를 되살리지 말 것');
assert.match(source, /\.plf-hero__portal\{/, 'CSS 아치문이 있어야 한다');
assert.match(source, /\.plf-hero__stars\{/, 'CSS 별밭이 있어야 한다');
for (const shell of ['index.html', 'public/index.html', 'public/static/index.html']) {
  assert.doesNotMatch(
    read(shell),
    /%EA%B4%80%EC%83%81%20%EC%A0%84%EC%83%9D/,
    `${shell}: 전생 관상 타일/상세모달에서 동물 아트 참조가 제거되어야 한다`,
  );
}

// 🔴 스크롤 공개가 콘텐츠를 영영 숨기는 경로를 만들지 않는다 (이 프로젝트가 이미 겪은 사고).
//    숨김(opacity:0)은 반드시 prefers-reduced-motion: no-preference 블록 안에만 있어야 하고,
//    IntersectionObserver 가 없으면 전부 펼쳐야 한다.
const motionBlock = source.slice(source.indexOf("@media (prefers-reduced-motion: no-preference){"));
assert.match(motionBlock, /\.plf-scene\{opacity:0/, '장면 숨김은 모션 허용 블록 안에 있어야 한다');
assert.doesNotMatch(
  source.slice(0, source.indexOf("@media (prefers-reduced-motion: no-preference){")),
  /\.plf-scene\{[^}]*opacity:0/,
  '장면 숨김을 모션 블록 밖에 두면 모션을 끈 사용자에게 빈 화면이 된다',
);
assert.match(source, /typeof window\.IntersectionObserver !== 'function'/, 'IntersectionObserver 부재 시 전부 펼치는 폴백이 있어야 한다');

// 공유 카드 — 봉인 상태로 시작하되 캡처 직전에는 반드시 풀린다.
assert.match(source, /function plfShareCardHtml\(reading\)/, '공유용 전생 프로필 카드 빌더가 있어야 한다');
assert.match(source, /function plfUnsealShareCard\(\)/, '봉인 해제 함수가 있어야 한다');
assert.match(
  source,
  /function plfShare\(\) \{[\s\S]{0,320}?plfUnsealShareCard\(\);/,
  '🔴 plfShare 는 캡처 전에 무조건 봉인을 풀어야 한다 — 봉인된 카드가 PNG 로 찍히면 안 된다',
);
assert.match(source, /typeof window\.cdShareResultCardImage === 'function'/, '공유는 js/share.js 존재를 확인하고 써야 한다 (지연 로더라 보장되지 않는다)');
assert.match(source, /function plfShareText\(\)/, '이미지 공유 실패 시 텍스트 공유 폴백이 있어야 한다');

assert.match(source, /function plfShowPreviewSkeleton\(show\)/, '사진 디코드 전 shimmer 스켈레톤이 있어야 한다');
assert.match(source, /plfLongWaitTimer = setTimeout/, '30초 지연 안내가 있어야 한다');
assert.match(source, /plfVeryLongWaitTimer = setTimeout/, '60초 지연 안내 + 재시도 노출이 있어야 한다');

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

// 얼굴형 × 삼정 우세를 실제로 그 분류로 떨어지게 만드는 수치 조합.
//
// 🔴 chinLength 는 반드시 samjung.lower 와 같아야 한다.
//    AnalysisEngine.js 에서 두 값은 문자 그대로 같은 식(lower_len / total_samjung)이다.
//    예전 케이스들은 이 둘을 서로 다른 값으로 넣어(예: chin 0.30 / lower 0.28) "60종 전부 도달"을
//    통과시켰는데, 그 입력은 실제로는 존재할 수 없었다. 그래서 가드가 초록인 동안
//    프로덕션에서는 실사진의 62.5% 가 도장의 장인(square:lower:3) 하나로 떨어지고 있었다.
//    아래 assert 가 그 제약을 코드로 못 박는다.
//
// 아래 값들은 손으로 맞춘 게 아니라 실제 판정기를 격자 탐색해 뽑았다.
const SHAPE_CASES = [
  { label: 'round/upper',     faceRatio: 0.80, samjung: { upper: 0.310, middle: 0.290, lower: 0.400 } },
  { label: 'round/middle',    faceRatio: 0.80, samjung: { upper: 0.290, middle: 0.305, lower: 0.405 } },
  { label: 'round/lower',     faceRatio: 0.80, samjung: { upper: 0.305, middle: 0.290, lower: 0.405 } },
  { label: 'square/upper',    faceRatio: 0.83, samjung: { upper: 0.320, middle: 0.270, lower: 0.410 } },
  { label: 'square/middle',   faceRatio: 0.83, samjung: { upper: 0.260, middle: 0.315, lower: 0.425 } },
  { label: 'square/lower',    faceRatio: 0.80, samjung: { upper: 0.260, middle: 0.280, lower: 0.460 } },
  { label: 'long/upper',      faceRatio: 0.68, samjung: { upper: 0.310, middle: 0.290, lower: 0.400 } },
  { label: 'long/middle',     faceRatio: 0.68, samjung: { upper: 0.260, middle: 0.315, lower: 0.425 } },
  { label: 'long/lower',      faceRatio: 0.68, samjung: { upper: 0.260, middle: 0.280, lower: 0.460 } },
  { label: 'triangle/upper',  faceRatio: 0.68, samjung: { upper: 0.330, middle: 0.305, lower: 0.365 } },
  { label: 'triangle/middle', faceRatio: 0.68, samjung: { upper: 0.315, middle: 0.320, lower: 0.365 } },
  // 🔴 triangle/lower 는 없다 — 논리적으로 불가능하다.
  //    classifyFaceShape 의 역삼각형 판정은 상정이 하정보다 길 것(sj.upper > sj.lower + 0.04)과
  //    짧은 턱(chin <= 0.30, 즉 하정이 짧을 것)을 요구한다. 하정이 우세이면서 역삼각형일 수 없다.
  //    따라서 PLF_ROLES 의 'triangle:lower:0'~':4' 5종은 어떤 얼굴로도 도달하지 않는다.
  //    (내용을 살리려면 그 5종을 도달 가능한 칸으로 다시 키잉해야 하는데 그건 콘텐츠 결정이다)
].map((c) => Object.assign({}, c, { chinLength: c.samjung.lower }));

for (const c of SHAPE_CASES) {
  assert.equal(
    c.chinLength,
    c.samjung.lower,
    `${c.label}: chinLength 와 samjung.lower 는 엔진에서 같은 식이므로 케이스도 같아야 한다`,
  );
  const sum = c.samjung.upper + c.samjung.middle + c.samjung.lower;
  assert.ok(Math.abs(sum - 1) < 1e-9, `${c.label}: 삼정 합이 1 이어야 한다 (실제 ${sum})`);
}

// 신분 레인(0~4) = 코 너비 · 입 크기 · 미간 넓이의 합산 구간.
// 🔴 세 번째 축이 earRatio 에서 eyeDistRatio 로 바뀌었다 — earHeight 는 랜드마크 127/132,
//    둘 다 얼굴 윤곽선 위의 점이라 사람이 달라도 0.20~0.30 에 머무는 상수였다(정보량 0).
// 얼굴형·삼정 11조합 × 레인 5 = 55 신분 전수 커버.
const LANE_CASES = [
  { label: 'lane0', noseWidthRatio: 0.76, mouthRatio: 1.05, eyeDistRatio: 0.90 },
  { label: 'lane1', noseWidthRatio: 0.76, mouthRatio: 1.05, eyeDistRatio: 1.16 },
  { label: 'lane2', noseWidthRatio: 0.76, mouthRatio: 1.31, eyeDistRatio: 1.16 },
  { label: 'lane3', noseWidthRatio: 0.76, mouthRatio: 1.43, eyeDistRatio: 1.16 },
  { label: 'lane4', noseWidthRatio: 0.90, mouthRatio: 1.43, eyeDistRatio: 1.16 },
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
  'SCENE 01',
  '얼굴의 첫인상',
  '전생의 문 너머',
  '전생의 당신은',
  '전생의 하루',
  '그날의 사건',
  '그리고 당신의 마지막은',
  '전생 수호령',
  '주(主) 수호령',
  '곁을 지킨 령',
  '길들이지 못한 그림자',
  '무리의 이름',
  '그래서 지금의 나는',
  '전생이 스치는 순간',
  '전생이 남긴 부적',
  '관상 근거',
  '전생 기억의 선명도',
  '전생을 더 깊게 열어보기',
]) {
  assert.ok(revealText.includes(marker), `리딩 구성 누락: ${marker}`);
}

// 🔴 분량 회귀 방지 (2026-08 3차 개편). 개편 전 실측이 약 1,200자였고 개편 후가 3,400자대다.
//    테이블에서 필드를 떼거나 장면을 도로 합치면 여기서 걸린다.
const revealLength = revealText.replace(/\s+/g, ' ').trim().length;
// 2026-08-13 4차 개편에서 공통 서사 레이어 7종(전조·인연·유물·계절·미완·반복·평판, 94항목)을
// 더해 3,365자 → 3,865자가 됐다. 신분 표에 필드를 더 쓰지 않고 신분과 독립인 축의 해시로 뽑으므로,
// 같은 신분이 나와도 글이 갈린다("늘 같은 글"로 읽히던 문제).
assert.ok(
  revealLength >= 3700,
  `전생 리딩 분량이 3,700자 미만이다 (실제 ${revealLength}자). 서사 필드(standing/day/epitaph/aftermath/detail/origin)나 공통 레이어(omen/bond/relic/season/unfinished/recurrence/reputation)가 떨어져 나갔는지 확인할 것.`,
);

// 🔴 관상 근거는 서사가 아니라 신뢰 장치다 — 장면마다 한 번씩, 최소 5개 이상 붙어야 한다.
assert.ok(
  window.document.querySelectorAll('.plf-evidence').length >= 5,
  `관상 근거 각주가 부족하다 (실제 ${window.document.querySelectorAll('.plf-evidence').length}개). 서사가 어디서 나왔는지 되짚어 주지 않으면 "그럴듯한 소설"로 읽힌다.`,
);
assert.ok(window.document.getElementById('plfCompatBtn'), '전생 인연 궁합 CTA 가 렌더되어야 함');

// 6-2a. 장면 6개 — 리포트 잔재(아코디언/칩/도시에)가 DOM 에 없어야 한다
const sceneNodes = window.document.querySelectorAll('[data-plf-scene]');
assert.equal(sceneNodes.length, 9, `장면은 9개여야 함 (실제 ${sceneNodes.length})`);
for (const legacy of ['details.plf-chapter', '.plf-chip', '.plf-dossier']) {
  assert.equal(
    window.document.querySelectorAll(legacy).length,
    0,
    `리포트 잔재가 남아있음: ${legacy} — 결과는 장면 기반이어야 한다`,
  );
}
// jsdom 에는 IntersectionObserver 가 없다 → 폴백이 전 장면을 열어야 한다.
assert.equal(
  Array.prototype.filter.call(sceneNodes, (n) => n.classList.contains('is-revealed')).length,
  sceneNodes.length,
  'IntersectionObserver 가 없는 환경에서는 전 장면이 즉시 열려야 함 (콘텐츠가 숨은 채 남으면 안 된다)',
);

// 6-2b. 공유 카드 — 봉인 마크가 DOM 에 있고, 내용도 처음부터 전부 들어 있어야 한다
const shareCard = window.document.getElementById('plfShareCard');
assert.ok(shareCard, '공유용 전생 프로필 카드가 렌더되어야 함');
assert.ok(shareCard.querySelector('.plf-sharecard__seal'), '봉인 레이어가 있어야 함');
for (const selector of ['.plf-sharecard__role', '.plf-sharecard__guardian', '.plf-sharecard__traits', '.plf-sharecard__tag']) {
  assert.ok(shareCard.querySelector(selector), `공유 카드 구성 누락: ${selector}`);
}
assert.ok(
  shareCard.classList.contains('is-unsealed'),
  'IntersectionObserver 가 없는 환경에서는 카드가 처음부터 열려 있어야 함',
);

// 6-2c. 유형 분류 — 확률은 어디에도 적지 않는다
const tierBadge = window.document.querySelector('.plf-sharecard__tier');
assert.ok(tierBadge, '유형 분류 표기가 렌더되어야 함');
assert.match(
  tierBadge.textContent.trim(),
  /^(COMMON|UNCOMMON|RARE|EPIC|LEGENDARY|MYTHIC) · /,
  `유형 분류 라벨이 정의된 6등급 밖이다: ${tierBadge.textContent}`,
);
assert.doesNotMatch(revealText, /\d+(\.\d+)?\s*%/, '결과 화면에 확률(%) 표기가 있으면 안 된다 — 유형 분류는 관상 분석 결과일 뿐이다');

// 6-2d. 심화 CTA 5장 — 신규 유료 기능이 아니라 기존 기능으로 인계한다
const ctaNodes = window.document.querySelectorAll('[data-plf-cta]');
assert.equal(ctaNodes.length, 5, `심화 CTA 는 5장이어야 함 (실제 ${ctaNodes.length})`);
assert.equal(ctaNodes[0].id, 'plfCompatBtn', '첫 CTA 는 이 모달 안의 유료 전생 인연 궁합이어야 함');

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

// ── 6-3a. 🔴 수호령 3령 무리 (2026-08 3차 개편) ──
// 예전에는 PLF_GUARDIANS[primaryAnimal] 하나만 써서 마지막 장이 "네 동물상은 여우야"의 재탕이었다.
// 지금은 엔진이 이미 주는 top3 를 주령/곁령/그림자령 세 슬롯에 배치한다.
const spiritNamesOf = () =>
  Array.prototype.map.call(
    window.document.querySelectorAll('.plf-spirit__name'),
    (n) => n.textContent.trim(),
  );

// (a) top3 가 없는 부분 시드 → 얼굴 해시 폴백으로도 3령이 전부 나오고 서로 겹치지 않는다
window.openPastLifeFaceApp({ seed: seedFor(animals[0], FACE_CASES[0]) });
const fallbackSpirits = spiritNamesOf();
assert.equal(fallbackSpirits.length, 3, `top3 없는 시드에서도 3령이 렌더돼야 함 (실제 ${fallbackSpirits.length}령)`);
assert.equal(
  new Set(fallbackSpirits).size,
  3,
  `3령은 서로 다른 동물이어야 함 — 해시 폴백의 충돌 회피가 깨졌다: ${fallbackSpirits.join(' / ')}`,
);

// (b) top3 가 있으면 곁령·그림자령이 실제로 2위·3위 동물을 따라간다
const withTop3 = {
  ...seedFor(animals[0], FACE_CASES[0]),
  top3: [{ animal: animals[0] }, { animal: animals[4] }, { animal: animals[11] }],
};
window.openPastLifeFaceApp({ seed: withTop3 });
const rankedSpirits = spiritNamesOf();
assert.equal(rankedSpirits.length, 3, 'top3 시드에서도 3령이 렌더돼야 함');
assert.equal(
  new Set(rankedSpirits).size,
  3,
  `3령은 서로 다른 동물이어야 함: ${rankedSpirits.join(' / ')}`,
);
assert.notDeepEqual(
  rankedSpirits,
  fallbackSpirits,
  '🔴 top3 를 줬는데 해시 폴백과 같은 무리가 나왔다 — 엔진이 주는 2·3위 동물을 다시 버리고 있다',
);
assert.ok(
  window.document.querySelector('.plf-pack__title').textContent.trim().length > 2,
  '무리 칭호(주령×곁령 기질축 조합)가 렌더돼야 함',
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
assert.equal(rolesByFace.size, 55, `도달 가능한 전생 신분은 55종이어야 함 (실제 도달 ${rolesByFace.size}종). 표에는 60종이 있지만 triangle:lower 5종은 논리적으로 불가능하다 — SHAPE_CASES 주석 참조`);

// 6-4. 27종 × 60 얼굴 조합이 전부 서로 다른 리딩을 내는가
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
  `전생 리딩이 중복됨 (${collisions.length}건). 서사 레이어가 27종 × 60 얼굴을 전부 덮어야 한다:\n  ${collisions.join('\n  ')}`,
);

// ── 6-4a. 🔴 실사진 대역 분포 가드 (2026-08-13 신설) ──
// 위 6-4 는 "이론상 도달 가능한가"만 본다. 그것만으로는 이번 사고를 못 잡았다:
// 표의 60칸을 전부 덮는 합성 입력이 있어도, 실제 얼굴이 그중 한 칸에만 살면 사용자는
// 늘 같은 결과를 본다. 실제로 도장의 장인 하나가 실사진 대역의 62.5% 를 먹고 있었다.
// 그래서 "실제 얼굴이 몰리는 좁은 구간"을 따로 쓸어 편중을 직접 단언한다.
//   · 하정(코끝→턱끝)이 체계적으로 가장 길다
//   · chinLength === samjung.lower (엔진에서 같은 식)
const clusteredSamjung = [];
for (const upper of [0.28, 0.30, 0.32, 0.34]) {
  for (const middle of [0.26, 0.28, 0.30, 0.32]) {
    const lower = Number((1 - upper - middle).toFixed(3));
    if (lower < 0.36 || lower > 0.46) continue;
    clusteredSamjung.push({ upper, middle, lower });
  }
}

const roleHits = new Map();
const laneTiers = new Set();
let sweepTotal = 0;
for (const samjung of clusteredSamjung) {
  for (const faceRatio of [0.78, 0.82, 0.85, 0.88, 0.91]) {
    for (const noseWidthRatio of [0.85, 0.95, 1.00]) {
      for (const mouthRatio of [1.25, 1.38, 1.50]) {
        for (const eyeDistRatio of [1.02, 1.10, 1.18]) {
          window.openPastLifeFaceApp({
            seed: seedFor(animals[0], {
              faceRatio,
              chinLength: samjung.lower,
              samjung,
              noseWidthRatio,
              mouthRatio,
              eyeDistRatio,
              earRatio: 0.26,
              eyeRatio: 2.7, eyeSlant: 0, lipThickness: 0.02,
              browSlant: -1, browArch: 1.2, browEyeGap: 1.5,
            }),
          });
          const role = roleOf();
          roleHits.set(role, (roleHits.get(role) || 0) + 1);
          laneTiers.add(window.document.querySelector('.plf-sharecard__tier').textContent.trim().split(' · ')[0]);
          sweepTotal += 1;
        }
      }
    }
  }
}

const sweepRanked = [...roleHits.entries()].sort((a, b) => b[1] - a[1]);
const [topRole, topHits] = sweepRanked[0];
const topShare = topHits / sweepTotal;
assert.ok(
  topShare <= 0.12,
  `실사진 대역에서 단일 신분 편중: ${topRole} ${(topShare * 100).toFixed(1)}% (상한 12%).\n` +
    '  얼굴형·삼정·레인 축 중 하나가 실측 대역과 어긋나 한 칸으로 붕괴했는지 확인할 것 —\n' +
    '  PastLifeFaceUI.js 의 plfRecenteredFeatures / plfRoleLane 을 볼 것.',
);
assert.ok(
  sweepRanked.length >= 30,
  `실사진 대역에서 도달한 신분이 ${sweepRanked.length}종뿐이다 (하한 30종). 축 하나가 상수로 굳었는지 확인할 것.`,
);
// 등급이 한 칸에 몰리면 희귀도 연출 자체가 죽는다.
assert.ok(
  laneTiers.size >= 3,
  `실사진 대역에서 등급이 ${laneTiers.size}종뿐이다 (하한 3종): ${[...laneTiers].join(', ')}`,
);

// ── 6-5. 유료 궁합(5,000원) 실렌더 — 결제 후 빈 화면이 되는 회귀를 막는다 ──
const { buildReading, renderCompat } = window.__plfTestHooks;
const meSeed = seedFor(animals[0], FACE_CASES[0]);
const youSeed = seedFor(animals[5], FACE_CASES[37]);
const compat = engine.calculatePastLifeCompatibility(meSeed, youSeed);
assert.ok(compat && compat.sections, '엔진의 궁합 계산이 살아 있어야 함');
renderCompat(compat, buildReading(meSeed), buildReading(youSeed));

const compatText = window.document.getElementById('plfRevealBody').textContent;
for (const marker of [
  '전생 인연 궁합',
  '전생에서 두 사람은',
  '두 사람이 함께 있던 시대',
  '두 사건이 겹친 지점',
  '전생에서 헤어진 방식',
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
assert.equal(window.document.querySelectorAll('[data-plf-scene]').length, 7, '궁합은 7장면이어야 함');
// 분량 회귀 방지 — 2026-08 3차 개편에서 5장면 900자대 → 7장면 2,100자대가 됐다.
assert.ok(
  compatText.replace(/\s+/g, ' ').trim().length > 1800,
  `궁합 결과가 비정상적으로 짧다 (실제 ${compatText.replace(/\s+/g, ' ').trim().length}자) — 서사 조립이 깨졌는지 확인할 것`,
);

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
    `${animals.length * FACE_CASES.length}개 조합 전부 고유, 3령 무리 + 관상 근거 렌더 확인, ` +
    `솔로 ${revealLength}자 / 궁합 ${compatText.replace(/\s+/g, ' ').trim().length}자, ` +
    `유료 궁합 실렌더 통과, 관상 동시 로드 충돌 없음`,
);
