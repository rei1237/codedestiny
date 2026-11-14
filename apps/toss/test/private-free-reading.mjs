import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
export async function verifyFreeReading(origin,context){
 let page=await context.newPage();page.setDefaultTimeout(25000);
 const directory=async(title)=>{await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('searchbox').fill(title);await page.locator('.directory-list button').filter({hasText:title}).first().click();};
 const capture=async(name)=>{for(const width of [360,390,430]){await page.setViewportSize({width,height:740});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));if(process.env.TOSS_CAPTURE_DIR){await mkdir(process.env.TOSS_CAPTURE_DIR,{recursive:true});await page.screenshot({path:join(process.env.TOSS_CAPTURE_DIR,name+'-'+width+'.png')});}}};
 try{
  await directory('연이의 운명 노벨');await page.locator('button.record').first().click();await page.getByRole('button',{name:'다음 쪽',exact:true}).click();
  const title=await page.locator('article h1').innerText();await capture('novel-bookmark');
  await page.close();page=await context.newPage();page.setDefaultTimeout(25000);
  await directory('연이의 운명 노벨');await page.getByRole('button',{name:'읽던 곳부터 이어보기'}).click();assert.equal(await page.locator('article h1').innerText(),title);assert.match(await page.locator('article .muted').innerText(),/^2 \/ /);
  await directory('심리테스트');await page.locator('.psy-editorial').scrollIntoViewIfNeeded();await capture('psychotest-guide');
  await page.locator('.psy-editorial a[href="/psychotest/hsp/"]').click();await page.getByRole('button',{name:'무료로 시작하기'}).click();
  for(let i=0;i<40&&!await page.locator('.psy-result-host').count();i++)await page.locator('.opt-btn').first().click();
  await page.locator('.psy-result-host').waitFor();const result=await page.locator('.psy-result-host').innerText();await capture('psychotest-result');
  await page.goBack();await page.locator('.psy-editorial a[href="/psychotest/hsp/"]').click();await page.locator('.psy-result-host').waitFor();assert.equal(await page.locator('.psy-result-host').innerText(),result);
  await directory('유명인 사주');await page.getByRole('button',{name:'60일주',exact:true}).click();await page.getByRole('button',{name:'갑자',exact:true}).click();await page.getByRole('button',{name:'갑자일주 해설과 계산 후보 읽기'}).click();await page.getByRole('heading',{name:'갑자일주',exact:true}).waitFor();await capture('famous-cycle');await page.locator('details summary').click();await page.locator('button.record').first().click();const famousTitle=await page.locator('article h1').innerText();await page.getByRole('heading',{name:'세 체계로 본 명식'}).waitFor();await capture('famous-detail');await page.reload();assert.equal(await page.locator('article h1').innerText(),famousTitle);
  const ledger=await page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')));assert.equal(ledger?.orders?.length||0,0);
  console.log('PASS free AIT home → novel persistent bookmark; home → psychotest recommendation → original answers/result → same-session reopen; 360/390/430px; zero orders');
 }finally{await page.close();}
}
