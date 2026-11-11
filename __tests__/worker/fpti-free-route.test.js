/** @jest-environment node */
import {jest} from '@jest/globals';
const card={profileId:'mine',birth:{year:1990,month:5,day:4,hour:9,minute:30,calType:'solar',timeUnknown:false}};
const auth=jest.fn(async()=>({userId:'owner'}));
const profile=jest.fn(({userId,profileId})=>({select:()=>({lean:async()=>userId==='owner'&&profileId==='mine'?card:null})}));
const forbidden=jest.fn(()=>{throw Error('Paid or archive path called');});
const analyze=jest.fn(async()=>({code:'MLBR',typeName:'Local',axisScores:{A:40,M:60,H:40,L:60,F:40,B:60,R:60,V:40}}));
jest.unstable_mockModule('../../worker/lib/auth.js',()=>({requireAuth:auth}));
jest.unstable_mockModule('../../worker/lib/db.js',()=>({connectDb:async()=>{}}));
jest.unstable_mockModule('../../worker/lib/access-control.js',()=>({requirePremiumReportAccess:forbidden}));
jest.unstable_mockModule('../../worker/lib/models.js',()=>({ProfileCard:{findOne:profile},ServiceExecutionTransaction:{findOne:forbidden,findOneAndUpdate:forbidden,updateOne:forbidden,create:forbidden}}));
jest.unstable_mockModule('../../lib/fpti/fpti-adapter.ts',()=>({analyzeFptiFromBirth:analyze}));
let handleFptiRoutes;beforeAll(async()=>{({handleFptiRoutes}=await import('../../worker/routes/fpti.js'));});
beforeEach(()=>jest.clearAllMocks());
const body={profileId:'mine',birthInput:{birthDate:'1990-05-04',birthTime:'09:30',birthTimeUnknown:false,calendarType:'solar'},result:{code:'FORGED'},reportSignature:'old-purchased'};
const req=payload=>new Request('https://test.local/api/fpti/deep-report/free',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
test('new public route returns complete static report without paid archive access or writes',async()=>{const r=await handleFptiRoutes(req(body),{});expect(r.status).toBe(200);const p=await r.json();expect(p.data).toMatchObject({source:'public',accessSource:'public',featureKey:'premium-fpti-report',profileId:'mine',saved:false});expect(p.data.report.chapters.length).toBeGreaterThan(0);expect(analyze).toHaveBeenCalledTimes(1);expect(forbidden).not.toHaveBeenCalled();});
test('foreign profile cannot be used even with an old result signature',async()=>{const r=await handleFptiRoutes(req({...body,profileId:'foreign'}),{});expect(r.status).toBeGreaterThanOrEqual(400);expect(analyze).not.toHaveBeenCalled();expect(forbidden).not.toHaveBeenCalled();});
test('mismatched birth is rejected before calculation',async()=>{const r=await handleFptiRoutes(req({...body,birthInput:{...body.birthInput,calendarType:'lunar'}}),{});expect(r.status).toBe(409);expect((await r.json()).code).toBe('PROFILE_INPUT_MISMATCH');expect(analyze).not.toHaveBeenCalled();expect(forbidden).not.toHaveBeenCalled();});
