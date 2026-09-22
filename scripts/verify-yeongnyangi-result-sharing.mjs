import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {fixtures} from './lib/yeongnyangi-mobile-payment.mjs';
const base=process.env.YEONGNYANGI_TEST_BASE||'http://127.0.0.1:14096';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const built=await build({entryPoints:['worker/yeongnyangi/payments/catalog.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {products}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const output='build-cache/yeongnyangi-result-sharing';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true}),results=[];
try{
 for(const width of [360,390,430,1280]){
  const f=await fixtures(browser,base,products.find(p=>p.id==='saju_mackerel'),width);
  let release;const gate=new Promise(resolve=>{release=resolve;});
  try{
   f.row.paid=true;f.row.state='COMPLETED';
   f.row.consultation={asOf:'2026-09-22',timezone:'Asia/Seoul',topicLabel:'일과 적성',question:'민감한 원문 질문',questions:[{id:'q1',text:'민감한 원문 질문'}]};
   f.row.chapters=f.row.manifest.map((_,i)=>({summary:'서두르기보다 내 선택의 기준을 먼저 정리하는 흐름이야.',analysis:['오행의 분포와 월령을 함께 살펴 현실적인 선택을 도와줄게.'],example:'작은 시도부터 시작해 봐.',advice:'선택지의 장단점을 적어 봐.',persona:'네 속도를 믿어봐.',questionAnswers:i?[]:[{questionId:'q1',answer:'지금은 한 번에 크게 바꾸기보다 준비한 선택지를 작게 시험하는 편이 좋아.',reason:'오행의 분포를 살펴본 해석이야.',timing:'2026년 9~12월은 가능성을 시험하고 행동을 점검하는 기간이야.',action:'매주 한 가지씩 시도하고 네 경험을 기록해 봐.'}]}));
   await f.context.addInitScript(()=>{
    window.__shareCalls=[];window.__copyCalls=[];window.__kakaoCalls=[];
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{if(window.__copyDenied)throw new Error('denied');window.__copyCalls.push(text);}}});
    Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{if(window.__shareAbort)throw new DOMException('cancel','AbortError');window.__shareCalls.push({...data,files:data.files?.map(f=>({type:f.type,size:f.size}))});}});
    Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
    window.Kakao={isInitialized:()=>true,Share:{sendDefault:data=>window.__kakaoCalls.push(data)}};
   });
   await f.context.route(`**/api/yeongnyangi/requests/${f.row.id}`,async route=>{await gate;await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({fortune:f.row})});});
   await f.page.goto(base+'/yeongnyangi/result/?id='+f.row.id);
   await f.page.getByText('네 상담 두루마리, 영냥이가 가져올게.').waitFor();
   assert.equal(await f.page.getByAltText('앞발을 들고 반겨주는 영냥이').evaluate(img=>img.complete&&img.naturalWidth>0),true);
   await f.page.screenshot({path:`${output}/loading-${width}.png`});release();
   await f.page.getByText('마음에 남은 상담 공유하기',{exact:false}).click();
   await f.page.getByAltText('보내기 전 확인하는 영냥이 상담 이미지').waitFor();
   await f.page.getByRole('button',{name:'카카오톡 요약 보내기',exact:true}).click();
   const kakao=await f.page.evaluate(()=>window.__kakaoCalls[0]);assert.equal(kakao.objectType,'feed');assert.ok(kakao.content.description.length<=95);assert.ok(kakao.content.description.includes('준비한 선택지'));assert.ok(!kakao.content.link.webUrl.includes(f.row.id));
   await f.page.getByRole('button',{name:'문구 복사',exact:true}).click();
   const copied=await f.page.evaluate(()=>window.__copyCalls.at(-1));assert.ok(copied.includes('2026년 9~12월'));assert.ok(!copied.includes('민감한 원문 질문'));assert.ok(!copied.includes(f.row.id));
   await f.page.getByLabel('원문 질문도 이미지·문구에 포함하기').check();
   await f.page.getByRole('button',{name:'문구 공유',exact:true}).click();assert.ok((await f.page.evaluate(()=>window.__shareCalls.at(-1).text)).includes('민감한 원문 질문'));
   await f.page.getByRole('button',{name:'이미지로 공유',exact:true}).click();const file=await f.page.evaluate(()=>window.__shareCalls.at(-1).files[0]);assert.equal(file.type,'image/png');assert.ok(file.size>10000);
   const downloadEvent=f.page.waitForEvent('download');await f.page.getByRole('button',{name:'이미지 저장',exact:true}).click();await (await downloadEvent).saveAs(`${output}/card-${width}.png`);
   await f.page.evaluate(()=>{window.__shareAbort=true;});const before=await f.page.evaluate(()=>window.__copyCalls.length);
   await f.page.getByRole('button',{name:'문구 공유',exact:true}).click();await f.page.getByText('공유를 취소했어. 상담은 그대로 남아 있어.',{exact:true}).waitFor();assert.equal(await f.page.evaluate(()=>window.__copyCalls.length),before);
   await f.page.evaluate(()=>{window.__copyDenied=true;});await f.page.getByRole('button',{name:'문구 복사',exact:true}).click();await f.page.getByLabel('복사용 전체 공유 문구').waitFor({state:'visible'});
   assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await f.page.locator('details').filter({has:f.page.locator('#share-message')}).screenshot({path:`${output}/sharing-${width}.png`});
   assert.equal(f.state.generates,0);assert.equal(f.state.confirm,0);
   if(width===360){
    const complete=f.row.chapters;f.state.holdGeneration=true;f.row.chapters=complete.slice(0,2);f.row.state='GENERATING';
    await f.page.reload();await f.page.getByText('네 이야기를 한 장씩 정성껏 쓰고 있어.',{exact:true}).waitFor();
    assert.equal(await f.page.getByText('마음에 남은 상담 공유하기',{exact:false}).count(),0);
    f.row.chapters=complete;await f.page.reload();await f.page.getByText('마지막 장까지 잘 담겼는지 확인 중이야.',{exact:true}).waitFor();
    assert.equal(await f.page.locator('progress').getAttribute('value'),'5');assert.equal(await f.page.locator('progress').getAttribute('max'),'6');
   }
   results.push({width,status:'PASS',loading:true,kakao:'mock',clipboard:true,image:true,cancel:true,realMessages:0});
  }catch(error){await f.page.screenshot({path:`${output}/failure-${width}.png`});console.error(JSON.stringify({width,resources:f.state.resources.slice(-8),errors:f.state.errors,url:f.page.url(),body:(await f.page.locator('body').innerText()).slice(0,1200)}));throw error;}finally{release();await f.context.close();}
 }
}finally{await browser.close();await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));
