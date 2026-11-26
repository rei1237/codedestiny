// S4b(2026-11-27): 도화·역마·홍염을 정본 신살로 판정한 뒤에도 도파민 점수·등급 분포가 S4 이전과 비슷해야 한다.
// 운영과 같은 엔진 원본 함수(십성·12운성·충·오행 비율·조후)로 고정 시드 무작위 간지 2,000건을 계산한다.
// 목표는 S4 이전(1225836529^) 5,000건 분포다. 허용폭은 등급마다 ±25% 또는 ±3%p(5,000건의 ±150건) 중 넓은 쪽, 평균 ±3점.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import * as SajuNatalCore from '../../lib/saju/natal-core/index.mjs';
import { extractSajuCompatClosure } from '../../scripts/lib/saju-compat-closure.mjs';

const ROOTS = ['GAN', 'JI', 'getTenGod', 'cdTwelveStage', '_sajuVillainBuildBranchRelations', 'calcNatalElement', 'analyzeJohu', 'calcPower'];
const PRE_S4 = { mean: 67.31, share: { SSS: 4.50, SS: 10.30, S: 20.46, A: 33.42, B: 22.40, C: 7.06, D: 1.86 } };

function load() {
  const engine = readFileSync('js/saju-engine.js', 'utf8');
  const { order, decl } = extractSajuCompatClosure(engine, ROOTS);
  const helpers = order.map((name) => decl.get(name)).sort((a, b) => a.node.pos - b.node.pos).map((row) => row.text).join('\n');
  const win = { cdGetCurrentLanguage: () => 'ko', SajuNatalCore };
  vm.runInNewContext(helpers + '\nObject.assign(window,{' + ROOTS.join(',') + '});', { window: win, SajuNatalCore });
  vm.runInNewContext(readFileSync('js/core/saju/dopamineResult.js', 'utf8'), { window: win });
  return win;
}

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('정본 신살 기준 도파민 등급 분포가 S4 이전 분포 범위 안에 있다', () => {
  const w = load();
  for (const name of [...ROOTS.slice(2), 'buildDopamineResult']) assert.equal(typeof w[name], 'function', name);
  assert.equal(typeof SajuNatalCore.computeShinsal, 'function');

  const N = 2000, G = '甲乙丙丁戊己庚辛壬癸', J = '子丑寅卯辰巳午未申酉戌亥', rnd = seeded(20261126);
  const count = { SSS: 0, SS: 0, S: 0, A: 0, B: 0, C: 0, D: 0 };
  let sum = 0;
  for (let i = 0; i < N; i += 1) {
    const p = {};
    for (const key of ['y', 'm', 'd', 'h']) {
      const k = Math.floor(rnd() * 60), g = G[k % 10], j = J[k % 12];
      p[key] = { g, j, gE: w.GAN[g].e, jE: w.JI[j].e };
    }
    const r = w.buildDopamineResult({ p, natal: w.calcNatalElement(p), power: w.calcPower(p), johu: w.analyzeJohu(p) });
    assert.ok(Number.isInteger(r.score) && r.score >= 0 && r.score <= 100, 'score 0~100');
    count[r.grade] += 1;
    sum += r.score;
  }
  const mean = sum / N;
  assert.ok(Math.abs(mean - PRE_S4.mean) <= 3, `평균 ${mean.toFixed(2)} (S4 이전 ${PRE_S4.mean})`);
  for (const [grade, target] of Object.entries(PRE_S4.share)) {
    const share = (count[grade] / N) * 100;
    const tol = Math.max(target * 0.25, 3);
    assert.ok(Math.abs(share - target) <= tol, `${grade} ${share.toFixed(2)}% (S4 이전 ${target}% ±${tol.toFixed(2)}%p) ${JSON.stringify(count)}`);
  }
});
