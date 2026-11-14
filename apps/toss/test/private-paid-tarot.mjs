import assert from 'node:assert/strict';
import {privateTarotUuid} from '../private-simulation/tarot-links.mjs';
const cases={oracle:{title:'타로 오라클 상담',count:12},celestial:{title:'천체의 선율',count:11},relationship:{title:'우리는 무슨 사이?',count:6},mindscan:{title:'말과 행동 사이 타로',count:10}};
export async function verifyPrivatePaidTarot(origin,context,key='oracle'){
 const mode=cases[key];assert.ok(mode);let page=await context.newPage();page.setDefaultTimeout(30000);
 const home=async()=>{await page.goto(origin);await page.locator('.world-entry-ggulggul').click();};
 const ledger=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')));
 try{
  await home();await page.getByRole('searchbox').fill('타로 리딩');await page.locator('.directory-list button').filter({hasText:'타로 리딩'}).first().click();await page.getByRole('button',{name:new RegExp(mode.title.replace('?','\\?'))}).click();
  if(key==='oracle')await page.getByLabel(/질문에 맞는 카드 배열/).selectOption('life-compass');
  if(key!=='celestial')await page.locator('.tarot-library textarea').fill('모의 상담 · 삶의 방향을 점검하고 싶어요.');await page.getByRole('button',{name:'카드 펼치기'}).click();
  if(key!=='celestial'){for(let i=1;i<=mode.count;i++)await page.getByRole('button',{name:i+'번째 카드',exact:true}).click();await page.getByRole('button',{name:'선택한 카드 열기'}).click();}
  await page.getByRole('button',{name:/토스 로그인하고/}).click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();await page.getByRole('button',{name:/1원 단건 리딩 시작/}).click();await page.getByRole('button',{name:'추가 결제 없이 이어서 생성'}).waitFor();
  const purchased=await ledger(),order=purchased.orders[0][0],uuid=privateTarotUuid(order);assert.equal(purchased.orders.length,1);
  await page.close();page=await context.newPage();page.setDefaultTimeout(30000);await home();await page.getByRole('link',{name:'꿀꿀운세 구매 기록'}).click();await page.locator('article a[href*="'+uuid+'"]').last().click();
  await page.getByRole('button',{name:'추가 결제 없이 이어서 생성'}).click();await page.locator('.tarot-service-sections article').first().waitFor();assert.equal(await page.locator('.tarot-service-sections article').count(),mode.count);
  const resultUrl=page.url(),saved=await ledger(),chapters=await page.locator('.tarot-service-sections article').allInnerTexts();assert.equal(saved.orders.length,1);assert.equal(saved.intents[0][1].generationCount,1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.reload();await page.locator('.tarot-service-sections article').first().waitFor();assert.deepEqual(await page.locator('.tarot-service-sections article').allInnerTexts(),chapters);assert.deepEqual(await ledger(),saved);
  await Promise.all([page.waitForEvent('load'),page.getByLabel('모의 계정',{exact:true}).selectOption('B')]);await home();await page.getByRole('searchbox').fill('정신분석 해몽');await page.locator('.directory-list button').filter({hasText:'정신분석 해몽'}).first().click();await page.locator('a[href*="/login/"]').first().click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();await page.getByLabel('기억나는 꿈의 장면').waitFor();await page.goto(resultUrl);await page.getByText(/구매 기록 확인|진행 상태 확인하기|구매 내역에서|찾을 수 없|기록을 확인/).first().waitFor();assert.equal(await page.locator('.tarot-service-sections article').count(),0);assert.equal((await ledger()).orders.length,0);
  console.log('PASS private '+key+': home, selected original cards, mock login/purchase, exit/reopen, saved chapters, one order/generation, foreign UUID denied');
 }catch(error){console.error(key,page.url(),(await page.locator('body').innerText()).slice(-1800));throw error;}
}
