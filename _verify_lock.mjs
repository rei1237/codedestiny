import { readFileSync } from 'fs';
const s = readFileSync('public/index.html', 'utf8');

const lockBadges = (s.match(/tarot-tile__coin-badge--lock/g) || []).length;
console.log('lock badge count:', lockBadges);

const plainIn50 = /data-tile-lock-cost="50"[\s\S]{1,600}?tarot-tile__coin-badge">/.test(s);
console.log('plain-badge in lock-cost-50 tile (should be false):', plainIn50);

const plainIn400 = /data-tile-lock-cost="400"[\s\S]{1,600}?tarot-tile__coin-badge">/.test(s);
console.log('plain-badge in lock-cost-400 tile (should be false):', plainIn400);

const flowerJs = /openDestinyFlowerStudio:\{[^}]+cost:'[^']+/.exec(s);
if (flowerJs) console.log('flowerJS cost:', flowerJs[0].match(/cost:'[^']+/)[0]);

const sukuyoJs = /openSukuyoModal:\{[^}]+cost:'[^']+/.exec(s);
if (sukuyoJs) console.log('sukuyoModal cost:', sukuyoJs[0].match(/cost:'[^']+/)[0]);
