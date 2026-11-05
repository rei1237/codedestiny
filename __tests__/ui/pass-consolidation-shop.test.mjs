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
