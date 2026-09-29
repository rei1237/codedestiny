import './lib/mock-network-guard.cjs';
import {chromium} from '@playwright/test';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:3147';
const bundle=await build({stdin:{contents:"export * from './lib/fortune/question-journey';",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,format:'esm',platform:'node'});
const {questionGuides,contextualQuestionGuides,questionOffer,questionCheckoutHref,getQuestionGuide}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
for(const q of [...questionGuides,...contextualQuestionGuides]){const o=questionOffer(q);assert.ok(o.chapters.length>=3);assert.ok(o.product.priceKRW>0);assert.equal(new URL(questionCheckoutHref(q),base).searchParams.get('questionId'),q.id);}
assert.equal(getQuestionGuide('__proto__'),undefined);
const browser=await chromium.launch({headless:true});
const output='.tmp/question-journey';await mkdir(output,{recursive:true});
const results=[];
try{for(const width of [360,390,430,1280]){
 const context=await browser.newContext({viewport:{width,height:900}});
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.pathname.startsWith('/api/'))return route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:'LOGIN_REQUIRED'})});if(u.origin===base)return route.continue();return route.abort();});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?question=reconnect#questions');
 const reading=page.locator('#question-reading');await reading.getByRole('heading',{name:'그 사람은 다시 연락해올까?',exact:true}).waitFor();
 assert.ok((await reading.innerText()).includes('개인 운세를 계산한 결과는 아니에요'));
 assert.ok((await reading.getByRole('link',{name:'이 질문의 상담 구성 확인하기'}).getAttribute('href')).includes('consultationKind=love'));
 await page.locator('#questions').scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/questions-${width}.png`});
 for(const q of questionGuides.slice(0,4)){await page.locator('#questions').getByRole('button',{name:new RegExp(q.question.replace(/[?]/g,'\\?'))}).click();await reading.getByRole('heading',{name:q.question,exact:true}).waitFor();}
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await page.goto(base+'/yeongnyangi/readings/saju/');await page.getByRole('heading',{name:'이런 상황에 잘 맞아요'}).waitFor();await page.screenshot({path:`${output}/product-${width}.png`});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 assert.deepEqual(errors,[]);results.push({width,questions:4,overflow:false,pageErrors:0});await context.close();
}}finally{await browser.close();}
await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify({passed:true,results},null,2));
