import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'../../..');
const Module=createRequire(import.meta.url)('node:module');
const auth={_id:'identity',ownerId:'owner',userId:'owner',environment:'SANDBOX'};
const state={row:null,doc:null,identity:null,verified:0};globalThis.__bookRecovery=state;
const stubs={
 'worker/toss/models.js':`const s=globalThis.__bookRecovery;export const TossIdentity={findOne:q=>({lean:async()=>s.identity&&Object.entries(q).every(([k,v])=>s.identity[k]===v)?s.identity:null})};export const TossNativeConsultation={findOne:q=>({lean:async()=>s.row&&Object.entries(q).every(([k,v])=>s.row[k]===v)?s.row:null})};`,
 'worker/toss/native-tea.js':`const s=globalThis.__bookRecovery;export const nativeOwnerFilter=(a,service)=>({identityId:a._id,ownerId:a.ownerId,environment:a.environment,nativeService:service});export const nativeIntentId=()=>{};export const prepareNativeConsultation=()=>{};export const verifiedIntent=async(_e,_a,row)=>{s.verified++;if(!row)throw Error('RESULT_NOT_FOUND');if(row.status==='refunded')throw Error('ORDER_REFUNDED');return row};`,
 'worker/toss/native-consultation.js':`export const assertNativeIntent=()=>{};`,
 'worker/toss/crypto.js':`export const unseal=()=>{};`,
 'worker/lib/db.js':`export const withMongoRetry=()=>{};`,
 'worker/routes/life-book-ai.js':`export const nativeLifeBookContract=()=>{};export const nativeLifeBookStoredState=async()=>globalThis.__bookRecovery.doc;export const handleLifeBookAiRoutes=()=>{};`,
 'worker/routes/love-secret-ai.js':`export const nativeLoveSecretContract=()=>{};export const nativeLoveSecretStoredState=async()=>globalThis.__bookRecovery.doc;export const handleLoveSecretAiRoutes=()=>{};`,
};
const bundle=await build({stdin:{contents:"export * from './worker/toss/native-life-book.js';export * from './worker/toss/native-love-secret.js';",resolveDir:root},bundle:true,platform:'node',format:'cjs',write:false,plugins:[{name:'offline',setup(b){b.onLoad({filter:/\.js$/},args=>{const contents=stubs[path.relative(root,args.path).replaceAll('\\','/')];if(contents)return {contents,loader:'js'};});}}]});
const loaded=new Module(path.join(root,'book-recovery-test.cjs'));loaded._compile(bundle.outputFiles[0].text,loaded.id);

for(const service of ['life-book','love-secret'])test(`${service} recovery uses only its owner-bound verified purchase and saved result`,async()=>{
 const id='a'.repeat(64),featureKey=service==='life-book'?'life-book-ai-consultation':'love-secret-ai-consultation';
 state.row={_id:id,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,nativeService:service,orderId:'order',requestId:'request',featureKey,inputHash:'hash',status:'paid',input:{topic:'질문'}};
 state.doc=null;state.verified=0;
 const read=service==='life-book'?loaded.exports.nativeLifeBookLibraryItem:loaded.exports.nativeLoveSecretLibraryItem;
 const purchase={_id:'order',requestId:id};
 const pending=await read({},auth,purchase);
 assert.equal(pending.state,'PENDING');assert.match(pending.href,new RegExp(`^/${service==='life-book'?'life-book-ai':'love-secret-ai'}/result/`));assert.match(pending.href,new RegExp('toss_'+id));
 state.doc={id:'saved',userId:'owner',idempotencyKey:'request',inputHash:'hash',paymentId:'order',featureKey,status:'completed'};
 const complete=await read({},auth,purchase);assert.equal(complete.state,'COMPLETED');assert.match(complete.href,/attemptId=saved/);
 await assert.rejects(read({}, {...auth,ownerId:'other',userId:'other'},purchase),/RESULT_NOT_FOUND/);
 state.row.status='refunded';await assert.rejects(read({},auth,purchase),/ORDER_REFUNDED/);
 assert.ok(state.verified>=3);
});

test('love-secret recovery never falls back to web for a Toss owner with a missing order binding',async()=>{
 state.row=null;state.identity={ownerId:'owner',active:false};
 const request=new Request('https://internal.invalid');
 const doc={userId:'owner',idempotencyKey:'request'};
 await assert.rejects(loaded.exports.bindNativeLoveSecretRecovery(request,{},doc),/RESULT_NOT_FOUND/);
 state.identity=null;
 assert.equal(await loaded.exports.bindNativeLoveSecretRecovery(request,{},doc),false);
});
