import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
const bundle=await build({stdin:{contents:`export * from './worker/yeongnyangi/fortune/free/horary';export * from './worker/yeongnyangi/fortune/question-sky';export * from './worker/yeongnyangi/fortune/question-sky-reading';export * from './worker/yeongnyangi/fortune/question-sky-contract';export * from './worker/yeongnyangi/fortune/consultation';export {getProduct} from './worker/yeongnyangi/payments/catalog';export {readingManifest} from './worker/yeongnyangi/fortune/reading-manifest';export {StructuredChapterProvider,validateChapter} from './worker/yeongnyangi/providers/chapter';export {MockChapterProvider} from './__tests__/fixtures/yeongnyangi-chapter';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const loaded=new Module(path.resolve('question-sky-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
const api=loaded.exports;
const input={mode:'horary-v1',question:'그 사람과 재회할까요?\n연락을 기다려도 될까요?',topic:'space',relationship:'헤어진 사이',situation:'차단한 상황',boundary:true,cityId:'seoul',localTime:'2026-09-21T10:00'};
const now=new Date('2026-09-22T00:00:00Z');
const chart={ascendant:10,cusps:Array.from({length:12},(_,i)=>i*30),planets:Object.fromEntries(['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'].map((n,i)=>[n,{longitude:i*42+5,house:i+1,speedLongitude:i===1?13:1,retrograde:false}]))};
test('server resolves city-local time and refuses invented, future, invalid and DST fold/gap times',()=>{
  assert.equal(api.resolveQuestionTime(input.localTime,'Asia/Seoul',now).toISOString(),'2026-09-21T01:00:00.000Z');
  for(const local of ['2026-02-30T12:00','2026-10-01T12:00','2020-01-01T12:00'])assert.throws(()=>api.resolveQuestionTime(local,'Asia/Seoul',now));
  for(const local of ['2026-11-01T01:30','2026-03-08T02:30'])assert.throws(()=>api.resolveQuestionTime(local,'America/New_York',new Date('2026-12-01')),/QUESTION_TIME_AMBIGUOUS/);
  assert.equal(api.validateSkyInput({mode:input.mode,productId:'saju_mackerel',question:input.question,questionSky:input}).boundary,true);
  assert.throws(()=>api.validateSkyInput({mode:input.mode,productId:'saju_mackerel',question:input.question,questionSky:{...input,cityId:'target-home'}}));
});
test('topic conflicts and multiple questions retain separate, conservative significator scopes',()=>{
  const scopes=api.questionScopes({...input,question:'이직을 해도 될까요?\n연락을 기다릴까요?',topic:'money'});
  assert.deepEqual(scopes.map(s=>s.houses),[[10],[3]]);
  assert.equal(api.questionScopes({...input,question:'어떤 선택을 할까요?',topic:'general'})[0].ambiguous,true);
  assert.match(api.projectQuestionChart(chart,{...input,question:'이직을 해도 될까요?',topic:'space'}).space,/공간을 좁혀 읽을 근거가 없어/);
  assert.deepEqual(api.questionScopes({...input,question:'그 사람과 관계는 어떨까요?',relationship:'친구'})[0].houses,[11]);
});
test('horary motion handles retrograde/separation; Vedic full aspects stay separate; dignities are traditional',()=>{
  const a={longitude:0,speedLongitude:1},b={longitude:64,speedLongitude:0};
  assert.equal(api.westernLink(a,b).state,'applying');
  assert.equal(api.westernLink({...a,speedLongitude:-1},b).state,'separating');
  assert.equal(api.westernLink({...a,speedLongitude:null},b).state,'unknown-motion');
  assert.equal(api.vedicLink('Mars',{house:1},{house:4}),'full-aspect');
  assert.equal(api.vedicLink('Venus',{house:1},{house:4}),'no-full-aspect');
  assert.equal(api.essentialCondition('Saturn',305),'domicile');
  assert.equal(api.essentialCondition('Mars',215),'domicile');
});
test('Moon contact search stops at sign boundary and never equates no evidence with void',()=>{
  const sample=(moon,sun)=>Object.fromEntries(['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn'].map(n=>[n,{longitude:n==='Moon'?moon:n==='Sun'?sun:125}]));
  assert.equal(api.moonBeforeSignExit([sample(29,89.5),sample(31,89.5)]).state,'contact-before-exit');
  assert.equal(api.moonBeforeSignExit([sample(29,91),sample(31,91)]).state,'void-before-exit');
  assert.equal(api.moonBeforeSignExit([sample(29,90),sample(30,90)]).state,'void-before-exit');
  assert.equal(api.moonBeforeSignExit([sample(10,91),sample(11,91)]).state,'unknown');
});
test('missing facts fail closed and mixed strength/burden survives structured projection',()=>{
  assert.throws(()=>api.projectQuestionChart({...chart,planets:{}},input),/QUESTION_CALCULATION_UNAVAILABLE/);
  const mixed=structuredClone(chart);mixed.planets.Venus={longitude:185,house:7,retrograde:true,speedLongitude:-1};
  const projection=api.projectQuestionChart(mixed,input);
  assert.match(JSON.stringify(projection.context),/도움과 부담의 신호가 함께/);
  assert.notEqual(JSON.stringify(projection.context),JSON.stringify(api.projectQuestionChart(chart,input).context));
});
test('both real local Swiss engines respond to question time/place without natal data or network',async()=>{
  const western=await api.calculateQuestionSky({},input,api.skyMoment(input,now));
  assert.equal(western.raw.houseSystem,'regiomontanus');assert.equal(western.raw.fallbackUsed,false);
  assert.ok(western.audit.length>=2);assert.equal(western.publicData.askedAt,'2026-09-21T01:00:00.000Z');
  const moved={...input,cityId:'london',localTime:'2026-09-21T02:00'};
  const changed=await api.calculateQuestionSky({},moved,api.skyMoment(moved,now));
  assert.equal(western.publicData.askedAt,changed.publicData.askedAt);
  assert.notEqual(western.raw.ascendant.longitude,changed.raw.ascendant.longitude);
  const later={...input,localTime:'2026-09-21T15:00'};
  const laterChart=await api.calculateQuestionSky({},later,api.skyMoment(later,now));
  assert.notEqual(western.raw.ascendant.longitude,laterChart.raw.ascendant.longitude);
  const vedic={...input,mode:'prashna-v1'};
  const prashna=await api.calculateQuestionSky({},vedic,api.skyMoment(vedic,now));
  assert.equal(prashna.raw.basic.ayanamsha,'Lahiri');assert.equal(prashna.raw.basic.houseSystem,'Whole Sign');
  assert.ok(prashna.raw.planets.length>=7);assert.equal(prashna.context.domain,'vedic');
  assert.notEqual(prashna.audit[0].querent,western.audit[0].querent);
  const vedicMoved={...moved,mode:'prashna-v1'},vedicLater={...later,mode:'prashna-v1'};
  const movedPrashna=await api.calculateQuestionSky({},vedicMoved,api.skyMoment(vedicMoved,now));
  const laterPrashna=await api.calculateQuestionSky({},vedicLater,api.skyMoment(vedicLater,now));
  assert.equal(movedPrashna.publicData.askedAt,prashna.publicData.askedAt);
  assert.notDeepEqual(movedPrashna.raw.ascendant,prashna.raw.ascendant);
  assert.notDeepEqual(laterPrashna.raw.ascendant,prashna.raw.ascendant);
});
for(const advanced of [false,true])test(`actual provider validates ${advanced?'eight-chapter flounder':'legacy five-chapter'} evidence and every question`,async()=>{
  const {context}=api.projectQuestionChart(chart,{...input,mode:advanced?'prashna-v1':'horary-v1'});
  if(advanced)context.facts.push({id:'vedic.question-calculation',label:'프라슈나 계산 근거',value:{chart}});
  const manifest=api.skyManifest(api.readingManifest(api.getProduct(advanced?'saju_flounder':'saju_mackerel'),'general','personal','destiny-book-v4'),context);
  const sky={...input,evidenceVersion:advanced?'question-sky-flounder-2':undefined,askedAt:'2026-09-21T01:00:00Z',space:'상징',timing:api.SKY_TIMING};
  const consultation={...api.createConsultation(input.question,'space',api.consultationClock('Asia/Seoul',now),manifest),questionSky:sky};
  const analysis={contexts:{[context.domain]:context},signals:[],themes:[],question:input.question,consultation};
  let request;
  await new api.StructuredChapterProvider({generate:async r=>{request=r;return {result:{},provider:'mock',model:'mock'};}}).generateChapter({chapter:manifest[0],analysis,previous:[]});
  assert.equal(request.maxProviderAttempts,1);assert.ok(request.maxOutputTokens<=16384);
  assert.equal(JSON.stringify(request.calculatedData).includes('longitude'),advanced);
  assert.equal(JSON.parse(request.domainRules).domain,undefined);
  const previous=[];
  for(const chapter of manifest){
    const body=await new api.MockChapterProvider().generateChapter({chapter:advanced?{...chapter,requiredSections:[...chapter.requiredSections,'판단을 바꿀 단서','선택의 비용','실행 후 관찰']}:chapter,analysis:{...analysis,consultation:undefined},previous});
    const pattern=context.facts[0].value.patterns[0].resource;
    body.blocks[0].paragraphs[0]=pattern+'. '+body.blocks[0].paragraphs[0];
    body.advice+=' 나의 경계를 존중하자.';
    body.questionAnswers=chapter.ordinal===0?consultation.questions.map(q=>({questionId:q.id,answer:'지금의 선택을 되돌아보며 관계의 조건부터 정리해 보자.',reason:context.facts.find(f=>f.value.questionId===q.id).value.patterns[0].resource+'를 질문의 조건과 함께 살펴보자.',timing:api.SKY_TIMING,action:'나의 일상을 돌보고 경계를 존중하는 선택을 적어보자.'})):[];
    assert.doesNotThrow(()=>api.validateChapter(body,{chapter,analysis,previous}));
    if(chapter.ordinal===0){
      assert.throws(()=>api.validateChapter({...body,questionAnswers:body.questionAnswers.slice(1)},{chapter,analysis,previous}),/QUESTION_ANSWER_INCOMPLETE/);
      for(const unsafe of [...(advanced?[]:['호라리 차트로 봤어.']),'그 사람은 집 북쪽 방에 있다.','상대는 다른 사람을 사랑하고 있어.','신령이 알려줬어.','다음 달에 재회할 거야.','3일 뒤 연락이 올 거야.','SNS로 찾아보자.'])assert.throws(()=>api.validateSkyChapter({...body,summary:unsafe},context,sky));
      assert.throws(()=>api.validateSkyChapter({...body,questionAnswers:[{...body.questionAnswers[0],reason:'근거 없는 낙관적인 대답이야.'},body.questionAnswers[1]]},context,sky),/SPIRIT_ANSWER_EVIDENCE_MISSING/);
    }
    previous.push(body);
  }
  assert.equal(previous.length,advanced?8:5);
  assert.ok(!JSON.stringify(api.skyShare('prashna-v1','secret name')).includes('secret name'));
});

test('free horary exports computed coordinates, timezone, traditional chart and continuation without a provider',async()=>{
 const payload={question:input.question,questionSky:{...input,cityId:'',location:{source:'geolocation',latitude:51.5074,longitude:-.1278,accuracy:25}}};
 const result=await api.prepareHoraryPrompt({},payload,now);
 assert.equal(result.kind,'calculated');assert.match(result.prompt,/Regiomontanus/);assert.match(result.prompt,/Europe\/London/);
 for(const field of ['ascendant','cusps','essentialCondition','mutualReception','moonBeforeSignExit','houseCandidates','accuracy'])assert.ok(result.prompt.includes(field));
 assert.match(result.prompt,/미산출/);assert.match(result.prompt,/이어서 상담하기/);assert.match(result.prompt,/먼저 확인 질문/);
 assert.ok(!('priceKRW' in result));
 const changed=await api.prepareHoraryPrompt({}, {...payload,questionSky:{...payload.questionSky,location:{source:'geolocation',latitude:37.5665,longitude:126.978,accuracy:20}}},now);
 assert.notEqual(changed.prompt,result.prompt);
 for(const location of [{source:'geolocation',latitude:91,longitude:0,accuracy:1},{source:'geolocation',latitude:1,longitude:1,accuracy:-1},{source:'ip',latitude:1,longitude:1,accuracy:1}])await assert.rejects(api.prepareHoraryPrompt({}, {...payload,questionSky:{...payload.questionSky,location}},now),/QUESTION_LOCATION_REQUIRED/);
});
test('new prashna product is flounder and all eight chapters have distinct complete sections',()=>{
 const value=api.validateSkyInput({mode:'prashna-v1',productId:'saju_flounder',question:input.question,questionSky:input});
 assert.equal(value.mode,'prashna-v1');
 assert.throws(()=>api.validateSkyInput({mode:'prashna-v1',productId:'saju_mackerel',question:input.question,questionSky:input}),/INVALID_READING_MODE/);
 const context=api.projectQuestionChart(chart,value).context,product=api.getProduct('saju_flounder');
 const manifest=api.skyManifest(api.readingManifest(product),context);
 assert.equal(product.priceKRW,5000);assert.equal(manifest.length,8);assert.equal(new Set(manifest.map(c=>c.title)).size,8);
 assert.ok(manifest.every(c=>c.minimumChars>0&&c.focus&&c.requiredSections.length===2));
});
