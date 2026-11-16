import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import sharp from 'sharp';
const compile=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const data=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const clips=data(compile(readFileSync('app/moonlit-lotus/model-review/sprite-clips.ts','utf8')));
const {BOW_CLIP}=await import(clips);
const source=compile(readFileSync('app/moonlit-lotus/_lib/yeoni-rear.ts','utf8')).replace(/(['"])\.\.\/model-review\/sprite-clips\1/,JSON.stringify(clips));
const {rearPoseAt,REAR_DOWN,REAR_UP}=await import(data(source));
test('registered silhouettes never rise during descent or drop during recovery',()=>{
 const manifest=JSON.parse(readFileSync('public/assets/moonlit-lotus/yeoni/rear-v3/manifest.json','utf8'));
 for(const [sequence,direction] of [[REAR_DOWN,-1],[REAR_UP,1]]){
  const heights=sequence.map(p=>manifest.sheets[p.sheet].frames[p.frame].height);
  for(let i=1;i<heights.length;i++){assert((heights[i]-heights[i-1])*direction>=0);assert(Math.abs(heights[i]-heights[i-1])<=18);}
 }
});
test('rear timeline is bounded, visits all 48 drawings, and returns to original prayer before completion',()=>{
 const cycle=BOW_CLIP.reduce((sum,p)=>sum+p.ms,0),seen=new Set();
 for(let t=0;t<=cycle;t+=10){const p=rearPoseAt(t);assert(['down','lower','up'].includes(p.sheet));assert(p.frame>=0&&p.frame<16);seen.add(p.sheet+':'+p.frame);}
 assert.equal(seen.size,48);
 assert.deepEqual(rearPoseAt(cycle-1),{sheet:'down',frame:0});
 for(const t of [NaN,-10,Infinity])assert.deepEqual(rearPoseAt(t),{sheet:'down',frame:0});
});
test('painted rear assets have alpha, 48 registered cells, valid sizes and real files',async()=>{
 const base='public/assets/moonlit-lotus/yeoni/rear-v3/',manifest=JSON.parse(readFileSync(base+'manifest.json','utf8'));
 assert.equal(manifest.authoredFrames,48);
 for(const [name,sheet] of Object.entries(manifest.sheets)){
  const bytes=readFileSync(base+name+'.webp'),meta=await sharp(bytes).metadata();
  assert.equal(meta.width,1536);assert.equal(meta.height,1536);assert(meta.hasAlpha);assert.equal(bytes.length,sheet.bytes);assert(bytes.length<1000000);
  assert.equal(sheet.frames.length,16);
  for(const frame of sheet.frames){assert.equal(frame.y+frame.height,354);assert(frame.x>=0&&frame.x+frame.width<=384);assert(frame.y>=0);}
 }
});
