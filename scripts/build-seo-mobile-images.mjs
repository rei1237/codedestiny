// Resize existing approved artwork only. Native app assets are unaffected.
import sharp from 'sharp';
import { stat } from 'node:fs/promises';

for (const width of [720, 1024]) {
  const output = `public/images/brand/moonlight-garden-splash-${width}.avif`;
  await sharp('public/images/brand/moonlight-garden-splash-source.png')
    .resize(width, null, { withoutEnlargement: true }).avif({ quality: 55, effort: 6 }).toFile(output);
  console.log(output, (await stat(output)).size);
}
const output = 'public/assets/yeongnyangi/fish/reaction-anchovy-288.webp';
await sharp('public/assets/yeongnyangi/fish/reaction-anchovy.webp')
  .resize(288).webp({ quality: 80 }).toFile(output);
console.log(output, (await stat(output)).size);
