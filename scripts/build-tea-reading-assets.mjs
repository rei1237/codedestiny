import sharp from 'sharp';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const source = path.join(root, 'assets/yeoni-teahouse/reading');
const output = path.join(root, 'public/images/fortune-tea-house/reading');
const provenance = JSON.parse(await readFile(path.join(source, 'provenance.json'), 'utf8'));
await mkdir(path.join(output, 'ten-gods'), { recursive: true });
const entries = [];
for (const item of provenance.assets) {
  if (item.id === 'tea-steam') continue;
  const size = item.id === 'yeoni-serving' || item.id === 'pig-brewing-clean' ? 640 : 512;
  const target = item.kind === 'ten-god' ? `ten-gods/${item.id}.webp` : `${item.id}.webp`;
  await sharp(path.join(source, `${item.id}.webp`)).resize(size - 64, size - 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 32, bottom: 32, left: 32, right: 32, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90, alphaQuality: 100 }).toFile(path.join(output, target));
  entries.push({ id: item.id, file: `/images/fortune-tea-house/reading/${target}`, width: size, height: size, bytes: (await stat(path.join(output, target))).size });
}
// Fixed porcelain/tray pixels are copied into every frame; only steam changes.
const size = 320;
const base = await sharp(path.join(output, 'tea-base.webp')).resize(size, size).png().toBuffer();
const atlas = sharp(path.join(source, 'tea-steam.webp'));
const meta = await atlas.metadata();
const tiles = [];
for (let frame = 0; frame < 16; frame++) {
  const col = frame % 4, row = Math.floor(frame / 4);
  const left = Math.floor(col * meta.width / 4), top = Math.floor(row * meta.height / 4);
  const steam = await atlas.clone().extract({ left, top, width: Math.floor((col + 1) * meta.width / 4) - left, height: Math.floor((row + 1) * meta.height / 4) - top })
    .resize(76, 124, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const tile = await sharp(base).composite([{ input: steam, left: 48, top: 70 }]).png().toBuffer();
  tiles.push({ input: tile, left: col * size, top: row * size });
}
await sharp({ create: { width: size * 4, height: size * 4, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(tiles).webp({ lossless: true }).toFile(path.join(output, 'tea-brewing-sheet.webp'));
entries.push({ id: 'tea-brewing-sheet', file: '/images/fortune-tea-house/reading/tea-brewing-sheet.webp', columns: 4, rows: 4, frames: 16, frameWidth: size, frameHeight: size, durationMs: 2400 });
await writeFile(path.join(output, 'manifest.json'), JSON.stringify({ version: 'tea-reading-20261026', entries }, null, 2) + '\n');
// Keep legacy references clean too; do not regenerate the unrelated character packs.
const clean = await readFile(path.join(output, 'pig-brewing-clean.webp'));
await writeFile(path.join(root, 'public/images/fortune-tea-house/renewal/state-brewing.webp'), clean);
const legacyManifestPath = path.join(root, 'public/images/fortune-tea-house/renewal/manifest.json');
const legacy = JSON.parse(await readFile(legacyManifestPath, 'utf8'));
const brewing = legacy.entries.find(entry => entry.file.endsWith('/state-brewing.webp'));
if (brewing) Object.assign(brewing, { source: 'assets/yeoni-teahouse/reading/pig-brewing-clean.webp', width: 640, height: 640, bytes: clean.length, alpha: true, crop: null, display: 'contain; preserve complete flower, ears, tail, teapot and tray' });
await writeFile(legacyManifestPath, JSON.stringify(legacy, null, 2) + '\n');
console.log(`Built ${entries.length} reading assets; fixed-base 16-frame tea animation.`);
