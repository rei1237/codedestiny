import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import sharp from 'sharp';
const root=new URL('../../',import.meta.url),base=new URL('public/assets/moonlit-lotus/zodiac-v1/',root);
const code=ts.transpileModule(readFileSync(new URL('app/moonlit-lotus/_lib/companions.ts',root),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const c=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('only twelve zodiac animals resolve; profile photos never become a generic body',()=>{
 assert.equal(c.COMPANIONS.length,12);
 assert.equal(c.speciesOf({species:'profile'},'/assets/profile-pets/moon-garden-v1/tiger-body.webp'),'tiger');
 assert.equal(c.speciesOf({species:'lion'},''),null);
 assert.equal(c.speciesOf({species:'profile'},'https://example.com/portrait.jpg'),null);
 for(const [s] of c.COMPANIONS){assert.equal(c.walkDrawing('custom',{species:s},'').offset,12);assert.equal(c.zodiacFrame('bow',0,0),0);assert.equal(c.zodiacFrame('bow',1,0),15);assert.equal(c.zodiacFrame('bow',.5,0),8);}
});
test('Hanbi is a separate unique companion with sixteen-frame walking',()=>{
 assert.equal(c.speciesOf({species:'hanbi'},''),'hanbi');
 assert.equal(c.isZodiac('hanbi'),false);
 assert.equal(c.walkDrawing('custom',{species:'hanbi'},'').frames,16);
 assert.match(c.walkDrawing('custom',{species:'hanbi'},'').url,/unique-v1\/hanbi-walk/);
});
test('Hanbi retains forty-eight transparent full-body drawings',async()=>{
 const dir=new URL('public/assets/moonlit-lotus/unique-v1/',root),m=JSON.parse(readFileSync(new URL('manifest.json',dir)));
 assert.equal(m.assets.length,3);
 for(const a of m.assets){
  const data=readFileSync(new URL(a.species+'.webp',dir)),meta=await sharp(data).metadata();
  assert.equal(meta.width,1536);assert.equal(meta.height,1536);assert(meta.hasAlpha);assert(data.length<1500000);
  assert.equal(new Set(a.frames.map(f=>f.sha256)).size,16);
 }
});
test('all twelve animals have distinct full-body poses and a separate sixteen-frame bow',async()=>{
 const m=JSON.parse(readFileSync(new URL('manifest.json',base)));
 assert.equal(m.assets.length,24);
 for(const a of m.assets){
  const data=readFileSync(new URL(a.species+'.webp',base)),meta=await sharp(data).metadata();
  assert.equal(meta.width,1536);assert.equal(meta.height,1536);assert(meta.hasAlpha);assert(data.length<1500000);
  assert.equal(new Set(a.frames.map(f=>f.sha256)).size,16);
  const {data:pixels}=await sharp(data).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let clear=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]<8)clear++;
  assert(clear/(1536*1536)>.25,a.species+' must have clear background');
  if(a.species.endsWith('-bow'))assert(a.frames[8].height<a.frames[0].height*.85,a.species+' must lower its body');
 }
});
