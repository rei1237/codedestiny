import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
const Module=createRequire(import.meta.url)('node:module');
const built=await build({stdin:{contents:`
 export * from './worker/lib/fortune-prevention.js';
 export {buildLuckNatalInteractions} from './worker/lib/life-book-ai-saju.js';
 export * from './worker/yeongnyangi/fortune/prevention';
 export {consultationManifest,consultationKinds} from './worker/yeongnyangi/fortune/consultation-kinds';
 export {selectChapterFacts} from './worker/yeongnyangi/fortune/chapter-facts';
 export {StructuredChapterProvider,validateChapter} from './worker/yeongnyangi/providers/chapter';
 export {MockChapterProvider} from './__tests__/fixtures/yeongnyangi-chapter';
 export {products} from './worker/yeongnyangi/payments/catalog';
 export {__newYearAiTestUtils} from './worker/routes/new-year-ai.js';
 `,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const filename=path.resolve('yeongnyangi-prevention.test.cjs'),loaded=new Module(filename);
loaded.filename=filename;loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(built.outputFiles[0].text,filename);
const m=loaded.exports;
const pillars={year:'甲寅',month:'丁卯',day:'庚午',hour:'壬申'};
const fact=(d,label,value)=>({id:`${d}.${label}`,label,value});
const context=(d='saju')=>({domain:d,engineVersion:'mock',calculatedAt:'2026-09-30',limitations:[],facts:d==='saju'?[
 fact(d,'pillars',pillars),fact(d,'strengthHeuristic',{isStrong:false,yongshin:['fire'],kijishin:['water']}),
 fact(d,'yearlyLuck',[{year:2026,pillar:'丙午'},{year:2027,pillar:'丁未'}]),
 fact(d,'monthlyLuck',[{start:{year:2026,month:10},pillar:'己巳'}]),
 ]:d==='tarot'?[fact(d,'cards',[{cardCode:'M00',orientation:'reversed',positionKey:'self',positionLabel:'나',meaning:'가능성'}])]:[
 fact(d,d==='sukuyo'?'personA':d==='ziwei'?'relationshipBasis':'planets',{name:'mock',majorLuck:{secret:'no'},d9Signs:{secret:'no'},natalTransformations:{secret:'no'}})]});
const analysis=d=>({contexts:{[d]:context(d)},signals:[],themes:[],topicId:'love'});

test('묘오파 is symmetric and not created for unrelated branches',()=>{
 const a=m.buildSajuPrevention({pillars:{year:'甲卯',day:'庚午'}});
 const b=m.buildSajuPrevention({pillars:{year:'甲午',day:'庚卯'}});
 for(const packet of [a,b])assert.ok(packet.candidates.some(c=>c.key==='mao-wu-break'));
 assert.ok(!m.buildSajuPrevention({pillars:{year:'甲子',day:'庚寅'}}).candidates.some(c=>c.key==='mao-wu-break'));
 assert.equal(m.canonicalPreventionPillar('정묘'),'丁卯');
});
test('complete luck groups, partial groups, and original caller compatibility',()=>{
 const details=m.preventionPillarDetails({year:'甲寅',day:'庚申'});
 const full=m.buildLuckNatalInteractions('己巳',details,{includeGroups:true});
 assert.ok(full.branchPunishments.some(r=>r.label==='인사신형'));
 assert.ok(!m.buildLuckNatalInteractions('己巳',m.preventionPillarDetails({day:'庚寅'}),{includeGroups:true}).branchPunishments.length);
 assert.ok(!Object.hasOwn(m.buildLuckNatalInteractions('己巳',details),'branchPunishments'));
 const harmony=m.buildLuckNatalInteractions('癸未',m.preventionPillarDetails({year:'甲亥',day:'庚卯'}),{includeGroups:true});
 assert.equal(harmony.threeHarmony.length,1);
 assert.equal(m.buildLuckNatalInteractions('癸未',m.preventionPillarDetails({day:'庚卯'}),{includeGroups:true}).threeHarmony.length,0);
 const group=m.buildLuckNatalInteractions('癸丑',m.preventionPillarDetails({year:'甲亥',day:'庚子'}),{includeGroups:true});
 assert.equal(group.directionalGroups.length,1);
});
test('visible 편관 and balance differ from hidden stems and movement is not automatic 역마',()=>{
 const visible=m.buildSajuPrevention({pillars:{month:'丙寅',day:'庚申'},strength:{yongshin:['fire'],kijishin:[]},jong:{confirmationRequired:true}});
 const c=visible.candidates.find(c=>c.key==='visible-pyeongwan');
 assert.equal(c.anchors.positions[0].role,'support');
 assert.deepEqual(c.anchors.positions[0].rootedAt,['month']);
 const sameElement=m.buildSajuPrevention({pillars:{month:'丙午',day:'庚申'}});
 assert.deepEqual(sameElement.candidates.find(c=>c.key==='visible-pyeongwan').anchors.positions[0].rootedAt,['month'],'opposite-polarity hidden stem of the same element can also provide a root');
 assert.equal(c.buffering.unresolvedPattern,true);
 assert.equal(visible.candidates.find(c=>c.key==='movement').anchors.yeokma,null);
 const burden=m.buildSajuPrevention({pillars:{month:'丙寅',day:'庚申'},strength:{yongshin:[],kijishin:['fire']}});
 assert.equal(burden.candidates.find(c=>c.key==='visible-pyeongwan').anchors.positions[0].role,'burden');
 assert.ok(!m.buildSajuPrevention({pillars:{month:'甲寅',day:'庚申'}}).candidates.some(c=>c.key==='visible-pyeongwan'));
});
test('every supported ordinary/relationship/tarot/fusion kind gets exactly one chapter only at eligible tiers',()=>{
 for(const p of m.products)for(const k of m.consultationKinds[p.readingKind==='single'?p.domain:'fusion']){
   if(k.professional&&!['tuna','assorted','omakase'].includes(p.fishId))continue;
   const original=m.consultationManifest(p,k),saved=JSON.stringify(original);
   const a={contexts:Object.fromEntries(p.systems.map(d=>[d,context(d)])),signals:[],themes:[]};
   const next=m.withPreventionReading(original,a,p.fishId),eligible=m.preventionEligible(p.fishId);
   assert.equal(next.length,original.length+Number(eligible),`${p.id}/${k.id}`);
   assert.equal(JSON.stringify(original),saved,'original manifest is immutable');
   assert.deepEqual(next.slice(0,original.length).map(c=>c.id),original.map(c=>c.id));
   assert.equal(m.withPreventionReading(next,a,p.fishId).length,next.length);
   if(eligible){
     const c=next.at(-1);assert.equal(c.key,'prevention');assert.equal(c.ordinal,original.length);
     assert.ok(c.sections.some(s=>s.id==='action'));
     for(const ctx of Object.values(a.contexts))assert.equal(m.selectChapterFacts(ctx,c).length,1);
   }else assert.ok(!a.contexts[p.domain].facts.some(f=>f.label==='preventionEvidence'));
 }
});
test('flounder receives only conditional saju balance and no other professional payload',()=>{
 const p=m.products.find(p=>p.id==='saju_flounder'),a=analysis('saju');
 const c=m.withPreventionReading(m.consultationManifest(p,{id:'love'}),a,'flounder').at(-1);
 assert.equal(m.allowsPreventionBalance(c),true);
 assert.equal(m.allowsPreventionBalance({...c,preventionVersion:undefined}),false);
 assert.equal(m.allowsPreventionBalance({...c,key:'love'}),false);
 const packet=m.selectChapterFacts(a.contexts.saju,c)[0].value;
 assert.deepEqual(packet.saju.balance.helpfulElements,['fire']);
 for(const d of ['ziwei','vedic','astrology'])assert.ok(!/secret/.test(JSON.stringify(m.buildPreventionFact(context(d),'flounder'))));
});
test('packet and prompt retain stored tarot cards and all five required prevention sections',async()=>{
 const p=m.products.find(p=>p.id==='tarot_flounder'),a=analysis('tarot');
 const cards=JSON.stringify(a.contexts.tarot.facts[0]);
 const c=m.withPreventionReading(m.consultationManifest(p,{id:'love'}),a,'flounder').at(-1);
 let request;
 await new m.StructuredChapterProvider({generate:async r=>{request=r;return {result:{}};}}).generateChapter({chapter:c,analysis:a,previous:[],locale:'ko'});
 assert.ok(request.promptVersion.includes(m.PREVENTION_VERSION));
 assert.match(request.domainRules,/끌림의 강도와 관계의 안정성/);
 assert.deepEqual(JSON.parse(request.domainRules).sectionContract.map(s=>s.id),['evidence','conditions','signals','action','limits']);
 assert.equal(JSON.stringify(a.contexts.tarot.facts[0]),cards);
});
test('valid mock chapter passes; missing prevention action fails existing structure gate',async()=>{
 const p=m.products.find(p=>p.id==='saju_flounder'),a=analysis('saju');
 const c=m.withPreventionReading(m.consultationManifest(p,{id:'love'}),a,'flounder').at(-1);
 const input={chapter:c,analysis:a,previous:[],locale:'ko'};
 const result=await new m.MockChapterProvider().generateChapter(input);
 assert.ok(result.blocks.find(b=>b.id==='action'));
 assert.throws(()=>m.validateChapter({...result,blocks:result.blocks.filter(b=>b.id!=='action')},input),/CHAPTER_DEPTH_INCOMPLETE/);
 const withBalance={...result,summary:'용신 판단은 조건부이며 실제 행동을 함께 살펴봅니다.'};
 assert.doesNotThrow(()=>m.validateChapter(withBalance,input));
 assert.throws(()=>m.validateChapter({...result,summary:'대운을 설명합니다.'},input),/TIER_SCOPE_VIOLATION/);
 assert.throws(()=>m.validateChapter({...result,summary:'반드시 사고가 발생합니다.'},input),/UNSUPPORTED_READING_CLAIM/);
 assert.throws(()=>m.validateChapter({...result,summary:'당신의 도파민 수치가 높습니다.'},input),/UNSUPPORTED_READING_CLAIM/);
});
test('all supported output languages keep the prevention contract and stable section IDs',async()=>{
 const p=m.products.find(p=>p.id==='saju_flounder'),a=analysis('saju');
 const c=m.withPreventionReading(m.consultationManifest(p,{id:'love'}),a,'flounder').at(-1);
 for(const locale of ['ko','en','ja','zh-CN','zh-TW','vi','hi','es','fr','de','nl','ms']){
   let request;await new m.StructuredChapterProvider({generate:async r=>{request=r;return {result:{}};}}).generateChapter({chapter:c,analysis:a,previous:[],locale});
   assert.equal(request.locale,locale);
   assert.match(request.domainRules,/preventionContract/);
   assert.ok(request.outputSchema.properties.blocks.items.properties.id.enum.includes('action'));
 }
});
test('new year adds a question opening and keeps annual prevention in the overview',()=>{
 const u=m.__newYearAiTestUtils;
 const input={birthInfo:{birthDate:'1990-03-21',birthTime:'14:30',gender:'female',calendarType:'solar'},targetYear:2027,focusArea:'overall'};
 const data=u.calculateNewYearFortuneData(input);
 assert.equal(data.prevention.version,m.PREVENTION_VERSION);
 assert.ok(data.prevention.candidates.filter(c=>c.period.kind!=='natal').every(c=>c.period.year===2027));
 assert.equal(data.monthlyFlow.length,12);
 assert.equal(u.NEW_YEAR_AI_SECTIONS.length,6);
 assert.equal(u.NEW_YEAR_AI_SECTIONS[0].key,'opening');
 const overview=u.NEW_YEAR_AI_SECTIONS.find(section=>section.key==='overview');
 assert.ok(overview);
 assert.equal(m.preventionTiming({branchClashes:[{}],branchCombinations:[{}]},true),'기회와 주의');
 assert.equal(m.preventionTiming({branchCombinations:[{}]},false,true),'주의');
 assert.equal(m.preventionTiming({branchCombinations:[{}]}),'정비');
 assert.match(u.buildFirstPrompt(input,data,overview),/\*\*올해 주의할 흐름과 나를 지키는 선택\*\*/);
 const missing=u.validateConsultationQuality('검증용 총운입니다.',{fortuneData:data});
 assert.ok(missing.issues.includes('PREVENTION_SECTION_MISSING'));
 assert.equal(u.mapIssuesToSections({issues:['PREVENTION_SECTION_MISSING']},[]).has('overview'),true);
 const included=u.validateConsultationQuality('**올해 주의할 흐름과 나를 지키는 선택**\n계산된 조건을 살피고 중요한 약속은 속도를 합의하세요.',{fortuneData:data});
 assert.ok(!included.issues.includes('PREVENTION_SECTION_MISSING'));
 const old={...data};delete old.prevention;
 assert.ok(!u.buildFirstPrompt(input,old).includes(m.PREVENTION_VERSION));
});
