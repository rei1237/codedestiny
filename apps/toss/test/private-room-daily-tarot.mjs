import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';

export async function verifyRoomDailyTarot(origin,context){
 const source=fileURLToPath(new URL('../../../lib/tarot/',import.meta.url));
 const original=await build({stdin:{contents:"export {kstDateKey,dailyTarotSpread} from './yeongnyangi-daily-card';export {offsetTarotDate,synthesizeDailyTarot} from './yeongnyangi-daily-synthesis';",resolveDir:source},bundle:true,platform:'node',format:'esm',write:false});
 const {kstDateKey,dailyTarotSpread,offsetTarotDate,synthesizeDailyTarot}=await import('data:text/javascript;base64,'+Buffer.from(original.outputFiles[0].text).toString('base64'));
 const page=await context.newPage();page.setDefaultTimeout(30000);
 const open=async()=>{await page.goto(origin);await page.locator('.world-entry-yeongnyangi').click();await page.getByRole('button',{name:/^영냥이의 방/}).click();await page.locator('#daily-tarot-title').waitFor();};
 const tarot=page.locator('#daily-tarot');
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')||'{}'));
 const spread=async offset=>{
  await tarot.getByRole('button',{name:offset?'내일의 운세':'오늘의 운세',exact:true}).click();
  const key=await tarot.locator('time').getAttribute('datetime');
  assert.equal(key,offsetTarotDate(kstDateKey(),offset));
  const device=await page.evaluate(()=>localStorage.getItem('cd:yn:daily-tarot-device:v1'));assert.match(device,/^[a-f0-9]{32}$/);
  const cards=dailyTarotSpread(key,device),reading=synthesizeDailyTarot(cards);
  for(const [index,card] of cards.entries()){
   const button=tarot.locator('.daily-tarot-flip').nth(index);await button.click();
   assert.ok((await button.getAttribute('aria-label')).includes(card.cardName+' '+card.orientationLabel));
   const img=button.locator('.daily-tarot-front img');await img.evaluate(el=>el.decode());assert.ok((await img.getAttribute('src')).includes(card.cardCode));
  }
  assert.equal(await tarot.locator('.daily-tarot-headline').innerText(),reading.headline);
  assert.equal((await tarot.locator('.daily-tarot-synthesis p').allTextContents()).includes(reading.closing),true);
  return await tarot.locator('.daily-tarot-synthesis').innerText();
 };
 try{
  await open();assert.equal(await tarot.locator('.daily-tarot-flip').count(),0);
  await tarot.getByRole('button',{name:'로그인하고 출석하기'}).click();
  await page.getByRole('button',{name:'오늘 출석하기'}).click();
  await page.getByRole('button',{name:'멸치 3마리로 오늘의 운세 열기'}).click();
  const tomorrow=await spread(1),today=await spread(0);assert.notEqual(today,tomorrow);
  const a=await state();assert.equal(a.daily.balance,0);assert.equal(a.daily.attended,true);assert.equal(a.orders.length,0);
  await open();assert.equal(await spread(0),today);assert.equal(await spread(1),tomorrow);assert.equal((await state()).daily.balance,0);
  await Promise.all([page.waitForEvent('load'),page.getByLabel('모의 계정',{exact:true}).selectOption('B')]);
  await open();await tarot.getByRole('button',{name:'로그인하고 출석하기'}).click();await page.getByRole('button',{name:'오늘 출석하기'}).waitFor();
  assert.equal(await tarot.locator('.daily-tarot-flip').count(),0);assert.equal(await tarot.locator('.daily-tarot-synthesis').count(),0);
  assert.equal((await state()).daily.unlocked,false);assert.equal((await state()).orders.length,0);
  console.log('PASS room daily attendance and one shared three-anchovy pass; KST today/tomorrow canonical 3-card spreads, original artwork and synthesis, same-device repeat and account B locked, zero orders');
 }catch(error){console.error(page.url(),(await page.locator('body').innerText()).slice(-1200));throw error;}finally{await page.close();}
}
