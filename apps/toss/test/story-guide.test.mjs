import test from 'node:test';
import assert from 'node:assert/strict';
import serviceCompat from '../service/vite-service.mjs';
import {quickGuideStories,guideGroups} from '../../../lib/brand/service-guide-webtoon.mjs';
import {consultationWebtoons} from '../../../lib/brand/consultation-webtoons.mjs';

for(const mode of ['production','private-simulation'])test('webtoon projection preserves original text and art contract: '+mode,async()=>{
 const plugin=serviceCompat();plugin.configResolved({mode});
 const ctx={addWatchFile(){}};
 const load=async(name)=>import('data:text/javascript;base64,'+Buffer.from(await plugin.load.call(ctx,plugin.resolveId(name))).toString('base64'));
 const guide=await load('virtual:service-guide');
 const consultation=await load('virtual:consultation-webtoons');
 assert.deepEqual(guide.guideGroups,guideGroups);
 const prefix=mode==='production'?'https://code-destiny.com':'/__story-art';
 assert.equal(consultation.coverDirectory,prefix+'/images/consultation-webtoons/covers/mobile/');
 for(const [original,actual] of [...quickGuideStories.map((s,i)=>[s,guide.quickGuideStories[i]]),...Object.entries(consultationWebtoons).map(([id,s])=>[s,consultation.default[id]])]){
  assert.deepEqual(actual,{...original,cuts:original.cuts.map(c=>({...c,src:c.src?prefix+c.src:''}))});
 }
});
