import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import assertHomePicker from './lib/assert-home-picker.cjs';

const base = process.argv[2] || 'http://127.0.0.1:4180';
assert.equal(new URL(base).hostname,'127.0.0.1');
const output = 'build-cache/typography-home';
await mkdir(output,{recursive:true});
const compiled = await build({stdin:{contents:"export {getProduct} from './worker/yeongnyangi/payments/catalog.ts';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'cjs',logLevel:'silent'});
const mod={exports:{}};
new Function('require','module','exports',compiled.outputFiles[0].text)(createRequire(import.meta.url),mod,mod.exports);
const product=mod.exports.getProduct('saju_mackerel'), id='a'.repeat(64);
const text='지금의 흐름은 마음이 앞서가더라도 자신의 속도를 찾는 데서 시작합니다. 命宮과 紫微斗數 같은 전문용어는 쉬운 설명과 함께 읽어 보세요. 관계에서는 서로의 생활 리듬을 존중하고, 일에서는 반복할 수 있는 작은 실천부터 정리해 보세요. ';
const record={id,profileId:'mock-profile',productId:product.id,product,state:'COMPLETED',paid:true,locale:'ko',createdAt:'2026-11-09T00:00:00Z',manifest:[{id:'core',title:'현재의 흐름과 나의 선택',part:'self',theme:'self',ordinal:0}],chapters:[{chapterId:'core',complete:true,summary:'서두르기보다 나의 속도를 확인하는 시기입니다.',analysis:[text.repeat(4)],example:text,advice:'오늘 실천할 한 가지를 적어 보세요.',highlights:[],sources:[],persona:'당신의 속도로 한 걸음씩 나아가세요.',topics:[]}]};
const browser=await chromium.launch({headless:true});
const report=[];
try {
  for(const width of (process.argv.includes('--reading-only') ? [390,1440] : [360,390,430,768,1440])) {
    console.log(`[typography-home] ${width}px shell`);
    const context=await browser.newContext({viewport:{width,height:960},serviceWorkers:'block',reducedMotion:'reduce'});
    await context.addInitScript(()=>{
      localStorage.setItem('fortune_auth_user',JSON.stringify({id:'type-fixture-user',_id:'type-fixture-user',name:'화면 검증',email:'type@example.invalid'}));
      localStorage.setItem('fortune_auth_token','mock-ui-token');
      localStorage.setItem('cd:first-visit:v1:ggulggul:guest',JSON.stringify({status:'dismissed',step:0}));
      sessionStorage.setItem('cd_signature_consult_session_closed_v1','1');
      window.__typeMetrics={cls:0,lcp:0};
      new PerformanceObserver(list=>list.getEntries().forEach(entry=>{if(!entry.hadRecentInput)window.__typeMetrics.cls+=entry.value;})).observe({type:'layout-shift',buffered:true});
      new PerformanceObserver(list=>{window.__typeMetrics.lcp=list.getEntries().at(-1).startTime;}).observe({type:'largest-contentful-paint',buffered:true});
    });
    await context.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.origin!==base)return route.abort();
      if(url.pathname.startsWith('/api/activation-rewards/'))return route.fulfill({status:404,json:{ok:false,code:'MOCK_ROUTE_NOT_IMPLEMENTED'}});
      if(url.pathname.startsWith('/api/'))return route.fulfill({json:url.pathname===`/api/yeongnyangi/requests/${id}`?{ok:true,fortune:record}:{ok:true,authenticated:true,user:{id:'type-fixture-user',_id:'type-fixture-user',name:'화면 검증',email:'type@example.invalid'},products:[],items:[],profiles:[],fortunes:[],nextCursor:null,data:{}}});
      return route.continue();
    });
    const page=await context.newPage();
    page.on('pageerror',error=>console.error('[typography browser]',error.message));
    page.on('console',message=>{if(message.type()==='error'&&!message.text().startsWith('Failed to load resource')&&!message.text().includes('Content Security Policy'))console.error('[typography console]',message.text().slice(0,1800));});
    await page.goto(base+'/static/index.html',{waitUntil:'domcontentloaded',timeout:120000});
    await page.waitForFunction(()=>document.querySelector('[data-yh-home]')?.dataset.yhMounted==='true'&&!document.documentElement.classList.contains('cd-boot-gate'));
    await page.waitForFunction(()=>document.fonts.status==='loaded',undefined,{timeout:30000});
    const cookie=page.locator('#cdCookieEssentialBtn');
    if(await cookie.isVisible())await cookie.click();
    await assertHomePicker(page,width);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no home overflow');
    const fonts=await page.evaluate(()=>({title:getComputedStyle(document.querySelector('#cdSignatureTitle')).fontFamily,body:getComputedStyle(document.body).fontFamily,loaded:[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family),...window.__typeMetrics,fontBytes:performance.getEntriesByType('resource').filter(e=>e.name.includes('/fonts/')).reduce((sum,e)=>sum+e.transferSize,0)}));
    assert.match(fonts.title,/CodeDestinyRounded/);assert.match(fonts.body,/CodeDestinyBody/);
    assert.ok(fonts.loaded.some(f=>f.includes('CodeDestinyRounded')),'real Jua font loaded');
    assert.ok(fonts.loaded.some(f=>f.includes('CodeDestinyBody')),'real Pretendard font loaded');
    await page.evaluate(()=>scrollTo(0,0));
    await page.screenshot({path:`${output}/home-${width}.png`});
    await page.locator('#cdSignatureConsult').screenshot({path:`${output}/picker-${width}.png`});
    await page.locator('[data-yh-concern="work"]').click();
    await page.locator('[data-yh-concern="work"]').press('Home');
    await page.locator('[data-yh-concern="love"]').click();
    if(width===390) {
      await page.evaluate(()=>document.documentElement.style.zoom='2');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'200% zoom has no document overflow');
      await page.evaluate(()=>document.documentElement.style.zoom='');
      await context.route('**/assets/fonts/ui/*.woff2',route=>route.abort());
      await page.reload({waitUntil:'load'});
      assert.ok(await page.locator('#cdSignatureTitle').isVisible(),'font failure keeps title visible');
    }
    report.push({route:'shell',width,...fonts});
    if([390,1440].includes(width) && !process.argv.includes('--home-only')) {
      await context.unroute('**/assets/fonts/ui/*.woff2');
      for(const route of (process.argv.includes('--reading-only') ? [`/yeongnyangi/result/?id=${id}`] : ['/','/yeongnyangi/','/yeongnyangi/readings/saju/','/yeongnyangi/library/',`/yeongnyangi/result/?id=${id}`])) {
        console.log(`[typography-home] ${width}px ${route.split('?')[0]}`);
        await page.goto(base+route,{waitUntil:'load',timeout:120000});
        await page.waitForFunction(()=>document.fonts.status==='loaded',undefined,{timeout:30000});
        if(route.includes('/result/')) {
          const paragraph=page.locator('[data-reading-chapter] p').first();
          await paragraph.waitFor({timeout:30000});
          await page.evaluate(()=>document.querySelector('[data-reading-chapter] p').scrollIntoView({block:'center',behavior:'instant'}));
          const essential=page.getByRole('button',{name:'필수만 사용',exact:true});
          if(await essential.isVisible())await essential.click();
          await page.screenshot({path:`${output}/reading-${width}.png`});
          await page.waitForFunction(()=>{const node=document.querySelector('[data-reading-chapter] p');return node&&getComputedStyle(node).fontFamily.includes('CodeDestinyBody');},undefined,{timeout:15000}).catch(async error=>{console.error('[reading fixture state]',await page.url(),(await page.locator('body').innerText()).slice(0,1200));throw error;});
          const style=await page.evaluate(()=>{const n=document.querySelector('[data-reading-chapter] p'),c=getComputedStyle(n);return{family:c.fontFamily,size:parseFloat(c.fontSize),leading:parseFloat(c.lineHeight),measure:n.getBoundingClientRect().width};});
          assert.match(style.family,/CodeDestinyBody/);assert.equal(style.size,width<768?17:18);assert.ok(Math.abs(style.leading/style.size-1.8)<.01);assert.ok(style.measure<=608);
          await page.screenshot({path:`${output}/reading-${width}.png`});
          report.push({route:'reading',width,...style});
        } else {
          await page.locator('h1').first().waitFor({state:'visible',timeout:30000});
          await page.screenshot({path:`${output}/${route==='/'?'entry':route.split('/').filter(Boolean).join('-')}-${width}.png`});
          report.push({route,width,body:await page.locator('body').evaluate(n=>getComputedStyle(n).fontFamily)});
        }
      }
    }
    await context.close();
  }
} finally {await browser.close();}
const metricsFile=process.argv.includes('--reading-only')?'reading-only-metrics.json':process.argv.includes('--home-only')?'home-only-metrics.json':'metrics.json';
await writeFile(`${output}/${metricsFile}`,JSON.stringify(report,null,2));
console.log(`[typography-home] PASS ${report.length} viewport/route cases; mock-only; screenshots and metrics in ${output}`);
