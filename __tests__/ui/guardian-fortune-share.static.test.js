const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('guardian fortune share is separately feature-flagged on the static home', () => {
  const html = read('index.html');
  assert.match(html, /ENABLE_GUARDIAN_FORTUNE_SHARE/);
  assert.match(html, /guardian-fortune-share\.js/);
  assert.match(html, /data-guardian-share-button="kakao"/);
  assert.match(html, /data-guardian-share-button="web"/);
  assert.match(html, /data-guardian-share-button="copy"/);
  assert.match(html, /data-guardian-share-url/);
});

test('share client only submits the signed draft token and uses credentials include', () => {
  const api = read('js/guardian-fortune-api.js');
  assert.match(api, /SHARE_ENDPOINT = '\/api\/fortune\/guardian\/share'/);
  assert.match(api, /createGuardianFortuneShare/);
  assert.match(api, /shareDraftToken/);
  assert.match(api, /credentials: 'include'/);
  assert.doesNotMatch(api, /birthDate|birthTime|concern|rawPrompt|rawContext/);
});

test('browser share helper has Web Share, clipboard, and Kakao fallback branches', () => {
  const helper = read('js/guardian-fortune-share.js');
  assert.match(helper, /navigator\.share/);
  assert.match(helper, /navigator\.clipboard/);
  assert.match(helper, /Kakao/);
  assert.match(helper, /sendDefault/);
  assert.doesNotMatch(helper, /referral\/kakao-share/);
});

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
