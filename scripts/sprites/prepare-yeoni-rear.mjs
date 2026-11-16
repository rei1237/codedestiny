/** Reproducible packing of the approved painted rear animation. No invented inbetweens. */
import sharp from 'sharp';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const source=resolve(process.argv[2]||'D:/CodeDestiny-Build/moonlit-lotus/yeoni/rear-v3');
const output=resolve('public/assets/moonlit-lotus/yeoni/rear-v3');
await mkdir(output,{recursive:true});
const manifest={version:'yeoni-rear-v3',renderer:'2d-sprite',columns:4,rows:4,cell:384,baseline:354,authoredFrames:48,sheets:{}};
for(const name of ['down','lower','up']){
 const bytes=await readFile(join(source,name+'-source.png')),meta=await sharp(bytes).metadata();
 if(!meta.hasAlpha)throw Error('Alpha required: '+name);
 const scale=330/(meta.height/4),pieces=[],frames=[];
 for(let i=0;i<16;i++){
  const x=Math.round(i%4*meta.width/4),y=Math.round(Math.floor(i/4)*meta.height/4);
  const width=Math.round((i%4+1)*meta.width/4)-x,height=Math.round((Math.floor(i/4)+1)*meta.height/4)-y;
  const cell=await sharp(bytes).extract({left:x,top:y,width,height}).ensureAlpha().raw().toBuffer();
  let left=width,top=height,right=-1,bottom=-1;
  for(let yy=0;yy<height;yy++)for(let xx=0;xx<width;xx++)if(cell[(yy*width+xx)*4+3]>32){left=Math.min(left,xx);right=Math.max(right,xx);top=Math.min(top,yy);bottom=Math.max(bottom,yy);}
  if(right<left)throw Error('Empty frame '+name+':'+i);
  const w=Math.round((right-left+1)*scale),h=Math.round((bottom-top+1)*scale);
  const image=await sharp(cell,{raw:{width,height,channels:4}}).extract({left,top,width:right-left+1,height:bottom-top+1}).resize(w,h).png().toBuffer();
  // Keep the original cell's horizontal center, not the changing silhouette.
  const offsetX=Math.round(192+(left-width/2)*scale),offsetY=354-h;
  if(offsetX<0||offsetX+w>384||offsetY<0)throw Error('Cross-cell image '+name+':'+i);
  pieces.push({input:image,left:i%4*384+offsetX,top:Math.floor(i/4)*384+offsetY});
  frames.push({index:i,width:w,height:h,x:offsetX,y:offsetY,baseline:354});
 }
 const target=join(output,name+'.webp');
 await sharp({create:{width:1536,height:1536,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(pieces).webp({quality:95,alphaQuality:100,effort:6}).toFile(target);
 manifest.sheets[name]={url:'/assets/moonlit-lotus/yeoni/rear-v3/'+name+'.webp',bytes:(await readFile(target)).length,sourceSha256:createHash('sha256').update(bytes).digest('hex'),frames};
}
await sharp(join(output,'down.webp')).extract({left:0,top:0,width:384,height:384}).webp({quality:95}).toFile(join(output,'still.webp'));
await writeFile(join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(manifest.sheets).map(([k,v])=>[k,v.bytes]))));
