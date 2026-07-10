import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const analysis = readFileSync(resolve(root, 'AnalysisEngine.js'), 'utf8');
const ui = readFileSync(resolve(root, 'PhysiognomyUI.js'), 'utf8');

assert.match(analysis, /eyeDistance:\s*eyeDistRatio/, 'eyeDistance alias must map to eyeDistRatio');
assert.doesNotMatch(analysis, /features\.eyeDistance/, 'scoring must read eyeDistRatio directly');
assert.match(analysis, /qualityScore/, 'analysis result must include qualityScore');
assert.match(analysis, /scoreBreakdown/, 'analysis result must include scoreBreakdown');
assert.doesNotMatch(analysis, /pctArr\[0\]\s*\*\s*1\.25/, 'confidence must not use inflated softmax multiplier');
assert.match(ui, /사진 품질/, 'result UI must expose photo quality guidance');
assert.match(ui, /판정 근거/, 'result UI must expose readable scoring evidence');

// ── 동물상 정확도 튜닝 (갸름→고양이, 둥금→강아지) ──
// 소스에 수정 로직이 실재하는지 확인해 아래 복제 하네스와의 drift를 막는다.
assert.match(analysis, /if \(features\.faceRatio <= 0\.86\) catBonus \+= 300;/, 'cat base: faceRatio 하한 제거(갸름 우대)');
assert.match(analysis, /if \(features\.faceRatio <= 0\.80\) catBonus \+= 150;/, 'cat base: 매우 갸름 보강');
assert.match(analysis, /if \(features\.faceRatio >= 0\.85 && Math\.abs\(features\.eyeSlant\) <= 1\.5\) bearBonus \+= 140;/, 'bear base: 평온눈매 보너스에 넓은얼굴 게이트');
assert.doesNotMatch(analysis, /else if \(features\.faceRatio >= 0\.84\) bonus \+= 145;\n {12}bonus \+= 145;/, 'bear floor 무조건 지급 제거');
assert.match(analysis, /\/\/ 1-b\) 고양이상 — 갸름한 얼굴/, 'cat 남성형 분기 신설');

// 보너스 로직 복제 하네스: 세 시나리오에서 상대 점수 역전 확인
const ARCH = {
  dog:  { face: 0.85, slant: 4.5,  dist: 1.12, nose: 0.90, mouth: 1.28, eye: 2.5 },
  cat:  { face: 0.83, slant: -5.5, dist: 1.12, nose: 0.84, mouth: 1.30, eye: 2.6 },
  bear: { face: 0.90, slant: 0.5,  dist: 1.18, nose: 1.10, mouth: 1.38, eye: 3.0 },
};
const geo = (f, a) => Math.max(0, 2000 - (
  (f.faceRatio - a.face) ** 2 * 1800 + (f.eyeSlant - a.slant) ** 2 * 12 +
  (f.eyeDistRatio - a.dist) ** 2 * 1000 + (f.noseWidthRatio - a.nose) ** 2 * 1200 +
  (f.mouthRatio - a.mouth) ** 2 * 500 + (f.eyeRatio - a.eye) ** 2 * 150));
const baseBonus = (id, f) => {
  let b = 0;
  if (id === 'cat') {
    if (f.eyeSlant <= -4) b += 500; else if (f.eyeSlant <= -2.5) b += 300;
    if (f.faceRatio <= 0.86) b += 300;
    if (f.faceRatio <= 0.80) b += 150;
    if (f.eyeRatio <= 2.6) b += 200;
  }
  if (id === 'bear') {
    if (f.faceRatio >= 0.88) b += 220;
    if (f.noseWidthRatio >= 1.05) b += 180;
    if (f.faceRatio >= 0.85 && Math.abs(f.eyeSlant) <= 1.5) b += 140;
  }
  return b;
};
const genderBonus = (id, f, fem) => {
  let b = 0;
  if (fem >= 40) {
    const p = 1.0 + (fem - 40) / 40;
    if (id === 'cat') { if (f.faceRatio <= 0.82) b += 700; else if (f.faceRatio <= 0.85) b += 400; if (f.eyeRatio <= 2.5) b += 450; if (f.eyeSlant <= -2.0) b += 400; b += 500; }
    if (id === 'dog') { if (f.faceRatio >= 0.83) b += 1100; else if (f.faceRatio >= 0.80) b += 650; if (f.eyeRatio <= 2.6) b += 800; if (f.eyeSlant >= 0.0) b += 600; b += 600; }
    if (id === 'bear') { if (f.faceRatio >= 0.87) b += 290; else if (f.faceRatio >= 0.84) b += 145; if (f.faceRatio >= 0.84) b += 145; }
    return b * p;
  }
  const p = 1.0 + (40 - fem) / 40;
  if (id === 'dog') { if (f.faceRatio >= 0.83) b += 550; else if (f.faceRatio >= 0.80) b += 300; if (f.eyeSlant >= 0.5) b += 350; else if (f.eyeSlant >= -0.5) b += 180; if (f.mouthCurve > 0) b += 150; b += 250; }
  if (id === 'cat') { if (f.faceRatio <= 0.82) b += 550; else if (f.faceRatio <= 0.85) b += 300; if (f.eyeSlant <= -2.0) b += 350; else if (f.eyeSlant <= -0.5) b += 150; if (f.eyeRatio <= 2.6) b += 200; b += 250; }
  if (id === 'bear') { if (f.faceRatio >= 0.87) b += 290; else if (f.faceRatio >= 0.84) b += 145; if (f.noseWidthRatio >= 1.00) b += 220; else if (f.noseWidthRatio >= 0.93) b += 110; if (f.faceRatio >= 0.84) b += 145; }
  return b * p;
};
const score = (id, f, fem) => geo(f, ARCH[id]) * 0.82 + baseBonus(id, f) + genderBonus(id, f, fem);
const mk = (o) => ({ eyeDistRatio: 1.05, noseWidthRatio: 0.88, mouthRatio: 1.35, eyeRatio: 2.5, mouthCurve: 0.002, ...o });
const winner = (f, fem) => ['cat', 'dog', 'bear'].map((id) => [id, score(id, f, fem)]).sort((a, b) => b[1] - a[1])[0][0];

assert.equal(winner(mk({ faceRatio: 0.76, eyeSlant: -3 }), 60), 'cat', '갸름 여성 → 고양이');
assert.equal(winner(mk({ faceRatio: 0.76, eyeSlant: -1 }), 20), 'cat', '갸름 남성(중립눈) → 고양이 (남성형 cat 분기)');
assert.equal(winner(mk({ faceRatio: 0.86, eyeSlant: 2, eyeRatio: 2.4 }), 60), 'dog', '둥금 여성 → 강아지');
assert.equal(winner(mk({ faceRatio: 0.86, eyeSlant: 2, eyeRatio: 2.4 }), 20), 'dog', '둥금 남성 → 강아지');
assert.equal(genderBonus('bear', mk({ faceRatio: 0.76, eyeSlant: -1 }), 20), 0, '갸름 얼굴엔 곰 floor 미지급');
assert.ok(genderBonus('bear', mk({ faceRatio: 0.90, eyeSlant: 0.5, noseWidthRatio: 1.10 }), 20) > 0, '넓은 얼굴엔 곰 floor 지급');

// ── 종횡비 보정 (문제 1-B): 같은 얼굴이 이미지 종횡비와 무관하게 동일 faceRatio를 내야 함 ──
// AnalysisEngine.js를 window-stub 환경에서 실제 로드해 extractGeometricFeatures를 호출한다.
assert.match(analysis, /extractGeometricFeatures\(landmarks, aspect\)/, 'extractGeometricFeatures에 aspect 파라미터');
assert.match(analysis, /landmarks = landmarks\.map\(\(p\) => \(\{ x: p\.x \* A, y: p\.y, z: \(p\.z \|\| 0\) \* A \}\)\)/, '종횡비 보정(x·z × W/H)');
assert.match(analysis, /analyze\(landmarksData, expressionData, imageAspect\)/, 'analyze가 imageAspect 수신');
assert.match(ui, /window\.faceAnalysisEngine\.analyze\(analysisLandmarks, expressionData, imageAspect\)/, '프론트가 imageAspect 전달');

const dom = new JSDOM('<!doctype html><body></body>');
const engine = new Function('window', 'document', analysis + '\nreturn window.faceAnalysisEngine;')(dom.window, dom.window.document);
assert.ok(engine && typeof engine.extractGeometricFeatures === 'function', '엔진 로드 실패');
const mkLm = (W, H, r) => {
  const L = 400, Wd = L * r;
  const lm = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  lm[10] = { x: 0.5, y: (500 - L / 2) / H, z: 0 };
  lm[152] = { x: 0.5, y: (500 + L / 2) / H, z: 0 };
  lm[149] = { x: (500 - Wd / 2) / W, y: 0.6, z: 0 };
  lm[378] = { x: (500 + Wd / 2) / W, y: 0.6, z: 0 };
  return lm;
};
const truth = 0.72; // 실제 갸름한 얼굴
const sq = engine.extractGeometricFeatures(mkLm(1000, 1000, truth), 1);
const portRaw = engine.extractGeometricFeatures(mkLm(800, 1000, truth), 1);     // 세로형, 보정 미적용
const port = engine.extractGeometricFeatures(mkLm(800, 1000, truth), 800 / 1000); // 세로형, 보정
const land = engine.extractGeometricFeatures(mkLm(1000, 800, truth), 1000 / 800); // 가로형, 보정
assert.ok(portRaw.faceRatio > 0.88, `보정 없는 세로형 셀카는 곰 영역으로 팽창(재현): ${portRaw.faceRatio.toFixed(3)}`);
for (const [label, f] of [['정사각', sq], ['세로형보정', port], ['가로형보정', land]]) {
  assert.ok(Math.abs(f.faceRatio - truth) < 0.01, `${label} faceRatio ≈ ${truth} (실제 ${f.faceRatio.toFixed(3)})`);
}
const spread = Math.max(sq.faceRatio, port.faceRatio, land.faceRatio) - Math.min(sq.faceRatio, port.faceRatio, land.faceRatio);
assert.ok(spread < 0.01, `종횡비 불변(편차 ${spread.toFixed(4)})`);

console.log('[verify-physiognomy-scoring] ok');
