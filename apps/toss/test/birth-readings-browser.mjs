import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='http://127.0.0.1:'+Number(process.env.TOSS_TEST_PORT||4392);
const browser=await chromium.launch({channel:'chrome'});
const ctx=await browser.newContext({viewport:{width:360,height:740},isMobile:true,serviceWorkers:'block'});
ctx.setDefaultTimeout(45000);await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
const home=async p=>{await p.goto(origin);await p.locator('.world-entry-ggulggul').click();};
const open=async(p,label)=>{await home(p);await p.getByRole('button',{name:/^사주 리포트/}).click();await p.getByRole('button',{name:label,exact:true}).click();};
try{
 let p=await ctx.newPage();p.on('pageerror',e=>console.error(e.message));
 await open(p,'사주 가디언');await p.locator('.toss-compat img').evaluate(i=>i.decode());
 await p.getByRole('link',{name:'토스로 로그인하기'}).click();await p.getByRole('button',{name:'토스로 로그인하기'}).click();
 await p.getByLabel('상담할 프로필').selectOption('mock-profile');await p.getByRole('button',{name:'토스로 사주 가디언 열기'}).click();
 await p.waitForURL('**/*intentId=*');const guardianUrl=p.url();
 await p.getByRole('button',{name:'영문 이미지 프롬프트 만들기'}).click();await p.getByText('[테스트 전용] mock guardian image prompt',{exact:true}).waitFor();
 assert.ok(await p.getByRole('button',{pressed:false}).count()>0);
 await open(p,'시빌라 연간 대비 리포트');await p.getByRole('link',{name:/심층 리포트 열기/}).click();
 await p.getByLabel('상담할 프로필').selectOption('mock-profile');await p.getByRole('button',{name:'토스로 시빌라 심층 리포트 열기'}).click();
 await p.waitForURL('**/*intentId=*');const sibylUrl=p.url();
 await p.waitForFunction(()=>JSON.parse(localStorage.getItem('toss-offline-fixture')).intents.some(([,v])=>v.service==='sibyl'&&Object.values(v.waves||{}).includes(1)));
 await p.close();p=await ctx.newPage();await home(p);await p.getByRole('link',{name:'꿀꿀운세 구매 기록'}).click();
 await p.locator('article').filter({hasText:'시빌라'}).getByRole('link').last().click();
 await p.getByRole('heading',{name:'모의 상담 10장',exact:true}).waitFor();
 const current=Number(await p.getByLabel('리포트 연도').inputValue());
 await p.getByLabel('리포트 연도').selectOption(String(current+1));
 await p.getByText('[테스트 전용] '+(current+1)+'년 10장 원문',{exact:true}).waitFor();
 await p.getByLabel('리포트 연도').selectOption(String(current));await p.getByText('[테스트 전용] '+current+'년 10장 원문',{exact:true}).waitFor();
 await p.reload();await p.getByRole('heading',{name:'모의 상담 10장'}).waitFor();
 const store=await p.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-fixture')));
 assert.equal(store.orders.length,2);assert.deepEqual(Object.values(store.intents.find(([,v])=>v.service==='sibyl')[1].waves),[2,2]);
 await p.goto(origin);await p.getByRole('button',{name:'내 정보',exact:true}).click();await p.getByRole('button',{name:'로그아웃',exact:true}).click();await p.getByText('로그아웃했어요.').waitFor();
 await p.evaluate(()=>localStorage.setItem('toss-offline-login-person','second'));
 await p.goto(origin+'/login/?next=/records/');await p.getByRole('button',{name:'토스로 로그인하기'}).click();
 await p.waitForFunction(()=>JSON.parse(localStorage.getItem('toss-offline-fixture-2')||'{}').loggedIn===true);
 for(const url of [sibylUrl,guardianUrl]){await p.goto(url);await p.getByRole('heading',{name:'구매 기록 확인'}).waitFor();await p.waitForLoadState('networkidle');assert.equal(await p.locator('.toss-compat').count(),0);}
 console.log('PASS 360px normal home, two separately priced mock products, owned Guardian original card and prompt, two Sibyl years from one right, interrupted generation and both foreign URLs denied.');
}catch(e){for(const p of ctx.pages())console.error(p.url(),(await p.locator('body').innerText()).slice(-900));throw e;}finally{await browser.close();}
