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
const {photoDrawing,PHOTO_POSES}=await import(data(source));
test('changing Hanbi to Yeongnyangi or Yeoni does not reuse the old photo character',()=>{
 const savedLook={species:'hanbi'};
 for(const [pose] of PHOTO_POSES){
  assert.match(photoDrawing('custom',savedLook,'',pose).url,/unique-v1\/hanbi-motion/);
  assert.match(photoDrawing('cat',savedLook,'',pose).url,/companions-v2\/cat-motion/);
  assert.match(photoDrawing('yeoni',savedLook,'',pose).url,/yeoni\/2d-v2/);
 }
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
