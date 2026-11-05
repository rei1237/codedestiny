import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {transform} from 'esbuild';

const read=path=>readFile(new URL('../../'+path,import.meta.url),'utf8');
const {code}=await transform(await read('app/components/service-packs/consultation-context.ts'),{loader:'ts',format:'esm'});
const {isLegacyPackShopEntry}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const points=await read('app/points/PointsClient.tsx'),packs=await read('app/components/service-packs/ServicePacks.tsx');

test('old sale links count as a shop entry, but a payment return does not',()=>{
 assert.equal(isLegacyPackShopEntry('','#fish-packs'),true);
 assert.equal(isLegacyPackShopEntry('?pack=yeongnyangi-pack-mackerel-small-v7',''),true);
 assert.equal(isLegacyPackShopEntry('?service_pack_return=1&orderId=o1','#fish-packs'),false);
 assert.equal(isLegacyPackShopEntry('','#moonlight-plans'),false);
});
test('the pack area can no longer sell, only show what is owned or in progress',()=>{
 assert.equal(existsSync(new URL('../../app/components/service-packs/ServicePackShowcase.tsx',import.meta.url)),false);
 for(const gone of ['preparePackPurchase','payPackOrder','data-pack-plan','data-pack-purchase','openPurchase'])assert.equal(packs.includes(gone),false,gone);
 for(const kept of ['data-pack-resume','data-pack-completed','checkOrder','resumePendingPackPurchase','service_pack_return'])assert.equal(packs.includes(kept),true,kept);
});
test('consultation visitors see the same four pots and can go back',()=>{
 assert.equal(points.includes('!consultationShop&&<section'),false);
 assert.match(points,/consultationResumePath\(consultationContext\)/);
});
test('the shop states one rule and no longer splits the sites',()=>{
 assert.equal(points.includes('두 사이트 공통'),false);
 assert.equal(points.includes('passCommonLine'),true);
 assert.equal(points.includes('passFishCoverage'),true);
 assert.match(points,/lg:grid-cols-4/);
});
test('the pass carries one name that fits both sites',async()=>{
 const {MOONLIGHT_PASS_NAME}=await import('../../lib/brand/moonlight-guide.mjs');
 assert.equal(MOONLIGHT_PASS_NAME,'문라이트 패스(꿀단지 이용권)');
 assert.equal(points.includes('꿀꿀운세 이용권'),false);
});
test('every tier has an account label, and no pass reads as none rather than 0 days',()=>{
 assert.equal(points.includes('"0일 남음"'),false);
 assert.equal(points.includes(': "—"}'),false);
 assert.match(points,/현재 이용권<\/p>\s*<p[^>]*>\s*\{subscription\.isActive \? MOONLIGHT_TIER_LABELS\[subscription\.tier\] : MOONLIGHT_TIER_LABELS\.free\}/);
});
