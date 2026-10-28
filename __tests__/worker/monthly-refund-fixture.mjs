import { jest } from '@jest/globals';
import mongoose from 'mongoose';
export const uid='64b7f2a1c3d4e5f601234567',debit='64b7f2a1c3d4e5f6012345bb',execId='64b7f2a1c3d4e5f6012345aa';
const models={};for(const name of ['PointHistory','MonthlyCreditLedger','ServiceExecutionTransaction','PaidExecutionRecord','User','Payment'])models[name]={name};
jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,CONTENT_ENTITLEMENT_STATUSES:{REFUNDED:'refunded'}}));
jest.unstable_mockModule('../../worker/lib/db.js',()=>({mongoose,connectDb:jest.fn(),withMongoRetry:async(_e,fn)=>fn(),isTransientMongoError:()=>false}));
jest.unstable_mockModule('../../worker/lib/portone.js',()=>({cancelPortOnePayment:jest.fn(),fetchPortOnePayment:jest.fn()}));
jest.unstable_mockModule('../../worker/lib/content-unlocks.js',()=>({revokePaymentContentAccess:jest.fn()}));
const at=(o,k)=>k.split('.').reduce((v,p)=>v?.[p],o);
function match(o,q){return Object.entries(q).every(([k,v])=>{
 if(k==='$or')return v.some(x=>match(o,x)); if(k==='$and')return v.every(x=>match(o,x));
 const value=at(o,k);if(v&&typeof v==='object'&&!v._bsontype){if('$exists'in v && (value!==undefined)!==v.$exists)return false;if('$in'in v)return v.$in.map(String).includes(String(value));if('$ne'in v)return JSON.stringify(value)!==JSON.stringify(v.$ne);}
 return String(value)===String(v);
});}
function set(o,update){for(const [k,v]of Object.entries(update.$set||{})){const ps=k.split('.');let n=o;while(ps.length>1){const p=ps.shift();n=n[p]||(n[p]={});}n[ps[0]]=v;}}
export async function setup(legacy=false){
 const {runMonthlyCreditRefund}=await import('../../worker/lib/service-execution-task.js');
 const state={PointHistory:[],MonthlyCreditLedger:[],ServiceExecutionTransaction:[],PaidExecutionRecord:[],balance:10,restores:0};
 if(legacy)state.PointHistory.push({_id:debit,userId:uid,kind:'deduct',featureKey:'test-feature',metadata:{accessType:'membership_credit',membershipCreditCost:3,requestId:'synthetic-request'}});
 else state.MonthlyCreditLedger.push({_id:debit,userId:uid,type:'MONTHLY_CREDIT_SPEND',sourceId:'synthetic-request',amount:3,serviceKey:'test-feature',settledAt:'now',metadata:{}});
 let failure='',queue=Promise.resolve();
 const tx={
  findOne:async(model,q)=>state[model.name].find(row=>match(row,q))||null,
  updateOne:async(model,q,u)=>{const doc=await tx.findOne(model,q);if(!doc)return{modifiedCount:0};set(doc,u);return{modifiedCount:1};},
  insertOne:async(model,doc)=>{if(failure==='receipt')throw Error('receipt-write-failed');doc._id='receipt-'+state[model.name].length;state[model.name].push(doc);return{insertedId:doc._id};}
 };
 const deps={paymentDb:{createPaymentContext:x=>x},withDb:async(_env,_ctx,fn)=>fn({transaction:callback=>{
  const result=queue.then(async()=>{const saved=structuredClone(state);try{return await callback(tx);}catch(e){Object.assign(state,saved);throw e;}});queue=result.catch(()=>{});return result;
 }}),creditStore:{restoreMonthlyCreditLotWithDb:async(_tx,args)=>{state.balance+=args.amount;state.restores++;if(failure==='balance')throw Error('balance-response-lost');return{added:true,beforeBalance:state.balance-args.amount,afterBalance:state.balance};}},findEvidence:async(_env,{userId,featureKeys,tokens})=>{
  const row=state.MonthlyCreditLedger.find(r=>r.type==='MONTHLY_CREDIT_SPEND'&&String(r.userId)===String(userId)&&featureKeys.includes(r.serviceKey)&&tokens.some(t=>[String(r._id),r.sourceId].includes(String(t)))&&!r.metadata?.refundedForServiceExecution);
  return row?{ledgerId:row._id,sourceId:row.sourceId,amount:row.amount,serviceKey:row.serviceKey}:null;
 }};
 const input={env:{},userId:uid,featureKey:'test-feature',sourceTransactionId:'synthetic-request',executionId:execId,requestId:'synthetic-request',reason:'synthetic failure',execution:{featureKey:'test-feature',sourceTransactionId:'synthetic-request',metadata:{billing:{requestId:'synthetic-request'}}}};
 return{state,input,run:overrides=>runMonthlyCreditRefund({...input,...overrides},deps),fail:value=>{failure=value;},grants:()=>state.MonthlyCreditLedger.filter(r=>r.type==='MONTHLY_CREDIT_GRANT')};
}
