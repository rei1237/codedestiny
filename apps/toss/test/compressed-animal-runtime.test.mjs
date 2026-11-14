import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {compressAnimalRuntime} from '../canonical/compressed-animal-runtime.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url)),source=await readFile(root+'worker/lib/saju-section/runtime.generated.mjs','utf8');
const load=async contents=>{const result=await build({stdin:{contents,resolveDir:root+'worker/lib/saju-section'},bundle:true,platform:'node',format:'esm',write:false});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));};
test('animal data packing retains all twelve stories, 144 pairings and fresh per-runtime objects',async()=>{
 const packed=compressAnimalRuntime(source),[a,b]=await Promise.all([load(source),load(packed)]),before=a.createAnimalDestinyRuntime(),after=b.createAnimalDestinyRuntime();
 assert.deepEqual(after.ANIMAL_DESTINY_LIST,before.ANIMAL_DESTINY_LIST);
 for(const animal of before.ANIMAL_DESTINY_LIST){
  const mine=after.getAnimalDisplayData(animal.id);assert.deepEqual(mine,animal);
  const original=before.resolveTwelveGrowthAnimalResult(animal),result=after.resolveTwelveGrowthAnimalResult(mine);
  assert.deepEqual(result,original);assert.deepEqual(after.buildTwelveAnimalSections(result),before.buildTwelveAnimalSections(original));
  const pillars=before.getFourPillarStageItems({dayStem:'갑',pillars:{year:{stem:'갑',branch:'자'},month:{stem:'을',branch:'축'},day:{stem:'갑',branch:'인'},hour:null},timeUnknown:true});
  assert.deepEqual(after.buildDetailedInterpretation({animal:mine,pillars}),before.buildDetailedInterpretation({animal,pillars}));
  for(const partner of before.ANIMAL_DESTINY_LIST)assert.deepEqual(after.calculateAnimalCompatibility(animal.id,partner.id),before.calculateAnimalCompatibility(animal.id,partner.id));
 }
 const first=b.createAnimalDestinyRuntime(),second=b.createAnimalDestinyRuntime();first.ANIMAL_DESTINY_LIST[0].keywords.push('mutation');assert.ok(!second.ANIMAL_DESTINY_LIST[0].keywords.includes('mutation'));
 assert.ok(Buffer.byteLength(source)-Buffer.byteLength(packed)>10000);
 assert.throws(()=>compressAnimalRuntime('export function other(){}'),/missing/);
});
