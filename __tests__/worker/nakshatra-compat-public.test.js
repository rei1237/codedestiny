/** @jest-environment node */
import { jest } from '@jest/globals';
import { HttpError } from '../../worker/lib/http.js';
import { buildSukuyoFromMoonLongitude } from '../../worker/lib/sukuyo-coordinate.js';
const auth=jest.fn(),saved=jest.fn(),swiss=jest.fn();let route;
beforeAll(async()=>{
 jest.unstable_mockModule('../../worker/lib/auth.js',()=>({requireAuth:auth}));
 jest.unstable_mockModule('../../worker/lib/swiss-ephemeris.js',()=>({getSwissVedicPlanets:swiss}));
 const evidence=await import('../../worker/lib/nakshatra-birth-evidence.js');
 jest.unstable_mockModule('../../worker/lib/nakshatra-birth-evidence.js',()=>({...evidence,buildNakshatraBirthEvidence:async()=>({japaneseSukuyo:buildSukuyoFromMoonLongitude(150),uncertainty:{}})}));
 jest.unstable_mockModule('../../worker/lib/nakshatra-compat-delivery.js',()=>({deliverNakshatraCompat:saved}));
 ({handleNakshatraRoutes:route}=await import('../../worker/routes/nakshatra.js'));
});
beforeEach(()=>{jest.clearAllMocks();auth.mockReset().mockResolvedValue({userId:'owner'});swiss.mockReset().mockResolvedValue({planets:{Moon:150}});saved.mockReset().mockImplementation(async()=>new Response(JSON.stringify({ok:false,code:'RESULT_NOT_FOUND'}),{status:404}));});
const birth={year:1990,month:5,day:17,hour:12,minute:0,timezone:9,lat:37.5,lon:127};
const call=(body={a:birth,b:{...birth,year:1992}},method='POST')=>route(new Request('https://example.test/api/nakshatra/compat'+(method==='GET'?'?resultId=nak-compat:abc':''),{method,...(method==='POST'?{body:JSON.stringify(body),headers:{'Content-Type':'application/json'}}:{})}),{});
test('new authenticated explicit pair uses real static builder and never enters paid saved delivery',async()=>{const r=await call();expect(r.status).toBe(200);const body=await r.json();expect(body.india).toBeTruthy();expect(auth).toHaveBeenCalledTimes(1);expect(swiss).toHaveBeenCalledTimes(2);expect(saved).not.toHaveBeenCalled();});
test('login is still mandatory before calculation',async()=>{auth.mockRejectedValue(new HttpError(401,'login'));expect((await call()).status).toBe(401);expect(swiss).not.toHaveBeenCalled();expect(saved).not.toHaveBeenCalled();});
test('malformed pair does not enter calculation or paid delivery',async()=>{expect((await call({a:{},b:birth})).status).toBe(400);expect(swiss).not.toHaveBeenCalled();expect(saved).not.toHaveBeenCalled();});
test.each(['POST','GET'])('%s saved result still enters the owner-scoped original delivery path',async method=>{expect((await call({resumeResultId:'nak-compat:abc'},method)).status).toBe(404);expect(saved).toHaveBeenCalledWith({}, {userId:'owner'},expect.objectContaining({resumeResultId:'nak-compat:abc'}),expect.any(Function));expect(swiss).not.toHaveBeenCalled();});
