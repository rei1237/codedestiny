import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin='http://127.0.0.1:'+Number(process.env.TOSS_TEST_PORT||4329);
const browser=await chromium.launch({channel:'chrome'});
const ctx=await browser.newContext({viewport:{width:360,height:740},serviceWorkers:'block',reducedMotion:'reduce'});
ctx.setDefaultTimeout(25000);
await ctx.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
const p=await ctx.newPage();p.on('pageerror',e=>console.error(e.message));
async function home(){await p.goto(origin);await p.locator('.world-entry-yeongnyangi').click();}
try{
 await home();await p.getByRole('button',{name:'타로 상담',exact:false}).first().click();
 await p.locator('#yn-question').fill('지금 직장에서 어떤 장점을 먼저 살려보면 좋을까요?');
 await p.getByRole('button',{name:'상담과 결제 확인하기'}).click();
 await p.getByRole('button',{name:'토스로 로그인하기'}).click();await p.getByRole('button',{name:'토스로 로그인하기'}).click();
 await p.locator('[data-yn-checkout]').getByRole('button',{name:'카드 고르고 결제 확인하기'}).click();
 const pick=p.locator('section[aria-labelledby="tarot-pick-heading"]');await pick.waitFor();
 let state=await p.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-fixture')));
 assert.equal(state.orders.length,0);
 const saved=state.fortunes[0][1].fortune;
 assert.equal(saved.state,'AWAITING_DRAW');
 const deck=pick.getByRole('group');assert.equal(await deck.getByRole('button').count(),78);
 for(let i=0;i<saved.tarotSpread.cardCount;i++)await deck.getByRole('button').nth(i).click();
 await pick.getByRole('button',{name:'이 카드로 정하고 결제하기'}).click();
 const checkout=p.locator('[data-yn-checkout]');await checkout.waitFor();
 await checkout.getByRole('button',{name:'단건 결제로 상담 시작하기'}).click();
 await p.getByText(/이 문단은 화면과 구매 후 열람/).first().waitFor();
 await home();await p.getByRole('link',{name:'영냥이 보관함'}).click();
 await p.locator('a[href*="'+saved.id+'"]').first().click();await p.getByText(/이 문단은 화면과 구매 후 열람/).first().waitFor();
 state=await p.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-fixture')));
 assert.deepEqual([state.orders.length,state.fortunes.length,state.fortunes[0][1].generationCount],[1,1,1]);
 assert.deepEqual(state.fortunes[0][1].fortune.tarotSpread.picks,Array.from({length:saved.tarotSpread.cardCount},(_,i)=>i));
 console.log('PASS 영냥이 홈→원본 타로 질문→결제 전 수동 선택→모의 구매→영냥이 보관함 원문, 카드 확정 전 주문 0');
}catch(e){console.error(p.url(),(await p.locator('body').innerText()).slice(-1800));throw e;}finally{await browser.close();}
