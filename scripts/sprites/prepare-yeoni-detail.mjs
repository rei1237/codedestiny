/** Register 80 authored drawings; preserve alpha, scale and fixed cell centers. */
import sharp from 'sharp';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const source=resolve(process.argv[2]||'D:/CodeDestiny-Build/moonlit-lotus/yeoni/2d-v2');
const output=resolve('public/assets/moonlit-lotus/yeoni/2d-v2');
await mkdir(output,{recursive:true});
const names=['expressions','rest','bow-down','bow-lower','bow-up'];
const manifest={version:'yeoni-2d-v2',renderer:'2d-sprite',columns:4,rows:4,cell:384,baseline:354,authoredFrames:80,sheets:{},referenceSha256:createHash('sha256').update(await readFile('docs/design/character-references/yeoni-profile-v1.png')).digest('hex')};
for(const name of names){
  const file=join(source,`${name}-source.png`);const bytes=await readFile(file);const meta=await sharp(bytes).metadata();
  if(!meta.hasAlpha||meta.width!==meta.height)throw Error(`Expected a square alpha atlas: ${name}`);
  const scale=351/(meta.width/4);const composites=[];const frames=[];
  for(let i=0;i<16;i++){
    const x=Math.round(i%4*meta.width/4),y=Math.round(Math.floor(i/4)*meta.height/4);
    const width=Math.round((i%4+1)*meta.width/4)-x,height=Math.round((Math.floor(i/4)+1)*meta.height/4)-y;
    const cell=sharp(await sharp(bytes).extract({left:x,top:y,width,height}).png().toBuffer());
    const {data,info}=await cell.clone().raw().toBuffer({resolveWithObject:true});
    let left=width,right=-1,top=height,bottom=-1;
    for(let yy=0;yy<height;yy++)for(let xx=0;xx<width;xx++)if(data[(yy*width+xx)*info.channels+3]>32){left=Math.min(left,xx);right=Math.max(right,xx);top=Math.min(top,yy);bottom=Math.max(bottom,yy);}
    if(right<left)throw Error(`Empty sprite ${name}:${i}`);
    left=Math.max(0,left-2);right=Math.min(width-1,right+2);top=Math.max(0,top-2);bottom=Math.min(height-1,bottom+2);
    const crop={left,top,width:right-left+1,height:bottom-top+1};
    const rendered=await cell.clone().extract(crop).resize({width:Math.round(crop.width*scale)}).png().toBuffer();
    const size=await sharp(rendered).metadata();
    // Center the original cell, not the variable silhouette: a waving hoof or
    // curled tail must not pull the face sideways between frames.
    const offsetX=Math.round(192+(left-width/2)*scale),offsetY=354-size.height;
    if(offsetX<0||offsetX+size.width>384||offsetY<0)throw Error(`Sprite crosses its cell: ${name}:${i}`);
    composites.push({input:rendered,left:i%4*384+offsetX,top:Math.floor(i/4)*384+offsetY});
    frames.push({index:i,sourceCell:{x,y,width,height},sourceCrop:crop,baseline:354,offset:{x:offsetX,y:offsetY},width:size.width,height:size.height,sha256:createHash('sha256').update(rendered).digest('hex')});
  }
  const target=join(output,`${name}.webp`);
  await sharp({create:{width:1536,height:1536,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(composites).webp({quality:95,alphaQuality:100,effort:6}).toFile(target);
  manifest.sheets[name]={url:`/assets/moonlit-lotus/yeoni/2d-v2/${name}.webp`,width:1536,height:1536,bytes:(await readFile(target)).length,frames,sourceSha256:createHash('sha256').update(bytes).digest('hex')};
}
await copyFile('public/assets/moonlit-lotus/yeoni/2d-v1/reference.webp',join(output,'reference.webp'));
await sharp(join(output,'expressions.webp')).extract({left:0,top:0,width:384,height:384}).webp({quality:95}).toFile(join(output,'still.webp'));
await writeFile(join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({authoredFrames:80,sheets:Object.fromEntries(Object.entries(manifest.sheets).map(([name,sheet])=>[name,{frames:sheet.frames.length,bytes:sheet.bytes}]))},null,2));
