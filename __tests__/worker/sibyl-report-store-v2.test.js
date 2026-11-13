/** @jest-environment node */
// 시빌라 연간 리포트 배달 2판: 통과한 장은 남기고 실패한 장만 다시 만든다. 분량은 치명이 아니다.
import { jest } from '@jest/globals';
import { createHash } from 'node:crypto';
import { kstYear } from '../../worker/lib/sibyl-annual.js';
const generate=jest.fn();const rows=new Map();
const key=q=>q.userId+':'+q.executionKey;
const copy=v=>v?structuredClone(v):v;
function set(doc,values){for(const [path,value] of Object.entries(values||{})){const parts=path.split('.');let at=doc;while(parts.length>1){const k=parts.shift();at[k]||={};at=at[k];}at[parts[0]]=copy(value);}}
const updateOne=jest.fn(async(q,update,options)=>{let row=rows.get(key(q));if(!row&&options?.upsert){row=copy(update.$setOnInsert);rows.set(key(q),row);}
  if(row&&(!q['lock.token']||row.lock?.token===q['lock.token'])&&(!q.status||row.status===q.status))set(row,update.$set);return {modifiedCount:1};});
const findOneAndUpdate=jest.fn((q,update)=>({lean:async()=>{
  const row=rows.get(key(q));if(!row)return null;
  if(q['lock.token']&&row.lock?.token!==q['lock.token'])return null;
  if(q.status&&row.status!==q.status)return null;
  if(q.$or&&row.lock?.until&&row.lock.until>new Date())return null;
  set(row,update.$set);return copy(row);
}}));
jest.unstable_mockModule('../../worker/lib/db.js',()=>({connectDb:jest.fn()}));
jest.unstable_mockModule('../../worker/lib/models.js',()=>({ServiceExecutionTransaction:{findOne:q=>({lean:async()=>copy(rows.get(key(q)))}),updateOne,findOneAndUpdate}}));
jest.unstable_mockModule('../../worker/lib/structured-consultation.js',()=>({callGeminiJsonWithRetry:generate}));
jest.unstable_mockModule('../../worker/lib/paid-result-revocation.js',()=>({isStoredPaidResultRevoked:async()=>false}));
let store;
beforeAll(async()=>{store=await import('../../worker/lib/sibyl-report-store.js');});
const V1_ENV={SIBYL_DELIVERY_V2_ENABLED:'false'};
const V2_ENV={};
const YEAR=Math.max(2030,kstYear());
const access={card:{profileId:'p1',gender:'M',birth:{year:1990,month:5,day:17,hour:9,minute:30,calType:'solar'}},birth:{date:'1990-05-17',time:'09:30',timeKnown:true,gender:'M'}};
const GOOD='중요한 약속을 앞두고 일정과 역할을 확인하세요. 지금의 선택을 돌아보고 필요한 조건이 갖춰지면 실행 범위를 조정하세요. ';
const chapter=(k,content=GOOD.repeat(10),evidenceIds=['annual'])=>({key:k,content,evidenceIds});
const keys=()=>store.SIBYL_CHAPTERS.map(([k])=>k);
const reply=list=>({ok:true,text:JSON.stringify({chapters:list}),model:'mock'});
const full=(patch={})=>reply(keys().map(k=>patch[k]===undefined?chapter(k):patch[k]).filter(Boolean));
const requestedKeys=prompt=>keys().filter(k=>String(prompt).includes(`"${k}"`));
const row=()=>[...rows.values()][0];
beforeEach(()=>{rows.clear();jest.clearAllMocks();jest.restoreAllMocks();});

test('V1 prompt bytes are unchanged and the first v2 call sends the same bytes',async()=>{
  generate.mockResolvedValue(full());
  await store.readOrGenerateSibyl(V1_ENV,'owner',access,YEAR);
  rows.clear();
  await store.readOrGenerateSibyl(V2_ENV,'owner',access,YEAR);
  const [v1,v2]=generate.mock.calls.map(c=>createHash('sha256').update(c[1]).digest('hex'));
  expect(v1).toBe(SIBYL_V1_PROMPT_SHA256);
  expect(v2).toBe(v1);
});

test('plan version is pinned only on new records; kill switch keeps v1; v1 rows stay v1',async()=>{
  generate.mockResolvedValue(full({coreMatrix:chapter('coreMatrix',GOOD.repeat(10)+'올해 3번 확인하세요.')}));
  await expect(store.readOrGenerateSibyl(V1_ENV,'owner',access,YEAR)).rejects.toThrow('SIBYL_COUNSEL_INVALID');
  expect(row().metadata.deliveryPlanVersion).toBeUndefined();
  // 옛 1판 기록은 스위치가 켜져도 1판으로 끝난다.
  await expect(store.readOrGenerateSibyl(V2_ENV,'owner',access,YEAR)).rejects.toThrow('SIBYL_COUNSEL_INVALID');
  expect(row().metadata.deliveryPlanVersion).toBeUndefined();
  rows.clear();generate.mockReset();generate.mockResolvedValue(full());
  const done=await store.readOrGenerateSibyl(V2_ENV,'owner',access,YEAR);
  expect(done.status).toBe(200);expect(row().metadata.deliveryPlanVersion).toBe(2);expect(done.body.deliveryPlanVersion).toBe(2);
});

test('keeps valid chapters and regenerates only the failed one',async()=>{
  generate.mockResolvedValueOnce(full({riskAnalysis:chapter('riskAnalysis',GOOD.repeat(10)+'반드시 성공합니다.')}))
    .mockResolvedValueOnce(reply([chapter('riskAnalysis',GOOD.repeat(9)+'새로 쓴 문장입니다.')]));
  const res=await store.readOrGenerateSibyl(V2_ENV,'owner',access,YEAR);
  expect(res.status).toBe(200);expect(generate).toHaveBeenCalledTimes(2);
  expect(requestedKeys(generate.mock.calls[1][1])).toEqual(['riskAnalysis']);
  expect(res.body.chapters.map(c=>c.key)).toEqual(keys());
  expect(res.body.chapterMap.riskAnalysis).toContain('새로 쓴 문장');
  expect(res.body.chapterMap.coreMatrix).toBe(GOOD.repeat(10).trim());
  expect(row().status).toBe('success');
});

test('short output is never fatal: one bounded repair below the floor, then delivered',async()=>{
  const short=GOOD.repeat(2); // 약 130자, 합계 5000자 미만
  generate.mockResolvedValue(full(Object.fromEntries(keys().map(k=>[k,chapter(k,short)]))));
  const res=await store.readOrGenerateSibyl(V2_ENV,'owner',access,YEAR);
  expect(res.status).toBe(200);
  expect(res.body.totalChars).toBeLessThan(5000);
  expect(res.body.chapters).toHaveLength(10);
  expect(generate).toHaveBeenCalledTimes(2);
  // 수리는 바닥 아래 장만, 기록당 3장까지
  expect(requestedKeys(generate.mock.calls[1][1])).toEqual(keys().slice(0,3));
});

test('chapters above the floor or above the old cap are accepted without repair',async()=>{
  generate.mockResolvedValue(full({coreMatrix:chapter('coreMatrix',GOOD.repeat(45)),riskAnalysis:chapter('riskAnalysis',GOOD.repeat(7))}));
  const res=await store.readOrGenerateSibyl(V2_ENV,'owner',access,YEAR);
  expect(res.status).toBe(200);expect(generate).toHaveBeenCalledTimes(1);
  expect(res.body.chapterMap.coreMatrix.length).toBeGreaterThan(2400);
});

test('persistent unsafe text is scrubbed on the last attempt and delivered across requests',async()=>{
  const bad=k=>chapter(k,GOOD.repeat(8)+'삼월에는 갑목의 기질이 나타납니다. 2030년에 바뀝니다. '+GOOD.repeat(2));
  generate.mockResolvedValueOnce(full({tenGodPattern:bad('tenGodPattern')}))
    .mockResolvedValue(reply([bad('tenGodPattern')]));
  const first=await store.readOrGenerateSibyl(V2_ENV,'owner',access,YEAR);
  expect(first.status).toBe(202);expect(first.body.status).toBe('generating');
  expect(generate).toHaveBeenCalledTimes(2);
  expect(row().status).toBe('failed');expect(row().lock.token).toBe('');
  const second=await store.readOrGenerateSibyl(V2_ENV,'owner',access,YEAR);
  expect(second.status).toBe(200);expect(generate).toHaveBeenCalledTimes(3);
  const text=second.body.chapterMap.tenGodPattern;
  expect(text).not.toMatch(/\d|갑목|삼월/);
  expect(text.length).toBeGreaterThan(400);
  expect(second.body.qualityWarnings).toEqual(expect.arrayContaining([expect.objectContaining({key:'tenGodPattern'})]));
});

test('an omitted chapter is never dropped; it is regenerated until text arrives',async()=>{
  generate.mockResolvedValueOnce(full({finalMessage:null}))
    .mockResolvedValueOnce(reply([]))
    .mockResolvedValueOnce(reply([]))
    .mockResolvedValueOnce(reply([chapter('finalMessage')]));
  expect((await store.readOrGenerateSibyl(V2_ENV,'owner',access,YEAR)).status).toBe(202);
  const done=await store.readOrGenerateSibyl(V2_ENV,'owner',access,YEAR);
  expect(done.status).toBe(200);expect(done.body.chapters.map(c=>c.key)).toEqual(keys());
  expect(generate).toHaveBeenCalledTimes(4);
  for(const call of generate.mock.calls.slice(1))expect(requestedKeys(call[1])).toEqual(['finalMessage']);
});

test('invented evidence ids are filtered on the last attempt instead of failing',async()=>{
  generate.mockResolvedValue(full({moneyCareer:chapter('moneyCareer',GOOD.repeat(10),['unknown'])}));
  await store.readOrGenerateSibyl(V2_ENV,'owner',access,YEAR);
  const done=await store.readOrGenerateSibyl(V2_ENV,'owner',access,YEAR);
  expect(done.status).toBe(200);
  expect(done.body.chapters.find(c=>c.key==='moneyCareer').evidenceIds).toEqual(['annual']);
});

test('a slow first call leaves no time for a repair call in the same request',async()=>{
  let now=1_000_000;jest.spyOn(Date,'now').mockImplementation(()=>now);
  generate.mockImplementation(async()=>{now+=55000;return full({coreMatrix:chapter('coreMatrix','반드시 '+GOOD.repeat(10))});});
  const res=await store.readOrGenerateSibyl(V2_ENV,'owner',access,YEAR);
  expect(res.status).toBe(202);expect(generate).toHaveBeenCalledTimes(1);
  expect(generate.mock.calls[0][2].timeoutMs).toBe(60000);
  generate.mockImplementation(async()=>reply([chapter('coreMatrix')]));
  const next=await store.readOrGenerateSibyl(V2_ENV,'owner',access,YEAR);
  expect(next.status).toBe(200);
  const repairTimeout=generate.mock.calls[1][2].timeoutMs;
  expect(repairTimeout).toBeGreaterThan(0);expect(repairTimeout).toBeLessThanOrEqual(60000);
});

test('provider failure keeps saved chapters; an empty body still fails retryably without delivery',async()=>{
  generate.mockResolvedValueOnce({ok:false});
  await expect(store.readOrGenerateSibyl(V2_ENV,'owner',access,YEAR)).rejects.toThrow('SIBYL_GENERATION_UNAVAILABLE');
  expect(row().status).toBe('failed');expect(row().premiumStatus).toBe('failed');
  generate.mockResolvedValueOnce(full({yearlyFlow:null})).mockResolvedValueOnce({ok:false});
  const partial=await store.readOrGenerateSibyl(V2_ENV,'owner',access,YEAR);
  expect(partial.status).toBe(202);
  expect(Object.values(row().metadata.sibylDelivery.chapters).filter(c=>c.valid)).toHaveLength(9);
});

// HEAD 57ef6d518의 generateSibylCounsel 프롬프트(YEAR 기준)에서 잰 값.
const SIBYL_V1_PROMPT_SHA256='39e622558808d1442acc1d2acb34c877e5c72298140f7fcfbafa376afeb58179';

test('native birth purchase keeps both years independent from web and rereads completed chapters',async()=>{
  generate.mockResolvedValue(full());
  const id='a'.repeat(64);
  const native={...access,tossIntentId:id,purchaseEvidence:{orderId:'mock-toss',paymentId:'mock-toss'}};
  const first=await store.readOrGenerateSibyl(V2_ENV,'owner',native,YEAR);
  const repeat=await store.readOrGenerateSibyl(V2_ENV,'owner',native,YEAR);
  expect(repeat.body).toEqual(first.body);
  expect(generate).toHaveBeenCalledTimes(1);
  const second=await store.readOrGenerateSibyl(V2_ENV,'owner',native,YEAR+1);
  const web=await store.readOrGenerateSibyl(V2_ENV,'owner',access,YEAR);
  expect(first.body.reportId).toBe('toss-sibyl:'+id+':'+YEAR);
  expect(second.body.reportId).toBe('toss-sibyl:'+id+':'+(YEAR+1));
  expect(web.body.reportId).toMatch(/^sibyl:/);
  expect(rows.size).toBe(3);
  expect(generate).toHaveBeenCalledTimes(3);
});
