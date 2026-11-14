import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {nativeHome,startNativeReport,nativeReportText} from './private-native-report-steps.mjs';

export async function verifyNativeReports(origin,context,key=process.argv[process.argv.indexOf('--native-report')+1]){
 const fresh=async()=>{const page=await context.newPage();page.setDefaultTimeout(45000);return page;};
 const ledger=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')));
 let page=await fresh();const text=nativeReportText(key);
 const reveal=async()=>{if(key==='guardian')await page.getByRole('button',{name:'영문 이미지 프롬프트 만들기'}).click();await page.getByText(text,{exact:false}).first().waitFor();};
 try{
  await startNativeReport(page,origin,key);
  const purchase=await ledger(page),id=purchase.intents[0][0];
  // Close the document as soon as the grant is durable. A saved partial report
  // must resume from the regular home archive without a second order.
  await page.close();page=await fresh();await nativeHome(page,origin);
  await page.getByRole('link',{name:'꿀꿀운세 구매 기록'}).click();await page.locator('article a[href*="'+id+'"]').last().click();
  await reveal();
  if(key.startsWith('codex')){
   assert.equal(await page.getByText(/50,000원|30,000원/).count(),0,'web prices must not appear on Toss reports');
   const portrait=page.getByRole('img',{name:'명식과 명반을 살피는 인연의 서 상담사'});
   await portrait.scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>{const img=document.querySelector('#master-love-codex-document header img');return img?.complete&&img.naturalWidth>0;});
   await page.getByText(text,{exact:false}).first().scrollIntoViewIfNeeded();
   await page.waitForFunction(text=>{const el=[...document.querySelectorAll('p')].find(el=>el.textContent.includes(text));if(!el)return false;for(let parent=el;parent;parent=parent.parentElement)if(Number(getComputedStyle(parent).opacity)<0.99)return false;return true;},text);
   if(process.env.TOSS_CAPTURE_DIR){await mkdir(process.env.TOSS_CAPTURE_DIR,{recursive:true});await page.screenshot({path:join(process.env.TOSS_CAPTURE_DIR,'native-'+key+'-reading.png')});}
   await page.waitForFunction(()=>[...document.querySelectorAll('[data-codex-chapter]')].some(el=>{const r=el.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;}));
  }
  const ownedUrl=page.url();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(key==='sibyl'){
   const current=Number(await page.getByLabel('리포트 연도').inputValue());await page.getByLabel('리포트 연도').selectOption(String(current+1));
   await page.getByText('[테스트 전용] '+(current+1)+'년 10장 원문',{exact:true}).waitFor();
  }
  if(process.env.TOSS_CAPTURE_DIR){await mkdir(process.env.TOSS_CAPTURE_DIR,{recursive:true});await page.screenshot({path:join(process.env.TOSS_CAPTURE_DIR,'native-'+key+'-result.png'),fullPage:true});}
  const saved=await ledger(page),row=saved.intents[0][1];assert.equal(saved.orders.length,1);assert.equal(saved.intents.length,1);
  if(key==='sibyl')assert.deepEqual(Object.values(row.waves),[2,2]);else assert.equal(row.generationCount??row.generations,1);
  if(key==='palm')assert.doesNotMatch(JSON.stringify(saved),/data:image|HandLandmarks|LineCandidates/);
  await page.reload();await reveal();assert.deepEqual(await ledger(page),saved);
  await Promise.all([page.waitForEvent('load'),page.getByLabel('모의 계정',{exact:true}).selectOption('B')]);
  await nativeHome(page,origin);await page.getByRole('searchbox').fill('정신분석 해몽');await page.locator('.directory-list button').filter({hasText:'정신분석 해몽'}).first().click();
  await page.locator('a[href*="/login/"]').first().click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();
  await page.getByLabel('기억나는 꿈의 장면').waitFor();await page.goto(ownedUrl);
  await page.getByText(/구매 기록 확인|불러오지 못|열 수 없|찾을 수 없|확인하지 못/).first().waitFor();
  assert.equal(await page.getByText(text,{exact:false}).count(),0);assert.equal((await ledger(page)).orders.length,0);
  console.log('PASS native report',key,'360px home, mock purchase, generation exit, archive reopen, one order, owner B denied');
 }catch(error){console.error(key,page.url(),(await page.locator('body').innerText()).slice(-1800));throw error;}
}
