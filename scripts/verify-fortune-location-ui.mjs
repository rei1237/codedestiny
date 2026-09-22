import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
import {fixtures} from './lib/yeongnyangi-mobile-payment.mjs';
const base=process.env.YEONGNYANGI_TEST_BASE||'http://127.0.0.1:33788';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const compiled=await build({stdin:{contents:"export {getProduct} from './worker/yeongnyangi/payments/catalog';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const {getProduct}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const output='build-cache/fortune-location-ui';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true}),results=[];
try{
 for(const width of [390,1280])for(const path of ['/fortune/prompt-hub/?tool=horary','/fortune/prompt-hub/?tool=astrology','/fortune/prompt-hub/?tool=vedic','/astrology-ai/','/vedic-ai/']){
  const f=await fixtures(browser,base,getProduct('saju_flounder'),width);let locations=0,prompts=0;
  try{
   await f.context.grantPermissions(['geolocation'],{origin:base});await f.context.setGeolocation({latitude:51.5074,longitude:-.1278,accuracy:20});
   await f.page.route('**/api/yeongnyangi/location',route=>{locations++;return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,location:{name:'동의한 현재 위치',latitude:51.5074,longitude:-.1278,source:'geolocation',accuracy:20,timezone:'Europe/London'}})});});
   await f.page.route('**/api/yeongnyangi/free/horary',route=>{prompts++;const body=route.request().postDataJSON();assert.equal(body.questionSky.location.longitude,-.1278);return route.fulfill({contentType:'application/json',body:JSON.stringify({ok:true,result:{prompt:'[확정 계산 데이터] Regiomontanus · London · Moon · 질문별 근거'}})});});
   await f.page.goto(base+path);await f.page.getByRole('button',{name:'현재 위치 가져오기',exact:true}).waitFor();
   assert.equal(locations,0);await f.page.getByRole('button',{name:'현재 위치 가져오기',exact:true}).click();
   const confirm=f.page.getByRole('button',{name:path.includes('horary')?'질문 당시 장소가 맞아요 · 적용':'출생 장소가 맞아요 · 적용',exact:true});
   await confirm.waitFor();assert.equal(locations,1);await confirm.click();
   assert.ok(await f.page.locator('input').evaluateAll(nodes=>nodes.some(n=>n.value==='동의한 현재 위치')));
   if(path.includes('prompt-hub')&&!path.includes('horary'))assert.equal(await f.page.locator('[id$="-birthTimezone"]').inputValue(),'Europe/London');
   if(path.includes('horary')){
    await f.page.locator('#prompt-tool-horary-topic').fill('일과 진로');await f.page.locator('#prompt-tool-horary-question').fill('제안을 받아들일까요?');await f.page.locator('#prompt-tool-horary-horaryQuestion').fill('제안을 받아들일까요?');await f.page.locator('#prompt-tool-horary-questionDateTime').fill('2026-09-21T10:00');
    await f.page.getByRole('button',{name:'호라리 상담 프롬프트 생성하기',exact:true}).first().click();
    await f.page.getByText('[확정 계산 데이터] Regiomontanus · London · Moon · 질문별 근거',{exact:false}).first().waitFor();assert.equal(prompts,1);
    assert.equal(await f.page.getByRole('link',{name:/ChatGPT 열기/}).getAttribute('href'),'https://chatgpt.com/');
    await f.page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('denied');}}});document.execCommand=()=>false;});
    await f.page.getByRole('button',{name:/프롬프트 복사/}).first().click();
    await f.page.getByText('자동 복사를 하지 못했어요. 아래 프롬프트를 직접 선택해 복사해 주세요.').waitFor();
   }
   assert.equal(f.state.creates,0);assert.equal(f.state.generates,0);assert.equal(f.state.sdk.length,0);
   assert.ok(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await f.page.getByRole('button',{name:'현재 위치 가져오기',exact:true}).scrollIntoViewIfNeeded();
   await f.page.screenshot({path:`${output}/${path.replace(/[^a-z]/g,'-')}-${width}.png`});
   results.push({path,width,status:'PASS',locations,prompts,realLlmCalls:0,realPgCalls:0});
  }finally{await f.context.close();}
 }
}finally{await browser.close();await writeFile(`${output}/result.json`,JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));
