import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';

const read=path=>readFile(new URL('../../'+path,import.meta.url),'utf8');
const {code}=await transform(await read('app/checkout/checkout-method-order.ts'),{loader:'ts',format:'esm'});
const {defaultCheckoutMethod,readSavedCheckoutMethod,passMethodNote,passRemainingCoin}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));

test('a pack with an expiry is spent before a honey pot, then direct payment',()=>{
 assert.equal(defaultCheckoutMethod({firstPackId:'p1',passUsable:true}),'pack:p1');
 assert.equal(defaultCheckoutMethod({passUsable:true}),'pass');
 assert.equal(defaultCheckoutMethod({passUsable:false}),'direct');
});

test('a choice saved before the rename restores as the pot for every tier',()=>{
 assert.equal(readSavedCheckoutMethod('family'),'pass');
 assert.equal(readSavedCheckoutMethod('pass'),'pass');
 assert.equal(readSavedCheckoutMethod('pack:p1'),'pack:p1');
 assert.equal(readSavedCheckoutMethod('stones'),'stones');
 assert.equal(readSavedCheckoutMethod('COIN'),null);
 assert.equal(readSavedCheckoutMethod(undefined),null);
});

const pot=(over={})=>({hasActivePass:true,canUse:true,label:'큰 꿀단지',limit:300,...over});

test('the pot row names what stops it, and never promises what it cannot know',()=>{
 assert.equal(passMethodNote({pass:pot(),coinCost:100,remainingWon:'8만원',upgradeName:'중간 꿀단지'}),'사용 가능 · 남은 한도 8만원');
 assert.equal(passMethodNote({pass:pot(),coinCost:100,remainingWon:'',upgradeName:'중간 꿀단지'}),'사용 가능 · 추가 결제 없음');
 assert.equal(passMethodNote({pass:pot({canUse:false,label:'중간 꿀단지',limit:100}),coinCost:300,remainingWon:'',upgradeName:'큰 꿀단지'}),'이 상담은 큰 꿀단지부터 쓸 수 있어요');
 // An older purchase can hold the named tier with a lower cap: upgrading to the same name would be nonsense.
 assert.equal(passMethodNote({pass:pot({canUse:false,limit:200}),coinCost:300,remainingWon:'',upgradeName:'큰 꿀단지'}),'이번 상담에 적용할 수 없어요. 이용 한도와 등급을 확인해 주세요.');
 assert.equal(passMethodNote({pass:pot({canUse:false}),coinCost:100,remainingWon:'0원',upgradeName:'중간 꿀단지'}),'이번 상담에 적용할 수 없어요. 이용 한도와 등급을 확인해 주세요.');
});

test('the Yeongnyangi checkout offers packs, then the pot, then stones, then direct',async()=>{
 const source=await read('app/checkout/YeongnyangiCheckout.tsx');
 const order=['packs.map(pack=>','data-yn-method="pass"','data-yn-method="stones"','data-yn-method="direct"'].map(mark=>source.indexOf(mark));
 assert.ok(order.every(at=>at>0),String(order));
 assert.deepEqual(order,[...order].sort((a,b)=>a-b));
 assert.ok(source.includes('data-yn-pass-shop'),'non-holders get one link to the pots');
 for(const dead of ["passStorePlan:'family'",'패밀리 이용권',"tier==='family'"])assert.ok(!source.includes(dead),dead);
});

test('the Yeongnyangi checkout puts reassurance and policy links right under the pay button',async()=>{
 const source=await read('app/checkout/YeongnyangiCheckout.tsx');
 const order=['className={styles.pay}','결제 전 필요한 정보를 모두 확인해요.','policyHrefs.terms','className={styles.feedback}'].map(mark=>source.indexOf(mark));
 assert.ok(order.every(at=>at>0),String(order));
 assert.deepEqual(order,[...order].sort((a,b)=>a-b));
});

test('the shared checkout no longer offers the retired 5-use pack or a Family-only button',async()=>{
 const source=await read('app/checkout/CheckoutClient.tsx');
 for(const dead of ['readPackCatalog','packOffer','consultation-purchase','5회 이용권','보유 패밀리 꿀단지','passStorePlan: "family"'])assert.ok(!source.includes(dead),dead);
});

test('an unknown remaining limit is never shown as zero',()=>{
 assert.equal(passRemainingCoin({state:'active',monthlySpendRemainingCoin:null}),null);
 assert.equal(passRemainingCoin({state:'active'}),null);
 assert.equal(passRemainingCoin(null),null);
 assert.equal(passRemainingCoin({state:'none',monthlySpendRemainingCoin:800}),null);
 assert.equal(passRemainingCoin({state:'active',monthlySpendRemainingCoin:800}),800);
 assert.equal(passRemainingCoin({state:'active',monthlySpendRemainingCoin:0}),0);
});
