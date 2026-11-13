import '../../../scripts/lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import {createRequire,Module} from 'node:module';
import {build} from 'esbuild';
import daily from '../../../worker/yeongnyangi/fortune/free/categories.json' with {type:'json'};
import {drawTarotCardsForSpread} from '../../../lib/tarot/tarot-interpretation-engine.mjs';

const root=path.resolve(import.meta.dirname,'../../..'),require=createRequire(import.meta.url);
const source=await build({absWorkingDir:root,entryPoints:['worker/yeongnyangi/fortune/free/readings.ts'],bundle:true,platform:'node',format:'cjs',write:false,loader:{'.wasm':'binary'}});
const unit=new Module('daily-engines',import.meta);
unit.filename=path.join(root,'daily-engines.cjs');unit.paths=require('module')._nodeModulePaths(root);
unit._compile(source.outputFiles[0].text,unit.filename);
const {calculateFree}=unit.exports;
const personA={birthDate:'2024-01-15',birthTime:'12:00',calendarType:'solar',gender:'female',birthPlace:{name:'서울',latitude:37.57,longitude:126.98,timezone:'Asia/Seoul'}};
const input={personA,readingMode:'personal',question:'오늘 내가 먼저 살펴볼 선택은 무엇일까?'};
const env={SUKUYO_IMD_NEW_ORDERS_V1:'true',YEONGNYANGI_NATAL_PROFILE_V1:'true'};
for(const {id,label} of daily.filter(item=>item.id!=='horary')){
 test('영냥이 당일 '+label+' 원본 계산과 근거',async()=>{
  const drawn=id==='tarot'?drawTarotCardsForSpread('three_card_cause_process_outcome'):undefined;
  const result=await calculateFree(id,input,{},'2024-01-16',env,drawn);
  assert.equal(result.category,id);assert.equal(result.title,label);
  assert.ok(result.basis.length&&result.paragraphs.length&&result.limitations.length);
  assert.ok(result.prompt.length>0);assert.ok(result.summary);
 });
}
