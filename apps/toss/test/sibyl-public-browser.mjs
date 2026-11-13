import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {handleSibylRoutes} from '../../../worker/routes/sibyl.js';
const origin='http://127.0.0.1:'+Number(process.env.TOSS_TEST_PORT||4391),browser=await chromium.launch({channel:'chrome'});
try{
 const ctx=await browser.newContext({viewport:{width:360,height:740},isMobile:true,serviceWorkers:'block'});
 const reports=[],extra=[];
 await ctx.route('**/*',async route=>{
  const req=route.request(),u=new URL(req.url());if(u.origin===origin)return route.continue();
  if(u.pathname!=='/api/toss/canonical/sibyl/preview'){if(req.method()==='POST')extra.push(u.pathname);return route.abort();}
  const input=req.postDataJSON(),resp=await handleSibylRoutes(new Request('https://local.invalid/api/sibyl/preview',{method:'POST',body:JSON.stringify(input)}),{});
  const data=await resp.json();assert.equal(resp.status,200,JSON.stringify(data));reports.push(data.preview);
  return route.fulfill({status:resp.status,contentType:'application/json',body:JSON.stringify(data)});
 });
 const p=await ctx.newPage();p.setDefaultTimeout(60000);
 await p.goto(origin);await p.locator('.world-entry-ggulggul').click();await p.getByRole('button',{name:/사주 리포트/}).click();
 await p.getByRole('button',{name:'시빌라 연간 대비 리포트'}).click();await p.getByLabel('태어난 날짜').fill('1990-05-15');await p.getByRole('checkbox').check();await p.getByLabel('계산에 사용하는 성별').selectOption('F');await p.getByLabel('출생 도시').selectOption('서울');
 await p.getByRole('button',{name:'연간 흐름 읽기'}).click();await p.locator('.toss-compat article').waitFor();
 await p.locator('.toss-compat img').evaluate(i=>i.decode());
 assert.ok((await p.locator('.toss-compat article').innerText()).includes(reports[0].summary));
 const year=reports[0].year+1;assert.equal(await p.getByLabel('분석할 연도').locator('option').count(),10);
 await p.getByLabel('분석할 연도').selectOption(String(year));await p.getByRole('heading',{name:year+'년 대비 분석'}).waitFor();
 for(const trait of reports[1].traits)await p.getByText(trait.caution,{exact:true}).waitFor();
 await p.getByText(reports[1].action,{exact:true}).waitFor();assert.deepEqual(extra,[]);
 console.log('PASS 360px home → guest birth → original annual preview, traits and actions → alternate year.');
}finally{await browser.close();}
