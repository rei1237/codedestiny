// Resize the approved root home illustrations (docs/design/root-home-art.json) into web variants.
// The generated originals stay outside the repository; pass them with --source.
//   hero:  node scripts/build-root-home-assets.mjs --source <1536x1024 png>
//   cards: node scripts/build-root-home-assets.mjs --card yeoni|yeongnyangi --source <1024x1536 png>
// Never generate art here and never touch the character originals.
import sharp from 'sharp';
import { stat } from 'node:fs/promises';

const arg = name => {
  const index = process.argv.indexOf(name);
  return index > 0 ? process.argv[index + 1] : '';
};
const source = arg('--source');
const card = arg('--card');
if (!source) throw new Error('usage: node scripts/build-root-home-assets.mjs [--card yeoni|yeongnyangi] --source <png>');

const dir = 'public/images/home/illustrated';
// 4:3 mobile crop keeps both characters, the tea table and the cat's tail inside the frame.
const MOBILE_CROP = { left: 330, top: 176, width: 1024, height: 768 };
// 3:4 tarot card windows. Each crop keeps the whole character and its one prop set (yeongnyangi: card, candle, letter).
const CARD_CROPS = {
  yeoni: { left: 40, top: 120, width: 880, height: 1173 },
  yeongnyangi: { left: 32, top: 150, width: 960, height: 1280 },
};

let jobs;
const meta = await sharp(source).metadata();
if (card) {
  const crop = CARD_CROPS[card];
  if (!crop) throw new Error(`unknown card: ${card}`);
  if (meta.width !== 1024 || meta.height !== 1536) throw new Error(`expected 1024x1536, got ${meta.width}x${meta.height}`);
  jobs = [360, 600].map(width => ({ output: `${dir}/root-card-${card}-${width}`, width, crop }));
} else {
  if (meta.width !== 1536 || meta.height !== 1024) throw new Error(`expected 1536x1024, got ${meta.width}x${meta.height}`);
  const base = `${dir}/root-duo-dusk`;
  jobs = [
    ...[768, 1280, 1536].map(width => ({ output: `${base}-${width}`, width, crop: null })),
    ...[480, 800].map(width => ({ output: `${base}-mobile-${width}`, width, crop: MOBILE_CROP })),
  ];
}
for (const { output, width, crop } of jobs) {
  for (const format of ['webp', 'avif']) {
    let pipeline = sharp(source);
    if (crop) pipeline = pipeline.extract(crop);
    pipeline = pipeline.resize(width, null, { withoutEnlargement: true });
    const file = `${output}.${format}`;
    if (format === 'webp') await pipeline.webp({ quality: 80 }).toFile(file);
    else await pipeline.avif({ quality: 50, effort: 5 }).toFile(file);
    console.log(file, (await stat(file)).size);
  }
}
