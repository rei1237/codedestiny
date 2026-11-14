import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
export async function verifyPrivateMusic(origin,context){
 let page=await context.newPage();page.setDefaultTimeout(25000);
 const capture=async name=>{if(process.env.TOSS_CAPTURE_DIR){await mkdir(process.env.TOSS_CAPTURE_DIR,{recursive:true});await page.screenshot({path:join(process.env.TOSS_CAPTURE_DIR,name+'.png'),fullPage:true});}};
 const home=async()=>{await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('searchbox').fill('음악');await page.locator('.directory-list button').filter({hasText:'음악'}).first().click();};
 try{
  await home();await page.locator('button.record').first().click();await page.getByRole('link',{name:'토스 로그인하기',exact:true}).click();await page.getByRole('button',{name:'토스로 로그인하기',exact:true}).click();await page.getByRole('button',{name:'단건 결제로 다운로드 열기',exact:true}).click();await page.getByRole('button',{name:'MP3 파일 저장하기',exact:true}).waitFor();
  await capture('music-owned-download');const ownedUrl=page.url();await page.getByRole('button',{name:'MP3 파일 저장하기',exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('private-file-saves')||'[]').length===1);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')));assert.equal(saved.orders.length,1);const title=saved.intents.find(([,row])=>row.service==='music')[1].track.title;
  await page.close();page=await context.newPage();await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('link',{name:'꿀꿀운세 구매 기록',exact:true}).click();await page.locator('article').filter({hasText:title}).getByRole('link',{name:'다시 보기'}).click();await page.getByRole('button',{name:'MP3 파일 저장하기',exact:true}).waitFor();await page.reload();await page.getByRole('button',{name:'MP3 파일 저장하기',exact:true}).waitFor();assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('consultations'))),saved);
  for(const width of [360,390,430]){await page.setViewportSize({width,height:740});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  await Promise.all([page.waitForEvent('load'),page.getByLabel('모의 계정',{exact:true}).selectOption('B')]);await home();await page.locator('button.record').first().click();await page.getByRole('link',{name:'토스 로그인하기',exact:true}).click();await page.getByRole('button',{name:'토스로 로그인하기',exact:true}).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('consultations')||'{}').loggedIn===true);await page.goto(ownedUrl);await page.getByRole('heading',{name:'구매 기록 확인',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'MP3 파일 저장하기',exact:true}).count(),0);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('private-file-saves')||'[]').length),0);
  console.log('PASS private music home, one mock purchase, synthetic native save request, cold same-owner archive, B denial, 3 widths, no real audio download');
 }catch(error){console.error(page.url(),(await page.locator('body').innerText()).slice(-1600));throw error;}finally{await page.close();}
}
