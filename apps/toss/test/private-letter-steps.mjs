import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
import {chatFishForDomain} from '../../../lib/fortune/chat-products.js';
const methods={saju:'사주',ziwei:'자미두수',sukuyo:'숙요',vedic:'베다점',astrology:'서양 점성술',tarot:'타로'};
const flag=name=>{const i=process.argv.indexOf(name);return i<0?'':process.argv[i+1];};
export const letterDomain=flag('--letter-domain')||'saju';
export const letterTier=flag('--letter-tier');
assert.ok(methods[letterDomain]);
assert.ok(!letterTier||chatFishForDomain(letterDomain).includes(letterTier),'unsupported letter tier');
export const letterQuestion=letterTier?'부탁이 이어져 쉬는 시간이 짧아요. 어떻게 말하면 좋을까요?':'이직 전에 어떤 경험을 기록해 두면 좋을까요?';
export const letterProductId='chat_'+letterDomain+(letterTier?'_'+letterTier:'');
export const letterCaseName=letterDomain+(letterTier?'-'+letterTier:'');
export async function startLetter(page,origin){
 await page.goto(origin);await page.locator('.world-entry-ggulggul').click();
 await page.getByRole('button',{name:'연이의 상담 편지',exact:true}).click();
 const room=page.locator('[data-consultation-room][data-persona="yeoni"]');
 await room.getByLabel('나의 질문',{exact:true}).fill(letterQuestion);
 await room.getByRole('button',{name:'계속하기'}).click();
 await room.getByRole('button',{name:'토스로 로그인하기'}).click();
 await page.getByRole('button',{name:'토스로 로그인하기'}).click();
 assert.equal(await room.getByLabel('나의 질문',{exact:true}).inputValue(),letterQuestion);
 await room.getByRole('button',{name:'계속하기'}).click();
 await room.getByRole('group',{name:'해석 방식'}).getByRole('button',{name:new RegExp('^'+methods[letterDomain])}).click();
 if(letterTier){
  await room.getByLabel('상담 상품',{exact:true}).selectOption(letterTier);
  await room.getByLabel('현재 상황',{exact:true}).fill('가벼운 부탁이 이어져 쉬는 시간이 짧아요.');
  if(letterTier==='tuna'){
   await room.locator('select').filter({has:page.getByRole('option',{name:'장기 시기 전환',exact:true})}).selectOption('transition');
   await room.getByLabel('살펴볼 기간',{exact:true}).fill('앞으로 3년');
  }
  await room.getByLabel('질문과 상담 범위를 확인했어요').check();
  await page.reload();
  assert.equal(await room.getByLabel('나의 질문',{exact:true}).inputValue(),letterQuestion);
  await room.getByRole('button',{name:'계속하기'}).click();
  assert.equal(await room.getByLabel('상담 상품',{exact:true}).inputValue(),letterTier);
  assert.equal(await room.getByLabel('현재 상황',{exact:true}).inputValue(),'가벼운 부탁이 이어져 쉬는 시간이 짧아요.');
 }
 if(letterDomain!=='tarot')await room.getByRole('combobox',{name:'상담할 프로필'}).selectOption('mock-profile');
 if(process.env.TOSS_CAPTURE_DIR){await mkdir(process.env.TOSS_CAPTURE_DIR,{recursive:true});await page.screenshot({path:join(process.env.TOSS_CAPTURE_DIR,'letter-'+letterCaseName+'-input.png'),fullPage:true});}
 await room.getByRole('button',{name:'계속하기'}).click();
 await room.getByRole('button',{name:'상담 준비하기',exact:true}).click();
 if(letterTier&&letterDomain==='tarot'){
  const pick=room.locator('section[aria-labelledby="tarot-pick-heading"]');await pick.waitFor();
  assert.equal(await pick.getByRole('group').getByRole('button').count(),78);
  if(process.env.TOSS_CAPTURE_DIR){
   const deck=pick.getByRole('group'),firstImage=deck.locator('img').first();
   await firstImage.scrollIntoViewIfNeeded();
   await firstImage.evaluate(async img=>{await img.decode();});
   console.log('TAROT_VISUAL',await deck.evaluate(el=>({background:getComputedStyle(el).backgroundColor,height:el.clientHeight,scrollHeight:el.scrollHeight,token:getComputedStyle(el).getPropertyValue('--yn-night'),image:el.querySelector('img')?.currentSrc,loaded:el.querySelector('img')?.naturalWidth})));
   await page.screenshot({path:join(process.env.TOSS_CAPTURE_DIR,'letter-'+letterCaseName+'-draw.png')});
  }
  await pick.getByRole('button',{name:'연이에게 맡기기'}).click();
 }
 await room.getByRole('button',{name:!letterTier&&letterDomain==='saju'?'4,950원 단건 결제':'1원 단건 결제'}).click();
}
export async function followLetter(page){
 if(!letterTier||letterTier==='mackerel')return '[테스트 전용] 연이의 상담 편지 원문입니다.';
 const follow=page.locator('#question-conversation');
 await follow.getByRole('textbox').fill('오늘 일을 마칠 때 무엇부터 말해볼까요?');
 await follow.getByRole('button',{name:/질문 보내기|질문하기|답변 요청하기/}).last().click();
 const text='[테스트 전용] 저장된 추가 질문 답변';await page.getByText(text,{exact:true}).waitFor();return text;
}
export function assertLetterSnapshot(row){
 assert.equal(row.productId,letterProductId);
 if(!letterTier)return;
 assert.equal(row.input.fishId,letterTier);assert.equal(row.input.questionDecision.confirmed,true);
 assert.equal(row.input.questionDecision.situation,'가벼운 부탁이 이어져 쉬는 시간이 짧아요.');
 if(letterTier==='tuna'){assert.equal(row.input.questionDecision.horizon,'transition');assert.equal(row.input.questionDecision.period,'앞으로 3년');}
 const limits={mackerel:0,salmon:1,flounder:2,tuna:6};
 assert.equal(row.conversation.limit,limits[letterTier]);
 assert.equal(row.conversation.used,letterTier==='mackerel'?0:1);
 if(letterDomain==='tarot'){assert.equal(row.tarotSpread.drawn,true);assert.equal(row.tarotSpread.picks.length,row.tarotSpread.cardCount);}
}
