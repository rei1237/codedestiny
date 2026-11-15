import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import ts from 'typescript';
const root=new URL('../../',import.meta.url);
const compile=p=>ts.transpileModule(readFileSync(new URL(p,root),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const data=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const source=compile('app/moonlit-lotus/_lib/photo-poses.ts')
 .replace('../model-review/sprite-clips',data(compile('app/moonlit-lotus/model-review/sprite-clips.ts')))
 .replace('./companions',data(compile('app/moonlit-lotus/_lib/companions.ts')));
const {photoDrawing,PHOTO_POSES,PHOTO_ART_POSES}=await import(data(source));
const {transformGesture,hitTransform,constrainTransform}=await import(data(compile('app/moonlit-lotus/_lib/photo-transform.ts')));

test('photo gestures keep the pinch midpoint and rotate in aspect-independent coordinates',()=>{
 const t={x:.5,y:.3,size:.2,rotation:0};
 const result=transformGesture(t,[{x:.4,y:.3},{x:.6,y:.3}],[{x:.5,y:.1},{x:.5,y:.5}],2/3);
 for(const [key,value] of Object.entries({x:.5,y:.3,size:.4,rotation:90}))assert.ok(Math.abs(result[key]-value)<1e-8);
 const resumed=transformGesture(result,[{x:.5,y:.5}],[{x:.55,y:.52}],2/3);
 assert.ok(Math.abs(resumed.x-.55)<1e-8);assert.ok(Math.abs(resumed.y-.32)<1e-8);
 assert.equal(resumed.size,result.size);assert.equal(resumed.rotation,result.rotation);
});
test('rotated caption hit areas and off-canvas gesture bounds remain recoverable',()=>{
 const t={x:.5,y:.3,size:.2,rotation:90};
 assert.ok(hitTransform({x:.5,y:.39},t,.2,.05));
 assert.ok(!hitTransform({x:.59,y:.3},t,.2,.05));
 assert.deepEqual(constrainTransform({x:-3,y:5,size:8,rotation:720},2/3),{x:0,y:2/3,size:.8,rotation:0});
 assert.deepEqual(transformGesture(t,[],[],2/3),t);
});
test('changing Hanbi to Yeongnyangi or Yeoni does not reuse the old photo character',()=>{
 const savedLook={species:'hanbi'};
 for(const [pose] of PHOTO_POSES){
  assert.match(photoDrawing('custom',savedLook,'',pose).url,/unique-v1\/hanbi-motion/);
  assert.match(photoDrawing('cat',savedLook,'',pose).url,/companions-v2\/cat-motion/);
  assert.match(photoDrawing('yeoni',savedLook,'',pose).url,/yeoni\/2d-v2/);
 }
});

test('photo illustrations preserve selected identity and all fifteen characters have four standalone assets',()=>{
 const manifest=JSON.parse(readFileSync(new URL('public/assets/moonlit-lotus/photo-v1/manifest.json',root),'utf8'));
 assert.equal(manifest.assets.length,60);
 const identities=['yeoni','cat','hanbi','mouse','ox','tiger','rabbit','dragon','snake','horse','sheep','monkey','rooster','dog','pig'];
 for(const id of identities)for(const [pose] of PHOTO_ART_POSES){
  const kind=id==='yeoni'||id==='cat'?id:'custom';
  const drawing=photoDrawing(kind,{species:kind==='custom'?id:'hanbi'},'',pose);
  assert.equal(drawing.url,`/assets/moonlit-lotus/photo-v1/${id}/${pose}.webp`);
  assert.equal(drawing.standalone,true);
  assert.ok(existsSync(new URL('public'+drawing.url,root)));
  assert.ok(manifest.assets.some(a=>a.character===id&&a.pose===pose&&a.width===512&&a.bytes<150000));
 }
 assert.match(photoDrawing('custom',{species:'unknown'},'','cheek').url,/\/yeoni\/cheek.webp$/);
});
test('every offered photo frame is within a shipped four-by-four sheet',()=>{
 for(const species of ['hanbi','yeongnyangi','mouse','ox','tiger','rabbit','dragon','snake','horse','sheep','monkey','rooster','dog','pig']){
  for(const [pose] of PHOTO_POSES){
   const {url,frame}=photoDrawing('custom',{species},'',pose);
   assert.ok(existsSync(new URL('public'+url,root)),url);
   assert.ok(Number.isInteger(frame)&&frame>=0&&frame<16);
  }
 }
});
