/** Packs authored 4x4 sheets. Never synthesizes or stretches a pose. */
import sharp from 'sharp';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const ids=['cat','hanbi','mouse','ox','tiger','rabbit','dragon','snake','horse','sheep','monkey','rooster','dog','pig'];
const source=resolve(process.argv[2]||'D:/CodeDestiny-Build/moonlit-lotus/companions-rear-v1');
const root='public/assets/moonlit-lotus/companions-rear-v1';
const selected=process.argv[3]?.split(',')||ids;
if(selected.some(id=>!ids.includes(id)))throw Error('Unknown companion');
const catalog=process.argv[3]?JSON.parse(await readFile('app/moonlit-lotus/_lib/companion-rear-timelines.json','utf8')):{};
function timeline(manifest){
 const all=Object.entries(manifest.sheets).flatMap(([sheet,v])=>v.frames.map(f=>({sheet,frame:f.index,height:f.height})));
 const descending=all.filter(f=>f.sheet!=='up'&&!(f.sheet==='down'&&f.frame===0)).sort((a,b)=>b.height-a.height);
 const rising=all.filter(f=>f.sheet==='up').sort((a,b)=>a.height-b.height);
 const bridge=all.filter(f=>f.sheet==='lower'&&f.height<rising[0].height).sort((a,b)=>a.height-b.height);
 const recovery=[...bridge];
 for(const next of rising){
  let last=recovery.at(-1);
  while(last&&next.height-last.height>20){
   const between=all.filter(f=>f.height>last.height&&f.height<=last.height+20&&f.height<next.height).sort((a,b)=>b.height-a.height)[0];
   if(!between)break;recovery.push(between);last=between;
  }
  recovery.push(next);
 }
 const pose=({sheet,frame})=>({sheet,frame});
 return {down:[{sheet:'down',frame:0},...descending.map(pose)],up:[...recovery.map(pose),{sheet:'down',frame:0}]};
}
// An atlas can contain a tiny edge of the next row in a gutter. Register the
// character's connected silhouette, not that unrelated row fragment.
function silhouetteBounds(raw,width,height){
 const seen=new Uint8Array(width*height),parts=[],queue=new Int32Array(width*height);
 for(let at=0;at<seen.length;at++){
  if(seen[at]||raw[at*4+3]<=32)continue;
  let head=0,tail=1,l=width,t=height,r=-1,b=-1;queue[0]=at;seen[at]=1;
  while(head<tail){const p=queue[head++],x=p%width,y=Math.floor(p/width);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);
   for(const q of [x? p-1:-1,x+1<width?p+1:-1,y?p-width:-1,y+1<height?p+width:-1])if(q>=0&&!seen[q]&&raw[q*4+3]>32){seen[q]=1;queue[tail++]=q;}
  }
  parts.push({l,t,r,b,area:tail});
 }
 parts.sort((a,b)=>b.area-a.area);if(!parts.length)throw Error('Empty cell');
 const main=parts[0],padding=Math.ceil(height*.025),near=parts.filter(p=>p.r>=main.l-padding&&p.l<=main.r+padding&&p.b>=main.t-padding&&p.t<=main.b+padding);
 return {l:Math.min(...near.map(p=>p.l)),t:Math.min(...near.map(p=>p.t)),r:Math.max(...near.map(p=>p.r)),b:Math.max(...near.map(p=>p.b))};
}
for(const id of selected){
 if(process.argv.includes('--timelines-only')){catalog[id]=timeline(JSON.parse(await readFile(resolve(root,id,'manifest.json'),'utf8')));continue;}
 const frames=[],sources={};
 for(const sheet of ['down','lower','up']){
  const bytes=await readFile(join(source,id,sheet+'-source.png')),meta=await sharp(bytes).metadata();
  if(!meta.hasAlpha)throw Error(id+': alpha required');
  sources[sheet]=createHash('sha256').update(bytes).digest('hex');
  for(let index=0;index<16;index++){
   const x=Math.round(index%4*meta.width/4),y=Math.round(Math.floor(index/4)*meta.height/4);
   const width=Math.round((index%4+1)*meta.width/4)-x,height=Math.round((Math.floor(index/4)+1)*meta.height/4)-y;
   const raw=await sharp(bytes).extract({left:x,top:y,width,height}).ensureAlpha().raw().toBuffer();
   const {l,t,r,b}=silhouetteBounds(raw,width,height);
   if(r<l)throw Error(id+sheet+index+': empty frame');
   frames.push({sheet,index,raw,cellWidth:width,cellHeight:height,l,t,w:r-l+1,h:b-t+1});
  }
 }
 // A sheet has a single scale, so a bow becomes shorter rather than filling its cell.
 // The three authored sheets each include an upright reference (down/lower:0,
 // up:15). Register that reference once per sheet, never resize individual poses.
 const scales=Object.fromEntries(['down','lower','up'].map(sheet=>[sheet,300/frames.find(f=>f.sheet===sheet&&f.index===(sheet==='up'?15:0)).h]));
 const fit=Math.min(1,...frames.map(f=>Math.min(348/(f.w*scales[f.sheet]),330/(f.h*scales[f.sheet]))));
 const output=resolve(root,id);await mkdir(output,{recursive:true});
 const manifest={version:'companions-rear-v1',character:id,columns:4,rows:4,cell:384,baseline:354,authoredFrames:48,sheets:{}};
 for(const sheet of ['down','lower','up']){
  const pieces=[],details=[];
  for(const f of frames.filter(f=>f.sheet===sheet)){
   const scale=scales[sheet]*fit;
   const w=Math.max(1,Math.round(f.w*scale)),h=Math.max(1,Math.round(f.h*scale));
   const x=Math.round((384-w)/2),y=354-h;
   if(y<0||w>384)throw Error(id+sheet+f.index+': frame overflow');
   const input=await sharp(f.raw,{raw:{width:f.cellWidth,height:f.cellHeight,channels:4}}).extract({left:f.l,top:f.t,width:f.w,height:f.h}).resize(w,h).png().toBuffer();
   pieces.push({input,left:f.index%4*384+x,top:Math.floor(f.index/4)*384+y});
   details.push({index:f.index,width:w,height:h,x,y,baseline:354});
  }
  const dest=join(output,sheet+'.webp');
  await sharp({create:{width:1536,height:1536,channels:4,background:'#00000000'}}).composite(pieces).webp({quality:95,alphaQuality:100,effort:6}).toFile(dest);
  manifest.sheets[sheet]={url:`/assets/moonlit-lotus/companions-rear-v1/${id}/${sheet}.webp`,bytes:(await readFile(dest)).length,sourceSha256:sources[sheet],frames:details};
 }
 await sharp(join(output,'down.webp')).extract({left:0,top:0,width:384,height:384}).webp({quality:95}).toFile(join(output,'still.webp'));
 await writeFile(join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 catalog[id]=timeline(manifest);
 console.log(id,Object.values(manifest.sheets).reduce((s,v)=>s+v.bytes,0));
}
await writeFile('app/moonlit-lotus/_lib/companion-rear-timelines.json',JSON.stringify(catalog,null,2)+'\n');
