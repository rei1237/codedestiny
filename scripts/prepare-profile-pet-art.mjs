// Explicit preparation of authored ImageGen originals; never called by CI.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
const sources = JSON.parse(await readFile(process.argv[2], 'utf8'));
const output = resolve('public/assets/profile-pets/moon-garden-v1');
await mkdir(output, { recursive: true });
const fixed = { eggs: [3, 1, 160], accessories: [8, 3, 96], expressions: [6, 1, 96], patterns: [4, 1, 64] };
const manifest = [];
for (const source of sources) {
  const [cols, rows, size] = fixed[source.id] || [4, source.id.endsWith('-sleep') ? 1 : 3, 192];
  const meta = await sharp(source.path).metadata();
  if (!meta.hasAlpha) throw new Error('Missing transparent background: ' + source.id);
  const cells = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const sourceRows = source.sourceRows || rows, sourceRow = row + (source.rowOffset || 0), sourceCol = source.frames?.[col] ?? col;
    const left = Math.round(sourceCol * meta.width / cols), top = Math.round(sourceRow * meta.height / sourceRows);
    const width = Math.round((sourceCol + 1) * meta.width / cols) - left, height = Math.round((sourceRow + 1) * meta.height / sourceRows) - top;
    const input = await sharp(source.path).extract({ left, top, width, height }).resize(size - 16, size - 16, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).extend({ top: 8, bottom: 8, left: 8, right: 8, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    cells.push({ input, left: col * size, top: row * size });
  }
  const name = fixed[source.id] ? source.id : source.id.endsWith('-sleep') ? source.id : source.id + '-body';
  await sharp({ create: { width: cols * size, height: rows * size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite(cells).webp({ quality: 88, alphaQuality: 100 }).toFile(resolve(output, name + '.webp'));
  manifest.push({ id: source.id, file: name + '.webp', columns: cols, rows, cellSize: size, origin: source.path.split(/[\\\\/]/).pop(), prompt: source.prompt, tool: 'image_gen', transparent: true });
}
await writeFile(resolve(output, 'art-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('Prepared ' + manifest.length + ' original pet sprite atlases.');
