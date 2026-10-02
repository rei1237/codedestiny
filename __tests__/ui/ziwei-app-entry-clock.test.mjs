import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
// App entry points that skip normalizeZiweiInput still chart the same date and clock as the personal chart
// (lib/ziwei-birth-clock.js). Before 2026-10-02 the compass charted lunar digits as a solar date and the diary
// Lite fed the civil clock straight into the core.
const require=createRequire(import.meta.url);
const Module=require('node:module');
const built=await build({stdin:{contents:`export {computeDiaryZiweiLite} from './app/diary/_lib/relationship-lite'; export {ziweiAdapter} from './app/destiny-compass/_engine/adapters/ziweiAdapter';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const filename=path.resolve('ziwei-app-entry-clock.cjs');
const loaded=new Module(filename);
loaded.filename=filename;
loaded.paths=Module._nodeModulePaths(process.cwd());
loaded._compile(built.outputFiles[0].text,filename);
const {computeDiaryZiweiLite,ziweiAdapter}=loaded.exports;

test('the compass charts a lunar birth on its solar date', async () => {
  const birth=(birthDate,calendarType)=>ziweiAdapter.contribute({birth:{birthDate,birthTime:'10:00',gender:'female',calendarType}});
  // 음력 1990-05-05 = 양력 1990-05-28 (한국 음양력 코어).
  assert.deepEqual(await birth('1990-05-05','lunar'),await birth('1990-05-28','solar'));
  assert.notDeepEqual(await birth('1990-05-05','lunar'),await birth('1990-05-05','solar'));
});

test('the diary Lite charts the longitude-corrected clock, so 11:10 in Seoul is still 巳時', () => {
  const partner={year:1992,month:8,day:3,hour:15,minute:20};
  const lite=(hour,minute)=>computeDiaryZiweiLite({year:1988,month:2,day:14,hour,minute,calendarType:'solar'},partner);
  assert.equal(lite(11,10),lite(10,50));
  assert.notEqual(lite(11,10),lite(11,40));
});
