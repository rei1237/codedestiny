import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {SERVICE_PACK_PLANS} from '../../worker/payments/service-pack-policy.js';

const require=createRequire(import.meta.url),Module=require('node:module');

async function load(contents){
 const bundle=await build({stdin:{contents,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',loader:{'.css':'empty','.module.css':'empty'},external:['react','react/jsx-runtime','react-dom']});
 const loaded=new Module(path.resolve('launch-offer-tests.cjs'));loaded.paths=Module._nodeModulePaths(process.cwd());loaded._compile(bundle.outputFiles[0].text,loaded.id);
 return loaded.exports;
}
const mod=await load(`export * from './lib/brand/launch-offer'; export {products} from './worker/yeongnyangi/payments/catalog'; export {default as Banner} from './app/yeongnyangi/_components/LaunchOfferBanner';`);
const render=()=>{const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');return renderToStaticMarkup(React.createElement(mod.Banner));};
const unitPrice=fish=>{const prices=[...new Set(mod.products.filter(p=>p.fishId===fish).map(p=>p.priceKRW))];assert.equal(prices.length,1,fish);return prices[0];};

// 2026-10-05: 체험가가 끝나 예정가가 그대로 결제 정본 가격이 되었다(active:false). 예정가·체험가 표기는 어디에도 남지 않아야 한다.
const order=['mackerel','salmon','flounder','tuna','assorted','omakase'];
// 체험 이벤트 기간의 체험가. 다시 켤 때를 위해 순수 함수 회귀는 이 고정값으로 본다.
const TRIAL={mackerel:1000,salmon:3000,flounder:5000,tuna:10000,assorted:20000,omakase:50000};
const whileActive=fn=>{const before=mod.launchOffer.active;mod.launchOffer.active=true;try{return fn();}finally{mod.launchOffer.active=before;}};

test('all 28 catalog products follow the user-confirmed fish ratio and fusion prices',()=>{
 const approved={mackerel:3000,salmon:9000,flounder:15000,tuna:30000,assorted:50000,omakase:80000};
 assert.equal(mod.products.length,28);
 for(const product of mod.products)assert.equal(product.priceKRW,approved[product.fishId],product.id);
 assert.deepEqual(mod.launchOffer.plannedPriceKRW,approved);
});

test('the offer has ended: planned prices are now the catalog prices and nothing shows a planned price',()=>{
 assert.equal(mod.launchOffer.active,false);
 assert.deepEqual(Object.keys(mod.launchOffer.plannedPriceKRW),order);
 for(const fish of order){
  assert.equal(unitPrice(fish),mod.launchOffer.plannedPriceKRW[fish],fish);
  assert.equal(mod.plannedPriceFor(fish,unitPrice(fish)),null,fish);
 }
 for(const plan of Object.values(SERVICE_PACK_PLANS))assert.equal(mod.plannedPackPriceFor(plan.fishId,unitPrice(plan.fishId),plan.priceKRW),null,plan.name);
});

// 예정가는 실가보다 높을 때만 보인다. 종료된 체험가 문구가 재노출되지 않도록 확인한다.
test('while active, a planned price shows only above the trial price and the ladder still climbs',()=>whileActive(()=>{
 const planned=order.map(fish=>mod.launchOffer.plannedPriceKRW[fish]);
 planned.forEach((price,i)=>{if(i)assert.ok(price>planned[i-1],order[i]);});
 assert.equal(mod.plannedPriceFor('mackerel',TRIAL.mackerel),3000);
 for(const fish of order)assert.equal(mod.plannedPriceFor(fish,TRIAL[fish]),planned[order.indexOf(fish)]>TRIAL[fish]?planned[order.indexOf(fish)]:null,fish);
 assert.ok(mod.launchOffer.plannedPriceKRW.omakase<300000,'stays under the human 1:1 consultation price');
 assert.equal(mod.plannedPriceFor('mackerel',3000),null,'never shows a planned price at or below the real price');
 assert.equal(mod.plannedPriceFor('unknown',1000),null);
 assert.equal(mod.plannedPackPriceFor('mackerel',1000,4500),13500,'packs carry the same multiple as their single reading');
}));

test('banner renders nothing once the offer has ended',()=>{
 assert.equal(render(),'');
});

// 2026-10-05 뒤에는 예정가가 null 이라 이 경로는 체험가를 다시 켤 때만 그려진다.
test('checkout total reads the planned price, then the labelled trial price, to a screen reader',async()=>{
 const strong=readFileSync('app/yeongnyangi/_components/Consultation.tsx','utf8').match(/<div className=\{styles\.checkoutTotal\}>.*?(<strong>.*?<\/strong>)/)?.[1];
 assert.ok(strong,'checkout total block');
 const {Total}=await load(`import LaunchPlannedPrice from './app/components/LaunchPlannedPrice';const styles={totalPlanned:'totalPlanned',srOnly:'srOnly'};export function Total({plannedTotal,product,price}){return ${strong};}`);
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),price=n=>n.toLocaleString('ko-KR')+'원';
 const html=renderToStaticMarkup(React.createElement(Total,{plannedTotal:whileActive(()=>mod.plannedPriceFor('mackerel',1000)),product:{priceKRW:1000},price}));
 assert.equal(html.replace(/<[^>]+>/g,''),'정식 오픈 예정가 3,000원, 체험가 1,000원');
 assert.match(html,/<s[^>]*>정식 오픈 예정가 3,000원<\/s><span class="srOnly">, 체험가 <\/span>1,000원/,'only the trial label is visually hidden');
 assert.equal(renderToStaticMarkup(React.createElement(Total,{plannedTotal:null,product:{priceKRW:1000},price})),'<strong>1,000원</strong>','no planned price, no trial label');
});

test('after the offer ends fish buttons show only the current catalog price',async()=>{
 const span=readFileSync('app/yeongnyangi/_components/Consultation.tsx','utf8').match(/(<span className=\{styles\.fishPrice\}>.*?\{price\(item\.priceKRW\)\}<\/span>)/)?.[1];
 assert.ok(span,'fish price span');
 const {Fish}=await load(`import LaunchPlannedPrice from './app/components/LaunchPlannedPrice';import {plannedPriceFor} from './lib/brand/launch-offer';const styles={fishPrice:'fishPrice',srOnly:'srOnly'};export function Fish({siteLocale,item,price}){return ${span};}`);
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),price=n=>n.toLocaleString('ko-KR')+'원';
 const render=(siteLocale,item)=>renderToStaticMarkup(React.createElement(Fish,{siteLocale,item,price}));
 const html=render('ko',{fishId:'mackerel',priceKRW:3000});
 assert.equal(html.replace(/<[^>]+>/g,''),'3,000원');
 assert.doesNotMatch(html,/<s>|정식 오픈 예정가|체험가/);
 assert.equal(render('en',{fishId:'mackerel',priceKRW:3000}),'<span class="fishPrice">3,000원</span>','all locales have no trial label');
});
