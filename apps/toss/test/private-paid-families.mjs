import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
const titles={relationship:'관계 경계',sukuyo:'숙요점 궁합 전문가',pet:'반려동물 사주','pet-compat':'반려동물 사주'};
export async function verifyPaidFamily(origin,context,key){
 let page=await context.newPage();page.setDefaultTimeout(45000);await page.emulateMedia({reducedMotion:'reduce'});
 const home=async title=>{await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('searchbox').fill(title);await page.locator('.directory-list button').filter({hasText:title}).first().click();};
 const login=async()=>{await page.getByRole('link',{name:'토스로 로그인하기'}).click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();};
 const ledger=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')));
 const pet=async(name,date)=>{await page.getByRole('button',{name:/강아지/}).first().click();await page.getByRole('button',{name:/일반 \/ 모름/}).click();await page.getByLabel('이름',{exact:true}).fill(name);await page.getByLabel('생년월일',{exact:true}).fill(date);await page.getByRole('button',{name:'운명 읽기',exact:true}).click();await page.getByRole('heading',{name:'타고난 오행',exact:true}).waitFor();};
 try{
  // Login before pet input; the source clears pet drafts on account change.
  if(key.startsWith('pet')){await home(titles.sukuyo);await login();await page.locator('#self-birth-date').waitFor();}
  await home(titles[key]);
  if(key==='relationship'){
   await login();await page.locator('#target-gender').selectOption('female');await page.locator('#target-date').fill('1990-05-12');await page.getByLabel('출생 시각을 모릅니다',{exact:true}).check();await page.getByRole('button',{name:'단건 결제로 상담 시작하기',exact:true}).click();
  }else if(key==='sukuyo'){
   await login();await page.locator('#self-birth-date').fill('19900102');await page.locator('#partner-birth-date').fill('19930914');await page.getByRole('button',{name:'두 사람의 인연 읽기'}).first().click();
  }else{
   await pet('모의 첫째','2020-05-15');assert.equal((await ledger()).orders.length,0);
   if(key==='pet-compat'){await page.getByRole('button',{name:'다른 아이 살펴보기'}).click();await pet('모의 둘째','2021-03-02');await page.getByRole('button',{name:/모의 둘째.*모의 첫째 궁합 보기/}).click();await page.getByRole('button',{name:'단건 결제로 궁합 보기'}).click();}
   else{await page.getByRole('button',{name:/모의 첫째 심층 리포트 보기/}).click();await page.getByRole('button',{name:'단건 결제로 리포트 보기'}).click();}
  }
  await page.waitForURL(url=>['sessionId','cid','intentId'].some(param=>url.searchParams.has(param)));assert.equal((await ledger()).orders.length,1);const intent=(await ledger()).intents[0][1],id=intent.id;
  await page.close();page=await context.newPage();page.setDefaultTimeout(45000);
  await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('link',{name:'꿀꿀운세 구매 기록'}).click();await page.locator('article a[href*="'+id+'"]').last().click();
  const resume=page.getByRole('button',{name:key==='relationship'?'같은 상담 이어서 확인하기':'같은 결과 이어서 받기',exact:true});
  if(key!=='sukuyo')await resume.click();
  const done=()=>page.getByText(key.startsWith('pet')?'[비공개 모의 예시] 실제 상담 결과가 아닙니다.':'[테스트 전용 예시] 실제 상담 결과가 아닙니다.',{exact:false}).first().waitFor();await done();
  const owned=page.url(),saved=await ledger();assert.equal(saved.orders.length,1);assert.equal(saved.intents[0][1].generationCount,1);
  if(key==='sukuyo')assert.equal(saved.intents[0][1].result.personB.birthDate,'1993-09-14');
  if(key.startsWith('pet'))assert.equal(saved.intents[0][1].input[key==='pet'?'pet':'petA'].name,key==='pet'?'모의 첫째':'모의 둘째');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(process.env.TOSS_CAPTURE_DIR){await mkdir(process.env.TOSS_CAPTURE_DIR,{recursive:true});await page.screenshot({path:join(process.env.TOSS_CAPTURE_DIR,'paid-family-'+key+'.png'),fullPage:true});}
  await page.reload();await done();assert.deepEqual(await ledger(),saved);
  await Promise.all([page.waitForEvent('load'),page.getByLabel('모의 계정',{exact:true}).selectOption('B')]);await home(titles.sukuyo);await login();await page.locator('#self-birth-date').waitFor();await page.goto(owned);await page.getByText(/구매 기록 확인|구매 내역.*확인하지 못|상담을 확인하지 못|결과를 확인하지 못/).first().waitFor();assert.equal((await ledger()).orders.length,0);assert.equal(await page.getByText('[비공개 모의 예시] 실제 상담 결과가 아닙니다.',{exact:true}).count(),0);
  console.log('PASS '+key+': original home/input, purchase, interrupted generation, records, saved reread, account B denial');
 }catch(error){console.error(key,page.url(),(await page.locator('body').innerText()).slice(-2400));throw error;}finally{await page.close();}
}
