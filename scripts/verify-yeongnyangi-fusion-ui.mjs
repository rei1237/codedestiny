import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {fixtures} from './lib/yeongnyangi-mobile-payment.mjs';
const base=process.env.YEONGNYANGI_TEST_BASE||'http://127.0.0.1:3108';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const built=await build({stdin:{contents:"export {products} from './worker/yeongnyangi/payments/catalog';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node'});
const {products}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const fusion=products.filter(p=>p.readingKind!=='single');
await mkdir('build-cache/yeongnyangi-fusion',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const width of [360,390,430,1280]){
  const f=await fixtures(browser,base,fusion[3],width);f.state.products=products;
  try{
   await f.page.goto(base+'/');
   await f.page.getByRole('button',{name:'내 운명 깊게 보기',exact:true}).click();
   const catalog=f.page.getByRole('region',{name:'초융합 상담 선택'});
   await catalog.getByRole('link',{name:/오마카세 초융합 운세/}).waitFor();
   assert.equal(await catalog.getByRole('link').count(),4);
   for(const p of fusion)assert.equal(await catalog.locator(`a[href="/yeongnyangi/fortune/?product=${p.id}"]`).count(),1);
   assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await f.page.screenshot({path:`build-cache/yeongnyangi-fusion/menu-${width}.png`});
   await catalog.getByRole('link',{name:/오마카세 초융합 운세/}).click();
   await f.page.getByRole('button',{name:/오마카세 초융합 운세/}).waitFor();
   assert.equal(await f.page.getByRole('button',{name:/오마카세 초융합 운세/}).getAttribute('aria-pressed'),'true');
   await f.page.getByRole('button',{name:'결제 내용 확인하기',exact:true}).waitFor();
   assert.equal(await f.page.getByRole('button',{name:'결제 내용 확인하기',exact:true}).isEnabled(),true);
   await f.page.screenshot({path:`build-cache/yeongnyangi-fusion/consultation-${width}.png`,fullPage:true});
   assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(width===390){
    await f.page.getByRole('button',{name:'결제 내용 확인하기',exact:true}).click();
    await f.page.waitForURL('**/checkout/**');
    assert.equal(new URL(f.page.url()).searchParams.get('featureKey'),fusion[3].cdFeatureKey);
    assert.equal(f.state.creates,1);
    await f.page.goto(base+'/yeongnyangi/fortune/?domain=fusion');
    assert.equal(await f.page.getByRole('button',{name:/사주 \+ 자미두수/}).getAttribute('aria-pressed'),'true');
   }
   assert.deepEqual(f.state.unknown,[]);assert.deepEqual(f.state.errors,[]);
   console.log(`PASS fusion menu, selection, layout ${width}px`);
  }catch(error){await f.page.screenshot({path:'build-cache/yeongnyangi-fusion/failure.png',fullPage:true});console.error(JSON.stringify({url:f.page.url(),errors:f.state.errors,body:(await f.page.locator('body').innerText()).slice(0,1500)}));throw error;}finally{await f.context.close();}
 }
 const f=await fixtures(browser,base,fusion[0]);f.state.products=products;
 let mode='error',release;
 try{
  await f.context.route('**/api/yeongnyangi/products',async route=>{
   if(mode==='loading')await new Promise(resolve=>{release=resolve;});
   await route.fulfill({status:mode==='error'?503:200,json:mode==='error'?{message:'fixture'}:{products:products.map(p=>({...p,available:mode==='ready'}))}});
  });
  await f.page.goto(base+'/');await f.page.getByRole('button',{name:'내 운명 깊게 보기',exact:true}).click();
  await f.page.getByRole('button',{name:'상담 메뉴 다시 확인하기'}).waitFor();
  mode='loading';await f.page.getByRole('button',{name:'상담 메뉴 다시 확인하기'}).click();
  await f.page.getByText('영냥이가 상담 메뉴를 펼치고 있다냥.').waitFor();
  mode='unavailable';release();
  await f.page.getByRole('button',{name:'상담 가능 여부 다시 확인하기'}).waitFor();
  assert.equal(await f.page.locator('.fish-catalog a[href]').count(),0);
  mode='ready';await f.page.getByRole('button',{name:'상담 가능 여부 다시 확인하기'}).click();
  await f.page.getByRole('link',{name:/오마카세 초융합 운세/}).waitFor();
  assert.equal(await f.page.locator('.fish-catalog a[href]').count(),4);
  console.log('PASS catalogue failure, loading, unavailable, recovery; real PG/LLM calls 0');
 }finally{await f.context.close();}
}finally{await browser.close();}
