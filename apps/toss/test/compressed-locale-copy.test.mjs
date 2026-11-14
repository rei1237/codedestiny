import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {build,transformSync} from 'esbuild';
import {compressLocaleCopy} from '../canonical/compressed-locale-copy.mjs';
import ts from 'typescript';

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

for(const [path,prefix] of [['karma-destiny-ai/KarmaDestinyAiClient.tsx','KARMA_DESTINY'],['fusion-fortune/FusionFortuneClient.tsx','FUSION_FORTUNE']])test(path+' keeps every authored locale table and formatter',async()=>{
 const source=await readFile(new URL('../../../app/'+path,import.meta.url),'utf8');
 const packed=compressLocaleCopy(source);
 function tables(code){
  const tree=ts.createSourceFile('client.tsx',code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const selected=tree.statements.filter(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(decl=>[prefix+'_EN',prefix+'_COPY','originalLocaleText'].includes(decl.name.getText(tree))));
  const imports=tree.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='fflate');
  return [...imports,...selected].map(node=>node.getText(tree)).join('\n')+'\nexport const tables=['+prefix+'_EN,'+prefix+'_COPY];';
 }
 const [before,after]=await Promise.all([evaluate(tables(source)),evaluate(tables(packed))]);
 const normalize=value=>typeof value==='function'?{fn:transformSync('('+value.toString()+')',{minifyWhitespace:true}).code}:Array.isArray(value)?value.map(normalize):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,normalize(item)])):value;
 assert.deepEqual(normalize(after.tables),normalize(before.tables));
 assert.ok(Buffer.byteLength(source)-Buffer.byteLength(packed)>40000);
});
