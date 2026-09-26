import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {build} from 'esbuild';
import {fixtures} from './lib/yeongnyangi-mobile-payment.mjs';
const base=process.env.YEONGNYANGI_TEST_BASE||'http://127.0.0.1:3139';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const bundle=await build({stdin:{contents:"export {products} from './worker/yeongnyangi/payments/catalog'; export {consultationManifest,consultationKinds} from './worker/yeongnyangi/fortune/consultation-kinds';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node'});
const {products,consultationManifest,consultationKinds}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const dir='build-cache/yeongnyangi-night';await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true}),report=[];
const widths=process.env.YEONGNYANGI_TEST_WIDTHS?.split(',').map(Number)||[360,390,430,1280];
assert.ok(widths.length&&widths.every(width=>[360,390,430,1280].includes(width)));
const product=products.find(p=>p.id==='saju_tuna');
const shot=async(page,name)=>{console.log(name);await page.screenshot({path:`${dir}/${name}.png`});};
const noOverflow=async page=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal overflow');
try{
 for(const width of widths){
  const f=await fixtures(browser,base,product,width);f.state.products=products;f.state.holdGeneration=true;
  try{
   await f.page.emulateMedia({reducedMotion:'reduce'});
   await f.page.goto(base+'/yeongnyangi/');
   const cta=f.page.getByRole('link',{name:'내 질문으로 상담 시작하기'});await cta.waitFor();
   await f.page.locator('img[src*="night/consultation-room"]').waitFor();
   await f.page.waitForFunction(()=>[...document.querySelectorAll('picture img')].every(i=>i.complete&&i.naturalWidth>0));
   assert.ok((await cta.boundingBox()).y+(await cta.boundingBox()).height<844,'Mobile primary action is above fold');
   await f.page.waitForFunction(()=>{const el=document.querySelector('button[aria-label="영냥이 쓰다듬기"]');return el&&Object.keys(el).some(key=>key.startsWith('__reactProps'));});await f.page.getByRole('button',{name:'영냥이 쓰다듬기'}).click();await f.page.getByText('쓰다듬는 건… 딱 한 번만이야.').waitFor();
   assert.equal(await f.page.getByRole('button',{name:'영냥이 쓰다듬기'}).evaluate(e=>getComputedStyle(e).animationName),'none');
   await noOverflow(f.page);await shot(f.page,`home-${width}`);
   await cta.click();await f.page.getByRole('button',{name:'결제 내용 확인하기'}).waitFor();
   await f.page.getByLabel('영냥이에게 궁금한 이야기').fill('직업의 방향과 관계의 흐름을 어떻게 정리하면 좋을까요?');
   const fish=f.page.getByRole('group',{name:'생선 상품'});await fish.getByRole('button',{name:/참치/}).click();
   assert.ok((await fish.getByRole('button',{pressed:true}).innerText()).includes(String(consultationManifest(product,consultationKinds.saju.find(k=>k.id==='ask'),'general').length)));
   await fish.scrollIntoViewIfNeeded();await noOverflow(f.page);await shot(f.page,`tiers-${width}`);
   await f.page.getByRole('button',{name:'결제 내용 확인하기'}).click();await f.page.waitForURL('**/checkout/**');
   await f.page.getByRole('button',{name:/단건 결제하기/}).waitFor();await noOverflow(f.page);await shot(f.page,`checkout-${width}`);
   Object.assign(f.row,{paid:true,state:'GENERATING',locale:'ko',chapters:[{summary:'섬세하게 살피고, 스스로의 속도로 선택하는 사람',analysis:['목표를 세우면 꾸준히 이어가는 힘이 있어요. 다만 관계의 분위기를 먼저 살피다 보면 자신의 필요를 뒤로 미룰 수 있습니다.','이번 주에는 가장 중요한 일 하나를 골라 작은 단위로 나누어 보세요. 선택의 기준을 기록하면 마음의 부담을 덜어낼 수 있어요.'],advice:'오늘 할 수 있는 일 하나를 적어 보세요.',persona:'서두르지 않아도 돼. 네 속도로 읽어보자.'}]});
   await f.page.goto(base+'/yeongnyangi/result/?id='+f.row.id);await f.page.locator('#reading-progress progress').waitFor();
   assert.equal(await f.page.locator('#reading-progress progress').getAttribute('value'),'1');
   assert.equal(await f.page.locator('#reading-progress progress').getAttribute('max'),String(f.row.manifest.length+1));
   assert.equal(await f.page.locator('a[href*="/checkout/"]').count(),0);
   await noOverflow(f.page);await shot(f.page,`progress-${width}`);
   f.row.errorCode='AUTOMATIC_RECOVERY_STOPPED';f.row.recovery={canRetryNow:true,requestId:f.row.id};
   await f.page.reload();await f.page.getByText('자동 복구가 멈췄어요.',{exact:false}).waitFor();
   await noOverflow(f.page);await shot(f.page,`recovery-${width}`);
   assert.equal(await f.page.locator('a[href*="/checkout/"]').count(),0);
   f.row.state='COMPLETED';f.row.errorCode='';f.row.chapters=f.row.manifest.map(()=>f.row.chapters[0]);
   await f.page.reload();await f.page.locator('[data-reading-chapter]').first().waitFor();
   assert.equal(await f.page.locator('#reading-progress progress').getAttribute('value'),String(f.row.manifest.length+1));
   await shot(f.page,`result-${width}`);
   await f.page.locator('[data-reading-chapter]').first().scrollIntoViewIfNeeded();await shot(f.page,`reading-${width}`);
   await f.page.goto(base+'/yeongnyangi/library/?lang=ko');await f.page.getByText('주문번호로 상담 다시 열기',{exact:true}).click();
   await f.page.getByLabel('상담 주문번호',{exact:true}).fill('bad');await f.page.getByRole('button',{name:'기존 상담 확인하기'}).click();await f.page.getByText('상담 기록에 표시된 64자리 주문번호를 입력해 주세요.').waitFor();
   await f.page.getByLabel('상담 주문번호',{exact:true}).fill(f.row.id);await f.page.getByRole('button',{name:'기존 상담 확인하기'}).click();await f.page.waitForURL('**/result/**');
   assert.equal(new URL(f.page.url()).searchParams.get('id'),f.row.id);
   const generations=f.state.generates;await f.page.reload();await f.page.locator('[data-reading-chapter]').first().waitFor();assert.equal(f.state.generates,generations,'Completed reread must not regenerate');
   assert.deepEqual(f.state.errors,[]);assert.deepEqual(f.state.unknown,[]);report.push({width,status:'PASS',savedChapters:f.row.chapters.length});
  }catch(error){console.error(JSON.stringify({width,url:f.page.url(),pageErrors:f.state.pageErrorDetails,unknown:f.state.unknown,http:f.state.http.slice(-8)},null,2));await f.page.screenshot({path:`${dir}/failure-${width}.png`});throw error;}finally{await f.context.close();}
 }
 for(const locale of ['en','ja','zh-CN','zh-TW']){
  const f=await fixtures(browser,base,product,360);f.state.products=products;f.state.holdGeneration=true;
  try{await f.page.goto(base+`/yeongnyangi/fortune/?consultationKind=ask&lang=${locale}`);await f.page.locator('#consultation-question').waitFor();await noOverflow(f.page);
   await f.page.getByRole('group',{name:'생선 상품'}).scrollIntoViewIfNeeded();await shot(f.page,`locale-${locale}`);assert.deepEqual(f.state.errors,[]);report.push({locale,width:360,status:'PASS'});
  }finally{await f.context.close();}
 }
 console.log('PASS: '+widths.length+' viewports, real consultation/checkout components, saved progress, held recovery, order lookup, completed reread, 4 translated layouts; mock transport only.');
}finally{await browser.close();await writeFile(`${dir}/verification-${widths.join('-')}.json`,JSON.stringify({cases:report,realPgCalls:0,realLlmCalls:0,productionWrites:0},null,2));}
