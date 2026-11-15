/** Lossless cell extraction / baseline registration; never redraws the character. */
import sharp from 'sharp';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
const source = resolve(process.argv[2] || 'D:/CodeDestiny-Build/moonlit-lotus/yeoni/2d-v1');
const output = resolve('public/assets/moonlit-lotus/yeoni/2d-v1');
await mkdir(output, {recursive:true});
const manifest = {version:'yeoni-2d-v1', renderer:'2d-sprite', columns:4, rows:3, cell:384, baseline:354, sheets:{}, referenceSha256:createHash('sha256').update(await readFile('docs/design/character-references/yeoni-profile-v1.png')).digest('hex')};
for (const name of ['expressions','bow']) {
  const input = join(source, `${name}-source.png`);
  const meta = await sharp(input).metadata();
  if (!meta.hasAlpha || meta.width % 4 || meta.height % 3) throw Error('Expected alpha and exact 4x3 cells');
  const width=meta.width/4, height=meta.height/3;
  const composites=[];const frames=[];
  for(let i=0;i<12;i++) {
    const cell=sharp(input).extract({left:i%4*width,top:Math.floor(i/4)*height,width,height});
    const {data,info}=await cell.clone().raw().toBuffer({resolveWithObject:true});
    let left=width,right=0,top=height,bottom=0;
    // Ignore fully transparent RGB; retain original alpha at the contour.
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*info.channels+3]>32){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    if(right<=left)throw Error(`Empty ${name}/${i}`);
    const padding=3;
    left=Math.max(0,left-padding);right=Math.min(width-1,right+padding);top=Math.max(0,top-padding);bottom=Math.min(height-1,bottom+padding);
    const crop={left,top,width:right-left+1,height:bottom-top+1};
    // Same source pixel scale for every frame; no enlargement of crouched poses.
    const frame=await cell.clone().extract(crop).png().toBuffer();
    composites.push({input:frame,left:i%4*384+Math.round((384-crop.width)/2),top:Math.floor(i/4)*384+354-crop.height});
    frames.push({index:i,sourceCrop:crop,baseline:354});
  }
  const file=join(output,`${name}.webp`);
  await sharp({create:{width:1536,height:1152,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(composites).webp({quality:94,alphaQuality:100,effort:6}).toFile(file);
  const bytes=(await readFile(file)).length;
  manifest.sheets[name]={url:`/assets/moonlit-lotus/yeoni/2d-v1/${name}.webp`,width:1536,height:1152,bytes,frames,sourceSha256:createHash('sha256').update(await readFile(input)).digest('hex')};
}
await sharp('docs/design/character-references/yeoni-profile-v1.png').webp({quality:90}).toFile(join(output,'reference.webp'));
await sharp(join(output,'expressions.webp')).extract({left:0,top:0,width:384,height:384}).webp({quality:94}).toFile(join(output,'still.webp'));
await writeFile(join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({sheets:manifest.sheets,cell:384,baseline:354},null,2));
