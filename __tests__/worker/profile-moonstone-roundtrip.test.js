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
async function pay(action,id=PID,requestId=`profile-card:${action}:${id}:one`,price={monthlyCost:100,priceCoins:10}){return spendMoonstone(collections.MonthlyCreditLedger,{userId:UID,product:{productId:'profile-card-manage',featureKey:'profile-card-manage',...price},purchaseId:requestId,profileId:id,profileAction:action},{consumeLots});}

// 2026-10-11: 프로필 카드 추가·수정·삭제는 무료다. 라우트는 결제 증빙을 요구하지도, 월정석을 차감하지도 않는다.
function freeRequest(action,id=PID,extra={}){return new Request('https://example.com/api/profile'+(action==='create'?'':'/'+id),{method:action==='delete'?'DELETE':action==='update'?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:{...collections.ProfileCard.rows[0],profileId:id},...extra})});}
test('delete needs no payment proof and charges nothing',async()=>{
 const res=await handleProfileRoutes(freeRequest('delete'),{});expect(res.status).toBe(200);
 expect(collections.ProfileCard.rows).toHaveLength(0);expect(collections.MonthlyCreditLedger.rows).toHaveLength(0);expect(consumeLots).not.toHaveBeenCalled();
});
test('update needs no payment proof and charges nothing',async()=>{
 const res=await handleProfileRoutes(freeRequest('update',PID,{profile:{...collections.ProfileCard.rows[0],name:'바뀐 이름'}}),{});expect(res.status).toBe(200);
 expect(collections.ProfileCard.rows[0].name).toBe('바뀐 이름');expect(collections.MonthlyCreditLedger.rows).toHaveLength(0);expect(consumeLots).not.toHaveBeenCalled();
});
test('free users add further cards without payment, and a replay returns the same card',async()=>{
 let response=await handleProfileRoutes(freeRequest('create','new'),{});expect(response.status).toBe(201);
 response=await handleProfileRoutes(freeRequest('create','third'),{});expect(response.status).toBe(201);
 expect(collections.ProfileCard.rows).toHaveLength(3);
 response=await handleProfileRoutes(freeRequest('create','new'),{});expect(response.status).toBe(200);
 expect(collections.ProfileCard.rows).toHaveLength(3);expect(consumeLots).not.toHaveBeenCalled();
});
test('a moonstone mode request is still free and never charges at the route',async()=>{
 expect((await handleProfileRoutes(request('delete'),{})).status).toBe(200);
 expect(collections.ProfileCard.rows).toHaveLength(0);expect(consumeLots).not.toHaveBeenCalled();
});
// 정책 변경 전에 차감된 월정석 증빙이 남아 있어도 조작은 막히지 않고 다시 차감되지도 않는다.
test('a spend made before the policy change does not block the mutation or charge again',async()=>{
 await pay('delete');expect(consumeLots).toHaveBeenCalledTimes(1);
 expect((await handleProfileRoutes(request('delete'),{})).status).toBe(200);
 expect(collections.ProfileCard.rows).toHaveLength(0);expect(consumeLots).toHaveBeenCalledTimes(1);
});
test('legacy price constants stay available for matching pre-change evidence',async()=>{
 const {LEGACY_PROFILE_CARD_COSTS,PROFILE_CARD_DELETE_COST_MONTHLY_STONES}=await import('../../worker/lib/profile-card-mutation-policy.js');
 expect(PROFILE_CARD_DELETE_COST_MONTHLY_STONES).toBe(100);expect(LEGACY_PROFILE_CARD_COSTS).toEqual({coins:50,krw:5000,monthlyStones:500});
});
test('insufficient balance creates no spend',async()=>{
 consumeLots.mockResolvedValueOnce({ok:false,reason:'INSUFFICIENT',balance:0});await expect(pay('delete')).rejects.toThrow();
 expect(collections.MonthlyCreditLedger.rows.filter(r=>r.type==='spend')).toHaveLength(0);
});
test('refund uses one lot, revokes the spend and cannot restore twice',async()=>{
 await pay('delete');const row=collections.MonthlyCreditLedger.rows[0];
 expect(await refundProfileMoonstone(row,UID,'failed delete')).toBe(true);expect(await refundProfileMoonstone(row,UID,'failed delete')).toBe(false);
 expect(restoreLots).toHaveBeenCalledTimes(1);expect(restoreLots).toHaveBeenCalledWith(expect.objectContaining({lotId:`profile-mutation-refund:${row._id}`,amount:100}));
});


test('unknown to explicit midnight and noon persists through update and reread',async()=>{
 for(const hour of [0,12,23]) {
  collections.ProfileCard.rows[0].birth={year:1988,month:1,day:7,hour:null,minute:null,timeUnknown:true};
  const requestId=`profile-card:update:${PID}:hour${hour}`;
  const req=new Request('https://example.com/api/profile/'+PID,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId,profile:{timeUnknown:true,birthTimeUnknown:true,birth:{hour,minute:26,timeUnknown:false}}})});
  expect((await handleProfileRoutes(req,{})).status).toBe(200);
  expect(collections.ProfileCard.rows[0].birth).toMatchObject({hour,minute:26,timeUnknown:false});
 }
});

test('invalid action is rejected before charging',async()=>{
 await expect(pay('constructor')).rejects.toMatchObject({code:'INVALID_REQUEST'});expect(consumeLots).not.toHaveBeenCalled();
});

// 출생 기반 해금은 카드의 생년월일로 찾는다 — 카드가 바뀌거나 지워지면 프로필별 접근결정 캐시가 낡는다.
async function withCacheSpies(run){
 const paid={invalidateForUser:jest.fn()},state={invalidateForUser:jest.fn()};
 const saved={paid:globalThis.__paidAccessDecisionCache,state:globalThis.__accessStateCache};
 globalThis.__paidAccessDecisionCache=paid;globalThis.__accessStateCache=state;
 try{await run(paid,state);}finally{globalThis.__paidAccessDecisionCache=saved.paid;globalThis.__accessStateCache=saved.state;}
}
test('card update invalidates the birth-scoped access caches for this user',async()=>withCacheSpies(async(paid,state)=>{
 expect((await handleProfileRoutes(freeRequest('update'),{})).status).toBe(200);
 expect(paid.invalidateForUser).toHaveBeenCalledWith(UID);expect(state.invalidateForUser).toHaveBeenCalledWith(UID);
}));
test('card delete invalidates the birth-scoped access caches for this user',async()=>withCacheSpies(async(paid,state)=>{
 expect((await handleProfileRoutes(freeRequest('delete'),{})).status).toBe(200);
 expect(paid.invalidateForUser).toHaveBeenCalledWith(UID);expect(state.invalidateForUser).toHaveBeenCalledWith(UID);
}));
