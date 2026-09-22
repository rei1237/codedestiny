import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
const built=await build({stdin:{contents:`export * from './worker/yeongnyangi/fortune/spirit'; export * from './worker/yeongnyangi/fortune/spirit-contract'; export * from './worker/yeongnyangi/fortune/consultation'; export {saju} from './worker/yeongnyangi/fortune/saju'; export {readingManifest} from './worker/yeongnyangi/fortune/reading-manifest'; export {getProduct} from './worker/yeongnyangi/payments/catalog'; export {StructuredChapterProvider,validateChapter} from './worker/yeongnyangi/providers/chapter'; export {MockChapterProvider} from './__tests__/fixtures/yeongnyangi-chapter';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false});
const loaded=new Module(path.resolve('spirit-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(built.outputFiles[0].text,loaded.id);
const {saju,spiritEvidence,spiritManifest,spiritPublic,validateSpiritInput,validateSpiritChapter,SPIRIT_TIMING,spiritShare,buildSpiritShare,consultationClock,createConsultation,validateConsultationAnswers,getProduct,readingManifest,StructuredChapterProvider,validateChapter,MockChapterProvider}=loaded.exports;
const input=saju.validateInput({personA:{birthDate:'1997-02-10',calendarType:'solar',gender:'female'},question:'재회할까요?\n나는 어떻게 기다릴까요?'});
const context=await saju.calculate(input,{asOf:'2026-09-22'});
const manifest=spiritManifest(readingManifest(getProduct('saju_mackerel')));
const spirit=spiritPublic({relationship:'헤어진 사이',topic:'space',situation:'연락이 끊겼어요',boundary:true},'2026-09-22T01:00:00Z');
const consultation={...createConsultation(input.question,'relationship',consultationClock('Asia/Seoul',new Date(spirit.askedAt)),manifest),spirit};
const analysis={contexts:{saju:context},signals:[],themes:[],question:input.question,topicId:'relationship',consultation};
const pattern=spiritEvidence(context).facts[0].value.patterns[0].strength;
const safe=()=>({summary:pattern,analysis:[],example:'보내지 않을 글에 나의 감정을 적는 연습이야.',advice:'나의 일상을 돌보고 경계를 존중하자.',persona:'답을 서두르지 않아도 괜찮아.',highlights:[],topics:[],sources:['saju.fiveElements'],blocks:[]});

test('real existing calculation feeds structured self-only evidence; unknown birth hour stays absent',async()=>{
  assert.equal(context.facts.find(f=>f.label==='pillars').value.hour,null);
  const projected=spiritEvidence(context);
  assert.equal(projected.facts[0].id,'saju.fiveElements');
  assert.equal(projected.facts[0].value.space,null);assert.equal(projected.facts[0].value.eventPeriod,null);
  assert.equal(projected.facts[0].value.subject,'질문자 본인만');
  const changed={...context,facts:[{id:'saju.fiveElements',label:'fiveElements',value:{counts:{wood:9,fire:1,earth:0,metal:0,water:0}}}]};
  assert.equal(spiritEvidence(changed).facts[0].value.patterns[0].strength,'시작하고 확장하려는 성향');
  const tied={...changed,facts:[{...changed.facts[0],value:{counts:{wood:2,fire:2,earth:2,metal:2,water:2}}}]};
  assert.equal(spiritEvidence(tied).facts[0].value.patterns.length,5);
  assert.match(spiritEvidence(tied).facts[0].value.confidence,/확정할 수 없음/);
  assert.throws(()=>spiritEvidence({...context,facts:[]}),/SPIRIT_EVIDENCE_UNAVAILABLE/);
});
test('input validates required self profile path, rejects other product and detects denied contact',()=>{
  const body={productId:'saju_mackerel',question:'차단했는데 재회할까요?',spirit:{relationship:'헤어진 사이',topic:'reunion'}};
  assert.equal(validateSpiritInput(body).boundary,true);
  for(const patch of [{productId:'tarot_mackerel'},{question:''},{partnerProfileId:'third-party'},{spirit:{...body.spirit,topic:'__proto__'}}])assert.throws(()=>validateSpiritInput({...body,...patch}));
});
test('actual LLM adapter gets structured evidence, input context and one provider attempt; never raw chart',async()=>{
  let request;
  await new StructuredChapterProvider({generate:async r=>{request=r;return {result:{},provider:'mock',model:'mock'};}}).generateChapter({chapter:manifest[0],analysis,previous:[]});
  assert.equal(request.userQuestion,input.question);assert.equal(request.maxProviderAttempts,1);
  assert.ok(request.maxOutputTokens<=16384);
  assert.deepEqual(request.calculatedData.facts,spiritEvidence(context).facts);
  const rules=JSON.parse(request.domainRules);
  assert.equal(rules.spiritContract.spirit.relationship,spirit.relationship);
  assert.equal(rules.spiritContract.spirit.boundary,true);
  assert.equal(rules.professionalEvidenceNames,undefined);
  assert.equal(request.calculatedData.facts.some(f=>f.label==='pillars'),false);
});
test('unsupported location, mind, timing, spiritual and contact claims never pass the save validator',()=>{
  assert.doesNotThrow(()=>validateSpiritChapter(safe(),context,spirit));
  for(const text of ['호라리 하우스로 봤어.','그 사람은 집 북쪽 방에 있다.','상대는 다른 사람을 사랑하고 있어.','그 사람은 조용한 곳에 머무는 분위기야.','신령이 직접 알려주었어.','액운을 막으려면 추가 결제가 필요해.','3일 뒤 연락이 올 거야.','다음 달에 재회해.','올해 봄에는 연락할 거야.','SNS로 찾아보자.','그 사람을 찾아가 봐.']){
    assert.throws(()=>validateSpiritChapter({...safe(),summary:`${pattern}. ${text}`},context,spirit),undefined,text);
  }
  assert.throws(()=>validateSpiritChapter({...safe(),summary:'좋은 기운이 너를 기다리고 있어.'},context,spirit),/SPIRIT_EVIDENCE_MISSING/);
  assert.throws(()=>validateSpiritChapter({...safe(),questionAnswers:[{questionId:'q1',answer:'직접 답변',reason:pattern,action:'선택',timing:'조만간'}]},context,spirit),/UNSUPPORTED_SPIRIT_TIMING/);
});
test('all questions must survive the selected-topic conflict and every required paid chapter passes actual validation',async()=>{
  assert.equal(consultation.questions.length,2);
  const previous=[];
  for(const chapter of manifest){
    const mockAnalysis={...analysis,consultation:undefined};
    const body=await new MockChapterProvider().generateChapter({chapter,analysis:mockAnalysis,previous});
    body.blocks[0].paragraphs[0]=`${pattern}. ${body.blocks[0].paragraphs[0]}`;
    body.questionAnswers=chapter.ordinal===0?consultation.questions.map(q=>({questionId:q.id,answer:'이번 질문은 결과를 서두르기보다 나의 선택을 돌아보는 것으로 풀어볼 수 있어.',reason:pattern+'을 참고하되 내 실제 경험과 맞는지 함께 살펴보자.',timing:SPIRIT_TIMING,action:'나의 일상과 경계를 존중하는 선택을 먼저 적어보자.'})):[];
    assert.doesNotThrow(()=>validateChapter(body,{chapter,analysis,previous}));
    if(chapter.ordinal===0)assert.throws(()=>validateConsultationAnswers({...body,questionAnswers:body.questionAnswers.slice(0,1)},chapter,consultation),/QUESTION_ANSWER_INCOMPLETE/);
    previous.push(body);
  }
  assert.equal(previous.length,5);assert.equal(manifest.length,getProduct('saju_mackerel').chapterCount);
});
test('anonymous share has no input or private result URL',()=>{
  assert.deepEqual(Object.keys(spiritShare).sort(),['text','title']);
  assert.notEqual(buildSpiritShare('wood').text,buildSpiritShare('water').text);
  assert.doesNotMatch(buildSpiritShare('private name 1990').text,/private name|1990/);
  assert.doesNotMatch(JSON.stringify(spiritShare),/1997|q1|id=|507f|재회할까요/);
});

