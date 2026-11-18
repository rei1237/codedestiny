// Explicit test-only module injection; never used by application code or live requests.
import '../../../scripts/lib/mock-network-guard.cjs';
import {build} from 'esbuild';
import {nodeWasmModuleLoader} from './node-wasm-module-loader.mjs';
import {createRequire} from 'node:module';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../../..'),Module=createRequire(import.meta.url)('node:module');
export async function mockSaleModule(relativePath){
 const compiled=await build({entryPoints:[path.join(root,relativePath)],bundle:true,write:false,format:'cjs',platform:'node',plugins:[nodeWasmModuleLoader(),{name:'explicit-mock-sales',setup(b){b.onLoad({filter:/[\\/]toss-release\.mjs$/},()=>({contents:'export const NEW_PURCHASES_AVAILABLE=true;export const SERVICE_AVAILABLE=true;',loader:'js'}));}}]});
 const loaded=new Module(path.join(root,'mock-sale-module.cjs'));loaded.paths=Module._nodeModulePaths(root);loaded._compile(compiled.outputFiles[0].text,loaded.id);return loaded.exports;
}
