import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {fixtures} from './lib/yeongnyangi-mobile-payment.mjs';

const base=process.env.YEONGNYANGI_TEST_BASE||'http://127.0.0.1:18149';
assert(['127.0.0.1','localhost'].includes(new URL(base).hostname));
const output='build-cache/yeongnyangi-relationship-entry';
await mkdir(output,{recursive:true});
const compiled=await build({stdin:{contents:"export {products} from './worker/yeongnyangi/payments/catalog';",loader:'ts',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {products}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const browser=await chromium.launch({headless:true}),results=[];
const noOverflow=async page=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'no horizontal overflow');
try{
 for(const width of [360,390,430,1280]){
  const f=await fixtures(browser,base,products.find(p=>p.id==='tarot_mackerel'),width);
  f.state.products=products;
  f.state.profiles.push({profileId:'partner-profile',name:'상대 테스트',birth:{year:1991,month:3,day:12,hour:10,minute:0},location:{label:'대한민국 서울'}});
  try{
   const page=f.page;
   await page.emulateMedia({reducedMotion:'reduce'});
   await page.goto(base+'/yeongnyangi/',{waitUntil:'domcontentloaded'});
   const entry=page.getByRole('region',{name:'그 사람과 나, 어떤 이야기가 이어질까?'});
   await entry.scrollIntoViewIfNeeded();
   await entry.evaluate(el=>el.scrollIntoView({block:'start'}));
   await entry.locator('img').evaluate(img=>img.decode());
   await entry.screenshot({path:`${output}/entry-${width}.png`});
   await entry.getByRole('link',{name:'궁합 보기',exact:true}).click();
   const journey=page.getByRole('region',{name:'궁합 보기',exact:true});
   await journey.getByRole('button',{name:'그 사람 마음이 궁금해요',exact:true}).waitFor();
   await journey.screenshot({path:`${output}/questions-${width}.png`});
   await journey.getByRole('button',{name:'그 사람 마음이 궁금해요',exact:true}).click();
   const next=journey.getByRole('button',{name:'추천 상담 보기',exact:true});
   assert.equal(await next.isDisabled(),true);
   assert.equal(await page.locator(':focus').textContent(),'두 사람을 소개해 주세요');
   const self=journey.getByLabel('내 이름 또는 별칭',{exact:true}),partner=journey.getByLabel('상대 이름 또는 별칭',{exact:true});
   await self.fill('나비');assert.equal(await next.isDisabled(),true);
   await partner.fill('   ');assert.equal(await next.isDisabled(),true);
   await partner.fill('달');assert.equal(await next.isEnabled(),true);
   assert.ok(await self.evaluate(el=>parseFloat(getComputedStyle(el).fontSize)>=16));
   for(const control of [self,partner,next])assert.ok((await control.boundingBox()).height>=44);
   await self.focus();assert.notEqual(await self.evaluate(el=>getComputedStyle(el).outlineStyle),'none');
   assert.equal(await next.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(229, 197, 142)','primary uses night gold');
   assert.equal(await journey.getByRole('button',{name:'이전 단계',exact:true}).evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)','back remains secondary');
   for(const img of await journey.locator('img').all())await img.evaluate(el=>el.decode());
   await noOverflow(page);
   await journey.screenshot({path:`${output}/people-${width}.png`});
   await journey.locator('summary').click();
   await journey.getByLabel('상대 프로필',{exact:true}).selectOption('partner-profile');
   assert.equal(await journey.getByLabel('상대 프로필',{exact:true}).inputValue(),'partner-profile');
   await noOverflow(page);
   await journey.screenshot({path:`${output}/profiles-${width}.png`});
   await journey.locator('summary').click();
   await next.click();
   await journey.getByRole('heading',{name:'어떤 방식으로 읽어볼까요?'}).waitFor();
   await noOverflow(page);
   await journey.screenshot({path:`${output}/engines-${width}.png`});
   await journey.getByRole('button',{name:'이전 단계',exact:true}).click();
   assert.equal(await self.inputValue(),'나비');assert.equal(await partner.inputValue(),'달');
   await next.focus();await next.press('Enter');
   await journey.getByRole('button',{name:'타로 이 상담으로 이어가기',exact:true}).click();
   await page.getByText('그 사람 마음의 카드 배치',{exact:true}).waitFor();
   await page.reload();
   await page.getByText('그 사람 마음의 카드 배치',{exact:true}).waitFor();
   assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('yeongnyangi:consultation-login-draft')).participants.partner),'달');
   assert.equal(f.state.creates,0);assert.equal(f.state.sdk.length,0);
   assert.deepEqual(f.state.errors,[]);assert.deepEqual(f.state.unknown,[]);
   results.push({width,status:'PASS'});
  }catch(error){await f.page.screenshot({path:`${output}/failure-${width}.png`,fullPage:true});console.error(JSON.stringify({errors:f.state.errors,unknown:f.state.unknown}));throw error;}finally{await f.context.close();}
 }
 // Empty saved profiles must still allow the name-only Tarot path.
 const empty=await fixtures(browser,base,products.find(p=>p.id==='tarot_mackerel'),390);
 try{
  empty.state.products=products;empty.state.profiles=[];
  await empty.page.goto(base+'/yeongnyangi/fortune/?flow=relationship');
  await empty.page.getByRole('button',{name:'그 사람 마음이 궁금해요',exact:true}).click();
  await empty.page.getByLabel('내 이름 또는 별칭',{exact:true}).fill('나비');
  await empty.page.getByLabel('상대 이름 또는 별칭',{exact:true}).fill('달');
  await empty.page.locator('summary').click();
  assert.equal(await empty.page.getByLabel('상대 프로필',{exact:true}).locator('option').count(),1);
  await empty.page.getByRole('button',{name:'추천 상담 보기',exact:true}).click();
  await empty.page.getByRole('button',{name:'타로 이 상담으로 이어가기',exact:true}).click();
  await empty.page.getByText('그 사람 마음의 카드 배치',{exact:true}).waitFor();
  assert.equal(empty.state.creates,0);assert.deepEqual(empty.state.errors,[]);
  results.push({scenario:'empty profiles allow Tarot',status:'PASS'});
 }finally{await empty.context.close();}
}finally{await browser.close();}
await writeFile(`${output}/results.json`,JSON.stringify({evidence:'mock browser only; no payment, DB or LLM',results},null,2));
console.log(JSON.stringify(results));
