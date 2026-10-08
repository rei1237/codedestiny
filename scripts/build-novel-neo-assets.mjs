// Neo's original orange mane, four forehead marks and red cape are the visual canon.
// Reproducible local derivatives only: no provider or asset upload is called here.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'public/images/novel/neo-lion');
await mkdir(out, { recursive: true });
const input = process.argv[2];
if (input) await sharp(resolve(input)).webp({ quality: 94, alphaQuality: 100 }).toFile(resolve(out, 'expressions.webp'));
const source = await readFile(resolve(out, 'expressions.webp'));
const { width, height, hasAlpha } = await sharp(source).metadata();
if (!hasAlpha || width % 4 || height % 2) throw new Error('Expected a transparent 4x2 Neo atlas');
const names = ['neutral', 'soft', 'calm', 'surprise', 'serious', 'talk', 'sad', 'smile'];
const frames = [];
for (let i = 0; i < names.length; i++) {
  const result = await sharp(source).extract({ left: (i % 4) * width / 4, top: Math.floor(i / 4) * height / 2, width: width / 4, height: height / 2 })
    .resize({ width: 360, height: 480, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 86, alphaQuality: 100 }).toBuffer({ resolveWithObject: true });
  await writeFile(resolve(out, names[i] + '.webp'), result.data);
  frames.push({ expression: names[i], bytes: result.data.length, width: result.info.width, height: result.info.height });
}
await writeFile(resolve(out, 'assets.json'), JSON.stringify({
  provenance: 'ImageGen identity-preserving edit of public/images/novel/mobile/neo-cef04fde61.webp; 2026-10-09. Original character identity explicitly retained by user request.',
  master: 'expressions.webp', grid: [4, 2], frames,
}, null, 2) + '\n');
console.log('Neo: 8 transparent mobile-ready expressions', frames.reduce((sum, f) => sum + f.bytes, 0), 'bytes');
