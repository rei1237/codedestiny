// 영냥이(고양이 모습의 네오) 노벨 표정 컷. 정체성 기준은 public/assets/yeongnyangi/original/hero-800.webp.
// 입력은 그린스크린(#00FF00) 위의 4x2 표정 시트. 크로마키를 걷어 투명 마스터와 360x480 컷 8장을 만든다.
// Reproducible local derivatives only: no provider or asset upload is called here.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'public/images/novel/yeongnyangi');
await mkdir(out, { recursive: true });
const input = process.argv[2];
if (input) {
  const { data, info } = await sharp(resolve(input)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const spill = g - Math.max(r, b);
    if (spill <= 24) continue;
    // 초록이 강할수록 투명하게, 가장자리는 초록기를 걷어 흰 털에 녹색 테두리가 남지 않게 한다.
    data[i + 3] = Math.round(255 * Math.max(0, Math.min(1, (110 - spill) / 86)));
    data[i + 1] = Math.max(r, b);
  }
  await sharp(data, { raw: info }).webp({ quality: 94, alphaQuality: 100 }).toFile(resolve(out, 'expressions.webp'));
}
const source = await readFile(resolve(out, 'expressions.webp'));
const { width, height, hasAlpha } = await sharp(source).metadata();
if (!hasAlpha || width % 4 || height % 2) throw new Error('Expected a transparent 4x2 Yeongnyangi atlas');
const names = ['neutral', 'soft', 'calm', 'surprise', 'serious', 'talk', 'sad', 'smile'];
const frames = [];
for (let i = 0; i < names.length; i++) {
  const cell = await sharp(source).extract({ left: (i % 4) * width / 4, top: Math.floor(i / 4) * height / 2, width: width / 4, height: height / 2 })
    .raw().toBuffer({ resolveWithObject: true });
  // 옆 칸 꼬리·망토 끝이 경계를 살짝 넘어오므로 좌우 테두리 띠는 비운다.
  const band = Math.round(cell.info.width * 0.025);
  for (let y = 0; y < cell.info.height; y++) for (let x = 0; x < cell.info.width; x++) {
    if (x < band || x >= cell.info.width - band) cell.data[(y * cell.info.width + x) * 4 + 3] = 0;
  }
  const result = await sharp(cell.data, { raw: cell.info })
    .resize({ width: 360, height: 480, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 86, alphaQuality: 100 }).toBuffer({ resolveWithObject: true });
  await writeFile(resolve(out, names[i] + '.webp'), result.data);
  frames.push({ expression: names[i], bytes: result.data.length, width: result.info.width, height: result.info.height });
}
await writeFile(resolve(out, 'assets.json'), JSON.stringify({
  provenance: 'Codex image_gen (gpt-image-2) expression sheet on a #00FF00 green screen, identity reference public/assets/yeongnyangi/original/hero-800.webp; chroma key removed by this script; 2026-10-13.',
  master: 'expressions.webp', grid: [4, 2], frames,
}, null, 2) + '\n');
console.log('Yeongnyangi: 8 transparent mobile-ready expressions', frames.reduce((sum, f) => sum + f.bytes, 0), 'bytes');
