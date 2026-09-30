/** Resize the approved ImageGen originals; never regenerate character art here. */
import sharp from 'sharp';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const source = 'public/images/brand';
const icon = join(source, 'moonlight-garden-icon-source.png');
const adaptive = join(source, 'moonlight-garden-adaptive-source.png');
const splash = join(source, 'moonlight-garden-splash-source.png');
const background = '#1b1028';
const iconBackground = '#dfb2e8';
const res = 'apps/mobile/android/app/src/main/res';
await mkdir('icons', { recursive: true });

async function square(size, inset = 0, sourceImage = icon) {
  const inner = Math.round(size * (1 - inset * 2));
  const image = await sharp(sourceImage).resize(inner, inner).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: iconBackground } })
    .composite([{ input: image, gravity: 'centre' }]).png().toBuffer();
}

for (const size of [32, 48, 96, 180, 192, 512]) {
  await writeFile(`icons/moonlight-garden-v1-${size}.png`, await square(size));
}
for (const size of [192, 512]) {
  // Artwork has an authored continuous background and a mask-safe composition.
  await sharp(adaptive).resize(size, size).png().toFile(`icons/moonlight-garden-v1-maskable-${size}.png`);
}
await sharp(icon).resize(512, 512).webp({ quality: 86 }).toFile('icons/moonlight-garden-v1-512.webp');
await sharp(splash).resize(720).webp({ quality: 82 }).toFile(join(source, 'moonlight-garden-splash-720.webp'));
await sharp(splash).resize(1080, null, { withoutEnlargement: true }).webp({ quality: 85 }).toFile(join(source, 'moonlight-garden-splash-1080.webp'));

// ICO containing a real PNG entry, supported by modern browser favicon loaders.
const png = await square(48);
const ico = Buffer.alloc(22);
ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4);
ico[6] = 48; ico[7] = 48; ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12);
ico.writeUInt32LE(png.length, 14); ico.writeUInt32LE(22, 18);
await writeFile('public/favicon.ico', Buffer.concat([ico, png]));

for (const [density, size, foreground] of [['mdpi',48,108], ['hdpi',72,162], ['xhdpi',96,216], ['xxhdpi',144,324], ['xxxhdpi',192,432]]) {
  const dir = join(res, `mipmap-${density}`);
  await writeFile(join(dir, 'ic_launcher.png'), await square(size));
  await sharp(adaptive).resize(size, size).png().toFile(join(dir, 'ic_launcher_round.png'));
  // Adaptive canvas keeps the flower, face and companion within its safe area.
  await writeFile(join(dir, 'ic_launcher_foreground.png'), await square(foreground, 0.08, adaptive));
}
await sharp(await square(768, 0.08, adaptive)).webp({ quality: 90 }).toFile(join(res, 'drawable-nodpi/splash_logo.webp'));
// Retain each legacy Android resource's dimensions, replace its old artwork.
for (const entry of await readdir(res)) {
  if (!entry.startsWith('drawable')) continue;
  const path = join(res, entry, 'splash.png');
  let meta;
  try { meta = await sharp(path).metadata(); } catch { continue; }
  const size = Math.round(Math.min(meta.width, meta.height) * 0.56);
  const mark = await square(size, 0.10);
  const result = await sharp({ create: { width: meta.width, height: meta.height, channels: 4, background } })
    .composite([{ input: mark, gravity: 'centre' }]).png().toBuffer();
  await writeFile(path, result);
}
console.log('Moonlight Garden: web, maskable, Apple, favicon and Android assets generated.');
