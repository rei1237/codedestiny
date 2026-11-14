import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {compressPsychotestCopy} from '../canonical/compressed-psychotest-copy.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const original=await readFile(new URL('../../../src/features/psychotest/data/testData.ts',import.meta.url),'utf8');
async function load(contents){
 const result=await build({stdin:{contents,loader:'ts',resolveDir:root},bundle:true,write:false,platform:'node',format:'esm'});
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
test('all 22 psychotests retain every question, score, option and result in original order',async()=>{
 const [before,after]=await Promise.all([load(original),load(compressPsychotestCopy(original))]);
 assert.equal(before.ALL_TESTS.length,22);
 assert.deepEqual(Object.keys(after),Object.keys(before));
 for(const key of Object.keys(before))if(key!=='AURA_RESULTS')assert.deepEqual(after[key],before[key],key);
 const copyOnly=(row)=>Object.fromEntries(Object.entries(row).filter(([key])=>key!=='cond'));
 assert.deepEqual(after.AURA_RESULTS.map(copyOnly),before.AURA_RESULTS.map(copyOnly));
 for(let bits=0;bits<256;bits++)for(let index=0;index<before.AURA_RESULTS.length;index++){
  const scores=Array.from({length:8},(_,axis)=>(bits>>axis)&1);
  assert.equal(after.AURA_RESULTS[index].cond(...scores),before.AURA_RESULTS[index].cond(...scores));
 }
 assert.ok(Buffer.byteLength(original)-Buffer.byteLength(compressPsychotestCopy(original))>60000);
});
test('nonliteral psychotest data fails closed',()=>{
 assert.throws(()=>compressPsychotestCopy(original.replace("['전체','성격'","[getCategory(),'성격'")),/no longer literal/);
});
