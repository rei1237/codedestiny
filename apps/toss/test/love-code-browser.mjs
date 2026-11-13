import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const origin=process.env.TOSS_OFFLINE_ORIGIN||'http://127.0.0.1:4329';
assert.equal(new URL(origin).hostname,'127.0.0.1');
const browser=await chromium.launch({channel:'chrome'});
try{
 const ctx=await browser.newContext({viewport:{width:360,height:740},isMobile:true,reducedMotion:'reduce',serviceWorkers:'block'});
 const foreign=[];
 await ctx.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin===origin)return route.continue();if(route.request().method()==='POST')foreign.push(u.pathname);return route.abort();});
 const p=await ctx.newPage();p.setDefaultTimeout(25000);
 await p.goto(origin);await p.locator('.world-entry-ggulggul').click();await p.getByRole('button',{name:/사주 리포트/}).click();
 await p.getByRole('button',{name:/러브 코드/}).click();
 await p.getByRole('button',{name:'캐릭터 선택하기'}).click();
 assert.equal(await p.locator('article[aria-expanded]').count(),16);
 async function pick(){
  const card=p.locator('article[aria-expanded]').filter({hasText:'네오'}).last();await card.click();await card.locator('img').first().evaluate(img=>img.decode());
  await card.getByRole('button',{name:'무료로 시작'}).click();
 }
 await pick();await p.getByRole('button',{name:'토스로 로그인하기'}).click();
 await p.getByText('내 출생정보로 궁합 보기',{exact:true}).click();
 const own=p.getByRole('group',{name:'나의 출생정보'});await own.getByLabel('태어난 날짜').fill('1990-05-15');await own.getByRole('checkbox').check();await own.getByLabel('계산에 사용하는 성별').selectOption('F');await own.getByLabel('출생 도시').selectOption('서울');
 await p.getByRole('button',{name:'내 출생정보 적용'}).click();await p.getByText('내 출생정보를 적용했어요.').waitFor();
 await p.locator('#lovePartnerBirthDate').fill('19910521');await p.getByRole('button',{name:'상대 정보로 매칭 시작'}).click();
 await p.getByRole('button',{name:/형 시뮬레이션 시작하기/}).waitFor();
 await p.getByRole('button',{name:'캐릭터 선택하기'}).click();await pick();
 let scenes=0;
 for(;scenes<25;scenes++){
   await p.getByRole('button',{name:'중요한 순간에 대답 선택하기'}).click();
   const choices=p.locator('button.min-h-14.text-left');await choices.first().click();
   const next=p.getByRole('button',{name:/^(다음 장면|결과 보기)$/});const end=await next.innerText()==='결과 보기';
   await next.click();if(end){scenes++;break;}
 }
 assert.ok(scenes>=10&&scenes<25);
 await p.getByText('Saju Compatibility',{exact:true}).waitFor();
 assert.ok((await p.locator('body').innerText()).length>750);const layout=await p.evaluate(()=>({width:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>360).slice(0,6).map(el=>[el.tagName,el.className,Math.round(el.getBoundingClientRect().right)])}));assert.equal(layout.width,360,JSON.stringify(layout));
 assert.deepEqual(foreign,[]);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-fixture')).orders.length),0);
 console.log('PASS home → 16 original characters → guest login → own chart + partner calculation → Neo choices and personal ending.',scenes,'scenes');
}finally{await browser.close();}
