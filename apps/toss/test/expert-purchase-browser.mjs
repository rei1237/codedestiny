import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const origin=process.env.TOSS_OFFLINE_ORIGIN||'http://127.0.0.1:4329';
assert.equal(new URL(origin).hostname,'127.0.0.1');
const products=[['베다 전문가','vedic'],['자미두수 전문가','ziwei'],['점성술 전문가','astrology'],['신년운세 전문가','new-year'],['운명의 업 전문가','karma'],['초융합 운세','fusion'],['연애 비책','love-secret']];
const browser=await chromium.launch({channel:'chrome'});
let page;
try{
  for(const [label,service] of products){
    if(process.env.TOSS_EXPERT_ONLY&&!process.env.TOSS_EXPERT_ONLY.split(',').includes(service))continue;
    const context=await browser.newContext({viewport:{width:360,height:740},serviceWorkers:'block',reducedMotion:'reduce'});
    await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
    page=await context.newPage();page.setDefaultTimeout(18000);
    const open=async()=>{await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('searchbox').fill(label);await page.getByRole('button',{name:new RegExp(label)}).first().click();};
    const login=async()=>{await page.goto(origin);await page.getByRole('button',{name:'내 정보',exact:true}).click();await page.getByRole('button',{name:/로그인/}).first().click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();};
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
      for(let i=0;i<await selects.count();i++){const select=selects.nth(i);if(!await select.inputValue())await select.selectOption({index:1});}
      const name=form.locator('input:not([type]),input[type=text]').first();if(service!=='fusion'&&await name.getAttribute('placeholder')!=='YYYY-MM-DD')await name.fill('테스트');
      const question=form.locator('textarea').first();if(await question.count())await question.fill('이직을 준비하면서 내가 먼저 살펴볼 습관은 무엇일까요?');
    }
    await page.getByText(/^1원/).first().waitFor();await form.locator('button[type=submit]').first().click();
    await page.waitForFunction(service=>{const state=JSON.parse(localStorage.getItem('toss-offline-fixture'));return state.intents.some(([,row])=>row.service===service&&row.result);},service,{timeout:26000});
    if(service==='love-secret')await page.getByRole('link',{name:'결과 확인하기'}).click();
    await page.waitForURL(url=>['cid','id','sid','sessionId','attemptId'].some(key=>url.searchParams.has(key)),{timeout:28000});
    const state=async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-fixture')));
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
    await page.goto(origin);await page.getByRole('button',{name:'내 정보',exact:true}).click();await page.getByRole('button',{name:'로그아웃',exact:true}).click();
    await page.evaluate(()=>localStorage.setItem('toss-offline-login-person','second'));await login();await page.goto(resultUrl);
    await page.getByRole('heading',{name:'구매 기록 확인'}).waitFor();assert.equal(await visible.count(),0);
    console.log('PASS',service,'home, original form, mock purchase, stored result, relaunched history, account B denied');
    await context.close();
  }
}catch(error){console.warn(page?.url(),await page?.locator('body').innerText().catch(()=>''));console.warn(await page?.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-fixture'))?.intents.map(([,r])=>[r.service,r.paid,Boolean(r.result)])));throw error;}finally{await browser.close();}

