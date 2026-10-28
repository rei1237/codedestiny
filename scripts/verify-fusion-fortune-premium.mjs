import assert from 'node:assert/strict';
import { FUSION_PREMIUM_VERSION as version, FUSION_PREMIUM_TARGETS as targets, fusionSubchapters, normalizeFusionSubchapters, premiumGroupTarget } from '../lib/fusion-premium-report.js';
import { FUSION_EXPERT_VERSION, fusionEvidenceReferences, fusionInputIdentity } from '../worker/lib/fusion-expert-contract.js';
import { fusionGroupsForStage, buildFusionSectionGroupPrompt } from '../worker/lib/fusion-fortune-prompt.js';
import { generateFusionFortuneWithRealLLM, countFusionReportBodyChars, fusionReportMeetsTotalFloor, fusionGroupTokens, normalizeFusionFortuneInput } from '../worker/lib/fusion-fortune.js';
import { buildFusionReportPlan } from '../lib/pdf/fusion-report-plan.js';

const systems = ['saju','ziwei','vedic','sukuyo','astrology','tarot'];
const context = { version: FUSION_EXPERT_VERSION, reportVersion: version, locale: 'ko', birthTimeKnown: true, birthPlaceKnown: true, topic: '이직', customerQuestion: '지금 옮길지 준비부터 할지', systems: Object.fromEntries(systems.map(system => [system, system === 'tarot' ? { cards: [{name:'바보',orientation:'upright',positionKey:'current',meaningSummary:'시작'}] } : { expertEvidence: { theme:'준비', pattern:'책임' } }])), tarotSpread: {cards:[]} };
const plan = { version, question:'이직을 결정하기 전에 무엇을 확인할까요?', questions:[{id:'q1',title:'내 일하는 성향은?'},{id:'q2',title:'옮길 조건은?'},{id:'q3',title:'어떻게 준비할까?'}] };
function prose(seed, n) { const lines=[]; for(let i=0;lines.join('\n\n').length<n;i++) lines.push(`${seed}의 ${i}번째 장면에서는 준비와 책임의 근거를 살펴 역할을 나누고, 비교한 조건을 기록하여 스스로 확인할 다음 행동을 정합니다.`); return lines.join('\n\n'); }
function payload(group) {
 const out={};
 for(const key of group.keys) {
  if(key==='visualization') continue;
  if(key==='consultationPlan'){out[key]=plan;continue;}
  if(key==='title'||key==='shareText'){out[key]='내 선택의 기준';continue;}
  const content=prose(key,targets[key] || 100);
  if(key==='finalVerdict'){out[key]={headline:'조건부터 확인해요',confidence:0,rationale:content,systemVerdicts:systems.map(key=>({key,stance:'conditional',note:'준비할 조건을 확인해요'})),doNow:['기록하기','비교하기','확인하기'],avoid:['재촉하기','과장하기']};continue;}
  if(!key.endsWith('Section') && !['integratedReading','timingAndAction'].includes(key)){out[key]=content;continue;}
  const system=group.systems[0] || 'saju'; const refs=fusionEvidenceReferences(system,context.systems[system]);
  const count=content.split('\n\n').length;
  out[key]={title:'질문에 맞춘 '+key,content,keyPoints:['준비의 범위','책임의 조건','행동의 기준'],subchapters:Array.from({length:4},(_,i)=>({title:`선택을 위한 ${i+1}번째 확인`,start:Math.floor(i*count/4),end:Math.floor((i+1)*count/4),questionIds:[`q${i%3+1}`],evidenceKeys:refs,artKey:system})),signals:[{domain:'work',period:'current',stance:'adapt',summary:'준비할 조건을 확인해요',evidenceKeys:refs}],luckyActions:['기록','비교','확인'],cautionPatterns:['재촉','과장','단정']};
 }
 return out;
}
assert.equal(Object.values(targets).reduce((a,b)=>a+b,0),51000);
const all=[...fusionGroupsForStage(1,context),...fusionGroupsForStage(2,context)];
assert.equal(all.reduce((sum,g)=>sum+premiumGroupTarget(g),0),51000);
for(const group of all){const p=buildFusionSectionGroupPrompt({context,group,priorSections:{consultationPlan:plan}});assert(p.userPrompt.includes(context.customerQuestion));assert(p.userPrompt.includes('타고난 기질'));assert(fusionGroupTokens(group,{},context)>4096+premiumGroupTarget(group)*1.5);}
assert.equal(fusionGroupsForStage(1)[0].keys.includes('consultationPlan'),false);
assert.equal(normalizeFusionFortuneInput({birthDate:'1995-04-18'}).reportVersion,undefined);
assert.notEqual(await fusionInputIdentity({locale:'ko'},'same'),await fusionInputIdentity({locale:'ko',reportVersion:version},'same'));
const originalFetch=globalThis.fetch;const cacheModels=new Map();const deletedCaches=new Set();
globalThis.fetch=async(url,init)=>{
 const path=new URL(String(url)).pathname;
 if(path.endsWith(':countTokens'))return Response.json({totalTokens:1000});
 if(path.endsWith('/cachedContents')&&init.method==='POST'){
  const name='cachedContents/mock-'+cacheModels.size;cacheModels.set(name,JSON.parse(init.body).model.replace('models/',''));return Response.json({name});
 }
 if(path.includes('/cachedContents/')&&init.method==='DELETE'){deletedCaches.add(path.split('/v1beta/')[1]);return new Response(null,{status:204});}
 throw new Error('Network prohibited in premium mock');
};
try {
 let prior={}; const attempts={}; const calls=[]; let firstWave;
 for(const stage of [1,2]) for(let wave=0;wave<10;wave++) {
  const generated=await generateFusionFortuneWithRealLLM({context,stage,requestId:'premium-mock',env:{GEMINI_API_KEY:'mock-not-a-real-key',ENABLE_FUSION_FORTUNE_REAL_LLM:'true',ALLOW_FUSION_FORTUNE_REAL_LLM:'true'},priorResult:prior,priorSnapshot:{attempts},onCheckpoint:async result=>{prior={...prior,...result};},onAttempt:async id=>{attempts[id]=(attempts[id]||0)+1;return attempts[id];},providerCall:async(_env,prompt,options)=>{
   assert.equal(options.model,['integration','verdict'].includes(options.logContext.sectionGroup)?'gemini-2.5-pro':'gemini-2.5-flash');assert.equal(options.reasoningTask,['integration','verdict'].includes(options.logContext.sectionGroup)?'fusion-'+options.logContext.sectionGroup:undefined);assert.equal(options.thinkingBudget,4096);assert.equal(options.fallbackToWorkersAI,false);
   const group=all.find(g=>g.id===options.logContext.sectionGroup);calls.push(group.id);
   if(options.geminiCachedContent)assert.equal(cacheModels.get(options.geminiCachedContent.name),options.model,'mixed waves must not share a cache across models');
   if(group.id!=='saju')assert(prompt.includes(plan.questions[0].title),'shared question plan');
   return {ok:true,text:JSON.stringify(payload(group)),provider:'gemini',model:options.model};
  }});
  prior=generated.result; if(stage===1&&wave===0)firstWave=[...calls];
  if(generated.deliverable)break;
  assert(wave<9,'must complete within bounded waves');
 }
 assert.deepEqual(firstWave,['saju']);assert.equal(calls.length,9,'complete groups never regenerate');
 assert(new Set(cacheModels.values()).has('gemini-2.5-pro'));assert(new Set(cacheModels.values()).has('gemini-2.5-flash'));
 assert.equal(deletedCaches.size,cacheModels.size,'all model-specific caches are released');
 assert(fusionReportMeetsTotalFloor(prior));assert(countFusionReportBodyChars(prior)>=36000);
 const inflated={...prior,executiveSummary:'短',openingMessage:'短',closingMessage:'短',finalVerdict:{rationale:'短'},timingAndAction:{content:'短'}};
 for(const s of [...systems.map(s=>s+'Section'),'integratedReading'])inflated[s]={content:'短',keyPoints:['假'.repeat(60000)]};
 assert.equal(fusionReportMeetsTotalFloor(inflated),false,'key points cannot inflate body floor');
 const tooLong={...prior,executiveSummary:prose('확장',65000)};assert(fusionReportMeetsTotalFloor(tooLong),'long valid report not rejected by editorial ceiling');
 const doc=buildFusionReportPlan(prior);assert(doc.some(c=>c.blocks.some(b=>b.kind==='heading'&&b.text==='선택을 위한 1번째 확인')));
 const saju=prior.sajuSection;assert.equal(fusionSubchapters(saju).map(c=>c.paragraphs.join('\n\n')).join('\n\n'),saju.content);
 const repaired=normalizeFusionSubchapters({...saju,subchapters:saju.subchapters.map(c=>({...c,start:0,end:1}))});assert.equal(fusionSubchapters(repaired).length,4);assert.equal(repaired.content,saju.content);
 // Saved short prose survives bounded repairs and cannot be called full quality.
 const short = structuredClone(prior);
 for (const key of [...systems.map(s=>s+'Section'),'integratedReading','timingAndAction']) {
  short[key] = normalizeFusionSubchapters({...short[key], content:prose(key,1200),subchapters:short[key].subchapters.map(c=>({...c,start:0,end:0}))});
 }
 const exhausted = Object.fromEntries(all.map(g=>[g.id,2]));
 let accidentalCalls=0;
 const preserved=await generateFusionFortuneWithRealLLM({context,stage:2,requestId:'short-saved',env:{GEMINI_API_KEY:'mock',ENABLE_FUSION_FORTUNE_REAL_LLM:'true',ALLOW_FUSION_FORTUNE_REAL_LLM:'true'},priorResult:short,priorSnapshot:{attempts:exhausted,lengthRepairs:Object.fromEntries(all.map(g=>[g.id,true]))},onCheckpoint:async()=>{},providerCall:async()=>{accidentalCalls++;throw new Error('Already completed');}});
 assert.equal(accidentalCalls,0);assert.equal(preserved.result.sajuSection.content,short.sajuSection.content);assert.notEqual(preserved.qualityTier,'full');
 // A truncated JSON / timeout keeps paid checkpoints, and only the missing group is attempted.
 for (const failure of ['truncated','timeout']) {
  const saved=structuredClone(prior);delete saved.ziweiSection;
  const invoked=[];
  const result=await generateFusionFortuneWithRealLLM({context,stage:1,requestId:failure,env:{GEMINI_API_KEY:'mock',ENABLE_FUSION_FORTUNE_REAL_LLM:'true',ALLOW_FUSION_FORTUNE_REAL_LLM:'true'},priorResult:saved,priorSnapshot:{attempts:{...exhausted,ziwei:0}},onCheckpoint:async()=>{},providerCall:async(_env,_prompt,options)=>{invoked.push(options.logContext.sectionGroup);return failure==='truncated'?{ok:true,text:'{"ziweiSection":'}:{ok:false,error:'timeout'};}});
  assert.deepEqual(invoked,['ziwei']);assert.equal(result.deliverable,false);assert.equal(result.result.sajuSection.content,prior.sajuSection.content);assert.deepEqual(result.result.consultationPlan,plan);
 }
 for (const question of ['연애 관계를 어떻게 정리할까요?','이직할지 남을지 고민입니다.','돈을 모으는 습관을 바꾸고 싶어요.','연애와 일을 함께 고민하고 있어요.','어떻게 할까요?','출생 시간을 모르는데 무엇을 확인할까요?']) {
  const built=buildFusionSectionGroupPrompt({context:{...context,customerQuestion:question},group:all[0],priorSections:{}});
  assert(built.userPrompt.includes(question));
  const refs=built.geminiSchema.properties.sajuSection.properties.subchapters.items.properties.evidenceKeys.items.enum;
  assert(refs.every(ref=>ref.startsWith('saju.')),'independent analysis only cites its own system');
 }
 console.log('[fusion-premium] PASS: Flash prose + Pro synthesis/4096, 9 calls, shared plan, 51k targets, body floor, range repair, PDF, legacy identity (mock only)');
} finally {globalThis.fetch=originalFetch;}

