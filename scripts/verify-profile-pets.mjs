import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { PET_SPECIES, PET_ART_VERSION, PET_ELEMENT_COATS, PET_COMBINATIONS_PER_SPECIES } from '../js/core/profile-pet.mjs';
const root = new URL('../public/assets/profile-pets/' + PET_ART_VERSION + '/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('art-manifest.json', root), 'utf8'));
assert.equal(PET_SPECIES.length, 16);
assert.equal(Object.keys(PET_ELEMENT_COATS).length, 5);
assert.equal(PET_COMBINATIONS_PER_SPECIES, 192);
assert.equal(manifest.length, 35);
const hashes = new Set();
for (const item of manifest) {
  const url = new URL(item.file, root), buffer = await readFile(url), meta = await sharp(buffer).metadata();
  assert.equal(meta.width, item.columns * item.cellSize, item.id);
  assert.equal(meta.height, item.rows * item.cellSize, item.id);
  assert.equal(meta.hasAlpha, true, item.id);
  const stats = await sharp(buffer).stats();
  assert.equal(stats.channels[3].min, 0, item.id + ' transparent margins');
  assert.ok(stats.channels[3].max > 200, item.id + ' visible art');
  assert.ok((await stat(url)).size < 350000, item.id + ' size budget');
  const hash = createHash('sha256').update(buffer).digest('hex');
  assert.ok(!hashes.has(hash), item.id + ' unique authored sheet'); hashes.add(hash);
  assert.equal(item.tool, 'image_gen'); assert.ok(item.prompt.length > 100);
  assert.equal(item.frames.length, item.columns, item.id + ' source frame mapping');
  assert.ok(item.rowOffset + item.rows <= item.sourceRows, item.id + ' source row mapping');
}
assert.deepEqual(manifest.find(item => item.id === 'yeongnyangi-sleep').frames, [1, 2, 3, 2], 'the unique mascot uses only closed-eye sleeping poses');
for (const species of PET_SPECIES) {
  assert.ok(manifest.some(item => item.file === species.id + '-body.webp' && item.columns === 4 && item.rows === 3), species.id + ' idle/feed/play');
  assert.ok(manifest.some(item => item.file === species.id + '-sleep.webp' && item.columns === 4 && item.rows === 1), species.id + ' sleep');
}
console.log('Profile pets: 16 species × 16 frames, five element colors, 192 trait combinations, 35 transparent optimized atlases verified.');
