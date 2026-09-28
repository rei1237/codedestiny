import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
// Design §4 (ownership, reference points) and §7 measurement, Phase 3: the v7 prose audit. The three primary
// checks are ownership, reference-point repetition and scene/action reuse; similarity is only a backstop.
// A violation costs one repair attempt and is then pruned deterministically — never a refused reading
// (principle 17). Flag stays OFF and no LLM is called: the mock provider supplies every body.
const Module=createRequire(import.meta.url)('node:module');
const built=await build({stdin:{contents:`export * from './worker/yeongnyangi/fortune/reading-v7-quality'; export {readingManifestV7} from './worker/yeongnyangi/fortune/reading-v7'; export {consultationManifest} from './worker/yeongnyangi/fortune/consultation-kinds'; export {READING_V6_VERSION,READING_V7_VERSION} from './worker/yeongnyangi/fortune/reading-policy'; export {resolveV7Ledger} from './worker/yeongnyangi/fortune/reading-v7-ledger'; export {buildV7TimingMatrix,withV7Timing,v7TimingSummaries} from './worker/yeongnyangi/fortune/reading-v7-timing'; export {validateChapter} from './worker/yeongnyangi/providers/chapter'; export {MockChapterProvider} from './__tests__/fixtures/yeongnyangi-chapter'; export {products} from './worker/yeongnyangi/payments/catalog'; export {domains} from './worker/yeongnyangi/fortune/index';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const filename=path.resolve('yeongnyangi-reading-v7-quality.test.cjs');
const loaded=new Module(filename);
loaded.filename=filename;
loaded.paths=Module._nodeModulePaths(process.cwd());
loaded._compile(built.outputFiles[0].text,filename);
const m=loaded.exports;

const paragraphs=(...lines)=>[lines.join(' ')];
const blocks=rows=>rows.map(([id,...lines])=>({id,title:id,paragraphs:paragraphs(...lines),sources:['saju.dayMaster']}));
const bodyOf=(rows,topics=[])=>({summary:'요약',analysis:[],example:'',advice:'',persona:'페르소나',
  highlights:['결론'],sources:['saju.dayMaster'],topics,blocks:blocks(rows)});
const spec=(owns,refs,extra={})=>({owns,refs,scene:false,decision:false,...extra});
const audit=(body,chapter,previous=[],askFirstChapter=false)=>m.auditV7Chapter({body,chapter,previous,askFirstChapter});
const prose=body=>body.blocks.flatMap(b=>b.paragraphs).join(' ');
const count=(text,term)=>text.split(term).length-1;

test('ownership: the owner explains its fact freely, another chapter naming it is flagged and pruned',()=>{
 const rows=[['insight-1','정재의 흐름은 꾸준한 보상으로 나타납니다.','정재가 강한 해에는 지출 기준을 먼저 정합니다.']];
 const owner=audit(bodyOf(rows),spec(['saju.tenGods.jeongjae'],['saju.dayMaster']));
 assert.equal(owner.code,undefined,'the owning chapter may explain its own fact in every sentence');
 assert.deepEqual(owner.violations,[]);
 const other=audit(bodyOf(rows),spec(['saju.tenGods.jeonggwan'],['saju.dayMaster']));
 assert.equal(other.code,m.V7_FOREIGN_FACT);
 assert.equal(other.violations.length,2,'a fact this chapter neither owns nor references has no allowance');
 assert.match(other.detail,/^V7_FOREIGN_FACT:정재:2$/);
 const pruned=m.pruneV7Chapter(bodyOf(rows),other);
 assert.equal(pruned.removed,2);
 assert.equal(pruned.body.blocks.length,1,'a block is never dropped: the chapter must still match sections.length');
 assert.ok(pruned.restored>0);
});

test('reference points: one sentence may point at an anchor, the second explanation is flagged',()=>{
 const rows=[['insight-1','일간의 성향은 앞 장에서 다룬 기준점입니다.','일간이 무엇을 뜻하는지 다시 풀어 보면 이렇습니다.','상관은 표현하는 힘을 뜻합니다.']];
 const chapter=spec(['saju.tenGods.sanggwan'],['saju.dayMaster','saju.pillars']);
 const result=audit(bodyOf(rows),chapter);
 assert.equal(result.code,m.V7_ANCHOR_REPEAT);
 assert.equal(result.violations.length,1,'only the repeat is a violation, and the owned fact is untouched');
 assert.equal(result.violations[0].term,'일간');
 const kept=prose(m.pruneV7Chapter(bodyOf(rows),result).body);
 assert.equal(count(kept,'일간'),1);
 assert.ok(kept.includes('상관은 표현하는 힘을'),'an owned fact is never pruned');
 // The owner of the reference point explains it as often as the insight needs.
 assert.equal(audit(bodyOf(rows),spec(['saju.dayMaster','saju.tenGods.sanggwan'],[])).code,undefined);
});

test('house numbers are read as facts, and the label differs by system',()=>{
 const rows=[['insight-1','7하우스의 관계 축이 이 장의 주제입니다.','10하우스의 직업 축은 다른 장에서 다룹니다.']];
 const vedic=audit(bodyOf(rows),spec(['vedic.houses.7'],['vedic.lagna']));
 assert.equal(vedic.code,m.V7_FOREIGN_FACT);
 assert.deepEqual(vedic.violations.map(v=>v.term),['10하우스']);
 const astrology=audit(bodyOf(rows),spec(['astrology.houseCusps.7','astrology.houseCusps.10'],['astrology.ascendant']));
 assert.equal(astrology.code,undefined,'astrology stores houses under houseCusps');
});

test('scene reuse: a spent subject is flagged in the scene block and in the topic tag',()=>{
 const previous=[{topics:['scene:이직 면담','action:주간 점검표'],highlights:[]}];
 const rows=[['insight-1','이직 면담을 앞둔 판단 기준을 먼저 정리합니다.'],
   ['scene','이직 면담을 기다리는 장면을 가정해 봅니다.','대화의 순서를 미리 적어 두는 장면입니다.']];
 const body=bodyOf(rows,['scene:이직 면담','관계']);
 const result=audit(body,spec(['saju.tenGods.jeonggwan'],['saju.dayMaster'],{scene:true}),previous);
 assert.equal(result.code,m.V7_SCENE_REUSE);
 assert.deepEqual(result.topics,[0],'the declared tag repeats a previous chapter');
 assert.deepEqual(result.violations.map(v=>v.block),[1],'an interpretation that names the subject once is not a reused scene');
 const pruned=m.pruneV7Chapter(body,result);
 assert.deepEqual(pruned.body.topics,['관계']);
 assert.ok(!pruned.body.blocks[1].paragraphs.join(' ').includes('이직 면담을 기다리는'));
 assert.ok(pruned.body.blocks[1].paragraphs.join(' ').includes('대화의 순서를'));
 // A fresh subject passes: the check is the used list, not the word 장면.
 assert.equal(audit(bodyOf([['scene','승진 발표를 기다리는 장면을 가정해 봅니다.']]),
   spec(['saju.tenGods.jeonggwan'],['saju.dayMaster'],{scene:true}),previous).code,undefined);
});

test('backstop: a previous sentence written again in other words is flagged, a new judgment is not',()=>{
 const previous=[{topics:[],highlights:[],blocks:[{id:'insight-1',title:'t',
   paragraphs:['관계에서 먼저 말을 꺼내는 쪽이 기준을 정하게 됩니다.']}]}];
 const chapter=spec(['saju.tenGods.jeonggwan'],['saju.dayMaster']);
 const restated=audit(bodyOf([['insight-1','관계에서 먼저 말을 꺼내는 쪽이 기준을 정하게 되지요.']]),chapter,previous);
 assert.equal(restated.code,m.V7_RESTATED_SENTENCE);
 assert.equal(restated.violations.length,1);
 const fresh=audit(bodyOf([['insight-1','책임을 나눌 범위를 숫자로 적어 두면 판단이 빨라집니다.']]),chapter,previous);
 assert.equal(fresh.code,undefined);
 // Short lines stay out of the metric, exactly as the measurement defined it.
 assert.ok(m.V7_SENTENCE_MIN>0&&m.V7_RESTATE_DICE>0);
 assert.equal(audit(bodyOf([['insight-1','네.']]),chapter,previous).code,undefined);
});

test('the ask chapter keeps the whole chart, but not a reworded repeat',()=>{
 const rows=[['insight-1','정재와 상관을 함께 놓고 질문에 답합니다.','일간의 기준과 함께 정리하면 이렇습니다.','일간의 뜻을 다시 풀어도 답은 같습니다.']];
 const chapter=spec(['saju.tenGods.jeonggwan'],['saju.dayMaster']);
 assert.equal(audit(bodyOf(rows),chapter,[],true).code,undefined);
 assert.equal(audit(bodyOf(rows),chapter,[],false).code,m.V7_FOREIGN_FACT);
});

test('a prune is deterministic, idempotent and never leaves an empty paragraph',()=>{
 const rows=[['insight-1','정재의 조건을 살핍니다.','상관의 표현을 살핍니다.'],
   ['insight-2','정재를 다시 설명합니다.','상관의 조건을 덧붙입니다.']];
 const chapter=spec(['saju.tenGods.sanggwan'],['saju.dayMaster']);
 const first=m.pruneV7Chapter(bodyOf(rows),audit(bodyOf(rows),chapter));
 const second=m.pruneV7Chapter(first.body,audit(first.body,chapter));
 assert.equal(first.removed,2);
 assert.equal(second.removed,0,'nothing is left to prune');
 assert.deepEqual(first.body.blocks.map(b=>b.id),['insight-1','insight-2']);
 for(const block of first.body.blocks){
  assert.ok(block.paragraphs.length);
  for(const paragraph of block.paragraphs)assert.ok(paragraph.trim().length);
 }
 assert.ok(prose(first.body).includes('상관의 표현을'));
 // A block whose every sentence is flagged keeps its first paragraph: the repeat is logged, never thrown,
 // because losing the chapter would be worse than one surviving duplicate (principle 17).
 const all=[['insight-1','정재의 조건을 살핍니다.']];
 const restored=m.pruneV7Chapter(bodyOf(all),audit(bodyOf(all),chapter));
 assert.equal(restored.restored,1);
 assert.deepEqual(restored.body.blocks[0].paragraphs,bodyOf(all).blocks[0].paragraphs);
});

// Wiring: the audit runs inside validateChapter for v7 chapters only, throws once, then prunes on the repair.
const asOf='2026-09-15T00:00:00Z',today='2026-09-15';
const birth={birthDate:'1997-02-10',birthTime:'14:30',calendarType:'solar',gender:'female',birthPlace:{latitude:37.5665,longitude:126.978,timezone:'Asia/Seoul'}};
const engine=m.domains.saju;
const sajuInput=engine.validateInput({personA:birth,question:'올해 일과 사람 사이에서 무엇을 먼저 정해야 할까요?',readingMode:'personal'});
const sajuContext=m.withV7Timing(engine.buildContext(await engine.calculate(sajuInput,{asOf})),
  await m.buildV7TimingMatrix(engine.buildContext(await engine.calculate(sajuInput,{asOf})),sajuInput,today));
const product=m.products.find(p=>p.readingKind==='single'&&p.domain==='saju'&&p.fishId==='flounder');
const v7Chapters=m.v7TimingSummaries(m.resolveV7Ledger(m.readingManifestV7(product,{id:'personal'}),sajuContext));
const requestFor=chapter=>({locale:'ko',chapter,analysis:{contexts:{saju:sajuContext},themes:[],signals:[]},previous:[]});
const REPEAT=['일간의 기준은 앞 장에서 정리했습니다.','일간이 뜻하는 성향을 다시 풀어 설명합니다.'];
const withRepeat=body=>({...body,blocks:body.blocks.map((block,i)=>i?block:{...block,paragraphs:[...REPEAT,...block.paragraphs]})});

test('validateChapter throws once for a v7 repeat and prunes the repaired draft instead of refusing it',async()=>{
 const chapter=v7Chapters.find(c=>c.key!=='anchor'&&!c.owns.some(id=>id.endsWith('.dayMaster')));
 assert.ok(chapter,'a non-anchor chapter that only references the day master');
 const input=requestFor(chapter);
 const clean=await new m.MockChapterProvider().generateChapter(input);
 assert.doesNotThrow(()=>m.validateChapter(clean,input),'the mock body is audit-clean');
 const bad=withRepeat(clean);
 assert.throws(()=>m.validateChapter(bad,input),{code:m.V7_ANCHOR_REPEAT},'the first draft costs one repair attempt');
 const repaired=m.validateChapter(bad,{...input,repair:{code:m.V7_ANCHOR_REPEAT}});
 assert.equal(count(prose(repaired),'일간'),1,'the surviving sentence is the one the design allows');
 assert.equal(repaired.blocks.length,clean.blocks.length);
 assert.deepEqual(repaired.blocks.map(b=>b.id),clean.blocks.map(b=>b.id));
});

test('a v6 chapter is not audited: the same repeated reference point passes untouched',async()=>{
 const manifest=m.consultationManifest(product,{id:'personal'});
 assert.ok(manifest.every(c=>c.version===m.READING_V6_VERSION));
 const chapter=manifest[1];
 const input=requestFor(chapter);
 const body=withRepeat(await new m.MockChapterProvider().generateChapter(input));
 const validated=m.validateChapter(body,input);
 assert.equal(count(prose(validated),'일간'),2,'v6 keeps its own quality rules');
});
