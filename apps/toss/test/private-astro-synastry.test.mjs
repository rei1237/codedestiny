import test from 'node:test';
import assert from 'node:assert/strict';
import {privateAstroSynastry} from '../private-simulation/astro-synastry.mjs';
import example from '../private-simulation/astro-synastry-example.json' with {type:'json'};
test('original two guest synastry modes preserve all catalogue entries and reject unsupported inputs',async()=>{
 assert.equal(example.catalog.people.length,305);assert.deepEqual(await privateAstroSynastry().json(),example.catalog);
 for(const featureKey of Object.keys(example.results)){
  const body={featureKey,birth:example.birth,partner:{name:'상대',birth:example.partnerBirth},celeb:example.celeb};
  assert.deepEqual(await privateAstroSynastry(body).json(),example.results[featureKey]);assert.equal(example.results[featureKey].accessSource,'public');
  assert.equal(privateAstroSynastry({...body,birth:{...body.birth,date:{...body.birth.date,day:4}}}).status,422);
 }
 assert.equal(privateAstroSynastry({featureKey:'paid'}).status,404);
 assert.equal(privateAstroSynastry({featureKey:'compat-astro-direct-synastry',birth:example.birth,partner:{name:'다른 이름',birth:example.partnerBirth}}).status,422);
});
