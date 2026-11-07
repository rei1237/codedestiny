import {readdir,stat} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

// Toss's published upload limit is 100 MB. Use decimal bytes for a conservative gate.
export const BUNDLE_LIMIT_BYTES=100_000_000;
export function checkBundleSizes(archiveBytes,expandedBytes){
 for(const [name,size] of [['ait',archiveBytes],['expanded',expandedBytes]]){
  if(!Number.isSafeInteger(size)||size<0)throw new Error(`Invalid ${name} bundle size`);
  if(size>BUNDLE_LIMIT_BYTES)throw new Error(`${name} bundle exceeds ${BUNDLE_LIMIT_BYTES} bytes: ${size}`);
 }
}
async function directorySize(directory){
 let total=0;
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const path=join(directory,entry.name);
  if(entry.isDirectory())total+=await directorySize(path);
  else if(entry.isFile())total+=(await stat(path)).size;
  else throw new Error(`Unsupported bundle entry: ${path}`);
 }
 return total;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
  const archiveBytes=(await stat(join(root,'ai-saju-studio.ait'))).size;
  const expandedBytes=await directorySize(join(root,'dist'));
  checkBundleSizes(archiveBytes,expandedBytes);
  console.log(`Toss bundle size OK: ait ${archiveBytes} bytes; expanded ${expandedBytes} bytes; limit ${BUNDLE_LIMIT_BYTES} bytes`);
 }catch(error){console.error(error.message);process.exitCode=1;}
}
