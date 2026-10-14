/** @jest-environment node */
import { jest } from '@jest/globals';
import { kstYear, buildSibylAnnual } from '../../worker/lib/sibyl-annual.js';
const generate=jest.fn();const rows=new Map();let failSave=false;
const key=q=>q.userId+':'+q.executionKey;
const copy=v=>v?structuredClone(v):v;
function set(doc,values){for(const [path,value] of Object.entries(values||{})){const parts=path.split('.');let at=doc;while(parts.length>1){const k=parts.shift();at[k]||={};at=at[k];}at[parts[0]]=value;}}
const updateOne=jest.fn(async(q,update,options)=>{let row=rows.get(key(q));if(!row&&options?.upsert){row=copy(update.$setOnInsert);rows.set(key(q),row);}if(row&&(!q['lock.token']||row.lock?.token===q['lock.token']))set(row,update.$set);return {modifiedCount:1};});
const findOneAndUpdate=jest.fn((q,update)=>({lean:async()=>{
  const row=rows.get(key(q));if(!row)return null;
  if(q['lock.token']&&row.lock?.token!==q['lock.token'])return null;
  if(q.status&&row.status!==q.status)return null;
  if(q.$or&&row.lock?.until&&row.lock.until>new Date())return null;
  if(failSave&&update.$set.status==='success')throw new Error('mock save failure');
  set(row,update.$set);return copy(row);
}}));
jest.unstable_mockModule('../../worker/lib/db.js',()=>({connectDb:jest.fn()}));
jest.unstable_mockModule('../../worker/lib/models.js',()=>({ServiceExecutionTransaction:{findOne:q=>({lean:async()=>copy(rows.get(key(q)))}),updateOne,findOneAndUpdate}}));
jest.unstable_mockModule('../../worker/lib/structured-consultation.js',()=>({callGeminiJsonWithRetry:generate}));
jest.unstable_mockModule('../../worker/lib/paid-result-revocation.js',()=>({isStoredPaidResultRevoked:async(_u,_f,r)=>['refunded','cancelled'].includes(r.status)}));
let readOrGenerateSibyl,validateSibylCounsel,SIBYL_CHAPTERS;
beforeAll(async()=>{({readOrGenerateSibyl,validateSibylCounsel,SIBYL_CHAPTERS}=await import('../../worker/lib/sibyl-report-store.js'));});
const access={card:{profileId:'p1',gender:'M',birth:{year:1990,month:5,day:17,hour:9,minute:30,calType:'solar'}},birth:{date:'1990-05-17',time:'09:30',timeKnown:true,gender:'M'}};
const fixture=()=>({chapters:SIBYL_CHAPTERS.map(([key])=>({key,content:'중요한 약속을 앞두고 일정과 역할을 확인하세요. 지금의 선택을 돌아보고 필요한 조건이 갖춰지면 실행 범위를 조정하세요. '.repeat(10),evidenceIds:['annual']}))});
beforeEach(()=>{rows.clear();failSave=false;jest.clearAllMocks();generate.mockResolvedValue({ok:true,text:JSON.stringify(fixture()),model:'mock'});});
test('complete only after durable save, immutable reread without another AI call',async()=>{
 const first=await readOrGenerateSibyl({},'owner',access,kstYear());
 expect(first.status).toBe(200);expect(first.body.chapters).toHaveLength(10);expect(first.body.recordsHref).toContain('/records/view/');
 const next=await readOrGenerateSibyl({},'owner',access,kstYear());expect(next.body).toEqual(first.body);expect(generate).toHaveBeenCalledTimes(1);
 expect([...rows.values()][0].retentionUntil).toBeNull();expect([...rows.values()][0].status).toBe('success');
});
test('same birth across saved profile IDs shares archive; different owner never shares it',async()=>{
 const a=await readOrGenerateSibyl({},'owner',access,kstYear());
 const b=await readOrGenerateSibyl({},'owner',{...access,card:{...access.card,profileId:'p2'}},kstYear());expect(b.body.reportId).toBe(a.body.reportId);expect(generate).toHaveBeenCalledTimes(1);
 await readOrGenerateSibyl({},'other',access,kstYear());expect(generate).toHaveBeenCalledTimes(2);
});
test('concurrent request returns in-progress without purchasing another generation',async()=>{
 let release;generate.mockImplementation(()=>new Promise(resolve=>{release=resolve;}));
 const first=readOrGenerateSibyl({},'owner',access,kstYear());
 while(!release)await new Promise(resolve=>setTimeout(resolve,0));
 const second=await readOrGenerateSibyl({},'owner',access,kstYear());expect(second.status).toBe(202);expect(generate).toHaveBeenCalledTimes(1);
 release({ok:true,text:JSON.stringify(fixture())});expect((await first).status).toBe(200);
});
test('generation and storage failures never claim delivery',async()=>{
 generate.mockResolvedValueOnce({ok:false});await expect(readOrGenerateSibyl({},'owner',access,kstYear())).rejects.toThrow('SIBYL_GENERATION_UNAVAILABLE');
 expect([...rows.values()][0].premiumStatus).toBe('failed');
 failSave=true;await expect(readOrGenerateSibyl({},'owner',access,kstYear())).rejects.toThrow('mock save failure');expect([...rows.values()][0].status).not.toBe('success');
});
test('year identity isolates snapshots and revoked archive cannot regenerate',async()=>{
 const a=await readOrGenerateSibyl({},'owner',access,kstYear());const b=await readOrGenerateSibyl({},'owner',access,kstYear()+1);expect(a.body.reportId).not.toBe(b.body.reportId);
 [...rows.values()][0].status='refunded';expect((await readOrGenerateSibyl({},'owner',access,kstYear())).status).toBe(403);expect(generate).toHaveBeenCalledTimes(2);
});
test('unsupported dates, invented evidence and missing chapters are rejected',()=>{
 const analysis=buildSibylAnnual(access.birth,kstYear());
 let f=fixture();f.chapters[0].content+='2030년 3월에';expect(()=>validateSibylCounsel(f,analysis)).toThrow();
 f=fixture();f.chapters[0].content+='삼월에는 갑목의 기질이 나타납니다.';expect(()=>validateSibylCounsel(f,analysis)).toThrow();
 f=fixture();f.chapters[0].evidenceIds=['unknown'];expect(()=>validateSibylCounsel(f,analysis)).toThrow();
 f=fixture();f.chapters.pop();expect(()=>validateSibylCounsel(f,analysis)).toThrow();
});
