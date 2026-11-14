import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';
import {screenTarotBytes} from '../service/vite-service.mjs';
test('screen encoding preserves every card, resolution and original source while reducing bytes',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../../../public/assets/yeongnyangi/tarot/v1/manifest.json',import.meta.url),'utf8'));
 assert.equal(manifest.cards.length,78);
 for(const card of manifest.cards)assert.match(card.files.std,/\/[A-Z]\d{2}-600\.webp$/);
 for(const index of [0,22,50]){
  const path=new URL('../../../public'+manifest.cards[index].files.std,import.meta.url),source=await readFile(path),encoded=await screenTarotBytes(source);
  const before=await sharp(source).metadata(),after=await sharp(encoded).metadata();
  assert.deepEqual([after.width,after.height,after.hasAlpha],[before.width,before.height,before.hasAlpha]);
  assert.ok(encoded.length<source.length);assert.deepEqual(await readFile(path),source);
 }
});
