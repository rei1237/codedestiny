const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const base = process.env.RECOMMENDATIONS_PREVIEW_URL;
  if (!base || !['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local mock URL required');
  const out = path.resolve(process.env.AFFILIATE_CAPTURE_DIR || path.join(require('os').tmpdir(), 'code-destiny-affiliate-design'));
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width:390, height:900 }, reducedMotion:'reduce' });
  const blocked = [], errors = [], measurements = [];
  await context.route('**/*', route => {
    const u = new URL(route.request().url());
    if (!['localhost','127.0.0.1'].includes(u.hostname)) { blocked.push(u.origin); return route.abort(); }
    return route.continue();
  });
  await context.addInitScript(() => sessionStorage.setItem('flower_admin_token','mock-recommendation-admin.'+'0'.repeat(64)));
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  for (const brand of ['yeongnyangi','ggulggul']) {
    await page.goto(base + '/recommendations/?brand=' + brand, { waitUntil:'networkidle',timeout:120000 });
    const publicSurface = page.locator('[data-recommendation-browse]');
    await page.waitForFunction(b => document.querySelector('[data-recommendation-browse]')?.dataset.affiliateBrand === b, brand);
    if (await publicSurface.locator('article,select,a[target="_blank"]').count()) throw Error('Public OFF exposed products');
    if (await publicSurface.locator('a').first().getAttribute('href') !== '/' + brand + '/') throw Error('Wrong brand return');
    await publicSurface.screenshot({ path: path.join(out,brand+'-pending-390.png') });
  }
  await page.goto(base + '/admin/recommendations/', {waitUntil:'networkidle',timeout:120000});
  await page.getByRole('button',{name:'구성 미리보기 열기',exact:true}).click();
  await page.getByLabel('미리보기 제휴 구성').selectOption('mixed');
  const surface = page.locator('[data-recommendation-browse]');
  for (const brand of ['yeongnyangi','ggulggul']) {
    await page.getByLabel('미리보기 브랜드').selectOption(brand);
    await page.waitForFunction(b => document.querySelector('[data-recommendation-browse]')?.dataset.affiliateBrand === b, brand);
    for (const width of [360,390,430,1280]) {
      await page.setViewportSize({width,height:4200});
      await surface.scrollIntoViewIfNeeded();
      await surface.screenshot({path:path.join(out,brand+'-'+width+'.png')});
      const measure = await page.evaluate(() => ({width:innerWidth,documentWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth,
        contrasts:(() => {
          const s=getComputedStyle(document.querySelector('[data-recommendation-browse]'));
          const lum=hex=>{const v=hex.trim().replace('#','').match(/../g).map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);return .2126*v[0]+.7152*v[1]+.0722*v[2];};
          const ratio=(a,b)=>{const x=lum(s.getPropertyValue(a)),y=lum(s.getPropertyValue(b));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
          return ['--rec-ink','--rec-muted','--rec-accent'].map(c=>({token:c,ratio:Math.min(...['--rec-bg','--rec-surface','--rec-raised'].map(bg=>ratio(c,bg)))}));
        })(),
        controls:[...document.querySelectorAll('[data-recommendation-browse] button,[data-recommendation-browse] select,[data-recommendation-browse] input,[data-recommendation-browse] a')].filter(e=>e.getBoundingClientRect().height<44).map(e=>e.textContent)}));
      measurements.push({brand,...measure});
    }
    await page.setViewportSize({width:390,height:4200});
    const result=page.locator('[data-recommendation-block]');
    await result.scrollIntoViewIfNeeded();
    await result.screenshot({path:path.join(out,brand+'-result-390.png')});
  }
  await surface.getByRole('button',{name:'반려동물',exact:true}).click();
  if (await surface.locator('article').count() !== 1) throw Error('Category filter failed');
  await surface.getByRole('button',{name:'이 상품 제외',exact:true}).click();
  if (await surface.locator('article').count()) throw Error('Exclusion failed');
  if (await page.locator('[data-recommendation-browse] a[target="_blank"],[data-recommendation-block] a[target="_blank"]').count()) throw Error('Preview leaked outbound link');
  await page.keyboard.press('Tab');
  const focus = await page.evaluate(()=>{ const e=document.activeElement;return {tag:e.tagName,outline:getComputedStyle(e).outlineStyle}; });
  fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify({measurements,errors,blocked,focus,publicOff:true,previewOutboundLinks:0,filters:true},null,2));
  await browser.close();
  if (errors.length || measurements.some(m=>m.overflow || m.controls.length || m.contrasts.some(c=>c.ratio<4.5))) throw Error(JSON.stringify({errors,measurements}));
  console.log(JSON.stringify({out,measurements,errors}));
})().catch(e=>{console.error(e);process.exit(1);});
