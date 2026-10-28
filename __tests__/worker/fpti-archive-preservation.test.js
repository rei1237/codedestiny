/** @jest-environment node */
import { jest } from '@jest/globals';
const original={title:'과거 FPTI 원본',chapters:[{title:'옛 챕터',sections:[{body:'구매 당시 보관한 상담문'}]}],meta:{schemaVersion:'old'}};
const findOne=jest.fn(()=>({sort:()=>({lean:async()=>({metadata:{archive:original},createdAt:new Date('2025-01-01')})})}));
const write=jest.fn(()=>{throw new Error('Archive reread must not write');});
jest.unstable_mockModule('../../worker/lib/auth.js',()=>({requireAuth:async()=>({userId:'owner'})}));
jest.unstable_mockModule('../../worker/lib/access-control.js',()=>({requirePremiumReportAccess:async()=>({ok:true})}));
jest.unstable_mockModule('../../worker/lib/db.js',()=>({connectDb:async()=>{}}));
jest.unstable_mockModule('../../worker/lib/models.js',()=>({ServiceExecutionTransaction:{findOne,findOneAndUpdate:write}}));
let handleFptiRoutes;
beforeAll(async()=>{({handleFptiRoutes}=await import('../../worker/routes/fpti.js'));});
test.each(['GET','POST'])('old purchased FPTI remains readable via %s without regeneration',async(method)=>{
 const url='https://test.local/api/fpti/deep-report'+(method==='GET'?'?profileId=p1&reportSignature=old':'');
 const req=new Request(url,{method,...(method==='POST'?{headers:{'Content-Type':'application/json'},body:JSON.stringify({profileId:'p1',reportSignature:'old',code:'MLBR',result:{code:'MLBR'}})}:{})});
 const response=await handleFptiRoutes(req,{});expect(response.status).toBe(200);
 const payload=await response.json();expect(payload.data.report.chapters).toEqual(original.chapters);expect(payload.data.report.meta).toEqual(original.meta);expect(write).not.toHaveBeenCalled();
 expect(findOne).toHaveBeenLastCalledWith(expect.objectContaining({userId:'owner',executionKey:'fpti-deep:old'}));
});
