// 관상 동물상 보정 하네스 (개발 전용 · 배포되지 않음)
//
// 목적: "실제 얼굴이 어떤 수치로 측정되는가"를 추측하지 않고 눈으로 보는 것.
//   AnalysisEngine 의 아키타입 표(faceRatio 0.62~0.93)와 실제 측정값이 다른 스케일이면
//   모든 얼굴이 표 최솟값 동물(기린 0.62)로 붙는다. 그 스케일을 확정하는 도구다.
//
// 왜 헤드리스 Node 가 아니라 진짜 브라우저인가:
//   앱이 핀한 @mediapipe/face_mesh 는 브라우저 WASM+WebGL 번들이다. tasks-vision 등
//   다른 구현으로 바꾸면 랜드마크 값 자체가 달라져 "앱과 같은 숫자"라는 전제가 무너진다.
//   그래서 앱과 같은 CDN·같은 버전·같은 setOptions 로 실제 FaceMesh 를 돌린다.
//
// 사용법:
//   1) calibration/ 아래에 사진을 넣는다 (라벨을 알면 동물상 이름 폴더로 나눠도 된다)
//        calibration/1.jpg
//        calibration/강아지/1.jpg  calibration/햄스터/2.jpg  ...
//   2) npm run physio:measure
//
// calibration/ 은 .gitignore 에 있다 — 사용자 사진은 절대 커밋되지 않는다.

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { resolve, extname, join, relative, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const MAX_EDGE = 1280; // PhysiognomyUI.js PHY_IMAGE_MAX_EDGE 와 동일

// ── 앱이 핀한 MediaPipe 버전/CDN 을 소스에서 읽는다 (하드코딩하면 앱과 드리프트한다) ──
function readMediaPipePin() {
  const ui = readFileSync(resolve(root, 'PhysiognomyUI.js'), 'utf8');
  const version = /faceMesh:\s*'([^']+)'/.exec(ui);
  const base = /PHY_MEDIAPIPE_CDN_BASES\s*=\s*\[\s*'([^']+)'/.exec(ui);
  if (!version || !base) throw new Error('PhysiognomyUI.js 에서 MediaPipe 버전/CDN 을 못 읽었습니다');
  return { assetBase: `${base[1]}/@mediapipe/face_mesh@${version[1]}` };
}

function walkImages(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walkImages(full, out);
    else if (IMAGE_EXT.has(extname(name).toLowerCase())) out.push(full);
  }
  return out;
}

const median = (xs) => {
  const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!s.length) return NaN;
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const fmt = (x, d = 3) => (Number.isFinite(x) ? x.toFixed(d) : '  -  ');

// ── 브라우저 페이지: 앱과 동일하게 FaceMesh 를 구성하고 측정만 한다 ──
function buildPage(assetBase) {
  return `<!doctype html><meta charset="utf-8"><body>
<script src="${assetBase}/face_mesh.js"></script>
<script src="/AnalysisEngine.js"></script>
<script>
const ASSET_BASE = ${JSON.stringify(assetBase)};
let faceMesh = null, pending = null;

window.__boot = async () => {
  if (!window.FaceMesh) throw new Error('MEDIAPIPE_FACEMESH_MISSING');
  faceMesh = new FaceMesh({ locateFile: (f) => ASSET_BASE + '/' + f });
  faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
  faceMesh.onResults((r) => { if (pending) { pending(r); pending = null; } });
  await window.faceAnalysisEngine.loadDatabase();
  return window.faceAnalysisEngine.animalDb.animals.map((a) => ({ id: a.id, name: a.name }));
};

// 앱의 prepareImageForLandmark 와 같은 상한(최대 변 1280)만 재현한다.
function fitToCanvas(img) {
  const scale = Math.min(1, ${MAX_EDGE} / Math.max(img.naturalWidth, img.naturalHeight));
  if (scale === 1) return img;
  const c = document.createElement('canvas');
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c;
}

const dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

window.__measure = async (dataUrl) => {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const w = img.naturalWidth, h = img.naturalHeight;
  const aspect = (w > 0 && h > 0) ? (w / h) : 1;   // PhysiognomyUI.js:1775-1777 과 동일

  const got = new Promise((res) => { pending = res; });
  await faceMesh.send({ image: fitToCanvas(img) });
  const r = await Promise.race([got, new Promise((_, rj) => setTimeout(() => rj(new Error('LANDMARK_TIMEOUT')), 25000))]);
  const lm = r && r.multiFaceLandmarks && r.multiFaceLandmarks[0];
  if (!lm) return { ok: false, reason: 'NO_FACE' };

  // 엔진과 동일한 종횡비 보정을 적용한 사본에서 폭 후보들을 잰다 (AnalysisEngine.js:373-376)
  const c = aspect === 1 ? lm : lm.map((p) => ({ x: p.x * aspect, y: p.y, z: (p.z || 0) * aspect }));
  const faceLength = dist3(c[10], c[152]);
  const widths = {
    jaw_149_378:   dist3(c[149], c[378]) / faceLength,   // 현재 엔진이 쓰는 쌍 (턱끝에서 3칸)
    oval_234_454:  dist3(c[234], c[454]) / faceLength,   // 얼굴 최대 폭 후보
    oval_2d:       dist2(c[234], c[454]) / faceLength,   // 위의 2D 변형 (yaw 민감도 비교용)
    temple_127_356: dist3(c[127], c[356]) / faceLength,
    cheek_116_345: dist3(c[116], c[345]) / faceLength,
    faceLength
  };

  const f = window.faceAnalysisEngine.extractGeometricFeatures(lm, aspect);
  const res = await window.faceAnalysisEngine.analyze(lm, null, aspect);
  return {
    ok: true, widths,
    features: {
      faceRatio: f.faceRatio, eyeSlant: f.eyeSlant, eyeDistRatio: f.eyeDistRatio,
      noseWidthRatio: f.noseWidthRatio, mouthRatio: f.mouthRatio, eyeRatio: f.eyeRatio,
      qualityScore: f.qualityScore, eyeToFaceRatio: f.eyeToFaceRatio
    },
    femininity: window.faceAnalysisEngine.detectFeminineFace(f),
    winner: res.primaryAnimal,
    top: (res.top3 || []).map((t) => t.animal.name),
    breakdown: res.scoreBreakdown || null
  };
};
<\/script></body>`;
}

// ── 아키타입 표를 소스에서 읽어 축별 중앙값을 비교 기준으로 삼는다 ──
function readArchetypes() {
  const src = readFileSync(resolve(root, 'AnalysisEngine.js'), 'utf8');
  const rows = [...src.matchAll(/'(\w+)':\s*\{\s*face:\s*([\d.]+),\s*slant:\s*(-?[\d.]+),\s*dist:\s*([\d.]+),\s*nose:\s*([\d.]+),\s*mouth:\s*([\d.]+),\s*eye:\s*([\d.]+)\s*\}/g)];
  return rows.map((m) => ({
    id: m[1], face: +m[2], slant: +m[3], dist: +m[4], nose: +m[5], mouth: +m[6], eye: +m[7]
  }));
}

async function main() {
  const dir = resolve(root, opt('dir', 'calibration'));
  if (!existsSync(dir)) {
    console.error(`[physio-calibrate] ${relative(root, dir)}/ 가 없습니다.`);
    console.error('  사진을 넣고 다시 실행하세요:  calibration/1.jpg  또는  calibration/강아지/1.jpg');
    process.exit(1);
  }
  const files = walkImages(dir);
  if (!files.length) {
    console.error(`[physio-calibrate] ${relative(root, dir)}/ 에 이미지가 없습니다 (.jpg .jpeg .png .webp)`);
    process.exit(1);
  }

  const { assetBase } = readMediaPipePin();
  const html = buildPage(assetBase);

  const server = createServer((req, res) => {
    if (req.url === '/' || req.url.startsWith('/?')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }
    if (req.url.startsWith('/AnalysisEngine.js')) {
      res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
      res.end(readFileSync(resolve(root, 'AnalysisEngine.js')));
      return;
    }
    res.writeHead(404).end();
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  // Chrome 128+ 는 이 플래그 없이 SwiftShader WebGL 을 거부한다 (MediaPipe 는 WebGL 필요).
  const browser = await chromium.launch({
    headless: !flag('headed'),
    channel: opt('channel', undefined),
    args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader']
  });

  const rows = [];
  try {
    const page = await browser.newPage();
    page.on('console', (m) => { if (m.type() === 'error') console.error('  [page]', m.text()); });
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'load' });
    await page.evaluate(() => window.__boot());

    for (const file of files) {
      const label = relative(dir, dirname(file)) || '(라벨없음)';
      const dataUrl = `data:image/${extname(file).slice(1)};base64,${readFileSync(file).toString('base64')}`;
      let out;
      try {
        out = await page.evaluate((u) => window.__measure(u), dataUrl);
      } catch (err) {
        out = { ok: false, reason: err.message };
      }
      if (!out.ok) {
        console.error(`  ✗ ${relative(root, file)} — ${out.reason}`);
        continue;
      }
      rows.push({ file: basename(file), label, ...out });
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (!rows.length) {
    console.error('[physio-calibrate] 측정된 사진이 없습니다. 정면 얼굴 사진인지 확인하세요.');
    process.exit(1);
  }

  report(rows);
  if (flag('emit')) emit(rows);
}

function report(rows) {
  console.log(`\n측정 ${rows.length}장\n`);
  console.log('파일'.padEnd(22) + '라벨'.padEnd(12) + 'jaw    oval   oval2d temple cheek  | 판정');
  console.log('-'.repeat(100));
  for (const r of rows) {
    const w = r.widths;
    console.log(
      r.file.slice(0, 21).padEnd(22) + String(r.label).slice(0, 11).padEnd(12) +
      `${fmt(w.jaw_149_378)}  ${fmt(w.oval_234_454)}  ${fmt(w.oval_2d)}  ${fmt(w.temple_127_356)}  ${fmt(w.cheek_116_345)}  | ${r.winner} (${r.top.join(' > ')})`
    );
  }

  const arch = readArchetypes();
  const archMed = {
    face: median(arch.map((a) => a.face)), slant: median(arch.map((a) => a.slant)),
    dist: median(arch.map((a) => a.dist)), nose: median(arch.map((a) => a.nose)),
    mouth: median(arch.map((a) => a.mouth)), eye: median(arch.map((a) => a.eye))
  };

  console.log('\n── 폭 후보별 faceRatio 중앙값 (아키타입 표 중앙값 ' + fmt(archMed.face) + ' 과 비교) ──');
  for (const key of ['jaw_149_378', 'oval_234_454', 'oval_2d', 'temple_127_356', 'cheek_116_345']) {
    const xs = rows.map((r) => r.widths[key]);
    const m = median(xs);
    const spread = Math.max(...xs) - Math.min(...xs);
    const mark = key === 'jaw_149_378' ? '(현재)' : (m >= 0.72 && m <= 0.90 ? '← 표 대역' : '');
    console.log(`  ${key.padEnd(16)} 중앙 ${fmt(m)}  범위 ${fmt(Math.min(...xs))}~${fmt(Math.max(...xs))} (폭 ${fmt(spread)})  ${mark}`);
  }

  console.log('\n── 6축 측정 중앙값 vs 아키타입 표 중앙값 ──');
  const axes = [
    ['faceRatio', 'face'], ['eyeSlant', 'slant'], ['eyeDistRatio', 'dist'],
    ['noseWidthRatio', 'nose'], ['mouthRatio', 'mouth'], ['eyeRatio', 'eye']
  ];
  for (const [fk, ak] of axes) {
    const xs = rows.map((r) => r.features[fk]);
    console.log(`  ${fk.padEnd(16)} 측정 ${fmt(median(xs))}  범위 ${fmt(Math.min(...xs))}~${fmt(Math.max(...xs))}   표 ${fmt(archMed[ak])}`);
  }

  const winners = {};
  rows.forEach((r) => { winners[r.winner] = (winners[r.winner] || 0) + 1; });
  const sorted = Object.entries(winners).sort((a, b) => b[1] - a[1]);
  console.log(`\n── 현재 판정 분포 ── ${sorted.map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  console.log(`   사진 품질 중앙 ${fmt(median(rows.map((r) => r.features.qualityScore)), 0)} · 여성형 점수 중앙 ${fmt(median(rows.map((r) => r.femininity)), 0)}\n`);
}

function emit() { /* 커밋 4에서 구현 */ }

main().catch((err) => {
  console.error('[physio-calibrate] 실패:', err);
  process.exit(1);
});
