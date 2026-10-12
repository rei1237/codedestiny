// 사주 풀이의 영냥이 페르소나 그림. 새로 그리지 않고 기존 영냥이 원화에서 파생한다.
// 머리글·안내 카드 아바타는 public/assets/yeongnyangi/original/hero-480.webp,
// 풀이 사이 장식 컷(read·think·listen·cheer)은 노벨 표정 컷(public/images/novel/yeongnyangi)에서 만든다.
// Reproducible local derivatives only: no provider or asset upload is called here.
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'public/images/saju');
const clear = { r: 0, g: 0, b: 0, alpha: 0 };
const made = [];
async function emit(name, pipeline) {
  const { data, info } = await pipeline.webp({ quality: 85, alphaQuality: 100 }).toBuffer({ resolveWithObject: true });
  await writeFile(resolve(out, name), data);
  made.push(`${name} ${info.width}x${info.height} ${data.length}B`);
}
const hero = await sharp(resolve(root, 'public/assets/yeongnyangi/original/hero-480.webp')).trim().toBuffer();
for (const size of [160, 320]) {
  await emit(`yeongnyangi-${size}.webp`, sharp(hero).resize({ width: size, height: size, fit: 'contain', background: clear }));
}
// 연이 컷(264×372)과 같은 세로형 비율로 맞춘다.
const poses = { read: 'talk', think: 'serious', listen: 'calm', cheer: 'smile' };
for (const [pose, expression] of Object.entries(poses)) {
  const cut = await sharp(resolve(root, 'public/images/novel/yeongnyangi', expression + '.webp')).trim().toBuffer();
  await emit(`yeongnyangi-${pose}.webp`, sharp(cut).resize({ width: 270, height: 360, fit: 'contain', background: clear }));
}
console.log(made.join('\n'));
