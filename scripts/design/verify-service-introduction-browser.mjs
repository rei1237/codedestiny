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
    await page.locator('.cdh-all-cta__btn').click();
    const search=page.locator('#cdAllFortunesSearch');
    for(const [slug,query]of [['palm-reading','손금'],['ziwei','자미두수'],['sukuyo','숙요'],['vedic','베다'],['astrology','점성술'],['life-book-ai','인생의 책']]){
      console.log(`Searching ${width}px ${slug}`);
      await search.fill(query);
      const img=page.locator('#cdAllFortunesResults img').filter({visible:true});
      await expect.poll(()=>img.evaluateAll((nodes,src)=>nodes.some(n=>n.getAttribute('src')===src),art[slug].cardImage)).toBe(true);
      const target=page.locator(`#cdAllFortunesResults img[src="${art[slug].cardImage}"]`).first();
      await target.scrollIntoViewIfNeeded();
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
        if(!await search.isVisible())await page.locator('.cdh-all-cta__btn').click();
      }
    }
    await page.close();
    for(const path of ['/','/palm-reading/','/consultations/','/ziwei-ai/','/astrology-ai/','/vedic-ai/','/sukuyo-compatibility-ai/','/neo-consultation/']){
      console.log(`Checking ${width}px ${path}`);
      page=await context.newPage();
      page.setDefaultTimeout(30000);page.setDefaultNavigationTimeout(180000);
      const response=await page.goto(base+path,{waitUntil:'domcontentloaded'});
      assert.equal(response.status(),200,path);
      const images=page.locator('img[src*="/service-introductions/"]');
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
