import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {home,tea,neo,teaQuestion,neoQuestion,neoMethod,follow} from './character-room-steps.mjs';
const letterMethods={saju:'사주',ziwei:'자미두수',sukuyo:'숙요',vedic:'베다점',astrology:'서양 점성술',tarot:'타로'};
const domainFlag=process.argv.indexOf('--letter-domain');
const letterDomain=domainFlag<0?'saju':process.argv[domainFlag+1];
assert.ok(letterMethods[letterDomain],'supported letter domain required');
const letterQuestion='이직 전에 어떤 경험을 기록해 두면 좋을까요?';
async function letter(page,origin){
 await home(page,origin);
 await page.getByRole('button',{name:'연이의 상담 편지',exact:true}).click();
 const room=page.locator('[data-consultation-room][data-persona="yeoni"]');
 await room.getByLabel('나의 질문',{exact:true}).fill(letterQuestion);
 await room.getByRole('button',{name:'계속하기'}).click();
 await room.getByRole('button',{name:'토스로 로그인하기'}).click();
 await page.getByRole('button',{name:'토스로 로그인하기'}).click();
 assert.equal(await room.getByLabel('나의 질문',{exact:true}).inputValue(),letterQuestion);
 await room.getByRole('button',{name:'계속하기'}).click();
 await room.getByRole('group',{name:'해석 방식'}).getByRole('button',{name:new RegExp('^'+letterMethods[letterDomain])}).click();
 if(letterDomain!=='tarot')await room.getByRole('combobox',{name:'상담할 프로필'}).selectOption('mock-profile');
 await room.getByRole('button',{name:'계속하기'}).click();
 await room.getByRole('button',{name:'상담 준비하기',exact:true}).click();
 await room.getByRole('button',{name:letterDomain==='saju'?'4,950원 단건 결제':'1원 단건 결제'}).click();
}
export async function verifyCharacterRooms(origin,context,service=process.argv[process.argv.indexOf('--character-rooms')+1]){
 const cases={letter:[letter,letterQuestion,'[테스트 전용] 연이의 상담 편지 원문입니다.'],tea:[tea,teaQuestion,'[테스트 전용] 찻집에서 저장한 결과 원문입니다.'],neo:[neo,neoQuestion,'[테스트 전용] 네오가 저장한 브리핑 원문입니다.']};
 const [start,question,text]=cases[service];
 const read=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')));
 const fresh=async()=>{const page=await context.newPage();page.setDefaultTimeout(22000);return page;};
 let page=await fresh();
 try{
  await start(page,origin);
  await page.getByText(text,{exact:true}).first().waitFor();
  const followText=service==='letter'?text:await follow(page,service==='tea');
  assert.equal(await page.getByText('이미지를 불러오지 못했습니다.',{exact:true}).count(),0,'visible room artwork must be available inside the archive');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile form overflows');
  if(process.env.TOSS_CAPTURE_DIR){await mkdir(process.env.TOSS_CAPTURE_DIR,{recursive:true});await page.screenshot({path:join(process.env.TOSS_CAPTURE_DIR,(service==='letter'?'letter-'+letterDomain:service==='neo'?'neo-'+neoMethod:service)+'-result.png'),fullPage:true});}
  const saved=await read(page);
  assert.equal(saved.orders.length,1);
  const rows=service==='letter'?saved.letters:saved.intents;
  assert.equal(rows.length,1);
  if(service==='letter')assert.equal(rows[0][1].productId,'chat_'+letterDomain);
  if(service!=='letter')assert.equal(rows[0][1].generationCount,1);
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
  console.log('PASS',service,service==='letter'?letterDomain:service==='neo'?neoMethod:'','360px home, mock login, one order, stored result, cold reopen, owner B denied');
 }catch(error){console.error(service,page.url(),(await page.locator('body').innerText()).slice(-1600));throw error;}
}
