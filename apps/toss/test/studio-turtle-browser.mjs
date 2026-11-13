import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {turtleModule} from '../canonical/turtle-oracle.mjs';
const {castTurtle}=await import('data:text/javascript;base64,'+Buffer.from(turtleModule()).toString('base64'));
const origin=process.env.TOSS_OFFLINE_ORIGIN||'http://127.0.0.1:4329';
assert.equal(new URL(origin).hostname,'127.0.0.1');
const seen=new Set();
for(let seed=0;seed<25000&&seen.size<64;seed++){const r=castTurtle('진로가 궁금해요',seed);assert.equal(r.categories.length,5);assert.ok(r.answer.advice&&r.prompt);seen.add(r.hexName);}
assert.equal(seen.size,64);
const browser=await chromium.launch({channel:'chrome'});
try{
 const context=await browser.newContext({viewport:{width:360,height:740},serviceWorkers:'block',reducedMotion:'reduce'});
 const requests=[];
 await context.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==origin)return route.abort();requests.push(url.pathname);return route.continue();});
 const page=await context.newPage();await page.goto(origin);await page.locator('.world-entry-ggulggul').click();
 await page.getByRole('button',{name:/주역 거북점/}).click();
 await page.getByLabel('거북에게 묻고 싶은 질문').fill('나의 진로를 바꿔도 될까요?');
 const button=page.getByRole('button',{name:'거북 등껍질 길게 누르기'});
 await button.focus();await page.clock.install();await page.keyboard.down('Space');await page.clock.runFor(1000);await page.keyboard.up('Space');
 assert.equal(await page.getByRole('article').count(),0);
 await button.focus();await page.keyboard.down('Space');await page.clock.runFor(2300);await page.keyboard.up('Space');
 for(const title of ['질문의 메아리','오늘의 대성괘','체용의 형세','집중된 통찰','분야별 통변','물음에 답하는 옛 지혜','갈무리'])await page.getByRole('heading',{name:title,exact:true}).waitFor();
 await page.getByText('주역 전문가 프롬프트',{exact:true}).click();assert.match(await page.locator('details').innerText(),/나의 진로를 바꿔도 될까요/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),360);
 await page.getByRole('button',{name:'다시 물어보기'}).click();assert.equal(await page.getByLabel('거북에게 묻고 싶은 질문').inputValue(),'나의 진로를 바꿔도 될까요?');
 assert.equal(requests.some(path=>/\/auth\/me|\/checkout|\/orders\//.test(path)),false);
 console.log('PASS 64 King Wen draws, guest home → question → long press → seven sections, original expert prompt, retry.');
}finally{await browser.close();}
