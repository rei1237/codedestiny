import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {fixtures} from './lib/yeongnyangi-mobile-payment.mjs';
const base=process.env.YEONGNYANGI_TEST_BASE||'http://127.0.0.1:18019';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));
const compiled=await build({stdin:{contents:"export {getProduct} from './worker/yeongnyangi/payments/catalog'; export {spiritManifest,spiritPublic} from './worker/yeongnyangi/fortune/spirit'; export {readingManifest} from './worker/yeongnyangi/fortune/reading-manifest'; export {createConsultation,consultationClock} from './worker/yeongnyangi/fortune/consultation'; export * from './worker/yeongnyangi/fortune/spirit-contract';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const {getProduct,readingManifest,spiritManifest,spiritPublic,consultationClock,createConsultation,SPIRIT_TITLE,SPIRIT_IMAGE,SPIRIT_TIMING}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const output='build-cache/yeongnyangi-spirit-ui';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true}),results=[];
try{
 for(const width of [390,1280]){
  const product=getProduct('saju_mackerel'),f=await fixtures(browser,base,product,width);
  f.page.on('pageerror',error=>console.error(error.stack));
  f.state.holdGeneration=true;f.state.generationBoundary=0;
  f.row.manifest=spiritManifest(readingManifest(product));
  await f.context.addInitScript(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__anonymousShare=data;}});});
  try{
   f.state.prepareConsultation=(input,row)=>({...createConsultation(input.question,input.topicId,consultationClock(input.timezone),row.manifest),spirit:spiritPublic(input.spirit,new Date().toISOString()),topicLabel:'공간의 기운'});
   await f.page.goto(base+'/yeongnyangi/fortune/?mode=spirit');
   await f.page.getByRole('heading',{name:SPIRIT_TITLE,exact:true}).waitFor();
   await f.page.getByLabel('영냥이에게 궁금한 이야기',{exact:true}).fill('재회할까요?\n연락을 기다려도 될까요?');
   await f.page.getByLabel('그 사람과 나의 관계',{exact:true}).selectOption('헤어진 사이');
   await f.page.getByLabel('상대가 연락을 거절하거나 차단한 상황이에요').check();
   await f.page.getByLabel('이미 알고 있는 상황 (선택)').fill('연락이 끊겼어요.');
   assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await f.page.screenshot({path:`${output}/input-${width}.png`,fullPage:true});
   await f.page.getByRole('button',{name:'결제 내용 확인하기',exact:true}).click();
   await f.page.waitForURL('**/checkout/**');
   assert.equal(f.state.creates,1);assert.equal(f.state.requestInput.mode,'spirit-v1');assert.equal(f.state.requestInput.spirit.boundary,true);
   assert.equal(f.state.requestInput.partnerProfileId,undefined);
   f.row.product={...product,name:SPIRIT_TITLE,image:SPIRIT_IMAGE};f.row.paid=true;f.row.state='PAID';
   const chapters=f.row.manifest.map((c,i)=>({summary:`${i+1}번째 모의 해석: 확인한 사실과 추측을 나누어 보자.`,analysis:[],example:'보내지 않을 글에 내 감정을 적어보는 가상의 연습이야.',advice:'지금은 나의 일상을 돌보고 경계를 존중하자.',persona:'알 수 없는 마음 앞에서도 네 하루는 소중하다냥.',blocks:[{title:'모의 화면 검증',paragraphs:['계산 해석의 적중을 검증하는 내용이 아니라 화면의 읽기 흐름을 확인하는 mock 자료입니다.']}],questionAnswers:i===0?f.row.consultation.questions.map(q=>({questionId:q.id,answer:'지금 할 수 있는 선택에 집중해 보자.',reason:'나의 반복되는 선택을 참고해서 살펴보자.',timing:SPIRIT_TIMING,action:'추측보다 나의 일상을 돌아보자.'})):[]}));
   f.row.chapters=chapters.slice(0,2);
   await f.page.goto(base+'/yeongnyangi/result/?id='+f.row.id);
   await f.page.getByText(/2\/5 저장됨/).waitFor();
   await f.page.reload();await f.page.getByText(/2\/5 저장됨/).waitFor();
   assert.equal(f.state.generates,0,'reload must not generate another paid result');
   f.row.chapters=chapters;f.row.state='COMPLETED';
   await f.page.getByRole('heading',{name:'영냥이의 마무리',exact:true}).waitFor();
   const text=await f.page.locator('body').innerText();
   assert.doesNotMatch(text,/호라리|하우스|어센던트|시그니피케이터|십성|용신|saju\.|fiveElements|Gemini/);
   assert.match(text,/공간을 좁힐 근거가 없어/);assert.match(text,/사건의 시기를 판단할 근거가 없/);
   assert.equal(await f.page.getByRole('heading',{name:'재회할까요?',exact:true}).count(),1);
   await f.page.getByRole('button',{name:'익명 요약 공유하기'}).click();
   const share=await f.page.evaluate(()=>window.__anonymousShare);assert.doesNotMatch(JSON.stringify(share),/재회할까요|QA 고객|1990|id=|차단/);
   assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await f.page.screenshot({path:`${output}/result-${width}.png`,fullPage:true});
   await f.page.getByRole('link',{name:'내 상담 기록',exact:true}).click();await f.page.getByRole('heading',{name:'내 상담 기록',exact:true}).waitFor();
   await f.page.getByRole('link').filter({hasText:SPIRIT_TITLE}).click();await f.page.getByRole('heading',{name:'영냥이의 마무리',exact:true}).waitFor();
   assert.equal(f.state.generates,0);assert.equal(f.state.sdk.length,0);assert.deepEqual(f.state.errors,[]);
   results.push({width,status:'PASS',partialReload:true,libraryReread:true,anonymousShare:true,realLlmCalls:0,realPgCalls:0});
  }catch(error){await f.page.screenshot({path:`${output}/failure-${width}.png`,fullPage:true});console.error(JSON.stringify({errors:f.state.errors,unknown:f.state.unknown,url:f.page.url()}));throw error;}finally{await f.context.close();}
 }
}finally{await browser.close();await writeFile(`${output}/result.json`,JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));
