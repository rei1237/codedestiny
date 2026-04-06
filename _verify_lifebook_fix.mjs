import { readFileSync } from 'fs';

const h = readFileSync('public/index.html', 'utf8');

const tileHasCoin = /lifebook-tile[\s\S]{0,300}data-coin-cost="490"[\s\S]{0,10}aria-label/.test(h);
const startClosed = h.includes('</div><!-- /lbStartScreen -->');
const genBtnCoin = h.includes('generateLifeBook" data-coin-cost="490"');
const i1 = h.indexOf('</div><!-- /lbStartScreen -->');
const i2 = h.indexOf('<div id="lbLoadingScreen"');
const loadingAfterStart = i1 > 0 && i2 > i1;

const js = readFileSync('public/js/life-book.js', 'utf8');
const jsHasOpenHandler = js.includes("action === 'openLifeBookModal'");
const jsHasGenHandler = js.includes("action === 'generateLifeBook'");

console.log('public/index.html checks:');
console.log('  noCoinOnTile    :', tileHasCoin ? 'FAIL (still has coin-cost)' : 'OK');
console.log('  startScreenClosed:', startClosed ? 'OK' : 'FAIL');
console.log('  genBtnCoin      :', genBtnCoin ? 'OK' : 'FAIL');
console.log('  loadingAfterStart:', loadingAfterStart ? 'OK' : 'FAIL');
console.log('');
console.log('public/js/life-book.js checks:');
console.log('  openLifeBook handler:', jsHasOpenHandler ? 'OK' : 'FAIL');
console.log('  generateLifeBook handler:', jsHasGenHandler ? 'OK' : 'FAIL');

// Check all locale files
const locales = ['zh-cn','nl-nl','ms-my','ja-jp','es-es','en-us','hi-in','de-de','fr-fr','static'];
let allOk = true;
for (const loc of locales) {
  try {
    const lh = readFileSync(`public/${loc}/index.html`, 'utf8');
    const locTileOk = !/lifebook-tile[\s\S]{0,300}data-coin-cost="490"[\s\S]{0,10}aria-label/.test(lh);
    const locStartOk = lh.includes('</div><!-- /lbStartScreen -->');
    const locBtnOk = lh.includes('generateLifeBook" data-coin-cost="490"');
    const locGenText = lh.includes('나의 인생의 책 생성하기');
    if (!locTileOk || !locStartOk || !locBtnOk || !locGenText) {
      console.log(`  ${loc}: FAIL (tile=${locTileOk}, start=${locStartOk}, btn=${locBtnOk}, text=${locGenText})`);
      allOk = false;
    } else {
      console.log(`  ${loc}: OK`);
    }
  } catch(e) { console.log(`  ${loc}: ERROR - ${e.message}`); }
}
