/** @jest-environment node */
import { jest } from '@jest/globals';
const UID='507f1f77bcf86cd799439011', read=jest.fn(async()=>({accountId:UID})),settle=jest.fn(async()=>({granted:true})),school=jest.fn(async()=>({verified:false})),connect=jest.fn();
let handle;
beforeAll(async()=>{
 await jest.unstable_mockModule('../../worker/lib/db.js',()=>({connectDb:connect}));
 await jest.unstable_mockModule('../../worker/lib/auth.js',()=>({requireUserFromRequest:jest.fn(async()=>({userId:UID})),isMobileAppAuthRequest:()=>false}));
 await jest.unstable_mockModule('../../worker/lib/activation-rewards.js',()=>({readActivationRewards:read,startFreeSajuTutorial:settle,settleActivationReward:settle}));
 await jest.unstable_mockModule('../../worker/lib/snu-campus.js',()=>({claimSnulifeCode:school,readSnuCampus:school,requestSnuVerification:school,verifySnuEmail:school,unlockSnuSaju:school}));
 ({handleActivationRewardRoutes:handle}=await import('../../worker/routes/activation-rewards.js'));
});
beforeEach(()=>jest.clearAllMocks());
const request=(path,init={})=>new Request('https://example.com/api/activation-rewards/'+path,init);
test.each([undefined,'https://evil.com'])('mutation origin %s is denied before accessing DB',async(origin)=>{const r=await handle(request('first-paid/claim',{method:'POST',headers:origin?{Origin:origin}:{},body:'{}'}),{});expect(r.status).toBe(403);expect(connect).not.toHaveBeenCalled();expect(settle).not.toHaveBeenCalled();});
test('GET status is private and bound to authenticated user',async()=>{const r=await handle(request('status'),{});expect(r.status).toBe(200);expect(r.headers.get('cache-control')).toContain('no-store');expect(read).toHaveBeenCalledWith(UID);});
test('client userId cannot select another reward recipient',async()=>{const r=await handle(request('first-paid/claim',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:JSON.stringify({userId:'other'})}),{});expect(r.status).toBe(200);expect(settle.mock.calls[0][0]).toBe(UID);});
test('GET cannot grant rewards',async()=>{expect((await handle(request('tutorial/complete'),{})).status).toBe(405);expect(connect).not.toHaveBeenCalled();});

test('code redemption uses authenticated account',async()=>{const r=await handle(request('snu/code',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:JSON.stringify({code:'test-code',userId:'other'})}),{});expect(r.status).toBe(200);expect(school).toHaveBeenCalledWith(UID,'test-code',{});});
