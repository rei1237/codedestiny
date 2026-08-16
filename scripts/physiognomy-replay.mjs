// 관상 동물상 오프라인 재생 평가기 (개발 전용 · 배포되지 않음)
//
// 목적: AnalysisEngine.js 를 고칠 때마다 "라벨 적중률이 올랐는가"를 즉시 재는 것.
//   physio:measure 는 사진마다 브라우저 FaceMesh 를 돌려 3분쯤 걸린다. 그 결과로 남은
//   calibration/.measurements.json 에는 랜드마크 원본이 들어 있으므로, 축 계산식이든
//   아키타입 표든 바꾼 뒤 여기서 실엔진 analyze() 를 그대로 재생하면 사진을 다시 안 돌려도
//   똑같은 판정을 얻는다. 브라우저를 띄우지 않으니 초 단위로 끝난다.
//
// 전제: 사진 자체가 바뀌면(추가/삭제) physio:measure 를 다시 돌려야 한다.
//   랜드마크는 사진에서 나오는 값이라 엔진 수정과 무관하게 유효하다.
//
// 사용법:
//   npm run physio:measure    (사진이 바뀌었을 때 한 번)
//   npm run physio:replay     (엔진을 고칠 때마다)
//   npm run physio:replay -- --confusion   오판 행렬까지

import { readFileSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const dump = resolve(root, opt('json', 'calibration/.measurements.json'));
if (!existsSync(dump)) {
  console.error(`[physio-replay] ${relative(root, dump)} 가 없습니다.`);
  console.error('  먼저 계측하세요:  npm run physio:measure');
  process.exit(1);
}

const { rows } = JSON.parse(readFileSync(dump, 'utf8'));
const labeled = rows.filter((r) => r.label && r.label !== '(라벨없음)');
if (!rows.length) {
  console.error('[physio-replay] 계측 행이 비어 있습니다.');
  process.exit(1);
}

// 실엔진을 그대로 로드한다 (verify-physiognomy-scoring.mjs 와 같은 방식).
const analysis = readFileSync(resolve(root, 'AnalysisEngine.js'), 'utf8');
const dom = new JSDOM('<!doctype html><body></body>');
const engine = new Function('window', 'document', analysis + '\nreturn window.faceAnalysisEngine;')(dom.window, dom.window.document);
await engine.loadDatabase();

const fmt = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d) : '-');
const norm = (s) => String(s || '').replace(/상$/, '');

const results = [];
for (const r of rows) {
  const lm = r.landmarks.map(([x, y, z]) => ({ x, y, z }));
  // 표정 데이터는 계측 때도 넣지 않았다 (null) — 두 경로의 조건을 같게 유지한다.
  const out = await engine.analyze(lm, null, r.aspect ?? 1);
  results.push({
    file: r.file, label: r.label, winner: out.primaryAnimal,
    top3: (out.top3 || []).map((t) => t.animal.name),
    quality: out.qualityScore, confidence: out.confidence
  });
}

const hit = results.filter((x) => x.label !== '(라벨없음)' && norm(x.winner) === norm(x.label));
const top3hit = results.filter((x) => x.label !== '(라벨없음)' && x.top3.some((t) => norm(t) === norm(x.label)));

const wins = {};
results.forEach((x) => { wins[x.winner] = (wins[x.winner] || 0) + 1; });
const ranked = Object.entries(wins).sort((a, b) => b[1] - a[1]);

console.log(`\n[physio-replay] ${results.length}장 재생 (라벨 ${labeled.length}장)`);
console.log(`  1위 적중  ${hit.length}/${labeled.length}  ${fmt((hit.length / labeled.length) * 100)}%`);
console.log(`  TOP3 적중 ${top3hit.length}/${labeled.length}  ${fmt((top3hit.length / labeled.length) * 100)}%`);
console.log(`  도달 동물 ${ranked.length}/27  ·  최다 ${ranked[0][0]} ${fmt((ranked[0][1] / results.length) * 100)}%`);
console.log(`  판정 분포 ${ranked.slice(0, 8).map(([k, v]) => `${k} ${v}`).join(' · ')}`);

// 라벨별 재현율 — 어떤 동물상이 통째로 도달 불가인지 본다.
const byLabel = new Map();
labeled.forEach((r) => { if (!byLabel.has(r.label)) byLabel.set(r.label, []); byLabel.get(r.label).push(r); });
console.log('\n  라벨별 재현율:');
for (const [label] of [...byLabel].sort()) {
  const grp = results.filter((x) => x.label === label);
  const h = grp.filter((x) => norm(x.winner) === norm(label)).length;
  const t3 = grp.filter((x) => x.top3.some((t) => norm(t) === norm(label))).length;
  console.log(`    ${label.padEnd(10)} 1위 ${h}/${grp.length}  TOP3 ${t3}/${grp.length}`);
}

if (flag('confusion')) {
  console.log('\n  오판 상세:');
  results
    .filter((x) => x.label !== '(라벨없음)' && norm(x.winner) !== norm(x.label))
    .forEach((x) => console.log(`    ${x.file.slice(0, 26).padEnd(27)} ${x.label.padEnd(8)} → ${String(x.winner).padEnd(8)} (${x.top3.join(' > ')})`));
}
console.log('');
