import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='http://127.0.0.1:'+Number(process.env.TOSS_TEST_PORT||4329);
const browser=await chromium.launch({channel:'chrome'}),ctx=await browser.newContext({viewport:{width:360,height:740},serviceWorkers:'block',reducedMotion:'reduce'});
ctx.setDefaultTimeout(45000);await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
const p=await ctx.newPage(),methods={saju:'사주',ziwei:'자미두수',sukuyo:'숙요',vedic:'베다점',astrology:'서양 점성술',tarot:'타로'};
try{
 for(const [persona,name] of Object.entries({yeoni:'연이',neo:'네오'})){
  for(const [domain,method] of Object.entries(methods)){
   await p.goto(origin);await p.locator('.world-entry-ggulggul').click();
   await p.getByRole('button',{name:name+'의 상담 편지',exact:true}).click();
   const room=p.locator('[data-consultation-room]'),q=name+'의 '+method+' 편지로 오늘 할 수 있는 일을 알고 싶어요.';
   await room.getByLabel('나의 질문',{exact:true}).fill(q);await room.getByRole('button',{name:'계속하기'}).click();
   if(persona==='yeoni'&&domain==='saju'){
    await room.getByRole('button',{name:'토스로 로그인하기'}).click();await p.getByRole('button',{name:'토스로 로그인하기'}).click();
    await room.getByRole('button',{name:'계속하기'}).click();
   }
   await room.getByRole('group',{name:'해석 방식'}).getByRole('button',{name:new RegExp('^'+method)}).click();
   if(domain!=='tarot')await room.getByRole('combobox',{name:'상담할 프로필'}).selectOption('mock-profile');
   await room.getByRole('button',{name:'계속하기'}).click();await room.getByRole('button',{name:'상담 준비하기',exact:true}).click();
   await room.getByRole('button',{name:persona==='yeoni'&&domain==='saju'?'4,950원 단건 결제':'1원 단건 결제'}).click();
   const text='[테스트 전용] '+name+'의 상담 편지 원문입니다.';await room.getByText(text,{exact:true}).first().waitFor();
   const id=new URL(p.url()).searchParams.get('consultation');
   await p.goto(origin);await p.locator('.world-entry-ggulggul').click();
   await p.getByRole('link',{name:'꿀꿀운세 구매 기록'}).click();await p.locator('article').filter({hasText:q}).getByRole('link',{name:'다시 보기'}).click();
   await room.getByText(text,{exact:true}).first().waitFor();assert.equal(new URL(p.url()).searchParams.get('consultation'),id);
   const row=await p.evaluate(id=>JSON.parse(localStorage.getItem('toss-offline-fixture')).letters.find(([key])=>key===id)[1],id);
   assert.equal(row.persona,persona);assert.equal(row.productId,'chat_'+domain);console.log('PASS '+name+' '+method+' 기본 편지 재열람');
  }
 }
}finally{await browser.close();}
