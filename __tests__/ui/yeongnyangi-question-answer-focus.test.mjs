import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {runInNewContext} from 'node:vm';

const compiled=await build({stdin:{contents:"export * from './worker/yeongnyangi/fortune/ask/question-policy'; export {getQuestionGuide} from './lib/fortune/question-journey';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false});
const testModule={exports:{}};runInNewContext(compiled.outputFiles[0].text,{module:testModule,exports:testModule.exports});
const {questionManifest,QUESTION_POLICY_VERSION,getQuestionGuide}=testModule.exports;
const domains=['saju','ziwei','sukuyo','vedic','astrology','tarot'];
const d=(category,target='self')=>({
 version:QUESTION_POLICY_VERSION,category,target,horizon:'current',situation:'오프라인 예시',options:'',period:'',constraints:'',confirmed:false,
 ...(target==='pair'?{relationshipType:'romantic_adults'}:{}),
});
function sections(domain,fish,category,question,target='self'){
 const manifest=questionManifest(domain,fish,d(category,target),undefined,question);
 const answer=manifest.find(c=>c.layoutRole==='answer');
 const synthesis=manifest.find(c=>c.layoutRole==='synthesis');
 assert.ok(answer&&synthesis);
 assert.equal(answer.systems.join(','),domain);
 assert.ok(answer.factSelectors[domain].length>0,domain);
 assert.equal(Object.keys(answer.factSelectors).join(','),domain);
 return {manifest,answer,synthesis,direct:answer.sections.find(s=>s.id==='meaning').instruction,action:synthesis.sections.find(s=>s.id==='action').instruction};
}

test('income-growth prompts reach actual answer/action chapters in all six systems without changing layout or injecting financial certainty',()=>{
 for(const domain of domains){
  const canonical=getQuestionGuide('money').question;
  assert.equal(canonical,'내가 어떻게 하면 돈을 많이 벌 수 있을까?');
  const more=sections(domain,'salmon','money',canonical);
  assert.match(sections(domain,'salmon','money','돈을 더 많이 벌 수 있을까?').direct,/수입을 늘리는 방법부터/);
  const saving=sections(domain,'salmon','money','이달 지출을 줄여 저축하고 싶어요.');
  assert.match(more.answer.title,/수입을 늘릴 수 있는 현실적인 선택/);
  assert.match(more.direct,/시장 보수를 추정하거나 수익·투자 성과를 보장하지 않는다/);
  assert.match(more.action,/되돌릴 수 있는 검증 하나/);
  assert.doesNotMatch(saving.direct,/지출 관리가 아니라|시장 보수/);
  assert.equal(more.manifest.length,saving.manifest.length,domain);
  assert.equal(more.manifest.map(c=>c.id).join(','),saving.manifest.map(c=>c.id).join(','),domain);
 }
});
test('current-partner marriage directions compare only stored evidence, and tarot does not claim a natal chart',()=>{
 for(const domain of domains){
  const current=sections(domain,'flounder','compatibility',getQuestionGuide('marriage-compatibility').question,'pair');
  assert.match(current.answer.title,/두 사람이 결혼/);
  assert.match(current.action,/함께 확인하거나 합의할 구체적 질문/);
  if(domain==='tarot'){
   assert.match(current.direct,/출생 궁합·상대의 속마음·결혼 여부를 확인하지 못한다/);
   assert.ok(!current.answer.factSelectors.tarot.includes('partnerChart'));
   assert.doesNotMatch(current.direct,/두 사람 각각의 성향/);
  }else{
   assert.match(current.direct,/두 사람의 저장된 관계 근거/);
   assert.ok(current.answer.factSelectors[domain].some(f=>f==='partnerChart'||f==='personB'),domain);
  }
  const solo=sections(domain,'mackerel','marriage','나는 언제쯤 결혼하게 될까?');
  assert.doesNotMatch(solo.direct,/두 사람의 저장된 관계 근거/);
 }
});
test('reconnection respects boundaries, career avoids dates and opposite intents stay distinct',()=>{
 for(const domain of domains){
  const reunion=sections(domain,'mackerel','reunion',getQuestionGuide('reconnect').question);
  assert.match(reunion.direct,/날짜·확률·속마음을 지어내지 않는다/);
  assert.match(reunion.action,/차단, 반복된 무응답이 확인되면 접촉을 권하지 않는다/);
  assert.doesNotMatch(sections(domain,'mackerel','love','그 사람의 말과 행동, 왜 다를까?').direct,/연락할 날짜/);
  const work=sections(domain,'salmon','job_change',getQuestionGuide('career').question);
  assert.match(work.direct,/근거 없는 날짜를 예측하지 않는다/);
  assert.match(work.action,/퇴사나 계약 전에 해 볼 수 있는 검증/);
  assert.doesNotMatch(sections(domain,'mackerel','self','어떻게 마음을 이해할 수 있을까?').direct,/퇴사/);
  const legacy=questionManifest(domain,'salmon',d('money'),undefined,'돈을 더 벌고 싶어',false);
  assert.doesNotMatch(JSON.stringify(legacy),/지출 관리가 아니라 수입을 늘리는 방법부터/);
 }
});
