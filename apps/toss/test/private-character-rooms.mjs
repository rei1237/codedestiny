import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {home,neo,neoQuestion,neoMethod,follow} from './character-room-steps.mjs';
import {startLetter as letter,followLetter,assertLetterSnapshot,letterQuestion,letterCaseName} from './private-letter-steps.mjs';
import {neoPartner,neoPartnerQuestion} from './neo-partner-steps.mjs';
import {teaModeSteps as tea,teaModeQuestion as teaQuestion,selectedTeaMode} from './tea-mode-steps.mjs';
const withPartner=process.argv.includes('--neo-partner');
export async function verifyCharacterRooms(origin,context,service=process.argv[process.argv.indexOf('--character-rooms')+1]){
 const cases={letter:[letter,letterQuestion,'[테스트 전용] 연이의 상담 편지 원문입니다.'],tea:[tea,teaQuestion,'[테스트 전용] 찻집에서 저장한 결과 원문입니다.'],neo:[withPartner?(page,origin)=>neoPartner(page,origin,neoMethod):neo,withPartner?neoPartnerQuestion:neoQuestion,'[테스트 전용] 네오가 저장한 브리핑 원문입니다.']};
 const [start,question,text]=cases[service];
 const read=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')));
 const fresh=async()=>{const page=await context.newPage();page.setDefaultTimeout(22000);return page;};
 let page=await fresh();
 try{
  await start(page,origin);
  await page.getByText(text,{exact:true}).first().waitFor();
  if(process.env.TOSS_CAPTURE_DIR&&service==='letter'){await mkdir(process.env.TOSS_CAPTURE_DIR,{recursive:true});await page.screenshot({path:join(process.env.TOSS_CAPTURE_DIR,'letter-'+letterCaseName+'-initial-result.png'),fullPage:true});}
  const followText=service==='letter'?await followLetter(page):await follow(page,service==='tea');
  assert.equal(await page.getByText('이미지를 불러오지 못했습니다.',{exact:true}).count(),0,'visible room artwork must be available inside the archive');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile form overflows');
  if(process.env.TOSS_CAPTURE_DIR){await mkdir(process.env.TOSS_CAPTURE_DIR,{recursive:true});await page.screenshot({path:join(process.env.TOSS_CAPTURE_DIR,(service==='letter'?'letter-'+letterCaseName:service==='neo'?'neo-'+neoMethod+(withPartner?'-partner':''):service+'-'+selectedTeaMode)+'-result.png'),fullPage:true});}
  if(process.env.TOSS_CAPTURE_DIR&&service==='tea'&&selectedTeaMode==='sajuCompatibility'){
   const sprites=page.locator('span[data-loaded][data-failed]');
   for(let i=0;i<await sprites.count();i++){
    const sprite=sprites.nth(i);if(!await sprite.isVisible())continue;
    await sprite.scrollIntoViewIfNeeded();
    await page.waitForFunction(el=>el.dataset.loaded==='true',await sprite.elementHandle()).catch(async error=>{console.error('SPRITE',i,await sprite.evaluate(el=>({html:el.outerHTML,rect:el.getBoundingClientRect().toJSON()})));await page.screenshot({path:join(process.env.TOSS_CAPTURE_DIR,'tea-sprite-visible.png')});throw error;});
    assert.equal(await sprite.getAttribute('data-failed'),'false');
   }
   await page.screenshot({path:join(process.env.TOSS_CAPTURE_DIR,'tea-sajuCompatibility-loaded-result.png'),fullPage:true});
  }
  const saved=await read(page);
  assert.equal(saved.orders.length,1);
  const rows=service==='letter'?saved.letters:saved.intents;
  assert.equal(rows.length,1);
  if(service==='letter')assertLetterSnapshot(rows[0][1]);
  if(service!=='letter')assert.equal(rows[0][1].generationCount,1);
  if(service==='tea'){
   const {teaMode}=await import('./offline/tea-modes.mjs');
   assert.equal(teaMode(rows[0][1].input),selectedTeaMode);
   assert.equal(rows[0][1].result.featureKey,rows[0][1].featureKey);
   if(selectedTeaMode.startsWith('tarot'))assert.equal(rows[0][1].result.tarotSpreadCards.length,selectedTeaMode==='tarotFive'?5:3);
  }
  if(service==='neo'){
   assert.equal(rows[0][1].input.selectedMethod||rows[0][1].input.method,neoMethod);
   assert.equal(rows[0][1].result.initialBriefing.selectedMethod,neoMethod);
  }
  await page.close();page=await fresh();await home(page,origin);
  const newNeoQuestion='새 상담 질문은 이전 작전서를 열어도 보존합니다.';
  if(service==='neo'){
   await page.getByRole('button',{name:/네오 · 팩폭 전략실/}).click();
   await page.getByRole('button',{name:'고민부터 적어보기'}).click();
   await page.locator('#neo-operation-question').fill(newNeoQuestion);
   await home(page,origin);
  }
  await page.getByRole('link',{name:'꿀꿀운세 구매 기록'}).click();
  await page.locator('article').filter({hasText:question}).getByRole('link',{name:'다시 보기'}).click();
  await page.getByText(text,{exact:true}).first().waitFor();
  const ownedUrl=page.url();
  await page.reload();await page.getByText(followText,{exact:true}).first().waitFor();
  assert.deepEqual(await read(page),saved);
  if(service==='neo'){
   await home(page,origin);
   await page.getByRole('button',{name:/네오 · 팩폭 전략실/}).click();
   await page.getByRole('button',{name:'고민부터 적어보기'}).click();
   assert.equal(await page.locator('#neo-operation-question').inputValue(),newNeoQuestion);
  }
  await Promise.all([page.waitForEvent('load'),page.getByLabel('모의 계정',{exact:true}).selectOption('B')]);
  await home(page,origin);
  await page.getByRole('button',{name:/연이 · 운명의 찻집/}).click();
  await page.getByRole('link',{name:'계정',exact:true}).click();
  await page.getByRole('button',{name:'토스로 로그인하기'}).click();
  await page.waitForURL(url=>url.pathname==='/fortune-tea-house/');
  assert.equal((await read(page)).loggedIn,true);
  await page.goto(ownedUrl);
  await page.getByText(/찾을 수 없|불러오지 못|확인하지 못|다시 시도|열 수 없|확인해 주세요|없습니다/).first().waitFor();
  assert.equal(await page.getByText(text,{exact:true}).count(),0);
  assert.equal((await read(page)).orders.length,0);
  console.log('PASS',service,service==='letter'?letterCaseName:service==='neo'?neoMethod+(withPartner?'-partner':''):selectedTeaMode,'360px home, mock login, one order, stored result, cold reopen, owner B denied');
 }catch(error){console.error(service,page.url(),(await page.locator('body').innerText()).slice(-1600));throw error;}
}
