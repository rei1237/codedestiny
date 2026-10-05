const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');

// 질문 우선 전환(2026-10-02): 관계 축 4장은 연이 그림, 나머지 4장은 영냥이 생활 장면을 재사용한다.
const cards = [
  ['love', '/images/home-questions/love.webp'],
  ['reunion', '/images/home-questions/reunion.webp'],
  ['marriage', '/images/home-questions/marriage.webp'],
  ['money', '/assets/yeongnyangi/scenes/wealth.webp'],
  ['career', '/assets/yeongnyangi/scenes/work.webp'],
  ['future', '/assets/yeongnyangi/scenes/journey.webp'],
  ['self', '/assets/yeongnyangi/scenes/self.webp'],
  ['people', '/images/home-questions/people.webp'],
];

const shells = ['index.html', 'public/index.html', 'public/en/index.html', 'public/ja/index.html', 'public/static/index.html', 'public/zh/index.html', 'public/zh-tw/index.html'];

test('concern cards use shipped responsive files without a zone-only resizing endpoint', () => {
  for (const shell of shells) {
    const html = fs.readFileSync(path.join(root, shell), 'utf8');
    for (const [key, original] of cards) {
      const card = html.match(new RegExp(`<button[^>]*data-cd-concern="${key}"[\\s\\S]*?</button>`))?.[0] || '';
      assert.ok(card.includes(`src="${original.replace('.webp', '-240.webp')}"`), `${shell}: ${key} base candidate`);
      assert.match(card, /srcset="[^"]+ 240w, [^"]+ 400w, [^"]+ 640w"/, `${shell}: ${key} srcset`);
      assert.match(card, /sizes="\(max-width: 599px\) calc\(\(100vw - 30px\) \/ 2\), \(max-width: 1080px\) calc\(\(100vw - 64px\) \/ 4\), 256px"/, `${shell}: ${key} sizes`);
      assert.doesNotMatch(card, /cdn-cgi\/image|onerror=/, `${shell}: ${key} must work on Pages preview without failed requests`);
    }
  }
});

test('each responsive candidate exists at its declared width and is smaller than its source', async () => {
  const sharp = require('sharp');
  for (const [, original] of cards) {
    const originalBytes = fs.statSync(path.join(root, 'public', original)).size;
    for (const width of [240, 400, 640]) {
      const file = path.join(root, 'public', original.replace('.webp', `-${width}.webp`));
      const metadata = await sharp(file).metadata();
      assert.equal(metadata.width, width, file);
      assert.equal(metadata.format, 'webp', file);
      assert.ok(fs.statSync(file).size < originalBytes, `${file}: resized candidate must reduce bytes`);
    }
  }
});
