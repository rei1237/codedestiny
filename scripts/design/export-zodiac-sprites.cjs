/* Pack generated drawings without synthesizing poses or stretching crouched bodies.
 * node scripts/design/export-zodiac-sprites.cjs <generated-images-directory> <source-backup-directory>
 */
const sharp=require('sharp');
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const sources={mouse:'cd89a89f-00fe-4b5a-bb4c-7715c0fb976c',ox:'a909d0c9-b62f-4074-aa32-2d393a39994d',tiger:'98269fe4-39bb-43d0-b8ae-d5a6399e1592',rabbit:'1159e51f-f04f-4df0-95ec-11529082e8ae',dragon:'c6d4fb50-c16d-4977-a7fd-ef1aad6d9c0b',snake:'6e86be02-a674-4d7d-9aaa-499885a3a0ac',horse:'bc921d73-b2f5-499f-900b-e641a0d3bc96',sheep:'34d49090-25bd-467c-8d35-47e10ea77dc5',monkey:'036f43ae-2af2-41ff-9331-63d6dd889563',rooster:'23fdb2d8-b3ff-4164-81b0-891b9733b6e0',dog:'97349990-4462-4b1d-a7d1-586b3cbb3d30',pig:'4868d4a9-6c53-4a5a-bc30-e90772f12834'};
const bowSources={"mouse":"934fb276-1cd9-48d0-812e-f6e5e78b0426","ox":"5e408954-3324-453b-9753-4be96aa21461","tiger":"7a4c8da2-d01f-451b-bb6a-944245c19ef2","rabbit":"d2fb6dd9-e7b2-4776-a75d-0d59ac66d4e1","dragon":"8ea85928-0927-4791-ab6f-d72d4360114e","snake":"3955c363-8497-480c-8f81-011b4bca3242","horse":"3506d6e4-cfe2-468b-ab36-86a42f02abd3","sheep":"46b2f047-deb7-4d23-8df3-1be2d0e52321","monkey":"4fd6a7d6-bbcf-409c-b8aa-a5736a6400d4","rooster":"e36f7794-7d83-4c78-8d98-d8c70a2b3250","dog":"3c229e67-78b9-4941-a334-6dccf8f5f6f6","pig":"2e1d76b2-d614-45b7-9c83-4b5510eeb867"};
const uniqueSources={"hanbi-motion":"e96d6d67-c0d9-4b92-b1d7-714f6663895a","hanbi-walk":"0f7b61b0-63b8-4fe3-a1e6-440d39a70692","hanbi-bow":"17f5f6c8-801a-44c7-a977-6b0107bbdf4b"};
const cell=384,inner=346,baseline=354;
const empty=(width,height)=>sharp({create:{width,height,channels:4,background:{r:0,g:0,b:0,alpha:0}}});
async function main(){
 const [sourceDir,backupDir]=process.argv.slice(2);
 if(!sourceDir||!backupDir)throw Error('Provide generated source and backup directories');
 const unique=process.argv.includes('--hanbi');
 const out=path.resolve('public/assets/moonlit-lotus/'+(unique?'unique-v1':'zodiac-v1'));
 await fs.mkdir(out,{recursive:true});await fs.mkdir(backupDir,{recursive:true});
 const manifest={version:1,generator:'built-in image_gen',cell,baseline,columns:4,rows:4,frames:['idle','blink','greeting','meditation','prayer','lower','kneel','floor_support','bow_low','recover_support','recover_kneel','stand_prayer','walk_contact','walk_pass','walk_opposite_contact','walk_opposite_pass'],assets:[]};
 for(const [species,id] of Object.entries(unique?uniqueSources:{...sources,...Object.fromEntries(Object.entries(bowSources).map(([s,id])=>[s+'-bow',id]))})){
  const source=await fs.readFile(path.join(sourceDir,`exec-${id}.png`));
  await fs.writeFile(path.join(backupDir,`${species}-source.png`),source);
  const meta=await sharp(source).metadata(),tiles=[],frames=[];
  // Generated art has small grid offsets. Split in the transparent gutters,
  // not through the feet of the preceding row at an assumed quarter-line.
  const raw=await sharp(source).ensureAlpha().raw().toBuffer();
  const gutter=(size,other,vertical)=>[0,...[1,2,3].map(n=>{
   const nominal=Math.round(n*size/4),radius=Math.round(size/40);
   let best=nominal,score=Infinity;
   for(let pos=nominal-radius;pos<=nominal+radius;pos++){
    let count=0;for(let j=0;j<other;j++){const x=vertical?j:pos,y=vertical?pos:j;if(raw[(y*meta.width+x)*4+3]>100)count++;}
    const next=count*size+Math.abs(pos-nominal);if(next<score){score=next;best=pos;}
   }return best;
  }),size];
  const xs=gutter(meta.width,meta.height,false),ys=gutter(meta.height,meta.width,true);
  for(let n=0;n<16;n++){
   const x=n%4,y=Math.floor(n/4),left=xs[x],top=ys[y];
   const resized=await sharp(source).extract({left,top,width:xs[x+1]-left,height:ys[y+1]-top}).resize(inner,inner,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).ensureAlpha().raw().toBuffer();
   let maxY=0,minY=inner;
   for(let py=0;py<inner;py++)for(let px=0;px<inner;px++)if(resized[(py*inner+px)*4+3]>20){maxY=Math.max(maxY,py);minY=Math.min(minY,py);}
   const tile=await empty(cell,cell).composite([{input:resized,raw:{width:inner,height:inner,channels:4},left:19,top:baseline-maxY}]).png().toBuffer();
   tiles.push({input:tile,left:x*cell,top:y*cell});
   frames.push({name:unique?species+'_'+n:species.endsWith('-bow')?'bow_'+n:manifest.frames[n],height:maxY-minY+1,sha256:crypto.createHash('sha256').update(tile).digest('hex')});
   if(n===0&&(!unique&&!species.endsWith('-bow')||unique&&species==='hanbi-motion'))await sharp(tile).resize(192,192).webp({quality:88}).toFile(path.join(out,`${unique?'hanbi':species}-still.webp`));
  }
  const packed=await empty(cell*4,cell*4).composite(tiles).webp({quality:88}).toBuffer();
  await fs.writeFile(path.join(out,`${species}.webp`),packed);
  manifest.assets.push({species,source:id,bytes:packed.length,frames});
 }
 await fs.writeFile(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 console.log(JSON.stringify({species:manifest.assets.length,drawings:manifest.assets.length*16,sheetBytes:manifest.assets.reduce((sum,a)=>sum+a.bytes,0)}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
