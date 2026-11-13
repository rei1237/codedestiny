import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='http://127.0.0.1:'+Number(process.env.TOSS_TEST_PORT||4329);
const browser=await chromium.launch({channel:'chrome'});
const context=await browser.newContext({viewport:{width:360,height:740},isMobile:true,serviceWorkers:'block'});
context.setDefaultTimeout(90000);
await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
const dream='바닷가에서 오래된 열쇠를 주웠어요.';
const saved='[테스트 전용] 꿈의 저장된 해석 1입니다.';
async function home(p){await p.goto(origin);await p.locator('.world-entry-ggulggul').click();}
async function login(p){
  await home(p);await p.getByRole('button',{name:'정신분석 해몽'}).click();
  await p.getByRole('link',{name:'토스로 로그인하기'}).click();
  await p.getByRole('button',{name:'토스로 로그인하기'}).click();
  await p.getByLabel('기억나는 꿈의 장면').waitFor();
}
try{
  const p=await context.newPage();await login(p);
  await p.getByLabel('기억나는 꿈의 장면').fill(dream);
  await p.reload();
  assert.equal(await p.getByLabel('기억나는 꿈의 장면').inputValue(),dream);
  await p.getByRole('button',{name:'꿈 상담 시작하기'}).click();
  await p.getByText('1 / 2부분 저장').waitFor();
  const href=p.url();await p.close();
  const again=await context.newPage();await home(again);
  await again.getByRole('link',{name:'꿀꿀운세 구매 기록'}).click();
  await again.locator('article').filter({hasText:dream}).getByRole('link').last().click();
  await again.getByText(saved,{exact:true}).waitFor();
  assert.equal(again.url(),href);
  await again.reload();
  await again.getByText(saved,{exact:true}).waitFor();
  assert.deepEqual(await again.evaluate(()=>{const s=JSON.parse(localStorage.getItem('toss-offline-fixture'));return [s.orders.length,s.intents.length,s.intents[0][1].generationCount];}),[1,1,1]);
  await again.goto(origin);await again.getByRole('button',{name:'내 정보',exact:true}).click();
  await again.getByRole('button',{name:'로그아웃',exact:true}).click();
  await again.getByText('로그아웃했어요.').waitFor();
  await again.evaluate(()=>localStorage.setItem('toss-offline-login-person','second'));
  await login(again);await again.goto(href);
  await again.getByRole('heading',{name:'구매 기록 확인'}).waitFor();
  await again.waitForLoadState('networkidle');
  assert.equal(await again.getByText(saved,{exact:true}).count(),0);
  console.log('PASS 꿈 입력 복원, 모의 구매, 장 저장 후 이탈, 구매기록에서 같은 원문·1회 생성, 다른 계정 차단');
}finally{await browser.close();}
