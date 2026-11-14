import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {build,transformSync} from 'esbuild';
import {compressLocaleCopy} from '../canonical/compressed-locale-copy.mjs';

async function evaluate(contents){
 const result=await build({stdin:{contents,loader:'ts',resolveDir:fileURLToPath(new URL('../',import.meta.url))},alias:{'@':fileURLToPath(new URL('../../../',import.meta.url))},bundle:true,write:false,platform:'node',format:'esm'});
 return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
for(const [feature,getter] of [['nakshatra','getNakshatraCopy'],['destiny-compass','getDestinyCompassCopy'],['palm-reading','getPalmDestinyCopy']])test(feature+' translations and formatting functions remain identical',async()=>{
 const source=await readFile(new URL('../../../app/'+feature+'/_lib/copy.ts',import.meta.url),'utf8');
 const packed=compressLocaleCopy(source),[original,decoded]=await Promise.all([evaluate(source),evaluate(packed)]);
 for(const locale of ['ko','en','ja','zh-CN','zh-TW','vi','hi','es','fr','de','nl','ms','invalid']){
  const before=original[getter](locale),after=decoded[getter](locale);
  assert.deepEqual(Object.keys(after),Object.keys(before));
  function normalize(value){
   if(typeof value==='function')return {originalFunction:transformSync('('+value.toString()+')',{minifyWhitespace:true}).code};
   if(Array.isArray(value))return value.map(normalize);
   if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,normalize(item)]));
   return value;
  }
  assert.deepEqual(normalize(after),normalize(before),locale);
 }
 assert.ok(Buffer.byteLength(packed)<Buffer.byteLength(source));
});
