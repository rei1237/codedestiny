import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
const bundle=await build({stdin:{contents:`export {products} from './worker/yeongnyangi/payments/catalog';export {consultationManifest,consultationKinds} from './worker/yeongnyangi/fortune/consultation-kinds';export {conciseReadingManifest} from './worker/yeongnyangi/fortune/concise-reading';export {conciseReadingPrompt} from './worker/yeongnyangi/fortune/concise-reading-prompt';export {productOffers} from './app/yeongnyangi/_lib/product-offers';export {readingDepthCopy,readingTierDepth} from './app/yeongnyangi/_lib/reading-depth-copy';export {readingLocales} from './worker/yeongnyangi/fortune/reading-locale';export {questionManifest,FOLLOWUP_LIMITS,QUESTION_POLICY_VERSION} from './worker/yeongnyangi/fortune/ask/question-policy';export {tunaChapterModel,auditTunaChapter,TUNA_QUALITY_POLICY,TUNA_DEFAULT_MODEL,TUNA_REASONING_MODEL,tunaReasoningTask} from './worker/yeongnyangi/fortune/tuna-quality';export {tunaBookCostRatio,V7_COST} from './worker/yeongnyangi/fortune/reading-v7-cost';export {tierComparison} from './app/yeongnyangi/_lib/reading-depth-copy';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'node',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
test('public product comparisons use the same default consultation chapters as preparation',()=>{
 for(const [domain,offers] of Object.entries(m.productOffers))for(const offer of offers){
  const product=m.products.find(p=>p.id===offer.id);
  assert.deepEqual(offer.chapters,m.consultationManifest(product,m.consultationKinds[domain][0]).map(ch=>ch.title),offer.id);
  assert.equal(offer.price,product.priceKRW);
 }
});
test('all fish share expert writing quality while historical chapter budgets stay fixed',()=>{
 const targets=[];const approaches=[];
 for(const tier of ['mackerel','salmon','flounder','tuna']){
  const p=m.products.find(p=>p.id==='saju_'+tier);
  const chapter=m.conciseReadingManifest(m.consultationManifest(p,m.consultationKinds.saju[0]))[0];
  const before=JSON.stringify(chapter);const contract=m.conciseReadingPrompt(chapter).conciseReading.tierDepth;
  assert.equal(contract.tier,tier);assert.ok(contract.approach);assert.ok(contract.boundary);assert.ok(m.readingTierDepth(tier));
  approaches.push(contract.approach);if(tier!=='mackerel')targets.push(chapter.targetChars);
  assert.equal(JSON.stringify(chapter),before,'describing depth must not mutate generation targets');
 }
 assert.equal(new Set(approaches).size,1);assert.deepEqual(targets[0],targets[1]);assert.deepEqual(targets[1],targets[2]);
});
test('all twelve locales explain the same expert depth without numeric promises',()=>{
 for(const locale of m.readingLocales){
  const copy=m.readingDepthCopy(locale);assert.ok(copy.sharedTopics.trim());
  const texts=['mackerel','salmon','flounder','tuna'].map(tier=>m.readingTierDepth(tier,locale));
  assert.equal(new Set(texts).size,1);for(const text of [copy.sharedTopics,...texts]){assert.ok(text.trim());assert.doesNotMatch(text,/[0-9]/);if(locale!=='ko')assert.doesNotMatch(text,/[가-힣]/);}
 }
 assert.equal(m.readingTierDepth('assorted'),undefined,'fusion retains its own contract');
});
const decision={version:m.QUESTION_POLICY_VERSION,category:'money',target:'self',horizon:'current',period:'내년',situation:'수입을 늘리고 싶어요',options:'현재 일을 발전시키기',constraints:'시간',confirmed:true};
const QUESTION='내년 내 재물운은 어떨까?';
test('참치만 가진 챕터와 기능이 있다',()=>{
 const titles=fish=>m.questionManifest('saju',fish,decision,undefined,QUESTION).map(ch=>ch.title);
 const roadmap=fish=>titles(fish).some(title=>title.endsWith('앞으로 12개월 로드맵'));
 assert.ok(roadmap('tuna'));assert.ok(!roadmap('flounder'));
 assert.equal(m.FOLLOWUP_LIMITS.tuna,6);assert.equal(m.FOLLOWUP_LIMITS.flounder,2);
 assert.equal(m.tunaChapterModel({},{tunaQualityPolicy:m.TUNA_QUALITY_POLICY}),m.TUNA_DEFAULT_MODEL);
 assert.equal(m.tunaChapterModel({},{}),undefined,'orders created before the policy keep their model');
 const snapshot={tunaQualityPolicy:m.TUNA_QUALITY_POLICY};
 assert.equal(m.tunaChapterModel({YEONGNYANGI_TUNA_GEMINI_MODEL:'gemini-2.5-pro'},snapshot,{layoutRole:'foundation'}),'gemini-2.5-flash');
 assert.equal(m.tunaChapterModel({},snapshot,{layoutRole:'synthesis',key:'compare'}),'gemini-2.5-pro');
 assert.equal(m.tunaChapterModel({},snapshot,{layoutRole:'synthesis',key:'action'}),'gemini-2.5-flash');
 const manifest=m.questionManifest('saju','tuna',decision,undefined,QUESTION);
 assert.equal(manifest.filter(ch=>m.tunaReasoningTask(snapshot,ch)).length,1,'one synthesis chapter, not all prose');
 assert.equal(m.tierComparison('ko').rows.length,5);
 for(const locale of m.readingLocales){
  const table=m.tierComparison(locale);assert.ok(table.title.trim());assert.ok(table.rows.length>=2);
  if(locale!=='ko')for(const row of table.rows)for(const text of [row.label,row.flounder,row.tuna]){assert.doesNotMatch(text,/[가-힣]/);assert.doesNotMatch(text,/[0-9]/);}
 }
});
test('expanded all-Pro cost bound scales with prose while retaining the legacy ceiling',()=>{
 const tariff=JSON.parse(readFileSync('config/llm-tariffs-20260921.json','utf8'))['gemini/'+m.TUNA_REASONING_MODEL];
 const targets=m.questionManifest('saju','tuna',decision,undefined,QUESTION).map(ch=>ch.targetChars[1]);
 const price=m.products.find(p=>p.id==='saju_tuna').priceKRW;
 assert.equal(m.V7_COST.tunaMaxCostRatio,.2);assert.equal(m.V7_COST.tunaExpandedMaxCostRatio,m.V7_COST.tunaMaxCostRatio*1.25);
 assert.ok(m.tunaBookCostRatio(targets,price,tariff,m.FOLLOWUP_LIMITS.tuna)<=m.V7_COST.tunaExpandedMaxCostRatio);
});
test('tuna self-review flags missing citations, question links, repeats and generic sentences',()=>{
 const analysis={consultation:{question:QUESTION},contexts:{saju:{domain:'saju',facts:[{value:'갑자'},{value:'편재'}]}}};
 const chapter={systems:['saju']};
 const clean={summary:'질문하신 내년 재물운은 일주 갑자와 편재가 함께 움직이는 해로 읽힙니다.',analysis:['갑자 일주는 스스로 판을 여는 힘이라 새 수입원을 직접 만들 때 유리합니다.']};
 assert.deepEqual(m.auditTunaChapter(clean,{chapter,analysis}),[]);
 const weak={summary:'올해는 차분하게 흐름을 지켜보는 편이 좋겠습니다.',analysis:['누구에게나 기회는 오니 긍정적인 마음가짐을 유지하면 좋겠습니다.','누구에게나 기회는 오니 긍정적인 마음가짐을 유지하면 좋겠습니다.']};
 assert.deepEqual(m.auditTunaChapter(weak,{chapter,analysis}),['TUNA_FEW_CITATIONS','TUNA_NO_QUESTION_LINK','TUNA_DUPLICATE_SENTENCE','TUNA_GENERIC_SENTENCE']);
 assert.deepEqual(m.auditTunaChapter(clean,{chapter,analysis,previous:[clean]}),['TUNA_DUPLICATE_SENTENCE']);
});
