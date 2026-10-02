import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
import {SERVICE_PACK_PLANS} from '../../worker/payments/service-pack-policy.js';

const require=createRequire(import.meta.url),Module=require('node:module');
// customer-reviews.test.mjs 의 우리 문구 금지어와 같다. 체험가 배너는 가짜 마감·카운트다운도 쓰지 않는다.
const BANNED=/유일|100%|정확히 적중|항상 맞는|최고|대통령|오늘만|마감 임박|(?<!예)정가/;

async function load(contents){
 const bundle=await build({stdin:{contents,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',loader:{'.css':'empty','.module.css':'empty'},external:['react','react/jsx-runtime','react-dom']});
 const loaded=new Module(path.resolve('launch-offer-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
 return loaded.exports;
}
const mod=await load(`export * from './lib/brand/launch-offer'; export {products} from './worker/yeongnyangi/payments/catalog'; export {default as Banner} from './app/yeongnyangi/_components/LaunchOfferBanner';`);
const render=()=>{const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');return renderToStaticMarkup(React.createElement(mod.Banner));};
const unitPrice=fish=>{const prices=[...new Set(mod.products.filter(p=>p.fishId===fish).map(p=>p.priceKRW))];assert.equal(prices.length,1,fish);return prices[0];};

test('planned prices exceed every tier price and the multiple shrinks from mackerel 9.9x',()=>{
 const order=['mackerel','salmon','flounder','tuna','assorted','omakase'];
 assert.deepEqual(Object.keys(mod.launchOffer.plannedPriceKRW),order);
 const multiples=order.map(fish=>mod.plannedPriceFor(fish,unitPrice(fish))/unitPrice(fish));
 assert.equal(mod.plannedPriceFor('mackerel',unitPrice('mackerel')),9900);
 multiples.forEach((multiple,i)=>{assert.ok(multiple>1,order[i]);if(i)assert.ok(multiple<multiples[i-1],`${order[i]} ${multiple} >= ${multiples[i-1]}`);});
 assert.ok(mod.launchOffer.plannedPriceKRW.omakase<300000,'stays under the human 1:1 consultation price');
 assert.equal(mod.plannedPriceFor('mackerel',9900),null,'never shows a planned price at or below the real price');
 assert.equal(mod.plannedPriceFor('unknown',1000),null);
});

test('fish packs carry the same multiple as their single reading',()=>{
 assert.equal(mod.plannedPackPriceFor('mackerel',1000,4500),44600);
 for(const plan of Object.values(SERVICE_PACK_PLANS)){
  const unit=unitPrice(plan.fishId),planned=mod.plannedPackPriceFor(plan.fishId,unit,plan.priceKRW);
  assert.equal(planned,Math.round(plan.priceKRW*mod.plannedPriceFor(plan.fishId,unit)/unit/100)*100,plan.name);
  assert.ok(planned>mod.plannedPriceFor(plan.fishId,unit)*plan.totalUses*0.75&&planned<mod.plannedPriceFor(plan.fishId,unit)*plan.totalUses,`${plan.name} keeps its pack discount`);
 }
});

test('banner states the limit, planned and trial price, the scoped credential and the human-vs-AI notice',()=>{
 const html=render(),text=html.replace(/<[^>]+>/g,'');
 assert.match(text,/선착순 1,000명 한정 체험가/);
 assert.match(html,/<s[^>]*data-launch-planned-price[^>]*>정식 오픈 예정가 9,900원<\/s>/);
 assert.match(text,/체험가 1,000원/);
 assert.match(text,/사주 계산 로직은 10년 경력 명리학자가 직접 설계했어요/);
 assert.match(text,/체험가는 10월 4일까지예요. 10월 5일부터 정식 가격으로 바뀌어요/);
 assert.doesNotMatch(text,/몇 달 뒤/,'the switch date is fixed, not vague');
 assert.match(text,/생선값이… 너무 비싸냥/);
 assert.match(text,/영냥이 생선 팩도 각자의 정식 오픈 예정가보다 낮은 체험가로 열려 있어요.가격은 상품마다 달라요./);
 assert.doesNotMatch(text,/같은 체험가/,'other tiers are not 1,000 won');
 assert.match(text,/후기는 네오의 사람 1:1 상담·강의 이용자가 남긴 것이고, 체험가 상담은 계산 엔진과 AI 해설로 제공돼요/);
 assert.doesNotMatch(text,BANNED);
});
