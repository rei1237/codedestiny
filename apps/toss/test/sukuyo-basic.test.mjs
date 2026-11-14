import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Module} from 'node:module';
import path from 'node:path';
import {buildSukuyoFromMoonLongitude} from '../../../worker/lib/sukuyo-coordinate.js';
const root=path.resolve(import.meta.dirname,'../../..');process.chdir(root);
const bundled=await build({entryPoints:[path.join(root,'worker/toss/sukuyo-basic.js')],bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const loaded=new Module(path.join(root,'toss-sukuyo-basic-test.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(bundled.outputFiles[0].text,loaded.id);
const {calculateTossSukuyoBasic:calculate,projectSukuyoPublicReading:project}=loaded.exports;
const birth={gender:'F',date:{year:1997,month:2,day:10,hour:14,minute:30,timeUnknown:false,calType:'solar'},location:{label:'서울',lat:37.5665,lng:126.978,tz:'Asia/Seoul'}};
test('public basic Sukuyo uses the original verified natal route and returns only dashboard fields',async()=>{
 const result=await calculate({birth},{});assert.equal(result.stored,false);assert.match(result.mansion,/\(.+\)/);assert.match(result.engineVersion,/imd/);
 assert.deepEqual(Object.keys(result.reading).sort(),['dailyPrescription','guardian','hero','relationMiniMap','summaryCards']);assert.deepEqual(Object.keys(result.canonical).sort(),['lunarPhase','natalSukuyo','sukuyoAttributes','validation']);assert.doesNotMatch(JSON.stringify(result),/1997|37\.5665|126\.978|moonProfile|loveProfile|workMoney|emotionRhythm/);
});
test('all 27 original lunar sectors project their matching dashboard without disclosing birth metadata',()=>{
 for(let i=0;i<27;i++){const natal=buildSukuyoFromMoonLongitude((i+.5)*360/27,{lunarYear:1997,lunarMonth:1,lunarDay:4,birthTimeKnown:true});const result=project(natal);assert.equal(result.mansionIdx,natal.index);assert.equal(result.canonical.natalSukuyo.index,natal.index);assert.equal(result.reading.summaryCards.length,4);}
 assert.throws(()=>project({index:0,moonEclipticLongitude:15}),e=>e.code==='SUKUYO_CHART_UNAVAILABLE');
});
test('regular and leap lunar input preserve the same web natal result as their canonical solar dates',async()=>{
 for(const [calType,month,day] of [['lunar',4,23],['lunar_leap',5,23]]){const lunar=await calculate({birth:{...birth,date:{...birth.date,year:2020,month:4,day:1,calType}}},{}),solar=await calculate({birth:{...birth,date:{...birth.date,year:2020,month,day,calType:'solar'}}},{});assert.equal(lunar.mansionIdx,solar.mansionIdx);}
 await assert.rejects(calculate({birth:{...birth,date:{...birth.date,year:2021,month:4,day:1,calType:'lunar_leap'}}},{}),e=>e.code==='SUKUYO_ASTRONOMY_FAILED');
});
test('unknown time goes to the original noon policy; identity fields and payment hints are never forwarded',async()=>{
 const unknown={...birth,date:{...birth.date,timeUnknown:true,hour:null,minute:null}};
 const natal=buildSukuyoFromMoonLongitude(15,{lunarYear:1997,lunarMonth:1,lunarDay:4,birthTimeKnown:false});
 const result=await calculate({birth:unknown,profileId:'other',orderId:'paid'}, {},{handler:async request=>{assert.equal(request.headers.get('Authorization'),null);const input=await request.json();assert.equal(input.birthTime,'');assert.equal(input.birthTimeUnknown,true);assert.equal(input.profileId,undefined);assert.equal(input.orderId,undefined);return Response.json({ok:true,astronomy:natal});}});assert.match(result.limitations.join(' '),/정오/);
 for(const status of [401,403,503])await assert.rejects(calculate({birth},{},{handler:async()=>Response.json({ok:false,code:'ACCESS_DENIED'},{status})}),e=>e.status===status&&e.code==='ACCESS_DENIED');
});
test('unknown time executes the original Swiss noon calculation using only local ephemeris files',async()=>{
 const {createServer}=await import('node:http'),{readFile}=await import('node:fs/promises');
 const allowed=new Set(['seas_18.se1','semo_18.se1','sepl_18.se1','sefstars.txt']);
 const server=createServer(async(req,res)=>{const name=path.basename(new URL(req.url,'http://localhost').pathname);if(!allowed.has(name)){res.writeHead(404).end();return;}try{res.writeHead(200).end(await readFile(path.join(root,'public/ephe',name)));}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{const unknown={...birth,date:{...birth.date,timeUnknown:true,hour:null,minute:null}};const result=await calculate({birth:unknown},{SWISS_EPHEMERIS_FILES_BASE_URL:'http://127.0.0.1:'+server.address().port+'/ephe'});assert.match(result.limitations.join(' '),/정오/);assert.match(result.mansion,/\(.+\)/);assert.equal(result.stored,false);}finally{await new Promise(resolve=>server.close(resolve));}
});
