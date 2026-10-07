// Resize the approved illustration only; never generate art or change native app icons.
import sharp from 'sharp';
import { stat } from 'node:fs/promises';
const base='public/images/brand/yeoni-yeongnyangi-loading-v2';
for(const width of [480,720,1024]){
  for(const format of ['webp','avif']){
    const output=base+'-'+width+'.'+format;
    const pipeline=sharp(base+'-source.png').resize(width,null,{withoutEnlargement:true});
    if(format==='webp') await pipeline.webp({quality:80}).toFile(output);
    else await pipeline.avif({quality:50,effort:5}).toFile(output);
    console.log(output,(await stat(output)).size);
  }
}
