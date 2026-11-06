// Explicit asset preparation, never run implicitly by verification or CI.
import { mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
const directory = resolve('public/assets/profile-characters');
const mobileDirectory = resolve(directory, 'mobile');
const names = (await readdir(directory)).filter(name => /^(animal-[a-z]+|spirit-\d{2})\.png$/.test(name));
await mkdir(mobileDirectory, { recursive: true });

async function framesFor(path, meta, size) {
  if (meta.width >= meta.height * 2) {
    const sourceFrameWidth = Math.floor(meta.width / 4);
    return Promise.all(Array.from({ length: 4 }, (_, index) => sharp(path)
      .extract({ left: Math.floor(index * meta.width / 4), top: 0, width: sourceFrameWidth, height: meta.height })
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png().toBuffer()));
  }
  const frame = await sharp(path)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 12 })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toBuffer();
  return [frame, frame, frame, frame];
}

async function writeSheet(path, meta, size, output, quality) {
  const frames = await framesFor(path, meta, size);
  await sharp({ create: { width: size * 4, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(frames.map((input, index) => ({ input, left: index * size, top: 0 })))
    .webp({ quality, alphaQuality: 100, smartSubsample: true })
    .toFile(output);
}

for (const name of names) {
  const path = resolve(directory, name);
  const meta = await sharp(path).metadata();
  if (!meta.hasAlpha || !meta.width || !meta.height) throw new Error(`Invalid transparent character source: ${name}`);
  const webpName = name.replace(/\.png$/, '.webp');
  await writeSheet(path, meta, 128, resolve(directory, webpName), 88);
  await writeSheet(path, meta, 80, resolve(mobileDirectory, webpName), 82);
}
console.log(`Prepared ${names.length} desktop 512x128 and mobile 320x80 four-frame sprite sheets.`);
