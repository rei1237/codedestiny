import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const titles={'ziwei-deep':'자미두수 명반',compass:'운명의 나침반',yoga:'디비야 요가',nakshatra:'나크샤트라 개인 심화 상담'};
async function home(page,origin,key){await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('searchbox').fill(titles[key]);await page.locator('.directory-list button').filter({hasText:titles[key]}).first().click();}
async function login(page,label){await page.getByRole('button',{name:label}).click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();}
export async function verifyExtendedReport(origin,context,key){
 assert.ok(titles[key]);let page=await context.newPage();page.setDefaultTimeout(45000);await page.emulateMedia({reducedMotion:'reduce'});
 page.on('response',async response=>{if(response.status()>=400&&response.url().includes('/private-simulation-api/'))console.error('private response',response.status(),response.url(),await response.text());});
 const ledger=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')));
 try{
  await home(page,origin,key);
  if(key==='ziwei-deep'){
   await page.getByLabel('태어난 날짜').fill('1991-05-12');await page.getByLabel('태어난 시각',{exact:true}).fill('14:10');await page.getByLabel('계산에 사용하는 성별').selectOption('F');await page.getByLabel('출생 도시').selectOption({index:1});await page.getByRole('button',{name:'명반 펼치기'}).click();
   await page.getByLabel('관심 분야').selectOption('custom');await page.getByLabel('궁금한 질문').fill('이직 준비에서 먼저 살펴볼 것은 무엇인가요');await login(page,/토스 로그인하고 심층/);await page.getByRole('button',{name:/심층 리포트 열기/}).click();
  }else if(key==='yoga'){
   await login(page,'토스 로그인하고 수련 입력하기');await page.getByLabel('오늘의 몸과 마음').fill('모의 수련 · 마음을 차분하게 정리하고 싶어요');await page.getByRole('radio',{name:/30분/}).check();await page.getByRole('button',{name:'나의 수련 코스 만들기'}).click();
  }else if(key==='nakshatra'){
   await login(page,'토스 로그인하고 상담 입력하기');const form=page.getByRole('group',{name:'나의 출생 정보'});await form.getByLabel('양력 생년월일').fill('1990-05-12');await form.getByLabel('태어난 시각을 몰라요').check();await form.getByLabel('태어난 도시와 국가').selectOption('서울, 한국');await page.getByLabel('상담에서 묻고 싶은 질문 (선택)').fill('모의 질문 · 나와 잘 맞는 일의 환경은 무엇일까요?');await page.getByRole('button',{name:'두 별 통합 상담 시작하기'}).click();
  }else{
   await page.locator('#compass-birth-date').fill('19900512');await page.locator('#compass-gender').selectOption('female');await page.getByRole('checkbox').first().check();await page.getByRole('button',{name:'이 정보로 나침반 맞추기'}).click();const question=page.locator('input[maxlength]').first();await question.fill('이직을 위해 지금 준비할 일은 무엇인가요');await question.press('Enter');await page.getByRole('button',{name:/결과 확인하기/}).click({timeout:60000});await page.locator('[data-section="coordinate"] h1').waitFor();
   await page.getByRole('button',{name:/심층 리포트/}).click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();await page.getByRole('button',{name:/심층 리포트 열기/}).click();
  }
  await page.waitForURL(url=>url.searchParams.has('resultId'));const owned=page.url(),id=new URL(owned).searchParams.get('resultId');assert.equal((await ledger()).orders.length,1);
  await page.close();page=await context.newPage();page.setDefaultTimeout(45000);await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('link',{name:'꿀꿀운세 구매 기록'}).click();await page.locator('article a[href*="'+id+'"]').last().click();
  const done=async()=>{if(key==='yoga')await page.frameLocator('iframe[title="단계별 수련 지도"]').getByText('테스트 전용 30분 수련',{exact:true}).waitFor();else await page.getByText(key==='ziwei-deep'?'15 / 15개 장 저장':key==='compass'?'10 / 10개 장 저장':'오프라인 테스트 원문 · 마지막 별의 문장',{exact:true}).waitFor();};
  await done();
  if(key==='nakshatra'){assert.equal(await page.locator('main main').count(),0);assert.equal(await page.locator('[class*="_reader_"]').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(9, 8, 23)');}
  const saved=await ledger();assert.equal(saved.orders.length,1);assert.equal(saved.intents[0][1].generationCount,1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(process.env.TOSS_CAPTURE_DIR){await mkdir(process.env.TOSS_CAPTURE_DIR,{recursive:true});await page.screenshot({path:join(process.env.TOSS_CAPTURE_DIR,'extended-'+key+'.png'),fullPage:true});}
  await page.reload();await done();assert.deepEqual(await ledger(),saved);
  await Promise.all([page.waitForEvent('load'),page.getByLabel('모의 계정',{exact:true}).selectOption('B')]);await home(page,origin,'yoga');await login(page,'토스 로그인하고 수련 입력하기');await page.getByLabel('오늘의 몸과 마음').waitFor();await page.goto(owned);await page.getByRole('heading',{name:'구매 기록 확인'}).waitFor();assert.equal((await ledger()).orders.length,0);
  console.log('PASS extended '+key+': home, mock purchase, interrupted generation, records restart, exact stored reread, one order/generation, owner B denied');
 }catch(error){console.error(key,page.url(),(await page.locator('body').innerText()).slice(-1800));throw error;}
}
