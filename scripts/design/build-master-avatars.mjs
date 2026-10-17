// 마스터 아바타 — 600×720 초상에서 얼굴 정사각형을 잘라 128px webp 로 만든다.
// 홈 카드 칩(40px)·제품 메인 마스터 띠(56px)가 2x 에서도 선명하도록 128px 한 장만 둔다.
// 크롭 박스는 [left, top, size] — 원형 마스크 안에 얼굴이 들어오게 눈으로 맞춘 값이다.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(root, 'public/images/master-profiles');
const AVATARS = {
  yeoni: ['yeoni-teahouse-portrait.webp', [100, 30, 420]],
  hanbi: ['hanbi-sukuyo-portrait.webp', [60, 30, 420]],
  neo: ['neo-strategy-portrait.webp', [90, 0, 420]],
  yun: ['yun-astrology-portrait.webp', [160, 30, 420]],
  musung: ['musung-ziwei-portrait.webp', [130, 80, 360]],
  master: ['master-love-portrait.webp', [120, 120, 400]],
  // 대표 상담 전용 초상(build-master-dedicated.mjs) — 얼굴이 프레임에서 작아 더 좁게 자른다.
  'yeoni-love': ['yeoni-love-portrait.webp', [115, 45, 280]],
  'hanbi-love': ['hanbi-love-portrait.webp', [130, 45, 280]],
  'neo-new-year': ['neo-new-year-portrait.webp', [150, 20, 280]],
  'yun-life-book': ['yun-life-book-portrait.webp', [130, 5, 280]],
};

await mkdir(path.join(dir, 'avatars'), { recursive: true });
for (const [name, [source, [left, top, size]]] of Object.entries(AVATARS)) {
  const out = path.join(dir, 'avatars', `${name}.webp`);
  const info = await sharp(path.join(dir, source))
    .extract({ left, top, width: size, height: size })
    .resize(128, 128)
    .webp({ quality: 80 })
    .toFile(out);
  console.log(`${name}.webp ${info.size}B`);
}
