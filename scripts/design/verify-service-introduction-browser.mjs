import '../lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium, expect} from '@playwright/test';
import {FEATURE_KEY_PRICE_TABLE} from '../../worker/lib/paid-feature-registry.js';

// Remote fonts are deliberately blocked; capture the settled fallback font without waiting for font downloads.
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1';
const base = process.env.ART_TEST_ORIGIN || 'http://127.0.0.1:16883';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));
const out=process.env.ART_REVIEW_OUTPUT || 'build-cache/service-introduction-review';
fs.mkdirSync(out,{recursive:true});
const art=JSON.parse(fs.readFileSync('lib/marketing/service-introduction-art.json','utf8'));
const browser=await chromium.launch({headless:true});
const evidence=[];
try {
  for(const width of [360,390,1440]){
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',serviceWorkers:'block'});
    const calls=[];
    await context.addInitScript(()=>sessionStorage.setItem('cd_signature_consult_session_closed_v1','1')); // 데스크톱 홈 상담 팝업이 상세 닫기를 가리지 않게 한다
    await context.route('**/*',route=>{
      const request=route.request(),url=new URL(request.url());
      if(url.pathname.startsWith('/api/')){
        calls.push({path:url.pathname,method:request.method()});
        if(url.pathname==='/api/billing/features')return route.fulfill({json:{ok:true,legacyFeatureTable:Object.entries(FEATURE_KEY_PRICE_TABLE).map(([featureKey,value])=>({featureKey,...value}))}});
        if(['/api/auth/me','/api/auth/refresh'].includes(url.pathname))return route.fulfill({status:401,json:{ok:false,authenticated:false}});
        return route.fulfill({status:503,json:{ok:false,reason:'ART_REVIEW_MOCK'}});
      }
      if(url.origin!==base)return route.abort();
      return route.continue();
    });
    let page=await context.newPage();
    page.on('pageerror',error=>console.error('PAGEERROR',page.url(),error.stack));
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(180000);
    await page.goto(base+'/ggulggul/',{waitUntil:'domcontentloaded'});
    await expect(page.locator('.cd-boot-gate__veil')).toBeHidden({timeout:120000});
    const allFortunes=page.locator('.yh-all:visible, .cdh-all-cta__btn:visible').first();
    await allFortunes.click();
    const search=page.locator('#cdAllFortunesSearch');
    for(const [slug,query]of [['palm-reading','손금'],['ziwei','자미두수'],['sukuyo','숙요'],['vedic','베다'],['astrology','점성술'],['life-book-ai','인생의 책']]){
      console.log(`Searching ${width}px ${slug}`);
      await search.fill(query);
      const img=page.locator('#cdAllFortunesResults img').filter({visible:true});
      await expect.poll(()=>img.evaluateAll((nodes,src)=>nodes.some(n=>n.getAttribute('src')===src),art[slug].cardImage)).toBe(true);
      const target=page.locator(`#cdAllFortunesResults img[src="${art[slug].cardImage}"]`).first();
      // 검색 결과는 입력 직후 한 번 더 다시 그려지므로, 붙어 있는 노드를 잡을 때까지 재시도한다.
      await expect(async()=>{await target.scrollIntoViewIfNeeded({timeout:2000});}).toPass({timeout:30000});
      await expect.poll(()=>target.evaluate(n=>({complete:n.complete,width:n.naturalWidth,src:n.currentSrc})), {timeout:30000}).toMatchObject({complete:true,width:320});
      await target.locator('xpath=ancestor::a[1]').screenshot({path:`${out}/${width}-${slug}-search.png`});
      if(slug==='palm-reading'){
        await target.locator('xpath=ancestor::a[1]').click();
        const modal=page.locator('#tilePvwOverlay');
        await expect(modal).toBeVisible();
        await expect(modal).toHaveClass(/pvw-visual/,{timeout:120000});
        const hero=modal.locator('[data-feature-visual-host] > .featureVisualDetail .featureDetailHero img.featureDetailArt');
        await expect(hero).toBeVisible({timeout:120000});
        await expect(hero).toHaveAttribute('src','/feature-details/assets/palm-reading-960.webp');
        await expect.poll(()=>hero.evaluate(n=>n.complete&&n.naturalWidth>0)).toBe(true);
        await page.screenshot({timeout:30000,path:`${out}/${width}-palm-detail.png`});
        await page.locator('#tilePvwClose').click();
        if(!await search.isVisible())await allFortunes.click();
      }
    }
    await page.close();
    for(const path of ['/','/palm-reading/','/consultations/','/ziwei-ai/','/astrology-ai/','/vedic-ai/','/sukuyo-compatibility-ai/','/neo-consultation/']){
      console.log(`Checking ${width}px ${path}`);
      page=await context.newPage();
      page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(180000);
      const response=await page.goto(base+path,{waitUntil:'domcontentloaded'});
      assert.equal(response.status(),200,path);
      // 홈의 상담 그림은 '고민으로 찾기' 결과 안에 있으므로 고민 하나를 골라 펼친 뒤 본다.
      if(path==='/'&&await page.locator('#homeConcerns').count()){
        await page.locator('[data-yh-mounted]').waitFor({state:'attached',timeout:120000});
        await page.locator('#homeConcerns').evaluate(node=>{node.open=true;});
        await page.locator('[data-yh-concern="love"]').click();
      }
      // 상담 목록(/consultations/)은 dc8e22d81부터 소개 그림 대신 웹툰 표지를 보여준다.
      const images=page.locator(path==='/consultations/'?'img[src*="/consultation-webtoons/"]':'img[src*="/service-introductions/"]').filter({visible:true});
      await expect.poll(()=>images.count(),{timeout:120000}).toBeGreaterThan(0);
      await images.first().scrollIntoViewIfNeeded();
      await expect.poll(()=>images.first().evaluate(n=>n.complete&&n.naturalWidth>0),{timeout:30000}).toBe(true);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${width} ${path} overflow`);
      await page.screenshot({timeout:30000,path:`${out}/${width}-${path.replaceAll('/','')||'home'}-entry.png`});
      evidence.push({width,path,images:await images.count()});
      fs.writeFileSync(`${out}/evidence.json`,JSON.stringify(evidence,null,2)+"\n");
      await page.close();
    }
    assert.equal(calls.some(x=>/(generate|purchase|confirm)/.test(x.path)),false,'Unexpected generation or payment request');
    await context.close();
  }
}finally{await browser.close();}
fs.writeFileSync(`${out}/evidence.json`,JSON.stringify(evidence,null,2)+'\n');
console.log(`PASS ${evidence.length} responsive entry checks plus six search images and palm detail at each width`);
