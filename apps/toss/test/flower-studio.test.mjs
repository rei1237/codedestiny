import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {flowerStudioModule} from '../service/flower-studio-loader.mjs';
import {flowerHistory,updateFlowerHistory,clearFlowerHistory} from '../service/flower-history.mjs';
import example from '../private-simulation/free-original-examples.json' with {type:'json'};
const mod=await import('data:text/javascript;base64,'+Buffer.from(await flowerStudioModule()).toString('base64'));
test('original studio builds four independent interpretations, prompts, palettes and share cards',()=>{
 const rows=Object.entries(example.flower.sources).map(([source,row])=>mod.describeFlower(source,row));
 assert.ok(mod.bouquet(rows).length>15);assert.equal(mod.historyLimit,12);
 for(const row of rows){
  const card=mod.flowerCard(row);
  assert.equal(card.snapshot.source,row.source);assert.equal(card.snapshot.name,row.flower.name);
  assert.ok(card.promptPack.includes(card.positive)&&card.promptPack.includes(card.negative));
  assert.ok(card.positive.includes(row.flower.scientific_name));assert.equal(card.extension.sourceMatrix.length,3);
  assert.ok(card.share.includes('action=openDestinyFlowerStudio&fl='));
  assert.ok(!Object.hasOwn(card,'selection'));
 }
});
test('reopening and unlink keep stored flower readings within their verified account/revision',()=>{
 const data=new Map();const storage={get length(){return data.size;},getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k),key:i=>[...data.keys()][i]};
 const a='toss.person-a.0.sandbox',b='toss.person-b.0.sandbox',next='toss.person-a.1.sandbox';
 const card=mod.flowerCard(mod.describeFlower('saju',example.flower.sources.saju));
 updateFlowerHistory(storage,a,mod.historyLimit,()=>[card]);assert.deepEqual(flowerHistory(storage,a),JSON.parse(JSON.stringify([card])));
 assert.deepEqual(flowerHistory(storage,b),[]);assert.deepEqual(flowerHistory(storage,next),[]);
 updateFlowerHistory(storage,b,mod.historyLimit,()=>[card]);clearFlowerHistory(storage,'person-a');
 assert.equal(flowerHistory(storage,b).length,1);assert.deepEqual(flowerHistory(storage,a),[]);
 assert.throws(()=>flowerHistory(storage,'guest'),/FLOWER_OWNER_REQUIRED/);
});
