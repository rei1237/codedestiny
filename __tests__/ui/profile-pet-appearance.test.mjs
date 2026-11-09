import test from 'node:test';
import assert from 'node:assert/strict';
import { PET_APPEARANCE_VARIANTS, PET_APPEARANCE_COMBINATIONS, petAppearanceKey, rollPetAppearance } from '../../js/core/profile-pet-appearance.mjs';
import { petSpriteMarkup } from '../../js/core/profile-pet-card.mjs';
test('only visible, bounded dimensions count as a unique look; timing does not',()=>{
  assert.equal(PET_APPEARANCE_COMBINATIONS,1048576);
  const zero=rollPetAppearance(()=>0), last=rollPetAppearance(()=>.999999);
  assert.equal(petAppearanceKey(zero),'pet-v2:0.0.0.0.0.0');
  assert.equal(petAppearanceKey(last),'pet-v2:15.15.15.7.7.3');
  assert.equal(petAppearanceKey({...zero,headwear:16}),null);
  assert.equal(petAppearanceKey({...zero,headwear:'0'}),null);
  const keys=new Set();
  for(const [name,count]of Object.entries(PET_APPEARANCE_VARIANTS))for(let n=0;n<count;n++)keys.add(petAppearanceKey({...zero,[name]:n}));
  assert.equal(keys.size,1+Object.values(PET_APPEARANCE_VARIANTS).reduce((n,count)=>n+count-1,0));
});
test('all actions retain the new visible look and the unique mascot ignores it entirely',()=>{
  const pet={speciesId:'rabbit',name:'토끼',unique:false,coat:'wood',eggType:'moon',traits:{pattern:1,expression:2,accessory:3},appearance:rollPetAppearance(()=>.5)};
  for(const action of ['idle','feed','play','sleep']){
    const html=petSpriteMarkup(pet,action);
    for(const layer of ['headwear','neckwear','prop','charm','stamp'])assert.ok(html.includes('pg-outfit-'+layer));
    assert.ok(!html.includes('class="pg-pattern"'),'the counted pattern is on the always-visible charm, never hidden behind headwear');
    assert.ok(html.includes('data-coat="wood"'));
  }
  const unique={...pet,speciesId:'yeongnyangi',unique:true,coat:'natural'};
  for(const action of ['idle','feed','play','sleep'])assert.equal(petSpriteMarkup(unique,action),petSpriteMarkup({...unique,appearance:null},action));
});
