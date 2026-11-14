import {readFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
const names=new Set(['hanja-pool.v1.json','name-usage.v1.json']);
// Preserve every original record. Only its transport representation changes;
// synchronous decoding keeps the original naming engine contract unchanged.
export function packedNamingData(source){
 const json=JSON.stringify(JSON.parse(source));
 return gzipSync(json,{level:9}).toString('base64');
}
export function internFixtureStrings(value){
 const pool=[],lookup=new Map();
 const encode=item=>{
  if(typeof item==='string'){if(!lookup.has(item)){lookup.set(item,pool.length);pool.push(item);}return {$tossString:lookup.get(item)};}
  if(Array.isArray(item))return item.map(encode);
  if(item&&typeof item==='object'){if(Object.hasOwn(item,'$tossString'))throw Error('Fixture string marker collision');return Object.fromEntries(Object.entries(item).map(([key,child])=>[key,encode(child)]));}
  return item;
 };
 const tree=encode(value);return {pool,tree};
}
export default function compressedNamingData(){
 return {name:'private-compressed-original-naming-data',enforce:'pre',
  async resolveId(id,importer){
   const from=importer?.replaceAll('\\','/')||'';
   const naming=from.endsWith('/worker/naming-engine/data.ts')&&names.has(id.split('/').at(-1));
   const yearly=from.endsWith('/private-simulation/sukuyo-yearly.mjs')&&id==='./sukuyo-yearly-examples.json';
   const astro=from.endsWith('/private-simulation/astro-reading.mjs')&&id==='./astro-reading-example.json';
   const sukuyo=from.endsWith('/private-simulation/sukuyo-tools.mjs')&&id==='./sukuyo-tools-examples.json';
   const past=from.endsWith('/private-simulation/sukuyo-past-life.mjs')&&id==='./sukuyo-past-life-examples.json';
   const synastry=from.endsWith('/private-simulation/astro-synastry.mjs')&&id==='./astro-synastry-example.json';
   const originals=from.endsWith('/private-simulation/free-originals.mjs')&&id==='./free-original-examples.json';
   if(!originals&&!naming&&!yearly&&!astro&&!sukuyo&&!past&&!synastry)return;
   const resolved=await this.resolve(id,importer,{skipSelf:true});
   if(!resolved)throw Error('Original naming data missing: '+id);
   return '\0packed-naming:'+resolved.id+'.mjs';
  },
  async load(id){
   if(!id.startsWith('\0packed-naming:'))return;
   const path=id.slice('\0packed-naming:'.length,-4);this.addWatchFile(path);
   const source=await readFile(path,'utf8');
   if(path.endsWith('/sukuyo-past-life-examples.json')||path.endsWith('\\sukuyo-past-life-examples.json')){
    const packed=packedNamingData(JSON.stringify(internFixtureStrings(JSON.parse(source))));
    return `import {gunzipSync,strFromU8} from 'fflate';const {pool,tree}=JSON.parse(strFromU8(gunzipSync(Uint8Array.from(atob(${JSON.stringify(packed)}),c=>c.charCodeAt(0)))));const decode=value=>Array.isArray(value)?value.map(decode):value&&typeof value==='object'?Object.hasOwn(value,'$tossString')?pool[value.$tossString]:Object.fromEntries(Object.entries(value).map(([key,item])=>[key,decode(item)])):value;export default decode(tree);`;
   }
   const packed=packedNamingData(source);
   return `import {gunzipSync,strFromU8} from 'fflate';export default JSON.parse(strFromU8(gunzipSync(Uint8Array.from(atob(${JSON.stringify(packed)}),c=>c.charCodeAt(0)))));`;
  }
 };
}
