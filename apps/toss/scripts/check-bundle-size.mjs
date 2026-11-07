import {readFile,readdir,stat} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,join,relative,resolve,sep} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

// Toss's published upload limit is 100 MB. Use decimal bytes for a conservative gate.
export const BUNDLE_LIMIT_BYTES=100_000_000;
export function checkBundleSizes(archiveBytes,expandedBytes){
 for(const [name,size] of [['ait',archiveBytes],['expanded',expandedBytes]]){
  if(!Number.isSafeInteger(size)||size<0)throw new Error(`Invalid ${name} bundle size`);
  if(size>BUNDLE_LIMIT_BYTES)throw new Error(`${name} bundle exceeds ${BUNDLE_LIMIT_BYTES} bytes: ${size}`);
 }
}
export function inspectBundleIndex(index,files,{requirePortable=false}={}){
 if(!Array.isArray(index)||!index.length)throw new Error('Empty bundle index');
 const expected=new Map(files.map(file=>[file.name,file.size]));
 if(expected.size!==files.length)throw new Error('Duplicate build file');
 const seen=new Set();let total=0n,nonPortable=0;
 for(const entry of index){
  if(typeof entry.name!=='string'||typeof entry.uncompressedSize!=='bigint'||entry.uncompressedSize<0n)throw new Error('Invalid bundle index entry');
  total+=entry.uncompressedSize;
  if(!entry.name.startsWith('sources/'))continue;
  const original=entry.name.slice('sources/'.length);if(original.includes('\\'))nonPortable++;
  const name=original.replaceAll('\\','/');
  if(!name||name.split('/').some(part=>!part||part==='.'||part==='..'))throw new Error('Invalid bundle source path');
  if(seen.has(name))throw new Error(`Duplicate bundle source: ${name}`);
  seen.add(name);
  if(!expected.has(name)||BigInt(expected.get(name))!==entry.uncompressedSize)throw new Error(`Bundle source mismatch: ${name}`);
 }
 if(seen.size!==expected.size)throw new Error('Bundle is missing build files');
 if(total>BigInt(Number.MAX_SAFE_INTEGER))throw new Error('Bundle size is too large to measure safely');
 if(requirePortable&&nonPortable)throw new Error(`Bundle contains ${nonPortable} Windows-style source paths`);
 return {expandedBytes:Number(total),sourceFiles:seen.size,nonPortable};
}
async function directoryFiles(root,directory=root){
 const files=[];
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const path=join(directory,entry.name);
  if(entry.isDirectory())files.push(...await directoryFiles(root,path));
  else if(entry.isFile())files.push({name:relative(root,path).split(sep).join('/'),size:(await stat(path)).size});
  else throw new Error(`Unsupported bundle entry: ${path}`);
 }
 return files;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 try{
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
  const args=process.argv.slice(2);if(args.some(arg=>arg!=='--require-portable'))throw new Error('Unknown bundle check option');
  const require=createRequire(import.meta.url),cliRequire=createRequire(require.resolve('@apps-in-toss/cli/package.json'));
  const {AppsInTossBundle}=cliRequire('@apps-in-toss/ait-format');
  const archive=await readFile(join(root,'ai-saju-studio.ait')),reader=AppsInTossBundle.reader(archive);
  if(reader.appName!=='ai-saju-studio')throw new Error('Unexpected Toss app name');
  const result=inspectBundleIndex(reader.bundle.index,await directoryFiles(join(root,'dist')),{requirePortable:args.includes('--require-portable')});
  checkBundleSizes(archive.length,result.expandedBytes);
  console.log(`Toss bundle size OK: ait ${archive.length} bytes; expanded ${result.expandedBytes} bytes; ${result.sourceFiles} source files; limit ${BUNDLE_LIMIT_BYTES} bytes`);
  if(result.nonPortable)console.warn(`Toss bundle contains ${result.nonPortable} Windows-style paths; verify on device or build on Linux before submission.`);
 }catch(error){console.error(error.message);process.exitCode=1;}
}
