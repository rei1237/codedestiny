import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import sharp from 'sharp';
const root=new URL('../../',import.meta.url),base=new URL('public/assets/moonlit-lotus/companions-v2/',root);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',base)));
test('every room species has a transparent four-frame walk within the image budget',async()=>{
 const animals=manifest.assets.filter(item=>item.species);
 assert.equal(animals.length,15);
 for(const animal of animals){
  const data=readFileSync(new URL(animal.species+'-walk.webp',base));
  const meta=await sharp(data).metadata();assert.equal(meta.width,1536);assert.equal(meta.height,384);assert.equal(meta.hasAlpha,true);assert(data.length<400000);
  const poses=[];for(let i=0;i<4;i++)poses.push(await sharp(data).extract({left:i*384,top:0,width:384,height:384}).raw().toBuffer());
  assert(poses.some(p=>!p.equals(poses[0])),animal.species+' must have distinct poses');
 }
});
test('cat motion sheets retain all 16 transparent cells',async()=>{
 for(const name of ['cat-motion','cat-walk','cat-bow']){const data=readFileSync(new URL(name+'.webp',base));const meta=await sharp(data).metadata();assert.equal(meta.width,1536);assert.equal(meta.height,1536);assert(meta.hasAlpha);assert(data.length<1500000);}
});
