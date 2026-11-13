import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='http://127.0.0.1:'+Number(process.env.TOSS_TEST_PORT||4329);
const browser=await chromium.launch({channel:'chrome'});
const ctx=await browser.newContext({viewport:{width:360,height:740},isMobile:true,serviceWorkers:'block'});
ctx.setDefaultTimeout(45000);
await ctx.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
async function home(page){await page.goto(origin);await page.locator('.world-entry-ggulggul').click();}
async function enter(page){await home(page);await page.getByRole('button',{name:'마스터 인연의 서',exact:true}).click();}
async function login(page){await page.getByRole('link',{name:'토스로 로그인하기'}).click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();}
try{
 const links=[];let page=await ctx.newPage();page.on('pageerror',e=>console.error(e.message));
 for(const mode of ['solo','compat']){
  await enter(page);if(mode==='solo')await login(page);
  await page.getByRole('button',{name:'여성',exact:true}).first().click();
  await page.locator('#codex-birth-date').fill('19900101');await page.getByLabel('태어난 시각을 모릅니다',{exact:true}).check();
  await page.locator('#codex-question-0').fill(mode==='solo'?'어떤 만남을 기대할 수 있을까요?':'서로 다른 대화 방식을 어떻게 조율할까요?');
  if(mode==='compat'){await page.getByRole('button',{name:'상대와의 궁합으로 읽기'}).click();await page.locator('#codex-partner-birth-date').fill('19920202');}
  await page.reload();assert.equal(await page.locator('#codex-birth-date').inputValue(),'1990-01-01');
  await page.getByRole('button',{name:/1원.*결과 보기/}).click();
  await page.waitForFunction(mode=>JSON.parse(localStorage.getItem('toss-offline-fixture')).intents.some(([,r])=>r.input.mode===mode&&r.progress===1),mode);
  const href=page.url();links.push(href);await page.close();page=await ctx.newPage();
  const label='마스터 인연의 서 · '+(mode==='compat'?'궁합':'개인');
  await home(page);await page.getByRole('link',{name:'꿀꿀운세 구매 기록'}).click();
  await page.locator('article').filter({hasText:label}).getByRole('link').last().click();
  const body='[테스트 전용] '+(mode==='compat'?'궁합판':'개인판')+'에 저장된 인연의 서 원문입니다.';
  await page.getByText(body,{exact:true}).first().waitFor();assert.equal(page.url(),href);
  await page.reload();await page.getByText(body,{exact:true}).first().waitFor();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 }
 const tally=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('toss-offline-fixture'));return [s.orders.length,s.intents.map(([,r])=>[r.featureKey,r.generationCount])];});
 assert.deepEqual(tally,[2,[['master-love-codex',1],['master-love-codex-compat',1]]]);
 await page.goto(origin);await page.getByRole('button',{name:'내 정보',exact:true}).click();await page.getByRole('button',{name:'로그아웃',exact:true}).click();await page.getByText('로그아웃했어요.').waitFor();
 await page.evaluate(()=>localStorage.setItem('toss-offline-login-person','second'));await enter(page);await login(page);
 await page.waitForURL('**/master-love-codex/');await page.getByRole('button',{name:'여성',exact:true}).first().waitFor();
 assert.equal(await page.locator('#codex-birth-date').inputValue(),'');
 for(const href of links){await page.goto(href);await page.getByRole('heading',{name:'구매 기록 확인'}).waitFor();await page.waitForLoadState('networkidle');assert.equal(await page.getByText(/저장된 인연의 서 원문/).count(),0);}
 console.log('PASS 개인·궁합 각각 원본 입력, 다른 가상 SKU, 종료·재열람, 회당 한 번 생성, 다른 계정 차단');
}catch(error){for(const p of ctx.pages())console.error(p.url(),(await p.locator('body').innerText()).slice(-1400));throw error;}finally{await browser.close();}
