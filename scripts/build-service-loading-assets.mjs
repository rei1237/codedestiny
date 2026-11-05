// Display derivatives only. Sources are the user's handoff illustrations.
import sharp from 'sharp';
import { stat } from 'node:fs/promises';

for (const name of ['ggulggul-masters-loading-v1', 'yeongnyangi-fish-loading-v1']) {
  const base = `public/images/brand/${name}`;
  for (const width of [480, 720, 1024]) {
    for (const format of ['webp', 'avif']) {
      const pipeline = sharp(`${base}-source.webp`).resize(width, null, { withoutEnlargement: true });
      const output = `${base}-${width}.${format}`;
      await (format === 'webp' ? pipeline.webp({ quality: 80 }) : pipeline.avif({ quality: 50, effort: 5 })).toFile(output);
      console.log(output, (await stat(output)).size);
    }
  }
}
