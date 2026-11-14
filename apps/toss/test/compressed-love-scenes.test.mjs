import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {compressLoveScenes} from '../canonical/compressed-love-scenes.mjs';
const original=await readFile(new URL('../../../app/saju/love-simulation/_data/loveCodeMvp.ts',import.meta.url),'utf8');
async function evaluate(source){
 const result=await build({stdin:{contents:source,loader:'ts',resolveDir:fileURLToPath(new URL('../',import.meta.url))},bundle:true,write:false,platform:'node',format:'esm'});
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
test('all original love scenes, choices, effects and locale titles survive compression',async()=>{
 const packed=compressLoveScenes(original),[before,after]=await Promise.all([evaluate(original),evaluate(packed)]);
 for(const locale of ['ko','en','ja','zh-CN','zh-TW','vi','hi','es','fr','de','nl','ms'])assert.deepEqual(after.getLocalizedLoveScenes(locale),before.getLocalizedLoveScenes(locale));
 for(const name of ['LOVE_CHARACTERS','LOVE_CHARACTER_COPY_KO','INITIAL_STATS','LOVE_SCENES'])assert.deepEqual(after[name],before[name]);
 assert.ok(Buffer.byteLength(packed)<Buffer.byteLength(original)*0.65);
});
test('nonliteral source fails the build instead of dropping a scene',()=>{
 assert.throws(()=>compressLoveScenes(original.replace('const LOVE_SCENE_DEFINITIONS: LoveSceneDefinition[] = [','const LOVE_SCENE_DEFINITIONS: LoveSceneDefinition[] = getScenes([')),/literal|missing/);
});
