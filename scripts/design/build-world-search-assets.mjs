// 승인된 GGULGGUL_MASTER_ASSETS_WEBP.zip의 추출 폴더를 받는다. 그림을 새로 생성하지 않는다.
// node scripts/design/build-world-search-assets.mjs <extracted-folder>
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

const source = process.argv[2];
if (!source) throw new Error('압축을 푼 승인 자산 폴더를 지정하세요.');
const output = 'public/images/home/world-search';
await mkdir(output, { recursive: true });
const records = [];
for (const key of ['world', 'yeoni', 'neo', 'musung', 'hanbi', 'yun', 'master', 'archive']) {
  const input = path.join(source, 'assets', (key === 'archive' ? 'feature' : key) + '.webp');
  const bytes = await readFile(input);
  const meta = await sharp(bytes).metadata();
  for (const width of [320, 960]) {
    let pipeline = sharp(bytes);
    // 공용 장식 3×2 중 마지막 열린 책 장면만 기록실에 사용한다.
    if (key === 'archive') {
      const w = Math.floor(meta.width / 3), h = Math.floor(meta.height / 2);
      pipeline = pipeline.extract({ left: w * 2, top: h, width: w, height: h });
    }
    await pipeline.resize(width, Math.round(width * 2 / 3), { fit: 'cover', position: 'centre' })
      .webp({ quality: 76, effort: 6 }).toFile(`${output}/${key}-${width}.webp`);
  }
  records.push({ key, source: `assets/${key === 'archive' ? 'feature' : key}.webp`, sha256: createHash('sha256').update(bytes).digest('hex') });
}
await writeFile(`${output}/provenance.json`, JSON.stringify({
  source: 'User-approved GGULGGUL_MASTER_ASSETS_WEBP.zip',
  purpose: 'All-readings region navigation only; existing service portraits are preserved.',
  transformations: '320/960px WebP, 3:2 cover; archive uses the bottom-right decorative book panel.',
  records
}, null, 2) + '\n');
console.log('[world-search-assets] 16 responsive WebP assets created');
