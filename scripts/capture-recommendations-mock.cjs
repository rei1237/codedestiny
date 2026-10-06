const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
// Run only against npm run dev; all non-loopback requests are blocked.
(async()=>{
  const base = process.env.RECOMMENDATIONS_PREVIEW_URL || 'http://127.0.0.1:3000';
  if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local mock URL required');
  const out = path.resolve('docs/operations/coupang-preview');
  fs.mkdirSync(out,{recursive:true});
  const browser = await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const requests=[],errors=[];
  await context.route('**/*',route=>{
    const u=new URL(route.request().url());
    if (!['127.0.0.1','localhost'].includes(u.hostname)) {requests.push({blocked:u.origin});return route.abort();}
    if(u.pathname.startsWith('/api/'))requests.push(u.pathname);
    return route.continue();
  });
  await context.addInitScript(()=>sessionStorage.setItem('flower_admin_token','mock-recommendation-admin.'+'0'.repeat(64)));
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base + '/recommendations/',{waitUntil:'networkidle',timeout:120000});
  await page.getByText('생활 추천을 준비하고 있어요.',{exact:false}).waitFor();
  if(await page.locator('a[href*="coupang"]').count())throw Error('Public OFF leaked a purchase anchor');
  if(requests.some(r=>typeof r==='string'&&r.startsWith('/api/recommendations')))throw Error('Public OFF fetched catalogue');
  await page.screenshot({path:path.join(out,'public-off-390.png')});
  await page.goto(base + '/admin/recommendations/',{waitUntil:'networkidle',timeout:120000});
  await page.getByRole('heading',{name:'생활 추천 관리',exact:true}).waitFor();

  await page.getByLabel('상품 ID',{exact:true}).fill('mock-draft-book');
  await page.getByLabel('상품 종류').selectOption('book');
  await page.getByLabel('확인된 상품명',{exact:true}).fill('검수용 초안 · 실제 상품 아님');
  await page.getByRole('button',{name:'초안 저장',exact:true}).click();
  await page.getByText('저장했습니다. 승인 전 공개 차단은 유지됩니다.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'상품 카드 미리보기',exact:true}).click();
  await page.getByText('지원하는 공식 단축 링크 형식이 아닙니다.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'구성 미리보기 열기',exact:true}).click();
  const preview=page.locator('[data-recommendation-browse]');
  await preview.getByRole('heading',{name:'영냥이의 생활 추천',exact:true}).waitFor();
  const measurements=[];
  for(const width of [360,390,430,1280]){
    await page.setViewportSize({width,height:900});
    await preview.scrollIntoViewIfNeeded();
    await preview.screenshot({path:path.join(out,'browse-'+width+'.png')});
    measurements.push(await page.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,overflow:document.documentElement.scrollWidth>innerWidth,adVisible:!!document.querySelector('[data-recommendation-browse]')})));
  }
  await preview.getByRole('button',{name:'반려동물',exact:true}).click();
  await preview.getByLabel('반려동물 선택').selectOption('cat');
  if(await preview.getByRole('heading',{name:'도서·기록 상품 자리',exact:true}).count())throw Error('Preview category filter failed');
  if(await page.locator('a[href*="link.coupang.com"]').count())throw Error('Preview leaked a purchase anchor');
  await page.setViewportSize({width:390,height:1800});
  await page.locator('[data-recommendation-block]').evaluate(el => el.scrollIntoView({block:'end'}));
  await page.locator('[data-recommendation-block]').screenshot({path:path.join(out,'result-block-390.png')});
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('heading',{name:'생활 추천 관리',exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(out,'admin-390.png')});
  fs.writeFileSync(path.join(out,'browser-evidence.json'),JSON.stringify({measurements,errors,requests,publicOff:true,adminDraftCrud:true,previewLinksDisabled:true,externalRequestsBlocked:true},null,2));
  await browser.close();
  if(errors.length||measurements.some(m=>m.overflow))throw Error(JSON.stringify({errors,measurements}));
  console.log(JSON.stringify({measurements,errors,captures:out}));
})().catch(e=>{console.error(e);process.exit(1);});
