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

// ── 축 스케일 · 전달함수 drift 가드 (기린상 42% 쏠림 재발 방지) ──
assert.match(analysis, /const FACE_LEFT = landmarks\[234\];/, 'faceRatio는 얼굴 최대폭(234/454) 기준');
assert.match(analysis, /const jawWidth = this\.calculateDistance\(JAW_LEFT, JAW_RIGHT\);/, '하관 폭은 별도 변수로 보존');
assert.match(analysis, /eyeToFaceRatio: \(eyeWidth \* 2 \+ interEyeDistance\) \/ \(jawWidth \|\| 1\)/, '여성형 판별은 하관 기준 유지');
// 상한을 올릴수록 승자 다양성이 단조 악화된다(700→25종, 1500→20종, 2000→18종 + 판정 붕괴).
// 바꾸려면 아래 분포 가드로 먼저 재측정할 것.
assert.match(analysis, /const profileBonus = Math\.min\(profileRaw, 700\) \* 0\.10;/, '프로파일 보정 전달함수(실측 확정값)');

const dom = new JSDOM('<!doctype html><body></body>');
const engine = new Function('window', 'document', analysis + '\nreturn window.faceAnalysisEngine;')(dom.window, dom.window.document);
assert.ok(engine && typeof engine.extractGeometricFeatures === 'function', '엔진 로드 실패');
const mkLm = (W, H, r) => {
  const L = 400, Wd = L * r;
  const lm = Array.from({ length: 468 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  lm[10] = { x: 0.5, y: (500 - L / 2) / H, z: 0 };
  lm[152] = { x: 0.5, y: (500 + L / 2) / H, z: 0 };
  // faceRatio 기준은 얼굴 최대 폭(234/454)이다.
  lm[234] = { x: (500 - Wd / 2) / W, y: 0.5, z: 0 };
  lm[454] = { x: (500 + Wd / 2) / W, y: 0.5, z: 0 };
  // 하관(149/378)은 최대폭의 62% 지점 — jawWidth·qualityScore가 현실적인 값으로 남게 한다.
  lm[149] = { x: (500 - Wd * 0.31) / W, y: 0.6, z: 0 };
  lm[378] = { x: (500 + Wd * 0.31) / W, y: 0.6, z: 0 };
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

// ── 승자 분포 붕괴 가드 ──
// 2026-08 사고: faceRatio 축이 아키타입 표와 다른 스케일이라 기린상 42.6% + 알파카상 30.8%
// (27종 중 실질 12종만 도달 가능)이었다. 위 복제 하네스(cat/dog/bear)는 재조합 블록을
// 포함하지 않아 이걸 못 잡았으므로, 여기서는 실엔진 analyze()를 그대로 호출한다.
const baseFeatures = {
  faceRatio: 0.80, faceLength: 0.4, faceWidth: 0.32, eyeRatio: 2.7, eyeSlant: 0,
  eyeDistRatio: 1.08, eyeDistance: 1.08, eyeAsymmetry: 0.02, eyeSlantDelta: 0.5,
  eyeHeight: 0.012, eyeWidth: 0.032, leftEyeWidth: 0.032, rightEyeWidth: 0.032,
  noseRatio: 1.6, noseWidthRatio: 0.92, noseZ: 0.02, noseWidth: 0.035,
  mouthCurve: 0.001, mouthRatio: 1.35, mouthWidth: 0.047,
  earRatio: 0.28, earPosition: 'normal', browSlant: -1, browArch: 1.2, browEyeGap: 1.5,
  jawSquareness: 0.80, qualityScore: 92, eyeToFaceRatio: 0.9, lipThickness: 0.02,
  chinLength: 0.34, samjung: { upper: 0.33, middle: 0.33, lower: 0.34 }
};
const stubLm = Array.from({ length: 478 }, (_, i) => ({ x: 0.5 + ((i * 37) % 100) / 2000, y: 0.5 + ((i * 53) % 100) / 2000, z: 0 }));
const realExtract = engine.extractGeometricFeatures.bind(engine);
const analyzeWith = async (over) => {
  engine.extractGeometricFeatures = () => ({ ...baseFeatures, ...over, jawSquareness: over.faceRatio ?? baseFeatures.faceRatio });
  try { return await engine.analyze(stubLm, null, 1); }
  finally { engine.extractGeometricFeatures = realExtract; }
};

const wins = Object.create(null);
let total = 0;
for (const faceRatio of [0.70, 0.75, 0.80, 0.85, 0.90])
  for (const eyeSlant of [-5, -2.5, 0, 2.5, 5])
    for (const eyeDistRatio of [0.95, 1.08, 1.20])
      for (const noseWidthRatio of [0.82, 0.95, 1.08])
        for (const mouthRatio of [1.15, 1.35, 1.55])
          for (const eyeRatio of [2.2, 2.7, 3.2]) {
            const r = await analyzeWith({ faceRatio, eyeSlant, eyeDistRatio, eyeDistance: eyeDistRatio, noseWidthRatio, mouthRatio, eyeRatio });
            wins[r.primaryAnimal] = (wins[r.primaryAnimal] || 0) + 1;
            total += 1;
          }

const ranked = Object.entries(wins).sort((a, b) => b[1] - a[1]);
const [topName, topCount] = ranked[0];
assert.ok(topCount / total <= 0.35, `단일 동물 편중: ${topName} ${(topCount * 100 / total).toFixed(1)}% — 축 스케일/전달함수 붕괴 의심`);
assert.ok(ranked.length >= 18, `승자 다양성 ${ranked.length}/27 — 다수 동물이 도달 불가`);
for (const name of ['강아지상', '고양이상', '햄스터상', '사슴상']) {
  assert.ok(wins[name] > 0, `${name}이 전 구간에서 단 한 번도 1위가 아님 (도달 불가)`);
}
assert.ok((wins['기린상'] || 0) / total <= 0.12, `기린상은 매우 긴 얼굴에서만 나와야 함 (실제 ${((wins['기린상'] || 0) * 100 / total).toFixed(1)}%)`);
// 갸름 + 순한 눈매 + 큰 둥근 눈 + 작은 코 → 부드러운 계열이어야 한다 (기린상 금지)
const soft = await analyzeWith({
  faceRatio: 0.78, eyeSlant: 1.0, eyeDistRatio: 1.12, eyeDistance: 1.12,
  noseWidthRatio: 0.82, mouthRatio: 1.22, eyeRatio: 2.25, eyeToFaceRatio: 0.75, chinLength: 0.33
});
assert.notEqual(soft.primaryAnimal, '기린상', '갸름+순한 얼굴이 기린상으로 새면 안 됨');
assert.ok(['강아지상', '햄스터상', '사슴상', '토끼상', '고양이상'].includes(soft.primaryAnimal),
  `갸름+순한 얼굴 → 부드러운 계열이어야 함 (실제 ${soft.primaryAnimal})`);

console.log(`[verify-physiognomy-scoring] ok — 승자 ${ranked.length}/27종, 최다 ${topName} ${(topCount * 100 / total).toFixed(1)}%, 갸름+순한 얼굴 → ${soft.primaryAnimal}`);
