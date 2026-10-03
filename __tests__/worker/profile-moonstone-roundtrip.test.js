/** @jest-environment node */
import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { makeFakePaymentDb, matches } from '../fixtures/fake-payment-db.mjs';
const UID='507f1f77bcf86cd799439011', PID='yn_test';
const models={}, collections={};
function query(run){const q={select:()=>q,sort:()=>q,limit:()=>q,lean:async()=>run()};return q;}
for(const name of ['User','ProfileCard','PointHistory','MonthlyCreditLedger','Payment']){
 const model={modelName:name};models[name]=model;
 model.find=f=>query(()=>collections[name].rows.filter(r=>matches(r,f)));
 model.findOne=f=>query(()=>collections[name].rows.find(r=>matches(r,f))||null);
 model.findById=id=>model.findOne({_id:id});
 model.countDocuments=async f=>collections[name].rows.filter(r=>matches(r,f)).length;
 model.updateOne=(f,u)=>collections[name].updateOne(model,f,u);
 model.findOneAndUpdate=(f,u,o)=>query(()=>collections[name].findOneAndUpdate(model,f,u,o));
 model.findOneAndDelete=f=>query(async()=>{const row=await collections[name].findOne(model,f);await collections[name].deleteOne(model,f);return row;});
 model.create=async row=>{if(name==='ProfileCard'&&collections[name].rows.some(r=>r.userId===row.userId&&r.profileId===row.profileId))throw Object.assign(new Error('duplicate'),{code:11000});await collections[name].insertOne(model,row);return row;};
}
const consumeLots=jest.fn(async()=>({ok:true,balance:1500}));
const restoreLots=jest.fn(async()=>({profileSubscription:{membershipCreditBalance:2000}}));
let handleProfileRoutes,spendMoonstone,refundProfileMoonstone;
beforeAll(async()=>{
 await jest.unstable_mockModule('../../worker/lib/models.js',()=>models);
 await jest.unstable_mockModule('../../worker/lib/db.js',()=>({connectDb:async()=>{},isTransientMongoError:()=>false,withMongoRetry:async(_e,op)=>op(),mongoose,connectPaymentDb:async()=>{},resetPaymentConnection:()=>{},mongoTransactionOptions:()=>({})}));
 await jest.unstable_mockModule('../../worker/lib/auth.js',()=>({requireUserFromRequest:async()=>({userId:UID}),isAuthDbInfraError:()=>false}));
 await jest.unstable_mockModule('../../worker/lib/monthly-credit-store.js',()=>({consumeMonthlyCreditLotsWithDb:consumeLots,restoreMonthlyCreditLot:restoreLots,restoreMonthlyCreditLotWithDb:(db,input)=>restoreLots({...input,db})}));
 await jest.unstable_mockModule('../../worker/lib/security/index.js',()=>({enforceSensitiveEndpointSecurity:async()=>({ok:true})}));
 await jest.unstable_mockModule('../../worker/lib/access-state.js',()=>({invalidateAccessStateCacheForUser:()=>{}}));
 ({spendMoonstone}=await import('../../worker/payments/moonstone.js'));
 ({handleProfileRoutes}=await import('../../worker/routes/profile.js'));
 ({refundProfileMoonstone}=await import('../../worker/lib/profile-moonstone-mutation.js'));
});
beforeEach(()=>{
 jest.clearAllMocks();for(const key of Object.keys(models))collections[key]=makeFakePaymentDb({uniqueKeys:key==='MonthlyCreditLedger'?[['userId','type','sourceId']]:[]});
 collections.User.rows.push({_id:UID,points:0,profileSubscription:{tier:'free'},destinyProfilesCurrentId:PID});
 collections.ProfileCard.rows.push({userId:UID,profileId:PID,name:'테스트',gender:'F',birth:{year:1988,month:1,day:7,hour:23,minute:26,timeUnknown:false,calType:'solar'},location:{tz:'Asia/Seoul',lng:126.7,lat:37.45}});
 consumeLots.mockResolvedValue({ok:true,balance:1500});
});
function request(action,id=PID,requestId=`profile-card:${action}:${id}:one`){return new Request('https://example.com/api/profile'+(action==='create'?'':'/'+id),{method:action==='delete'?'DELETE':action==='update'?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId,paymentMode:'MOONLIGHT_STONE',profile:{...collections.ProfileCard.rows[0],profileId:id}})});}
async function pay(action,id=PID,requestId=`profile-card:${action}:${id}:one`){return spendMoonstone(collections.MonthlyCreditLedger,{userId:UID,product:{productId:'profile-card-manage',featureKey:'profile-card-manage',monthlyCost:500,priceCoins:50},purchaseId:requestId,profileId:id,profileAction:action},{consumeLots});}

test('V2 ledger-only payment deletes the card and replay never charges again',async()=>{
 await pay('delete');expect(collections.PointHistory.rows).toHaveLength(0);
 const res=await handleProfileRoutes(request('delete'),{});expect(res.status).toBe(200);
 expect(collections.ProfileCard.rows).toHaveLength(0);expect(collections.MonthlyCreditLedger.rows[0].metadata.profileMutationCompleted).toBe(true);
 expect((await handleProfileRoutes(request('delete'),{})).status).toBe(200);
 expect(consumeLots).toHaveBeenCalledTimes(1);
});
test('paid addition works for free users past their included slot and replays',async()=>{
 await pay('create','new');let response=await handleProfileRoutes(request('create','new'),{});
 expect(response.status).toBe(201);expect(collections.ProfileCard.rows).toHaveLength(2);
 response=await handleProfileRoutes(request('create','new'),{});expect(response.status).toBe(200);
 expect(collections.ProfileCard.rows).toHaveLength(2);expect(consumeLots).toHaveBeenCalledTimes(1);
});
test('legacy V2 rows require exact action, profile and request identity',async()=>{
 await pay('delete');delete collections.MonthlyCreditLedger.rows[0].metadata.profileAction;
 expect((await handleProfileRoutes(request('update'),{})).status).toBe(402);
 expect((await handleProfileRoutes(request('delete',PID,'different'),{})).status).toBe(402);
 expect((await handleProfileRoutes(request('delete'),{})).status).toBe(200);
});
test.each(['owner','profile','amount','refund'])('rejects invalid %s proof without deleting',async fault=>{
 await pay('delete');const row=collections.MonthlyCreditLedger.rows[0];
 if(fault==='owner')row.userId='507f1f77bcf86cd799439012';if(fault==='profile')row.profileId='another';if(fault==='amount')row.amount=1;if(fault==='refund')row.metadata.refundedForServiceExecution=true;
 expect((await handleProfileRoutes(request('delete'),{})).status).toBe(402);expect(collections.ProfileCard.rows).toHaveLength(1);
});
test('insufficient balance creates no spend and no usable proof',async()=>{
 consumeLots.mockResolvedValueOnce({ok:false,reason:'INSUFFICIENT',balance:0});await expect(pay('delete')).rejects.toThrow();
 expect((await handleProfileRoutes(request('delete'),{})).status).toBe(402);expect(collections.ProfileCard.rows).toHaveLength(1);
});
test('uncertain delete finalization completes from the original claim without another charge',async()=>{
 await pay('delete');const row=collections.MonthlyCreditLedger.rows[0];Object.assign(row.metadata,{profileMutationInProgress:true,profilePaymentKey:row.sourceId});collections.ProfileCard.rows.length=0;
 expect((await handleProfileRoutes(request('delete'),{})).status).toBe(200);expect(row.metadata.profileMutationCompleted).toBe(true);expect(consumeLots).toHaveBeenCalledTimes(1);
});
test('concurrent operation cannot take a live claim',async()=>{
 await pay('delete');const row=collections.MonthlyCreditLedger.rows[0];Object.assign(row.metadata,{profileMutationInProgress:true,profileMutationInProgressAt:new Date(),profilePaymentKey:row.sourceId});
 expect((await handleProfileRoutes(request('delete'),{})).status).toBe(409);expect(collections.ProfileCard.rows).toHaveLength(1);
});
test('refund uses one lot, revokes the spend and cannot restore twice',async()=>{
 await pay('delete');const row=collections.MonthlyCreditLedger.rows[0];
 expect(await refundProfileMoonstone(row,UID,'failed delete')).toBe(true);expect(await refundProfileMoonstone(row,UID,'failed delete')).toBe(false);
 expect(restoreLots).toHaveBeenCalledTimes(1);expect(restoreLots).toHaveBeenCalledWith(expect.objectContaining({lotId:`profile-mutation-refund:${row._id}`,amount:500}));
 expect((await handleProfileRoutes(request('delete'),{})).status).toBe(402);
});


test('unknown to explicit midnight and noon persists through paid update and reread',async()=>{
 for(const hour of [0,12,23]) {
  collections.ProfileCard.rows[0].birth={year:1988,month:1,day:7,hour:null,minute:null,timeUnknown:true};
  const requestId=`profile-card:update:${PID}:hour${hour}`;await pay('update',PID,requestId);
  const req=new Request('https://example.com/api/profile/'+PID,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId,profile:{timeUnknown:true,birthTimeUnknown:true,birth:{hour,minute:26,timeUnknown:false}}})});
  expect((await handleProfileRoutes(req,{})).status).toBe(200);
  expect(collections.ProfileCard.rows[0].birth).toMatchObject({hour,minute:26,timeUnknown:false});
 }
});

test('uncertain create receipt recovers existing card and completes its original spend',async()=>{
 await pay('create','new');const row=collections.MonthlyCreditLedger.rows[0];Object.assign(row.metadata,{profileMutationInProgress:true,profilePaymentKey:row.sourceId});
 collections.ProfileCard.rows.push({...collections.ProfileCard.rows[0],profileId:'new'});
 expect((await handleProfileRoutes(request('create','new'),{})).status).toBe(200);
 expect(collections.ProfileCard.rows).toHaveLength(2);expect(row.metadata.profileMutationCompleted).toBe(true);expect(consumeLots).toHaveBeenCalledTimes(1);
});

test('invalid action is rejected before charging',async()=>{
 await expect(pay('constructor')).rejects.toMatchObject({code:'INVALID_REQUEST'});expect(consumeLots).not.toHaveBeenCalled();
});

test('completed creation proof cannot recreate a subsequently deleted card',async()=>{
 await pay('create','new');expect((await handleProfileRoutes(request('create','new'),{})).status).toBe(201);
 collections.ProfileCard.rows.splice(1,1);
 expect((await handleProfileRoutes(request('create','new'),{})).status).toBe(409);expect(collections.ProfileCard.rows).toHaveLength(1);expect(consumeLots).toHaveBeenCalledTimes(1);
});

test('request ID alone cannot authorize an unpaid profile mutation',async()=>{
 const req=new Request('https://example.com/api/profile/'+PID,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:`profile-card:delete:${PID}:unpaid`})});
 expect((await handleProfileRoutes(req,{})).status).toBe(402);
 expect(collections.ProfileCard.rows).toHaveLength(1);expect(consumeLots).not.toHaveBeenCalled();
});
