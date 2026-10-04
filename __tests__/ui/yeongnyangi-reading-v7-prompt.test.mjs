import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
// Design §6-5: chapter-v7 prompt and output schema. Block = insight unit, scene ≤1, decision only in decision
// chapters, carry reuses highlights[]/topics[], summary chapters get one timing line. Flag OFF, no LLM.
const Module=createRequire(import.meta.url)('node:module');
const built=await build({stdin:{contents:`export * from './worker/yeongnyangi/fortune/reading-v7-prompt'; export {readingManifestV7,withV7Sections} from './worker/yeongnyangi/fortune/reading-v7'; export {resolveV7Ledger,selectV7Facts} from './worker/yeongnyangi/fortune/reading-v7-ledger'; export {buildV7TimingMatrix,withV7Timing,v7TimingSummaries} from './worker/yeongnyangi/fortune/reading-v7-timing'; export {explanationFacts} from './worker/yeongnyangi/fortune/shared/privacy'; export {products} from './worker/yeongnyangi/payments/catalog'; export {domains} from './worker/yeongnyangi/fortune/index';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const filename=path.resolve('yeongnyangi-reading-v7-prompt.test.cjs');
const loaded=new Module(filename);
loaded.filename=filename;
loaded.paths=Module._nodeModulePaths(process.cwd());
loaded._compile(built.outputFiles[0].text,filename);
const m=loaded.exports;

const TIERS=['salmon','flounder','tuna'];
const KINDS={saju:['personal','ask'],ziwei:['personal','ask'],vedic:['personal','ask'],astrology:['personal','ask'],sukuyo:['personal','ask'],tarot:['choice','love']};
const singles=m.products.filter(p=>p.readingKind==='single');
const manifest=(domain,tier,kind='personal')=>m.readingManifestV7(singles.find(p=>p.domain===domain&&p.fishId===tier),{id:kind});
// Every (system, tier, kind) the catalog covers; the prompt has to hold for all of them, not one sample.
const all=Object.entries(KINDS).flatMap(([domain,kinds])=>kinds.flatMap(kind=>TIERS.map(tier=>({domain,tier,kind,chapters:manifest(domain,tier,kind)}))));

const asOf='2026-09-15T00:00:00Z',today='2026-09-15';
const birth={birthDate:'1997-02-10',birthTime:'14:30',calendarType:'solar',gender:'female',birthPlace:{latitude:37.5665,longitude:126.978,timezone:'Asia/Seoul'}};
const engine=m.domains.saju;
const sajuInput=engine.validateInput({personA:birth,question:'올해 일과 사람 사이에서 무엇을 먼저 정해야 할까요?',readingMode:'personal'});
const sajuContext=m.withV7Timing(engine.buildContext(await engine.calculate(sajuInput,{asOf})),await m.buildV7TimingMatrix(engine.buildContext(await engine.calculate(sajuInput,{asOf})),sajuInput,today));
// chapter.ts feeds CALCULATED_DATA through explanationFacts; the schema enum must be built from that same list.
const factsFor=(chapter,ledger)=>m.explanationFacts(m.selectV7Facts(sajuContext,chapter,{asOf,ledger}));
const resolved=Object.fromEntries(TIERS.map(tier=>[tier,m.v7TimingSummaries(m.resolveV7Ledger(manifest('saju',tier),sajuContext,{asOf}))]));
const ledgers=Object.fromEntries(TIERS.map(tier=>[tier,m.resolveV7Ledger(manifest('saju',tier),sajuContext,{asOf}).ledger]));
const TIMING_LABELS=/^(yearlyLuck|monthlyLuck|majorLuck|yearlyTimeline|minorLuck|vimshottariDasha)$/;
// Dated derived facts (one per year or luck cycle) are timing facts too; their natal part is not.
const isTiming=f=>TIMING_LABELS.test(f.label)||(/^(movementSignals|romanceTiming)$/.test(f.label)&&!/\.natal$/.test(f.id));

const body=(n,highlights,topics)=>({summary:`요약 ${n}`,example:'',advice:'',persona:'',analysis:[],sources:[],highlights,topics});

test('promptVersion, depth and timeTheme come from the catalog, not from the chapter title', ()=>{
 for(const {domain,tier,kind,chapters} of all)for(const chapter of chapters){
  const where=`${domain}/${tier}/${kind}/${chapter.key}`;
  const parts=m.buildV7ChapterPrompt({chapter,facts:[],previous:[]});
  assert.equal(parts.promptVersion,'chapter-v7',where);
  assert.equal(parts.depth,chapter.mustCover.join(' → '),where);
  assert.equal(parts.domainRules.depth,parts.depth,where);
  // v6 reads the title with /시기|전환|흐름|년/; v7 asks the ledger so '올해와 내년' is not the only signal.
  assert.equal(parts.timeTheme,chapter.timingRef==='owner',where);
 }
 // Ask chapter 0 keeps the existing question path (design §1, §3).
 const askChapter=manifest('saju','flounder','ask')[0];
 assert.equal(m.buildV7ChapterPrompt({chapter:askChapter,facts:[],previous:[],askFirstChapter:true}).promptVersion,'ask-chapter-v1');
 assert.equal(m.buildV7ChapterPrompt({chapter:askChapter,facts:[],previous:[]}).promptVersion,'chapter-v7');
});

test('one block per insight unit: schema ids follow sections, scene and decision appear only where the catalog puts them', ()=>{
 for(const {domain,tier,kind,chapters} of all)for(const chapter of chapters){
  const where=`${domain}/${tier}/${kind}/${chapter.key}`;
  const ids=chapter.sections.map(s=>s.id);
  const {blocks}=m.buildV7ChapterPrompt({chapter,facts:[{id:'saju.dayMaster',label:'dayMaster',value:1}],previous:[]}).outputSchema;
  assert.deepEqual(blocks.items.properties.id.enum,ids,where);
  assert.equal(blocks.minItems,ids.length,where);
  assert.equal(blocks.maxItems,ids.length,where);
  assert.deepEqual(blocks.items.required,['id','title','paragraphs','sources'],where);
  assert.equal(blocks.items.properties.sources.minItems,1,where);
  assert.deepEqual(blocks.items.properties.sources.items.enum,['saju.dayMaster'],where);
  // Block = insight unit: mustCover in order, then at most one scene and one decision.
  assert.deepEqual(ids.filter(id=>id.startsWith('insight-')),chapter.mustCover.map((_,i)=>`insight-${i+1}`),where);
  assert.equal(ids.filter(id=>id==='scene').length,chapter.scene?1:0,where);
  assert.equal(ids.filter(id=>id==='decision').length,chapter.decision?1:0,where);
  assert.equal(chapter.minInsightUnits,chapter.mustCover.length,where);
 }
 // A short highlights list is corrected downstream, so the schema must not make it a refusal (principle 17).
 const schema=m.buildV7ChapterPrompt({chapter:all[0].chapters[0],facts:[],previous:[]}).outputSchema;
 assert.deepEqual(Object.keys(schema),['blocks']);
});

test('carry is rebuilt from highlights[] and topics[], cut deterministically at the 3,000-token budget', ()=>{
 const previous=[
  body(1,['첫 장 결론 A','첫 장 결론 B'],['기질','scene: 아침 회의','일반 주제']),
  body(2,['둘째 장 결론'],['재물','action:주간 점검 하나 만들기','기질']),
 ];
 const carry=m.v7Carry(previous);
 assert.deepEqual(carry.usedScenes,['아침 회의']);
 assert.deepEqual(carry.usedActions,['주간 점검 하나 만들기']);
 assert.deepEqual(carry.previousTopics,['기질','일반 주제','재물']);
 // Newest chapter first: its conclusions are the ones the next chapter is most likely to repeat.
 assert.deepEqual(carry.previousHighlights,['둘째 장 결론','첫 장 결론 A','첫 장 결론 B']);
 assert.equal(m.V7_CARRY_CHARS,2000);

 // Over budget: tags survive whole because they are the dedup keys, conclusions are cut to a prefix.
 const many=Array.from({length:30},(_,i)=>body(i,[`${i}번 장의 결론 `.padEnd(200,'가'),`${i}번 장의 보조 결론`],[`주제${i}`,`scene:소재${i}`,`action:행동${i}`]));
 const big=m.v7Carry(many);
 assert.deepEqual(big,m.v7Carry(many),'not deterministic');
 assert.equal(big.usedScenes.length,30);
 assert.equal(big.usedActions.length,30);
 assert.ok(big.previousHighlights.length>0&&big.previousHighlights.length<60,`cut did not bite: ${big.previousHighlights.length}`);
 for(const line of big.previousHighlights)assert.ok(line.length<=m.V7_HIGHLIGHT_CHARS,line.length);
 const total=[...big.previousHighlights,...big.previousTopics,...big.usedScenes,...big.usedActions].reduce((n,s)=>n+s.length,0);
 assert.ok(total<=m.V7_CARRY_CHARS,`carry ${total} chars over budget`);
 assert.ok(big.previousHighlights[0].startsWith('29번 장의 결론'),big.previousHighlights[0]);
 // Duplicated conclusions and blank entries never take budget twice.
 const repeated=m.v7Carry([body(1,['같은 결론','  '],['주제']),body(2,['같은 결론'],['주제'])]);
 assert.deepEqual(repeated.previousHighlights,['같은 결론']);
 assert.deepEqual(repeated.previousTopics,['주제']);

 // The carry replaces v6's previousConclusions/previousExamples instead of stacking on top of them.
 const rules=m.buildV7ChapterPrompt({chapter:all[0].chapters[0],facts:[],previous}).domainRules;
 assert.deepEqual(rules.previousHighlights,carry.previousHighlights);
 assert.deepEqual(rules.usedScenes,carry.usedScenes);
 assert.deepEqual(rules.usedActions,carry.usedActions);
 assert.equal(rules.previousConclusions,undefined);
 assert.equal(rules.previousExamples,undefined);
});

test('summary chapters get the one-line timing summary and no timing facts; owner chapters get the facts', ()=>{
 for(const tier of TIERS)for(const chapter of resolved[tier]){
  const where=`${tier}/${chapter.key}`;
  const facts=factsFor(chapter,ledgers[tier]);
  const parts=m.buildV7ChapterPrompt({chapter,facts,previous:[]});
  const timing=facts.filter(isTiming);
  if(chapter.timingRef==='owner'){
   assert.equal(parts.domainRules.timingSummary,undefined,where);
   assert.ok(timing.length,`${where}: timing owner has no timing facts`);
  }else{
   assert.deepEqual(timing,[],`${where}: ${chapter.timingRef} chapter received timing facts`);
   if(chapter.timingRef==='summary'){
    assert.equal(parts.domainRules.timingSummary,chapter.timingSummary,where);
    assert.doesNotMatch(parts.domainRules.timingSummary,/\n/,where);
   }else assert.equal(parts.domainRules.timingSummary,undefined,where);
  }
  // Fail-closed: a stale line on a non-summary chapter is dropped, never sent beside the facts it duplicates.
  assert.equal(m.buildV7ChapterPrompt({chapter:{...chapter,timingSummary:'남은 한 줄'},facts,previous:[]}).domainRules.timingSummary,chapter.timingRef==='summary'?'남은 한 줄':undefined,where);
  assert.match(String(parts.domainRules.timingScope),chapter.timingRef==='owner'?/소유한다/:chapter.timingRef==='summary'?/한 줄 요약/:/다루지 않는다/,where);
  // Input facts are selectV7Facts (owns ∪ refs): the schema may offer nothing else.
  assert.deepEqual(parts.sourceIds,[...new Set(facts.map(f=>f.id))],where);
  assert.deepEqual(parts.domainRules.factOwnership.owns,chapter.owns,where);
  assert.deepEqual(parts.domainRules.factOwnership.references,chapter.refs,where);
  assert.deepEqual(parts.domainRules.excludedSubjects,chapter.mustNotCover,where);
 }
});

test('output budget keeps the chapter target plus headroom and stays under the provider cap', ()=>{
 for(const {domain,tier,kind,chapters} of all)for(const chapter of chapters){
  const where=`${domain}/${tier}/${kind}/${chapter.key}`;
  // Principle 17: the floor is at most 80% of the target floor and the budget covers target max + preamble.
  assert.ok(chapter.minimumChars<=chapter.targetChars[0]*.8,`${where}: floor ${chapter.minimumChars}`);
  for(const questions of [0,2,5]){
   const tokens=m.v7OutputTokens(chapter,questions);
   assert.ok(tokens>=Math.ceil((chapter.targetChars[1]+800)*1.5)+1024,`${where}/${questions}q: ${tokens}`);
   assert.ok(tokens<=12274,`${where}/${questions}q over the provider cap: ${tokens}`);
   assert.equal(m.buildV7ChapterPrompt({chapter,facts:[],previous:[],questionCount:questions}).maxOutputTokens,tokens,where);
  }
  assert.ok(m.v7OutputTokens(chapter,2)>m.v7OutputTokens(chapter,0),`${where}: questions add no room`);
 }
});
test('every health chapter, and no other chapter, carries the shared health contract', ()=>{
 const seen=new Set();
 for(const {domain,tier,kind,chapters} of all)for(const chapter of chapters){
  const rule=m.buildV7ChapterPrompt({chapter,facts:[],previous:[]}).domainRules.healthContract;
  if(chapter.key==='health'){assert.equal(rule,m.HEALTH_RULES,`${domain}/${tier}/${kind}/${chapter.key}`);seen.add(domain);}
  else assert.equal(rule,undefined,`${domain}/${tier}/${kind}/${chapter.key}`);
 }
 assert.deepEqual([...seen].sort(),['astrology','saju','vedic','ziwei']);
 assert.match(m.HEALTH_RULES,/의료진/);
});
