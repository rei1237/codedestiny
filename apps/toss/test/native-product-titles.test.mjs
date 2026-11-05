import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';import {createRequire} from 'node:module';import path from 'node:path';import assert from 'node:assert/strict';
const require=createRequire(new URL('../package.json',import.meta.url)),Module=require('node:module'),{build}=require('esbuild');
globalThis.__titles={products:[],rows:[]};
const bundle=await build({entryPoints:[path.resolve(import.meta.dirname,'../../../worker/toss/native-tea.js')],bundle:true,write:false,format:'cjs',platform:'node',plugins:[{name:'offline',setup(b){b.onResolve({filter:/.*/},a=>a.kind==='entry-point'?null:{path:a.path,namespace:'mock'});b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:`export const assertUniqueApprovedSaleSkus=()=>{};export const APPROVED_TOSS_NATIVE_PRODUCTS=globalThis.__titles.products,nativeProduct=x=>x,getBillingFeaturePricing=()=>({pricing:{}}),withMongoRetry=()=>{},TossNativeConsultation={find:()=>({sort:()=>({limit:()=>({lean:async()=>globalThis.__titles.rows})})})},TossPurchase={findOne:({_id})=>({lean:async()=>({_id,status:'PURCHASED'})})},TossIdentity={},hash=()=>{},unseal=()=>{},TossError=Error,lookupOrder=()=>{},recordTossRefund=()=>{},purchaseStore=()=>{},assertNativeIntent=()=>{},retainedNativeProduct=()=>{},grantNativeOrder=()=>{},bindNativeTossRequest=()=>{},nativeTeaContract=()=>{},nativeTeaStoredState=()=>{},handleFortuneTeaHouseRoutes=()=>{},nativeLifeBookLibraryItem=async()=>({state:'COMPLETED',href:'/result/',question:''});`}));}}]});
const loaded=new Module(path.resolve(import.meta.dirname,'native-titles-test.cjs'));loaded._compile(bundle.outputFiles[0].text,loaded.id);
test('approved catalog preserves the distinct life book and life fortune product names',()=>{
 globalThis.__titles.products.push({sku:'book',productId:'book',featureKey:'life-book-ai-consultation',nativeService:'life-book',approvedPriceKRW:100},{sku:'fortune',productId:'fortune',featureKey:'life-fortune-ai-consultation',nativeService:'life-book',approvedPriceKRW:200});
 assert.deepEqual(loaded.exports.nativeTeaCatalog().map(({name})=>name),['인생의 책','인생 총운']);
});
test('native records display each original life consultation name',async()=>{
 globalThis.__titles.rows=[{_id:'b',orderId:'book',resultId:'b',nativeService:'life-book',featureKey:'life-book-ai-consultation',createdAt:new Date(),input:{}},{_id:'f',orderId:'fortune',resultId:'f',nativeService:'life-book',featureKey:'life-fortune-ai-consultation',createdAt:new Date(),input:{}}];
 const result=await loaded.exports.nativeTeaRecords({}, {_id:'owner',ownerId:'owner',environment:'SANDBOX'},new URLSearchParams());assert.deepEqual(result.items.map(x=>x.serviceName),['인생의 책','인생 총운']);assert.deepEqual(result.items.map(x=>x.title),['인생의 책','인생 총운']);
});
