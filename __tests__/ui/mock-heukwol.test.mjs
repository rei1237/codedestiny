import test from 'node:test';
import assert from 'node:assert/strict';
import {createHeukwolMock,HEUKWOL_MOCK_PROFILE} from '../../scripts/fixtures/mock-heukwol.mjs';
test('opt-in Heukwol fixture drives 27 checkpoints and read-only archive replay',()=>{
 const run=createHeukwolMock(),input={profileId:HEUKWOL_MOCK_PROFILE.id,year:2027,question:'검증용 상담 질문입니다. 저장 결과를 다시 확인합니다.',requestId:'fixture-request'};
 const call=(route,body={},query=new URLSearchParams(),owner='mock-user')=>{let output;assert.equal(run(route,body,owner,(status,data)=>{output={status,data};},query),true);return output;};
 assert.equal(call('POST /api/heukwol/start',input,new URLSearchParams(),null).status,401);
 const prepared=call('POST /api/heukwol/prepare',input);assert.equal(prepared.status,200);assert.equal(prepared.data.id,undefined);
 let current=call('POST /api/heukwol/start',input).data;assert.equal(current.completedChapters,1);
 for(let i=1;i<27;i++)current=call('POST /api/heukwol/continue',{id:current.id}).data;
 assert.equal(current.status,'completed');assert.equal(current.report.chapters.length,27);
 const listed=call('GET /api/records').data;assert.equal(listed.items.length,1);
 const query=new URLSearchParams({source:'executions',id:current.id});
 assert.deepEqual(call('GET /api/records/detail',{},query).data.content,current.report);
 assert.deepEqual(call('GET /api/heukwol/result',{},query).data.report,current.report);
 assert.equal(call('POST /api/heukwol/start',input).data.completedChapters,27);
});

test('Heukwol mock activation is explicit and disabled in production', async()=>{
 const {createMockApiServer}=await import('../../scripts/mock-dev-api.mjs');
 const oldFlag=process.env.CD_MOCK_HEUKWOL_FLOW,oldMode=process.env.NODE_ENV;
 try {
  for(const [flag,mode,status] of [['','development',401],['1','production',401],['1','development',200]]){
   process.env.CD_MOCK_HEUKWOL_FLOW=flag;process.env.NODE_ENV=mode;
   const server=createMockApiServer();
   await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
   try {assert.equal((await fetch(`http://127.0.0.1:${server.address().port}/api/auth/me`)).status,status);}
   finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  }
 } finally {
  if(oldFlag===undefined)delete process.env.CD_MOCK_HEUKWOL_FLOW;else process.env.CD_MOCK_HEUKWOL_FLOW=oldFlag;
  if(oldMode===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=oldMode;
 }
});
