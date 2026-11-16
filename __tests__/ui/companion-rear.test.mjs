import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import sharp from 'sharp';
const read=p=>readFileSync(p,'utf8');
const data=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const compile=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const clips=data(compile(read('app/moonlit-lotus/model-review/sprite-clips.ts')));
const companions=data(compile(read('app/moonlit-lotus/_lib/companions.ts')));
const motion=data(compile(read('app/moonlit-lotus/_lib/bow-drawing.ts')).replace("'../model-review/sprite-clips'",JSON.stringify(clips)));
const yeoni=data(compile(read('app/moonlit-lotus/_lib/yeoni-rear.ts')).replace("'./bow-drawing'",JSON.stringify(motion)));
const timeline=JSON.parse(read('app/moonlit-lotus/_lib/companion-rear-timelines.json'));
const source=compile(read('app/moonlit-lotus/_lib/companion-rear.ts')).replace("'./bow-drawing'",JSON.stringify(motion)).replace("'./companions'",JSON.stringify(companions)).replace("'./yeoni-rear'",JSON.stringify(yeoni)).replace(/import timelines from ['"].+?['"];?/,`const timelines=${JSON.stringify(timeline)};`);
const c=await import(data(source)),{BOW_CLIP}=await import(clips),cycle=BOW_CLIP.reduce((s,p)=>s+p.ms,0);
test('manual and profile animal selections resolve to matching rear identity',()=>{
 assert.equal(c.rearCharacterId('cat',{},''),'cat');
 assert.equal(c.rearCharacterId('yeoni',{species:'hanbi'},''),'yeoni');
 assert.equal(c.rearCharacterId('custom',{species:'yeongnyangi'},''),'cat');
 assert.equal(c.rearCharacterId('custom',{},'https://example.com/photo.png'),'yeoni');
 for(const id of Object.keys(timeline).filter(id=>id!=='cat')){
  assert.equal(c.rearCharacterId('custom',{species:id},''),id);
  assert.equal(c.rearCharacterId('custom',{},`/assets/profile-pets/${id}-body.webp`),id);
 }
});
test('all companion timelines are bounded and return to their exact initial drawing',()=>{
 assert.equal(Object.keys(timeline).length,14);
 for(const id of Object.keys(timeline)){
  const seen=new Set();
  for(let t=0;t<=cycle;t+=10){const p=c.companionRearPoseAt(id,t);assert(['down','lower','up'].includes(p.sheet));assert(Number.isInteger(p.frame)&&p.frame>=0&&p.frame<16);seen.add(p.sheet+':'+p.frame);}
  assert.equal(seen.size,new Set(timeline[id].down.map(p=>p.sheet+':'+p.frame)).size,id);
  assert.deepEqual(timeline[id].up,[...timeline[id].down].reverse());
  assert.equal(timeline[id].down.filter((p,i)=>i&&p.sheet!==timeline[id].down[i-1].sheet).length,1,id);
  const manifest=JSON.parse(read('public/assets/moonlit-lotus/companions-rear-v1/'+id+'/manifest.json'));
  const heights=timeline[id].down.map(p=>manifest.sheets[p.sheet].frames[p.frame].height);for(let i=1;i<heights.length;i++)assert(heights[i]<=heights[i-1],id+' descent cannot rise');
  for(const t of [0,-1,NaN,Infinity,cycle-1,cycle,cycle+500])assert.deepEqual(c.companionRearPoseAt(id,t),{sheet:'down',frame:0},id);
 }
});
test('fourteen transparent 48-frame sets fit their cells and compressed budget',async()=>{
 for(const id of Object.keys(timeline)){
  const base=`public/assets/moonlit-lotus/companions-rear-v1/${id}/`,m=JSON.parse(read(base+'manifest.json')),hashes=new Set();
  assert.equal(m.authoredFrames,48);let bytes=0;
  for(const [name,sheet] of Object.entries(m.sheets)){
   const buffer=readFileSync(base+name+'.webp'),meta=await sharp(buffer).metadata();bytes+=buffer.length;
   assert.equal(meta.width,1536);assert.equal(meta.height,1536);assert(meta.hasAlpha);assert.equal(buffer.length,sheet.bytes);
   for(const f of sheet.frames){
    assert.equal(f.y+f.height,354);assert(f.x>=0&&f.x+f.width<=384&&f.y>=0);
    const cell=await sharp(buffer).extract({left:f.index%4*384,top:Math.floor(f.index/4)*384,width:384,height:384}).raw().toBuffer();
    hashes.add(createHash('sha256').update(cell).digest('hex'));
   }
  }
  assert.equal(hashes.size,48,id+' unique drawings');assert(bytes<4500000,id+' budget');
 }
});
