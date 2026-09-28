import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
// Design §6-4: the timing matrix reuses extendAskLocalTiming, is stored at prepare, and only timing chapters own it. Flag OFF, no LLM.
const Module=createRequire(import.meta.url)('node:module');
const built=await build({stdin:{contents:`export * from './worker/yeongnyangi/fortune/reading-v7-timing'; export {resolveV7Ledger} from './worker/yeongnyangi/fortune/reading-v7-ledger'; export {readingManifestV7} from './worker/yeongnyangi/fortune/reading-v7'; export {extendAskLocalTiming} from './worker/yeongnyangi/fortune/ask/wrappers'; export {products} from './worker/yeongnyangi/payments/catalog'; export {domains} from './worker/yeongnyangi/fortune/index';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const filename=path.resolve('yeongnyangi-reading-v7-timing.test.cjs');
const loaded=new Module(filename);
loaded.filename=filename;
loaded.paths=Module._nodeModulePaths(process.cwd());
loaded._compile(built.outputFiles[0].text,filename);
const m=loaded.exports;
const TIERS=['salmon','flounder','tuna'];
const singles=m.products.filter(p=>p.readingKind==='single');
const manifest=(domain,tier)=>m.readingManifestV7(singles.find(p=>p.domain===domain&&p.fishId===tier),{id:'personal'});
const asOf='2026-09-15T00:00:00Z',today='2026-09-15';
const timed={birthDate:'1997-02-10',birthTime:'14:30',calendarType:'solar',gender:'female',birthPlace:{latitude:37.5665,longitude:126.978,timezone:'Asia/Seoul'}};
const {birthTime:_t,...noTime}=timed;
const fixtures={};
async function fixture(key,domain,birth){
 const engine=m.domains[domain];
 const input=engine.validateInput({personA:birth,question:'요즘 마음이 가는 사람과 앞으로 어떻게 될까요?',readingMode:'personal'});
 fixtures[key]={domain,input,context:engine.buildContext(await engine.calculate(input,{asOf}))};
}
for(const domain of ['saju','ziwei','vedic','astrology','sukuyo'])await fixture(domain,domain,timed);
await fixture('saju:noTime','saju',noTime);
const matrices={};
for(const [key,{context,input}] of Object.entries(fixtures))matrices[key]=await m.buildV7TimingMatrix(context,input,today);
const months=v=>v.map(x=>`${x.start.year}-${String(x.start.month).padStart(2,'0')}`);
const rolling=['2026-09','2026-10','2026-11','2026-12','2027-01','2027-02','2027-03','2027-04','2027-05','2027-06','2027-07','2027-08'];
const TIMING_LABELS=/^(yearlyLuck|monthlyLuck|majorLuck|yearlyTimeline|minorLuck|vimshottariDasha)$/;

test('saju matrix: 12 consecutive months from the pillar in force today, taken from the wrapper, JSON-stable',async()=>{
 const {context,input}=fixtures.saju,matrix=matrices.saju;
 assert.equal(matrix.version,m.V7_TIMING_VERSION);
 assert.deepEqual(matrix.facts.map(f=>f.label),['monthlyLuck']);
 assert.deepEqual(months(matrix.facts[0].value),rolling);
 // Reuse, not recalculation: every stored row is the wrapper's own row.
 const wrapped=(await m.extendAskLocalTiming({saju:context},{saju:input},today)).saju.facts.find(f=>f.label==='monthlyLuck').value;
 for(const row of matrix.facts[0].value)assert.deepEqual(row,wrapped.find(w=>w.start.year===row.start.year&&w.start.month===row.start.month));
 assert.deepEqual(JSON.parse(JSON.stringify(matrix)),matrix);
 // Before 백로 (2026-09-07) the 입추 pillar is still in force.
 const early=await m.buildV7TimingMatrix(context,input,'2026-09-03');
 assert.deepEqual(months(early.facts[0].value),['2026-08',...rolling.slice(0,11)]);
});

test('no matrix rows for saju without a birth time, ziwei, vedic, or domains without timing',()=>{
 for(const key of ['saju:noTime','ziwei','vedic','astrology','sukuyo']){
  assert.deepEqual(matrices[key].facts,[],key);
  assert.deepEqual(m.withV7Timing(fixtures[key].context,matrices[key]),fixtures[key].context,key);
 }
 assert.throws(()=>m.withV7Timing(fixtures.ziwei.context,matrices.saju),/saju matrix for ziwei/);
 assert.throws(()=>m.withV7Timing(fixtures.saju.context,{...matrices.saju,version:'v7-timing-0'}),/unknown matrix version/);
});

test('ledger with the stored matrix: timing facts stay with timing chapters and months get the rolling year',()=>{
 const stored=JSON.parse(JSON.stringify(matrices.saju));
 for(const tier of TIERS){
  const {ledger,unowned,chapters}=m.resolveV7Ledger(manifest('saju',tier),m.withV7Timing(fixtures.saju.context,stored),{asOf});
  assert.deepEqual(ledger.unclassified,[],tier);
  assert.deepEqual(unowned.filter(id=>id.startsWith('saju.monthlyLuck.')),[],tier);
  for(const c of chapters)for(const id of c.owns)if(TIMING_LABELS.test(ledger.facts.get(id).label))assert.equal(c.theme,'timing',`${tier}: ${id} owned by ${c.key}`);
  const monthOwner=chapters.find(c=>c.key===(tier==='salmon'?'yearNow':'months'));
  assert.deepEqual(monthOwner.owns.filter(id=>id.startsWith('saju.monthlyLuck.')),rolling.map(k=>`saju.monthlyLuck.${k}`),tier);
  if(tier==='tuna')assert.deepEqual(chapters.find(c=>c.key==='yearsAhead').owns,[2028,2029,2030,2031,2032,2033,2034,2035].map(y=>`saju.yearlyLuck.${y}`));
 }
});

test('summaries: one deterministic line for timingRef summary chapters only, no premium facts below tuna',()=>{
 for(const [key,{domain,context}] of Object.entries(fixtures))for(const tier of TIERS){
  const where=`${key}/${tier}`;
  const resolve=()=>m.v7TimingSummaries(m.resolveV7Ledger(manifest(domain,tier),m.withV7Timing(context,matrices[key]),{asOf}));
  const chapters=resolve();
  assert.deepEqual(chapters,resolve(),`${where}: not deterministic`);
  const lines=new Set();
  for(const c of chapters){
   if(c.timingRef!=='summary'){assert.equal(c.timingSummary,undefined,`${where}/${c.key}`);continue;}
   assert.ok(c.timingSummary,`${where}/${c.key} has no timing summary`);
   assert.doesNotMatch(c.timingSummary,/\n|1997/,where);
   if(tier!=='tuna')assert.doesNotMatch(c.timingSummary,/대운|대한|다샤/,where);
   lines.add(c.timingSummary);
  }
  assert.ok(lines.size<=1,`${where}: chapters disagree on the timing line`);
  const owner=chapters.find(c=>[...lines][0]?.includes(`「${c.title}」`));
  if(lines.size)assert.equal(owner?.timingRef,'owner',`${where}: summary points at ${owner?.key}`);
 }
 const line=(domain,tier)=>m.v7TimingSummaries(m.resolveV7Ledger(manifest(domain,tier),m.withV7Timing(fixtures[domain].context,matrices[domain]),{asOf})).find(c=>c.timingSummary)?.timingSummary;
 assert.equal(line('saju','flounder'),'올해 세운 丙午(정재가 들어오는 해) — 자세한 흐름은 「올해와 내년」 장에서 다룬다.');
 assert.match(line('saju','tuna'),/^올해 세운 丙午\(정재가 들어오는 해\) · 지금 대운 乙巳\(식신\) — /);
 if(process.env.YEONGNYANGI_TIMING_PRINT)for(const d of ['saju','ziwei','vedic'])for(const t of TIERS)console.log(d,t,line(d,t));
});
