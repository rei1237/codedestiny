import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';

const require=createRequire(import.meta.url),Module=require('node:module');
const root=path.resolve(import.meta.dirname,'../../..'),id='a'.repeat(64),inputHash='b'.repeat(64),orderId='01900000-1111-7111-8111-000000000042';
const auth={_id:'identity',ownerId:'owner',userId:'owner',environment:'SANDBOX',revision:1,userKey:'123'};
const input={idempotencyKey:'rbt-original-request',targetInfo:{gender:'female',birthDate:'1990-01-01',birthTime:'12:00',birthTimeUnknown:false,calendarType:'solar',isLeapMonth:false}};
const row={_id:id,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,nativeService:'relationship',requestId:input.idempotencyKey,inputHash,featureKey:'relationship-boundary-test',status:'paid',orderId,input};
const doc={id:'rbt_saved-result',userId:'owner',idempotencyKey:row.requestId,inputHash,paymentId:orderId,accessType:'toss',status:'partial'};
const state={row,doc:null,identity:true,verified:0,lookups:[],forwarded:[],updates:[],denied:null};
const match=(value,filter)=>Object.entries(filter).every(([key,expected])=>value?.[key]===expected);
const query=value=>({lean:async()=>value,sort(){return this;},limit(){return this;}});
state.models={
 TossNativeConsultation:{findOne:filter=>query(state.row&&match(state.row,filter)?state.row:null),find:()=>query(state.row?[state.row]:[]),updateOne:async(...args)=>{state.updates.push(args);return {modifiedCount:1};}},
 TossIdentity:{findOne:()=>query(state.identity?{...auth,encryptedKey:'fixture'}:null)},
};
globalThis.__relationshipBoundary=state;
const stubs={
 'worker/lib/db.js':'export const withMongoRetry=async(_env,fn)=>fn();',
 'worker/lib/relationship-report-delivery.js':'export const RELATIONSHIP_PART_IDS=Array.from({length:11},(_,i)=>String(i));',
 'worker/toss/models.js':'export const {TossNativeConsultation,TossIdentity}=globalThis.__relationshipBoundary.models;',
 'worker/toss/crypto.js':'export const unseal=async()=>"123";',
 'worker/toss/native-consultation.js':`import {TossError} from './policy.js';export function assertNativeIntent(row,auth){if(!row||row.identityId!==auth._id||row.ownerId!==auth.ownerId||row.environment!==auth.environment)throw new TossError('RESULT_NOT_FOUND',404);return row;}`,
 'worker/toss/native-tea.js':`import {TossError} from './policy.js';import {assertNativeIntent} from './native-consultation.js';const s=globalThis.__relationshipBoundary;
  export const nativeIntentId=async()=>s.row._id,nativeOwnerFilter=(auth,service)=>({identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,nativeService:service});
  export const prepareNativeConsultation=async(_env,auth,input,orderId,contract,service)=>({auth,input,orderId,contract,service});
  export async function verifiedIntent(_env,auth,row){assertNativeIntent(row,auth);s.verified++;if(s.denied)throw new TossError(s.denied.code,s.denied.status);if(row.status!=='paid'||!row.orderId)throw new TossError('PAYMENT_REQUIRED',402);return row;}`,
 'worker/routes/relationship-boundary-test.js':`import {nativeTossContext} from '../toss/native-context.js';const s=globalThis.__relationshipBoundary;
  export const nativeRelationshipContract=input=>({requestId:input.idempotencyKey,resultId:'rbt_intent',featureKey:'relationship-boundary-test',inputHash:s.row.inputHash,pricing:{amountKRW:1}});
  export const nativeRelationshipStoredState=async(_env,user,value,by='id')=>{s.lookups.push({user,value,by});const d=s.doc;return d&&d.userId===user&&(by==='request'?d.idempotencyKey===value:d.id===value)?d:null;};
  export async function handleRelationshipBoundaryTestRoutes(request){const ctx=nativeTossContext(request);if(!ctx||request.headers.has('Cookie')||request.headers.has('Authorization'))throw Error('BOUNDARY_FAILED');
   const url=new URL(request.url),body=request.method==='POST'?await request.json():null;s.forwarded.push({url:url.pathname+url.search,body});
   if(body){const active=await ctx.access(s.row.requestId,{inputHash:s.row.inputHash});if(!active.proven)throw Error('NO_ACCESS');s.doc={id:'rbt_saved-result',userId:ctx.auth.userId,idempotencyKey:s.row.requestId,inputHash:s.row.inputHash,paymentId:s.row.orderId,accessType:'toss',status:'partial'};return Response.json({ok:true,sessionId:s.doc.id,status:'partial'},{status:202});}
   return s.doc?Response.json({ok:true,sessionId:s.doc.id,status:s.doc.status}):Response.json({reason:'RESULT_NOT_FOUND'},{status:404});}`,
};
const bundle=await build({entryPoints:[path.join(root,'worker/toss/native-relationship.js')],bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'offline-boundaries',setup(b){b.onLoad({filter:/\.(js|ts)$/},args=>{const contents=stubs[path.relative(root,args.path).replaceAll('\\','/')];if(contents)return {contents,loader:'js'};});}}]});
const loaded=new Module(path.join(root,'native-relationship-test.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(bundle.outputFiles[0].text,loaded.id);const api=loaded.exports;
function call(suffix,body,who=auth){return api.handleNativeRelationship(new Request('https://example.invalid'+suffix,{method:body?'POST':'GET',headers:{Cookie:'must-not-forward',Authorization:'must-not-forward'},...(body?{body:JSON.stringify(body)}:{})}),{},who,suffix.split('?')[0]);}

test('a paid intent with no checkpoint resumes its immutable input without another purchase',async()=>{
 state.doc=null;state.denied=null;state.forwarded=[];
 const pending=await call('/result?sessionId=toss_'+id);assert.equal(pending.status,202);const progress=await pending.json();assert.equal(progress.resumeBody.resumeSessionId,'toss_'+id);assert.equal(progress.totalParts,11);assert.equal(progress.character,undefined);
 const generated=await call('/generate',{resumeSessionId:'toss_'+id});assert.equal(generated.status,202);assert.deepEqual(state.forwarded.at(-1).body,input);assert.equal((await generated.json()).sessionId,'rbt_saved-result');
 const reread=await call('/result?sessionId=toss_'+id);assert.equal(reread.status,200);assert.equal(state.forwarded.at(-1).url,'/api/relationship-boundary-test/result?sessionId=rbt_saved-result');
 const library=await api.nativeRelationshipLibraryItem({},auth,{_id:orderId,requestId:id});assert.equal(library.href,'/relationship-boundary-test/?sessionId=rbt_saved-result');
});

test('revoked, wrong-owner or mismatched results never expose or resume paid input',async()=>{
 state.doc={...doc};state.denied={status:403,code:'ACCESS_DENIED'};
 await assert.rejects(call('/result?sessionId=toss_'+id),error=>error.status===403&&error.code==='ACCESS_DENIED');
 state.denied=null;await assert.rejects(call('/result?sessionId=toss_'+id,undefined,{...auth,ownerId:'other'}),error=>error.status===404);
 state.doc={...doc,inputHash:'other'};await assert.rejects(call('/result?sessionId=toss_'+id),error=>error.status===404);
 state.doc=null;assert.equal((await api.nativeRelationshipLibraryItem({},auth,{_id:orderId,requestId:null})).state,'UNASSIGNED');
});

test('server recovery requires release, active identity and the original paid order',async()=>{
 const request=()=>new Request('https://internal.invalid/',{method:'POST',body:'{}'});
 await assert.rejects(api.bindNativeRelationshipRecovery(request(),{},doc),error=>error.code==='TOSS_RELEASE_PENDING');
 state.identity=false;await assert.rejects(api.bindNativeRelationshipRecovery(request(),{TOSS_RELEASE_READY:'true'},doc),error=>error.code==='SESSION_EXPIRED');
 state.identity=true;state.denied=null;const bound=request();assert.equal(await api.bindNativeRelationshipRecovery(bound,{TOSS_RELEASE_READY:'true'},doc),true);
 state.denied={status:409,code:'ORDER_REFUNDED'};await assert.rejects(api.bindNativeRelationshipRecovery(request(),{TOSS_RELEASE_READY:'true'},doc),error=>error.code==='ORDER_REFUNDED');state.denied=null;
});

test('scheduled recovery starts only a verified original paid input and preserves its checkpoint',async()=>{
 state.doc=null;state.identity=true;state.denied=null;state.updates=[];state.forwarded=[];const now=Date.now();
 assert.deepEqual(await api.bootstrapNativeRelationshipOrders({}, {now,deadline:now+120000}),[]);assert.equal(state.forwarded.length,0);
 const outcomes=await api.bootstrapNativeRelationshipOrders({TOSS_RELEASE_READY:'true'},{now,deadline:now+120000});
 assert.deepEqual(outcomes,[{service:'relationship-boundary-test',status:202}]);assert.deepEqual(state.forwarded.at(-1).body,input);assert.ok(state.doc);assert.equal(state.updates.length,1);
 assert.deepEqual(await api.bootstrapNativeRelationshipOrders({TOSS_RELEASE_READY:'true'},{now,deadline:now+120000}),[]);assert.equal(state.updates.length,2);assert.equal(state.forwarded.length,1);
});
