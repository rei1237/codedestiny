import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Module} from 'node:module';
import path from 'node:path';
import {privateVedicReading,vedicExampleBirth} from '../private-simulation/vedic-reading.mjs';
import example from '../private-simulation/vedic-reading-example.json' with {type:'json'};
const root=path.resolve(import.meta.dirname,'../../..');
process.chdir(root);
test('private Vedic example is identical to canonical local Swiss and rejects all other births',async()=>{
 const bundled=await build({entryPoints:[path.join(root,'worker/toss/vedic-reading.js')],bundle:true,write:false,platform:'node',format:'cjs',loader:{'.wasm':'binary'}});
 const compiled=new Module(path.join(root,'test-private-vedic.cjs'));compiled.paths=Module._nodeModulePaths(root);compiled._compile(bundled.outputFiles[0].text,compiled.id);
 const actual=await compiled.exports.tossVedicReading({birth:vedicExampleBirth},{});assert.deepEqual(actual,example.result);
 const response=privateVedicReading({birth:vedicExampleBirth});assert.equal(response.status,200);assert.deepEqual(await response.json(),actual);
 for(const birth of [{...vedicExampleBirth,gender:'M'},{...vedicExampleBirth,date:{...vedicExampleBirth.date,day:4}},{...vedicExampleBirth,location:{...vedicExampleBirth.location,lat:0}},null]){const error=privateVedicReading({birth});assert.equal(error.status,422);assert.equal((await error.json()).error,'VEDIC_EXAMPLE_REQUIRED');}
 assert.equal((await privateVedicReading({birth:vedicExampleBirth,name:'모의 이름'}).json()).input.name,'모의 이름');
});
