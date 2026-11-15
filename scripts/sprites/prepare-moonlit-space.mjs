import sharp from 'sharp';
import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const source=process.argv[2]||'D:/CodeDestiny-Build/moonlit-lotus/space-v1';
const output='public/assets/moonlit-lotus/space-v1';
await mkdir(output,{recursive:true});
const manifest={version:1,scenes:{},characters:{},sourceFolder:source};
for(const name of ['courtyard','hall','pond']){
 const bytes=await readFile(join(source,name+'-source.png'));
 manifest.scenes[name]={sourceSha256:createHash('sha256').update(bytes).digest('hex'),sizes:{}};
 for(const width of [768,1536]){
  const target=join(output,name+'-'+width+'.webp');
  await sharp(bytes).resize({width,withoutEnlargement:true}).webp({quality:86,effort:6}).toFile(target);
  manifest.scenes[name].sizes[width]=(await readFile(target)).length;
 }
}
for(const name of ['cat-motion','cat-bow']){
 const bytes=await readFile(join(source,name+'-source.png')),meta=await sharp(bytes).metadata();
 const tiles=[],frames=[];
 const scale=340/(meta.width/4);
 for(let i=0;i<16;i++){
  const x=Math.round(i%4*meta.width/4),y=Math.round(Math.floor(i/4)*meta.height/4);
  const width=Math.round((i%4+1)*meta.width/4)-x,height=Math.round((Math.floor(i/4)+1)*meta.height/4)-y;
  const cell=await sharp(bytes).extract({left:x,top:y,width,height}).png().toBuffer();
  const {data,info}=await sharp(cell).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let l=width,t=height,r=0,b=0;
  for(let py=0;py<height;py++)for(let px=0;px<width;px++)if(data[(py*width+px)*info.channels+3]>32){l=Math.min(l,px);r=Math.max(r,px);t=Math.min(t,py);b=Math.max(b,py);}
  l=Math.max(0,l-2);t=Math.max(0,t-2);r=Math.min(width-1,r+2);b=Math.min(height-1,b+2);
  const tile=await sharp(cell).extract({left:l,top:t,width:r-l+1,height:b-t+1}).resize({width:Math.round((r-l+1)*scale)}).png().toBuffer();
  const size=await sharp(tile).metadata(),left=Math.round(192+(l-width/2)*scale),top=354-size.height;
  if(left<0||top<0||left+size.width>384)throw Error('cell overflow '+name+i);
  tiles.push({input:tile,left:i%4*384+left,top:Math.floor(i/4)*384+top});
  frames.push({index:i,source:{x,y,width,height},sha256:createHash('sha256').update(tile).digest('hex'),baseline:354});
 }
 const target=join(output,name+'.webp');
 await sharp({create:{width:1536,height:1536,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(tiles).webp({quality:94,alphaQuality:100}).toFile(target);
 manifest.characters[name]={frames,bytes:(await readFile(target)).length};
 await sharp(target).flatten({background:'#fff0f1'}).resize(900).png().toFile(join(source,name+'-preview.png'));
}
await sharp(join(output,'cat-motion.webp')).extract({left:0,top:0,width:384,height:384}).webp().toFile(join(output,'cat-still.webp'));
await writeFile(join(output,'manifest.json'),JSON.stringify(manifest,null,2));
await copyFile(join(output,'manifest.json'),join(source,'manifest.json'));
console.log(manifest.scenes,Object.fromEntries(Object.entries(manifest.characters).map(([k,v])=>[k,v.bytes])));
