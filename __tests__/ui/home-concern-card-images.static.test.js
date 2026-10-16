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

// 2026-10-17 "직관성": 홈의 질문 타일 8장(#cdConcernPick)은 걷어냈다. 그림 파일은 그대로 두므로 자산 검사만 남긴다.

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
