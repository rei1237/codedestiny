import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import sharp from 'sharp';
const file=new URL('../../app/moonlit-lotus/model-review/bow-session.ts',import.meta.url);
const compiled=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
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
  const base=new URL('../../public/assets/moonlit-lotus/yeoni/2d-v1/',import.meta.url);
  const manifest=JSON.parse(readFileSync(new URL('manifest.json',base),'utf8'));
  assert.equal(manifest.renderer,'2d-sprite');
  for(const [name,sheet] of Object.entries(manifest.sheets)){
    const bytes=readFileSync(new URL(`${name}.webp`,base));const meta=await sharp(bytes).metadata();
    assert.equal(meta.width,1536);assert.equal(meta.height,1152);assert(meta.hasAlpha);assert(bytes.length<1500000);assert.equal(sheet.bytes,bytes.length);assert.equal(sheet.frames.length,12);
    const {data,info}=await sharp(bytes).raw().toBuffer({resolveWithObject:true});
    assert(data.some((value,index)=>index%info.channels===3&&value===0),'transparent pixels required');
    for(const frame of sheet.frames){assert.equal(frame.baseline,354);assert(frame.sourceCrop.width>0);}
  }
});
