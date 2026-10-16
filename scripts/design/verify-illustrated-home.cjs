// Real home controls, local fixtures only. No provider, payment or production traffic.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const origin = process.env.HOME_UI_ORIGIN || 'http://127.0.0.1:4188';
assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/);
const profile = { id:'home-art-fixture', name:'검증용 프로필', gender:'F', birth:{year:1990,month:5,day:15,hour:12,minute:0,calType:'solar'}, location:{tz:'Asia/Seoul',tzOffset:9,baseTzOffset:9,lng:126.978,lat:37.5665,label:'대한민국 (서울)'} };
(async () => {
  const browser = await chromium.launch({headless:true});
  const results = [];
  try {
    async function pageFor(width=390) {
      const page = await browser.newPage({viewport:{width,height:844},hasTouch:width<640,isMobile:width<640,reducedMotion:'reduce',serviceWorkers:'block'});
      await page.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) return route.abort();
        if (url.pathname.startsWith('/api/')) return route.fulfill({json:url.pathname==='/api/auth/me'?{ok:true,authenticated:true,user:{id:'home-art-fixture'}}:{ok:true,profiles:[],unlocks:[],data:null}});
        const resized = url.pathname.match(/^\/cdn-cgi\/image\/[^/]+\/(.+)$/);
        if(resized) { const file=path.resolve('public',decodeURIComponent(resized[1])); if(file.startsWith(path.resolve('public')+path.sep)&&fs.existsSync(file))return route.fulfill({path:file}); }
        return route.continue();
      });
      await page.addInitScript(()=>sessionStorage.setItem('privacyAgreed','true'));
      page.on('dialog',dialog=>dialog.dismiss());
      await page.goto(origin+'/ggulggul/',{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.__codeDestinyGlobalActionsBound && window.cdMobileCollectionFullscreen);
      return page;
    }
    for(const width of [360,390,430,1440]) {
      const page=await pageFor(width);
      // 2026-10-17 단순화: 체계 아이콘 6개 대신 "무료로 먼저" 카드 3장(무료 사주·오늘의 운세·무료 타로)만 둔다.
      const ids=await page.locator('#cdQuickServices a').evaluateAll(nodes=>nodes.map(n=>n.dataset.cdServiceId||n.getAttribute('href')));
      assert.deepEqual(ids,['saju','/today/','tarot']);
      for(const mode of ['pig','neo']) {
        await page.locator(`#cdhThemeSlot [data-theme-mode="${mode}"]`).click();
        const geometry=await page.locator('#cdQuickServices a').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return {x:b.x,y:b.y,right:b.right,width:b.width,height:b.height};}));
        assert.ok(geometry.every(b=>b.x>=0&&b.right<=width&&b.height>=44&&b.width>=44),'touch targets fully inside viewport');
        // 2026-10-13: 라이트·다크 모두 연이 하나다(네오 히어로 그림 제거).
        assert.equal(await page.locator('.cdh-scene-art [data-character="yeoni"]').isVisible(),true);
        assert.equal(await page.locator('.cdh-scene-art [data-character="neo"]').count(),0);
      }
      await page.reload({waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>document.documentElement.classList.contains('neo-mode'));
      assert.equal(await page.locator('.cdh-scene-art [data-character="yeoni"]').isVisible(),true,'saved dark mode keeps Yeoni');
      const tarot=page.locator('#cdQuickServices [data-cd-service-id="tarot"]');
      await tarot.focus();await page.keyboard.press('Enter');
      if(width<640){
        await page.locator('#tarotCollection.cd-mobile-collection-fullscreen').waitFor({state:'visible'});
        assert.equal(await page.locator('#tarotModalOverlay').isVisible(),false,'library must not open a card-draw modal');
        assert.ok(await page.locator('#tarotCollection .tarot-tile').count()>1);
        if(width===390){
          await page.locator('#tarotCollection [data-action="openTarotLoveModal"]').click();
          await page.locator('#tilePvwClose').waitFor({state:'visible'});
          assert.ok((await page.locator('#tilePvwTitle').textContent()).trim().length>0,'selected tarot service has a detail title');
          await page.locator('#tilePvwClose').click();
          await page.locator('#tarotCollection.cd-mobile-collection-fullscreen').waitFor({state:'visible'});
        }
        await page.keyboard.press('Escape');
        await page.waitForFunction(()=>!window.cdMobileCollectionFullscreen.isOpen());
        assert.equal(await page.locator('#cdhCollectionsWrap').isVisible(),false,'library close leaves the home collections folded');
      }else{
        await page.waitForFunction(()=>document.querySelector('#tarotCollection').getAttribute('data-collection-open')==='true');
        assert.equal(await page.locator('#tarotModalOverlay').isVisible(),false);
      }
      results.push({width,modePersistence:true,methods:true,tarotLibrary:true});
      await page.close();
    }
    // 자미두수·숙요·점성술·베딕은 홈 아이콘이 아니라 "모든 운세 보기" 목록에서 연다(verify-home-funnel 이 그 흐름을 잰다).
    for(const target of [{id:'saju'}]) {
      const page=await pageFor();
      if(target.id!=='saju')await page.evaluate(async p=>{await window.__cdEnsureDestinyProfileLoaded();const s=window.DestinyProfileManager.storage;s.save([p]);s.setCurrent(p.id);await window.__cdEnsureBirthModalDepsLoaded();},profile);
      await page.locator(`#cdQuickServices [data-cd-service-id="${target.id}"]`).click();
      if(target.id==='saju')await page.locator('#destinyCardForm #nameInput').waitFor({state:'visible'});
      else if(target.id==='vedic'){await page.waitForURL(/\/vedic-astrology(?:\.html)?(?:[?#]|$)/);await page.locator('#vedicConsultation').waitFor({state:'visible',timeout:30000});}
      else await page.locator('#'+target.overlay).waitFor({state:'visible',timeout:30000});
      results.push({action:target.id,opened:true});await page.close();
    }
    fs.mkdirSync('build-cache/home-art',{recursive:true});fs.writeFileSync('build-cache/home-art/interactions.json',JSON.stringify(results,null,2));
    console.log('[illustrated-home] PASS '+JSON.stringify(results));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
