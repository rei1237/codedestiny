/** @jest-environment node */
import { jest } from '@jest/globals';
import { readFreeFpti, fptiCardBirthInput } from '../../worker/lib/fpti-free-access.js';
const card = {profileId:'mine',birth:{year:1990,month:5,day:4,hour:9,minute:30,calType:'solar',timeUnknown:false},location:{label:'Seoul'},gender:'OTHER'};
function storeFor(owned = card) { return {findProfile:jest.fn(async ({userId,profileId})=>userId==='owner'&&profileId==='mine'?owned:null),analyze:jest.fn(async input=>({code:'TEST',birth:input})),buildReport:jest.fn(result=>({result})),save:jest.fn(()=>{throw Error('No free writes')})}; }
const request=()=>({userId:'owner',profileId:'mine',birthInput:fptiCardBirthInput(card)});
test('free FPTI calculates from owned card without payment, archive, or writes',async()=>{
 const store=storeFor(); const out=await readFreeFpti({...request(),result:{code:'FORGED'},reportSignature:'other-result'},store);
 expect(out).toMatchObject({source:'public',accessSource:'public',featureKey:'premium-fpti-report',profileId:'mine',saved:false});
 expect(store.findProfile).toHaveBeenCalledWith({userId:'owner',profileId:'mine'});
 expect(store.analyze).toHaveBeenCalledWith({...fptiCardBirthInput(card),name:'',gender:'OTHER',birthRegion:'Seoul'});
 expect(out.report.result.code).toBe('TEST');expect(store.save).not.toHaveBeenCalled();
});
test.each([{userId:''},{userId:'other'},{profileId:'other'},{profileId:''}])('rejects missing authentication or unowned profile %j',async patch=>{const store=storeFor();await expect(readFreeFpti({...request(),...patch},store)).rejects.toThrow();expect(store.analyze).not.toHaveBeenCalled();});
test.each([{birthDate:'1991-05-04'},{birthTime:'10:30'},{birthTimeUnknown:true},{calendarType:'lunar'}])('rejects mismatched owned-profile input %j',async patch=>{const store=storeFor();await expect(readFreeFpti({...request(),birthInput:{...request().birthInput,...patch}},store)).rejects.toMatchObject({status:409,payload:{code:'PROFILE_INPUT_MISMATCH'}});expect(store.analyze).not.toHaveBeenCalled();});
test('unknown birth time and leap calendar retain exact profile meaning',async()=>{const lunar={...card,birth:{...card.birth,calType:'lunar_leap',timeUnknown:true}};const store=storeFor(lunar);await readFreeFpti({...request(),birthInput:fptiCardBirthInput(lunar)},store);expect(store.analyze.mock.calls[0][0]).toMatchObject({calendarType:'lunar_leap',birthTime:'',birthTimeUnknown:true});});

test('representative owned birth uses the real deterministic FPTI adapter',async()=>{
 const { buildSync } = await import('esbuild');
 const { createRequire } = await import('node:module');
 const output = buildSync({entryPoints:['lib/fpti/fpti-adapter.ts'],bundle:true,write:false,platform:'node',format:'cjs'}).outputFiles[0].text;
 const shim={exports:{}};
 new Function('module','exports','require',output)(shim,shim.exports,createRequire(import.meta.url));
 const analyze=shim.exports.analyzeFptiFromBirth;
 const expected=await analyze({...fptiCardBirthInput(card),name:'',gender:'OTHER',birthRegion:'Seoul'});
 const store=storeFor();store.analyze=analyze;store.buildReport=result=>result;
 const out=await readFreeFpti({...request(),result:{code:'FORGED'}},store);
 expect(out.report.code).toBe(expected.code);expect(out.report.axisScores).toEqual(expected.axisScores);
 expect(out.report.source.pillars).toEqual(expected.source.pillars);
 expect(out.report.code).not.toBe('FORGED');expect(out.saved).toBe(false);expect(store.save).not.toHaveBeenCalled();
});
