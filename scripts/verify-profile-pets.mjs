import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { PET_SPECIES, PET_ART_VERSION, PET_ELEMENT_COATS, PET_COMBINATIONS_PER_SPECIES } from '../js/core/profile-pet.mjs';
const root = new URL('../public/assets/profile-pets/' + PET_ART_VERSION + '/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('art-manifest.json', root), 'utf8'));
assert.equal(PET_SPECIES.length, 16);
assert.equal(Object.keys(PET_ELEMENT_COATS).length, 5);
assert.equal(PET_COMBINATIONS_PER_SPECIES, 1048576);
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
  // Body cutouts must not hide an opaque paper rectangle inside letterboxing.
  const { data: rgba, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (item.file.endsWith('-body.webp') || item.file.endsWith('-sleep.webp')) {
    for (let row = 0; row < item.rows; row++) for (let col = 0; col < item.columns; col++) {
      const alphaAt = (x, y) => rgba[((row * item.cellSize + y) * info.width + col * item.cellSize + x) * 4 + 3];
      let left = item.cellSize, top = item.cellSize, right = 0, bottom = 0;
      for (let y = 8; y < item.cellSize - 8; y++) for (let x = 8; x < item.cellSize - 8; x++) if (alphaAt(x, y) > 32) {
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      let cornerAlpha = 0;
      for (const x of [left + 2, right - 7]) for (const y of [top + 2, bottom - 7]) {
        for (let dy = 0; dy < 6; dy++) for (let dx = 0; dx < 6; dx++) cornerAlpha += alphaAt(x + dx, y + dy);
      }
      assert.ok(cornerAlpha / 144 < 128, item.id + ' frame ' + row + ':' + col + ' has a paper background inside its padding');
    }
  }
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
for (const name of ['headwear', 'neckwear', 'props']) {
  const url = new URL('../public/assets/profile-pets/moon-garden-v2/' + name + '.webp', import.meta.url);
  const buffer = await readFile(url), meta = await sharp(buffer).metadata();
  assert.equal(meta.width, 1024); assert.equal(meta.height, 1024); assert.equal(meta.hasAlpha, true);
  assert.ok(buffer.length < 500000, name + ' size budget');
  const tiles = new Set();
  for (let top = 0; top < 1024; top += 256) for (let left = 0; left < 1024; left += 256) {
    const tile = await sharp(buffer).extract({top,left,width:256,height:256}).raw().toBuffer();
    const stats = await sharp(buffer).extract({top,left,width:256,height:256}).stats();
    assert.equal(stats.channels[3].min, 0, name + ' transparent tile');
    assert.ok(stats.channels[3].mean > 12 && stats.channels[3].mean < 240, name + ' visible isolated tile');
    tiles.add(createHash('sha256').update(tile).digest('hex'));
  }
  assert.equal(tiles.size, 16, name + ' contains sixteen distinct authored parts');
}
console.log('Profile pets: 16 species × 16 frames, five element colors, 1,048,576 visible outfit combinations, 35 original atlases and 48 new transparent parts verified.');
