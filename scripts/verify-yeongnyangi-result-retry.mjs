import './lib/mock-network-guard.cjs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {mkdir,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';

// Render the actual Result component with transport and rich reading children
// replaced by fixtures. No authentication, payment or provider network calls.
const bundle=await build({stdin:{contents:`
import React from 'react';import {createRoot} from 'react-dom/client';
import Result from './app/yeongnyangi/_components/Result';
import styles from './app/yeongnyangi/yeongnyangi.module.css';
createRoot(document.getElementById('root')).render(<main className={styles.page}><Result/></main>);
`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,outfile:'fixture.js',external:['/assets/*'],format:'iife',platform:'browser',jsx:'automatic',
 plugins:[{name:'result-fixtures',setup(b){
  b.onResolve({filter:/\/api$/},()=>({path:'api',namespace:'fixture'}));
  b.onResolve({filter:/^@\/lib\/analytics$/},()=>({path:'analytics',namespace:'fixture'}));
  b.onResolve({filter:/^\.\/(ReadingBook|ReadingIdentity|SpiritResult|ReadingLoading|ResultSharing)$/},()=>({path:'child',namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({loader:'js',contents:path==='api'?`
export class FortuneApiError extends Error {constructor(code,message,status){super(message);this.code=code;this.status=status;this.retryable=true;this.retryAfterSeconds=0;}}
window.calls={read:0,generate:0,payments:1,provider:0};window.activateCalls=0;
const activateCase=new URLSearchParams(location.search).get('case')==='activate';
const id='a'.repeat(64),manifest=[{id:'first'},{id:'second'},{id:'third'}],stored={summary:'이미 저장된 첫 장'};
const row={id,paid:true,state:'FORTUNE_FAILED',errorCode:'AUTOMATIC_RECOVERY_STOPPED',product:{name:'사주',fishName:'고등어'},chapters:[stored],manifest,recovery:{requestId:id,savedChapters:1,totalChapters:3,providerNeeded:true,retryable:true,canRetryNow:true,nextAction:'retry'}};
export async function fortuneApi(path){
 if(activateCase){
  // 결제 직후: 상담은 읽히지만 결제 연결(activate) 첫 시도가 일시 DB 오류로 실패한다.
  if(path.endsWith('/activate')){window.activateCalls++;if(window.activateCalls===1)throw new FortuneApiError('SERVICE_UNAVAILABLE','영냥이 서버에 잠시 연결하지 못했어요.',503);
   return {fortune:{...row,state:'COMPLETED',errorCode:'',chapters:[stored,{summary:'둘째 장'},{summary:'셋째 장'}],recovery:{...row.recovery,savedChapters:3,providerNeeded:false,retryable:false,canRetryNow:false,nextAction:'reread'}}};}
  window.calls.read++;return {fortune:{...row,paid:false,state:'CREATED',errorCode:'',chapters:[],recovery:{...row.recovery,savedChapters:0}}};
 }
 if(path.endsWith('/generate')){window.calls.generate++;window.calls.provider+=2;await new Promise(r=>setTimeout(r,150));const fortune={...row,state:'COMPLETED',errorCode:'',chapters:[stored,{summary:'둘째 장'},{summary:'셋째 장'}],recovery:{...row.recovery,savedChapters:3,providerNeeded:false,retryable:false,canRetryNow:false,nextAction:'reread'}};window.completed=fortune;return {fortune};}
 window.calls.read++;if(window.calls.read===1)throw new FortuneApiError('SERVICE_UNAVAILABLE','영냥이 서버에 잠시 연결하지 못했어요.',503);
 return {fortune:row};
}
export function loginForCurrentPage(){throw Error('unexpected login');}
export function checkoutPath(){if(activateCase)return '#checkout';throw Error('paid retry must not enter checkout');}
`:path==='analytics'?'export function trackFortuneDelivery(){} export function trackFortuneView(){}':path==='style'?'export default {};':'export default function Child(){return null;}'}));
 }}]});
const js=bundle.outputFiles.find(f=>f.path.endsWith('.js')).text;
const css=bundle.outputFiles.find(f=>f.path.endsWith('.css')).text;
const server=createServer(async(req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname.startsWith('/assets/yeongnyangi/')){
  const file=resolve('public','.'+pathname),root=resolve('public');
  if(!file.startsWith(root+'\\')){res.writeHead(403);res.end();return;}
  try{res.setHeader('Content-Type','image/webp');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}return;
 }
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}'+css+'</style><div id="root"></div><script>'+js+'</script></html>');
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
await mkdir('build-cache/yeongnyangi-retry',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:844}});
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await page.goto('http://127.0.0.1:'+server.address().port+'/?id='+'a'.repeat(64));
  await page.getByRole('button',{name:'다시 불러오기',exact:true}).waitFor();
  await page.screenshot({path:'build-cache/yeongnyangi-retry/error-'+width+'.png'});
  if(width===390)await page.getByRole('button',{name:'다시 불러오기',exact:true}).click();
  const retry=page.getByRole('button',{name:'기존 상담 복구하기',exact:true});
  await retry.waitFor();await retry.evaluate(button=>{button.click();button.click();});
  assert.equal(await page.getByRole('button',{name:'복구 요청 중'}).isDisabled(),true);
  await page.getByText('네 이야기를 모두 펼쳐두었어. 천천히 읽어봐.').waitFor();
  assert.deepEqual(await page.evaluate(()=>window.calls),{read:2,generate:1,payments:1,provider:2});
  assert.equal(await page.evaluate(()=>window.completed.id),'a'.repeat(64));
  assert.equal(await page.evaluate(()=>window.completed.chapters[0].summary),'이미 저장된 첫 장');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:'build-cache/yeongnyangi-retry/recovered-'+width+'.png'});
  await page.close();
 }
 {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await page.goto('http://127.0.0.1:'+server.address().port+'/?case=activate&id='+'a'.repeat(64));
  await page.getByText('결제가 확인되면 이 화면이 자동으로 바뀌어요.').waitFor();
  assert.equal(await page.getByRole('button',{name:'다시 불러오기',exact:true}).count(),0,'activate 실패가 읽은 상담을 가리면 안 된다');
  assert.equal(await page.getByText('영냥이 서버에 잠시 연결하지 못했어요.').count(),0,'일시 오류는 결제 대기 폴링이 흡수한다');
  await page.getByText('네 이야기를 모두 펼쳐두었어. 천천히 읽어봐.').waitFor({timeout:15000});
  assert.deepEqual(await page.evaluate(()=>[window.calls,window.activateCalls]),[{read:1,generate:0,payments:1,provider:0},2]);
  await page.close();
 }
 console.log('PASS: activate 503 right after payment keeps the read consultation; payment poll attaches it; real calls=0');
 console.log('PASS: one payment, partial saved chapter reused, two missing provider calls, duplicate click suppressed, same request completed; 390/1280px; real calls=0');
}finally{await browser.close();await new Promise(r=>server.close(r));}
