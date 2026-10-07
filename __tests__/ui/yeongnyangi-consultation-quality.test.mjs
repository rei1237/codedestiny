import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
const Module=createRequire(import.meta.url)('node:module');
const built=await build({stdin:{contents:`export * from './worker/yeongnyangi/prompts/domain/consultation-quality'; export * from './worker/yeongnyangi/prompts/domain/recognition'; export {questionManifest,QUESTION_POLICY_VERSION} from './worker/yeongnyangi/fortune/ask/question-policy'; export {StructuredChapterProvider} from './worker/yeongnyangi/providers/chapter'; export {domains} from './worker/yeongnyangi/fortune/index'; export {products} from './worker/yeongnyangi/payments/catalog'; export {consultationKinds,consultationManifest,supportsKind} from './worker/yeongnyangi/fortune/consultation-kinds'; export {readingManifestV7} from './worker/yeongnyangi/fortune/reading-v7'; export {resolveV7Ledger} from './worker/yeongnyangi/fortune/reading-v7-ledger';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const filename=path.resolve('consultation-quality.test.cjs'),loaded=new Module(filename);
loaded.filename=filename;loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(built.outputFiles[0].text,filename);
const m=loaded.exports;
const birth={birthDate:'1998-02-28',birthTime:'14:30',calendarType:'solar',gender:'female',birthPlace:{latitude:37.5665,longitude:126.978,timezone:'Asia/Seoul'}};
const contexts={};
for(const domain of ['saju','ziwei','vedic','astrology']){
 const engine=m.domains[domain],input=engine.validateInput({personA:birth,readingMode:'personal'});
 contexts[domain]=engine.buildContext(await engine.calculate(input,{asOf:'2026-09-29T03:00:00Z'}));
}

test('current supported kinds and tiers, plus v7 personal/ask, receive only their calculated IDs and school',async()=>{
 let requests=0;
 const relationContext=m.domains.ziwei.buildContext(await m.domains.ziwei.calculate(m.domains.ziwei.validateInput({personA:birth}),{asOf:'2026-09-29',relationshipReading:true}));
 for(const [domain,context] of Object.entries(contexts))for(const product of m.products.filter(p=>p.readingKind==='single'&&p.domain===domain)){
  const current=m.consultationKinds[domain].filter(k=>!k.partner&&m.supportsKind(product,k)).map(k=>{const rows=m.consultationManifest(product,k);return rows[0].version==='destiny-book-v7'?m.resolveV7Ledger(rows,context).chapters[0]:rows[0];});
  const v7=product.fishId==='mackerel'?[]:['personal','ask'].map(id=>m.resolveV7Ledger(m.readingManifestV7(product,{id}),context).chapters[0]);
  for(const chapter of [...current,...v7]){
   let sent;
   const provider=new m.StructuredChapterProvider({generate:async request=>{sent=request;return {result:{},provider:'mock',model:'fixture'};}});
   await provider.generateChapter({chapter,analysis:{contexts:{[domain]:chapter.key?.startsWith('relationship-')?relationContext:context},themes:[],signals:[]},previous:[]});
   const rules=JSON.parse(sent.domainRules),guide=rules.consultationQuality;
   assert.equal(guide.version,m.CONSULTATION_QUALITY_VERSION);
   assert.equal(guide.domain,m.CONSULTATION_QUALITY_POLICY.domains[domain]);
   assert.deepEqual(guide.availableFactIds,sent.calculatedData.facts.map(f=>f.id));
   assert.ok(guide.availableFactIds.length);
   assert.ok(guide.availableFactIds.every(id=>id.startsWith(domain+'.')));
   assert.deepEqual(guide.limitations,sent.calculatedData.limitations);
   assert.equal(sent.outputSchema.properties.consultationQuality,undefined,'guidance is not a public output field');
   assert.deepEqual(rules.sectionContract,chapter.sections);
   requests++;
  }
 }
 assert.ok(requests>=64);
});

test('fusion, tarot/sukuyo and symbolic paths do not receive the new single-system guide',()=>{
 const c=contexts.saju;
 assert.equal(m.buildConsultationQuality([c,contexts.ziwei],c),undefined);
 assert.equal(m.buildConsultationQuality([c],c,true),undefined);
 for(const domain of ['tarot','sukuyo'])assert.equal(m.buildConsultationQuality([{...c,domain}],{...c,domain}),undefined);
});

test('absence, unsupported timing/divisional fields and question omission have explicit first-attempt instructions',()=>{
 const p=m.CONSULTATION_QUALITY_POLICY;
 assert.match(p.evidence,/反対|반대 성향/);
 assert.match(p.domains.saju,/정재가 없다고.*금지/);
 assert.match(p.domains.saju,/정관·편관이 없다고/);
 assert.match(p.domains.ziwei,/두 독립 증거/);
 assert.match(p.domains.ziwei,/제공되지 않은 사화/);
 assert.match(p.domains.vedic,/완전한 분할 하우스/);
 assert.match(p.domains.astrology,/미래 사건 날짜/);
 assert.match(p.question,/limited/);
 assert.match(p.question,/배정되지 않은 질문/);
});


test('recognition uses only selected facts; absent, unrelated and foreign evidence never activates a lens',()=>{
 const facts=[{id:'saju.gods',label:'tenGodsByPillar',value:{month:'정관'}},{id:'saju.empty',label:'natalInteractions',value:[]},{id:'saju.missing',label:'jong',value:null},{id:'astrology.aspects',label:'aspects',value:[{type:'square'}]},{id:'saju.health',label:'healthBasis',value:{}}];
 const before=JSON.stringify(facts),guide=m.buildRecognition(facts,['saju']);
 assert.equal(guide.lenses.length,1);
 assert.deepEqual(guide.lenses[0].factIds,['saju.gods']);
 assert.equal(JSON.stringify(facts),before);
 assert.deepEqual(m.buildRecognition([],['saju','tarot']).lenses,[]);
 assert.deepEqual(m.buildRecognition(facts,['unsupported']).lenses,[]);
});

test('all personas and prices receive identical grounded recognition on the real provider path',async()=>{
 const decision={version:m.QUESTION_POLICY_VERSION,category:'self',target:'self',horizon:'current',situation:'부탁을 거절하기 어려워요',options:'',period:'',constraints:'',confirmed:true};
 const all={...contexts,sukuyo:{domain:'sukuyo',facts:[{id:'sukuyo.personA',label:'personA',value:{mansion:'角'}}],limitations:['관계 비교 자료 없음'],engineVersion:'fixture'},tarot:{domain:'tarot',facts:[{id:'tarot.cards',label:'cards',value:[{name:'Two of Swords',position:'current',isReversed:false}]}],limitations:['상징적 해석'],engineVersion:'fixture'}};
 for(const [domain,context] of Object.entries(all)){
  let baseline;
  for(const persona of [undefined,'yeoni','neo'])for(const fish of ['mackerel','salmon','flounder','tuna']){
   let sent;
   const provider=new m.StructuredChapterProvider({generate:async request=>{sent=request;return {result:{},provider:'mock',model:'fixture'};}});
   const chapter=m.questionManifest(domain,fish,decision)[0];
   await provider.generateChapter({persona,chapter,analysis:{contexts:{[domain]:context},question:'부탁을 거절하기 어려워요',themes:[],signals:[]},previous:[]});
   const guide=JSON.parse(sent.domainRules).recognition;
   assert.equal(guide.version,m.RECOGNITION_VERSION);
   assert.ok(guide.lenses.length,domain);
   const allowed=new Set(sent.calculatedData.facts.map(f=>f.id));
   assert.ok(guide.lenses.every(l=>l.factIds.every(id=>allowed.has(id))));
   if(!baseline)baseline=guide;else assert.deepEqual(guide,baseline,domain+' '+persona+' '+fish);
   assert.match(sent.promptVersion,/grounded-recognition/);
   assert.equal(sent.outputSchema.properties.recognition,undefined);
   assert.equal(chapter.outputTokens,8192,'no added call or generation budget');
  }
 }
});
