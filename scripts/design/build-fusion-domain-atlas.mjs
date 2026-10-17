// 초융합 v2 그림 — 영역별 8장 아틀라스와 홈 시그니처 띠의 다섯 마스터 장면.
// 원본(gpt-image-2, 장면당 한 장)은 저장소 밖에 둔다. 출처·프롬프트는 public/images/fusion-fortune/provenance.json.
//   node scripts/design/build-fusion-domain-atlas.mjs [원본 폴더]
// 아틀라스 칸 순서는 lib/fusion-premium-report.js FUSION_DOMAIN_ART_KEYS 와 같고, 9번째 칸은 다섯 마스터 단체 장면이다.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { FUSION_DOMAIN_ART_KEYS } from '../../lib/fusion-premium-report.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sources = path.resolve(process.argv[2] || 'D:/Development/captures/fusion-domain-art-20261017/picked');
const CELL = 418; // premium-chapters-v1.webp 와 같은 1254px 아틀라스

const cells = [...FUSION_DOMAIN_ART_KEYS, 'group'];
const composite = await Promise.all(cells.map(async (id, index) => ({
  input: await sharp(path.join(sources, `${id}.png`)).resize(CELL, CELL, { fit: 'cover' }).toBuffer(),
  left: (index % 3) * CELL,
  top: Math.floor(index / 3) * CELL,
})));
const atlas = path.join(root, 'public/images/fusion-fortune/premium-domains-v1.webp');
const info = await sharp({ create: { width: CELL * 3, height: CELL * 3, channels: 3, background: '#17122c' } })
  .composite(composite).webp({ quality: 82 }).toFile(atlas);
console.log('[fusion-domain-atlas]', path.relative(root, atlas), info.width, info.height, `${Math.round(info.size / 1024)}KB`);

for (const width of [600, 1200]) {
  const out = path.join(root, `public/images/home/fusion-signature-masters-${width}.webp`);
  const hero = await sharp(path.join(sources, 'hero.png')).resize(width, Math.round(width * 2 / 3), { fit: 'cover', position: 'attention' }).webp({ quality: 82 }).toFile(out);
  console.log('[fusion-domain-atlas]', path.relative(root, out), hero.width, hero.height, `${Math.round(hero.size / 1024)}KB`);
}
