const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');

const cards = [
  ['love', '/fuctionassets/love%20code.webp'],
  ['person', '/fuctionassets/tarolove.webp'],
  ['money', '/images/home-concerns/wealth-card-v1.webp'],
  ['career', '/images/home-concerns/career-card-v1.webp'],
  ['year', '/fuctionassets/new-year-almanac-v1.webp'],
  ['all', '/images/fusion-fortune/fusion-guardian-celestial-hero.webp'],
];

const shells = ['index.html', 'public/index.html', 'public/en/index.html', 'public/ja/index.html', 'public/static/index.html', 'public/zh/index.html', 'public/zh-tw/index.html'];

test('concern card media uses responsive Cloudflare variants with an original fallback in every static shell', () => {
  for (const shell of shells) {
    const html = fs.readFileSync(path.join(root, shell), 'utf8');
    for (const [key, original] of cards) {
      const card = html.match(new RegExp(`<button[^>]*data-cd-concern="${key}"[\\s\\S]*?</button>`))?.[0] || '';
      assert.match(card, new RegExp(`/cdn-cgi/image/width=240,quality=76,format=auto${original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), `${shell}: ${key} base candidate`);
      assert.match(card, /srcset="[^"]+ 240w, [^"]+ 400w, [^"]+ 640w"/, `${shell}: ${key} srcset`);
      assert.match(card, /sizes="\(max-width: 599px\) calc\(\(100vw - 30px\) \/ 2\), \(max-width: 1080px\) calc\(\(100vw - 48px\) \/ 3\), 344px"/, `${shell}: ${key} sizes`);
      assert.match(card, new RegExp(`this\\.src='${original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`), `${shell}: ${key} fallback`);
    }
  }
});
