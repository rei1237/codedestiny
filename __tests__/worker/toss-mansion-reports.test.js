/** @jest-environment node */
let readOwnedMansionReport;
beforeAll(async()=>{({readOwnedMansionReport}=await import('../../worker/toss/mansion-reports.js'));});
const request=new Request('https://code-destiny.com/api/toss/nakshatra/muhurta',{method:'POST'});
const auth={ownerId:'owner-A'};
const doc={profileId:'card',gender:'M',birth:{year:1990,month:1,day:1,timeUnknown:true,calType:'lunar'},location:{lat:37.5,lng:127,tz:'Asia/Seoul'}};
const findProfile=async query=>query.userId===auth.ownerId&&query.profileId==='card'?doc:null;

test.each(['muhurta','vvip-codex'])('uses only the authenticated person’s birth for %s, converts lunar to solar and preserves unknown hour',async kind=>{
  let captured;
  const read=async(_request,_env,owner,payload)=>{captured={owner,payload};return Response.json({ok:true,report:{}});};
  await readOwnedMansionReport(request,{},auth,kind,{profileId:'card',purpose:'moving',startDate:'2026-11-14',year:2000,timezone:0,userId:'other'},{findProfile,read});
  expect(captured.owner).toEqual({userId:'owner-A'});
  expect(captured.payload).toMatchObject({year:1990,month:1,day:27,hour:12,timeUnknown:true,timezone:9,gender:'male'});
});
test('cross-account profile id never reaches either engine',async()=>{
  let invoked=false;
  await expect(readOwnedMansionReport(request,{},{ownerId:'owner-B'},'muhurta',{profileId:'card'},{findProfile,read:()=>{invoked=true;}})).rejects.toMatchObject({status:404});
  expect(invoked).toBe(false);
});
