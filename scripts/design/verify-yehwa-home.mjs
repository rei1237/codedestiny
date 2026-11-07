import { chromium } from 'playwright';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import { execFileSync } from 'node:child_process';
const baseline = process.argv.includes('--baseline');
const committed = file => execFileSync('git',['show','HEAD:'+file],{encoding:'utf8'});
import { JSDOM } from 'jsdom';
import { HOME_CONCERNS } from '../../lib/marketing/home-concerns.mjs';
// 고민 칩 가격·신뢰 문구는 생성기(build-home-funnel)가 붙이므로, 생성된 홈에서 히어로 영역을 그대로 꺼내 쓴다.
const homeSection = new JSDOM(baseline ? committed('public/static/index.html') : readFileSync('public/static/index.html','utf8')).window.document.querySelector('[data-yh-home]').outerHTML;
const FREE_ENTRY = '/ggulggul/?action=cdOneStepFreeSajuEntry';
const registry = {};
runInNewContext(baseline ? committed('js/core/service-registry.js') : readFileSync('js/core/service-registry.js','utf8'),{window:registry});
const catalog = registry.__cdServiceRegistry;
if (!baseline) assert.deepEqual(JSON.parse(readFileSync('lib/marketing/yehwa-home.generated.json','utf8')),JSON.parse(JSON.stringify(catalog)),'generated catalog retains every original service');
const out = path.resolve(process.env.YEHWA_SCREENSHOTS || 'build-cache/yehwa-home');
mkdirSync(out,{recursive:true});
const publicRoot = path.resolve('public');
const mime = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
const browser = await chromium.launch({headless:true});
const report = [];
try {
 for (const width of [375,430,768,1440]) {
  const page = await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*', route=>{
   const url=new URL(route.request().url());
   if(url.hostname!=='yehwa.local')return route.abort();
   if(baseline && ['/styles/yehwa-home.css','/js/core/yehwa-home.mjs'].includes(url.pathname))return route.fulfill({body:committed(url.pathname.slice(1)),contentType:mime[path.extname(url.pathname)]});
   if(url.pathname==='/fixture')return route.fulfill({contentType:'text/html',body:`<!doctype html><html lang="ko"><head><meta charset="utf-8"><link rel="stylesheet" href="/styles/theme-tokens.css"><link rel="stylesheet" href="/styles/yehwa-motifs.css"><link rel="stylesheet" href="/styles/yehwa-home.css"><style>@font-face{font-family:CodeDestinySerifKR;src:url('/fonts/NanumMyeongjo-Bold.woff2')}body{margin:0;padding:20px;background:var(--cd-bg);--font-serif:CodeDestinySerifKR,serif;--font-body:Arial,sans-serif}*{box-sizing:border-box}</style></head><body><div id="cdHomeFunnel">${homeSection}</div><script type="module" src="/js/core/yehwa-home.mjs"></script></body></html>`});
   const file=path.resolve(publicRoot,'.'+decodeURIComponent(url.pathname==='/'||url.pathname==='/ggulggul/'?'/static/index.html':url.pathname));
   if(!file.startsWith(publicRoot+path.sep)||!existsSync(file))return route.fulfill({status:404,body:''});
   return route.fulfill({body:readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'});
  });
  await page.goto('https://yehwa.local/' + (process.env.YEHWA_FULL_SHELL ? 'static/index.html' : 'fixture')); 
  await page.locator('[data-yh-mounted]').waitFor();
  // 모바일·데스크톱 모두 히어로의 무료 CTA 하나가 첫 화면에 보인다.
  const free = page.locator('.yh-hero .yh-free-start');
  assert.ok((await free.getAttribute('href')).startsWith(FREE_ENTRY));
  assert.ok(await free.evaluate(node=>{const r=node.getBoundingClientRect();return r.height>=44&&r.bottom<innerHeight;}),'free start visible without scrolling');
  await free.focus();assert.equal(await free.evaluate(node=>node===document.activeElement),true);
  if (width < 700) {
   assert.equal(await page.locator('.yh-entry:visible').count(),3);
   assert.equal(await page.locator('.yh-entry[data-cd-service-id="saju"]').getAttribute('href'),catalog.find(item=>item.id==='saju').quickHref);
  }
  const chips = page.locator('[data-concern-picker] [data-concern]');
  assert.deepEqual(await chips.evaluateAll(nodes=>nodes.map(node=>node.dataset.concern)),HOME_CONCERNS.map(concern=>concern.id));
  for(const concern of HOME_CONCERNS){
   await page.locator(`[data-concern-picker] [data-concern="${concern.id}"]`).click();
   assert.equal(await page.locator('[data-concern-picker] [aria-pressed=true]').count(),1);
   assert.equal(await page.locator(`[data-concern-picker] [data-concern="${concern.id}"]`).getAttribute('aria-pressed'),'true');
   assert.equal(new URL(await free.getAttribute('href'),'https://yehwa.local').searchParams.get('concern'),concern.id);
   assert.equal(await page.evaluate(()=>sessionStorage.getItem('cd:home-concern')),concern.id);
  }
  await page.locator('[data-concern-picker] [data-concern=love]').click();
  assert.ok(await page.locator('[data-concern-picker]').evaluate(node=>node.getBoundingClientRect().bottom<innerHeight),'concern selection remains in first viewport');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}px no overflow`);
  await page.locator('.yh-art img').evaluate(image=>image.decode());
  await page.screenshot({path:path.join(out,`home-${width}.png`),fullPage:false});
  await page.locator('[data-yh-start]').click();
  assert.match(await page.locator('[data-yh-progress]').innerText(),/1 \/ 3/);
  await page.locator('[data-yh-next]').click();
  const frameRatio=await page.locator('.yh-portrait img').evaluate(image=>image.getBoundingClientRect().width/image.parentElement.getBoundingClientRect().width);
  assert.equal(frameRatio,4,'sprite keeps four equal frames instead of shrinking sheet');
  assert.equal(await page.locator('[data-yh-guide]').evaluate(node=>node.previousElementSibling.classList.contains('yh-entries')),true);
  await page.screenshot({path:path.join(out,`tutorial-${width}.png`)});
  await page.locator('[data-yh-prev]').click();
  await page.locator('[data-yh-next]').click();
  await page.locator('[data-yh-next]').click();
  await page.locator('[data-yh-next]').click();
  assert.equal(await page.locator('[data-yh-guide]').isVisible(),false);
  assert.equal(await page.locator('[data-yh-start]').evaluate(node=>node===document.activeElement),true);
  await page.locator('[data-yh-start]').click();await page.keyboard.press('Escape');
  assert.equal(await page.locator('[data-yh-guide]').isVisible(),false);
  await page.locator('[data-yh-start]').click();await page.locator('[data-yh-skip]').click();
  await page.locator('.yh-links summary').click();
  assert.equal(await page.locator('.yh-links a[href="/records/"]').isVisible(),true);
  assert.equal(await page.locator('.yh-links a[href="/yeongnyangi/library/"]').isVisible(),true);
  await page.evaluate(()=>document.documentElement.dataset.cdTheme='neo');
  await page.screenshot({path:path.join(out,`dark-${width}.png`)});
  if (process.env.YEHWA_FULL_SHELL) {
   const allIds=await page.evaluate(()=>window.CodeDestinyAllFortunes.filter({}).map(item=>item.id));
   for(const item of catalog)assert.ok(allIds.includes(item.id),`full search retains ${item.id}`);
   await page.locator('.cdh-all-cta__btn').click();
   const search=page.locator('#cdAllFortunesSearch');
   await search.fill('검색되지않는없는운세');
   await page.locator('#cdAllFortunesResults .cd-af__empty-title').waitFor({state:'visible'});
   await page.locator('#cdAllFortunesRoot [data-cd-search-clear]').click();
   assert.equal(await search.inputValue(),'');
   await search.fill('나크샤트라');
   await page.waitForFunction(()=>document.querySelectorAll('#cdAllFortunesResults a,#cdAllFortunesResults button').length>0);
   await search.fill('');
   await page.locator('#cdAllFortunesRoot [data-method="tarot"]').click();
   assert.equal(await page.locator('#cdAllFortunesRoot [data-method="tarot"]').getAttribute('aria-pressed'),'true');
   await page.locator('#cdAllFortunesRoot [data-cd-finder-reset]').click();
   assert.equal(await page.locator('#cdAllFortunesRoot [data-method="tarot"]').getAttribute('aria-pressed'),'false');
   await page.screenshot({path:path.join(out,`explore-${width}.png`)});
  }
  assert.deepEqual(errors,[]);
  report.push({width,services:catalog.length,errors});
  await page.close();
 }
 console.log(JSON.stringify({passed:true,report,out},null,2));
} finally {await browser.close();}
