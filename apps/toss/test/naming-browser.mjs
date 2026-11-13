import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='http://127.0.0.1:'+Number(process.env.TOSS_TEST_PORT||4329);
const browser=await chromium.launch({channel:'chrome'});
const context=await browser.newContext({viewport:{width:360,height:740},isMobile:true,serviceWorkers:'block'});
context.setDefaultTimeout(45000);
await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
async function home(page){await page.goto(origin);await page.locator('.world-entry-ggulggul').click();}
async function enter(page){await home(page);await page.getByRole('button',{name:'사주 작명첩'}).click();}
async function login(page){await page.getByRole('link',{name:'토스로 로그인하기'}).click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();}
async function birth(page){
  await page.getByRole('combobox',{name:/^성별/}).selectOption('F');
  await page.getByLabel('생년월일',{exact:true}).fill('19900101');
  await page.getByLabel('출생시간 모름',{exact:true}).check();
  await page.getByRole('button',{name:'다음 · 성씨와 이름 조건'}).click();
  await page.getByPlaceholder('예: 김',{exact:true}).fill('김');
  await page.getByRole('heading',{name:'무료 초안 추천'}).waitFor();
}
try{
  const p=await context.newPage();p.on('pageerror',e=>console.error(e.message));
  await enter(p);await birth(p);
  await p.getByRole('button',{name:/^金/}).first().click();
  await p.getByRole('button',{name:'무료로 5개 이름 보기'}).click();
  await p.getByText(/유료 작명서에는 후보 12개/).waitFor();
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-fixture')||'{}').orders?.length||0),0);
  await login(p);await p.getByPlaceholder('예: 김',{exact:true}).waitFor();
  assert.equal(await p.getByPlaceholder('예: 김',{exact:true}).inputValue(),'김');
  await p.reload();await p.getByRole('button',{name:'토스로 작명첩 열기'}).click();
  await p.waitForFunction(()=>JSON.parse(localStorage.getItem('toss-offline-fixture')).intents?.[0]?.[1]?.progress===1);
  const href=p.url();await p.close();
  const again=await context.newPage();await home(again);
  await again.getByRole('link',{name:'꿀꿀운세 구매 기록'}).click();
  await again.locator('article').filter({hasText:'김 작명첩'}).getByRole('link').last().click();
  const body='[테스트 전용] 저장된 작명 상담 원문입니다.';
  await again.getByText(body,{exact:true}).first().waitFor();
  assert.equal(again.url(),href);await again.reload();await again.getByText(body,{exact:true}).first().waitFor();
  assert.deepEqual(await again.evaluate(()=>{const s=JSON.parse(localStorage.getItem('toss-offline-fixture'));return [s.orders.length,s.intents.length,s.intents[0][1].generationCount];}),[1,1,1]);
  await again.goto(origin);await again.getByRole('button',{name:'내 정보',exact:true}).click();await again.getByRole('button',{name:'로그아웃',exact:true}).click();await again.getByText('로그아웃했어요.').waitFor();
  await again.evaluate(()=>localStorage.setItem('toss-offline-login-person','second'));
  await enter(again);await login(again);await again.waitForFunction(()=>JSON.parse(localStorage.getItem('toss-offline-fixture-2')||'{}').loggedIn===true);
  await again.goto(href);await again.getByRole('heading',{name:'구매 기록 확인'}).waitFor();await again.waitForLoadState('networkidle');assert.equal(await again.getByText(body,{exact:true}).count(),0);
  console.log('PASS 게스트 작명 초안, 출생·선호 입력, 가상구매, 생성 중 이탈·기록 재개, 동일 보관 원문, 다른 계정 차단');
}catch(error){for(const p of context.pages())console.error(p.url(),(await p.locator('body').innerText()).slice(-1200));throw error;}finally{await browser.close();}
