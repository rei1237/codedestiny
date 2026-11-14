import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {compressTarotCopy} from '../canonical/compressed-tarot-copy.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const original=await readFile(new URL('../../../lib/tarot/rich-card-meanings.mjs',import.meta.url),'utf8');
async function load(packed){
 const result=await build({entryPoints:[root+'lib/tarot/tarot-cards.mjs'],bundle:true,write:false,platform:'node',format:'esm',plugins:packed?[{name:'compressed-test',setup(builder){builder.onLoad({filter:/rich-card-meanings\.mjs$/},()=>({contents:compressTarotCopy(original),loader:'js'}));}}]:[]});
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
test('all 78 tarot cards retain every original meaning, order, identity and lookup after compression',async()=>{
 const [before,after]=await Promise.all([load(false),load(true)]);
 assert.equal(before.TAROT_CARDS.length,78);assert.deepEqual(after.TAROT_CARDS,before.TAROT_CARDS);assert.deepEqual(after.CARD_TO_FILENAME,before.CARD_TO_FILENAME);assert.deepEqual(after.getQuestionTypes(),before.getQuestionTypes());
 for(const card of before.TAROT_CARDS){
  assert.deepEqual(after.getTarotCardByAnyId(card.code),card);
  assert.deepEqual(after.buildImageCandidates(card.code),before.buildImageCandidates(card.code));
  assert.equal(after.getTarotCardByAnyId(card.code),after.TAROT_CARD_MAP_BY_CODE.get(card.code));
 }
 assert.ok(Buffer.byteLength(original)-Buffer.byteLength(compressTarotCopy(original))>150000);
});
test('nonliteral tarot data fails closed instead of dropping meanings',()=>{
 assert.throws(()=>compressTarotCopy(original.replace('const MAJOR = {','const MAJOR = getMeaning({')),/literal|missing/);
});
