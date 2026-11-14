import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
export async function verifyFreeCalculations(origin,context){
 const page=await context.newPage();page.setDefaultTimeout(45000);
 const open=async label=>{await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('searchbox').fill(label);await page.locator('.directory-list button').filter({hasText:label}).first().click();};
 const capture=async name=>{for(const width of [360,390,430]){await page.setViewportSize({width,height:740});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(process.env.TOSS_CAPTURE_DIR){await mkdir(process.env.TOSS_CAPTURE_DIR,{recursive:true});await page.screenshot({path:join(process.env.TOSS_CAPTURE_DIR,name+'-'+width+'.png'),fullPage:true});}}};
 try{
  await open('반려동물 사주');await page.getByRole('button',{name:/강아지/}).first().click();await page.getByRole('button',{name:/일반 \/ 모름/}).click();await page.getByLabel('이름',{exact:true}).fill('모의 구름');await page.getByLabel('생년월일').fill('2021-09-08');await page.getByRole('button',{name:'운명 읽기'}).click();await page.getByRole('heading',{name:'모의 구름',exact:true}).waitFor();await page.getByRole('heading',{name:'타고난 오행'}).waitFor();await capture('free-pet');
  await open('반려동물 사주');await page.getByRole('button',{name:/저장한 아이 보기/}).click();await page.getByRole('button',{name:/모의 구름.*오늘의 흐름 다시 보기/}).click();await page.getByRole('heading',{name:'모의 구름',exact:true}).waitFor();await page.getByRole('button',{name:/심층 리포트 보기/}).click();await page.getByRole('link',{name:'토스로 로그인하기'}).waitFor();
  console.log('PASS private free pet: guest original input/chart, saved pet reopen, paid account gate');
  await open('만세력');await page.locator('input[type=date]').fill('1990-05-15');await page.getByLabel('태어난 시각을 몰라요').check();await page.getByLabel('계산에 사용하는 성별').selectOption('F');await page.getByLabel('출생 도시').selectOption({index:1});await page.getByRole('button',{name:'명식 확인하기'}).click();await page.getByRole('heading',{name:'대운의 흐름'}).waitFor();assert.match(await page.locator('.manse-result').innerText(),/[甲乙丙丁戊己庚辛壬癸]/);
  await capture('free-manse');console.log('PASS private free manse: guest original input and canonical pillars');
  await open('타로 리딩');
  for(const [title,count] of [['재회운 등대 타로',5],['원석 소울 타로',5],['십이지신 천운 타로',12],['수비학 타로',5],['이직 운명의 카드',7]]){
   await page.getByRole('button',{name:new RegExp(title)}).click();await page.locator('textarea').fill('다가오는 선택에서 어떤 점을 살펴볼까요?');
   if(title==='수비학 타로'){await page.locator('input[type=date]').fill('1991-06-07');await page.locator('.tarot-library select').selectOption('career');}
   if(title==='원석 소울 타로')await page.locator('.tarot-library select').selectOption('rose_quartz');
   await page.getByRole('button',{name:'카드 펼치기'}).click();for(let i=0;i<count;i++)await page.locator('.tarot-deck button').nth(i).click();await page.getByRole('button',{name:'선택한 카드 열기'}).click();await page.locator('.tarot-service-sections article').first().waitFor();assert.equal(await page.locator('.tarot-result-card').count(),count);assert.ok((await page.locator('.tarot-summary p').innerText()).length>8);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await capture('free-tarot-'+title);console.log('PASS private free tarot',title,count);await page.getByRole('button',{name:'다른 질문으로 다시 보기'}).click();
  }
  const ledger=await page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')));assert.equal(ledger?.orders?.length||0,0);assert.equal(ledger?.loggedIn||false,false);
 }catch(error){console.error(page.url(),(await page.locator('body').innerText()).slice(-1600));throw error;}finally{await page.close();}
}

