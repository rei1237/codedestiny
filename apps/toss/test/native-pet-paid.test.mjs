import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';

const require=createRequire(import.meta.url),Module=require('node:module'),root=path.resolve(import.meta.dirname,'../../..');
const id='a'.repeat(64),auth={_id:'identity',ownerId:'owner',userId:'owner',environment:'SANDBOX',revision:1,userKey:'123'};
const pet={name:'나비',species:'cat',breed:'generic',birthDate:'2020-01-01',birthTimeUnknown:true};
const input={requestId:'eafba72c-d2fe-4b76-bbc5-17fc7101ccfe',kind:'report',pet};
const state={row:null,doc:null,identity:true,denied:null,verified:0,generated:0,prepare:null,denyAfterGeneration:false};
const match=(row,filter)=>!!row&&Object.entries(filter).every(([key,value])=>String(row[key])===String(value));
const query=value=>({lean:async()=>structuredClone(value)});
state.models={TossNativeConsultation:{findOne:filter=>query(match(state.row,filter)?state.row:null)},
 TossIdentity:{findOne:filter=>query(state.identity&&filter._id===auth._id?{...auth,active:true,encryptedKey:'fixture'}:null)}};
globalThis.__petPaidBoundary=state;
const stubs={
 'worker/lib/db.js':'export const withMongoRetry=async(_env,fn)=>fn();',
 'worker/lib/models.js':`const s=globalThis.__petPaidBoundary;export const ServiceExecutionTransaction={findOne:filter=>({lean:async()=>s.doc&&Object.entries(filter).every(([key,value])=>String(s.doc[key])===String(value))?structuredClone(s.doc):null})};`,
 'worker/toss/models.js':'export const {TossNativeConsultation,TossIdentity}=globalThis.__petPaidBoundary.models;',
 'worker/toss/crypto.js':`import {createHash} from 'node:crypto';export const hash=async value=>createHash('sha256').update(value).digest('hex');export const unseal=async()=>"123";`,
 'worker/toss/native-tea.js':`import {TossError} from './policy.js';const s=globalThis.__petPaidBoundary;
  export const nativeIntentId=async()=> '${id}',nativeOwnerFilter=(a,service)=>({identityId:a._id,ownerId:a.ownerId,environment:a.environment,nativeService:service});
  export const prepareNativeConsultation=async(_env,auth,input,orderId,contract,service)=>{s.prepare={auth,input,orderId,contract,service};return s.prepare;};
  export async function verifiedIntent(_env,_auth,row){s.verified++;if(s.denied)throw new TossError(s.denied.code,s.denied.status);if(row.status!=='paid'||!row.orderId)throw new TossError('PAYMENT_REQUIRED',402);return row;}`,
 'worker/routes/pet-saju-ai.js':`export const petNarrativeAdapter=(_env,reportType)=>({reportType,render:()=>({})});export const seedPetNarrative=(kind,original)=>({kind,original});`,
 'worker/lib/paid-narrative-delivery.js':`const s=globalThis.__petPaidBoundary;export const paidNarrativeExecutionKey=(user,feature,requestId)=>'execution:'+user+':'+feature+':'+requestId;
  export async function runPaidNarrativeDelivery(request,_env,auth,body,options){const original=request.method==='POST'?body:s.doc.metadata.paidNarrative.body;
   await options.verify(original,s.doc);if(request.method==='POST'){s.generated++;s.doc={userId:auth.userId,featureKey:options.featureKey,reportType:options.reportType,executionKey:paidNarrativeExecutionKey(auth.userId,options.featureKey,original.requestId),metadata:{paidNarrative:{body:original}}};if(s.denyAfterGeneration)s.denied={code:'ORDER_REFUNDED',status:409};}
   await options.verify(original,s.doc);return Response.json({ok:true,saved:true});}`,
};
const bundle=await build({stdin:{contents:"export * from './worker/toss/native-pet-paid.js';export * from './worker/toss/pet-paid-contract.js';",resolveDir:root,loader:'js'},bundle:true,platform:'node',format:'cjs',write:false,alias:{'@':root},plugins:[{name:'offline-boundaries',setup(b){b.onLoad({filter:/\.(js|ts)$/},args=>{const contents=stubs[path.relative(root,args.path).replaceAll('\\','/')];if(contents)return {contents,loader:'js'};});}}]});
const loaded=new Module(path.join(root,'native-pet-paid-fixture.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(bundle.outputFiles[0].text,loaded.id);const api=loaded.exports;
const {tossPetPaidContract}=api;
async function reset(){const prepared=await tossPetPaidContract(input,{today:'2026-11-06'});state.row={_id:id,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,nativeService:'pet',...prepared.contract,input:prepared.input,status:'paid',orderId:'order'};state.doc=null;state.identity=true;state.denied=null;state.verified=0;state.generated=0;state.prepare=null;state.denyAfterGeneration=false;}

test('paid intent without checkpoint is recoverable and never generates on read',async()=>{
 await reset();const pending=await api.readNativePet({},auth,id);assert.equal(pending.status,202);assert.equal((await pending.json()).saved,false);assert.equal(state.generated,0);
 const generated=await api.readNativePet({},auth,id,{generate:true});assert.equal(generated.status,200);assert.equal(state.generated,1);assert.equal(state.doc.metadata.paidNarrative.body.tossIntentId,id);
 assert.equal((await api.readNativePet({},auth,id)).status,200);assert.equal(state.generated,1);assert.ok(state.verified>=4);
});

test('wrong owner, changed input and revoked orders never generate or disclose a result',async()=>{
 await reset();await assert.rejects(api.readNativePet({}, {...auth,ownerId:'other'},id,{generate:true}),error=>error.code==='RESULT_NOT_FOUND');assert.equal(state.generated,0);
 state.row.input.pet.name='다른 이름';await assert.rejects(api.readNativePet({},auth,id,{generate:true}),error=>error.code==='REQUEST_INPUT_MISMATCH');assert.equal(state.generated,0);
 await reset();state.denied={code:'ORDER_REFUNDED',status:409};await assert.rejects(api.readNativePet({},auth,id,{generate:true}),error=>error.code==='ORDER_REFUNDED');assert.equal(state.generated,0);
});

test('a refund during generation prevents delivery, and server recovery rechecks identity and order',async()=>{
 await reset();state.denyAfterGeneration=true;await assert.rejects(api.readNativePet({},auth,id,{generate:true}),error=>error.code==='ORDER_REFUNDED');assert.equal(state.generated,1);
 state.denied=null;state.denyAfterGeneration=false;await assert.rejects(api.verifyNativePetRecovery({},state.doc),error=>error.code==='TOSS_RELEASE_PENDING');
 state.identity=false;await assert.rejects(api.verifyNativePetRecovery({TOSS_RELEASE_READY:'true'},state.doc),error=>error.code==='SESSION_EXPIRED');
 state.identity=true;state.denied={code:'ORDER_REFUNDED',status:409};await assert.rejects(api.verifyNativePetRecovery({TOSS_RELEASE_READY:'true'},state.doc),error=>error.code==='ORDER_REFUNDED');
 state.denied=null;await api.verifyNativePetRecovery({TOSS_RELEASE_READY:'true'},state.doc);
});

test('a saved result with another intent or modified input cannot be reopened',async()=>{
 await reset();await api.readNativePet({},auth,id,{generate:true});state.doc.metadata.paidNarrative.body.tossIntentId='b'.repeat(64);
 await assert.rejects(api.readNativePet({},auth,id),error=>error.code==='RESULT_NOT_FOUND');
 state.doc.metadata.paidNarrative.body.tossIntentId=id;state.doc.metadata.paidNarrative.body.pet.name='수정된 이름';
 await assert.rejects(api.readNativePet({},auth,id),error=>error.code==='REQUEST_INPUT_MISMATCH');assert.equal(state.generated,1);
});

test('preparing the same request after midnight preserves the previously frozen date',async()=>{
 await reset();const result=await api.prepareNativePet({},auth,input);assert.equal(result.input.date,'2026-11-06');assert.equal(result.contract.inputHash,state.row.inputHash);assert.equal(result.service,'pet');
});
