import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
export async function verifySukuyoYearly(origin,context){
 const page=await context.newPage();page.setDefaultTimeout(30000);
 const open=async()=>{await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('searchbox').fill('숙요점');await page.locator('.directory-list button').filter({hasText:'숙요점'}).first().click();};
 await open();await page.getByRole('heading',{name:'올해의 숙요 흐름',exact:true}).waitFor();await page.getByRole('button',{name:'토스 로그인하고 연간 흐름 보기',exact:true}).click();await page.getByRole('button',{name:'토스로 로그인하기',exact:true}).click();
 const read=async()=>{await page.getByRole('button',{name:'숙요점 1년운 살펴보기'}).click();await page.getByLabel('살펴볼 연도').fill('2026');await page.getByRole('button',{name:'1년운 살펴보기',exact:true}).click();await page.getByRole('heading',{name:'열두 달의 흐름'}).waitFor();};
 await read();const text=await page.locator('.sukuyo-basic-result').innerText();assert.equal(await page.locator('details.paper').count(),12);
 assert.equal(await page.locator('.sukuyo-basic-result p').filter({hasText:/흐름 지수 \d+ \/ 100/}).count(),19);
 await page.getByText('계산 기준',{exact:true}).click();await page.getByText('음력 1989-12-05',{exact:false}).waitFor();
 await page.locator('details.paper').first().locator('summary').click();await page.getByText('2026-01-15',{exact:false}).first().waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(process.env.TOSS_CAPTURE_DIR){await mkdir(process.env.TOSS_CAPTURE_DIR,{recursive:true});await page.screenshot({path:join(process.env.TOSS_CAPTURE_DIR,'sukuyo-yearly.png'),fullPage:true});}
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')).orders.length),0);
 await open();await read();assert.equal(await page.locator('.sukuyo-basic-result').innerText(),text);
 await page.getByLabel('살펴볼 연도').fill('2028');await page.getByRole('button',{name:'1년운 살펴보기',exact:true}).click();await page.getByRole('alert').filter({hasText:'2026년·2027년'}).waitFor();
 console.log('PASS Sukuyo yearly: home, login, original 12-month example, zero purchase, deterministic reopen, unsupported mock year closed');
}
