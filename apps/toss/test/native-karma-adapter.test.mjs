import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
require('../../../scripts/lib/mock-network-guard.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{build}=require('esbuild'),Module=require('node:module');
const root=path.resolve(import.meta.dirname,'../../..');
const auth={_id:'identity',ownerId:'owner',userId:'owner',environment:'SANDBOX',userKey:'123',revision:1},id='a'.repeat(64),orderId='01900000-1111-7111-8111-000000000042';
const row={_id:id,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,nativeService:'karma',requestId:'attempt-123456',featureKey:'karma-destiny-ai-consultation',inputHash:'locked',orderId,status:'paid',input:{idempotencyKey:'attempt-123456'}};
const state=globalThis.__karmaAdapter={row,doc:null,order:'PURCHASED',originalCalls:0,lastPath:''};
const stubs={
 'worker/lib/db.js':'export const withMongoRetry=async(_e,f)=>f();',
 'worker/toss/models.js':`const s=globalThis.__karmaAdapter;const match=(r,q)=>Object.entries(q).every(([k,v])=>r?.[k]===v);export const TossNativeConsultation={findOne:q=>({lean:async()=>match(s.row,q)?s.row:null}),find:()=>({sort:()=>({limit:()=>({lean:async()=>[s.row]})})}),updateOne:async()=>({matchedCount:1})};export const TossIdentity={findOne:()=>({lean:async()=>s.identity||null})};`,
 'worker/toss/native-tea.js':`import {TossError} from './policy.js';const s=globalThis.__karmaAdapter;export const nativeIntentId=async()=>s.row._id,nativeOwnerFilter=a=>({identityId:a._id,ownerId:a.ownerId,environment:a.environment,nativeService:'karma'}),prepareNativeConsultation=async(...args)=>{s.preparedInput=args[2];return {id:'intent',paid:false};};export async function verifiedIntent(_e,a,row){if(!row||row.identityId!==a._id||row.ownerId!==a.ownerId||row.environment!==a.environment)throw new TossError('RESULT_NOT_FOUND',404);if(s.order==='REFUNDED')throw new TossError('ORDER_REFUNDED',409);if(s.order==='DENIED')throw new TossError('ACCESS_DENIED',403);return row;}`,
 'worker/toss/native-consultation.js':`import {TossError} from './policy.js';export function assertNativeIntent(r,a){if(!r||r.identityId!==a._id)throw new TossError('RESULT_NOT_FOUND',404);return r;}`,
 'worker/toss/crypto.js':'export const unseal=async()=>"123";',
 'worker/toss/native-failure.js':'export const nativeFailureResponse=x=>x;',
 'worker/routes/karma-destiny-ai.js':`import {nativeTossContext} from '../toss/native-context.js';const s=globalThis.__karmaAdapter;export const nativeKarmaContract=input=>{if(input.invalid)throw Object.assign(Error('invalid'),{status:400});return {requestId:input.requestId};};export const prepareNativeKarmaCalculation=async(_e,_a,input)=>{s.calculationInput=input;if(s.calculationFailure)throw Object.assign(Error('mismatch'),{status:409,code:'REQUEST_INPUT_MISMATCH'});};export const nativeKarmaStoredState=async(_e,_u,_id,lookup)=>{s.lastLookup=lookup;return s.doc;};export async function handleKarmaDestinyAiRoutes(request){s.originalCalls++;s.lastPath=new URL(request.url).pathname;s.lastResultId=new URL(request.url).searchParams.get('sessionId');s.lastBody=request.method==='POST'?await request.json():null;const c=nativeTossContext(request);if(!c)throw Error('WEB_FALLBACK');if(!s.doc)return Response.json({ok:false},{status:404});await c.assertStored(s.doc);return Response.json({ok:true,result:'saved'});}`,
};
const bundle=await build({stdin:{contents:fs.readFileSync(path.join(root,'worker/toss/native-karma.js'),'utf8'),resolveDir:path.join(root,'worker/toss'),loader:'js'},bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'offline',setup(b){b.onLoad({filter:/\.js$/},a=>{const content=stubs[path.relative(root,a.path).replaceAll('\\','/')];if(content)return {contents:content,loader:'js'};});}}]});
const m=new Module(path.join(root,'karma-adapter-fixture.cjs'));m.paths=Module._nodeModulePaths(root);m._compile(bundle.outputFiles[0].text,m.id);const api=m.exports;
const get=(suffix,who=auth)=>api.handleNativeKarma(new Request('https://example.invalid'+suffix),{},who,'/result');

test('purchase preparation validates the original calculation',async()=>{
 const input={requestId:'attempt-123456'};state.calculationFailure=true;await assert.rejects(api.prepareNativeKarma({},auth,input),e=>e.status===409);state.calculationFailure=false;const result=await api.prepareNativeKarma({},auth,input);assert.equal(result.paid,false);assert.equal(state.preparedInput.idempotencyKey,input.requestId);assert.equal(state.calculationInput.idempotencyKey,input.requestId);await assert.rejects(api.prepareNativeKarma({},auth,{invalid:true}),e=>e.status===400);
});
test('virtual recovery checks owner and refund before exposing pending status',async()=>{
 state.doc=null;state.order='PURCHASED';state.originalCalls=0;const res=await get('/result?sessionId=toss_'+id);assert.equal(res.status,202);assert.equal((await res.json()).sessionId,'toss_'+id);assert.equal(state.originalCalls,0);await assert.rejects(get('/result?sessionId=toss_'+id,{...auth,ownerId:'other'}),e=>e.status===404);state.order='REFUNDED';await assert.rejects(get('/result?sessionId=toss_'+id),e=>e.code==='ORDER_REFUNDED');state.order='PURCHASED';
});
test('saved results remain bound to the original owner, input and order',async()=>{
 state.doc={id:'saved-result',accessSource:'toss',userId:'owner',idempotencyKey:row.requestId,inputHash:row.inputHash,paymentId:orderId};const res=await get('/result?sessionId=toss_'+id);assert.equal(res.status,200);assert.equal(state.lastResultId,'saved-result');assert.equal(state.lastLookup,'request');state.doc={...state.doc,accessSource:'web'};await assert.rejects(get('/result?sessionId=toss_'+id),e=>e.code==='RESULT_NOT_FOUND');state.doc={...state.doc,accessSource:'toss',paymentId:'different'};await assert.rejects(get('/result?sessionId=toss_'+id),e=>e.code==='RESULT_NOT_FOUND');
});
test('unstarted paid recovery reuses saved input after checking ownership',async()=>{
 state.doc=null;state.identity={...auth,active:true,encryptedKey:'opaque'};state.lastPath='';const now=Date.now();const outcomes=await api.bootstrapNativeKarmaOrders({TOSS_RELEASE_READY:'true'},{now,deadline:now+120000});assert.equal(state.lastPath,'/api/karma-destiny-ai/start');assert.equal(state.lastBody.idempotencyKey,row.requestId);assert.equal(outcomes[0].status,404);
});
test('a paid missing checkpoint resumes with the immutable stored input',async()=>{
 state.doc=null;state.order='PURCHASED';state.originalCalls=0;
 const request=()=>new Request('https://example.invalid/generate-batch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'toss_'+id,question:'forged'})});
 const response=await api.handleNativeKarma(request(),{},auth,'/generate-batch');assert.equal(response.status,404);assert.equal(state.lastPath,'/api/karma-destiny-ai/start');assert.deepEqual(state.lastBody,row.input);
 state.order='DENIED';await assert.rejects(api.handleNativeKarma(request(),{},auth,'/generate-batch'),e=>e.status===403);state.order='PURCHASED';
});
test('unapproved original routes cannot be reached through the adapter',async()=>{
 await assert.rejects(api.handleNativeKarma(new Request('https://example.invalid/message',{method:'POST',body:'{}'}),{},auth,'/message'),e=>e.status===404);
});
