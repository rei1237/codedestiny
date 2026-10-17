// Explicit asset preparation, never run implicitly by verification or CI.
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
const directory = resolve('public/assets/profile-characters');
const names = (await readdir(directory)).filter(name => /^(animal-[a-z]+|spirit-\d{2})\.png$/.test(name));
for (const name of names) {
  const path = resolve(directory, name);
  const meta = await sharp(path).metadata();
  if (!meta.hasAlpha || !meta.width || !meta.height || meta.width < meta.height * 2) throw new Error(`Invalid sprite sheet: ${name}`);
  const width = Math.floor(meta.width / 4);
  const frames = await Promise.all(Array.from({ length: 4 }, (_, index) => sharp(path)
    .extract({ left: Math.floor(index * meta.width / 4), top: 0, width, height: meta.height })
    .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()));
  await sharp({ create: { width: 512, height: 128, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(frames.map((input, index) => ({ input, left: index * 128, top: 0 }))).webp({ quality: 90, alphaQuality: 100 }).toFile(resolve(directory, name.replace(/\.png$/, '.webp')));
}
console.log(`Prepared ${names.length} four-frame 512x128 sprite sheets.`);
