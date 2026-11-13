/** @jest-environment node */
import {readTodayHub} from '../../worker/toss/today-hub.js';

const url='https://code-destiny.com/api/toss/today-hub';
const auth={ownerId:'owner-a'};
const profile={userId:'owner-a',profileId:'card-a',gender:'M',birth:{year:1993,month:2,day:10,timeUnknown:true,calType:'lunar_leap'}};
const findProfile=async query=>query.userId===profile.userId&&query.profileId===profile.profileId?profile:null;

test('a selected profile supplies only its owner’s actual birth fields to the original engine',async()=>{
 let incoming;
 const readFortune=async request=>{incoming=new URL(request.url);return Response.json({ok:true});};
 await readTodayHub({},auth,{period:'tomorrow',profileId:'card-a',birth:'1901-01-01',userId:'other'},url,{findProfile,readFortune});
 expect(incoming.pathname).toBe('/api/fortune/today-hub');
 expect(Object.fromEntries(incoming.searchParams)).toEqual({period:'tomorrow',detail:'1',locale:'ko',birth:'1993-02-10',cal:'lunar_leap',gender:'male'});
});
test('a different account cannot reuse a known profile ID and cannot invoke the engine',async()=>{
 let calls=0;
 const readFortune=()=>{calls++;};
 await expect(readTodayHub({},{ownerId:'other'},{profileId:'card-a'},url,{findProfile,readFortune})).rejects.toMatchObject({status:404});
 expect(calls).toBe(0);
});
test('date-only mode cannot use injected birth or account fields',async()=>{
 let incoming;
 await readTodayHub({},auth,{birth:'2000-12-01',ownerId:'other'},url,{findProfile,readFortune:async request=>{incoming=new URL(request.url);return Response.json({ok:true});}});
 expect([...incoming.searchParams.keys()]).toEqual(['period','detail','locale']);
});
