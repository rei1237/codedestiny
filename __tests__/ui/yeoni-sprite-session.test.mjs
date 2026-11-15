import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import sharp from 'sharp';
const file=new URL('../../app/moonlit-lotus/model-review/bow-session.ts',import.meta.url);
const transpile=source=>ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const clipsUrl='data:text/javascript;base64,'+Buffer.from(transpile(readFileSync(new URL('../../app/moonlit-lotus/model-review/sprite-clips.ts',import.meta.url),'utf8'))).toString('base64');
const {BOW_CLIP,POSES,PREVIEW_CLIPS}=await import(clipsUrl);
const compiled=transpile(readFileSync(file,'utf8')).replace(/(['"])\.\/sprite-clips\1/,JSON.stringify(clipsUrl));
const {newSession,advance,finishCycle,restoreSession,serializeSession,CYCLE_MS,poseAt}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const runCycle=s=>{const goal=s.completed+1;for(let i=0;i<500&&s.completed<goal;i++)s=advance(s,100);assert.equal(s.completed,goal);return s;};
test('only full standing-return cycles count, duplicate/wrong-session completion cannot count',()=>{
  let s={...newSession('one'),status:'running'};
  assert.equal(finishCycle(s,'one',0),s);
  s={...s,elapsed:CYCLE_MS};assert.equal(finishCycle(s,'other',0),s);
  s=finishCycle(s,'one',0);assert.equal(s.completed,1);
  assert.equal(finishCycle({...s,elapsed:CYCLE_MS},'one',0).completed,1);
  assert.equal(poseAt(CYCLE_MS-1).frame,0);
});
test('108 cycles stop exactly once; extra ticks remain stopped',()=>{
  let s={...newSession('all'),status:'running'};
  for(let i=0;i<108;i++)s=runCycle(s);
  assert.equal(s.status,'complete');assert.equal(s.completed,108);
  for(let i=0;i<500;i++)assert.equal(advance(s,100),s);
});
test('37 complete + partial pause preserves position, reload keeps only completed cycles',()=>{
  let s={...newSession('resume'),status:'running'};
  for(let i=0;i<37;i++)s=runCycle(s);
  s=advance(s,200);s={...s,status:'paused'};
  assert.equal(advance(s,200),s);assert.equal(s.elapsed,200);
  const restored=restoreSession(serializeSession(s));
  assert.equal(restored.completed,37);assert.equal(restored.elapsed,0);assert.equal(restored.status,'paused');
  s=runCycle({...s,status:'running'});assert.equal(s.completed,38);
});
test('hidden-time gap never completes a cycle and speed waits for the boundary',()=>{
  let s={...newSession('speed',9),status:'running',elapsed:200,pendingSpeed:1.25};
  assert.equal(advance(s,60000),s);assert.equal(advance(s,NaN),s);
  s=advance(s,100);assert.equal(s.elapsed,300);assert.equal(s.speed,1);
  s=runCycle(s);assert.equal(s.speed,1.25);assert.equal(s.completed,1);
});
test('invalid storage rejected; stopped incomplete cycle is not rewarded',()=>{
  for(const value of ['{','null','{}',JSON.stringify({version:1,sessionId:'bad',status:'running',target:108,completed:109})])assert.equal(restoreSession(value),null);
  const restored=restoreSession(serializeSession({...newSession('stop'),status:'stopped',completed:5,elapsed:1000}));
  assert.equal(restored.completed,5);assert.equal(restored.status,'stopped');assert.equal(restored.elapsed,0);
});
test('sprite atlases have actual alpha, equal registered cells, valid references and bounded file size',async()=>{
  const base=new URL('../../public/assets/moonlit-lotus/yeoni/2d-v2/',import.meta.url);
  const manifest=JSON.parse(readFileSync(new URL('manifest.json',base),'utf8'));
  assert.equal(manifest.renderer,'2d-sprite');
  for(const [name,sheet] of Object.entries(manifest.sheets)){
    const bytes=readFileSync(new URL(`${name}.webp`,base));const meta=await sharp(bytes).metadata();
    assert.equal(meta.width,1536);assert.equal(meta.height,1536);assert(meta.hasAlpha);assert(bytes.length<1500000);assert.equal(sheet.bytes,bytes.length);assert.equal(sheet.frames.length,16);
    const {data,info}=await sharp(bytes).raw().toBuffer({resolveWithObject:true});
    assert(data.some((value,index)=>index%info.channels===3&&value===0),'transparent pixels required');
    for(const frame of sheet.frames){assert.equal(frame.baseline,354);assert(frame.sourceCrop.width>0);}
  }
  const drawings=Object.values(manifest.sheets).flatMap(sheet=>sheet.frames);
  assert.equal(drawings.length,80);assert.equal(new Set(drawings.map(frame=>frame.sha256)).size,80);
  for(const clip of [BOW_CLIP,...Object.values(PREVIEW_CLIPS),POSES]){
    for(const frame of clip)assert(manifest.sheets[frame.sheet].frames[frame.frame]);
  }
});
test('bow uses at least twice the original drawings, including hand support and exact standing return',()=>{
  assert(new Set(BOW_CLIP.map(item=>item.sheet+item.frame)).size>=32);
  assert.equal(BOW_CLIP[0].sheet,BOW_CLIP.at(-1).sheet);
  assert.equal(BOW_CLIP[0].frame,BOW_CLIP.at(-1).frame);
  assert(BOW_CLIP.every(item=>item.ms>0));
  assert(BOW_CLIP.some(item=>item.phase==='손으로 바닥 지지'));
  assert.equal(POSES.length,9);
});
