import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
require('../../../scripts/lib/mock-network-guard.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{build}=require('esbuild'),Module=require('node:module');
const root=path.resolve(import.meta.dirname,'../../..');
const auth={_id:'identity',ownerId:'owner',userId:'owner',environment:'SANDBOX',userKey:'123',revision:1},id='a'.repeat(64),orderId='01900000-1111-7111-8111-000000000042';
const row={_id:id,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,nativeService:'new-year',requestId:'attempt-123456',featureKey:'new-year-ai-consultation',inputHash:'locked',orderId,status:'paid'};
const state=globalThis.__newYearAdapter={row,doc:null,order:'PURCHASED',originalCalls:0,lastPath:''};
const stubs={
 'worker/lib/db.js':'export const withMongoRetry=async(_e,f)=>f();',
 'worker/toss/models.js':`const s=globalThis.__newYearAdapter;const match=(r,q)=>Object.entries(q).every(([k,v])=>r?.[k]===v);export const TossNativeConsultation={findOne:q=>({lean:async()=>match(s.row,q)?s.row:null}),find:()=>({sort:()=>({limit:()=>({lean:async()=>[s.row]})})}),updateOne:async()=>({matchedCount:1})};export const TossIdentity={findOne:()=>({lean:async()=>s.identity||null})};`,
 'worker/toss/native-tea.js':`import {TossError} from './policy.js';const s=globalThis.__newYearAdapter;export const nativeIntentId=async()=>s.row._id,nativeOwnerFilter=a=>({identityId:a._id,ownerId:a.ownerId,environment:a.environment,nativeService:'new-year'}),prepareNativeConsultation=async(...args)=>{s.preparedInput=args[2];return {id:'intent',paid:false};};export async function verifiedIntent(_e,a,row){if(!row||row.identityId!==a._id||row.ownerId!==a.ownerId||row.environment!==a.environment)throw new TossError('RESULT_NOT_FOUND',404);if(s.order==='REFUNDED')throw new TossError('ORDER_REFUNDED',409);if(s.order==='DENIED')throw new TossError('ACCESS_DENIED',403);return row;}`,
 'worker/toss/native-consultation.js':`import {TossError} from './policy.js';export function assertNativeIntent(r,a){if(!r||r.identityId!==a._id)throw new TossError('RESULT_NOT_FOUND',404);return r;}`,
 'worker/toss/crypto.js':'export const unseal=async()=>"123";',
 'worker/toss/native-failure.js':'export const nativeFailureResponse=x=>x;',
 'worker/routes/new-year-ai.js':`import {nativeTossContext} from '../toss/native-context.js';const s=globalThis.__newYearAdapter;export const nativeNewYearContract=input=>{if(input.invalid)throw Object.assign(Error('invalid'),{status:400});return {requestId:input.requestId};};export const prepareNativeNewYearCalculation=async(_e,_a,input)=>{s.calculationInput=input;if(s.calculationFailure)throw Object.assign(Error('mismatch'),{status:409,code:'REQUEST_INPUT_MISMATCH'});};export const nativeNewYearStoredState=async(_e,_u,_id,lookup)=>{s.lastLookup=lookup;return s.doc;};export async function handleNewYearAiRoutes(request){s.originalCalls++;s.lastPath=new URL(request.url).pathname;s.lastResultId=new URL(request.url).searchParams.get('sessionId');const c=nativeTossContext(request);if(!c)throw Error('WEB_FALLBACK');if(!s.doc)return Response.json({ok:false},{status:404});await c.assertStored(s.doc);return Response.json({ok:true,result:'saved'});}`,
};
const bundle=await build({stdin:{contents:fs.readFileSync(path.join(root,'worker/toss/native-new-year.js'),'utf8'),resolveDir:path.join(root,'worker/toss'),loader:'js'},bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'offline',setup(b){b.onLoad({filter:/\.js$/},a=>{const content=stubs[path.relative(root,a.path).replaceAll('\\','/')];if(content)return {contents:content,loader:'js'};});}}]});
const m=new Module(path.join(root,'new-year-adapter-fixture.cjs'));m.paths=Module._nodeModulePaths(root);m._compile(bundle.outputFiles[0].text,m.id);const api=m.exports;
const get=(suffix,who=auth)=>api.handleNativeNewYear(new Request('https://example.invalid'+suffix),{},who,suffix);

test('purchase intent requires original calculation before returning',async()=>{
 const input={requestId:'attempt-123456'};state.calculationFailure=true;await assert.rejects(api.prepareNativeNewYear({},auth,input),e=>e.status===409);state.calculationFailure=false;const result=await api.prepareNativeNewYear({},auth,input);assert.equal(result.paid,false);assert.equal(state.preparedInput.idempotencyKey,input.requestId);assert.equal(state.calculationInput.idempotencyKey,input.requestId);await assert.rejects(api.prepareNativeNewYear({},auth,{invalid:true}),e=>e.status===400);
});
test('only the owner of a paid virtual result can resume before a checkpoint',async()=>{
 state.doc=null;state.order='PURCHASED';state.originalCalls=0;const res=await get('/result/toss_'+id);assert.equal(res.status,202);assert.equal((await res.json()).sessionId,'toss_'+id);assert.equal(state.originalCalls,0);await assert.rejects(get('/result/toss_'+id,{...auth,ownerId:'other'}),e=>e.status===404);state.order='REFUNDED';await assert.rejects(get('/result/toss_'+id),e=>e.code==='ORDER_REFUNDED');state.order='PURCHASED';
});
test('saved result remains bound to the same owner, input and order',async()=>{
 state.doc={id:'saved-result',accessSource:'toss',userId:'owner',idempotencyKey:row.requestId,inputHash:row.inputHash,paymentId:orderId};const res=await get('/result/toss_'+id);assert.equal(res.status,200);assert.equal(state.lastPath,'/api/new-year-ai/result');assert.equal(state.lastResultId,'saved-result');assert.equal(state.lastLookup,'request');state.doc={...state.doc,accessSource:'web'};await assert.rejects(get('/result/toss_'+id),e=>e.code==='RESULT_NOT_FOUND');state.doc={...state.doc,accessSource:'toss',paymentId:'different'};await assert.rejects(get('/result/toss_'+id),e=>e.code==='RESULT_NOT_FOUND');
});
test('malformed result path is a specific input error',async()=>{await assert.rejects(get('/result/%E0%A4'),e=>e.status===400&&e.code==='INVALID_INPUT');});
test('unstarted recovery reuses the original start only after verifying the owner',async()=>{
 state.doc=null;state.identity={...auth,active:true,encryptedKey:'opaque'};state.row.input={idempotencyKey:row.requestId};state.lastPath='';const now=Date.now();const outcomes=await api.bootstrapNativeNewYearOrders({TOSS_RELEASE_READY:'true'},{now,deadline:now+120000});assert.equal(state.lastPath,'/api/new-year-ai/start');assert.equal(outcomes[0].status,404);
});
