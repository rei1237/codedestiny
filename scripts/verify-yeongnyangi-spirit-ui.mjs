import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {fixtures} from './lib/yeongnyangi-mobile-payment.mjs';
const base=process.env.YEONGNYANGI_TEST_BASE||'http://127.0.0.1:18019';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname));
const compiled=await build({stdin:{contents:"export {getProduct} from './worker/yeongnyangi/payments/catalog'; export {skyManifest} from './worker/yeongnyangi/fortune/question-sky-reading';export * from './worker/yeongnyangi/fortune/question-sky-contract'; export {readingManifest} from './worker/yeongnyangi/fortune/reading-manifest'; export {createConsultation,consultationClock} from './worker/yeongnyangi/fortune/consultation'; export * from './worker/yeongnyangi/fortune/spirit-contract';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const {getProduct,readingManifest,skyManifest,consultationClock,createConsultation,skyModes,SKY_IMAGE,SKY_TIMING,SPIRIT_NOTICE}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const output='build-cache/yeongnyangi-spirit-ui';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true}),results=[];
try{
 for(const mode of ['prashna-v1','horary-v1'])for(const width of [390,1280]){
  const title=skyModes[mode],routeMode=mode==='prashna-v1'?'spirit':'horary';
  const product=getProduct('saju_mackerel'),f=await fixtures(browser,base,product,width);
  f.page.on('pageerror',error=>console.error(error.stack));
  f.state.holdGeneration=true;f.state.generationBoundary=0;
  f.row.manifest=skyManifest(readingManifest(product),{domain:mode==='prashna-v1'?'vedic':'astrology',facts:[{id:'question',label:'질문의 결',value:'mock'}]});
  await f.context.addInitScript(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__anonymousShare=data;}});});
  try{
   f.state.prepareConsultation=(input,row)=>({...createConsultation(input.question,input.questionSky.topic,consultationClock('Asia/Seoul'),row.manifest),questionSky:{...input.questionSky,mode,askedAt:'2026-09-21T01:00:00Z',receivedAt:new Date().toISOString(),cityName:'서울',timezone:'Asia/Seoul',space:'일과 정돈을 연상시키는 자리의 상징이야. 실제 소재지를 알아낸 뜻은 아니야.',timing:SKY_TIMING,notice:SPIRIT_NOTICE,shareKey:'steady'},topicLabel:'공간의 기운'});
   if(mode==='prashna-v1'){
    await f.page.goto(base+'/');
    await f.page.getByRole('button',{name:'영냥이에게 상담하기',exact:true}).click({trial:true});
    const entry=f.page.getByRole('complementary',{name:'질문 순간의 상담'});
    await entry.waitFor();await entry.locator('img').evaluate(img=>img.decode());
    assert.equal(await entry.getByRole('link',{name:/영냥 신점/}).getAttribute('href'),'/yeongnyangi/fortune/?mode=spirit');
    assert.equal(await entry.getByRole('link',{name:/영냥 호라리/}).getAttribute('href'),'/yeongnyangi/fortune/?mode=horary');
    await entry.evaluate(el=>window.scrollTo(0,Math.max(0,el.getBoundingClientRect().top+window.scrollY-180)));
    await entry.screenshot({path:`${output}/home-entry-${width}.png`});
    await f.page.screenshot({path:`${output}/home-${width}.png`,fullPage:true});
    await entry.getByRole('link',{name:/영냥 신점/}).click();
    await f.page.waitForURL('**/fortune/?mode=spirit');
   }
   await f.page.goto(base+'/yeongnyangi/fortune/?mode='+routeMode);
   await f.page.getByRole('heading',{name:title,exact:true}).waitFor();
   await f.page.getByLabel('영냥이에게 궁금한 이야기',{exact:true}).fill('재회할까요?\n연락을 기다려도 될까요?');
   await f.page.getByLabel('그 사람과 나의 관계',{exact:true}).selectOption('헤어진 사이');
   await f.page.getByLabel('질문이 떠올랐을 때 내가 있던 도시',{exact:true}).selectOption('seoul');
   await f.page.getByLabel('질문이 떠오른 날짜와 시각 (선택한 도시의 현지 시간)',{exact:true}).fill('2026-09-21T10:00');
   assert.equal(await f.page.getByText('내 출생정보',{exact:true}).count(),0);
   await f.page.getByLabel('상대가 연락을 거절하거나 차단한 상황이에요').check();
   await f.page.getByLabel('이미 알고 있는 상황 (선택)').fill('연락이 끊겼어요.');
   assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await f.page.screenshot({path:`${output}/input-${mode}-${width}.png`,fullPage:true});
   await f.page.getByRole('button',{name:'결제 내용 확인하기',exact:true}).click();
   await f.page.waitForURL('**/checkout/**');
   assert.equal(f.state.creates,1);assert.equal(f.state.requestInput.mode,mode);assert.equal(f.state.requestInput.questionSky.boundary,true);assert.equal(f.state.requestInput.profileId,undefined);
   assert.equal(f.state.requestInput.partnerProfileId,undefined);
   f.row.product={...product,name:title,image:SKY_IMAGE};f.row.paid=true;f.row.state='PAID';
   const chapters=f.row.manifest.map((c,i)=>({summary:`${i+1}번째 모의 해석: 확인한 사실과 추측을 나누어 보자.`,analysis:[],example:'보내지 않을 글에 내 감정을 적어보는 가상의 연습이야.',advice:'지금은 나의 일상을 돌보고 경계를 존중하자.',persona:'알 수 없는 마음 앞에서도 네 하루는 소중하다냥.',blocks:[{title:'모의 화면 검증',paragraphs:['계산 해석의 적중을 검증하는 내용이 아니라 화면의 읽기 흐름을 확인하는 mock 자료입니다.']}],questionAnswers:i===0?f.row.consultation.questions.map(q=>({questionId:q.id,answer:'지금 할 수 있는 선택에 집중해 보자.',reason:'나의 반복되는 선택을 참고해서 살펴보자.',timing:SKY_TIMING,action:'추측보다 나의 일상을 돌아보자.'})):[]}));
   f.row.chapters=chapters.slice(0,2);
   await f.page.goto(base+'/yeongnyangi/result/?id='+f.row.id);
   await f.page.getByText(/2\/5 저장됨/).waitFor();
   await f.page.reload();await f.page.getByText(/2\/5 저장됨/).waitFor();
   assert.equal(f.state.generates,0,'reload must not generate another paid result');
   f.row.chapters=chapters;f.row.state='COMPLETED';
   await f.page.getByRole('heading',{name:'영냥이의 마무리',exact:true}).waitFor();
   const text=await f.page.locator('body').innerText();
   assert.doesNotMatch(text,/하우스|어센던트|시그니피케이터|십성|용신|saju\.|fiveElements|Gemini/);
   assert.match(text,/실제 소재지를 알아낸 뜻은 아니야/);assert.match(text,/사건이 일어날 날짜나 기간/);
   assert.equal(await f.page.getByRole('heading',{name:'재회할까요?',exact:true}).count(),1);
   await f.page.getByRole('button',{name:'익명 요약 공유하기'}).click();
   const share=await f.page.evaluate(()=>window.__anonymousShare);assert.doesNotMatch(JSON.stringify(share),/재회할까요|QA 고객|1990|id=|차단/);
   assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await f.page.screenshot({path:`${output}/result-${mode}-${width}.png`,fullPage:true});
   await f.page.getByRole('link',{name:'내 상담 기록',exact:true}).click();await f.page.getByRole('heading',{name:'내 상담 기록',exact:true}).waitFor();
   await f.page.getByRole('link').filter({hasText:title}).click();await f.page.getByRole('heading',{name:'영냥이의 마무리',exact:true}).waitFor();
   assert.equal(f.state.generates,0);assert.equal(f.state.sdk.length,0);assert.deepEqual(f.state.errors,[]);
   results.push({mode,width,status:'PASS',partialReload:true,libraryReread:true,anonymousShare:true,realLlmCalls:0,realPgCalls:0});
  }catch(error){await f.page.screenshot({path:`${output}/failure-${mode}-${width}.png`,fullPage:true});console.error(JSON.stringify({errors:f.state.errors,unknown:f.state.unknown,url:f.page.url()}));throw error;}finally{await f.context.close();}
 }
}finally{await browser.close();await writeFile(`${output}/result.json`,JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));
