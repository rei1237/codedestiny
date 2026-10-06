import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

// CMS is a build-time source. This test cannot access the network or production data.
const bundle=await build({entryPoints:['lib/lock-screen-content.ts'],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'local-cms',setup(b){b.onResolve({filter:/cms\/build-text$/},()=>({path:'cms',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const cmsLines=(a,b,c,fallback)=>fallback;'}));}}]});
const engine=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));

test('native public pools reproduce the web day and selected affirmation categories',()=>{
 for(const cats of [undefined,['core'],['courage'],['unknown-category']]) {
  const pools=engine.getPublicLockScreenPools(cats);
  assert.deepEqual(Object.keys(pools).sort(),['affirmation','quote']);
  for(let day=0;day<366;day++) {
   const now=new Date(Date.UTC(2026,0,1,14,59)+day*86400000);
   const web=engine.getDailyLockScreenContent(now,cats);
   const nativeDay=Math.floor((now.getTime()+9*3600000)/86400000);
   assert.equal(pools.quote[(nativeDay+5)%pools.quote.length],`${web.quote.text} — ${web.quote.author}`);
   assert.equal(pools.affirmation[(nativeDay+7)%pools.affirmation.length],web.affirmation);
  }
 }
});
