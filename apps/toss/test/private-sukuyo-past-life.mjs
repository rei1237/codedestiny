import assert from 'node:assert/strict';
export async function verifyPrivateSukuyoPastLife(origin,context){
 const page=await context.newPage();page.setDefaultTimeout(20000);
 try{
  await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('searchbox').fill('숙요점');await page.locator('.directory-list button').filter({hasText:'숙요점'}).first().click();await page.getByRole('button',{name:'전생 인연 리딩',exact:true}).click();
  await page.getByRole('button',{name:'토스 로그인하고 인연 살펴보기'}).click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();await page.getByRole('button',{name:'모의 예시 입력하기'}).waitFor();
  for(const purpose of ['love','reunion','marriage','crush','friend','family','business','work','general']){
   await page.getByRole('button',{name:'모의 예시 입력하기'}).click();await page.getByLabel('관계 목적').selectOption(purpose);await page.getByRole('button',{name:'전생 인연 리딩 펼치기'}).click();
   const frame=page.frameLocator('iframe[title="숙요 전생 인연 리딩"]');await frame.locator('.sy-past-life-panel').waitFor();assert.ok((await frame.locator('main').innerText()).includes('30일 실행 플랜'));assert.ok(await frame.locator('svg').count()>0);assert.ok((await frame.locator('[data-sy-past-life-ai-output]').inputValue()).length>100);
   for(const width of [360,390,430]){await page.setViewportSize({width,height:740});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
   await page.getByRole('button',{name:'출생정보 다시 보기'}).click();
  }
  const ledger=await page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')));assert.equal(ledger.orders.length,0);assert.equal(ledger.fortunes.length,0);
  await Promise.all([page.waitForEvent('load'),page.getByLabel('모의 계정',{exact:true}).selectOption('B')]);await page.getByRole('button',{name:'토스 로그인하고 인연 살펴보기'}).waitFor();assert.equal(await page.locator('iframe[title="숙요 전생 인연 리딩"]').count(),0);
  console.log('PASS private Sukuyo past life: home/login, nine original purposes/radar/plan/prompt, 3 widths, zero orders, account switch clears result');
 }finally{await page.close();}
}
