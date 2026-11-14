import test from 'node:test';
import assert from 'node:assert/strict';
import {privateAstroReading,astroExampleBirth} from '../private-simulation/astro-reading.mjs';
import {TOSS_ASTRO_SECTIONS} from '../../../lib/fortune/toss-astro-sections.mjs';
import example from '../private-simulation/astro-reading-example.json' with {type:'json'};
test('private astrology keeps ten original public sections and rejects other births and paid keys',async()=>{
 assert.equal(Object.keys(example.sections).length,10);
 assert.deepEqual(await privateAstroReading({birth:astroExampleBirth},'chart').json(),example.chart);assert.ok(example.chart.planets.length>=7);
 for(const featureKey of Object.keys(TOSS_ASTRO_SECTIONS)){const response=privateAstroReading({birth:astroExampleBirth,featureKey});assert.equal(response.status,200);const value=await response.json();assert.equal(value.accessSource,'public');assert.ok(value.html.length>500);assert.deepEqual(value,example.sections[featureKey]);}
 assert.equal(privateAstroReading({birth:astroExampleBirth,featureKey:'astrology-ai-consultation'}).status,404);
 for(const birth of [{...astroExampleBirth,date:{...astroExampleBirth.date,day:4}},{...astroExampleBirth,location:{...astroExampleBirth.location,lat:0}},null]){const error=privateAstroReading({birth,featureKey:'astro_basic_deep_pack'});assert.equal(error.status,422);assert.equal((await error.json()).error,'ASTRO_EXAMPLE_REQUIRED');}
});
