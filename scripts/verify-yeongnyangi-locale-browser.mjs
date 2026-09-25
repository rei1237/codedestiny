import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {fixtures} from './lib/yeongnyangi-mobile-payment.mjs';
const base=process.env.YEONGNYANGI_TEST_BASE||'http://127.0.0.1:3128';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const compiled=await build({stdin:{contents:"export {products} from './worker/yeongnyangi/payments/catalog';",resolveDir:process.cwd(),loader:'ts'},bundle:true,format:'esm',platform:'node',write:false});
const {products}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const browser=await chromium.launch();
await mkdir('build-cache',{recursive:true});
try{
 for(const [locale,width,title] of [['en',360,'Conditions for your choice'],['ja',390,'選択の条件'],['ko',1280,'선택의 조건']]){
  const selected=process.argv.find(v=>v.startsWith('--locale='))?.split('=')[1];if(selected&&selected!==locale)continue;
  const f=await fixtures(browser,base,products.find(p=>p.id==='saju_mackerel'),width);
  try{
   await f.page.goto(`${base}/yeongnyangi/fortune/?lang=${locale}`,{waitUntil:'load'});
   const select=f.page.getByLabel('상담 결과 언어 / Reading language / 結果の言語');
   await select.waitFor();assert.equal(await select.inputValue(),locale);
   if(locale!=='ko')await f.page.getByText(locale==='en'?'Profile for this reading':'鑑定するプロフィール', {exact:true}).first().waitFor();
   await f.page.screenshot({path:`build-cache/yn-locale-${locale}-input.png`,fullPage:true});
   await f.page.getByRole('button',{name:locale==='en'?'Review payment details':locale==='ja'?'支払い内容を確認':'결제 내용 확인하기',exact:true}).click();
   await f.page.waitForURL('**/checkout/**');
   assert.equal(f.state.requestInput.locale,locale);
   assert.equal(f.state.requestInput.productId,'saju_mackerel');
   assert.ok(f.state.requestInput.timezone);
   const checkout=new URL(f.page.url());assert.equal(checkout.searchParams.get('lang'),locale);
   assert.equal(new URL(checkout.searchParams.get('returnTo'),base).searchParams.get('lang'),locale);
   // Persisted server response fixture, not an LLM or PG approval simulation.
   f.row.state='COMPLETED';f.row.paid=true;
   f.row.chapters=f.row.manifest.map((_,i)=>({title:`${title} ${i+1}`,summary:`${title} — fixture ${i+1}`,analysis:[locale==='ja'?'これは表示確認用の文章です。':'This is a display fixture.'],example:'',advice:'',persona:'Fixture',highlights:[],topics:[],sources:[]}));
   f.row.charts=[{domain:'astrology',title:'나의 출생 차트',source:'구매 당시 저장된 계산 근거',limitations:['출생 차트 해석이며 실시간 트랜짓은 포함하지 않습니다.'],groups:[{id:'astrology-0',label:'태양',items:[{label:'별자리',value:'양자리'}],chapterIds:[f.row.manifest[0].id],longitude:20}],cusps:[]}];
   const before=f.state.generates;
   await f.page.goto(`${base}/yeongnyangi/result/?id=${f.row.id}&lang=ko`,{waitUntil:'load'});
   const book=f.page.locator('[data-reading-chapter]').first();await book.waitFor();
   await book.getByRole('heading',{name:locale==='ko'?f.row.manifest[0].title:`${title} 1`,exact:true}).waitFor();
   await f.page.getByRole('heading',{name:locale==='en'?'My birth chart':locale==='ja'?'私の出生チャート':'나의 출생 차트',exact:true}).waitFor();
   await f.page.locator('[data-consultation-sharing] > summary').click();
   await f.page.getByRole('button',{name:locale==='en'?'Copy message':locale==='ja'?'文章をコピー':'문구 복사',exact:true}).waitFor();
   assert.equal(await book.locator('xpath=../..').getAttribute('lang'),locale);
   assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await f.page.screenshot({path:`build-cache/yn-locale-${locale}-result.png`,fullPage:true});
   await f.page.goto(`${base}/yeongnyangi/library/?lang=${locale}`,{waitUntil:'load'});
   const link=f.page.locator(`a[href*="id=${f.row.id}"]`);await link.waitFor();
   assert.equal(new URL(await link.getAttribute('href'),base).searchParams.get('lang'),locale);
   await link.click();await f.page.locator('[data-reading-chapter]').first().waitFor();
   assert.equal(f.state.generates,before,'Reread must not generate');
   assert.equal(f.state.sdk.length,0,'Review and reread must not open the PG');
   assert.deepEqual(f.state.unknown,[]);
   assert.deepEqual(f.state.errors,[]);
   if(locale!=='ko'){
    delete f.state.profiles[0].location;
    await f.page.evaluate(()=>sessionStorage.clear());
    await f.page.goto(`${base}/yeongnyangi/fortune/?lang=${locale}`,{waitUntil:'load'});
    await f.page.getByRole('button',{name:locale==='en'?'Use current location':'現在地を使う',exact:true}).waitFor();
    await f.page.getByPlaceholder(locale==='en'?'City and country':'都市名と国名').waitFor();
   }
   console.log(`PASS ${locale} ${width}px: purchase snapshot, return language, saved result and library reread`);
  }catch(error){
   await f.page.screenshot({path:`build-cache/yn-locale-${locale}-failure.png`,fullPage:true}).catch(()=>{});
   console.error(JSON.stringify({locale,url:f.page.url(),errors:f.state.errors,unknown:f.state.unknown,http:f.state.http.slice(-12),text:(await f.page.locator('body').innerText()).slice(-1600)}));
   throw error;
  }finally{await f.context.close();}
 }
}finally{await browser.close();}
