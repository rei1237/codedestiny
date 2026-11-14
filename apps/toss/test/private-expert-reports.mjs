import assert from 'node:assert/strict';
const products=[['베다 전문가','vedic'],['자미두수 전문가','ziwei'],['점성술 전문가','astrology'],['신년운세 전문가','new-year'],['운명의 업 전문가','karma'],['초융합 운세','fusion'],['연애 비책','love-secret']];

export async function verifyExpertReport(origin,context,service){
 const selected=products.find(p=>p[1]===service);assert.ok(selected,'unknown expert');const [label]=selected;let page;
 try{
    page=await context.newPage();page.setDefaultTimeout(18000);
    const open=async()=>{await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('searchbox').fill(label);await page.getByRole('button',{name:new RegExp(label)}).first().click();};
    const login=async()=>{await page.goto(origin);await page.getByRole('button',{name:'내 정보',exact:true}).click();await page.getByRole('button',{name:/로그인/}).first().click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();await page.waitForURL(url=>!url.pathname.startsWith('/login'));};
    await login();await open();
    const form=page.locator('form[data-moonlit-form]').first();
    if(service==='love-secret'){
      const next=form.getByRole('button',{name:'다음',exact:true});
      await next.click();await next.click();
      await form.getByRole('button',{name:/여성|여자/}).first().click();
      await form.locator('input[inputmode="numeric"]').first().fill('19900102');
      const unknown=form.getByRole('checkbox').last();if(await unknown.count()&&!await unknown.isChecked())await unknown.check();
      await next.click();
    }else{
      await form.getByPlaceholder('YYYY-MM-DD').fill('19900102');
      const time=form.getByPlaceholder('08:35');if(await time.isEnabled())await time.fill('0835');
      const selects=form.locator('select');
      for(let i=0;i<await selects.count();i++){const select=selects.nth(i);if(!await select.locator('option[value=mock-profile]').count()&&!await select.inputValue())await select.selectOption({index:1});}
      const name=form.locator('input:not([type]),input[type=text]').first();if(service!=='fusion'&&await name.getAttribute('placeholder')!=='YYYY-MM-DD')await name.fill('테스트');
      if(service==='astrology')await form.locator('select').filter({has:page.locator('option[value=seoul]')}).selectOption('seoul');
      if(service==='vedic')await form.locator('input[list=vedic-place-presets]').fill('서울, 한국');
      const question=form.locator('textarea').first();if(await question.count())await question.fill('이직을 준비하면서 내가 먼저 살펴볼 습관은 무엇일까요?');
    }
    await page.getByText(/^1원/).first().waitFor();await form.locator('button[type=submit]').first().click();
    await page.waitForFunction(service=>{const state=JSON.parse(localStorage.getItem('consultations'));return state.intents.some(([,row])=>row.service===service&&row.result);},service,{timeout:26000});
    if(service==='love-secret')await page.getByRole('link',{name:'결과 확인하기'}).click();
    await page.waitForURL(url=>['cid','id','sid','sessionId','attemptId'].some(key=>url.searchParams.has(key)),{timeout:28000});
    const state=async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')));
    const first=await state(),row=first.intents.find(([,item])=>item.service===service)[1];
    assert.equal(first.orders.length,1);assert.equal(row.generationCount,1);
    await page.waitForURL(url=>[...url.searchParams.values()].includes(row.result.id),{timeout:18000});
    const resultUrl=page.url();await page.goto(origin);
    await page.getByRole('button',{name:'내 정보',exact:true}).click();
    await page.getByRole('button',{name:/기록 보관함|구매 기록/}).first().click();
    await page.locator('button.record').first().click();await page.waitForURL(resultUrl);
    await page.reload();await page.waitForURL(resultUrl);
    const visible=page.getByText(/테스트 전용 예시/).first();
    await visible.waitFor();assert.deepEqual((await state()).intents,first.intents);
    await Promise.all([page.waitForEvent('load'),page.getByLabel('모의 계정',{exact:true}).selectOption('B')]);await login();await page.goto(resultUrl);
    await page.getByRole('heading',{name:'구매 기록 확인'}).waitFor();assert.equal(await visible.count(),0);
    console.log('PASS private expert',service,'home, original form, mock purchase, stored result, relaunched history, account B denied');

 }catch(error){console.error(service,page?.url(),(await page?.locator('body').innerText())?.slice(-1800));console.error(await page?.locator('input,select,textarea').evaluateAll(items=>items.map(el=>({name:el.name,type:el.type,value:el.value,valid:el.validity?.valid,message:el.validationMessage}))),await page?.evaluate(()=>JSON.parse(localStorage.getItem('consultations')||'{}')));throw error;}
}
