import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {publishedMoonlightSeason} from '../canonical/moonlight-season.mjs';
const at=new Date('2026-11-14T01:00:00+09:00');
assert.deepEqual(publishedMoonlightSeason(at).chapters.map(item=>item.slug),['prologue']);
assert.deepEqual(publishedMoonlightSeason(new Date('2026-11-21T21:00:00+09:00')).chapters.map(item=>item.slug),['prologue','ep2']);
const season=publishedMoonlightSeason();
const origin=process.env.TOSS_OFFLINE_ORIGIN||'http://127.0.0.1:4329';
assert.equal(new URL(origin).hostname,'127.0.0.1');
const browser=await chromium.launch({channel:'chrome'});
try{
  const context=await browser.newContext({viewport:{width:360,height:740},serviceWorkers:'block',reducedMotion:'reduce'});
  const allowed=new Set(season.chapters.flatMap(item=>item.pages.map(page=>page.image)));
  const requested=[];
  let simulateDisconnect=false;
  await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin===origin){
      requested.push(url.pathname);
      if(route.request().resourceType()!=='document')return route.continue();
      // The offline harness restricts all remote images. Only these exact public
      // comic URLs are fulfilled below, with local originals and no network.
      return route.fetch().then(async response=>route.fulfill({response,body:(await response.text()).replace('img-src &#39;self&#39; data: blob:','img-src &#39;self&#39; data: blob: https://code-destiny.com')}));
    }
    if(!allowed.has(url.href)||simulateDisconnect)return route.abort();
    const episode=url.pathname.startsWith('/assets/yeongnyangi/season-1/');
    const path=episode?'content/'+url.pathname.slice('/assets/'.length):'public'+url.pathname;
    return route.fulfill({path:fileURLToPath(new URL('../../../'+path,import.meta.url)),contentType:'image/webp'});
  });
  const page=await context.newPage();
  await page.goto(origin);
  await page.locator('.world-entry-yeongnyangi').click();
  await page.getByRole('button',{name:'영냥이의 점술방 시즌 1 읽기'}).click();
  for(const item of season.chapters){
    await page.getByRole('button',{name:item.no+'화 읽기 · '+item.pages.length+'쪽'}).click();
    for(let i=0;i<item.pages.length;i++){
      const panel=item.pages[i];
      if(i===1){
        await page.getByRole('button',{name:'그림 다시 불러오기'}).waitFor();
        await page.getByText(panel.alt,{exact:true}).waitFor();
        simulateDisconnect=false;
        await page.getByRole('button',{name:'그림 다시 불러오기'}).click();
      }
      const image=page.getByRole('img',{name:panel.alt,exact:true});
      await image.waitFor();
      await image.evaluate(img=>img.decode());
      assert.equal(await image.getAttribute('src'),panel.image);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),360);
      if(i===2){await page.reload();await page.getByRole('button',{name:'3쪽부터 이어 보기'}).click();await page.getByRole('img',{name:panel.alt,exact:true}).waitFor();}
      if(i+1<item.pages.length){
        if(i===0)simulateDisconnect=true;
        await page.getByRole('button',{name:'다음 쪽'}).click();
      }
    }
    await page.getByRole('button',{name:'회차 목록으로'}).click();
  }
  assert.equal(requested.some(path=>/\/orders\/|\/checkout|\/auth\/me/.test(path)),false);
  console.log('PASS guest home → released season → every original panel; image retry and future release gates.');
}finally{await browser.close();}
