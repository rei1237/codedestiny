import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='http://127.0.0.1:'+Number(process.env.TOSS_TEST_PORT||4329);
const browser=await chromium.launch({channel:'chrome'});
const context=await browser.newContext({viewport:{width:360,height:740},isMobile:true,serviceWorkers:'block'});
context.setDefaultTimeout(90000);
await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
const home=async page=>{await page.goto(origin);await page.locator('.world-entry-ggulggul').click();};
try{
  for(const [persona,name] of [['neo','네오'],['yeoni','연이']]){
    const question=name+'에게 묻습니다. 이직 전에 무엇부터 정리할까요?';
    const text='[테스트 전용] '+name+'의 상담 편지 원문입니다.';
    const page=await context.newPage();
    await home(page);
    await page.getByRole('button',{name:name+'의 상담 편지',exact:true}).click();
    const room=page.locator('[data-consultation-room][data-persona="'+persona+'"]');
    const enter=async()=>{
      await room.getByLabel('나의 질문',{exact:true}).fill(question);
      await room.getByRole('button',{name:'계속하기'}).click();
    };
    await enter();
    if(persona==='neo'){
      await room.getByRole('button',{name:'토스로 로그인하기'}).click();
      await page.getByRole('button',{name:'토스로 로그인하기'}).click();
      const input=room.getByLabel('나의 질문',{exact:true});
      await input.waitFor();
      assert.equal(await input.inputValue(),question);
      await room.getByRole('button',{name:'계속하기'}).click();
    }
    await room.getByRole('combobox',{name:'상담할 프로필'}).selectOption('mock-profile');
    await room.getByRole('button',{name:'계속하기'}).click();
    await room.getByRole('button',{name:'상담 준비하기',exact:true}).click();
    await room.getByRole('button',{name:persona==='neo'?'1원 단건 결제':'4,950원 단건 결제'}).click();
    await room.getByText(text,{exact:true}).first().waitFor();
    await page.close();
    const reopen=await context.newPage();
    await home(reopen);
    await reopen.getByRole('link',{name:'꿀꿀운세 구매 기록'}).click();
    await reopen.locator('article').filter({hasText:question}).getByRole('link',{name:'다시 보기'}).click();
    await reopen.getByText(text,{exact:true}).first().waitFor();
    assert.ok(await reopen.locator('[data-persona="'+persona+'"]').count());
    if(persona==='yeoni'){
      const ownedUrl=reopen.url();
      await reopen.goto(origin);
      await reopen.getByRole('button',{name:'내 정보',exact:true}).click();
      await reopen.getByRole('button',{name:'로그아웃',exact:true}).click();
      await reopen.getByText('로그아웃했어요.').waitFor();
      await reopen.evaluate(()=>localStorage.setItem('toss-offline-login-person','second'));
      await home(reopen);
      await reopen.getByRole('button',{name:'연이의 상담 편지',exact:true}).click();
      await reopen.getByLabel('나의 질문',{exact:true}).fill('다른 계정의 합성 질문이에요.');
      await reopen.getByRole('button',{name:'계속하기'}).click();
      await reopen.getByRole('button',{name:'토스로 로그인하기'}).click();
      await reopen.getByRole('button',{name:'토스로 로그인하기'}).click();
      await reopen.locator('[data-persona="yeoni"]').waitFor();
      assert.equal(await reopen.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-fixture-2')).loggedIn),true);
      await reopen.goto(ownedUrl);
      await reopen.getByRole('alert').first().waitFor();
      assert.equal(await reopen.getByText(text,{exact:true}).count(),0);
    }
    await reopen.close();
    console.log('PASS',persona,'홈 → 편지 원본 입력 → 프로필 → 고유 가상 SKU → 꿀꿀운세 구매 기록 → 같은 상담자 원문');
  }
}finally{await browser.close();}
