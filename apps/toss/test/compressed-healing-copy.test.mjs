import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {compressTarotCopy,tarotCopyTables} from '../canonical/compressed-tarot-copy.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
for(const file of ['sun-recovery-card-copy.mjs','tarot-interpretation-engine.mjs'])test(file+' preserves all original tables, languages and key order',async()=>{
 const source=await readFile(root+'lib/tarot/'+file,'utf8'),names=tarotCopyTables[file];
 const load=async code=>{
  const bundled=await build({stdin:{contents:code+'\nexport const comparedOriginalTables=['+names.join(',')+'];',resolveDir:root+'lib/tarot'},bundle:true,write:false,platform:'node',format:'esm'});
  return import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
 };
 const compressed=compressTarotCopy(source,names),[before,after]=await Promise.all([load(source),load(compressed)]);
 assert.deepEqual(after.comparedOriginalTables,before.comparedOriginalTables);
 if(file.startsWith('sun')){assert.equal(Object.keys(before.default).length,78);assert.deepEqual(after.default,before.default);}
 assert.ok(Buffer.byteLength(compressed)<Buffer.byteLength(source)-10000);
 assert.throws(()=>compressTarotCopy(source.replace('const '+names[0]+' = {','const '+names[0]+' = readCopy({'),names),/literal|missing/);
});
