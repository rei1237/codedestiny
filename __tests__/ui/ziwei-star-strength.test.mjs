import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {
  ZIWEI_QUANSHU_STRENGTH_LINES,ZIWEI_IZTRO_BRIGHTNESS_FROM_YIN,ZIWEI_LEGACY_MAIN_STRENGTH_TABLE,ZIWEI_RATED_STAR_META,
  parseQuanshuStrengthLine,iztroRowByBranchIndex,normalizeZiweiStrengthNotation,starStrength,isZiweiMainStar,
} from '../../lib/ziwei-star-strength.js';
// The canonical Ziwei strength table: 『紫微斗數全書』 卷三 star-head lines first, iztro only for cells the text leaves blank.
// Counts were measured on 2026-10-01 against wikisource rev 2268626 and iztro bb1781c.

const MAIN=ZIWEI_RATED_STAR_META.filter(s=>s.kind==='main').map(s=>s.name);
const SIX=ZIWEI_RATED_STAR_META.filter(s=>s.kind!=='main').map(s=>s.name);
const cells=stars=>stars.flatMap(star=>Array.from({length:12},(_,b)=>({star,b,s:starStrength(star,b)})));
const count=(rows,fn)=>rows.filter(fn).length;
const iztroGrade=(star,b)=>normalizeZiweiStrengthNotation(iztroRowByBranchIndex(ZIWEI_IZTRO_BRIGHTNESS_FROM_YIN[star])[b]).grade;

test('classical star-head lines stay verbatim (typo 贪狠 included)',()=>{
  const joined=Object.entries(ZIWEI_QUANSHU_STRENGTH_LINES).map(([k,v])=>`${k}=${v}`).join('\n');
  assert.equal(createHash('sha256').update(joined).digest('hex').slice(0,16),'a2466d0e2591503d');
  assert.ok(ZIWEI_QUANSHU_STRENGTH_LINES.탐랑.startsWith('贪狠 '));
  assert.equal(parseQuanshuStrengthLine(ZIWEI_QUANSHU_STRENGTH_LINES.무곡).noXian,true);
  assert.equal(parseQuanshuStrengthLine(ZIWEI_QUANSHU_STRENGTH_LINES.천기).noXian,false);
  assert.deepEqual(parseQuanshuStrengthLine(ZIWEI_QUANSHU_STRENGTH_LINES.자미),{cells:['平','庙','旺','旺',null,'旺','庙','庙','旺','旺',null,'旺'],noXian:true});
});

test('14 main stars: 126 classical cells, iztro agrees on 125, fills 42, every one of 168 cells is rated',()=>{
  const rows=cells(MAIN);
  assert.equal(rows.length,168);
  assert.equal(count(rows,r=>r.s.status==='rated'),168);
  assert.equal(count(rows,r=>r.s.basis==='classical'),126);
  assert.equal(count(rows,r=>r.s.basis==='modern-single'),42);
  const dissent=rows.filter(r=>r.s.dissent);
  assert.deepEqual(dissent.map(r=>[r.star,r.b,r.s.rawKo,r.s.dissent.grade]),[['천기',4,'왕','li']]);
  assert.equal(count(rows,r=>r.s.basis==='classical'&&iztroGrade(r.star,r.b)===r.s.grade),125);
  for(const r of rows.filter(r=>r.s.basis==='modern-single'))assert.equal(r.s.grade,iztroGrade(r.star,r.b));
});

test('six assistant/malefic stars: 52 classical, iztro agrees on 51, 12 filled, 8 seats structurally impossible',()=>{
  const rows=cells(SIX);
  assert.equal(count(rows,r=>r.s.basis==='classical'),52);
  assert.equal(count(rows,r=>r.s.basis==='modern-single'),12);
  const impossible=rows.filter(r=>r.s.status==='impossible');
  assert.deepEqual(impossible.map(r=>`${r.star}${r.b}`),['경양2','경양5','경양8','경양11','타라0','타라3','타라6','타라9']);
  assert.ok(impossible.every(r=>r.s.grade===null));
  assert.deepEqual(rows.filter(r=>r.s.dissent).map(r=>[r.star,r.b,r.s.rawKo,r.s.dissent.grade]),[['문곡',2,'함','ping']]);
  assert.equal(count(rows,r=>r.s.basis==='classical'&&iztroGrade(r.star,r.b)===r.s.grade),51);
});

test('grades never fold and unknown notation stays null',()=>{
  assert.deepEqual(['묘','왕','득','리','평','불','함'].map(g=>normalizeZiweiStrengthNotation(g).rank),[1,2,3,4,5,6,7]);
  assert.equal(normalizeZiweiStrengthNotation('地').rawKo,'득');
  assert.equal(normalizeZiweiStrengthNotation('한').rank,null);
  for(const raw of ['약','이','실'])assert.deepEqual([normalizeZiweiStrengthNotation(raw).grade,normalizeZiweiStrengthNotation(raw).status],[null,'unmapped']);
  assert.equal(normalizeZiweiStrengthNotation('').status,'missing');
  for(const star of ['좌보','우필','천괴','천월','지공','지겁','녹존'])assert.deepEqual([starStrength(star,1).status,starStrength(star,1).grade],['not-rated',null]);
  assert.equal(starStrength('자미',12).status,'missing');
  assert.ok(isZiweiMainStar('파군')&&!isZiweiMainStar('문창'));
});

test('legacy table is kept for comparison only: matches the classical text on 49 of 126 cells; the shell, the app and the worker read the canonical table',()=>{
  const shell=readFileSync('js/saju-engine.js','utf8'),worker=readFileSync('worker/lib/ziwei-ai-chart.js','utf8'),app=readFileSync('app/_lib/ziwei-strength.ts','utf8');
  // S4 (2026-10-01) replaced the shell's legacy table with ZW_STAR_STRENGTH; verify:ziwei-borrowed-strength checks all 240 cells.
  assert.ok(!shell.includes('ZW_CLASSICAL_STATE')&&shell.includes('var ZW_STAR_STRENGTH = {'));
  // S4 also replaced the app's ZIWEI_CLASSICAL_STATE (which folded 태음 寅 '한' into '평') with a read of this module.
  assert.ok(!app.includes('ZIWEI_CLASSICAL_STATE')&&app.includes('from "../../lib/ziwei-star-strength.js"'));
  // S5 (2026-10-01) replaced the worker's legacy 28-star table and its 5-level fold (왕→묘, 약→리, 불·한→평) the same way.
  assert.ok(!worker.includes('ZIWEI_BRIGHTNESS_TABLE')&&!worker.includes('normalizeBrightnessLevel')&&worker.includes('from "../../lib/ziwei-star-strength.js"'));
  const rows=cells(MAIN).filter(r=>r.s.basis==='classical');
  assert.equal(count(rows,r=>normalizeZiweiStrengthNotation(ZIWEI_LEGACY_MAIN_STRENGTH_TABLE[r.star][r.b]).grade===r.s.grade),49);
});
