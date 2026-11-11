/** @jest-environment node */
import { jest } from '@jest/globals';
import { TEST_USER_ID, OTHER_USER_ID, testCard, profileCardModel } from '../fixtures/profile-card-model.mjs';
import { HttpError } from '../../worker/lib/http.js';
import { buildSukuyoFromMoonLongitude } from '../../worker/lib/sukuyo-coordinate.js';
const auth=jest.fn(),payment=jest.fn(),write=jest.fn(()=>{throw Error('free calculation wrote a paid archive');});
const cards=profileCardModel([testCard('p1'),testCard('x1',{userId:OTHER_USER_ID})]);
const profile=jest.fn((...args)=>cards.findOne(...args));const archive=jest.fn();const astronomy=jest.fn();let route;
beforeAll(async()=>{
 const db=await import('../../worker/lib/db.js'),models=await import('../../worker/lib/models.js');
 jest.unstable_mockModule('../../worker/lib/db.js',()=>({...db,connectDb:async()=>{},withMongoRetry:async(_e,fn)=>fn()}));
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({requireAuth:auth,getOptionalUserFromRequest:auth,resolvePaidRouteAuth:auth}));
 jest.unstable_mockModule('../../worker/lib/access-control.js',()=>({requirePremiumReportAccess:payment}));
 jest.unstable_mockModule('../../worker/lib/sukuyo-astronomy.js',()=>({calculateSukuyoForMoment:astronomy}));
 jest.unstable_mockModule('../../worker/lib/models.js',()=>({...models,ProfileCard:{findOne:profile},ServiceExecutionTransaction:{findOne:archive,findOneAndUpdate:write},User:{findById:write}}));
 ({handleSukuyoRoutes:route}=await import('../../worker/routes/sukuyo.js'));
});
beforeEach(()=>{jest.clearAllMocks();auth.mockReset().mockResolvedValue({userId:TEST_USER_ID});payment.mockReset().mockRejectedValue(new Error('free calculation called payment'));
 astronomy.mockReset().mockImplementation(async(_e,input)=>buildSukuyoFromMoonLongitude(input.day===17?150:190));
 archive.mockReset().mockImplementation(()=>{const q={sort:()=>q,lean:async()=>null};return q;});});
const call=(patch={})=>route(new Request('https://example.test/api/sukuyo/past-life-reading',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profileId:'p1',partnerBirthDate:'1992-03-16',partnerName:'Partner',...patch})}),{});
test('new past-life report keeps owned profile input and produces static result without payment or archive write',async()=>{
 const r=await call({userBirthDate:'2001-01-01'});expect(r.status).toBe(200);const body=await r.json();expect(body.source).toBe('public');expect(body.data.pastLifeStory).toBeTruthy();
 expect(profile).toHaveBeenCalledWith({userId:TEST_USER_ID,profileId:'p1'});expect(archive.mock.calls[0][0].userId).toBe(TEST_USER_ID);expect(astronomy.mock.calls[0][1].year).not.toBe(2001);expect(payment).not.toHaveBeenCalled();expect(write).not.toHaveBeenCalled();
});
test('past-life still requires login and refuses another account profile',async()=>{auth.mockRejectedValueOnce(new HttpError(401,'login'));expect((await call()).status).toBe(401);const r=await call({profileId:'x1'});expect(r.status).toBe(404);expect(astronomy).not.toHaveBeenCalled();expect(payment).not.toHaveBeenCalled();expect(write).not.toHaveBeenCalled();});
test('owner archive returns original result without new calculation or payment',async()=>{
 const saved={title:'original',pastLifeStory:'immutable saved result'};archive.mockImplementation(()=>{const q={sort:()=>q,lean:async()=>({metadata:{archive:{result:saved}}})};return q;});
 const r=await call();expect((await r.json()).data).toEqual(saved);expect(archive.mock.calls[0][0].userId).toBe(TEST_USER_ID);expect(astronomy).not.toHaveBeenCalled();expect(write).not.toHaveBeenCalled();
});
test('archive-only misses remain private 404 without new generation',async()=>{expect((await call({archiveOnly:true})).status).toBe(404);expect(astronomy).not.toHaveBeenCalled();expect(write).not.toHaveBeenCalled();});
