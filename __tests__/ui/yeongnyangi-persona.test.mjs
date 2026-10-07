import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
// Yeoni and Neo share the Yeongnyangi chapter pipeline. Only the speaking-voice segment of the system prompt may differ.
// All calls are mocks: the chapter provider captures the request and never reaches an LLM.
const require=createRequire(import.meta.url),Module=require('node:module');
globalThis.__personaTest={rows:new Map()};
const replacements={
  'worker/lib/models.js':`export const CmsEntry={find:()=>({limit:()=>({lean:async()=>[]})})};export const ProfileCard={findOne:()=>({lean:async()=>({updatedAt:null,birth:{year:1997,month:2,day:10,hour:12,minute:0,timeUnknown:false,calType:'solar'},gender:'F',location:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'}})})};`,
  'worker/lib/db.js':`export const connectDb=async()=>{};export const withMongoRetry=async(e,fn)=>fn();`,
  'worker/yeongnyangi/repository.js':`export const commitTarotDraw=async()=>{throw new Error('unexpected tarot draw');};export const reserveQuestionSkyFollowup=async()=>{throw new Error('unexpected followup');};export const allowedChapterAttempts=()=>3;export const holdAutoResumes=()=>false;export const userCanRetry=()=>false;export const saveChapterDraft=async()=>{};export const saveAskAnalysis=async()=>{};export const ownerId=x=>x;export const createRequest=async(e,u,id,v)=>{const m=globalThis.__personaTest.rows;if(!m.has(id))m.set(id,{...v,_id:id,userId:u,state:'CREATED',chapters:[]});return m.get(id)};export const readRequest=async(e,u,id)=>{const row=globalThis.__personaTest.rows.get(id);if(!row)throw Object.assign(new Error('not found'),{code:'FORTUNE_NOT_FOUND'});return row;};export const attachPayment=async()=>{};export const claimChapter=async()=>{throw new Error('unexpected claim');};export const finishChapter=async()=>{};export const failChapter=async()=>{};`,
  'worker/yeongnyangi/queue.js':`export const enqueueConsultation=async()=>{};`,
  'worker/yeongnyangi/providers/code-destiny':`export class CodeDestinyProvider{async generate(){throw new Error('UNEXPECTED_PROVIDER_CALL')}}`,
};
const bundle=await build({stdin:{contents:"export {prepareFortune} from './worker/yeongnyangi/service'; export {products,getChatProduct,resolveStoredProduct,getProduct,chatTarotKinds,chatQuestionProducts} from './worker/yeongnyangi/payments/catalog'; export {tarotConsultations} from './worker/yeongnyangi/fortune/tarot/consultation-contract'; export {TAROT_KINDS} from './app/fortune-chat/consultation-world'; export {StructuredChapterProvider,personaPrompt} from './worker/yeongnyangi/providers/chapter'; export {persona as yeongnyangiPersona, honorificPersona as yeongnyangiHonorific} from './worker/yeongnyangi/prompts/persona/yeongnyangi'; export {persona as yeoniPersona} from './worker/yeongnyangi/prompts/persona/yeoni'; export {persona as neoPersona} from './worker/yeongnyangi/prompts/persona/neo';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'},plugins:[{name:'mock-boundaries',setup(b){b.onLoad({filter:/worker[\\/](?:lib|yeongnyangi)[\\/]/},args=>{const key=Object.keys(replacements).find(k=>args.path.replaceAll('\\','/').endsWith(k)||args.path.replaceAll('\\','/').endsWith(k+'.ts'));return key?{contents:replacements[key],loader:'ts'}:undefined;});}}]});
const loaded=new Module(path.resolve('persona-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
const m=loaded.exports;
const env={GEMINIF_API_KEY:'mock-never-sent',LLM_DRY_RUN:'false'};
// Calculation timestamps are the only field allowed to differ between two preparations.
const untimed=value=>JSON.parse(JSON.stringify(value,(k,v)=>k==='calculatedAt'?undefined:v));
const voices={undefined:m.yeongnyangiPersona,yeoni:m.yeoniPersona,neo:m.neoPersona};

async function capture(input){
 let sent;
 try{await new m.StructuredChapterProvider({generate:async request=>{sent=request;return {result:{},provider:'mock',model:'fixture'};}}).generateChapter(input);}catch{}
 assert.ok(sent,'request reached the provider');
 return sent;
}

test('persona selector falls back to Yeongnyangi and the chat voices stay free of cat speech',()=>{
 assert.equal(m.personaPrompt(),m.yeongnyangiPersona);
 assert.equal(m.personaPrompt('yeoni'),m.yeoniPersona);
 assert.equal(m.personaPrompt('neo'),m.neoPersona);
 assert.equal(m.personaPrompt('other'),m.yeongnyangiPersona);
 for(const voice of [m.yeoniPersona,m.neoPersona]){
  assert.doesNotMatch(voice,/냥|영냥|생선/);
  assert.match(voice,/결론의 방향을 바꾸지 않는다/);
  assert.match(voice,/확정 예언은 금지/);
 }
 // Yeongnyangi speaks 반말 under the same evidence rules as the chat voices.
 assert.match(m.yeongnyangiPersona,/반말/);
 assert.match(m.yeongnyangiPersona,/결론의 방향을 바꾸지 않는다/);
 assert.match(m.yeongnyangiPersona,/확정 예언은 금지/);
 // Blunt first: each section opens on a judgment, and directness never trims the required length.
 assert.match(m.yeongnyangiPersona,/첫 답변에서는[^\n]*구체적으로 알아주며 바로 답한다/);
 assert.match(m.yeongnyangiPersona,/직설은 분량을 줄이라는 뜻이 아니다/);
});

test('every chapter request differs only in the persona segment of the system prompt',async()=>{
 const row=await m.prepareFortune(env,'persona-owner',{productId:'saju_mackerel',profileId:'self',timezone:'Asia/Seoul',topicId:'general',question:'올해 이직을 준비해도 될까요?'});
 assert.equal(row.snapshot.manifest.length,5);
 for(const chapter of row.snapshot.manifest){
  const base={locale:'ko',chapter,analysis:row.snapshot.analysis,previous:[]};
  const sent=Object.fromEntries(await Promise.all(Object.keys(voices).map(async id=>[id,await capture(id==='undefined'?base:{...base,persona:id})])));
  // The shared Korean directive asks for 존댓말; the reading contract must leave the register to the persona.
  assert.doesNotMatch(sent.undefined.system,/존댓말로 작성/,chapter.id);
  assert.match(sent.undefined.system,/말투는 상담자 페르소나 지시를 따르십시오/,chapter.id);
  for(const id of ['yeoni','neo']){
   const {system:a,...restA}=sent.undefined,{system:b,...restB}=sent[id];
   assert.deepEqual(restB,restA,`${chapter.id}/${id}`);
   assert.ok(a.includes(voices.undefined)&&b.includes(voices[id]));
   assert.equal(b.replace(voices[id],'<persona>'),a.replace(voices.undefined,'<persona>'),`${chapter.id}/${id}`);
   assert.doesNotMatch(b,/영냥이/);
  }
 }
});

// The Yeongnyangi request identities themselves are pinned by yeongnyangi-reading-invariance.
test('yeoni and neo prepare the same birth data, facts, outline and evidence as a Yeongnyangi mackerel question',async()=>{
 const ask={profileId:'self',timezone:'Asia/Seoul',topicId:'general',consultationKind:'ask',question:'올해 이직을 준비해도 될까요?'};
 const base=await m.prepareFortune(env,'parity-owner',{...ask,productId:'saju_mackerel',persona:'yeoni'});
 const [yeoni,neo]=await Promise.all(['yeoni','neo'].map(persona=>m.prepareFortune(env,'parity-owner',{...ask,domain:'saju',productId:'saju_tuna'},{persona})));
 assert.equal(base.persona,undefined);assert.equal(base.snapshot.persona,undefined);
 for(const [row,persona] of [[yeoni,'yeoni'],[neo,'neo']]){
  assert.equal(row.persona,persona);assert.equal(row.snapshot.persona,persona);
  assert.deepEqual(row.snapshot.natalInput,base.snapshot.natalInput);
  assert.deepEqual(untimed(row.snapshot.analysis),untimed(base.snapshot.analysis));
  assert.deepEqual(row.snapshot.manifest,base.snapshot.manifest);
  assert.deepEqual(untimed(row.generationCheckpoint),untimed(base.generationCheckpoint));
  assert.equal(row.productId,'chat_saju');assert.equal(row.featureKey,'fortune-chat-consultation');assert.equal(row.amountKRW,3000);
  assert.equal(row.snapshot.product.manifestVersion,base.snapshot.product.manifestVersion);
  assert.equal(row.snapshot.manifest.length,5);
  assert.doesNotMatch(JSON.stringify(row.snapshot.manifest)+JSON.stringify(row.snapshot.product),/영냥|고등어|yeongnyangi/);
 }
 assert.ok(base.generationCheckpoint?.evidence);
 assert.equal(new Set([base,yeoni,neo].map(r=>r.fingerprint)).size,3);
 assert.equal(new Set([base,yeoni,neo].map(r=>r._id)).size,3);
 await assert.rejects(m.prepareFortune(env,'parity-owner',{...ask,domain:'saju',mode:'spirit'},{persona:'neo'}),e=>e.code==='INVALID_READING_MODE');
});

test('chat products keep their own price and stay out of the Yeongnyangi catalog',()=>{
 for(const domain of ['saju','ziwei','sukuyo','vedic','astrology','tarot']){
  const chat=m.getChatProduct(domain),fish=m.getProduct(domain+'_mackerel');
  assert.equal(chat.priceKRW,3000);assert.equal(chat.cdFeatureKey,'fortune-chat-consultation');
  assert.equal(chat.chapterCount,fish.chapterCount);assert.equal(chat.manifestVersion,fish.manifestVersion);
  assert.deepEqual(m.resolveStoredProduct('chat_'+domain),chat);
 }
 assert.throws(()=>m.getChatProduct('fusion'),e=>e.code==='PRODUCT_NOT_FOUND');
 assert.throws(()=>m.resolveStoredProduct('chat_fusion_all'),e=>e.code==='PRODUCT_NOT_FOUND');
 assert.ok(!m.products.some(p=>p.id.startsWith('chat_')||p.cdFeatureKey==='fortune-chat-consultation'));
});

test('chat tarot reads a v2 question spread in the persona voice without a birth profile',async()=>{
 const consultationAttemptId=crypto.randomUUID();
 const ask={timezone:'Asia/Seoul',domain:'tarot',consultationKind:'career',question:'지금 회사를 옮겨도 될까요?',consultationAttemptId};
 const [yeoni,neo]=await Promise.all(['yeoni','neo'].map(persona=>m.prepareFortune(env,'tarot-owner',ask,{persona})));
 assert.notEqual(yeoni._id,neo._id);
 for(const row of [yeoni,neo]){
  assert.equal(row.productId,'chat_tarot');assert.equal(row.featureKey,'fortune-chat-consultation');assert.equal(row.amountKRW,3000);
  assert.equal(row.profileId,'tarot-question');
  assert.deepEqual(row.snapshot.tarotConsultation,{version:'yeongnyangi-tarot-consultation-v2',kind:'career'});
  assert.equal(row.snapshot.manifest.length,5);
  const saved=row.snapshot.analysis.contexts.tarot.facts.find(f=>f.label==='tarotConsultation').value;
  assert.match(saved.rules,/상담자의 말투로/);
  assert.doesNotMatch(JSON.stringify(row.snapshot.manifest)+saved.rules,/영냥/);
  const sent=await capture({locale:'ko',chapter:row.snapshot.manifest[1],analysis:row.snapshot.analysis,previous:[],persona:row.persona});
  assert.doesNotMatch(JSON.stringify(sent),/영냥/);
 }
 // A retry of the same form reads the stored intent instead of drawing again.
 assert.equal((await m.prepareFortune(env,'tarot-owner',ask,{persona:'neo'}))._id,neo._id);
 for(const consultationKind of [undefined,'ask','compatibility'])
  await assert.rejects(m.prepareFortune(env,'tarot-owner',{...ask,consultationKind},{persona:'yeoni'}),e=>e.code==='INVALID_CONSULTATION_KIND',String(consultationKind));
 // Yeongnyangi tarot keeps its own voice.
 const shop=await m.prepareFortune(env,'tarot-owner',{timezone:'Asia/Seoul',productId:'tarot_mackerel',consultationKind:'career',question:'지금 회사를 옮겨도 될까요?',consultationAttemptId:crypto.randomUUID()});
 assert.match(JSON.stringify(shop.snapshot.manifest),/영냥이 상담 문체/);
});

test('the room offers exactly the chat tarot kinds with the server labels',()=>{
 assert.deepEqual(m.TAROT_KINDS.map(k=>k.id),[...m.chatTarotKinds]);
 for(const k of m.TAROT_KINDS)assert.equal(k.label,m.tarotConsultations[k.id].label);
});

test('the 존댓말 voice keeps every Yeongnyangi rule and changes only the register',()=>{
 const honorific=m.personaPrompt(undefined,'honorific');
 assert.equal(honorific,m.yeongnyangiHonorific);
 assert.equal(m.personaPrompt(undefined,'banmal'),m.yeongnyangiPersona);
 assert.equal(m.personaPrompt('yeoni','honorific'),m.yeoniPersona); // chat voices ignore the order-form choice
 assert.match(honorific,/해요체/);assert.match(honorific,/반말\(~해, ~야, ~거든, ~지\)[^\n]*쓰지 않는다/);
 assert.match(honorific,/'손님'이라고 부르고 '너'라고 부르지 않는다/);
 assert.doesNotMatch(honorific,/'~해 봐'|'A가 아니라 B야'|'너는 ~해'/);
 const lines=[m.yeongnyangiPersona.split('\n'),honorific.split('\n')];
 assert.equal(lines[1].length,lines[0].length);
 for(const n of [0,4,7,8,9,10])assert.equal(lines[1][n],lines[0][n],`line ${n+1} is register-free`);
 for(const rule of [/결론의 방향을 바꾸지 않는다/,/확정 예언은 금지/,/첫 답변에서는.*구체적으로 알아주며 바로 답한다/,/직설은 분량을 줄이라는 뜻이 아니다/])assert.match(honorific,rule);
});

test('voiceStyle: only a Korean Yeongnyangi honorific order changes the identity, snapshot and prompt',async()=>{
 const order={productId:'saju_mackerel',profileId:'self',timezone:'Asia/Seoul',topicId:'general',question:'올해 이직을 준비해도 될까요?'};
 const base=await m.prepareFortune(env,'voice-owner',order);
 const [banmal,odd,honorific,english]=await Promise.all([
  m.prepareFortune(env,'voice-owner',{...order,voiceStyle:'banmal'}),
  m.prepareFortune(env,'voice-owner',{...order,voiceStyle:'shout'}),
  m.prepareFortune(env,'voice-owner',{...order,voiceStyle:'honorific'}),
  m.prepareFortune(env,'voice-owner',{...order,locale:'en',voiceStyle:'honorific'}),
 ]);
 for(const row of [base,banmal,odd]){assert.equal(row.fingerprint,base.fingerprint);assert.equal(row.snapshot.voiceStyle,undefined);}
 assert.notEqual(honorific.fingerprint,base.fingerprint);assert.notEqual(honorific._id,base._id);
 assert.equal(honorific.snapshot.voiceStyle,'honorific');
 assert.equal(honorific.amountKRW,base.amountKRW);assert.equal(honorific.productId,base.productId);assert.equal(honorific.persona,undefined);
 assert.equal(english.snapshot.voiceStyle,undefined);
 const chat=await m.prepareFortune(env,'voice-owner',{...order,domain:'saju',productId:'saju_tuna',voiceStyle:'honorific'},{persona:'neo'});
 assert.equal(chat.snapshot.voiceStyle,undefined);
 const chapter=honorific.snapshot.manifest[0],base0={locale:'ko',chapter,analysis:honorific.snapshot.analysis,previous:[]};
 const [plain,polite]=await Promise.all([capture(base0),capture({...base0,voiceStyle:honorific.snapshot.voiceStyle})]);
 const {system:a,...restA}=plain,{system:b,...restB}=polite;
 assert.deepEqual(restB,restA);
 assert.equal(b.replace(m.yeongnyangiHonorific,'<persona>'),a.replace(m.yeongnyangiPersona,'<persona>'));
});

const questionDecision={version:'question-consultation-20261007',category:'self',target:'self',horizon:'current',situation:'업무 부탁을 자주 받아요',options:'',period:'',constraints:'',confirmed:true};
test('chat question catalog prices, support limits and stored identities share the server registry',()=>{
 const prices={mackerel:3000,salmon:9000,flounder:15000,tuna:30000};
 const catalog=m.chatQuestionProducts();assert.equal(catalog.length,21);
 for(const product of catalog){assert.equal(product.priceKRW,prices[product.fishId]);assert.equal(product.cdFeatureKey,'fortune-chat-question-'+product.fishId);assert.deepEqual(m.resolveStoredProduct(product.id),product);}
 for(const domain of ['tarot','astrology','sukuyo'])assert.ok(!catalog.some(p=>p.domain===domain&&p.fishId==='tuna'));
});
test('missing or forged fish and unsupported long-term requests stop before calculation or storage',async()=>{
 const before=globalThis.__personaTest.rows.size;
 for(const fishId of [undefined,null,'','assorted','invalid'])await assert.rejects(m.prepareFortune(env,'tier-owner',{domain:'saju',fishId,questionDecision,question:'부탁을 어떻게 거절할까?'},{persona:'yeoni'}),e=>e.code==='QUESTION_PRODUCT_MISMATCH');
 for(const domain of ['tarot','astrology','sukuyo'])await assert.rejects(m.prepareFortune(env,'tier-owner',{domain,fishId:'tuna',questionDecision:{...questionDecision,horizon:'transition',period:'2027년'},question:'다음 시기 준비'},{persona:'neo'}),e=>e.code==='QUESTION_SCOPE_UNSUPPORTED');
 assert.equal(globalThis.__personaTest.rows.size,before);
});
test('new chat questions persist the tier contract and separate personas on one attempt',async()=>{
 const body={domain:'saju',fishId:'mackerel',profileId:'self',timezone:'Asia/Seoul',question:'부탁을 어떻게 거절할까?',questionDecision,consultationAttemptId:'11111111-1111-4111-8111-111111111111'};
 const a=await m.prepareFortune(env,'tier-owner',body,{persona:'yeoni'}),b=await m.prepareFortune(env,'tier-owner',body,{persona:'neo'});
 assert.notEqual(a._id,b._id);assert.equal(a.featureKey,'fortune-chat-question-mackerel');assert.equal(a.snapshot.questionContract.followups,0);
 assert.equal(a.snapshot.manifest.length,1);assert.equal(a.snapshot.manifest[0].questionPolicy,questionDecision.version);
 assert.equal((await m.prepareFortune(env,'tier-owner',body,{persona:'yeoni'}))._id,a._id);
});

test('all four chat tiers persist their question scope and followup allowance',async()=>{
 const cases=[['mackerel',{},'부탁을 어떻게 거절할까?',0],['salmon',{category:'career',options:'준비 목표',constraints:'없음',period:'2026년'},'어떤 직업을 준비할까?',1],['flounder',{category:'compatibility',target:'pair',relationshipType:'other'},'두 사람의 차이를 어떻게 조율할까?',2],['tuna',{category:'timing',horizon:'transition',period:'2026년부터 다음 대운'},'다음 대운을 어떻게 준비할까?',4]];
 for(const [fishId,patch,question,followups] of cases){
  const body={domain:'saju',fishId,profileId:'self',...(fishId==='flounder'?{partnerProfileId:'partner'}:{}),timezone:'Asia/Seoul',question,questionDecision:{...questionDecision,...patch},consultationAttemptId:crypto.randomUUID()};
  const row=await m.prepareFortune(env,'four-tier-owner',body,{persona:'neo'});
  assert.equal(row.featureKey,'fortune-chat-question-'+fishId);assert.equal(row.snapshot.questionContract.followups,followups);
  assert.equal(row.snapshot.manifest.length,1);assert.equal(row.snapshot.manifest[0].tier,fishId);
 }
});
