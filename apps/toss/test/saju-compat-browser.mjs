import assert from 'node:assert/strict';
import {normalizeSajuCompatInput} from '../../../worker/lib/saju-compat-schema.js';
import {chromium} from 'playwright';
const origin='http://127.0.0.1:'+Number(process.env.TOSS_TEST_PORT||4329);
const browser=await chromium.launch({channel:'chrome'});
const ctx=await browser.newContext({viewport:{width:360,height:740},isMobile:true,serviceWorkers:'block'});
ctx.setDefaultTimeout(60000);
await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
const home=async p=>{await p.goto(origin);await p.locator('.world-entry-ggulggul').click();};
const order=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-fixture')).intents.find(([,v])=>v.service==='saju-compat')?.[1]);
try{
 const p=await ctx.newPage();p.on('pageerror',e=>console.error(e.message));await home(p);await p.getByRole('button',{name:/^사주 리포트/}).click();await p.getByRole('button',{name:'두 사람의 사주 궁합'}).click();
 await p.locator('.toss-compat img').first().evaluate(i=>i.decode());
 for(const [group,date,gender] of [['나의 출생정보','1990-08-20','F'],['상대의 출생정보','1989-05-06','M']]){
  const area=p.getByRole('group',{name:group});await area.getByLabel('태어난 날짜').fill(date);await area.getByLabel('출생 도시').selectOption('서울');
  if(gender==='F')await area.getByRole('checkbox').check();else await area.getByLabel('태어난 시각',{exact:true}).fill('00:00');
 }
 await p.getByLabel('상대의 이름이나 호칭').fill('달빛');await p.getByLabel('관계 유형').selectOption('friend');
 await p.getByRole('link',{name:'토스로 로그인하기'}).click();await p.getByRole('button',{name:'토스로 로그인하기'}).click();
 assert.equal(await p.getByLabel('상대의 이름이나 호칭').inputValue(),'달빛');await p.getByRole('button',{name:'토스로 궁합 열기'}).click();
 await p.waitForURL('**/*intentId=*');const href=p.url();
 await p.waitForFunction(()=>JSON.parse(localStorage.getItem('toss-offline-fixture')).intents.some(([,v])=>v.service==='saju-compat'&&v.parts?.length===1));
 await p.close();const again=await ctx.newPage();await home(again);await again.getByRole('link',{name:'꿀꿀운세 구매 기록'}).click();
 await again.locator('article').filter({hasText:'달빛'}).getByRole('link').last().click();
 await again.locator('.cd-compat-snap').waitFor();const text=await again.locator('.cd-compat-snap').innerText();
 assert.ok(text.includes('달빛'));assert.ok(text.includes('[테스트 전용]'));assert.ok(text.length>100);
 const row=await order(again);assert.equal(normalizeSajuCompatInput(row.input).compatType,'friend');assert.equal(row.generations,1);assert.equal(row.input.self.birthTimeUnknown,true);assert.equal(row.input.partner.birthTimeUnknown,undefined);
 await again.reload();await again.locator('.cd-compat-snap').waitFor();assert.equal(await again.locator('.cd-compat-snap').innerText(),text);
 assert.equal(await again.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-fixture')).orders.length),1);
 await again.goto(origin);await again.getByRole('button',{name:'내 정보',exact:true}).click();await again.getByRole('button',{name:'로그아웃',exact:true}).click();await again.getByText('로그아웃했어요.').waitFor();
 await again.evaluate(()=>localStorage.setItem('toss-offline-login-person','second'));
 await again.goto(origin+'/login/?next=/records/');await again.getByRole('button',{name:'토스로 로그인하기'}).click();await again.waitForFunction(()=>JSON.parse(localStorage.getItem('toss-offline-fixture-2')||'{}').loggedIn===true);
 await again.goto(href);await again.getByRole('heading',{name:'구매 기록 확인'}).waitFor();await again.waitForLoadState('networkidle');assert.equal(await again.locator('.cd-compat-snap').count(),0);
 console.log('PASS guest→two birth charts→login restores form→one mock order→partial generation exit→owned record and exact reread→foreign URL denied');
}catch(e){for(const p of ctx.pages())console.error(p.url(),(await p.locator('body').innerText()).slice(-500));throw e;}finally{await browser.close();}
