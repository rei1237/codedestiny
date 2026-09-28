import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {chromium} from '@playwright/test';
import {build} from 'esbuild';
import {parseOgParams,buildOgCardHtml} from '../worker/lib/og-card.js';
import {handleInsightCardRoutes} from '../worker/routes/insight-cards.js';
import {projectInsight,insightDigest,publicInsight} from '../lib/insight-card.mjs';

const now=new Date('2026-09-28T03:00:00Z'), rows=new Map();
const model={
 findOne:query=>({lean:async()=>{const row=rows.get(query._id);return row&&!row.revoked&&new Date(row.expiresAt)>query.expiresAt.$gt?row:null;}}),
 findOneAndUpdate:(query,update)=>({lean:async()=>{if(!rows.has(query._id))rows.set(query._id,{_id:query._id,...update.$setOnInsert});return rows.get(query._id);}}),
 updateOne:async(query,update,options)=>{if(!rows.has(query._id)&&options?.upsert)rows.set(query._id,{...query,...update.$setOnInsert});const row=rows.get(query._id);if(row&&row.revokeHash===query.revokeHash){Object.assign(row,update.$set);for(const key of Object.keys(update.$unset||{}))delete row[key];}},
};
let rateCount=1;
const deps={model,now,connect:async()=>{},rate:async()=>({count:rateCount})};
const input={brand:'daily',source:'daily',locale:'ko',day:'2026-09-28',text:'시작하기 전에 내 선택의 기준을 한 문장으로 적어 보세요.',consent:true,token:'1'.repeat(64)};
const request=(path,method='GET',body)=>new Request('https://code-destiny.com/api/fortune/cards'+path,{method,headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
const handle=(path,method,body,dependencies=deps)=>handleInsightCardRoutes(request(path,method,body),{},dependencies);
for(const patch of [{consent:false},{text:'a'.repeat(121)},{text:'연락 010-1234-5678'},{text:'<img src=x>'},{text:'abc@example.com'},{brand:'__proto__'},{locale:'missing'},{day:'1990-01-01'},{day:'2026-02-30'}]) assert.equal(projectInsight({...input,...patch},now),null);
assert.deepEqual(Object.keys(projectInsight({...input,profile:{name:'비공개'},question:'비공개',resultId:'private'},now)).sort(),['brand','day','locale','source','text']);
let response=await handle('','POST',input);assert.equal(response.status,201);
const card=await response.json();assert.equal(card.id,'ic_'+(await insightDigest(input.token)).slice(0,40));
assert.ok(!JSON.stringify(card).includes('revokeHash'));assert.ok(!JSON.stringify(card).includes(input.token));
assert.equal((await handle('/'+card.id)).status,200);
assert.equal((await handle('/'+card.id,'DELETE',{token:'2'.repeat(64)})).status,404);
assert.equal((await handle('/'+card.id)).status,200);
rateCount=61;assert.equal((await handle('/'+card.id,'DELETE',{token:input.token})).status,429);rateCount=1;
assert.equal((await handle('/'+card.id)).status,200);
assert.equal((await handle('/'+card.id,'DELETE',{token:input.token})).status,200);
assert.equal((await handle('/'+card.id)).status,404);
assert.equal((await handle('','POST',input)).status,410);
const pendingToken='6'.repeat(64),pendingId='ic_'+(await insightDigest(pendingToken)).slice(0,40);
assert.equal((await handle('/'+pendingId,'DELETE',{token:pendingToken})).status,200);
assert.equal((await handle('','POST',{...input,token:pendingToken})).status,410);
rateCount=11;assert.equal((await handle('','POST',{...input,token:'3'.repeat(64)})).status,429);rateCount=1;
assert.equal((await handle('','POST',{...input,text:'x'.repeat(5000)})).status,400);
assert.equal((await handle('','POST',{...input,token:'4'.repeat(64)}, {...deps,rate:async()=>{throw new Error('db');}})).status,503);
response=await handle('','POST',{...input,token:'5'.repeat(64)});const expiring=await response.json();
assert.equal((await handle('/'+expiring.id,'GET',null,{...deps,now:new Date('2026-11-01')})).status,404);
assert.equal((await handleInsightCardRoutes(new Request('https://code-destiny.com/api/fortune/cards',{method:'POST',headers:{Origin:'https://attacker.test','Content-Type':'application/json'},body:JSON.stringify(input)}),{},deps)).status,403);
// Pages edge: real function with mocked fetch/asset transformer. Failure is never cached.
const edge=await readFile('public/_worker.js','utf8');
const source=edge.slice(edge.indexOf('const INSIGHT_CARD_ID ='),edge.indexOf('const GUARDIAN_SHARE_PATHS ='));
let edgeStatus=200, edgeMeta;
const sandbox={Response,Headers,URLSearchParams,AbortSignal,resolveApiWorkerOrigin:()=> 'https://api.invalid',fetch:async()=>edgeStatus===200?Response.json(publicInsight(rows.get(expiring.id))):new Response('',{status:edgeStatus}),
 transformGuardianShareHtml:(_asset,meta)=>{edgeMeta=meta;return new Response('<html>card</html>');},hardenResponse:(_url,r)=>r};
vm.createContext(sandbox);vm.runInContext(source+';globalThis.serve=serveInsightCard;',sandbox);
const url=new URL('https://code-destiny.com/share/?card='+expiring.id+'&utm_source=copy');
response=await sandbox.serve(new Request(url),{ASSETS:{fetch:async()=>new Response('<html/>')}},url);
assert.equal(response.headers.get('Cache-Control'),'no-store');assert.ok(edgeMeta.image.includes('/api/og?'));assert.equal(edgeMeta.description,input.text);assert.ok(!edgeMeta.url.includes('utm_'));
edgeStatus=404;assert.equal((await sandbox.serve(new Request(url),{},url)).status,404);
edgeStatus=503;assert.equal((await sandbox.serve(new Request(url),{},url)).status,503);
console.log('PASS backend: projection, consent, PII, revocation authority, replay, expiry, storage/rate errors, edge OG/no-store');
assert.equal(parseOgParams(new URLSearchParams('badge=insight&character=https://evil.test/')).character,undefined);
for(const character of ['yeongnyangi','yeoni','neo']){
 const params=parseOgParams(new URLSearchParams({badge:'insight',character,title:'<script>',desc:input.text}));
 assert.equal(params.character,character);
 const html=buildOgCardHtml({...params,artData:'data:image/jpeg;base64,eA=='},'code-destiny.com');
 assert.ok(html.includes('data:image/jpeg;base64,'));assert.ok(!html.includes('<script>'));
}
if(process.argv.includes('--unit'))process.exit(0);

const base=process.env.INSIGHT_TEST_BASE||'http://127.0.0.1:14128';assert.equal(new URL(base).hostname,'127.0.0.1');
const output='build-cache/share-insight';await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true}),results=[];
try{
 for(const width of [360,390,430,1280]){
  const context=await browser.newContext({viewport:{width,height:900},serviceWorkers:'block'});
  const writes=[],events=[],external=[];
  await context.route('**/*',async route=>{
   const req=route.request(),u=new URL(req.url());
   if(u.origin!==base){external.push(u.hostname);return route.abort();}
   if(u.pathname.startsWith('/api/fortune/cards')){
    if(req.method()!=='GET')writes.push(req.postDataJSON());
    const path=u.pathname.slice('/api/fortune/cards'.length);
    const reply=await handle(path,req.method(),req.method()==='GET'?undefined:req.postDataJSON(),{...deps,now:new Date()});
    return route.fulfill({status:reply.status,contentType:'application/json',body:await reply.text()});
   }
   if(u.pathname.startsWith('/api/'))return route.fulfill({status:503,contentType:'application/json',body:'{"mock":true}'});
   return route.continue();
  });
  await context.addInitScript(()=>{window.__insightCopies=[];window.__insightEvents=[];window.cdTrack=(name,params)=>window.__insightEvents.push({name,params});Object.defineProperty(navigator,'clipboard',{value:{writeText:async value=>window.__insightCopies.push(value)},configurable:true});Object.defineProperty(navigator,'share',{value:async()=>{throw new DOMException('cancel','AbortError');},configurable:true});});
  const page=await context.newPage();
  await page.goto(base+'/today/',{waitUntil:'domcontentloaded',timeout:120000});
  await page.getByRole('button',{name:'오늘의 세 장 펼치기'}).click({timeout:60000});
  for(let i=1;i<=3;i++)await page.getByRole('button',{name:i+'번째 카드 고르기',exact:true}).click();
  for(let i=0;i<3;i++)await page.locator('#daily-tarot').getByRole('button',{name:/열기/}).click();
  const editor=page.locator('[data-public-insight="daily"]');
  await editor.locator('summary').first().click();
  assert.equal(writes.length,0);
  await editor.locator('select').selectOption({index:1});
  await editor.locator('textarea').fill(input.text);
  assert.equal(await editor.getByRole('button',{name:'미리보기 확인 후 링크 만들기'}).isEnabled(),false);
  await editor.getByRole('checkbox').check();
  await editor.locator('img[src^="blob:"]').waitFor();
  await editor.locator('img[src^="blob:"]').evaluate(img=>img.decode());
  await editor.screenshot({path:`${output}/preview-${width}.png`});
  await editor.getByRole('button',{name:'미리보기 확인 후 링크 만들기'}).click();
  await editor.getByText('링크를 만들었어요. 아래에서 복사하거나 공유해 주세요.').waitFor();
  assert.equal(writes.length,1);assert.ok(!JSON.stringify(writes).includes('question'));
  await editor.getByRole('button',{name:'공개 링크 복사',exact:true}).click();
  const link=await page.evaluate(()=>window.__insightCopies.at(-1));assert.ok(link.includes('/share/?card=ic_'));assert.ok(!link.includes(writes[0].token));
  await editor.getByRole('button',{name:'문장과 링크 공유',exact:true}).click();
  await editor.getByText('공유를 취소했어요.',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>window.__insightCopies.length),1);
  const receiver=await context.newPage();await receiver.goto(link,{waitUntil:'domcontentloaded',timeout:120000});
  await receiver.getByRole('heading',{name:'친구가 고른 한 문장'}).waitFor({timeout:60000});
  assert.equal(await receiver.getByText(input.text,{exact:true}).count(),1);
  assert.ok((await receiver.getByRole('link',{name:'내 세 장 무료로 펼치기'}).getAttribute('href')).startsWith('/today/'));
  assert.equal(await receiver.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await receiver.screenshot({path:`${output}/receiver-${width}.png`,fullPage:true});
  await editor.getByText(/이 브라우저에서 만든 링크/).click();
  await editor.getByRole('button',{name:'이 링크 폐기하기',exact:true}).click();
  await editor.getByText('링크를 폐기했어요.',{exact:true}).waitFor();
  await receiver.reload();await receiver.getByRole('heading',{name:'이 카드는 더 이상 공개되지 않아요.'}).waitFor();
  assert.equal(await receiver.getByText(input.text,{exact:true}).count(),0);
  if(width===390){
   const maxText='내가 원하는 방향을 정리하고 작은 행동으로 확인해 보세요. 상대의 속도와 내 기준을 함께 살피면 선택의 이유가 더 또렷해집니다. '.repeat(3).slice(0,120);
   await editor.locator('textarea').fill(maxText);await editor.getByRole('checkbox').check();
   for(const format of ['square','story']){
    await editor.locator('select').last().selectOption(format);
    await editor.getByRole('button',{name:'이미지 저장',exact:true}).waitFor();
    await editor.locator('img[src^="blob:"]').waitFor();
    await editor.locator('img[src^="blob:"]').evaluate(img=>img.decode());
    const downloadPromise=page.waitForEvent('download');await editor.getByRole('button',{name:'이미지 저장',exact:true}).click();
    await (await downloadPromise).saveAs(`${output}/max-${format}.png`);
   }
   const bundled=await build({entryPoints:['lib/insight-card-image.ts'],bundle:true,format:'iife',globalName:'InsightImageQA',write:false});
   await page.addScriptTag({content:bundled.outputFiles[0].text});
   for(const [brand,label] of [['yeongnyangi','영냥이'],['neo','네오']]){
    for(const story of [false,true]){
     const data=await page.evaluate(async({text,label,brand,story})=>{const blob=await window.InsightImageQA.renderInsightImage(text,label,'2026-09-28',story,brand);return new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);});},{text:maxText,label,brand,story});
     await writeFile(`${output}/${brand}-${story?'story':'square'}.png`,Buffer.from(data.split(',')[1],'base64'));
    }
    const result=await handle('','POST',{...input,brand,token:(brand==='neo'?'8':'7').repeat(64)});
    const next=await result.json();await receiver.goto(base+'/share/?card='+next.id,{waitUntil:'domcontentloaded'});
    await receiver.getByText(input.text,{exact:true}).waitFor();await receiver.locator('figure img').evaluate(img=>img.decode());
    await receiver.screenshot({path:`${output}/receiver-${brand}-390.png`,fullPage:true});
   }
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  events.push(...await page.evaluate(()=>window.__insightEvents));
  assert.ok(!JSON.stringify(events).includes(writes[0].token));assert.ok(!JSON.stringify(events).includes(input.text));
  results.push({width,status:'PASS',create:'mock DB',preview:true,revoke:true,cancel:true,externalBlocked:external.length,realPayment:0,realLLM:0});
  await context.close();
 }
}finally{await browser.close();await writeFile(output+'/share-tests.json',JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));
