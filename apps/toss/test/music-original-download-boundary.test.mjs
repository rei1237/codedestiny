import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Module} from 'node:module';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../../..'),state={licenseType:'license',fetches:0};globalThis.__musicOriginal=state;
const out=await build({stdin:{contents:"export {handleMusicRoutes} from './worker/routes/music.js';export {bindNativeTossRequest} from './worker/toss/native-context.js';",resolveDir:root},bundle:true,format:'cjs',platform:'node',write:false,plugins:[{name:'offline-web-auth',setup(b){
 b.onLoad({filter:/worker[\\/]lib[\\/]auth\.js$/},()=>({contents:"export const getOptionalUserFromRequest=async()=>({userId:'web-owner'});"}));
 b.onLoad({filter:/worker[\\/]lib[\\/]paid-feature-access\.js$/},()=>({contents:"export const PAID_FEATURE_ACCESS_USER_PROJECTION={};export const canAccessPaidFeaturesBatch=async(u,keys)=>Object.fromEntries(keys.map(key=>[key,{allowed:true,licenseType:globalThis.__musicOriginal.licenseType}]));"}));
 b.onLoad({filter:/worker[\\/]lib[\\/]http\.js$/},()=>({contents:"export const getRoutePath=(r,p)=>new URL(r.url).pathname.slice(p.length),json=(v,o)=>Response.json(v,o),methodNotAllowed=()=>new Response(null,{status:405}),notFound=()=>new Response(null,{status:404}),handleRouteError=()=>new Response(null,{status:500});"}));
}}]});
const m=new Module(path.join(root,'music-original.cjs'));m._compile(out.outputFiles[0].text,m.id);const {handleMusicRoutes,bindNativeTossRequest}=m.exports;
test('web license and monthly coverage never grant MP3; single purchase and server-bound native access preserve original file response',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async()=>{state.fetches++;return new Response(new Uint8Array([73,68,51]),{headers:{'Set-Cookie':'not-forwarded'}});};
 const url='https://local.invalid/api/music/download?key=yeonisong%2Ftest.mp3';
 try{for(const licenseType of ['license','license_pass','monthly_subscription']){state.licenseType=licenseType;const response=await handleMusicRoutes(new Request(url,{headers:{'X-Toss-Music-Access':'true'}}),{});assert.equal(response.status,402);}assert.equal(state.fetches,0);
 state.licenseType='single_purchase';assert.equal((await handleMusicRoutes(new Request(url),{})).status,200);
 state.licenseType='license';let checks=0;const request=bindNativeTossRequest(new Request(url),{musicDownload:async input=>{checks++;assert.equal(input.key,'yeonisong/test.mp3');return {audioSourceKey:input.key,hasFullAccess:true,canDownload:true};}});
 const response=await handleMusicRoutes(request,{});assert.equal(response.status,200);assert.equal(checks,1);assert.equal(response.headers.get('set-cookie'),null);assert.match(response.headers.get('content-disposition'),/attachment/);assert.equal(response.headers.get('content-type'),'audio/mpeg');assert.equal(state.fetches,2);
 }finally{globalThis.fetch=previous;}
});
