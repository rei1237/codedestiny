import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
const base=process.env.YEONGNYANGI_TEST_BASE||'http://127.0.0.1:3108';
const stagingFixture=process.argv.includes('--staging-fixtures') && base==='https://staging.code-destiny.com';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname) && !stagingFixture)throw new Error('Only loopback or explicit --staging-fixtures at the staging origin is allowed.');
const built=await build({stdin:{contents:"export {products,systemNames} from './worker/yeongnyangi/payments/catalog';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node'});
const {products,systemNames}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const user={id:'507f1f77bcf86cd799439011',_id:'507f1f77bcf86cd799439011',name:'테스트 고객',role:'user'};
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844}});
await context.addCookies([{name:'fortune_auth_role',value:'user',url:base}]);
let profiles=[],row,paid=false,creates=0,generates=0,payments=0,failNext=false;
const failures=[];
await context.addInitScript(()=>{window._cdOpenPaidServiceGate=async options=>{
 window.__qaPayAttempts=(window.__qaPayAttempts||0)+1;
 if(window.__qaPayAttempts===1)return {ok:false,status:'failed',error:{code:'PAYMENT_CANCELLED'}};
 if(window.__qaPayAttempts===2)return {ok:false,status:'failed',error:{code:'PAYMENT_FAILED',message:'모의 PG 결제 실패'}};
 const response=await fetch('/api/test-fixture-pg',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(options)});
 if(!response.ok)return {ok:false,status:'failed'};
 return {ok:true,status:'paid',payment:{status:'paid',paymentId:'fixture-pg'},consume:{ok:true,transactionId:'fixture-pg',featureKey:options.featureKey}};
};});
await context.route('**/*',async route=>{
 const request=route.request(),url=new URL(request.url()),path=url.pathname;
 const respond=(json,status=200)=>route.fulfill({status,json});
 if(path.startsWith('/api/')){
  if(path==='/api/auth/me')return respond({ok:true,authenticated:true,user});
  if(path==='/api/geocode')return respond({lat:35.1796,lng:129.0756,name:'대한민국 부산',timezone:'Asia/Seoul',fallback:false});
  if(path==='/api/profile'){
   if(request.method()==='POST'){const p=request.postDataJSON().profile;profiles.push({...p,profileId:'shared-profile',birthDate:'1990-06-15'});return respond({ok:true,profile:profiles.at(-1)});}
   return respond({ok:true,profiles,currentId:profiles[0]?.profileId});
  }
  if(path==='/api/yeongnyangi/products')return respond({ok:true,products:products.map(p=>({...p,available:true}))});
  if(path==='/api/test-fixture-pg'){
   const input=request.postDataJSON();assert.equal(input.requestId,`yn-${row.id}`);assert.deepEqual(input.allowedPaymentModes,['direct']);
   payments++;paid=true;return respond({ok:true});
  }
  if(path==='/api/yeongnyangi/requests'){
   if(request.method()==='POST'){
    creates++;const input=request.postDataJSON(),product=products.find(p=>p.id===input.productId);assert.equal(input.profileId,'shared-profile');
    row={id:'a'.repeat(64),productId:product.id,profileId:input.profileId,product,state:'CREATED',paid:false,chapters:[],manifest:Array.from({length:product.chapterCount},(_,i)=>({id:`chapter-${i}`,title:`테스트 상담 ${i+1}`})),createdAt:new Date().toISOString()};
    return respond({ok:true,fortune:row});
   }
   return respond({ok:true,fortunes:row?[row]:[]});
  }
  if(path.startsWith('/api/yeongnyangi/requests/')){
   if(path.endsWith('/activate')){if(!paid)return respond({code:'PAYMENT_REQUIRED',message:'결제가 필요해요.'},402);row.paid=true;row.state='PAID';}
   if(path.endsWith('/generate')){
    generates++;
    if(failNext){failNext=false;row.state='FORTUNE_FAILED';return respond({code:'FORTUNE_PROVIDER_FAILED',message:'잠시 후 같은 상담에서 다시 시도해 주세요.'},502);}
    row.chapters.push({summary:'저장된 상담의 핵심',analysis:['실제 LLM 응답이 아닌 브라우저 테스트용 본문입니다.'],example:'테스트 사례',advice:'테스트 조언',persona:'차근차근 읽어봐.',sources:[],topics:[],highlights:[]});
    row.state=row.chapters.length===row.manifest.length?'COMPLETED':'PAID';
   }
   return respond({ok:true,fortune:row});
  }
  return respond({ok:true});
 }
 if(url.origin!==base)return route.fulfill({status:204,body:''});
 return route.continue();
});
const page=await context.newPage();page.on('pageerror',e=>failures.push(e.message));
try{
 await page.goto(base+'/yeongnyangi/',{waitUntil:'domcontentloaded',timeout:120000});
 await page.getByRole('heading',{name:/네 운명의 이야기/}).waitFor({timeout:120000});
 await page.screenshot({path:'build-cache/yeongnyangi-home-390.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.goto(base+'/yeongnyangi/fortune/',{waitUntil:'domcontentloaded',timeout:120000});
 await page.getByRole('button',{name:'새 프로필 만들기'}).click({timeout:120000});
 await page.getByLabel('이름',{exact:true}).fill('테스트 고객');await page.getByLabel('생년월일',{exact:true}).fill('1990-06-15');
 await page.getByLabel('출생시간',{exact:true}).fill('14:30');await page.getByLabel('출생지역',{exact:true}).fill('부산');
 await page.getByRole('button',{name:'프로필 저장하기',exact:true}).click();
 await page.getByLabel('함께 읽을 프로필').selectOption('shared-profile');
 await page.getByLabel('영냥이에게 궁금한 이야기').fill('올해 일과 관계의 흐름이 궁금해요.');
 await page.getByRole('button',{name:/결제 내용 확인하기/}).click();
 await page.waitForURL('**/checkout/**',{timeout:120000});
 await page.getByRole('button',{name:/단건 결제하기/}).waitFor({timeout:120000});
 await page.screenshot({path:'build-cache/yeongnyangi-checkout-bound-390.png',fullPage:true});
 await page.getByRole('button',{name:/단건 결제하기/}).click();
 await page.getByText('결제를 취소했어요. 준비되면 다시 눌러 주세요.').waitFor();
 await page.locator('[data-yeongnyangi-payment-host]').waitFor();
 await page.getByRole('dialog').getByRole('button',{name:'닫기',exact:true}).click();
 assert.equal(payments,0);assert.equal(creates,1);
 await page.getByRole('button',{name:/단건 결제하기/}).click();
 await page.getByRole('alert').waitFor();assert.equal(payments,0);
 await page.getByRole('dialog').getByRole('button',{name:'닫기',exact:true}).click();
 await page.getByRole('button',{name:/단건 결제하기/}).click();
 await page.waitForURL('**/yeongnyangi/result/**',{timeout:120000});
 await page.getByRole('button',{name:'영냥이 상담 시작하기',exact:true}).waitFor({timeout:120000});
 failNext=true;await page.getByRole('button',{name:'영냥이 상담 시작하기',exact:true}).click();
 await page.getByRole('alert').waitFor();assert.equal(payments,1);
 await page.getByRole('button',{name:'영냥이 상담 시작하기',exact:true}).click();
 await page.getByText('네 이야기를 모두 펼쳐두었어. 천천히 읽어봐.').waitFor({timeout:120000});
 const previous=generates;await page.reload({waitUntil:'domcontentloaded'});
 await page.getByText('네 이야기를 모두 펼쳐두었어. 천천히 읽어봐.').waitFor();
 assert.equal(generates,previous);assert.equal(payments,1);assert.equal(creates,1);
 await page.screenshot({path:'build-cache/yeongnyangi-result-390.png',fullPage:true});
 for(const width of [360,430,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await page.goto(base+'/yeongnyangi/fortune/',{waitUntil:'domcontentloaded'});
 let displayed=0;
 for(const [domain,label] of [...Object.entries(systemNames),['fusion','복합 운세']]){
  await page.getByRole('group',{name:'운세 종류'}).getByRole('button',{name:label,exact:true}).click();
  const items=products.filter(p=>domain==='fusion'?p.readingKind!=='single':p.domain===domain&&p.readingKind==='single');
  const choices=page.getByRole('group',{name:'생선 상품'}).getByRole('button');
  assert.equal(await choices.count(),items.length);
  for(let i=0;i<items.length;i++){
   await choices.nth(i).click();
   assert.ok((await page.getByRole('button',{name:/결제 내용 확인하기/}).textContent()).includes(items[i].priceKRW.toLocaleString('ko-KR')));
   displayed++;
  }
 }
 assert.equal(displayed,28);
 await page.goto(base+'/yeongnyangi/',{waitUntil:'domcontentloaded'});
 await page.screenshot({path:'build-cache/yeongnyangi-home-1280.png',fullPage:true});
 assert.equal(await page.locator('.ynOriginal').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(24, 19, 43)');
 await page.getByRole('button',{name:'영냥이 쓰다듬기'}).click();
 await page.getByText('쓰다듬는 건…',{exact:true}).waitFor();
 await page.goto(base+'/yeongnyangi/room/#story',{waitUntil:'domcontentloaded'});
 await page.getByRole('dialog',{name:'영냥이의 프롤로그'}).waitFor();
 await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.getByRole('link',{name:/오늘의 무료 운세 보기/}).waitFor();
 assert.equal(await page.getByRole('link',{name:/오늘의 무료 운세 보기/}).getAttribute('href'),'/today/');
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:'build-cache/yeongnyangi-room-390.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(failures,[]);
 console.log(JSON.stringify({status:'PASS',products:products.length,profileCreates:profiles.length,paymentFixtureCalls:payments,consultationCreates:creates,chapters:row.chapters.length,reloadGeneratedAgain:false,providerFailureRecovered:true,realPaidCalls:0}));
}finally{await browser.close();}
