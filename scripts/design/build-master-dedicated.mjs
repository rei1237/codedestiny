// 대표 상담 마스터 전용 이미지 — 생성 원본(1024×1536 초상, 1536×1024 시트)에서 화면용 webp 를 만든다.
// next.config 의 images.unoptimized 때문에 srcset 변형을 여기서 직접 만든다(소개장은 <img srcset> 으로 고른다).
//   node scripts/design/build-master-dedicated.mjs <원본 폴더>
// 원본 폴더에는 <key>-portrait.png, <key>-sheet.png 가 있어야 한다. 출처와 프롬프트는 provenance.json 에 남긴다.
// 아바타(128px)는 이어서 build-master-avatars.mjs 가 600×720 초상에서 자른다.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, 'public/images/master-profiles');
const src = process.argv[2];
if (!src) throw new Error('원본 폴더를 넘겨 주세요: node scripts/design/build-master-dedicated.mjs <dir>');

// 5:6 초상 크롭 [left, top, width] — 얼굴이 위 1/3, 손과 소품이 프레임 안에 들어오게 눈으로 맞춘 값.
const PORTRAIT_CROP = {
  'yeoni-love': [0, 110, 1024],
  'hanbi-love': [0, 90, 1024],
  'neo-new-year': [0, 140, 1024],
  'yun-life-book': [0, 120, 1024],
};

// 금사·자수 같은 고주파 디테일이 많아 q80 이면 600 초상이 100KB 를 넘는다. q58 + effort 6 에서 눈으로 차이가 없었다.
const PORTRAIT_WEBP = { quality: 58, effort: 6, smartSubsample: true };
const SHEET_WEBP = { quality: 76, effort: 6, smartSubsample: true };

const write = async (pipeline, file) => {
  const info = await pipeline.toFile(path.join(out, file));
  console.log(`${file} ${info.width}×${info.height} ${Math.round(info.size / 1024)}KB`);
};

for (const [key, [left, top, width]] of Object.entries(PORTRAIT_CROP)) {
  const portrait = sharp(path.join(src, `${key}-portrait.png`)).extract({ left, top, width, height: Math.round(width * 1.2) });
  const sheet = sharp(path.join(src, `${key}-sheet.png`));
  await write(portrait.clone().resize(600, 720).webp(PORTRAIT_WEBP), `${key}-portrait.webp`);
  await write(portrait.clone().resize(360, 432).webp(PORTRAIT_WEBP), `${key}-portrait-360.webp`);
  await write(sheet.clone().resize(1536, 1024).webp(SHEET_WEBP), `${key}-profile.webp`);
  await write(sheet.clone().resize(1024, 683).webp(SHEET_WEBP), `${key}-profile-1024.webp`);
}
