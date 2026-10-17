import { jest } from '@jest/globals';
import { reportProviderOutage, checkProviderRecovery } from '../../worker/lib/provider-outage-alert.js';

// The filter subset the module uses: equality (null matches missing), $lte, $gt, $or, $and.
const plain=value=>value instanceof Date?value.getTime():value??null;
function matches(doc,filter){
  return Object.entries(filter).every(([key,condition])=>{
    if(key==='$or')return condition.some(part=>matches(doc,part));
    if(key==='$and')return condition.every(part=>matches(doc,part));
    const actual=plain(doc[key]);
    if(condition&&typeof condition==='object'&&!(condition instanceof Date)){
      if('$lte' in condition)return actual!==null&&actual<=plain(condition.$lte);
      if('$gt' in condition)return actual!==null&&actual>plain(condition.$gt);
    }
    return actual===plain(condition);
  });
}
function fakeModel(initial=null){
  const state={doc:initial};
  const lean=result=>({lean:async()=>result&&{...result}});
  return {state,
    updateOne:async(filter,update,options={})=>{
      if(!state.doc&&options.upsert)state.doc={_id:filter._id};
      if(!state.doc||!matches(state.doc,filter))return {modifiedCount:0};
      Object.assign(state.doc,update.$set);return {modifiedCount:1};
    },
    findOneAndUpdate:(filter,update)=>{
      const before=state.doc&&matches(state.doc,filter)?{...state.doc}:null;
      if(before)Object.assign(state.doc,update.$set);
      return lean(before);
    },
    findById:id=>lean(state.doc?._id===id?state.doc:null),
  };
}
const delivered=()=>jest.fn(async()=>({results:[{ok:true}]}));
const deps=(model,notify,now)=>({model,notify,now,connectDb:async()=>{},withMongoRetry:async(_env,fn)=>fn()});
const T0=Date.UTC(2026,9,16,17,39);
const MIN=60_000;

test('rate limits and environments without Mongo never record an outage',async()=>{
  const model=fakeModel(),notify=delivered();
  expect(await reportProviderOutage({},'GEMINI_RATE_LIMITED',deps(model,notify,T0))).toEqual({skipped:'unknown_code'});
  expect(await reportProviderOutage({},'GEMINI_SPEND_CAP')).toEqual({skipped:'no_db'});
  expect(model.state.doc).toBeNull();expect(notify).not.toHaveBeenCalled();
});

test('repeated spend-cap failures send one alert with the cause and no customer data',async()=>{
  const model=fakeModel(),notify=delivered();
  expect(await reportProviderOutage({},'GEMINI_SPEND_CAP',deps(model,notify,T0))).toEqual({recorded:true,alerted:true});
  expect(await reportProviderOutage({},'GEMINI_SPEND_CAP',deps(model,notify,T0+30_000))).toEqual({skipped:'throttled'});
  expect(await reportProviderOutage({},'GEMINI_SPEND_CAP',deps(model,notify,T0+2*MIN))).toEqual({recorded:true,alerted:false});
  expect(notify).toHaveBeenCalledTimes(1);
  const [,message]=notify.mock.calls[0];
  expect(message.subject).toBe('[긴급] Gemini 월 지출 한도 도달 — 유료 생성 중단');
  expect(message.text).toContain('GEMINI_SPEND_CAP');expect(message.text).toContain('자동 환불');
  expect(model.state.doc).toMatchObject({code:'GEMINI_SPEND_CAP',lastSeenAt:new Date(T0+2*MIN),alertedAt:new Date(T0),alertClaimedAt:null});
});

test('an undelivered alert releases its claim and the cron resends it',async()=>{
  const at=T0+2*60*MIN,model=fakeModel(),failed=jest.fn(async()=>({results:[{ok:true,skipped:true}]}));
  expect(await reportProviderOutage({},'GEMINI_SPEND_CAP',deps(model,failed,at))).toEqual({recorded:true,alerted:false});
  expect(model.state.doc.alertClaimedAt).toBeNull();
  const notify=delivered();
  expect(await checkProviderRecovery({},deps(model,notify,at+10*MIN))).toEqual({state:'outage',alerted:true});
  expect(notify).toHaveBeenCalledTimes(1);
});

test('recovery is announced once after twenty quiet minutes',async()=>{
  const seen=new Date(T0),model=fakeModel({_id:'gemini',code:'GEMINI_SPEND_CAP',lastSeenAt:seen,alertedAt:seen}),notify=delivered();
  expect(await checkProviderRecovery({},deps(model,notify,T0+10*MIN))).toEqual({state:'outage',alerted:false});
  expect(await checkProviderRecovery({},deps(model,notify,T0+21*MIN))).toEqual({state:'recovered',alerted:true});
  expect(await checkProviderRecovery({},deps(model,notify,T0+31*MIN))).toEqual({state:'idle'});
  expect(notify).toHaveBeenCalledTimes(1);
  expect(notify.mock.calls[0][1].subject).toContain('[복구 추정]');
  expect(model.state.doc).toMatchObject({alertedAt:null,recoveredAt:new Date(T0+21*MIN)});
});
