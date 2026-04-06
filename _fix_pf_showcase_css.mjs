import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';

const base = 'c:/Users/Neo/Desktop/Code Destiny Main';

const files = [
  'index.html',
  'public/index.html',
  'public/static/index.html',
  'public/zh-cn/index.html',
  'public/nl-nl/index.html',
  'public/ms-my/index.html',
  'public/ja-jp/index.html',
  'public/hi-in/index.html',
  'public/fr-fr/index.html',
  'public/de-de/index.html',
  'public/es-es/index.html',
  'public/en-us/index.html',
];

const OLD_TITLE = `.pf-showcase__title{font-size:clamp(1.35rem,4.5vw,1.9rem);font-weight:900;background:linear-gradient(135deg,#fff 0%,#e9e0ff 30%,#c4a8ff 65%,#9b6ef5 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin:0 0 12px;line-height:1.4;letter-spacing:-.02em}`;

// 개선: 그라디언트 끝색을 #c4a0ff(밝은 라벤더)로 높여 대비 확보,
// letter-spacing 0으로 한국 가독성 개선, line-height 1.5로 행간 확보
const NEW_TITLE = `.pf-showcase__title{font-size:clamp(1.4rem,4.5vw,2rem);font-weight:900;background:linear-gradient(135deg,#ffffff 0%,#ede0ff 40%,#c4a0ff 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin:0 0 14px;line-height:1.5;letter-spacing:0}`;

const OLD_SUB = `.pf-showcase__sub{font-size:.88rem;color:rgba(220,208,255,.9);margin:0;line-height:1.6;letter-spacing:.01em}`;

// 개선: 밝기·크기 소폭 상향으로 가독성 향상
const NEW_SUB = `.pf-showcase__sub{font-size:.92rem;color:rgba(240,230,255,.95);margin:0;line-height:1.7;letter-spacing:.02em}`;

let updated = 0;
for (const rel of files) {
  const path = resolve(base, rel);
  let src;
  try {
    src = await readFile(path, 'utf8');
  } catch {
    console.warn(`  SKIP (not found): ${rel}`);
    continue;
  }

  let out = src;
  let changed = false;

  if (out.includes(OLD_TITLE)) {
    out = out.replace(OLD_TITLE, NEW_TITLE);
    changed = true;
  } else {
    console.warn(`  TITLE not matched: ${rel}`);
  }

  if (out.includes(OLD_SUB)) {
    out = out.replace(OLD_SUB, NEW_SUB);
    changed = true;
  } else {
    console.warn(`  SUB not matched: ${rel}`);
  }

  if (changed) {
    await writeFile(path, out, 'utf8');
    console.log(`  OK: ${rel}`);
    updated++;
  }
}

console.log(`\nDone. Updated ${updated}/${files.length} files.`);
