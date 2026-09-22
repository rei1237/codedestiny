import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {fixtures} from './lib/yeongnyangi-mobile-payment.mjs';
const base=process.env.YEONGNYANGI_TEST_BASE || 'http://127.0.0.1:18016';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));
const compiled=await build({stdin:{contents:"export {products} from './worker/yeongnyangi/payments/catalog'; export {createConsultation,consultationClock} from './worker/yeongnyangi/fortune/consultation';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const {products,createConsultation,consultationClock}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
await mkdir('build-cache/yeongnyangi-consultation-ui',{recursive:true});
const browser=await chromium.launch({headless:true});const results=[];
try{
 for(const width of [360,390,430,1280]){
  const f=await fixtures(browser,base,products.find(p=>p.id==='saju_mackerel'),width);
  try{
   f.state.prepareConsultation=(input,row)=>createConsultation(input.question,input.topicId,consultationClock(input.timezone,new Date('2026-09-22T00:00:00Z')),row.manifest);
   await f.page.goto(base+'/');
   const cta=f.page.getByRole('button',{name:'영냥이에게 상담하기',exact:true});await cta.waitFor();
   const box=await cta.boundingBox();assert.ok(box&&box.y>=0&&box.y+box.height<=844,`CTA is in first viewport at ${width}`);
   assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await f.page.screenshot({path:`build-cache/yeongnyangi-consultation-ui/home-${width}.png`});
   await cta.click();await f.page.waitForURL('**/yeongnyangi/fortune/**');
   await f.page.getByLabel('상담 주제',{exact:true}).selectOption('love');
   const question='2027년 3~5월에 사업을 시작해도 될까요?\n이직 준비는 어떻게 할까요?';
   await f.page.getByLabel('영냥이에게 궁금한 이야기',{exact:true}).fill(question);
   // A same-route pre-login draft is restored before the server snapshot exists.
   await f.page.evaluate(q=>sessionStorage.setItem('yeongnyangi:consultation-login-draft',JSON.stringify({path:location.pathname+location.search,productId:'saju_mackerel',topicId:'love',question:q,savedAt:Date.now()})),question);
   await f.page.reload();
   await f.page.getByLabel('영냥이에게 궁금한 이야기',{exact:true}).waitFor();
   await f.page.waitForFunction(q=>document.querySelector('textarea')?.value===q,question);
   assert.equal(await f.page.getByLabel('상담 주제',{exact:true}).inputValue(),'love');
   const submit=f.page.getByRole('button',{name:'결제 내용 확인하기',exact:true});await submit.click();
   await f.page.waitForURL('**/checkout/**');
   assert.equal(f.state.requestInput.question,question);assert.equal(f.state.requestInput.topicId,'love');assert.ok(f.state.requestInput.timezone);
   assert.equal(await f.page.evaluate(()=>sessionStorage.getItem('yeongnyangi:consultation-login-draft')),null);
   const original=structuredClone(f.row.consultation);
   // Transport-only paid fixture; real PG/LLM calls are blocked.
   f.row.paid=true;f.row.state='PAID';
   await f.page.goto(base+'/yeongnyangi/result/?id='+f.row.id);
   await f.page.getByText('네 이야기를 모두 펼쳐두었어. 천천히 읽어봐.').waitFor();
   await f.page.getByRole('region',{name:'이번 상담의 주제와 질문'}).getByText(question,{exact:true}).waitFor();
   assert.equal(await f.page.getByRole('heading',{name:'해석의 근거',exact:true}).count(),2);
   assert.equal(await f.page.getByText(/saju\.fiveElements/).count(),0);
   await f.page.reload();await f.page.getByText('네 이야기를 모두 펼쳐두었어. 천천히 읽어봐.').waitFor();
   assert.deepEqual(f.row.consultation,original);assert.equal(f.state.generates,f.row.manifest.length);
   assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await f.page.screenshot({path:`build-cache/yeongnyangi-consultation-ui/result-${width}.png`});
   results.push({width,status:'PASS',questions:2,chapters:f.row.chapters.length,realLlmCalls:0,realPgCalls:0});
  }catch(error){await f.page.screenshot({path:`build-cache/yeongnyangi-consultation-ui/failure-${width}.png`});console.error(JSON.stringify({url:f.page.url(),errors:f.state.errors,unknown:f.state.unknown,body:(await f.page.locator('body').innerText()).slice(0,1800)}));throw error;}finally{await f.context.close();}
 }
}finally{await browser.close();await writeFile('build-cache/yeongnyangi-consultation-ui/result.json',JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));
