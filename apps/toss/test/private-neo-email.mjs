import assert from 'node:assert/strict';
export async function verifyPrivateNeoEmail(origin,context){
 let page=await context.newPage();page.setDefaultTimeout(25000);
 const question='새 업무를 시작할 때 어떤 조건을 확인할까요?';
 const open=async()=>{await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('button',{name:'네오 작전 결정서 · 이메일 상담'}).click();};
 const login=async()=>{await page.getByRole('link',{name:'토스로 로그인하기'}).click();await page.getByRole('button',{name:'토스로 로그인하기'}).click();};
 try{
  await open();await login();await page.getByRole('button',{name:'직장과 상사'}).click();await page.locator('#neo-q-0').fill(question);await page.getByLabel(/자미두수 추가/).check();
  await page.waitForFunction(q=>Object.entries(localStorage).some(([key,value])=>key.startsWith('toss:neo-email-questions:')&&value.includes(q)),question);await page.reload();assert.equal(await page.locator('#neo-q-0').inputValue(),question);
  await page.getByRole('button',{name:'다음',exact:true}).click();await page.locator('#neo-birth').fill('19900101');await page.locator('#neo-time').fill('0830');await page.locator('#neo-email').fill('fixture@example.invalid');await page.getByRole('checkbox',{name:/개인정보 수집/}).check();await page.getByRole('button',{name:'다음',exact:true}).click();
  await page.getByRole('button',{name:'모의 결제로 상담 신청하기'}).click();await page.getByRole('heading',{name:'접수 완료'}).waitFor();const resultUrl=page.url();
  await page.close();page=await context.newPage();page.setDefaultTimeout(25000);await open();await page.getByRole('button',{name:'구매 기록 확인하기',exact:true}).click();await page.getByRole('button',{name:/새 업무를 시작할 때/}).click();await page.getByRole('heading',{name:'접수한 질문'}).waitFor();await page.getByText(question+' · 사주 + 자미두수').waitFor();
  const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-neo-email:private-simulation-person-A')));assert.equal(Object.keys(state.rows).length,1);assert.equal(Object.keys(state.payments).length,1);const row=Object.values(state.rows)[0];assert.equal(row.deliveryMode,'manual_email');assert.equal(row.questions[0].readingMode,'saju_ziwei');assert.deepEqual(row.deliveries,[]);assert.equal(row.mailJobs.filter(job=>job.kind==='receipt').length,1);
  for(const width of [360,390,430]){await page.setViewportSize({width,height:740});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
  await page.getByRole('button',{name:'취소·전액 환불 요청하기',exact:true}).click();await page.getByRole('heading',{name:'취소·환불 요청 접수'}).waitFor();await page.goto(resultUrl);await page.getByRole('heading',{name:'취소·환불 요청 접수'}).waitFor();
  await Promise.all([page.waitForEvent('load'),page.getByLabel('모의 계정',{exact:true}).selectOption('B')]);await open();await login();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('consultations')||'{}').loggedIn===true);await page.goto(resultUrl);await page.getByRole('alert').waitFor();assert.equal(await page.getByText(question,{exact:false}).count(),0);
  console.log('PASS private Neo email: home, question draft, original quote, mock receipt, same-owner status reread, B denial, 3 widths, no external mail/generated answer');
 }catch(error){console.error(page.url(),(await page.locator('body').innerText()).slice(-1800));throw error;}finally{await page.close();}
}
