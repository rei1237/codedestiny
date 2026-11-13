import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {kemetModule} from '../canonical/kemet-oracle.mjs';
const {cards,readKemet}=await import('data:text/javascript;base64,'+Buffer.from(kemetModule()).toString('base64'));
assert.equal(cards,12);assert.throws(()=>readKemet('다음 선택',[0,1,0]));
for(let i=0;i<12;i++){const r=readKemet('연애',[i,(i+1)%12,(i+2)%12]);assert.equal(r.catLabel,'사랑과 관계');assert.ok(r.gods.every(x=>x.heka&&x.topic&&x.position));}
const origin=process.env.TOSS_OFFLINE_ORIGIN||'http://127.0.0.1:4329';assert.equal(new URL(origin).hostname,'127.0.0.1');
const browser=await chromium.launch({channel:'chrome'});
try{
  const context=await browser.newContext({viewport:{width:360,height:740},serviceWorkers:'block',reducedMotion:'reduce'});
  const paths=[];await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();paths.push(url.pathname);return route.continue();});
  const page=await context.newPage();await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('button',{name:/이집트 신탁/}).click();
  for(const [q,topic] of [['관계를 어떻게 이어갈까요','사랑과 관계'],['재산을 어떻게 모을까요','풍요와 재물'],['진로를 바꾸고 싶어요','성취와 갈등']]){
    await page.getByLabel('제단에 올릴 질문').fill(q);await page.getByRole('button',{name:'신탁 카드 섞기'}).click();
    const choose=page.getByRole('group',{name:'열두 신탁 카드'});assert.equal(await choose.getByRole('button').count(),12);
    for(const n of [1,1,3,5,7])await choose.getByRole('button',{name:n+'번 카드',exact:true}).click();
    await page.getByRole('button',{name:'세 신의 신탁 열기'}).click();
    for(const title of ['세 신이 그린 지도','오늘의 영적 처방','파피루스에 새겨진 한 줄'])await page.getByRole('heading',{name:title}).waitFor();
    await page.getByRole('heading',{name:new RegExp(topic)}).waitFor();
    assert.equal(await page.locator('article.paper').count(),7);
    await page.getByText('케멧 전문가 프롬프트',{exact:true}).click();assert.ok((await page.locator('details').innerText()).includes(q));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),360);
    await page.getByRole('button',{name:'다시 물어보기'}).click();
  }
  assert.equal(paths.some(path=>/\/auth\/me|\/checkout|\/orders\//.test(path)),false);
  console.log('PASS guest → three question domains → select/reselect 3 of 12 cards → past/present/future, synthesis, Heka, papyrus, original expert prompt.');
}finally{await browser.close();}
