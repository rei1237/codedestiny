import '../../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {grantNativeOrder} from '../../../worker/toss/native-consultation.js';

const id='a'.repeat(64), auth={_id:'identity',userId:'owner',ownerId:'owner',environment:'SANDBOX'};
const featureKey='palm-reading-general';
const state=globalThis.__palmTest={calls:0};
const stubs={
 './models.js':`const s=globalThis.__palmTest;
 export const TossNativeConsultation={
  findOne:q=>({lean:async()=>q._id===s.row._id&&q.identityId===s.row.identityId&&q.environment===s.row.environment?s.row:null}),
  findOneAndUpdate:(_q,value)=>({lean:async()=>{if(s.lease)return null;s.lease=value.$set['input.lease'];return s.row;}}),
  updateOne:async(q,update)=>{if(update.$unset&&s.lease?.token===q['input.lease.token'])s.lease=null;if(update.$set)s.row.input.analysisSaved=true;}
 };`,
 '../lib/billing-feature-registry.js': 'export const getBillingFeaturePricing=()=>({pricing:{amountKRW:1}});',
 '../lib/palm-result-delivery.js': 'export const findNativePalmSnapshot=async()=>globalThis.__palmTest.saved;',
 './native-tea.js':`const s=globalThis.__palmTest;
 export const nativeOwnerFilter=(a,nativeService)=>({identityId:a._id,ownerId:a.ownerId,environment:a.environment,nativeService});
 export const prepareNativeConsultation=async(_e,a,input,_o,c,nativeService)=>{if(s.row&&s.row.inputHash!==c.inputHash)throw Error('REQUEST_INPUT_MISMATCH');s.row??={...c,...nativeOwnerFilter(a,nativeService),input,_id:'a'.repeat(64)};return {id:s.row._id,paid:false,sku:'offline'};};
 export const verifiedIntent=async(_e,_a,row)=>{if(!row||!row.orderId||s.refunded)throw Error('DENIED');};`,
 '../routes/palm.js':`const s=globalThis.__palmTest;
 export const readPalmJson=r=>r.json();
 export async function handlePalmRoutes(_r,_e,native){s.calls++;s.enter();await s.pause;s.saved={requestId:native.body.requestId,analysisSaved:true,validation:{hasPalm:true},interpretation:{consultText:'[test]'}};return Response.json({analysisSaved:true});}`,
};
const bundle=await build({entryPoints:[fileURLToPath(new URL('../../../worker/toss/native-palm.js',import.meta.url))],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'offline',setup(b){
 b.onResolve({filter:/.*/},arg=>Object.hasOwn(stubs,arg.path)?{path:arg.path,namespace:'stub'}:null);
 b.onLoad({filter:/.*/,namespace:'stub'},arg=>({contents:stubs[arg.path]}));
}}]});
const {prepareNativePalm,readNativePalm,palmLibraryItem}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
test('original photo analysis executes once, survives a lost response, and only a matching paid account can open it',async()=>{
 const reading={rightPalmImage:'data:image/png;base64,dGVzdA==',dominantHand:'right',analysisPurpose:'general'};
 const request=(body=reading)=>new Request('https://local.invalid/palm',{method:'POST',body:JSON.stringify({input:{requestId:'palm-00000000-0000-4000-8000-000000000000',reading:body}})});
 let resume;state.pause=new Promise(resolve=>{resume=resolve;});
 const started=new Promise(resolve=>{state.enter=resolve;});
 const first=prepareNativePalm(request(),{},auth);await started;
 await assert.rejects(prepareNativePalm(request(),{},auth),e=>e.code==='PALM_ANALYSIS_IN_PROGRESS');
 resume();assert.deepEqual(await (await first).json(),{id,paid:false,sku:'offline'});
 assert.equal((await prepareNativePalm(request(),{},auth)).status,200);assert.equal(state.calls,1);
 assert.deepEqual(state.row.input,{dominantHand:'right',analysisPurpose:'general',analysisSaved:true});
 await assert.rejects(prepareNativePalm(request({...reading,dominantHand:'left'}),{},auth),/REQUEST_INPUT_MISMATCH/);
 await assert.rejects(readNativePalm({},auth,id),/DENIED/);
 state.row.orderId='order';const purchase={...state.row,_id:'order',requestId:id,featureKey};
 assert.deepEqual((await readNativePalm({},auth,id)).interpretation,{consultText:'[test]'});
 assert.equal((await palmLibraryItem({},auth,purchase)).state,'COMPLETED');
 await assert.rejects(readNativePalm({},{...auth,_id:'other'},id),/DENIED/);
 state.refunded=true;await assert.rejects(readNativePalm({},auth,id),/DENIED/);assert.equal(state.calls,1);
});
test('a paid SKU cannot attach to a palm intent until the original result has been saved',async()=>{
 const product={nativeService:'palm',featureKey,sku:'mock-palm',approvedPriceKRW:1};
 const row={...auth,...product,identityId:auth._id,status:'prepared',input:{}};
 const store={transaction:fn=>fn({assertIdentity:()=>{},purchase:()=>null,insertPurchase:()=>{},nativeIntent:()=>row})};
 await assert.rejects(grantNativeOrder({store,auth,product,requestId:id,order:{orderId:'order',sku:product.sku,status:'PURCHASED'}}),e=>e.code==='PALM_ANALYSIS_INCOMPLETE');
});
