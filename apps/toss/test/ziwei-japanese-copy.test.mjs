import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const root=path.resolve(import.meta.dirname,'../../..'),Module=createRequire(import.meta.url)('node:module');
const result=await build({entryPoints:[path.join(root,'app/_lib/toss-ziwei-copy.ts')],bundle:true,write:false,platform:'node',format:'cjs'});
const loaded=new Module(path.join(root,'ziwei-copy-fixture.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(result.outputFiles[0].text,loaded.id);
test('Japanese Ziwei input covers all original topics and states the Korean result language',()=>{const copy=loaded.exports.tossZiweiJapanese;assert.equal(copy.topics.length,15);assert.equal(copy.palaces.length,12);assert.ok(copy.topics.every(value=>typeof value==='string'&&value.trim()));assert.match(copy.resultLanguage,/韓国語/);assert.equal(copy.cards.length,3);});
