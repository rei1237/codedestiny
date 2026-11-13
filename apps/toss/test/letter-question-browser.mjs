import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='http://127.0.0.1:'+Number(process.env.TOSS_TEST_PORT||4329);
const browser=await chromium.launch({channel:'chrome'});
const ctx=await browser.newContext({viewport:{width:360,height:740},serviceWorkers:'block',reducedMotion:'reduce'});
ctx.setDefaultTimeout(45000);await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
const p=await ctx.newPage();p.on('pageerror',error=>console.error(error.message));
try{
 for(const [persona,name,domain,method] of [['yeoni','연이','saju','사주'],['neo','네오','tarot','타로']]){
  const q=name+'에게 묻는 질문입니다. 쉬는 시간을 어떻게 지킬까요?';
  await p.goto(origin);await p.locator('.world-entry-ggulggul').click();
  await p.getByRole('button',{name:name+'의 상담 편지',exact:true}).click();
  const room=p.locator('[data-consultation-room][data-persona="'+persona+'"]');
  await room.getByLabel('나의 질문',{exact:true}).fill(q);await room.getByRole('button',{name:'계속하기'}).click();
  if(persona==='yeoni'){
   await room.getByRole('button',{name:'토스로 로그인하기'}).click();await p.getByRole('button',{name:'토스로 로그인하기'}).click();
   assert.equal(await room.getByLabel('나의 질문',{exact:true}).inputValue(),q);
   await room.getByRole('button',{name:'계속하기'}).click();
  }
  await room.getByRole('group',{name:'해석 방식'}).getByRole('button',{name:new RegExp('^'+method)}).click();
  await room.getByLabel('상담 상품',{exact:true}).selectOption('salmon');
  await room.getByLabel('현재 상황',{exact:true}).fill('가벼운 부탁이 이어져 쉬는 시간이 짧아요.');
  await room.getByLabel('질문과 상담 범위를 확인했어요').check();
  if(persona==='yeoni'){
   await p.reload();assert.equal(await room.getByLabel('나의 질문',{exact:true}).inputValue(),q);
   await room.getByRole('button',{name:'계속하기'}).click();
   assert.equal(await room.getByLabel('상담 상품',{exact:true}).inputValue(),'salmon');
   assert.equal(await room.getByLabel('현재 상황',{exact:true}).inputValue(),'가벼운 부탁이 이어져 쉬는 시간이 짧아요.');
  }
  if(domain!=='tarot'){
   await room.getByRole('button',{name:'새 프로필',exact:true}).click();
   const form=room.locator('form').filter({has:room.page().locator('input[name="name"]')});
   await p.setViewportSize({width:360,height:370});
   await form.locator('input[name="name"]').fill('편지 테스트');
   await form.locator('input[name="date"]').fill('19900918');
   await form.getByLabel('출생시간을 몰라요').check();
   await form.locator('input[name="place"]').fill('서울');
   const save=form.getByRole('button',{name:'프로필 저장하기'});
   await save.scrollIntoViewIfNeeded();const box=await save.boundingBox();assert.ok(box&&box.y>=0&&box.y+box.height<=372);
   await save.click();await p.setViewportSize({width:360,height:740});
   const profiles=room.getByRole('combobox',{name:'상담할 프로필'});
   await profiles.waitFor();assert.notEqual(await profiles.inputValue(),'mock-profile');assert.ok(await profiles.inputValue());
  }
  await room.getByRole('button',{name:'계속하기'}).click();await room.getByRole('button',{name:'상담 준비하기',exact:true}).click();
  if(domain==='tarot'){
   const pick=room.locator('section[aria-labelledby="tarot-pick-heading"]');await pick.waitFor();
   const cards=pick.getByRole('group').getByRole('button');
   assert.equal(await cards.count(),78);await pick.getByRole('button',{name:name+'에게 맡기기'}).click();
  }
  await room.getByRole('button',{name:'1원 단건 결제'}).click();
  await room.getByText('[테스트 전용] '+name+'의 상담 편지 원문입니다.',{exact:true}).first().waitFor();
  const follow=room.locator('#question-conversation');await follow.getByRole('textbox').fill('오늘 일을 마칠 때 무엇부터 말해볼까요?');
  await follow.getByRole('button',{name:/질문 보내기|질문하기|답변 요청하기/}).last().click();
  await room.getByText('[테스트 전용] 저장된 추가 질문 답변',{exact:true}).waitFor();
  const id=new URL(p.url()).searchParams.get('consultation');
  await p.goto(origin);await p.locator('.world-entry-ggulggul').click();await p.getByRole('link',{name:'꿀꿀운세 구매 기록'}).click();
  await p.locator('article').filter({hasText:q}).getByRole('link',{name:'다시 보기'}).click();
  await p.getByText('[테스트 전용] 저장된 추가 질문 답변',{exact:true}).waitFor();
  const saved=await p.evaluate(id=>JSON.parse(localStorage.getItem('toss-offline-fixture')).letters.find(([key])=>key===id)[1],id);
  assert.equal(saved.productId,'chat_'+domain+'_salmon');assert.equal(saved.conversation.used,1);assert.equal(saved.conversation.remaining,0);
  console.log('PASS '+name+' '+method+' 질문 편지 · 전용 상품·범위·추가 질문·재실행 원문');
 }
}catch(error){console.error(p.url(),(await p.locator('body').innerText()).slice(-1600));throw error;}finally{await browser.close();}
