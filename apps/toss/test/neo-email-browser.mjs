import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='http://127.0.0.1:'+Number(process.env.TOSS_TEST_PORT||4329);
const browser=await chromium.launch({channel:'chrome'});
const context=await browser.newContext({viewport:{width:360,height:740},isMobile:true,serviceWorkers:'block'});
context.setDefaultTimeout(25000);await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
const question='새 업무를 시작할 때 어떤 조건을 확인할까요?';
async function open(p){await p.goto(origin);await p.locator('.world-entry-ggulggul').click();await p.getByRole('button',{name:'네오 작전 결정서 · 이메일 상담'}).click();}
async function login(p){await p.getByRole('link',{name:'토스로 로그인하기'}).click();await p.getByRole('button',{name:'토스로 로그인하기'}).click();}
try{
 const p=await context.newPage();p.on('pageerror',e=>console.error(e.message));await open(p);await login(p);
 await p.getByRole('button',{name:'직장과 상사'}).click();await p.locator('#neo-q-0').fill(question);await p.getByLabel(/자미두수 추가/).check();await p.waitForFunction(q=>Object.entries(localStorage).some(([k,v])=>k.startsWith('toss:neo-email-questions:')&&v.includes(q)),question);await p.reload();assert.equal(await p.locator('#neo-q-0').inputValue(),question);
 await p.getByRole('button',{name:'다음',exact:true}).click();await p.locator('#neo-birth').fill('19900101');await p.locator('#neo-time').fill('0830');
 await p.locator('#neo-email').fill('fixture@example.invalid');await p.getByRole('checkbox',{name:/개인정보 수집/}).check();await p.getByRole('button',{name:'다음',exact:true}).click();
 await p.getByRole('button',{name:'모의 결제로 상담 신청하기'}).click();await p.getByRole('heading',{name:'접수 완료'}).waitFor();
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const href=p.url();await p.close();const q=await context.newPage();await open(q);
 await q.getByRole('button',{name:'구매 기록 확인하기',exact:true}).click();await q.getByRole('button',{name:new RegExp('새 업무를 시작할 때')}).click();
 await q.getByRole('heading',{name:'접수한 질문'}).waitFor();await q.getByText(question+' · 사주 + 자미두수').waitFor();
 const state=await q.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-neo-email:offline-test-user')));
 assert.equal(Object.keys(state.rows).length,1);assert.equal(Object.keys(state.payments).length,1);
 const row=Object.values(state.rows)[0];assert.equal(row.deliveryMode,'manual_email');assert.equal(row.questions[0].readingMode,'saju_ziwei');
 assert.deepEqual(row.deliveries,[]);assert.equal(row.mailJobs.filter(job=>job.kind==='receipt').length,1);
 await q.goto(origin);await q.getByRole('button',{name:'내 정보',exact:true}).click();await q.getByRole('button',{name:'로그아웃',exact:true}).click();await q.getByText('로그아웃했어요.').waitFor();
 await q.evaluate(()=>localStorage.setItem('toss-offline-login-person','second'));await open(q);await login(q);await q.waitForFunction(()=>JSON.parse(localStorage.getItem('toss-offline-fixture-2')||'{}').loggedIn===true);
 await q.goto(href);await q.getByRole('alert').waitFor();assert.equal(await q.getByText(question,{exact:false}).count(),0);
 console.log('PASS 모의 이메일 견적→접수→저장된 질문 재열람, 같은 기기 다른 계정 차단, 실메일·웹 결제 없음');
}catch(e){for(const p of context.pages())console.error(p.url(),(await p.locator('body').innerText()).slice(-1400));throw e;}finally{await browser.close();}
