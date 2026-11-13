import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {oneCardModule} from '../service/core-tarot-loader.mjs';
const read=file=>readFileSync(new URL('../../../'+file,import.meta.url),'utf8');
const source=read('js/saju-engine-tarot-sukuyo-quantum.js');
const engine=await import('data:text/javascript;base64,'+Buffer.from(oneCardModule(source,read('index.html'))).toString('base64'));
const context=vm.createContext({window:{},document:{},console});
vm.runInContext(source.slice(0,source.indexOf('function buildTarotCardCounselHtml(')),context);
test('single card reads the web one-card deck, eight category lenses and both orientations verbatim',()=>{
 assert.equal(engine.TAROT_DATA.length,22);
 assert.equal(engine.categories.length,8);
 for(const card of engine.TAROT_DATA)for(const [category] of engine.categories)for(const isReversed of [false,true]){
   const web=context.combineTarotAndTenGod(card,'',category,isReversed?'reversed':'upright');
   const actual=engine.readOne(category,{card,isReversed});
   assert.deepEqual(actual.reading,JSON.parse(JSON.stringify(web)));
   assert.equal(actual.image,context.tarotCaretaroUrl(card.short));
   assert.equal(actual.oracle,context.removeRepeatedMyeongriTarotPhrases(web.oracleMessage));
   assert.match(actual.fallback,/^\/tarot-cards\/[^/]+\.webp$/);
 }
 assert.throws(()=>engine.readOne('unsupported'),/Unknown reading category/);
});
