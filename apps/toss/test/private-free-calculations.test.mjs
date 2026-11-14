import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundled=await build({entryPoints:[new URL('../private-simulation/free-calculations.mjs',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1')],bundle:true,write:false,platform:'node',format:'esm'});
const {privatePublicCalculation,privateOwnedCalculation}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const now=()=>new Date('2026-11-14T00:00:00Z');
const call=(handler,path,body,state={profiles:[]})=>{const url=new URL('https://private.invalid'+path),request=new Request(url,{method:body===undefined?'GET':'POST',...(body===undefined?{}:{body:JSON.stringify(body)})});return handler===privatePublicCalculation?handler(request,url,path,now):handler(request,url,path,state,now);};

test('public calculations do not accept owned-profile routes or turn unknown services into samples',async()=>{
 for(const path of ['/nakshatra/compat','/nakshatra/lord-report','/today-hub','/charts/astrology','/native/unknown'])assert.equal(await call(privatePublicCalculation,path,{}),null);
 const publicChart=await call(privatePublicCalculation,'/charts/vedic',{birth:{date:{timeUnknown:false}}});assert.equal(publicChart.status,200);
 assert.equal((await call(privatePublicCalculation,'/charts/vedic',{birth:{date:{timeUnknown:true}}})).status,400);
});
test('saved-profile deterministic reports reject another account profile and create no orders',async()=>{
 const state={profiles:[{profileId:'owned'}],orders:new Map()};
 for(const path of ['/nakshatra/muhurta','/nakshatra/vvip-codex','/nakshatra/lord-report','/nakshatra/dasha-map'])assert.equal((await call(privateOwnedCalculation,path,{profileId:'other'},state)).status,404);
 assert.equal((await call(privateOwnedCalculation,'/today-hub',{profileId:'other',period:'today'},state)).status,404);
 assert.equal((await call(privateOwnedCalculation,'/canonical/fpti/deep-report/free',{profileId:'other',birthInput:{}},state)).status,404);
 assert.equal(state.orders.size,0);
});
test('free tarot rejects an unknown flow rather than buying or invoking a model',async()=>{
 const result=await call(privatePublicCalculation,'/tarot-library/free',{flowId:'unknown',input:{}});assert.equal(result.status,400);
 assert.equal((await result.json()).error,'TAROT_LIBRARY_FLOW_INVALID');
});
