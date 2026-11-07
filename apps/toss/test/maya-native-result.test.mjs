import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';

const require=createRequire(new URL('../package.json',import.meta.url)),Module=require('node:module');
const root=path.resolve(import.meta.dirname,'../../..');
const state={row:null,checks:0,writes:0,denyAt:0,failAfterWrite:false};
globalThis.__mayaOffline=state;
const bundle=await build({entryPoints:[path.join(root,'worker/toss/native-maya.js')],bundle:true,platform:'node',format:'cjs',write:false,alias:{'@':root},plugins:[{name:'memory-boundaries',setup(b){
 b.onLoad({filter:/worker[\\/]toss[\\/]models\.js$/},()=>({contents:`export const TossNativeConsultation={findOne:filter=>({lean:async()=>globalThis.__mayaOffline.find(filter)}),findOneAndUpdate:(filter,update)=>({lean:async()=>globalThis.__mayaOffline.update(filter,update)})};`,loader:'js'}));
 b.onLoad({filter:/worker[\\/]toss[\\/]native-tea\.js$/},()=>({contents:`export const nativeOwnerFilter=(a,s)=>({identityId:a._id,ownerId:a.ownerId,environment:a.environment,nativeService:s});export const prepareNativeConsultation=(...args)=>globalThis.__mayaOffline.prepare(...args);export const verifiedIntent=(...args)=>globalThis.__mayaOffline.verify(...args);`,loader:'js'}));
}}]});
const loaded=new Module(path.join(root,'maya-result-fixture.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(bundle.outputFiles[0].text,loaded.id);
const {prepareNativeMaya,readNativeMaya,nativeMayaLibraryItem}=loaded.exports;
const contractBundle=await build({entryPoints:[path.join(root,'worker/toss/maya-contract.js')],bundle:true,platform:'node',format:'cjs',write:false,alias:{'@':root}});
const contractModule=new Module(path.join(root,'maya-result-contract-fixture.cjs'));contractModule.paths=loaded.paths;contractModule._compile(contractBundle.outputFiles[0].text,contractModule.id);
const {mayaContract}=contractModule.exports;
const auth={_id:'identity',ownerId:'owner',environment:'SANDBOX'},id='a'.repeat(64),orderId='order';
const input={requestId:'eafba72c-d2fe-4b76-bbc5-17fc7101ccfe',year:2024,month:2,day:29,name:'연이',birthDate:'1990-01-02',topic:'연애운',question:'관계를 어떻게 살펴볼까요?'};
const failure=(code,status)=>Object.assign(new Error(code),{code,status});
function matches(row,filter){return !!row&&Object.entries(filter).every(([key,value])=>value===null?row[key]==null:row[key]===value);}
state.find=filter=>matches(state.row,filter)?structuredClone(state.row):null;
state.update=(filter,update)=>{if(!matches(state.row,filter))return null;state.writes++;Object.assign(state.row,structuredClone(update.$set));if(state.failAfterWrite){state.failAfterWrite=false;throw failure('NETWORK',503);}return structuredClone(state.row);};
state.verify=async(_env,user,row)=>{state.checks++;if(state.denyAt===state.checks)throw failure('SESSION_EXPIRED',401);if(!row||row.identityId!==user._id||row.ownerId!==user.ownerId||row.environment!==user.environment)throw failure('RESULT_NOT_FOUND',404);if(row.status==='refunded')throw failure('ORDER_REFUNDED',409);if(row.status!=='paid'||!row.orderId)throw failure('PAYMENT_REQUIRED',402);};
state.prepare=async(...args)=>args;
async function reset(){const prepared=await mayaContract(input);state.row={...auth,_id:id,identityId:auth._id,...prepared.contract,input:prepared.input,nativeService:'maya',status:'paid',orderId,savedResult:null};state.checks=0;state.writes=0;state.denyAt=0;state.failAfterWrite=false;}

test('preparation passes only canonical input and server price to the native purchase boundary',async()=>{
 const args=await prepareNativeMaya({},auth,{...input,prompt:'forged',amountKRW:1},null);
 assert.deepEqual(args[2],input);assert.equal(args[4].featureKey,'maya-prompt-generator');assert.notEqual(args[4].pricing.amountKRW,1);assert.equal(args[5],'maya');
});
test('reading is side-effect free; explicit generation is durable and retry returns the same result',async()=>{
 await reset();const pending=await readNativeMaya({},auth,id);assert.equal(pending.state,'PENDING');assert.equal(state.writes,0);assert.equal(pending.prompt,undefined);
 const completed=await readNativeMaya({},auth,id,{generate:true});assert.equal(completed.state,'COMPLETED');assert.match(completed.prompt,/관계를 어떻게 살펴볼까요/);assert.equal(state.writes,1);
 const again=await readNativeMaya({},auth,id,{generate:true});assert.equal(again.prompt,completed.prompt);assert.equal(state.writes,1);
});
test('a lost response after persistence is recovered without writing another result',async()=>{
 await reset();state.failAfterWrite=true;await assert.rejects(readNativeMaya({},auth,id,{generate:true}),e=>e.code==='NETWORK');assert.equal(state.writes,1);
 const restored=await readNativeMaya({},auth,id,{generate:true});assert.equal(restored.state,'COMPLETED');assert.equal(state.writes,1);
});
test('unpaid, foreign, refunded and revoked sessions cannot retrieve a prompt',async()=>{
 await reset();state.row.status='prepared';await assert.rejects(readNativeMaya({},auth,id,{generate:true}),e=>e.code==='PAYMENT_REQUIRED');assert.equal(state.writes,0);
 await reset();await assert.rejects(readNativeMaya({}, {...auth,ownerId:'other'},id,{generate:true}),e=>e.code==='RESULT_NOT_FOUND');assert.equal(state.writes,0);
 await reset();state.row.status='refunded';await assert.rejects(readNativeMaya({},auth,id,{generate:true}),e=>e.code==='ORDER_REFUNDED');assert.equal(state.writes,0);
 await reset();state.denyAt=2;await assert.rejects(readNativeMaya({},auth,id,{generate:true}),e=>e.code==='SESSION_EXPIRED');assert.equal(state.writes,1);
});
test('tampered input and saved results fail closed and library links do not contain private input',async()=>{
 await reset();state.row.input.question='different';await assert.rejects(readNativeMaya({},auth,id,{generate:true}),e=>e.code==='REQUEST_INPUT_MISMATCH');assert.equal(state.writes,0);
 await reset();state.row.savedResult={version:'maya-prompt-v1',inputHash:'different',prompt:'forged'};await assert.rejects(readNativeMaya({},auth,id),e=>e.code==='RESULT_NOT_FOUND');
 await reset();const purchase={_id:orderId,identityId:auth._id,ownerId:auth.ownerId,environment:auth.environment,nativeService:'maya',status:'PURCHASED',requestId:id};
 const item=await nativeMayaLibraryItem({},auth,purchase);assert.equal(item.state,'PENDING');assert.equal(item.href,`/maya/?intentId=${id}`);assert.ok(!item.href.includes(input.question));
 await assert.rejects(nativeMayaLibraryItem({}, {...auth,ownerId:'other'},purchase),e=>e.code==='RESULT_NOT_FOUND');
 assert.equal((await nativeMayaLibraryItem({},auth,{...purchase,requestId:null})).state,'UNASSIGNED');
});
