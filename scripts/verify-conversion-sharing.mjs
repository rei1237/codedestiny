import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {fixtures} from './lib/yeongnyangi-mobile-payment.mjs';
const base=process.env.YEONGNYANGI_TEST_BASE||'http://127.0.0.1:14122';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const built=await build({entryPoints:['worker/yeongnyangi/payments/catalog.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {products}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const output='build-cache/conversion-sharing';await mkdir(output,{recursive:true});
const browser=await chromium.launch(),results=[];
try{
 for(const width of [390,1280]){
  const f=await fixtures(browser,base,products[0],width);
  try{
   await f.context.addInitScript(()=>{
    window.__copies=[];
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>window.__copies.push(text)}});
   });
   await f.page.goto(base+'/');
   await f.page.getByRole('heading',{name:'10년 경력 운세 상담사·명리학자가 만든 서비스'}).waitFor();
   assert.match(await f.page.locator('meta[name="description"]').getAttribute('content'),/10년 경력/);
   assert.equal(await f.page.locator('#founder-records a[target="_blank"]').count(),3);
   assert.ok(await f.page.getByRole('link',{name:'결제 전 상담 예시 읽기'}).getAttribute('href'));
   assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await f.page.screenshot({path:`${output}/home-${width}.png`});
   await f.page.locator('#founder-records').screenshot({path:`${output}/trust-${width}.png`});
   await f.page.goto(base+'/yeongnyangi/1000-won-fortune/');
   await f.page.locator('#example').waitFor();
   assert.equal(await f.page.locator('meta[property="og:image"]').getAttribute('content'),'https://code-destiny.com/assets/yeongnyangi/original/kakao-profile.png');
   assert.equal(await f.page.locator('link[rel="canonical"]').getAttribute('href'),'https://code-destiny.com/yeongnyangi/1000-won-fortune/');
   assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   results.push({surface:'home-and-seo',width,status:'PASS'});

   const day=new Date(Date.now()+9*3600000).toISOString().slice(0,10);
   await f.page.route('**/api/yeongnyangi/attendance',route=>route.fulfill({json:{ok:true,day,balance:0,attended:true,unlocked:true}}));
   await f.page.route('**/api/yeongnyangi/free/reading?*',route=>route.fulfill({json:{ok:true,result:{category:'basic',day,title:'오늘의 운세',kind:'calculated',summary:'오늘은 내 기준을 차분히 세워보는 날이야.',paragraphs:['한 번에 하나씩 정리해 봐.'],basis:[{label:'비공개 입력',value:'PRIVATE_BIRTH'}],limitations:[],prompt:'PRIVATE_PROMPT',version:'fixture'}}}));
   await f.page.goto(base+'/yeongnyangi/room/#daily');
   await f.page.getByText('마음에 남은 상담 공유하기',{exact:false}).click();
   await f.page.getByAltText('보내기 전 확인하는 영냥이 상담 이미지').waitFor();
   await f.page.getByRole('button',{name:'문구 복사',exact:true}).click();
   const copy=await f.page.evaluate(()=>window.__copies.at(-1));
   assert.match(copy,/오늘은 내 기준/);assert.match(copy,/utm_campaign=yeongnyangi_daily/);assert.doesNotMatch(copy,/PRIVATE_|shared-profile/);
   assert.equal(await f.page.getByLabel('원문 질문도 이미지·문구에 포함하기').count(),0);
   const shareMetrics=await f.page.locator('[data-consultation-sharing]').evaluate(node=>({padding:parseFloat(getComputedStyle(node).paddingLeft),target:node.querySelector('summary').getBoundingClientRect().height,imageWidth:node.querySelector('figure img').naturalWidth,imageHeight:node.querySelector('figure img').naturalHeight}));
   assert.ok(shareMetrics.padding>=16);assert.ok(shareMetrics.target>=44);assert.equal(shareMetrics.imageWidth,1080);assert.equal(shareMetrics.imageHeight,1080);
   assert.equal(await f.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await f.page.locator('details').filter({has:f.page.locator('#share-message')}).screenshot({path:`${output}/daily-${width}.png`});
   results.push({surface:'free-share',width,status:'PASS'});

   for(const mode of ['prashna-v1','horary-v1']){
    f.row.paid=true;f.row.state='COMPLETED';
    f.row.chapters=f.row.manifest.map(()=>({summary:'내 속도를 돌아볼 때야.',analysis:[],example:'작은 선택부터.',advice:'가능한 일을 적어봐.',persona:'네 선택을 응원해.'}));
    f.row.consultation={asOf:day,timezone:'Asia/Seoul',questionSky:{mode,askedAt:day+'T00:00:00Z',cityName:'PRIVATE_CITY',relationship:'PRIVATE_RELATIONSHIP',space:'공간의 상징',timing:'점검 기간',shareKey:'steady'}};
    await f.page.goto(base+'/yeongnyangi/result/?id='+f.row.id);
    await f.page.getByText('마음에 남은 상담 공유하기',{exact:false}).click();
    await f.page.getByRole('button',{name:'문구 복사',exact:true}).click();
    const copied=await f.page.evaluate(()=>window.__copies.at(-1));
    assert.match(copied,new RegExp('mode='+(mode==='horary-v1'?'horary':'spirit')));assert.doesNotMatch(copied,/PRIVATE_|shared-profile/);
    assert.equal(f.state.confirm,0);assert.equal(f.state.generates,0);
    results.push({surface:mode,width,status:'PASS',realPayments:0,realMessages:0});
   }
  }finally{await f.context.close();}
 }
}finally{await browser.close();await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));
