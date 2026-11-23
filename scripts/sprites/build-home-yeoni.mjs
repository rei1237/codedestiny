// Each source patch is registered to its original canvas. Only feathered face pixels change.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const source = 'scripts/sprites/home-yeoni';
const output = 'public/images/home/yeoni-expressions';
const config = JSON.parse(await readFile(source + '/frames.json', 'utf8'));
await mkdir(output, { recursive: true });
for (const [form, spec] of Object.entries(config)) {
  const { left, top, width, height } = spec.face;
  const poster = await sharp(spec.poster).extract(spec.face).ensureAlpha().raw().toBuffer();
  if (spec.silhouette) {
    // Use the approved portrait's exact RGB pixels. The matte shares its 600×720 coordinates.
    const mask = await sharp(source + '/' + spec.silhouette).greyscale().raw().toBuffer({ resolveWithObject:true });
    if (mask.info.width !== spec.canvas[0] || mask.info.height !== spec.canvas[1]) {
      throw new Error('Portrait and silhouette canvases must match: ' + form);
    }
    const cutout = await sharp(spec.poster).joinChannel(mask.data, {raw:mask.info}).png().toBuffer();
    for (const size of [320, spec.canvas[0]]) {
      await sharp(cutout).resize({width:size}).webp({quality:90, alphaQuality:100, effort:6})
        .toFile(output + '/' + form + '-portrait-' + size + '.webp');
    }
  }
  const frames = [];
  for (const patches of Object.values(spec.states)) {
    const pixels = Buffer.from(poster);
    for (const name of patches) {
      const region = spec.regions[name];
      const patch = await sharp(source + '/' + name + '.png').ensureAlpha().raw().toBuffer();
      for (let y = 0; y < region.height; y++) for (let x = 0; x < region.width; x++) {
        const radius = Math.hypot((2*x+1)/region.width-1, (2*y+1)/region.height-1);
        const alpha = Math.max(0, Math.min(1, (1-radius)/0.14));
        const target = ((region.top-top+y)*width + region.left-left+x)*4;
        for (let c = 0; c < 3; c++) {
          pixels[target+c] = Math.round(pixels[target+c]*(1-alpha) + patch[(y*region.width+x)*4+c]*alpha);
        }
      }
    }
    frames.push(await sharp(pixels,{raw:{width,height,channels:4}}).png().toBuffer());
  }
  await sharp({create:{width:width*frames.length,height,channels:4,background:'#0000'}})
    .composite(frames.map((input,i)=>({input,left:i*width,top:0}))).webp({lossless:true})
    .toFile(output+'/'+form+'.webp');
  await writeFile(output+'/'+form+'.json', JSON.stringify({canvas:spec.canvas,face:spec.face,states:Object.keys(spec.states)}));
}

// Three transparent accent cells pair with the localized wink, humming and smiling faces.
await sharp(source + '/reaction-accents.svg').webp({lossless:true}).toFile(output+'/reaction-accents.webp');
