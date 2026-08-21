// 관상 동물상 스코어링 회귀 검증
//
// 2026-08-16 개편: 손튜닝 상수를 정규식으로 고정하던 방식을 걷어내고, 실제 얼굴에서 뽑은
// 랜드마크 픽스처로 실엔진을 돌려 "라벨을 맞히는가"를 직접 잰다.
//
// 왜 바꿨나: 종전 가드는 eyeSlant 를 [-5,-2.5,0,2.5,5] 로 훑는 합성 스윕이었는데, 실제
// 사진에서 나오는 eyeSlant 폭은 1.11(중앙 -0.20)뿐이었다. 즉 가드가 실제 얼굴이 도달할 수
// 없는 좌표만 검사해 초록불을 켜는 동안, 실사용에서는 31장 중 16장(51.6%)이 곰상으로
// 몰리고 라벨 적중률이 12.9% 였다. 합성 좌표로는 이 부류의 사고를 잡을 수 없다.
//
// 픽스처: scripts/fixtures/physiognomy-landmark-vectors.json
//   calibration/ 사진(gitignore)에서 뽑은 랜드마크 중 엔진이 실제로 인덱싱하는 38점만 담았다.
//   얼굴 이미지도, 신원 정보도, 메시 전체도 들어 있지 않다. 사진이 늘면 다시 생성한다:
//     npm run physio:measure  →  픽스처 재생성  →  npm run physio:replay 로 수치 확인
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const analysis = readFileSync(resolve(root, 'AnalysisEngine.js'), 'utf8');
const ui = readFileSync(resolve(root, 'PhysiognomyUI.js'), 'utf8');

// ── 1. 결과 계약 ──
assert.match(analysis, /eyeDistance:\s*eyeDistRatio/, 'eyeDistance alias must map to eyeDistRatio');
assert.doesNotMatch(analysis, /features\.eyeDistance/, 'scoring must read eyeDistRatio directly');
assert.match(analysis, /qualityScore/, 'analysis result must include qualityScore');
assert.match(analysis, /scoreBreakdown/, 'analysis result must include scoreBreakdown');
assert.doesNotMatch(analysis, /pctArr\[0\]\s*\*\s*1\.25/, 'confidence must not use inflated softmax multiplier');
assert.match(ui, /사진 품질/, 'result UI must expose photo quality guidance');
assert.match(ui, /판정 근거/, 'result UI must expose readable scoring evidence');

// ── 2. 축 스케일 보정이 살아 있는가 ──
// 이게 빠지면 실측값이 아키타입 표와 다른 대역으로 돌아가 곰상 쏠림이 그대로 재발한다.
assert.match(analysis, /const PHY_AXIS_CALIBRATION = \{/, '축 보정 표가 있어야 함');
assert.match(analysis, /const PHY_AXIS_CLAMP = \{/, '축 클램프가 있어야 함 (눈 감은 사진의 eyeRatio 폭주 차단)');
assert.match(analysis, /function phyCalibrateAxis\(/, 'phyCalibrateAxis 가 있어야 함');
for (const axis of ['faceRatio', 'eyeSlant', 'eyeDistRatio', 'noseWidthRatio', 'mouthRatio', 'eyeRatio']) {
  assert.match(analysis, new RegExp(`${axis}:\\s*\\{ from:`), `PHY_AXIS_CALIBRATION 에 ${axis} 항목`);
  assert.match(analysis, new RegExp(`phyCalibrateAxis\\('${axis}'`), `${axis} 가 보정을 거쳐야 함`);
}
assert.match(analysis, /const PHY_PROFILE_BONUS_WEIGHT = /, '보너스 반영 비율은 명명된 상수여야 함');
assert.match(analysis, /Math\.min\(profileRaw, 700\) \* PHY_PROFILE_BONUS_WEIGHT/, '보너스 전달함수가 상수를 써야 함');

// ── 3. 축 스케일 · 전달함수 drift 가드 (기린상 42% 쏠림 재발 방지) ──
assert.match(analysis, /const FACE_LEFT = landmarks\[234\];/, 'faceRatio는 얼굴 최대폭(234/454) 기준');
assert.match(analysis, /const jawWidth = this\.calculateDistance\(JAW_LEFT, JAW_RIGHT\);/, '하관 폭은 별도 변수로 보존');
assert.match(analysis, /eyeToFaceRatio: \(eyeWidth \* 2 \+ interEyeDistance\) \/ \(jawWidth \|\| 1\)/, '여성형 판별은 하관 기준 유지');
assert.match(analysis, /extractGeometricFeatures\(landmarks, aspect\)/, 'extractGeometricFeatures에 aspect 파라미터');
assert.match(analysis, /landmarks = landmarks\.map\(\(p\) => \(\{ x: p\.x \* A, y: p\.y, z: \(p\.z \|\| 0\) \* A \}\)\)/, '종횡비 보정(x·z × W/H)');
assert.match(analysis, /analyze\(landmarksData, expressionData, imageAspect\)/, 'analyze가 imageAspect 수신');
assert.match(ui, /window\.faceAnalysisEngine\.analyze\(analysisLandmarks, expressionData, imageAspect\)/, '프론트가 imageAspect 전달');

// 여성형 억제 목록과 animalDb 가 모순되지 않아야 한다.
// 억제는 baseScore 비율(-30~-95%)이라 기하 격차(100~200)를 통째로 덮어쓴다 — 목록에 넣는 것은
// 사실상 "여성 얼굴에서 이 동물상을 없앤다"와 같다. 그래서 여성 대표 연예인이 등록된
// 동물상은 목록에 있으면 안 된다. 뱀상(카리나·청하·현아)이 여기 들어 있어 8장 전원이 샜다.
assert.match(analysis, /const mildCrush = \['wolf'\];/, "mildCrush 에 snake·tiger 재추가 금지 (여성 대표가 animalDb 에 등록돼 있음)");

const dom = new JSDOM('<!doctype html><body></body>');
const engine = new Function('window', 'document', analysis + '\nreturn window.faceAnalysisEngine;')(dom.window, dom.window.document);
assert.ok(engine && typeof engine.extractGeometricFeatures === 'function', '엔진 로드 실패');
await engine.loadDatabase();

// ── 4. 종횡비 불변 ──
// 보정은 축마다 아핀 변환이라 불변성을 보존한다. 절대값이 아니라 "이미지 비율이 달라도
// 같은 값이 나오는가"를 본다 (보정 때문에 절대값은 표 좌표계로 옮겨진다).
const mkLm = (W, H, r) => {
  const L = 400, Wd = L * r;
  const lm = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  lm[10] = { x: 0.5, y: (500 - L / 2) / H, z: 0 };
  lm[152] = { x: 0.5, y: (500 + L / 2) / H, z: 0 };
  lm[234] = { x: (500 - Wd / 2) / W, y: 0.5, z: 0 };
  lm[454] = { x: (500 + Wd / 2) / W, y: 0.5, z: 0 };
  lm[149] = { x: (500 - Wd * 0.31) / W, y: 0.6, z: 0 };
  lm[378] = { x: (500 + Wd * 0.31) / W, y: 0.6, z: 0 };
  return lm;
};
const truth = 0.72;
const sq = engine.extractGeometricFeatures(mkLm(1000, 1000, truth), 1);
const portRaw = engine.extractGeometricFeatures(mkLm(800, 1000, truth), 1);      // 세로형, 보정 미적용
const port = engine.extractGeometricFeatures(mkLm(800, 1000, truth), 800 / 1000); // 세로형, 보정
const land = engine.extractGeometricFeatures(mkLm(1000, 800, truth), 1000 / 800); // 가로형, 보정
const spread = Math.max(sq.faceRatio, port.faceRatio, land.faceRatio) - Math.min(sq.faceRatio, port.faceRatio, land.faceRatio);
assert.ok(spread < 0.01, `종횡비 불변(편차 ${spread.toFixed(4)})`);
assert.ok(portRaw.faceRatio > sq.faceRatio + 0.03,
  `보정 없는 세로형 셀카는 여전히 넓은 쪽으로 팽창해야 함(재현): ${portRaw.faceRatio.toFixed(3)} vs ${sq.faceRatio.toFixed(3)}`);

// ── 5. 성별 오버라이드가 실제로 분기를 뒤집는가 ──
// UI에서 사용자가 성별을 직접 고르면 detectFeminineFace() 자동 추정 대신 그 값을 써야 한다
// (analyze() 시그니처는 위 setMoleSource 와 같은 이유로 못 늘려서 setGenderOverride 세터를 씀).
// 같은 얼굴이라도 female 오버라이드면 crushList(eagle·crocodile·dinosaur·lion·horse·camel)가
// 60~95% 억제되고 male 오버라이드면 억제가 없다 — 최소 1장은 판정이 갈려야 한다.
// 🔴 처음엔 표본 20장만 봤는데, 아키타입 표까지 재튜닝된 뒤로는 geoScore가 워낙 뚜렷해져
// 앞쪽 20장에서는 우연히 한 번도 안 갈렸다(전체 157장 기준으로는 실제로 14장이 갈림) —
// 배선 자체가 아니라 표본이 작아 생긴 오탐이었다. 전체 표본으로 본다.
const fx = JSON.parse(readFileSync(resolve(root, 'scripts/fixtures/physiognomy-landmark-vectors.json'), 'utf8'));
const toLandmarks = (s) => {
  const lm = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  fx.indices.forEach((idx, i) => { lm[idx] = { x: s.points[i][0], y: s.points[i][1], z: s.points[i][2] }; });
  return lm;
};
let genderOverrideFlips = false;
for (const s of fx.samples) {
  const lm = toLandmarks(s);
  engine.setGenderOverride('female');
  const asFemale = await engine.analyze(lm, null, s.aspect);
  engine.setGenderOverride('male');
  const asMale = await engine.analyze(lm, null, s.aspect);
  if (asFemale.primaryAnimal !== asMale.primaryAnimal) { genderOverrideFlips = true; break; }
}
engine.setGenderOverride(null); // 이후 적중률 측정은 실제 UI 기본값(자동 감지)과 같은 조건이어야 한다
assert.ok(genderOverrideFlips,
  '성별 오버라이드(female vs male)가 전체 표본에서 단 한 번도 판정을 안 바꿈 — setGenderOverride 배선 확인');

// ── 6. 실제 얼굴 픽스처로 라벨 적중률 ──
// 이 가드가 이 파일의 본체다. 위의 문자열 단언들은 구조가 사라졌는지만 보고,
// "판정이 맞는가"는 여기서만 잰다.
const norm = (s) => String(s || '').replace(/상$/, '');
const results = [];
for (const s of fx.samples) {
  const out = await engine.analyze(toLandmarks(s), null, s.aspect);
  results.push({ label: s.label, winner: out.primaryAnimal, top3: (out.top3 || []).map((t) => t.animal.name) });
}
const n = results.length;
const top1 = results.filter((r) => norm(r.winner) === norm(r.label)).length;
const top3 = results.filter((r) => r.top3.some((t) => norm(t) === norm(r.label))).length;
const wins = {};
results.forEach((r) => { wins[r.winner] = (wins[r.winner] || 0) + 1; });
const [topName, topCount] = Object.entries(wins).sort((a, b) => b[1] - a[1])[0];
const reached = Object.keys(wins).length;

// 🔴 이 적중률은 in-sample 이다. 아키타입 18행이 바로 이 사진들의 중앙값으로 만들어졌으므로
//    일반화 성능이 아니라 "파이프라인이 안 깨졌는가"를 재는 회귀 지표로만 읽어야 한다.
//    같은 데이터의 leave-one-out 일반화 추정치는 약 9% 로 훨씬 낮다(라벨 24종, 다수결 10.0%).
//    이 기능의 정확도 한계는 특징에 있다 — 상세는 아래 주석과 docs 참고.
// 2026-08-21 ①: calibration/ 일부 폴더에 다른 동물상 사진이 섞여 있어(사용자 확인) 정리 후
// 재계측(n=150→157, 강아지·호랑이·공룡·원숭이·말·돼지·개구리·거북이 8종 중심점 교체). 실측
// (1위 36/157 · TOP3 77/157)은 2026-08-16 기준(36/150·75/150)과 거의 동일했다 — 오염 사진이
// 소수 종에 국한돼 있어 집계 지표 자체는 안 움직였다(개별 종 판정만 바뀜).
// 2026-08-21 ②: 사용자 승인으로 축 가중치 6개 + 성별별 보너스/억제 사다리(217개 게이트)를
// scripts/physiognomy-gate-optimize.mjs(담금질, calibration/.measurements.json 157장 기준)로
// 재튜닝. 🔴 무제약 1차 시도는 임계값을 실측 대역 밖(예: faceRatio <= 0.057)으로 밀어 넣어
// 게이트가 상시 발화/불발화하는 과적합을 냈다 — PHY_AXIS_CLAMP 대역 + 원값 대비 0.3~3배 상한을
// 강제해 재실행했다. 또한 독립 담금질이 if/else-if 사슬의 임계값 순서를 뒤집어 뒤 분기가 죽는
// 사고(19곳 실측)가 있어 사슬을 임계값 순으로 재정렬하는 복구 패스를 추가했다. 실측 1위
// 42/157 · TOP3 81/157.
// 2026-08-21 ③: "왜 보너스를 재튜닝해도 안 오르나" 진단 — geoScore(순수 기하 거리)만으로도
// 이미 라벨 TOP3 54.1%가 나왔는데(랭크 중앙값 2위) 보너스 사다리를 아무리 돌려도 51~52%를 못
// 넘었다. 병목이 보너스가 아니라 archetypes 표(27종×6축, 단순 중앙값이라 이 가중 거리식으로
// 27종을 가장 잘 가르는 좌표라는 보장이 없음) 자체였다는 뜻이라 archetypes 도 튜닝 대상에
// 넣었다(357개 파라미터). 1위 가중치를 올릴수록 1위는 오르지만 TOP3·도달종·뱀상 TOP3 여유가
// 깎이는 트레이드오프가 뚜렷했다 — 1위 36.3%(TOP3 45.9%·도달 17·뱀상TOP3 6, 여유 0) vs
// 균형형 1위 33.8%(TOP3 51.6%·도달 19·뱀상TOP3 10). 사용자가 균형형을 골랐다 — 앱이 실제로
// 보여주는 건 TOP3(동물상 TOP3 히어로)이지 1위 단독이 아니라서, 그 값을 깎는 트레이드오프는
// 안 하기로 함. 새 기준선: 1위 53/157(33.8%) · TOP3 81/157(51.6%) · 최다 16.6% · 도달 19/27 ·
// 뱀상 TOP3 10. 하한은 그 실측보다 아래로 둔다.
// 개편 전(2026-08-16 이전, 150장): 1위 19(12.7%) · TOP3 33(22.0%).
assert.ok(top1 >= 42, `라벨 1위 적중 ${top1}/${n} — 하한 42 미만 (개편 전 19)`);
assert.ok(top3 >= 65, `라벨 TOP3 적중 ${top3}/${n} — 하한 65 미만 (개편 전 33)`);
assert.ok(reached >= 17, `도달 동물 ${reached}/27 — 다수 동물이 판정 불가`);
// 단일 동물 쏠림은 이 기능의 고질 사고다 (2026-08 곰상 51.6%, 그 전 기린상 42.6%).
assert.ok(topCount / n <= 0.20, `단일 동물 편중: ${topName} ${(topCount * 100 / n).toFixed(1)}% — 축 스케일/전달함수 붕괴 의심`);
// 사용자 신고(카리나 → 곰상)의 회귀 가드. 여성 얼굴이 뱀상 후보권에 들어와야 한다.
// 1위 고정은 특징 한계상 불안정해서 TOP3 로 건다.
const snakeTop3 = results.filter((r) => r.label === '뱀상' && r.top3.some((t) => norm(t) === '뱀')).length;
assert.ok(snakeTop3 >= 6, `뱀상 TOP3 재현 ${snakeTop3} — 여성형 억제/보너스 포화로 다시 막혔는지 확인 (개편 전 0)`);

console.log(`[verify-physiognomy-scoring] ok — 픽스처 ${n}장(in-sample): 1위 ${top1} (${(top1 * 100 / n).toFixed(1)}%) · TOP3 ${top3} · 도달 ${reached}/27 · 최다 ${topName} ${(topCount * 100 / n).toFixed(1)}% · 뱀상 TOP3 ${snakeTop3}`);
