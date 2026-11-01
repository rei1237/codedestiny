// Deterministic size variants of existing artwork. Originals are retained.
import sharp from 'sharp';
import {stat} from 'node:fs/promises';
import {resolve} from 'node:path';

const assets=[
 ...['standard','premium','vvip','family'].map(tier=>({path:`/assets/yeoni/honey-passes/${tier}-honey-pass-v1.webp`,widths:[96,192]})),
 {path:'/assets/service-intro/yeoni-gift.webp',widths:[128,352]},
 {path:'/assets/yeongnyangi/spirit/eastern-oracle.webp',widths:[128]},
 {path:'/images/fortune-chat/yeoni/salon-welcome-v1.webp',widths:[640,960]},
 {path:'/neo-operation-room/strategy-room-v1.webp',widths:[960]},
];
for(const asset of assets){
 const source=resolve('public'+asset.path);
 const original=await stat(source);
 for(const width of asset.widths){
  const output=source.replace(/\.webp$/,`-${width}.webp`);
  await sharp(source).resize({width,withoutEnlargement:true}).webp({quality:90,effort:6}).toFile(output);
  console.log(`${asset.path} ${width}px: ${original.size} -> ${(await stat(output)).size} bytes`);
 }
}
