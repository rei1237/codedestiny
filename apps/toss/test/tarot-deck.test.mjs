import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import path from 'node:path';
const bundle=await build({entryPoints:[path.resolve(import.meta.dirname,'../src/tarot-deck.ts')],bundle:true,write:false,format:'esm',platform:'node'});
const {shuffleTarotDeck}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));

test('the whole deck is shuffled without omissions, duplicate cards, or source mutation',()=>{
 const cards=Array.from({length:78},(_,index)=>Object.freeze({code:index}));
 const source=Object.freeze(cards);
 const shuffled=shuffleTarotDeck(source,()=>0);
 assert.equal(shuffled.length,78);
 assert.equal(new Set(shuffled.map(card=>card.code)).size,78);
 assert.deepEqual(shuffled.map(card=>card.code),[...Array.from({length:77},(_,i)=>i+1),0]);
 assert.equal(source[0].code,0);
 assert.ok(shuffled.every(card=>card.orientation==='upright'));
 assert.ok(shuffleTarotDeck(source,size=>size-1).every(card=>card.orientation==='reversed'));
});
