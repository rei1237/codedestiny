import '../../scripts/lib/mock-network-guard.cjs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';

// 결정 지점 신뢰 블록(ReviewProof): 구매 인증 후기 수에 따른 표시, 사실 안내의 실제 링크, 법적 문구를 지킨다.
const require=createRequire(import.meta.url),Module=require('node:module');
const SOURCE='app/components/ReviewProof.tsx';
let loaded;
async function load(){
 if(loaded)return loaded;
 const bundle=await build({stdin:{contents:`export * from './${SOURCE}';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',loader:{'.css':'empty','.module.css':'empty'},external:['react','react/jsx-runtime','react-dom']});
 const mod=new Module(path.resolve('review-proof-tests.cjs'));mod.paths=Module._nodeModulePaths(process.cwd());mod._compile(bundle.outputFiles[0].text,mod.id);
 return loaded=mod.exports;
}
async function render(props){
 const {ReviewProofView}=await load();
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 return new JSDOM(renderToStaticMarkup(React.createElement(ReviewProofView,props))).window.document;
}
const card=(id,extra={})=>({id,rating:5,title:'',body:`후기 ${id}`,quickTags:[],displayedAt:'2026-11-02T00:00:00.000Z',rewarded:false,...extra});
const ready=(total,items,average=null)=>({status:'ready',total,average,items});
const DISCLAIMER='개인 경험에 따른 후기이며 결과를 보장하지 않습니다.';

test('verified review count picks facts (0), cards only (1-2) or summary (3+)',async()=>{
 const {reviewProofMode}=await load();
 assert.deepEqual([0,1,2,3,12,-1,Number.NaN].map(reviewProofMode),['facts','cards','cards','summary','summary','facts','facts']);
});

test('no verified reviews or a failed fetch shows only verifiable facts with real links',async()=>{
 for(const state of [ready(0,[]),{status:'error'}]){
  const doc=await render({brand:'ggulggul',productId:'love-coach',state,sampleHref:'#service-samples-love-secret'});
  const section=doc.querySelector('section[data-review-proof="facts"]');
  assert.ok(section);
  assert.equal(section.getAttribute('aria-labelledby'),doc.querySelector('h2').id);
  assert.deepEqual([...doc.querySelectorAll('a')].map(a=>a.getAttribute('href')),['/refund-policy/','#service-samples-love-secret']);
  assert.ok(!doc.body.textContent.includes(DISCLAIMER),'facts carry no review disclaimer');
  assert.ok(!doc.body.textContent.includes('후기 더 보기'));
 }
 const yn=await render({brand:'yeongnyangi',productId:'yeongnyangi',state:ready(0,[]),sampleHref:'#yn-example',headingLevel:3});
 assert.ok(yn.querySelector('h3'));
 assert.deepEqual([...yn.querySelectorAll('a')].map(a=>a.getAttribute('href')),['/refund-policy/','/contact/#payment-help','#yn-example']);
 // 링크 대상이 실제로 있다.
 assert.ok(existsSync('app/refund-policy/page.js'));
 assert.match(readFileSync('app/contact-us/page.js','utf8'),/id="payment-help"/);
 assert.match(readFileSync('app/yeongnyangi/_components/YeongnyangiGuide.tsx','utf8'),/id="yn-example"/);
});

test('one or two verified reviews show cards without an average, with reward label, disclaimer and more link',async()=>{
 const doc=await render({brand:'ggulggul',productId:'love-coach',state:ready(2,[card('a',{rewarded:true}),card('b',{body:'',quickTags:['구체적이에요','위로가 됐어요']})],4.5)});
 const text=doc.body.textContent;
 assert.equal(doc.querySelectorAll('li').length,2);
 assert.ok(!text.includes('평균'),'no average below three reviews');
 assert.equal(text.split('작성 보상(월정석) 지급 후기').length-1,1);
 assert.ok(text.includes('구체적이에요 · 위로가 됐어요'));
 assert.ok(text.includes(DISCLAIMER));
 assert.equal(doc.querySelector('a').getAttribute('href'),'/reviews/?product=love-coach');
 assert.equal(doc.querySelector('a').textContent,'후기 더 보기');
});

test('three or more verified reviews add the average and count',async()=>{
 const doc=await render({brand:'yeongnyangi',productId:'yeongnyangi',state:ready(7,[card('a'),card('b'),card('c')],4.57)});
 assert.ok(doc.body.textContent.includes('평균 별점 4.6점 · 구매 인증 후기 7개'));
 assert.equal(doc.querySelectorAll('li').length,3);
 assert.equal(doc.querySelector('a').getAttribute('href'),'/reviews/?product=yeongnyangi');
});

test('loading reserves space without text, and only purchase-verified reviews are requested',async()=>{
 const loading=await render({brand:'ggulggul',productId:'new-year',state:{status:'loading'}});
 assert.equal(loading.body.firstElementChild.getAttribute('aria-hidden'),'true');
 assert.equal(loading.body.textContent,'');
 const {loadReviewProof}=await load();
 const urls=[],prev=globalThis.fetch;
 globalThis.fetch=async url=>{urls.push(String(url));return {ok:true,json:async()=>String(url).includes('/summary')?{ok:true,total:1,average:5}:{ok:true,items:[{...card('v'),isVerifiedPurchase:true},{...card('admin'),isVerifiedPurchase:false}]}};};
 try{
  const data=await loadReviewProof('life-book');
  assert.deepEqual(data.items.map(i=>i.id),['v']);
  assert.equal(urls.length,2);
  for(const url of urls)assert.match(url,/productId=life-book&verifiedOnly=1/);
 }finally{globalThis.fetch=prev;}
});

test('copy stays factual: no guarantees, pressure, structured data or analytics',async()=>{
 const {REVIEW_PROOF_FACTS,REVIEW_PROOF_COPY}=await load();
 const copy=JSON.stringify([Object.values(REVIEW_PROOF_FACTS).map(b=>[b.facts,b.links('#x')]),REVIEW_PROOF_COPY]);
 assert.doesNotMatch(copy,/보장|100%|반드시|무조건|지금 바로|놓치|마감|한정|최고|유일/);
 const source=readFileSync(SOURCE,'utf8').replace(/\/\/.*$/gm,'');
 assert.doesNotMatch(source,/AggregateRating|application\/ld\+json|trackEvent|analytics/);
});
