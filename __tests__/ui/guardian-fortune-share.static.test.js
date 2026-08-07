const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('static public page uses query shareId, text nodes, and no raw HTML rendering', () => {
  const page = read('app/fortune/share/GuardianFortuneShareClient.tsx');
  const pageCss = read('app/fortune/share/GuardianFortuneShareClient.module.css');
  assert.match(page, /useSearchParams/);
  assert.match(page, /shareId/);
  assert.match(page, /neo-operation-room\/sprites\/transparent\/neo-transparent-s1-f01\.webp/);
  assert.doesNotMatch(page, /neoLionSprite|DestinyWar/);
  assert.match(pageCss, /neoHumanImage/);
  assert.doesNotMatch(pageCss, /neoLionSprite|DestinyWar/);
  assert.doesNotMatch(page, /dangerouslySetInnerHTML/);
  assert.match(page, /찾을 수 없어요/);
  const routePage = read('app/fortune/share/page.tsx');
  assert.match(routePage, /index: false/);
  assert.match(routePage, /follow: false/);
});
