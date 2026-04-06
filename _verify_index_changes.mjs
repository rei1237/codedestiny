import { readFileSync } from 'fs';
const c = readFileSync('public/index.html', 'utf8');
const checks = [
  ['jamipremiun in prem-card ziwei', c.includes('"/fuctionassets/jamipremiun.webp" alt="H 프리미엄 자미두수"')],
  ['gotoZiweiPremium in D', c.includes('gotoZiweiPremium:{cat:')],
  ['openLifeBookModal in D', c.includes("openLifeBookModal:{cat:'")],
  ['openZiweiModal uses jamipremiun', c.includes("openZiweiModal:{cat:") && c.includes("jamipremiun.webp'}")], 
  ['prem-card in interceptor', c.includes('.lovebible-tile,.prem-card')],
  ['prem-card--lifebook class', c.includes('prem-card--lifebook')],
  ['prem-card--lovesecret class', c.includes('prem-card--lovesecret')],
  ['_onCta lock fix', c.includes('_pvwLockCost=Number')],
];
let ok = true;
for (const [name, val] of checks) {
  console.log((val ? 'OK  ' : 'FAIL') + ' ' + name);
  if (!val) ok = false;
}
process.exit(ok ? 0 : 1);
