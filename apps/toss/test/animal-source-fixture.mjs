import '../../../scripts/lib/mock-network-guard.cjs';
import {build} from 'esbuild';
import {createRequire,Module} from 'node:module';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../../',import.meta.url)),require=createRequire(import.meta.url);
const result=await build({stdin:{contents:`export {tossAnimalDestiny} from './worker/toss/animal-destiny.js';export {handleSajuSection} from './worker/routes/saju-section.js';export {calculateAnimalCompatibility,getAnimalDisplayData} from './app/saju/animal-destiny/lib/animalMapping.ts';export {buildCompatibilityStageEvidence} from './app/saju/animal-destiny/lib/analysisNarrative.ts';`,resolveDir:root},bundle:true,format:'cjs',platform:'node',write:false,alias:{'@':root},loader:{'.wasm':'binary'}});
const compiled=new Module(root+'apps/toss/animal-source-fixture.cjs');compiled.paths=require('node:module')._nodeModulePaths(root);compiled._compile(result.outputFiles[0].text,compiled.id);
export const animalSource=compiled.exports;
export const animalExample={birthDate:'2023-02-01',birthTime:'',gender:'unknown',calendarType:'lunar',lunarLeap:true};
