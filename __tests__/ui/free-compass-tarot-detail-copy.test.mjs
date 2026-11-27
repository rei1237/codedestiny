import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';
import {isFreeFortuneFeatureKey} from '../../lib/payment/free-fortune-policy.mjs';

const ids=['compass-crossroads','compass-future-sim','compass-life-voyage','crystal-soul-tarot','career-transition-tarot','numerology-tarot','year-fortune-tarot','reunion-tarot'];
const read=file=>readFileSync(new URL('../../'+file,import.meta.url),'utf8');
const require=createRequire(import.meta.url);
const stale=/별도 유료|유료 (?:리딩|재회)|결제 (?:확인|안내|조건|화면)|별도 결제|결제창|결제 후|단건 결제|한 번의 구매/;
test('free Compass and tarot written and served panel contracts agree',()=>{
 for(const id of ids){
  const authored=JSON.parse(read('content/product-details/'+id+'/manifest.json'));
  const served=JSON.parse(read('public/feature-details/crafted/'+id+'/manifest.json'));
  const panelSource=require('../../content/product-details/'+id+'/panels.cjs');
  assert.ok(isFreeFortuneFeatureKey(authored.featureKey),id);
  assert.equal(authored.notice,served.notice,id);assert.equal(panelSource.notice,served.notice,id);
  assert.match(served.notice,/무료/,id);
  assert.doesNotMatch(JSON.stringify({authored,served,panelSource}),stale,id);
  assert.doesNotMatch(read('content/product-details/'+id+'/editable-layout.html'),stale,id);
  assert.deepEqual(served.panels.map(({id,title,text})=>({id,title,text})),authored.panels.map(({id,title,text})=>({id,title,text})),id);
  for(const panel of served.panels) for(const media of [panel,...(panel.variants||[])]){
   assert.ok(existsSync(new URL('../../public'+media.src,import.meta.url)),media.src);
  }
 }
});
test('new, free Compass outputs do not promise auto-archive; browser-based tarot storage is accurately scoped',()=>{
 for(const id of ids.filter(i=>i.startsWith('compass-'))){
  const served=JSON.parse(read('public/feature-details/crafted/'+id+'/manifest.json'));
  assert.match(served.notice,/로그인/);assert.match(served.notice,/자동 저장되지 않습니다/);
 }
 for(const id of ['numerology-tarot','year-fortune-tarot']){
  const served=JSON.parse(read('public/feature-details/crafted/'+id+'/manifest.json'));
  assert.match(served.notice,/브라우저/);
 }
});
