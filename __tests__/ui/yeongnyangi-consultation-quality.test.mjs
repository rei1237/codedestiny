import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
const Module=createRequire(import.meta.url)('node:module');
const built=await build({stdin:{contents:`export * from './worker/yeongnyangi/prompts/domain/consultation-quality'; export {StructuredChapterProvider} from './worker/yeongnyangi/providers/chapter'; export {domains} from './worker/yeongnyangi/fortune/index'; export {products} from './worker/yeongnyangi/payments/catalog'; export {consultationKinds,consultationManifest,supportsKind} from './worker/yeongnyangi/fortune/consultation-kinds'; export {readingManifestV7} from './worker/yeongnyangi/fortune/reading-v7'; export {resolveV7Ledger} from './worker/yeongnyangi/fortune/reading-v7-ledger';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
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
 for(const [domain,context] of Object.entries(contexts))for(const product of m.products.filter(p=>p.readingKind==='single'&&p.domain===domain)){
  const current=m.consultationKinds[domain].filter(k=>!k.partner&&m.supportsKind(product,k)).map(k=>m.consultationManifest(product,k)[0]);
  const v7=product.fishId==='mackerel'?[]:['personal','ask'].map(id=>m.resolveV7Ledger(m.readingManifestV7(product,{id}),context).chapters[0]);
  for(const chapter of [...current,...v7]){
   let sent;
   const provider=new m.StructuredChapterProvider({generate:async request=>{sent=request;return {result:{},provider:'mock',model:'fixture'};}});
   await provider.generateChapter({chapter,analysis:{contexts:{[domain]:context},themes:[],signals:[]},previous:[]});
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
