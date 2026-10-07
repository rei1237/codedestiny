import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
const source=await readFile(new URL('../../app/components/service-packs/consultation-context.ts',import.meta.url),'utf8');
const {code}=await transform(source,{loader:'ts',format:'esm'});
const {readConsultationContext,consultationShopPath,consultationResumePath}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('supported scope and original consultation survive shop navigation',()=>{
 const context=readConsultationContext(new URLSearchParams({context:'yeongnyangi',featureKey:'yeongnyangi-saju-salmon',requestId:'a'.repeat(64),lang:'ja'}));
 const shop=new URL(consultationShopPath(context),'https://example.test');
 assert.deepEqual(readConsultationContext(shop.searchParams),context);
 const resumed=new URL(consultationResumePath(context),'https://example.test');
 assert.equal(resumed.pathname,'/checkout/');assert.equal(resumed.searchParams.get('requestId'),'a'.repeat(64));assert.equal(resumed.searchParams.get('featureKey'),context.featureKey);assert.equal(resumed.searchParams.get('lang'),'ja');
});
test('untrusted product, redirect and locale parameters cannot broaden scope',()=>{
 for(const featureKey of ['flower-fc','yeongnyangi-saju-mackerel-10','https://elsewhere.test','yeongnyangi-fusion-tuna'])assert.equal(readConsultationContext(new URLSearchParams({context:'yeongnyangi',featureKey})),null);
 const context=readConsultationContext(new URLSearchParams({context:'yeongnyangi',featureKey:'yeongnyangi-tarot-tuna',requestId:'https://elsewhere.test',lang:'invalid'}));
 assert.equal(context.lang,'ko');assert.equal(consultationResumePath(context),'/yeongnyangi/fortune/');
});
