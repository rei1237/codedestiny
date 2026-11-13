// Start dev:offline on a loopback port before running this test.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='http://127.0.0.1:'+Number(process.env.TOSS_TEST_PORT||4329);
const browser=await chromium.launch({channel:'chrome'});
const context=await browser.newContext({viewport:{width:360,height:740},isMobile:true,reducedMotion:'reduce',serviceWorkers:'block'});
await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
context.setDefaultTimeout(120000);
const question='새 직무에서 무엇을 먼저 준비할까요?';
const text='[테스트 전용] 찻집에서 저장한 결과 원문입니다.';
const button=(page,name)=>page.getByRole('button',{name,exact:true});
async function home(page){
  await page.goto(origin);
  await page.locator('.world-entry-ggulggul').click();
}
async function tea(page){
  await home(page);
  await page.getByRole('button',{name:/연이 · 운명의 찻집/}).click();
  await page.getByRole('link',{name:'계정',exact:true}).click();
  await button(page,'토스로 로그인하기').click();
  await button(page,'이 상담 시작하기').first().click();
  await page.locator('#fortuneTeaBirthDate').fill('19900101');
  await page.locator('#fortuneTeaBirthTimeUnknown').check();
  await page.locator('#fortuneTeaGender').selectOption({label:'여성'});
  await page.locator('#fortuneTeaBirthPlace').fill('서울');
  await button(page,'출생지 확인').click();
  await page.getByText('확인됨',{exact:true}).waitFor();
  await page.locator('#fortuneTeaQuestion').fill(question);
  await page.locator('#tea-question-category').selectOption({label:'직업·진로'});
  await button(page,'상담 내용과 가격 확인').click();
  await page.locator('strong').filter({hasText:'1원'}).first().waitFor();
  await button(page,'상담 시작하기').click();
}
async function stored(page,service){
  return page.evaluate(service=>{
    const data=JSON.parse(localStorage.getItem('toss-offline-fixture'));
    const rows=data.intents.map(([,row])=>row).filter(row=>row.service===service);
    return [rows.length,data.orders.length,rows[0]?.generationCount,rows[0]?.result];
  },service);
}
try{
  const page=await context.newPage();
  await tea(page);
  await page.getByText(text,{exact:true}).first().waitFor();
  const saved=await stored(page,'tea');
  assert.deepEqual(saved.slice(0,3),[1,1,1]);
  await page.close();
  const reopened=await context.newPage();
  await home(reopened);
  await reopened.getByRole('link',{name:'꿀꿀운세 구매 기록'}).click();
  await reopened.locator('article').filter({hasText:question}).getByRole('link',{name:'다시 보기'}).click();
  await reopened.getByText(text,{exact:true}).first().waitFor();
  await reopened.reload();
  await reopened.getByText(text,{exact:true}).first().waitFor();
  assert.deepEqual(await stored(reopened,'tea'),saved);
  console.log('PASS 찻집 원본 사주 입력 → 가상 단건 → 원문 → 앱 재진입 → 꿀꿀운세 구매 기록 → 같은 원문. 주문 1, 생성 1.');
}finally{await browser.close();}
