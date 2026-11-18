import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {nodeWasmModuleLoader} from './node-wasm-module-loader.mjs';
test('Node bundles preserve real Swiss WASM module exports instead of a placeholder or raw bytes',async()=>{
 const file=fileURLToPath(new URL('../../../public/js/vendor/sweph-wasm/wasm/swisseph.wasm',import.meta.url));
 const expected=await WebAssembly.compile(await readFile(file));
 const result=await build({stdin:{contents:`export {default} from ${JSON.stringify(file)};`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',plugins:[nodeWasmModuleLoader()]});
 const {default:actual}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
 assert.ok(actual instanceof WebAssembly.Module);
 assert.ok(WebAssembly.Module.exports(actual).length>0);
 assert.deepEqual(WebAssembly.Module.exports(actual),WebAssembly.Module.exports(expected));
 assert.deepEqual(WebAssembly.Module.imports(actual),WebAssembly.Module.imports(expected));
});
