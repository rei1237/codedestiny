import fs from 'node:fs';
import path from 'node:path';

const targetFiles = [
  'index.html',
  'public/index.html',
  'public/static/index.html',
  'fortune/index.html',
  'public/fortune/index.html',
  'public/de-de/index.html',
  'public/en-us/index.html',
  'public/es-es/index.html',
  'public/fr-fr/index.html',
  'public/hi-in/index.html',
  'public/ja-jp/index.html',
  'public/ms-my/index.html',
  'public/nl-nl/index.html',
  'public/zh-cn/index.html',
];

for (const file of targetFiles) {
  if (fs.existsSync(file)) {
    const text = fs.readFileSync(file, 'utf8');
    if (text.includes('\uFFFD')) {
      console.log(`FOUND BAD CHAR in ${file}`);
      const idx = text.indexOf('\uFFFD');
      console.log('Context:', text.slice(Math.max(0, idx - 100), Math.min(text.length, idx + 100)));
    } else {
       // console.log(`OK: ${file}`);
    }
  }
}
