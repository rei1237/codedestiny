import { jest } from '@jest/globals';
import { geminiCallCostUsd } from '../../lib/gemini-tariffs.mjs';
import { recordGeminiUsage, checkLlmBudget } from '../../worker/lib/llm-usage-meter.js';

// Applies the subset of operators the meter uses: upsert bulkWrite with
// $setOnInsert/$inc, a $nin claim with $addToSet, and a $pull release.
function fakeModel(services=[]){
  const docs=new Map();
  const has=(doc,values)=>(doc?.alertedThresholds||[]).some(value=>values.includes(value));
  return {docs,
    bulkWrite:async ops=>{for(const {updateOne:{filter,update}} of ops){
      const doc=docs.get(filter._id)||{_id:filter._id,...update.$setOnInsert};
      for(const [key,value] of Object.entries(update.$inc))doc[key]=(doc[key]||0)+value;
      docs.set(filter._id,doc);
    }},
    findById:id=>({lean:async()=>docs.has(id)?{...docs.get(id)}:null}),
    updateOne:async(filter,update)=>{
      const doc=docs.get(filter._id);
      if(!doc||(filter.alertedThresholds&&has(doc,filter.alertedThresholds.$nin)))return {modifiedCount:0};
      if(update.$addToSet)doc.alertedThresholds=[...new Set([...(doc.alertedThresholds||[]),...update.$addToSet.alertedThresholds.$each])];
      if(update.$pull)doc.alertedThresholds=(doc.alertedThresholds||[]).filter(value=>!update.$pull.alertedThresholds.$in.includes(value));
      return {modifiedCount:1};
    },
    aggregate:async()=>services,
  };
}
const delivered=()=>jest.fn(async()=>({results:[{ok:true}]}));
const deps=(model,extra={})=>({model,connectDb:async()=>{},withMongoRetry:async(_env,fn)=>fn(),...extra});
const NOW=Date.UTC(2026,9,16,3,0); // 2026-10-16 12:00 KST
const budget={GEMINI_MONTHLY_BUDGET_USD:'100'};

test('flash cost bills uncached input, cached input and thinking separately; unknown models stay unpriced',()=>{
  expect(geminiCallCostUsd('models/gemini-2.5-flash',{inputTokens:1_000_000,cachedInputTokens:200_000,outputTokens:80_000,thinkingTokens:20_000}))
    .toBeCloseTo(0.24+0.006+0.25,9);
  expect(geminiCallCostUsd('gemini-9-ultra',{inputTokens:1000})).toBeNull();
});

test('each Gemini response adds to its KST day row and the month total',async()=>{
  const model=fakeModel(),usage={inputTokens:10_000,cachedInputTokens:4_000,outputTokens:2_000};
  expect(await recordGeminiUsage({},{model:'gemini-2.5-flash',service:'yeongnyangi',usage})).toEqual({skipped:'no_db'});
  await recordGeminiUsage({},{model:'gemini-2.5-flash',service:'yeongnyangi',usage},deps(model,{now:NOW}));
  await recordGeminiUsage({},{model:'gemini-9-ultra',service:'yeongnyangi',usage},deps(model,{now:NOW}));
  expect(model.docs.get('d|2026-10-16|gemini-2.5-flash|yeongnyangi')).toMatchObject({kind:'day',month:'2026-10',calls:1,inputTokens:10_000,usdMicros:6920});
  expect(model.docs.get('m|2026-10')).toMatchObject({kind:'month',calls:2,usdMicros:6920,unpricedCalls:1});
});

test('crossing thresholds alerts once for the highest, and an undelivered alert is retried',async()=>{
  const model=fakeModel([{_id:'yeongnyangi',usdMicros:70_000_000,calls:900}]);
  model.docs.set('m|2026-10',{_id:'m|2026-10',kind:'month',usdMicros:85_000_000});
  expect(await checkLlmBudget({},deps(model,{now:NOW}))).toEqual({state:'no_budget'});
  const failed=jest.fn(async()=>({results:[{ok:true,skipped:true}]}));
  expect(await checkLlmBudget(budget,deps(model,{now:NOW,notify:failed}))).toEqual({state:'alert',threshold:80,alerted:false});
  const notify=delivered();
  expect(await checkLlmBudget(budget,deps(model,{now:NOW,notify}))).toEqual({state:'alert',threshold:80,alerted:true});
  expect(await checkLlmBudget(budget,deps(model,{now:NOW,notify}))).toEqual({state:'ok'});
  expect(notify).toHaveBeenCalledTimes(1);
  const [,message]=notify.mock.calls[0];
  expect(message.subject).toBe('[예산 80%] Gemini 이번 달 추정 지출 $85.00 / $100.00');
  expect(message.text).toContain('1. yeongnyangi $70.00 (900회)');
  expect(model.docs.get('m|2026-10').alertedThresholds).toEqual([50,80]);
});
