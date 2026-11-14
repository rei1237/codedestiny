// Start dev:offline on a loopback port before running this test.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='http://127.0.0.1:'+Number(process.env.TOSS_TEST_PORT||4329);
const browser=await chromium.launch({channel:'chrome'});
const context=await browser.newContext({viewport:{width:360,height:740},isMobile:true,reducedMotion:'reduce',serviceWorkers:'block'});
await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
context.setDefaultTimeout(120000);
import {teaQuestion,neoQuestion,home,tea,neo,follow} from './character-room-steps.mjs';
async function stored(page,service){
  return page.evaluate(service=>{
    const data=JSON.parse(localStorage.getItem('toss-offline-fixture'));
    const rows=data.intents.map(([,row])=>row).filter(row=>row.service===service);
    return [rows.length,data.orders.length,rows[0]?.generationCount,rows[0]?.result];
  },service);
}
try{
  const page=await context.newPage();
  const service=process.argv[2]||'tea';
  assert.ok(['tea','neo'].includes(service));
  const isTea=service==='tea';
  const text=isTea?'[테스트 전용] 찻집에서 저장한 결과 원문입니다.':'[테스트 전용] 네오가 저장한 브리핑 원문입니다.';
  const question=isTea?teaQuestion:neoQuestion;
  await (isTea?tea:neo)(page,origin);
  await page.getByText(text,{exact:true}).first().waitFor();
  const followText=await follow(page,isTea);
  const saved=await stored(page,service);
  assert.deepEqual(saved.slice(0,3),[1,1,1]);
  await page.close();
  const reopened=await context.newPage();
  await home(reopened,origin);
  await reopened.getByRole('link',{name:'꿀꿀운세 구매 기록'}).click();
  await reopened.locator('article').filter({hasText:question}).getByRole('link',{name:'다시 보기'}).click();
  await reopened.getByText(text,{exact:true}).first().waitFor();
  await reopened.reload();
  await reopened.getByText(followText,{exact:true}).first().waitFor();
  assert.deepEqual(await stored(reopened,service),saved);
  console.log('PASS',service,'원본 사주 입력 → 가상 단건 → 원문 → 앱 재진입 → 꿀꿀운세 구매 기록 → 같은 원문. 주문 1, 생성 1.');
}finally{await browser.close();}
