/** @jest-environment node */
import { jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
let intentRoute,dreamRoute,run,intent,adapters,executionKey,tier,docs,serial,provider,revoked,paid,fault,proofs,security,writes,external,logs,warns;
const owner='64b7f2a1c3d4e5f601234567',clone=value=>structuredClone(value),dream='dream-psycho-analysis',requestId='original-paid-dream';
const get=(doc,key)=>key.split('.').reduce((value,key)=>value?.[key],doc);
function holds(actual,cond){
 if(cond===null)return actual==null;
 if(cond&&typeof cond==='object'&&!(cond instanceof Date)&&Object.keys(cond).every(op=>op.startsWith('$')))return Object.entries(cond).every(([op,value])=>{
  if(op==='$exists')return (actual!==undefined)===value;if(op==='$in')return value.includes(actual);if(op==='$ne')return JSON.stringify(actual)!==JSON.stringify(value);
  if(actual==null)return false;const a=new Date(actual).getTime(),b=new Date(value).getTime();
  if(op==='$gt')return a>b;if(op==='$lte')return a<=b;if(op==='$gte')return a>=b;throw Error('unsupported '+op);});
 return JSON.stringify(actual)===JSON.stringify(cond);
}
function matches(doc,filter){return Object.entries(filter).every(([key,value])=>key==='$or'?value.some(item=>matches(doc,item)):key==='$and'?value.every(item=>matches(doc,item)):holds(get(doc,key),value));}
const query=value=>({lean:async()=>clone(value),select(){return this;},sort(){return this;}});
function patch(doc,fields){for(const[key,value]of Object.entries(fields)){const keys=key.split('.'),end=keys.pop();let target=doc;for(const part of keys)target=target[part]??={};target[end]=clone(value);}}
function insert(filter,update){const doc={_id:'doc-'+(++serial),...Object.fromEntries(Object.entries(filter).filter(([,value])=>typeof value==='string')),...clone(update.$setOnInsert||{})};patch(doc,update.$set||{});docs.push(doc);return doc;}
const model={find:filter=>{const rows=docs.filter(doc=>matches(doc,filter));let n=Infinity;const chain={sort(){return chain;},limit(value){n=value;return chain;},select(){return chain;},lean:async()=>clone(rows.slice(0,n))};return chain;},
 findOne:filter=>query(docs.find(doc=>matches(doc,filter))||null),
 exists:async filter=>{if(fault==='exists')throw Error('storage');const doc=docs.find(doc=>matches(doc,filter));return doc?{_id:doc._id}:null;},
 countDocuments:async filter=>docs.filter(doc=>matches(doc,filter)).length,
 findOneAndUpdate:(filter,update,options={})=>{writes.push(clone(update));let doc=docs.find(doc=>matches(doc,filter));if(doc)patch(doc,update.$set||{});else if(options.upsert)doc=insert(filter,update);return query(doc||null);},
 updateOne:async(filter,update,options={})=>{writes.push(clone(update));const doc=docs.find(doc=>matches(doc,filter));
  if(doc){patch(doc,update.$set||{});return {matchedCount:1};}if(!options.upsert)return {matchedCount:0};insert(filter,update);
  // The write lands and only its reply fails: a duplicate-key race or a lost connection.
  if(fault==='duplicate'||fault==='lost'){const failure=fault;fault=null;throw failure==='duplicate'?Object.assign(Error('E11000'),{code:11000}):Error('network lost');}
  return {upsertedCount:1};},
 deleteOne:async filter=>{const at=docs.findIndex(doc=>matches(doc,filter));if(at>=0)docs.splice(at,1);return {deletedCount:at>=0?1:0};},
 deleteMany:async filter=>{const before=docs.length;docs=docs.filter(doc=>!matches(doc,filter));return {deletedCount:before-docs.length};}};
// Mongoose timestamps add $set.updatedAt and $setOnInsert.createdAt to every update;
// MongoDB rejects one path under both operators (code 40).
const conflicts=update=>{const set=[...Object.keys(update.$set||{}),'updatedAt'];
 return [...Object.keys(update.$setOnInsert||{}),'createdAt'].filter(path=>set.some(other=>path===other||path.startsWith(other+'.')||other.startsWith(path+'.')));};
beforeAll(async()=>{
 const db=await import('../../worker/lib/db.js'),auth=await import('../../worker/lib/auth.js'),models=await import('../../worker/lib/models.js'),gemini=await import('../../worker/lib/gemini.js');
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{},withMongoRetry:async(_env,fn)=>fn()}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({...auth,requireAuth:async()=>({userId:owner}),getOptionalUserFromRequest:async()=>({userId:owner})}));
 jest.unstable_mockModule('../../worker/lib/security/index.js',()=>({enforceSensitiveEndpointSecurity:async input=>{security.push(input);return {ok:true};},enforceAiRouteSecurity:async()=>({ok:true}),writeSecurityLog:async()=>{},getSecuritySubjectHash:()=>''}));
 jest.unstable_mockModule('../../worker/lib/paid-feature-access.js',()=>({PAID_FEATURE_ACCESS_USER_PROJECTION:{},canAccessPaidFeature:async()=>({allowed:false,reason:'PAYMENT_REQUIRED'}),canAccessPaidFeaturesBatch:async()=>({})}));
 jest.unstable_mockModule('../../worker/lib/nakshatra-paid-access.js',()=>({logPerUsePaymentProof:()=>{},verifyPerUsePayment:async(_env,input)=>{proofs.push(input);
  return paid===null?{proven:null}:paid==='admin'?{proven:true,source:'admin',transactionId:''}:paid?{proven:true,source:'single',transactionId:'pay-1'}:{proven:false,reason:'NO_EXISTING_CONSUMPTION'};}}));
 jest.unstable_mockModule('../../worker/lib/cms-prompts.js',()=>({cmsPromptText:async(_env,_key,fallback)=>fallback,cmsPromptModelConfig:async()=>null,primePromptTemplateOverrides:async()=>{}}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,ServiceExecutionTransaction:model,PaidExecutionRecord:{findOne:()=>query(revoked?{}:null)},Payment:{findOne:()=>query(null)},PointHistory:{findOne:()=>query(null)},MonthlyCreditLedger:{findOne:()=>query(null)}}));
 jest.unstable_mockModule('../../worker/lib/gemini.js',()=>({...gemini,callGeminiText:(...args)=>provider(...args)}));
 ({handlePaidNarrativeIntentRoutes:intentRoute}=await import('../../worker/routes/paid-narrative-intent.js'));
 ({handleDreamRoutes:dreamRoute}=await import('../../worker/routes/dream.js'));
 ({runPaidNarrativeRecovery:run}=await import('../../worker/lib/paid-narrative-recovery-task.js'));
 ({paidNarrativeExecutionKey:executionKey}=await import('../../worker/lib/paid-narrative-delivery.js'));
 ({resolveOracleConsultationTier:tier}=await import('../../lib/tarot/oracle-consultation-pricing.mjs'));
 intent=await import('../../worker/lib/paid-narrative-intent.js');adapters=await import('../../worker/lib/paid-narrative-adapters.js');
});
beforeEach(()=>{docs=[];serial=0;revoked=false;paid=false;fault=null;proofs=[];security=[];writes=[];
 provider=jest.fn(async(_env,prompt)=>{const evidenceHash=prompt.match(/evidenceHash":"([a-f0-9]{64})/)[1],label=prompt.split('[이번 호출]\n')[1].split('\n')[0].replace(/[.!?]/g,'');
  return {ok:true,provider:'gemini',text:JSON.stringify({evidenceHash,body:Array.from({length:25},(_,i)=>`${label} ${i}번째 관찰에서는 꿈의 장면과 마음의 리듬을 함께 살펴보며 안정과 회복의 조건을 확인할 수 있습니다. ${label} ${i}번째 성찰은 현실에서 경험한 감정과 꿈속 표현의 차이를 기록하고 여러 가능한 의미를 비교해 보는 방법입니다.`).join('\n\n')})};});
 logs=jest.spyOn(console,'log').mockImplementation(()=>{});warns=jest.spyOn(console,'warn').mockImplementation(()=>{});
 external=jest.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('external fetch forbidden');});
});
afterEach(()=>{const fetched=external.mock.calls.length,logged=JSON.stringify([logs.mock.calls,warns.mock.calls]);external.mockRestore();logs.mockRestore();warns.mockRestore();
 expect(fetched).toBe(0);expect(writes.flatMap(conflicts)).toEqual([]);expect(logged).not.toContain('봄 햇살');});
const original=()=>({requestId,dreamText:'따뜻한 봄 햇살 아래에서 친구를 만나 행복하고 평온했던 꿈입니다.',intake:{desiredOutcome:'마음을 이해하기',relationshipContext:'오래된 친구'}});
const evidence={transactionId:'pay-1',premiumAccessToken:'browser-token',paymentContext:{source:'single'}};
const register=(featureKey,body,method='POST')=>intentRoute(new Request('https://mock.test/api/paid-narrative/intent'+(featureKey==null?'':'?featureKey='+encodeURIComponent(featureKey)),
 {method,headers:{'content-type':'application/json'},body:method==='POST'?JSON.stringify(body):undefined}),{});
const reason=async response=>[response.status,(await response.json()).reason];
const post=body=>dreamRoute(new Request('https://mock.test/api/dream/psycho-analysis',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),{});
const key=()=>executionKey(owner,dream,requestId);
async function finish(){let response;for(let i=0;i<8;i++){response=await post({resumeResultId:key()});if(response.status!==202)break;}return response;}
async function fresh(){docs=[];paid=false;await register(dream,original());paid=true;}
const tick=offset=>run({},{now:Date.now()+offset}),promote=offset=>intent.promotePaidIntents({},{now:Date.now()+offset});
const outcomes=result=>(result.intents||result).outcomes.map(item=>item.outcome);
const totem=mode=>{const slots={one:['today_guide'],three:['past_wound','present_energy','integration_path'],five:['mind','heart','shadow','gift','next_action']}[mode],ids=['cat','squirrel','bluebird','puppy','rabbit'];
 return {mode,requestId:'totem-request-'+mode,question:'관계에서 나를 지키는 방법',cards:slots.map((slot,i)=>({slot,animalId:ids[i],essence:'관찰과 여유',actions:['산책하기']}))};};
const oracle={requestId:'original-paid-oracle',spreadTitle:'세 카드의 흐름',category:'love',question:'어떤 선택을 하는 것이 좋을까요?',cards:[{cardId:'M06',orientation:'upright',positionLabel:'과거'},{cardId:'M00',orientation:'reversed',positionLabel:'현재'},{cardId:'M21',orientation:'upright',positionLabel:'미래'}]};

test('registration stores only the exact route body and stays invisible to delivery reads',async()=>{
 expect((await register(dream,original(),'GET')).status).toBe(405);expect((await intentRoute(new Request('https://mock.test/api/paid-narrative/other',{method:'POST'}),{})).status).toBe(404);expect(security).toEqual([]);
 for(const [featureKey,body,expected] of [[null,original(),[422,'FEATURE_NOT_SUPPORTED']],['geomancy',original(),[422,'FEATURE_NOT_SUPPORTED']],[dream,[original()],[422,'INVALID_BODY']],
  [dream,{...original(),resumeResultId:'paid-narrative:earlier'},[422,'INVALID_BODY']],[dream,{...original(),requestId:'short'},[422,'REQUEST_ID_REQUIRED']],[dream,{...original(),dreamText:''},[400,'INVALID_INPUT']]])
  expect(await reason(await register(featureKey,body))).toEqual(expected);
 expect(docs).toEqual([]);expect(proofs).toEqual([]);
 for(let i=0;i<2;i++)expect(await (await register(dream,{...original(),premiumAccessToken:'browser-token'})).json()).toEqual({ok:true,registered:true});
 expect(docs).toHaveLength(1);expect(docs[0]).toMatchObject({userId:owner,executionKey:intent.paidIntentKey(owner,dream,requestId),featureKey:dream,status:'awaiting_payment',premiumStatus:'payment_pending',
  metadata:{paidIntent:{requestId,locale:'ko',attempts:0,errors:0,reviewRequired:false}}});
 expect(docs[0].metadata.paidIntent.body).toEqual(original());for(const field of ['reportType','reportId','sessionId','idempotencyKey'])expect(docs[0]).not.toHaveProperty(field);
 expect(proofs).toEqual([1,2].map(()=>({userId:owner,featureKey:dream,requestId,requireExisting:true})));
 expect(security[0]).toMatchObject({userId:owner,endpoint:'paid-narrative:intent',allowedMethods:['POST'],requireJson:true,rateLimit:{limit:20,windowSeconds:600},rateLimitKey:'paid-narrative-intent:'+owner,maxPayloadBytes:65536});
 expect((await post({resumeResultId:docs[0].executionKey})).status).toBe(404);expect((await dreamRoute(new Request('https://mock.test/api/dream/psycho-result'),{})).status).toBe(404);expect(provider).not.toHaveBeenCalled();
});
test('a paid, unverifiable or crowded request is not registered',async()=>{
 paid=true;expect(await reason(await register(dream,original()))).toEqual([409,'ALREADY_PAID']);paid=null;expect(await reason(await register(dream,original()))).toEqual([503,'VERIFY_UNAVAILABLE']);
 paid=false;for(let i=0;i<20;i++)docs.push({_id:'other-'+i,userId:owner,executionKey:'paid-intent:other-'+i,featureKey:dream,status:'awaiting_payment'});
 expect(await reason(await register(dream,original()))).toEqual([429,'TOO_MANY_INTENTS']);expect(docs).toHaveLength(20);
});
test('totem and oracle bodies register only under the key their route derives',async()=>{
 for(const [mode,featureKey] of [['one','animal-totem-basic'],['three','animal-totem-basic'],['five','animal-totem-deep']])
  for(const candidate of ['animal-totem-basic','animal-totem-deep'])expect([mode,candidate,(await register(candidate,totem(mode))).status]).toEqual([mode,candidate,candidate===featureKey?200:400]);
 const tiers=Object.entries(intent.PAID_INTENT_PRODUCTS).filter(([,reportType])=>reportType==='tarotOracleConsultation').map(([featureKey])=>featureKey);expect(tiers).toHaveLength(4);
 for(const candidate of tiers)expect([candidate,(await register(candidate,oracle)).status]).toEqual([candidate,candidate===tier(3).featureKey?200:400]);
 expect(docs.map(doc=>doc.featureKey).sort()).toEqual(['animal-totem-basic','animal-totem-basic','animal-totem-deep',tier(3).featureKey].sort());
});
test('a closed browser is delivered once the gate record proves the purchase',async()=>{
 await register(dream,original());expect((await tick(60000)).intents).toMatchObject({expired:0,scanned:0});
 expect(outcomes(await tick(360000))).toEqual(['unpaid']);paid=true;expect((await tick(360000)).intents).toMatchObject({scanned:0});
 const result=await tick(1260000);
 expect(result.intents.outcomes).toEqual([{executionKey:key(),featureKey:dream,outcome:'promoted'}]);expect(result.outcomes).toEqual([{executionKey:key(),featureKey:dream,outcome:'completed'}]);
 expect(docs).toHaveLength(1);expect(docs[0]).toMatchObject({executionKey:key(),reportType:'dreamPsychoAnalysis',idempotencyKey:requestId,status:'success',premiumStatus:'completed',
  metadata:{paidNarrativeProof:{source:'single',transactionId:'pay-1',requestId},paidNarrative:{body:original()}}});
 expect(provider).toHaveBeenCalledTimes(10);expect(proofs).toHaveLength(3);expect(proofs.every(proof=>proof.requireExisting===true&&proof.requestId===requestId&&!('coinPrice' in proof))).toBe(true);
 const late=await post({...original(),...evidence});expect(late.status).toBe(200);expect(await late.json()).toMatchObject({status:'completed',saved:true,resultId:key()});
 expect(proofs).toHaveLength(3);expect(provider).toHaveBeenCalledTimes(10);
});
test('a page that returns after promotion continues the same record and keeps the input check',async()=>{
 await register(dream,original());paid=true;expect(outcomes(await promote(360000))).toEqual(['promoted']);expect(provider).not.toHaveBeenCalled();
 expect((await post({...original(),...evidence})).status).toBe(202);expect(provider).toHaveBeenCalledTimes(4);
 expect(await reason(await post({...original(),...evidence,dreamText:'달라진 꿈의 내용을 적어 봅니다.'}))).toEqual([409,'INPUT_MISMATCH']);
 expect(await reason(await post({...original(),...evidence,note:'새 입력'}))).toEqual([409,'INPUT_MISMATCH']);
 expect((await finish()).status).toBe(200);expect(provider).toHaveBeenCalledTimes(10);expect(proofs.map(proof=>proof.requireExisting===true)).toEqual([true,true]);expect(docs).toHaveLength(1);
 revoked=true;expect(await reason(await post({...original(),...evidence}))).toEqual([403,'PAYMENT_REVOKED']);
});
test('a page that reaches the route first owns the delivery and the intent closes',async()=>{
 await register(dream,original());paid=true;expect((await post({...original(),transactionId:'pay-1'})).status).toBe(202);
 expect(await (await register(dream,original())).json()).toEqual({ok:true,registered:false,reason:'EXECUTION_EXISTS'});
 expect(outcomes(await tick(360000))).toEqual(['execution_exists']);
 expect(docs.map(doc=>doc.executionKey)).toEqual([key()]);expect(docs[0].metadata).not.toHaveProperty('paidNarrativeProof');expect(proofs.map(proof=>proof.requireExisting===true)).toEqual([true,false]);
});
test('refunds, admin access and verification outages never create a delivery',async()=>{
 await register(dream,original());paid=true;revoked=true;expect(outcomes(await tick(360000))).toEqual(['revoked']);expect(docs).toEqual([]);
 revoked=false;paid='admin';expect((await register(dream,original())).status).toBe(200);expect(outcomes(await tick(360000))).toEqual(['unpaid']);
 paid=null;expect(outcomes(await tick(3600000))).toEqual(['degraded']);expect(outcomes(await tick(3600000))).toEqual(['degraded']);
 expect(docs).toHaveLength(1);expect(docs[0]).toMatchObject({status:'awaiting_payment',metadata:{paidIntent:{attempts:1,errors:0}}});
 expect((await tick(90000000)).intents).toMatchObject({expired:1,scanned:0});expect(docs).toEqual([]);expect(provider).not.toHaveBeenCalled();
});
test('lost replies, duplicate keys and concurrent ticks settle on one record; repeated faults stop for review',async()=>{
 await register(dream,original());paid=true;fault='lost';expect(outcomes(await promote(360000))).toEqual(['PROMOTION_FAILED']);
 expect(docs.map(doc=>doc.status).sort()).toEqual(['awaiting_payment','pending']);expect(outcomes(await promote(3600000))).toEqual(['execution_exists']);expect(docs.map(doc=>doc.status)).toEqual(['pending']);
 await fresh();fault='duplicate';expect(outcomes(await promote(360000))).toEqual(['promoted']);expect(docs.map(doc=>doc.status)).toEqual(['pending']);
 await fresh();const both=await Promise.all([promote(360000),promote(360000)]);
 expect(both.flatMap(outcomes).every(outcome=>['promoted','execution_exists'].includes(outcome))).toBe(true);expect(docs.map(doc=>doc.status)).toEqual(['pending']);
 await fresh();fault='exists';for(const offset of [360000,3600000,7200000])expect(outcomes(await promote(offset))).toEqual(['PROMOTION_FAILED']);
 expect(docs[0].metadata.paidIntent).toMatchObject({errors:3,code:'PROMOTION_FAILED',reviewRequired:true});expect((await promote(36000000)).scanned).toBe(0);expect(docs).toHaveLength(1);expect(provider).not.toHaveBeenCalled();
});
test('every server-resumable product is registered or excluded with its reason',()=>{
 const included=Object.keys(intent.PAID_INTENT_PRODUCTS),excluded=Object.keys(intent.PAID_INTENT_EXCLUSIONS);
 expect([...included,...excluded].sort()).toEqual([...adapters.PAID_NARRATIVE_SERVER_RESUME_FEATURE_KEYS].sort());expect(included.filter(featureKey=>excluded.includes(featureKey))).toEqual([]);
 expect(intent.PAID_INTENT_FEATURE_KEYS).toEqual(included);expect(Object.values(intent.PAID_INTENT_EXCLUSIONS).every(reason=>typeof reason==='string'&&reason.length>20)).toBe(true);
 for(const [featureKey,reportType] of Object.entries(intent.PAID_INTENT_PRODUCTS))expect(adapters.PAID_NARRATIVE_SERVER_RESUME_KEYS).toContain(`${featureKey}|${reportType}`);
});
test('every registered client sends its intent right before it opens checkout',()=>{
 for(const [file,call,gate] of [['pet-saju.html','registerPetPaidIntent(spec.key, intentBody)','window._cdOpenPaidServiceGate('],
  ['js/psycho-dream-analyzer-freuds-study.js','await registerPaidIntent(body);','window._cdCoinGatePerUse('],['js/animal-totem-experience.js','await registerTotemPaidIntent(spec.featureKey);','global._cdCoinGatePerUse('],
  ['app/components/LoveRelationshipTarot.tsx','await registerPaidNarrativeIntent("tarot-love-relationship", recoveryRef.current.body);','await ensurePaidAccess({'],
  ['app/components/MindScanTarot.tsx','await registerPaidNarrativeIntent("tarot-mindscan", recoveryRef.current.body);','await ensurePaidAccess({'],
  ['app/tarot/prompt-maker/TarotPromptMakerClient.tsx','await registerPaidNarrativeIntent(oracleTierFeatureKey, prepared.body);','await ensurePaidAccess({']]){
  const source=readFileSync(join(process.cwd(),file),'utf8'),at=source.indexOf(call),distance=source.indexOf(gate,at)-at;
  expect([file,at>=0&&source.indexOf(call,at+1)<0,distance>0&&distance<1200]).toEqual([file,true,true]);
 }
});
