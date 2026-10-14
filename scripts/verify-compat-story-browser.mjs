// Local UI contract only: every API and the payment service are mocked.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { requestBody, samplePairs, llmResponse } from '../__tests__/fixtures/saju-compat-llm-fixture.mjs';
import { normalizeSajuCompatInput, shapeSajuCompatGroup, buildSajuCompatPart, assembleSajuCompatSnapshot, sajuCompatTasks } from '../worker/lib/saju-compat-schema.js';
import { renderSajuCompat } from '../js/saju-compat-render.mjs';
const origin=process.env.COMPAT_PREVIEW_ORIGIN || 'http://localhost:3027';
assert.match(origin,/^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const output='.tmp/compat-visual';mkdirSync(output,{recursive:true});
const input=normalizeSajuCompatInput(requestBody(...samplePairs(13,1)[0]));
const tasks=sajuCompatTasks(input),parts={};
for(const task of tasks) parts[task.id]=buildSajuCompatPart(task.id,shapeSajuCompatGroup(task.id,llmResponse(task.id,input),input));
const snapshot=assembleSajuCompatSnapshot({input,tasks,parts});
const html=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles/theme-tokens.css"><link rel="stylesheet" href="/styles/fortune-ui.css"><style>body{margin:0;background:var(--cd-bg);color:var(--cd-text);font-family:sans-serif}main{max-width:800px;margin:auto;padding:20px;box-sizing:border-box}</style><main>${renderSajuCompat(snapshot,{selfName:'검수'})}</main></html>`;
const titles=['우리 관계의 큰 흐름','끌림과 소통의 결','긴장과 관계의 경계','생활을 나누고 신뢰를 쌓는 법','함께할 미래와 오늘의 선택'];
const report={ok:true,status:'completed',sessionId:'rbt_mock_couple_001',mode:'couple',schemaVersion:2,sceneIds:['overview','communication','boundary','trust','future'],score:28,grade:'low',character:{title:'대화로 길을 여는 두 사람',caption:'각자의 속도를 확인하며 관계를 가꿉니다.'},summary:'두 사람의 생활 리듬을 이해하고 약속의 기준을 함께 정해 보세요.',scoreFactors:['대상자의 경계 성향을 계산한 값이며 궁합 점수는 아닙니다.'],sections:titles.map(title=>({title,body:'익숙한 반응이 다를 때에는 먼저 기대했던 행동을 말로 확인해 보세요. 상대의 속도를 기다리면서 작은 약속을 함께 지키는 것이 도움이 됩니다.\n\n주말에는 서로에게 편한 연락 간격을 정하고 일주일 뒤 다시 이야기해 보세요.'})),finalMessage:'다음 대화에서 함께 지킬 작은 약속을 하나 정해 보세요.'};
const browser=await chromium.launch();
try {
 const page=await browser.newPage({viewport:{width:390,height:900},locale:'ko-KR',reducedMotion:'reduce'});
 await page.context().addCookies([{name:'fortune_auth_role',value:'user',url:origin}]);
 await page.addInitScript(()=>localStorage.setItem('fortune_auth_user',JSON.stringify({id:'64b7f2a1c3d4e5f601234567',_id:'64b7f2a1c3d4e5f601234567',name:'검수',role:'user'})));
 await page.routeWebSocket('**',socket=>socket.close());
 let generated=0,paid=0,original=null; const apiCalls=[];
 await page.addInitScript(()=>{window.CodeDestinyPaymentService={registerPaymentWindow(){},executePayment:async command=>{window.__mockPaymentCommands=(window.__mockPaymentCommands||[]).concat(command);return {ok:true,transactionId:'mock-paid-proof'};}};});
 await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname.startsWith('/api/')) { apiCalls.push(route.request().method()+' '+url.pathname+url.search);
     if(url.pathname==='/api/relationship-boundary-test/prepare') {paid++;return route.fulfill({status:402,json:{reason:'PAYMENT_REQUIRED',paymentPayload:{featureKey:'relationship-boundary-test',amountKRW:10000,cost:100}}});}
     if(url.pathname==='/api/relationship-boundary-test/generate') {
       generated++; const body=route.request().postDataJSON();if(!original)original=body;
       return route.fulfill({status:generated===1?202:200,json:generated===1?{...report,status:'partial',completedParts:['frame'],totalParts:11,resumeBody:{resumeSessionId:report.sessionId}}:report});
     }
     if(url.pathname==='/api/relationship-boundary-test/result')return route.fulfill({status:generated?200:404,json:generated?report:{ok:false,reason:'RESULT_NOT_FOUND'}});
     return route.fulfill({json:{ok:true,authenticated:true,user:{id:'64b7f2a1c3d4e5f601234567',_id:'64b7f2a1c3d4e5f601234567',name:'검수'},profiles:[],unlocks:[],data:{}}});
   }
   if(url.origin!==origin)return route.abort();
   if(url.pathname==='/compat-story-preview')return route.fulfill({contentType:'text/html',body:html});
   return route.continue();
 });
 const authReady=page.waitForResponse(r=>r.url().includes('/api/auth/me'),{timeout:15000}).catch(()=>null);
 await page.goto(origin+'/relationship-boundary-test/',{timeout:120000});
 await authReady;
 await page.getByRole('button',{name:'여성',exact:true}).click();
 await page.locator('#target-birth-date').fill('1990-01-01');await page.locator('#target-birth-time').fill('12:00');
 await page.getByLabel('본인 정보로 두 사람 궁합도 함께 보기').check();
 await page.locator('#self-gender').selectOption('male');await page.locator('#self-birth-date').fill('1988-03-21');
 await page.locator('.rt-self-input').getByLabel('출생 시각을 모릅니다').check();
 for(const width of [360,390,430,1280]) {
   await page.setViewportSize({width,height:900});await page.locator('.rt-self-input').scrollIntoViewIfNeeded();
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:`${output}/input-${width}.png`});
 }
 await page.evaluate(()=>{window.CodeDestinyPaymentService={registerPaymentWindow(){},executePayment:async command=>{window.__mockPaymentCommands=(window.__mockPaymentCommands||[]).concat(command);return {ok:true,transactionId:'mock-paid-proof'};}};});
 await page.getByRole('button',{name:/결제하고 결과 보기/}).click();
 await page.getByText(report.character.title,{exact:true}).waitFor({timeout:20000}).catch(async error=>{console.log({paid,generated,alerts:await page.locator('[role=alert]').allTextContents(),commands:await page.evaluate(()=>window.__mockPaymentCommands),text:(await page.locator('main').innerText()).slice(-1000)});throw error;});
 assert.equal(paid,1);assert.equal(original.selfInfo.birthDate,'1988-03-21');assert.equal(original.selfInfo.birthTimeUnknown,true);
 // Reload after delivery began: server-owned result survives and checkout is not reopened.
 await page.reload({timeout:120000});await page.getByRole('button',{name:'새 대상 분석하기'}).waitFor({timeout:20000}).catch(async error=>{console.log({paid,generated,apiCalls,text:(await page.locator('main').innerText()).slice(-1800),storage:await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.includes('relationship')).map(k=>[k,localStorage.getItem(k)]))});throw error;});
 assert.equal(paid,1);assert.ok(generated<=2);
 for(const width of [390,1280]){await page.setViewportSize({width,height:900});await page.locator('#relationship-chapter-0').scrollIntoViewIfNeeded();await page.screenshot({path:`${output}/couple-${width}.png`});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.goto(origin+'/compat-story-preview');
 for(const width of [360,390,430,1280]){
   await page.setViewportSize({width,height:900});await page.locator('.compat-story-chapter').first().scrollIntoViewIfNeeded();
   await page.locator('.compat-story-chapter img').first().evaluate(image=>image.decode());
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:`${output}/compat-${width}.png`});
 }
 await page.locator('.compat-story-chapter summary').first().focus();await page.keyboard.press('Enter');assert.ok(await page.locator('.compat-story-chapter details').first().getAttribute('open')!==null);
 await page.route('**/broken-compat.webp',r=>r.fulfill({status:404,body:''}));await page.locator('.compat-story-chapter img').first().evaluate(img=>{img.src='/broken-compat.webp';});
 assert.ok(await page.locator('.compat-story-chapter .compat-text').first().isVisible());
 writeFileSync(`${output}/result.json`,JSON.stringify({mockOnly:true,paid,generated,inputPreserved:true,reloadReopensWithoutCheckout:true,widths:[360,390,430,1280],keyboard:true,imageFailureReadable:true},null,2));
 console.log('PASS: mock checkout → couple input → saved result → reload; responsive illustrated compatibility and keyboard/image failure');
} finally {await browser.close();}
