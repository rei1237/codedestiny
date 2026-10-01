import {jest} from '@jest/globals';
let orders=[],candidates=[],held=[],stopped=[],alerts=[],filters=[];
const chain=(rows)=>({sort:()=>chain(rows),limit:()=>chain(rows),lean:async()=>rows});
jest.unstable_mockModule('../../worker/lib/db.js',()=>({connectDb:async()=>{},withMongoRetry:async(_env,fn)=>fn()}));
const updateOne=jest.fn(async()=>({modifiedCount:1}));
jest.unstable_mockModule('../../worker/lib/models.js',()=>({Payment:{find:filter=>chain(orders.filter(order=>filter.requestId.test(order.requestId)
  &&!(filter['metadata.fortuneChatRecovery']===null&&order.metadata?.fortuneChatRecovery))),updateOne}}));
const scan=filter=>{filters.push(filter);return filter.errorCode==='AUTOMATIC_RECOVERY_STOPPED'?stopped:filter['hold.alertPending']?alerts
  :filter.errorCode==='GENERATION_REVIEW_REQUIRED'?held:candidates;};
const keepHold=jest.fn(async()=>({modifiedCount:1})),markHoldAlerted=jest.fn(async()=>({modifiedCount:1}));
jest.unstable_mockModule('../../worker/yeongnyangi/repository.js',()=>({YeongnyangiRequest:{find:filter=>chain(scan(filter))},
  MAX_FIX_RESUMES:2,canResumeAfterFix:row=>Boolean(row.resumable),heldReason:row=>row.hold?.reason || '',holdAutoResumes:row=>Boolean(row.resumable),
  heldForFixFilter:()=>({state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED'}),pendingAlertFilter:()=>({'hold.alertPending':true}),
  escalateStopped:jest.fn(),resumeHeldAfterFix:jest.fn(),keepHold,markHoldAlerted}));
jest.unstable_mockModule('../../worker/yeongnyangi/service',()=>({providerReady:()=>false,activateFortune:jest.fn(),generateNextChapter:jest.fn()}));
let runYeongnyangiRecovery,abandonedRequestFilter,holdAlertMessage;
beforeAll(async()=>{({runYeongnyangiRecovery,abandonedRequestFilter,holdAlertMessage}=await import('../../worker/yeongnyangi/recovery.js'));});
beforeEach(()=>{orders=[];candidates=[];held=[];stopped=[];alerts=[];filters=[];keepHold.mockClear();markHoldAlerted.mockClear();});
test('disabled provider scans stored work without activating purchases or reviving holds',async()=>{
  const connectDb=jest.fn(),generate=jest.fn(),activate=jest.fn(),resumeAfterFix=jest.fn(),escalate=jest.fn(),enqueue=jest.fn();
  const result=await runYeongnyangiRecovery({YEONGNYANGI_QUEUE:{}},{connectDb,generate,activate,resumeAfterFix,escalate,enqueue});
  expect(result).toMatchObject({storedOnly:true,scanned:0});
  expect(connectDb).toHaveBeenCalledTimes(1);
  for(const fn of [generate,activate,resumeAfterFix,escalate,enqueue])expect(fn).not.toHaveBeenCalled();
  expect(filters).toHaveLength(1);expect(filters[0].$and.at(-1).$expr).toBeTruthy();
});
test('disabled recovery finishes only the current durable draft and complete chapter marker',async()=>{
  candidates=[
    {_id:'draft',userId:'owner',chapters:[],snapshot:{manifest:[{}]},generationCheckpoint:{chapterDrafts:{0:{body:{summary:'saved'}}}}},
    {_id:'done',userId:'owner',chapters:[{summary:'saved'}],snapshot:{manifest:[{}]}},
    {_id:'empty',userId:'owner',chapters:[],snapshot:{manifest:[{}]}},
  ];
  const generate=jest.fn(async(_env,_owner,id)=>({...candidates.find(row=>row._id===id),state:'COMPLETED'})),enqueue=jest.fn();
  await runYeongnyangiRecovery({YEONGNYANGI_QUEUE:{}},{generate,enqueue});
  expect(generate.mock.calls.map(call=>call[2])).toEqual(['draft','done']);
  expect(enqueue).not.toHaveBeenCalled();
});

test('approved order missing browser return reuses its original intent',async()=>{
  orders=[{_id:'p',userId:'owner',requestId:`yn-${'a'.repeat(64)}`}];
  const activate=jest.fn().mockResolvedValue({});
  await runYeongnyangiRecovery({},{providerReady:()=>true,activate});
  expect(activate).toHaveBeenCalledWith({},'owner','a'.repeat(64));
});
test('DB blip retries next tick; a permanent activation error waits a day',async()=>{
  orders=[{_id:'blip',userId:'owner',requestId:`yn-${'a'.repeat(64)}`},{_id:'bad',userId:'owner',requestId:`yn-${'b'.repeat(64)}`}];
  const blip=Object.assign(new Error('Transaction aborted'),{name:'MongoServerError'}),bad=Object.assign(new Error('price changed'),{code:'PRICE_CHANGED'});
  const activate=jest.fn().mockRejectedValueOnce(blip).mockRejectedValueOnce(bad);updateOne.mockClear();
  await runYeongnyangiRecovery({},{providerReady:()=>true,activate,clock:()=>1000});
  const hold=id=>updateOne.mock.calls.find(([q])=>q._id===id)[1].$set['metadata.yeongnyangiRecoveryAfter'].getTime()-1000;
  expect(hold('blip')).toBe(5*60*1000);expect(hold('bad')).toBe(24*60*60*1000);
});
test('saved partial chapters resume and stop at completion',async()=>{
  candidates=[{_id:'id',userId:'owner',chapters:[{}]}];
  const generate=jest.fn().mockResolvedValueOnce({_id:'id',userId:'owner',chapters:[{},{}],state:'PAID'})
    .mockResolvedValueOnce({chapters:[{},{},{}],state:'COMPLETED'});
  await runYeongnyangiRecovery({},{providerReady:()=>true,generate});
  expect(generate).toHaveBeenCalledTimes(2);
  expect(generate).toHaveBeenNthCalledWith(1,{},'owner','id','scheduled');
});
test.each(['GENERATING','FORTUNE_FAILED','REFUNDED'])('state %s is never spun or retried in the same tick',async state=>{
  candidates=[{_id:'id',userId:'owner',chapters:[]}];
  const generate=jest.fn().mockResolvedValue({chapters:[],state});
  await runYeongnyangiRecovery({},{providerReady:()=>true,generate});
  expect(generate).toHaveBeenCalledTimes(1);
});
test('tick reserves provider and commit time before starting another chapter',async()=>{
  candidates=[{_id:'id',userId:'owner',chapters:[]}];let now=1000;
  const generate=jest.fn().mockImplementation(async()=>{now+=140000;return {_id:'id',userId:'owner',chapters:[{}],state:'PAID'};});
  await runYeongnyangiRecovery({},{providerReady:()=>true,generate,clock:()=>now});
  expect(generate).toHaveBeenCalledTimes(1);
});
test('fortune-chat consultations resume like every other paid access',()=>{
  expect(abandonedRequestFilter(Date.now()).$or).toContainEqual({accessMethod:{$in:['PER_USE','ACCOUNT_FREE_TRIAL']}});
});
test('a paid fortune-chat order opens its consultation once and is marked',async()=>{
  orders=[{_id:'done',userId:'owner',requestId:`fc-${'d'.repeat(64)}`,metadata:{fortuneChatRecovery:'attached'}},{_id:'pay',userId:'owner',requestId:`fc-${'c'.repeat(64)}`}];updateOne.mockClear();
  const activate=jest.fn().mockResolvedValue({accessMethod:'PER_USE',perUseSource:'payment',perUseEvidenceId:'pay'}),notify=jest.fn();
  const result=await runYeongnyangiRecovery({},{providerReady:()=>true,activate,notify});
  expect(activate).toHaveBeenCalledTimes(1);expect(activate).toHaveBeenCalledWith({},'owner','c'.repeat(64));expect(notify).not.toHaveBeenCalled();
  expect(updateOne).toHaveBeenCalledWith({_id:'pay','metadata.fortuneChatRecovery':null},{$set:{'metadata.fortuneChatRecovery':'attached'}});
  expect(result.outcomes).toContainEqual({outcome:'chat_attached'});
});
test('a card payment for a consultation already opened another way reaches operators before it is marked',async()=>{
  orders=[{_id:'pay',userId:'owner',requestId:`fc-${'c'.repeat(64)}`}];updateOne.mockClear();
  const activate=jest.fn().mockResolvedValue({accessMethod:'ACCOUNT_FREE_TRIAL'});
  let result=await runYeongnyangiRecovery({},{providerReady:()=>true,activate,notify:async()=>({results:[{ok:false}]})});
  expect(updateOne).not.toHaveBeenCalled();expect(result.outcomes).toContainEqual({outcome:'alert_pending'});
  const notify=jest.fn(async()=>({results:[{ok:true}]}));
  result=await runYeongnyangiRecovery({},{providerReady:()=>true,activate,notify});
  expect(notify.mock.calls[0][1].text).toContain('ACCOUNT_FREE_TRIAL');expect(notify.mock.calls[0][1].text).not.toContain('owner');
  expect(updateOne).toHaveBeenCalledWith({_id:'pay','metadata.fortuneChatRecovery':null},{$set:{'metadata.fortuneChatRecovery':'duplicate'}});
  expect(result.outcomes).toContainEqual({outcome:'duplicate_payment'});
});
test('a second card payment for a consultation another payment opened is a duplicate too',async()=>{
  orders=[{_id:'second',userId:'owner',requestId:`fc-${'c'.repeat(64)}`}];updateOne.mockClear();
  const activate=jest.fn().mockResolvedValue({accessMethod:'PER_USE',perUseSource:'payment',perUseEvidenceId:'first'});
  await runYeongnyangiRecovery({},{providerReady:()=>true,activate,notify:async()=>({results:[{ok:true}]})});
  expect(updateOne).toHaveBeenCalledWith({_id:'second','metadata.fortuneChatRecovery':null},{$set:{'metadata.fortuneChatRecovery':'duplicate'}});
});
test('a paid fortune-chat order that cannot open its consultation reaches operators once, then retries daily',async()=>{
  const now=Date.now(),day=24*60*60*1000,fiveMinutes=5*60*1000;
  const refused=Object.assign(new Error('refunded'),{code:'FORTUNE_REFUNDED',status:409});
  const activate=jest.fn().mockRejectedValue(refused);
  orders=[{_id:'pay',userId:'owner',requestId:`fc-${'c'.repeat(64)}`,metadata:{}}];updateOne.mockClear();
  let result=await runYeongnyangiRecovery({},{providerReady:()=>true,activate,clock:()=>now,notify:async()=>({results:[{ok:false}]})});
  expect(updateOne.mock.calls[0][1].$set).toEqual({'metadata.yeongnyangiRecoveryAfter':new Date(now+fiveMinutes),'metadata.yeongnyangiRecoveryCode':'FORTUNE_REFUNDED'});
  expect(result.outcomes).toContainEqual({outcome:'alert_pending'});
  updateOne.mockClear();
  const notify=jest.fn(async()=>({results:[{ok:true}]}));
  result=await runYeongnyangiRecovery({},{providerReady:()=>true,activate,clock:()=>now,notify});
  expect(notify).toHaveBeenCalledTimes(1);
  expect(notify.mock.calls[0][1].text).toContain('FORTUNE_REFUNDED');expect(notify.mock.calls[0][1].text).not.toContain('owner');
  expect(updateOne.mock.calls[0][1].$set).toMatchObject({'metadata.yeongnyangiRecoveryAfter':new Date(now+day),'metadata.fortuneChatActivationAlerted':true});
  expect(result.outcomes).toContainEqual({outcome:'activation_alert_sent'});
  orders[0].metadata.fortuneChatActivationAlerted=true;notify.mockClear();updateOne.mockClear();
  result=await runYeongnyangiRecovery({},{providerReady:()=>true,activate,clock:()=>now,notify});
  expect(notify).not.toHaveBeenCalled();
  expect(updateOne.mock.calls[0][1].$set['metadata.yeongnyangiRecoveryAfter']).toEqual(new Date(now+day));
  expect(result.outcomes).toContainEqual({outcome:'activation_pending'});
});
test('a database outage or a Yeongnyangi order activation failure sends no fortune-chat alert',async()=>{
  const outage=Object.assign(new Error('down'),{name:'MongoNetworkError',code:'DB_UNAVAILABLE',status:503});
  const notify=jest.fn(async()=>({results:[{ok:true}]}));
  orders=[{_id:'pay',userId:'owner',requestId:`fc-${'c'.repeat(64)}`,metadata:{}}];
  await runYeongnyangiRecovery({},{providerReady:()=>true,activate:jest.fn().mockRejectedValue(outage),notify});
  orders=[{_id:'yn',userId:'owner',requestId:`yn-${'c'.repeat(64)}`,metadata:{}}];
  await runYeongnyangiRecovery({},{providerReady:()=>true,activate:jest.fn().mockRejectedValue(new Error('bad')),notify});
  expect(notify).not.toHaveBeenCalled();
});
test('review-required and payment-suspended requests are excluded',()=>{
  expect(abandonedRequestFilter(Date.now()).errorCode.$nin).toEqual(['GENERATION_REVIEW_REQUIRED','ASK_LIMITED_REVIEW_REQUIRED','PAYMENT_NOT_ACTIVE','AUTOMATIC_RECOVERY_STOPPED']);
});

const nine=Array.from({length:9},()=>({}));
test('a held order resumed after the fix is queued in the same tick; one a fix cannot help is stamped',async()=>{
  held=[{_id:'fixable',userId:'owner',chapters:nine,resumable:true},{_id:'storage',userId:'owner',chapters:nine}];
  const resumeAfterFix=jest.fn(async(_env,row)=>({...row,state:'PAID',errorCode:''})),enqueue=jest.fn(async()=>true);
  const result=await runYeongnyangiRecovery({YEONGNYANGI_QUEUE:{}},{providerReady:()=>true,resumeAfterFix,enqueue});
  expect(resumeAfterFix).toHaveBeenCalledTimes(1);expect(resumeAfterFix.mock.calls[0][1]._id).toBe('fixable');
  expect(keepHold.mock.calls[0][1]._id).toBe('storage');
  expect(enqueue).toHaveBeenCalledTimes(1);expect(enqueue.mock.calls[0][1]).toMatchObject({_id:'fixable',state:'PAID'});
  expect(result.outcomes.map(o=>o.outcome)).toEqual(expect.arrayContaining(['resumed_after_fix','hold_kept','queued']));
});
test('a stopped chapter idle for 30 minutes gets the server retry and generates; an exhausted one is held',async()=>{
  const now=10*60*60*1000;
  stopped=[{_id:'retry',userId:'owner',chapters:nine},{_id:'spent',userId:'owner',chapters:nine}];
  const escalate=jest.fn(async(_env,row)=>row._id==='retry'?{...row,state:'PAID',errorCode:''}:{...row,state:'FORTUNE_FAILED',errorCode:'GENERATION_REVIEW_REQUIRED'});
  const generate=jest.fn(async(_env,_owner,id)=>({_id:id,userId:'owner',chapters:nine,state:'FORTUNE_FAILED'}));
  const result=await runYeongnyangiRecovery({},{providerReady:()=>true,escalate,generate,clock:()=>now});
  expect(filters.find(q=>q.errorCode==='AUTOMATIC_RECOVERY_STOPPED').updatedAt.$lt.getTime()).toBe(now-30*60*1000);
  expect(generate).toHaveBeenCalledTimes(1);expect(generate.mock.calls[0][2]).toBe('retry');
  expect(result.outcomes.map(o=>o.outcome)).toEqual(expect.arrayContaining(['system_retry','held']));
});
test('a hold alert is marked only after a channel accepted it; otherwise it stays pending for the next tick',async()=>{
  alerts=[{_id:'a'.repeat(64),userId:'owner',productId:'saju_tuna',chapters:nine,snapshot:{manifest:Array(15).fill({})},hold:{reason:'SYSTEM_RECOVERY_EXHAUSTED',chapter:9,at:new Date(0)}}];
  for(const outcome of [()=>({results:[{ok:false}]}),()=>({results:[{ok:true,skipped:true}]}),()=>Promise.reject(new Error('webhook down'))]){
    const notify=jest.fn(outcome);
    const result=await runYeongnyangiRecovery({},{providerReady:()=>true,notify});
    expect(notify).toHaveBeenCalledTimes(1);expect(markHoldAlerted).not.toHaveBeenCalled();
    expect(result.outcomes.map(o=>o.outcome)).toContain('alert_pending');
  }
  const notify=jest.fn(async()=>({results:[{ok:false},{ok:true}]}));
  const result=await runYeongnyangiRecovery({},{providerReady:()=>true,notify});
  expect(markHoldAlerted).toHaveBeenCalledTimes(1);expect(markHoldAlerted.mock.calls[0][1]).toBe(alerts[0]);
  expect(result.outcomes.map(o=>o.outcome)).toContain('alert_sent');
});
test('the operator alert names the order, item and action without buyer data',()=>{
  const row={_id:'c'.repeat(64),userId:'507f1f77bcf86cd799439011',profileId:'profile-secret',productId:'saju_tuna',chapters:nine,
    snapshot:{manifest:Array(15).fill({}),profile:{name:'구매자이름'}},hold:{reason:'SYSTEM_RECOVERY_EXHAUSTED',chapter:9},resumable:true,
    recoveryAudit:[{kind:'automatic_recovery_stopped',source:'generation',code:'CHAPTER_SECTION_TOO_SHORT',detail:'section:example:90/121'}]};
  const {subject,text}=holdAlertMessage(row);
  expect(subject).toContain('c'.repeat(12));
  for(const part of ['c'.repeat(64),'saju_tuna','저장 9/15','멈춘 항목 10/15','SYSTEM_RECOVERY_EXHAUSTED','CHAPTER_SECTION_TOO_SHORT section:example:90/121','자동 재개','--operator','추가 결제'])expect(text).toContain(part);
  for(const secret of ['507f1f77bcf86cd799439011','profile-secret','구매자이름'])expect(subject+text).not.toContain(secret);
});
