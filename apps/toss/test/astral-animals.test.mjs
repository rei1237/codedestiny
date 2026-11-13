import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {astralAnimalModule} from '../canonical/astral-animals.mjs';
import {isFreeFortuneFeatureKey} from '../../../lib/payment/free-fortune-policy.mjs';

test('all original MBTI profiles and ordered pairs retain their web readings',async()=>{
  assert.ok(isFreeFortuneFeatureKey('mbti-animal-compat'));
  const source=readFileSync(new URL('../../../js/astral-soul.js',import.meta.url),'utf8');
  const web=runInNewContext(source+'\n;({animals:ASTRAL_DATA,readPair:getSynergyText,pairs:buildMbtiCompatibilityMap()})',{window:{}});
  const mini=await import('data:text/javascript;base64,'+Buffer.from(astralAnimalModule()).toString('base64'));
  assert.deepEqual(mini.animals,JSON.parse(JSON.stringify(web.animals)));
  assert.deepEqual(mini.compatibility(),JSON.parse(JSON.stringify(web.pairs)));
  for(const a of Object.keys(web.animals))for(const b of Object.keys(web.animals)){
    assert.deepEqual(mini.readPair(mini.animals[a],mini.animals[b]),JSON.parse(JSON.stringify(web.readPair(web.animals[a],web.animals[b]))));
  }
});
