import {jest} from '@jest/globals';
// 🔴 Every send is injected: no test here may reach Resend.
const owner='507f1f77bcf86cd799439011';
let rows=[],users={};
const get=(row,key)=>key.split('.').reduce((v,k)=>v?.[k],row);
function matches(row,filter){
 return Object.entries(filter).every(([key,want])=>{
  const value=get(row,key);
  if(want===null)return value==null;
  if(want instanceof Date)return value instanceof Date&&value.getTime()===want.getTime();
  if(want&&typeof want==='object'){
   if('$gte' in want)return value>=want.$gte;
   if('$exists' in want)return (value!==undefined)===want.$exists;
  }
  return String(value)===String(want);
 });
}
const writes=[];
const YeongnyangiRequest={
 findOneAndUpdate:jest.fn((filter,update,options)=>({lean:async()=>{
  writes.push({filter,update,options});const row=rows.find(r=>matches(r,filter));if(!row)return null;Object.assign(row,update.$set);return {...row};
 }})),
 updateOne:jest.fn(async(filter,update,options)=>{
  writes.push({filter,update,options});const row=rows.find(r=>matches(r,filter));if(!row)return {modifiedCount:0};Object.assign(row,update.$set);return {modifiedCount:1};
 }),
 find:jest.fn(filter=>{const q={select:()=>q,sort:()=>q,limit:n=>{q.n=n;return q;},lean:async()=>rows.filter(r=>matches(r,filter)).slice(0,q.n).map(r=>({...r}))};return q;}),
};
const User={findOne:jest.fn(({_id})=>({select:()=>({lean:async()=>users[String(_id)]||null})}))};
jest.unstable_mockModule('../../worker/lib/db.js',()=>({connectDb:async()=>{},withMongoRetry:async(_env,fn)=>fn()}));
jest.unstable_mockModule('../../worker/lib/yeongnyangi-models.js',()=>({YeongnyangiRequest}));
jest.unstable_mockModule('../../worker/lib/models.js',()=>({User}));
let mail;
beforeAll(async()=>{mail=await import('../../worker/yeongnyangi/completion-mail.js');});

const now=new Date('2026-11-23T03:10:00.000Z');
const QUESTION='전 남자친구와 다시 만날 수 있을지 너무 궁금해요 비밀질문';
const CHAPTER='챕터 본문 비밀 내용';
function row(id,patch={}){
 return {_id:id.repeat(64),userId:owner,state:'COMPLETED',completedAt:new Date(now.getTime()-1000),lastViewedAt:new Date(now.getTime()-91000),completionMailSentAt:null,
  snapshot:{locale:'ko',product:{name:'사주',fishName:'고등어'},analysis:{consultation:{question:QUESTION}}},chapters:[{body:CHAPTER}],...patch};
}
const ok=()=>jest.fn(async()=>({ok:true,status:200}));
beforeEach(()=>{rows=[];users={[owner]:{email:'buyer@example.test'}};writes.length=0;jest.clearAllMocks();});

test('a buyer who left gets exactly one mail; a repeat call does not resend',async()=>{
 const r=row('a');rows.push(r);const send=ok();
 expect(await mail.sendCompletionMail({},r,{send,now})).toEqual({outcome:'sent'});
 expect(await mail.sendCompletionMail({},r,{send,now})).toEqual({outcome:'taken'});
 expect(send).toHaveBeenCalledTimes(1);
 const [, message]=send.mock.calls[0];
 expect(message).toMatchObject({to:'buyer@example.test',idempotencyKey:`yn-complete:${r._id}`});
 expect(message.subject).toBe('[꿀꿀 운세] 영냥이 상담이 완성되었어요');
 expect(message.html).toContain(`https://code-destiny.com/yeongnyangi/result/?id=${r._id}`);
 expect(message.html).toContain('https://code-destiny.com/yeongnyangi/library/');
 expect(message.html).toContain('결제하신 계정으로 로그인');
 expect(message.html).toContain('사주 · 고등어');
 for(const body of [message.html,message.text,message.subject]){expect(body).not.toContain(QUESTION);expect(body).not.toContain(CHAPTER);expect(body).not.toContain('비밀');}
 expect(rows[0].completionMailSentAt).toEqual(now);
 // The claim never bumps updatedAt (recovery reads it).
 for(const w of writes)expect(w.options).toMatchObject({timestamps:false});
});

test('a buyer still watching at completion gets no mail and the row is marked',async()=>{
 const r=row('b',{lastViewedAt:new Date(now.getTime()-11000)});rows.push(r);const send=ok();
 expect(await mail.sendCompletionMail({},r,{send,now})).toEqual({outcome:'watching'});
 expect(send).not.toHaveBeenCalled();
 expect(rows[0]).toMatchObject({completionMailSkipped:'watching',completionMailSentAt:now});
});

test('viewing the finished result after completion never counts as leaving',async()=>{
 expect(mail.leftAtCompletion({completedAt:now,lastViewedAt:new Date(now.getTime()+300000)})).toBe(false);
 expect(mail.leftAtCompletion({completedAt:now,lastViewedAt:null})).toBe(true);
 expect(mail.leftAtCompletion({completedAt:now,lastViewedAt:new Date(now.getTime()-60001)})).toBe(true);
});

test('no account email marks no_email without sending',async()=>{
 users={};const r=row('c');rows.push(r);const send=ok();
 expect(await mail.sendCompletionMail({},r,{send,now})).toEqual({outcome:'no_email'});
 expect(send).not.toHaveBeenCalled();
 expect(rows[0]).toMatchObject({completionMailSkipped:'no_email',completionMailSentAt:now});
});

test('a failed send releases the claim so the sweep can retry',async()=>{
 const r=row('d');rows.push(r);
 const fail=jest.fn(async()=>({ok:false,status:500}));
 expect(await mail.sendCompletionMail({},r,{send:fail,now})).toEqual({outcome:'failed'});
 expect(rows[0].completionMailSentAt).toBeNull();
 const thrown=jest.fn(async()=>{throw new Error('network');});
 expect(await mail.sendCompletionMail({},r,{send:thrown,now})).toEqual({outcome:'failed'});
 expect(rows[0].completionMailSentAt).toBeNull();
 const send=ok();
 expect(await mail.sendCompletionMail({},r,{send,now})).toEqual({outcome:'sent'});
 expect(send).toHaveBeenCalledTimes(1);
});

test('an account configuration failure releases the claim and records config',async()=>{
 const r=row('e');rows.push(r);
 const send=jest.fn(async()=>({ok:false,status:403,configError:true}));
 expect(await mail.sendCompletionMail({},r,{send,now})).toEqual({outcome:'config'});
 expect(rows[0]).toMatchObject({completionMailSentAt:null,completionMailSkipped:'config'});
});

test('consultation-room rows link to the fortune-chat consultation and the records archive',async()=>{
 const r=row('f',{persona:'neo',snapshot:{product:{name:'사주',fishName:''},analysis:{consultation:{question:QUESTION}}}});rows.push(r);const send=ok();
 expect(await mail.sendCompletionMail({},r,{send,now})).toEqual({outcome:'sent'});
 const [, message]=send.mock.calls[0];
 expect(message.subject).toBe('[꿀꿀 운세] 네오 상담이 완성되었어요');
 expect(message.html).toContain(`https://code-destiny.com/fortune-chat/?consultation=${r._id}`);
 expect(message.html).toContain('https://code-destiny.com/records/');
 expect(message.html).not.toContain('/yeongnyangi/result/');
 expect(message.html).not.toContain(QUESTION);
});

test('rows that are not completed are never claimed',async()=>{
 const r=row('1',{state:'GENERATING'});rows.push(r);const send=ok();
 expect(await mail.sendCompletionMail({},r,{send,now})).toEqual({outcome:'invalid'});
 expect(YeongnyangiRequest.findOneAndUpdate).not.toHaveBeenCalled();
});

test('the real sender without a key skips before any database work',async()=>{
 const r=row('2');rows.push(r);
 expect(await mail.sendCompletionMail({},r,{now})).toEqual({outcome:'config'});
 expect(await mail.sendPendingCompletionMails({},{now})).toMatchObject({scanned:0,configError:true});
 expect(YeongnyangiRequest.findOneAndUpdate).not.toHaveBeenCalled();
 expect(YeongnyangiRequest.find).not.toHaveBeenCalled();
});

test('the sweep mails recent leavers only, skips old rows, and marks watchers',async()=>{
 const left=row('3'),watching=row('4',{lastViewedAt:new Date(now.getTime()-5000)}),old=row('5',{completedAt:new Date(now.getTime()-25*3600000)});
 rows.push(left,watching,old);const send=ok();
 const summary=await mail.sendPendingCompletionMails({},{now,send});
 expect(summary).toMatchObject({scanned:2,configError:false});
 expect(summary.outcomes.sort()).toEqual(['sent','watching']);
 expect(send).toHaveBeenCalledTimes(1);
 expect(send.mock.calls[0][1].idempotencyKey).toBe(`yn-complete:${left._id}`);
 expect(old.completionMailSentAt).toBeNull();
 const again=await mail.sendPendingCompletionMails({},{now,send});
 expect(again.scanned).toBe(0);expect(send).toHaveBeenCalledTimes(1);
});

// Regression (2026-11-25): `lastViewedAt: {$exists:true}` dropped never-viewed rows created before the heartbeat field.
test('a never-viewed row without lastViewedAt is mailed once, inside the 24h window and the per-run cap',async()=>{
 const legacy=(id,patch={})=>{const r=row(id,patch);delete r.lastViewedAt;delete r.completionMailSentAt;return r;};
 const recent=['7','8','9','c','d','e','f'].map((id,i)=>legacy(id,{completedAt:new Date(now.getTime()-(i+1)*60000)}));
 const backlog=legacy('0',{completedAt:new Date(now.getTime()-24*3600000-1000)});
 const unfinished=legacy('1',{state:'GENERATING'});
 rows.push(backlog,unfinished,...recent);const send=ok();
 const first=await mail.sendPendingCompletionMails({},{now,send});
 expect(first).toMatchObject({scanned:5,configError:false});
 expect(first.outcomes).toEqual(Array(5).fill('sent'));
 const second=await mail.sendPendingCompletionMails({},{now,send});
 expect(second.outcomes).toEqual(['sent','sent']);
 expect((await mail.sendPendingCompletionMails({},{now,send})).scanned).toBe(0);
 expect(send).toHaveBeenCalledTimes(7);
 expect(new Set(send.mock.calls.map(([,m])=>m.idempotencyKey)).size).toBe(7);
 expect(backlog).not.toHaveProperty('completionMailSentAt');expect(unfinished).not.toHaveProperty('completionMailSentAt');
 const filter=YeongnyangiRequest.find.mock.calls[0][0];
 expect(Object.keys(filter)).toEqual(['state','completedAt','completionMailSentAt']);
});
