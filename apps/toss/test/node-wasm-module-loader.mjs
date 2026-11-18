// Node test bundles must preserve Wrangler's compiled WebAssembly.Module import
// contract. Embed the actual checked-in bytes: no synthetic astronomy or network.
import {readFile} from 'node:fs/promises';
export function nodeWasmModuleLoader(){
 return {name:'node-test-wasm-module',setup(build){
  build.onLoad({filter:/\.wasm$/},async args=>({
   contents:`export default new WebAssembly.Module(Buffer.from(${JSON.stringify((await readFile(args.path)).toString('base64'))},'base64'));`,
   loader:'js',
  }));
 }};
}
