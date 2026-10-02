import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
// Design §6-2 static guards: v7 manifests are checked against the real engines, with the flag OFF and no LLM.
const Module=createRequire(import.meta.url)('node:module');
const built=await build({stdin:{contents:`export * from './worker/yeongnyangi/fortune/reading-v7'; export * from './worker/yeongnyangi/fortune/reading-v7-cost'; export * from './worker/yeongnyangi/fortune/reading-policy'; export {products} from './worker/yeongnyangi/payments/catalog'; export {consultationKinds,consultationManifest,supportsKind,consultationChapterCounts} from './worker/yeongnyangi/fortune/consultation-kinds'; export {domains} from './worker/yeongnyangi/fortune/index';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const filename=path.resolve('yeongnyangi-reading-v7.test.cjs');
const loaded=new Module(filename);
loaded.filename=filename;
loaded.paths=Module._nodeModulePaths(process.cwd());
loaded._compile(built.outputFiles[0].text,filename);
const m=loaded.exports;
const TIERS=['salmon','flounder','tuna'];
const KINDS={saju:['personal','ask'],ziwei:['personal','ask'],vedic:['personal','ask'],astrology:['personal','ask'],sukuyo:['personal','ask'],tarot:['love','choice']};
const singles=m.products.filter(p=>p.readingKind==='single');
const productFor=(domain,tier)=>singles.find(p=>p.domain===domain&&p.fishId===tier);
const manifest=(domain,tier,kind)=>m.readingManifestV7(productFor(domain,tier),{id:kind});
const all=Object.entries(KINDS).flatMap(([domain,kinds])=>kinds.flatMap(kind=>TIERS.map(tier=>({domain,kind,tier,chapters:manifest(domain,tier,kind)}))));
const label=s=>s.split('.')[0];
// The sukuyo relation map is a ledger wrapper over personA; derived owns keep their source label.
const sourceLabel=s=>label(s)==='relationMap'?'personA':label(s);
const overlaps=(a,b)=>a===b||a.startsWith(b+'.')||b.startsWith(a+'.');
const PREMIUM=/usefulGod|jong|majorLuck|vimshottariDasha|dasha|yogas|divisionalCharts|fourTransformations|sanFangSiZheng/;
const PREMIUM_TITLE=/대운|용신|다샤|요가|분할도|사화|삼방사정|대한|나밤샤|다샴샤/;
const FORBIDDEN_FIELD={saju:/heeshin|희신/i,ziwei:/lunar|yearlyFour/i,vedic:/transit|pratyantar/i,astrology:/ruler|dignit|element/i,sukuyo:/birthTimeContext/,tarot:/topSummary|quality|levelUp|questionType/};

test('ownership: no two chapters own overlapping facts; owns come from the chapter inputs; anchor owns the refs',()=>{
 for(const {domain,kind,tier,chapters} of all){
  const where=`${domain}/${kind}/${tier}`;
  const owned=chapters.flatMap(c=>c.owns.map(o=>({o,key:c.key})));
  for(const [i,a] of owned.entries())for(const b of owned.slice(i+1))assert.ok(!overlaps(a.o,b.o),`${where}: ${a.key}.${a.o} ↔ ${b.key}.${b.o}`);
  const anchor=chapters.find(c=>c.key==='anchor');
  assert.ok(anchor&&chapters[0]===anchor,`${where}: anchor first`);
  for(const c of chapters){
   assert.ok(c.owns.length,`${where}/${c.key} owns nothing`);
   const inputs=new Set(c.evidenceInputs.map(label));
   for(const o of c.owns)assert.ok(inputs.has(sourceLabel(o)),`${where}/${c.key}: ${o} outside evidenceInputs`);
   assert.deepEqual(c.refs,c===anchor?[]:m.V7_ANCHOR_REFS[domain]);
   for(const r of c.refs)assert.ok(anchor.owns.includes(r),`${where}: ref ${r} not owned by anchor`);
  }
 }
 // Higher tiers split chapters but never drop a fact family.
 for(const [domain,kinds] of Object.entries(KINDS))for(const kind of kinds){
  const labels=TIERS.map(t=>new Set(manifest(domain,t,kind).flatMap(c=>c.owns.map(sourceLabel))));
  for(let i=1;i<labels.length;i++)for(const l of labels[i-1])assert.ok(labels[i].has(l),`${domain}/${kind}: ${l} lost at ${TIERS[i]}`);
 }
});

test('chapter counts and insight units rise monotonically by tier',()=>{
 const expected={saju:[8,13,24],ziwei:[8,13,20],vedic:[8,13,23],astrology:[8,10,12],sukuyo:[6,8,10],'tarot:love':[5,7,9],'tarot:choice':[4,5,6]};
 const timing={saju:[1,2,6],ziwei:[1,2,4],vedic:[0,0,4],astrology:[0,0,0],sukuyo:[0,0,0],'tarot:love':[0,0,0],'tarot:choice':[0,0,0]};
 for(const [domain,kinds] of Object.entries(KINDS))for(const kind of kinds){
  const key=m.v7CatalogKey(domain,kind);
  const books=TIERS.map(t=>manifest(domain,t,kind));
  assert.deepEqual(books.map(b=>b.length),expected[key],key);
  assert.deepEqual(books.map(b=>b.filter(c=>c.theme==='timing').length),timing[key],`${key} timing`);
  const units=books.map(b=>b.reduce((n,c)=>n+c.minInsightUnits,0));
  for(let i=1;i<3;i++){assert.ok(books[i].length>books[i-1].length,`${key} chapters`);assert.ok(units[i]>units[i-1],`${key} units`);}
  for(const c of books.flat()){assert.equal(c.minInsightUnits,c.mustCover.length);assert.equal(c.mustCover.length,c.decision?2:3,`${key}/${c.key}`);}
 }
});

test('evidenceInputs, refs and fallbacks resolve to real engine fields',async()=>{
 const birth={birthDate:'1997-02-10',birthTime:'14:30',calendarType:'solar',gender:'female',birthPlace:{latitude:37.5665,longitude:126.978,timezone:'Asia/Seoul'}};
 const facts=async(domain,topicId)=>{
  const engine=m.domains[domain];
  const input=engine.validateInput({personA:birth,question:'요즘 마음이 가는 사람과 앞으로 어떻게 될까요?',topicId,readingMode:'personal'});
  const context=engine.buildContext(await engine.calculate(input,{asOf:'2026-09-15T00:00:00Z'}));
  return new Map(context.facts.map(f=>[f.label,f.value]));
 };
 const resolves=(map,selector)=>{
  const [head,key]=[label(selector),selector.split('.').slice(1).join('.')];
  if(!map.has(head))return false;
  const value=map.get(head);
  if(!key)return true;
  if(Array.isArray(value)){
   if(value.some(v=>v&&typeof v==='object'&&(v.name===key||v.positionKey===key)))return true;
   if(value.some(v=>v&&typeof v==='object'&&'house' in v))return value.some(v=>v?.house===Number(key));
   return /^\d+$/.test(key)&&value[Number(key)-1]!==undefined;
  }
  return !!value&&typeof value==='object'&&Object.hasOwn(value,key);
 };
 const cache={};
 for(const {domain,kind,tier,chapters} of all){
  const topicId=domain==='tarot'?(kind==='love'?'love':'general'):undefined;
  const map=cache[domain+topicId]??=await facts(domain,topicId);
  for(const c of chapters)for(const s of [...c.evidenceInputs,...c.refs,...(c.fallbackInputs||[])])
   assert.ok(resolves(map,s),`${domain}/${kind}/${tier}/${c.key}: ${s} is not an engine field`);
 }
});

test('forbidden elements: premium facts stay at tuna, excluded fields never appear, mustNotCover lists them',()=>{
 for(const {domain,kind,tier,chapters} of all)for(const c of chapters){
  const where=`${domain}/${kind}/${tier}/${c.key}`;
  const selectors=[...c.evidenceInputs,...c.owns,...c.refs,...(c.fallbackInputs||[])];
  if(tier!=='tuna'){
   for(const s of selectors)assert.doesNotMatch(label(s),PREMIUM,where);
   assert.doesNotMatch(c.title,PREMIUM_TITLE,where);
  }
  for(const s of selectors)assert.doesNotMatch(s,FORBIDDEN_FIELD[domain],where);
  for(const tag of m.V7_FORBIDDEN[domain])assert.ok(c.mustNotCover.includes(tag),`${where}: ${tag}`);
  assert.ok(!c.mustNotCover.includes(c.title),where);
  assert.equal(c.excludes,undefined);
 }
});

test('cost guard: estimated book cost stays within 10% of price and tier chapter caps',()=>{
 const tariff=JSON.parse(readFileSync('config/llm-tariffs-20260921.json','utf8'))['gemini/gemini-2.5-flash'];
 const caps={salmon:8,flounder:13,tuna:26};
 for(const tier of TIERS){
  const price=productFor('saju',tier).priceKRW;
  assert.ok(singles.filter(p=>p.fishId===tier).every(p=>p.priceKRW===price),`${tier} single price is uniform`);
  assert.ok(m.v7CostRatio(caps[tier],price,tariff)<=m.V7_COST.maxCostRatio,`${tier} cap`);
  for(const {domain,kind,chapters} of all.filter(b=>b.tier===tier)){
   assert.ok(chapters.length<=caps[tier],`${domain}/${kind}/${tier} exceeds cap`);
   const ratio=m.v7CostRatio(chapters.length,price,tariff,kind==='ask'?m.V7_COST.maxQuestions:0);
   assert.ok(ratio<=m.V7_COST.maxCostRatio,`${domain}/${kind}/${tier}: ${(ratio*100).toFixed(1)}%`);
  }
 }
});

test('contract: approved v7 flag keeps tier and kind boundaries; v7 chapters carry per-chapter sections, timing ownership and part order',()=>{
 assert.equal(m.READING_V7_ENABLED,true);
 for(const p of singles)for(const k of m.consultationKinds[p.domain]||[]){
  assert.equal(m.v7Applies(p,k),TIERS.includes(p.fishId)&&KINDS[p.domain].includes(k.id),`${p.id}/${k.id}`);
  assert.equal(m.v7Applies(p,k,true),TIERS.includes(p.fishId)&&KINDS[p.domain].includes(k.id),`${p.id}/${k.id} enabled`);
  if(m.supportsKind(p,k)){
   const selectedV7=m.v7Applies(p,k)&&p.domain!=='tarot';
   assert.equal(m.consultationManifest(p,k).every(c=>c.version===m.READING_V7_VERSION),selectedV7,`${p.id}/${k.id} version`);
  }
 }
 assert.throws(()=>m.readingManifestV7(productFor('saju','mackerel'),{id:'personal'}),{code:'INVALID_READING_MANIFEST'});
 assert.throws(()=>m.readingManifestV7(productFor('tarot','tuna'),{id:'personal'}),{code:'INVALID_READING_MANIFEST'});
 assert.equal(m.hasReadingSections(m.READING_V7_VERSION),true);
 for(const {domain,kind,tier,chapters} of all){
  const hasTiming=chapters.some(c=>c.theme==='timing');
  let last=-1;
  for(const [i,c] of chapters.entries()){
   const where=`${domain}/${kind}/${tier}/${c.key}`;
   assert.equal(c.ordinal,i);assert.equal(c.version,m.READING_V7_VERSION);assert.equal(c.tier,tier);
   assert.equal(c.timingRef==='owner',c.theme==='timing',where);
   if(c.theme!=='timing')assert.equal(c.timingRef,hasTiming&&c.key!=='anchor'?'summary':'none',where);
   const part=m.V7_PART_ORDER.findIndex(id=>m.V7_PARTS[id].label===c.part);
   assert.ok(part>=last,`${where} part order`);last=part;
   assert.equal(c.outputTokens,6450);
   assert.equal(c.requiredSections,undefined);
   assert.equal(c.sections.filter(s=>s.role==='interpretation').length,c.mustCover.length);
   assert.equal(c.sections.some(s=>s.role==='example'),c.scene);assert.equal(c.sections.some(s=>s.role==='action'),c.decision);
   for(const s of c.sections)assert.ok(s.minimumChars<=s.targetChars[0]*.8,`${where}/${s.id} floor`);
   const sum=c.sections.reduce((n,s)=>n+s.minimumChars,0);
   assert.ok(sum>=m.v7ChapterPolicy.minimum&&sum<=m.v7ChapterPolicy.minimum+c.sections.length,where);
   assert.deepEqual(Object.keys(c.factSelectors),[domain]);
  }
 }
});

test('tier price tables count the chapters the consultation buttons promise',()=>{
 // The tables print min~max over consultationChapterCounts; the fish buttons print consultationManifest(...).length.
 for(const tier of ['mackerel',...TIERS]){
  const counts=singles.filter(p=>p.fishId===tier).flatMap(m.consultationChapterCounts);
  for(const p of singles.filter(p=>p.fishId===tier))for(const k of m.consultationKinds[p.domain].filter(k=>m.supportsKind(p,k)))
   assert.ok(counts.includes(m.consultationManifest(p,k).length),`${p.id}:${k.id}`);
 }
 assert.ok(m.consultationChapterCounts(productFor('saju','tuna')).includes(manifest('saju','tuna','personal').length));
 for(const file of ['app/yeongnyangi/1000-won-fortune/page.tsx','app/yeongnyangi/_components/YeongnyangiGuide.tsx'])
  assert.match(readFileSync(file,'utf8'),/const chapterRange=\(items:Product\[\]\)=>\{const counts=items\.flatMap\(consultationChapterCounts\);/,file);
});
