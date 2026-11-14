import {readFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
const names=new Set(['hanja-pool.v1.json','name-usage.v1.json']);
// Preserve every original record. Only its transport representation changes;
// synchronous decoding keeps the original naming engine contract unchanged.
export function packedNamingData(source){
 const json=JSON.stringify(JSON.parse(source));
 return gzipSync(json,{level:9}).toString('base64');
}
export default function compressedNamingData(){
 return {name:'private-compressed-original-naming-data',enforce:'pre',
  async resolveId(id,importer){
   const from=importer?.replaceAll('\\','/')||'';
   const naming=from.endsWith('/worker/naming-engine/data.ts')&&names.has(id.split('/').at(-1));
   const yearly=from.endsWith('/private-simulation/sukuyo-yearly.mjs')&&id==='./sukuyo-yearly-examples.json';
   if(!naming&&!yearly)return;
   const resolved=await this.resolve(id,importer,{skipSelf:true});
   if(!resolved)throw Error('Original naming data missing: '+id);
   return '\0packed-naming:'+resolved.id+'.mjs';
  },
  async load(id){
   if(!id.startsWith('\0packed-naming:'))return;
   const path=id.slice('\0packed-naming:'.length,-4);this.addWatchFile(path);
   const packed=packedNamingData(await readFile(path,'utf8'));
   return `import {gunzipSync,strFromU8} from 'fflate';export default JSON.parse(strFromU8(gunzipSync(Uint8Array.from(atob(${JSON.stringify(packed)}),c=>c.charCodeAt(0)))));`;
  }
 };
}
