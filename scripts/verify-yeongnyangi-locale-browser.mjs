import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {fixtures} from './lib/yeongnyangi-mobile-payment.mjs';
import {RUNTIME_LOCALES} from '../lib/i18n/locale-normalize.js';
const base=process.env.YEONGNYANGI_TEST_BASE||'http://127.0.0.1:3128';
const selected=process.argv.find(v=>v.startsWith('--locale='))?.split('=')[1];
const selectedOutput=process.argv.find(v=>v.startsWith('--output='))?.split('=')[1];
assert.ok(!selected||RUNTIME_LOCALES.includes(selected),'UI locale must be supported');
assert.ok(!selectedOutput||RUNTIME_LOCALES.includes(selectedOutput),'Output locale must be supported');
assert.ok(['localhost','127.0.0.1','staging.code-destiny.com'].includes(new URL(base).hostname),'Only loopback or the requested staging UI; HTTP/PG/LLM remain fixtures');
const compiled=await build({stdin:{contents:"export {products} from './worker/yeongnyangi/payments/catalog'; export {consultationLocaleCopy,localizedKind} from './app/yeongnyangi/_lib/consultation-locale-copy'; export {consultationInputCopy} from './app/yeongnyangi/_lib/consultation-input-copy'; export {chartTerm} from './app/yeongnyangi/_lib/reading-chart-copy'; export {shareCopy} from './app/yeongnyangi/_lib/share-copy'; export {getCheckoutCopy} from './app/checkout/checkout-copy';",resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'node',write:false});
const {products,consultationLocaleCopy,consultationInputCopy,localizedKind,chartTerm,shareCopy,getCheckoutCopy}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const browser=await chromium.launch();
await mkdir('build-cache',{recursive:true});
try{
 for(const [index,locale] of RUNTIME_LOCALES.entries()){
  const outputLocale=selectedOutput||locale;
  const width=[360,390,430,1280][index%4],copy=consultationLocaleCopy(locale),outputCopy=consultationLocaleCopy(outputLocale),inputCopy=consultationInputCopy(locale),title=outputCopy.guideTitle;
  if(selected&&selected!==locale)continue;
  const f=await fixtures(browser,base,products.find(p=>p.id==='saju_mackerel'),width);
  // Development hot-reload traffic is outside the consultation flow and can reload fixtures mid-assertion.
  await f.context.routeWebSocket(url=>url.pathname==='/_next/webpack-hmr',socket=>socket.close());
  f.page.on('pageerror',error=>console.error(JSON.stringify({kind:'browser-error',locale,message:error.message,stack:error.stack})));
  const visit=async url=>{await f.page.waitForLoadState('networkidle');return f.page.goto(url,{waitUntil:'load'});};
  await f.context.addInitScript(()=>localStorage.setItem('fortune_auth_user',JSON.stringify({id:'507f1f77bcf86cd799439011',_id:'507f1f77bcf86cd799439011',name:'QA 고객',email:'qa@example.invalid',phoneNumber:'01012345678',role:'user'})));
  try{
   if(locale!=='ko'){
    await visit(`${base}/?lang=${locale}`);
    await f.page.locator('#localized-home-title').filter({hasText:copy.title}).waitFor();
    assert.doesNotMatch(await f.page.locator('main').innerText(),/[가-힣]/,'foreign home is authored');
    assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await f.page.screenshot({path:`build-cache/yn-locale-${locale}-home.png`,fullPage:true});
    await f.page.locator('details>summary').last().click();
    assert.doesNotMatch(await f.page.locator('details').last().innerText(),/[가-힣]/,'expanded service information follows locale');
    for(const guide of ['readings/saju','1000-won-fortune']){
     await visit(`${base}/yeongnyangi/${guide}/?lang=${locale}`);
     await f.page.getByRole('heading',{name:guide==='readings/saju'?copy.systems[0]:copy.guideTitle,level:1,exact:true}).waitFor();
     assert.doesNotMatch(await f.page.locator('main').innerText(),/[가-힣]/,'foreign product guide is authored');
     assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    }
   }
   await visit(`${base}/yeongnyangi/fortune/?lang=${locale}`);
   const select=f.page.locator('#reading-language');
   await select.waitFor();assert.equal(await select.inputValue(),locale);
   assert.deepEqual(await select.locator('option').evaluateAll(nodes=>nodes.map(node=>node.value)),RUNTIME_LOCALES);
   await f.page.getByRole('heading',{name:copy.title,exact:true}).waitFor();
   await select.selectOption(locale==='en'?'ja':'en');
   await f.page.getByRole('heading',{name:copy.title,exact:true}).waitFor();
   await select.selectOption(outputLocale);
   await f.page.getByRole('button',{name:locale==='ko'?'사주 해석 기질과 삶의 바탕':localizedKind('personal',locale),exact:true}).click();
   assert.equal(await select.inputValue(),outputLocale,'changing kind retains result language');
   assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(locale!=='ko'){
    const prose=await f.page.locator('main').evaluate(node=>{const clone=node.cloneNode(true);clone.querySelectorAll('select,[lang="ko"]').forEach(el=>el.remove());return clone.textContent;});
    assert.doesNotMatch(prose.replaceAll('QA 고객','').replaceAll('대한민국 부산',''),/[가-힣]/,'no Korean UI copy in foreign consultation');
   }
   await f.page.screenshot({path:`build-cache/yn-locale-${locale}-input.png`,fullPage:true});
   await f.page.getByRole('button',{name:inputCopy.checkout,exact:true}).click();
   await f.page.waitForURL('**/checkout/**');
   await f.page.getByRole('heading',{name:getCheckoutCopy(locale).title,exact:true}).waitFor();
   await f.page.locator(`[data-reading-output-locale="${outputLocale}"]`).waitFor();
   if(locale!=='ko')assert.doesNotMatch(await f.page.locator('main').innerText(),/[가-힣]/,'checkout product and controls are native');
   assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await f.page.screenshot({path:`build-cache/yn-locale-${locale}-checkout.png`,fullPage:true});
   assert.equal(f.state.requestInput.locale,outputLocale);
   assert.equal(f.state.requestInput.productId,'saju_mackerel');
   assert.ok(f.state.requestInput.timezone);
   const checkout=new URL(f.page.url());assert.equal(checkout.searchParams.get('lang'),locale);
   assert.equal(new URL(checkout.searchParams.get('returnTo'),base).searchParams.get('lang'),locale);
   // Persisted server response fixture, not an LLM or PG approval simulation.
   f.row.state='COMPLETED';f.row.paid=true;
   f.row.chapters=f.row.manifest.map((_,i)=>({title:`${title} ${i+1}`,summary:`${title} — ${i+1}`,analysis:[outputCopy.example],example:'',advice:'',persona:outputCopy.guideIntro,highlights:[],topics:[],sources:[]}));
   f.row.charts=[{domain:'astrology',title:'나의 출생 차트',source:'구매 당시 저장된 계산 근거',limitations:['출생 차트 해석이며 실시간 트랜짓은 포함하지 않습니다.'],groups:[{id:'astrology-0',label:'태양',items:[{label:'별자리',value:'양자리'}],chapterIds:[f.row.manifest[0].id],longitude:20}],cusps:[]}];
   const before=f.state.generates;
   await visit(`${base}/yeongnyangi/result/?id=${f.row.id}&lang=${locale}`);
   const book=f.page.locator('[data-reading-chapter]').first();await book.waitFor();
   await book.getByRole('heading',{name:outputLocale==='ko'?f.row.manifest[0].title:`${title} 1`,exact:true}).waitFor();
   await f.page.getByRole('heading',{name:chartTerm('나의 출생 차트',outputLocale),exact:true}).waitFor();
   await f.page.locator('[data-consultation-sharing] > summary').click();
   await f.page.getByRole('button',{name:shareCopy(outputLocale).copy,exact:true}).waitFor();
   if(locale!=='ko'&&outputLocale!=='ko')assert.doesNotMatch((await f.page.locator('main').innerText()).replaceAll('QA 고객',''),/[가-힣]/,'saved result controls, chart explanations and sharing are native');
   assert.equal(await f.page.locator('section[lang]').last().getAttribute('lang'),outputLocale);
   assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await f.page.screenshot({path:`build-cache/yn-locale-${locale}-result.png`,fullPage:true});
   await visit(`${base}/yeongnyangi/result/?id=${f.row.id}&lang=ko`);
   await f.page.locator('[data-reading-chapter]').first().waitFor();
   assert.equal(await f.page.locator('section[lang]').last().getAttribute('lang'),outputLocale,'saved output locale wins over a different site query');
   await visit(`${base}/yeongnyangi/library/?lang=${locale}`);
   const link=f.page.locator(`a[href*="id=${f.row.id}"]`);await link.waitFor();
   assert.equal(new URL(await link.getAttribute('href'),base).searchParams.get('lang'),locale);
   await f.page.waitForLoadState('networkidle');await link.click();await f.page.locator('[data-reading-chapter]').first().waitFor();
   assert.equal(f.state.generates,before,'Reread must not generate');
   assert.equal(f.state.sdk.length,0,'Review and reread must not open the PG');
   assert.deepEqual(f.state.unknown,[]);
   assert.deepEqual(f.state.errors,[]);
   if(['en','ja'].includes(locale)){
    delete f.state.profiles[0].location;
    await f.page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});
    await visit(`${base}/yeongnyangi/fortune/?lang=${locale}`);
    await f.page.getByRole('button',{name:locale==='en'?'Use current location':'現在地を使う',exact:true}).waitFor();
    await f.page.getByPlaceholder(locale==='en'?'City and country':'都市名と国名').waitFor();
   }
   console.log(`PASS UI=${locale} output=${outputLocale} ${width}px: purchase snapshot, return language, saved result and library reread`);
  }catch(error){
   await f.page.screenshot({path:`build-cache/yn-locale-${locale}-failure.png`,fullPage:true}).catch(()=>{});
   console.error(JSON.stringify({locale,url:f.page.url(),errors:f.state.errors,unknown:f.state.unknown,http:f.state.http.slice(-12),text:(await f.page.locator('body').innerText()).slice(-1600)}));
   throw error;
  }finally{await f.context.close();}
 }
}finally{await browser.close();}
