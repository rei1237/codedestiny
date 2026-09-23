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
window.calls={read:0,generate:0};
const row={id:'a'.repeat(64),paid:true,state:'FORTUNE_FAILED',errorCode:'AUTOMATIC_RECOVERY_STOPPED',product:{name:'사주',fishName:'고등어'},chapters:[],manifest:[{id:'first'}]};
export async function fortuneApi(path){
 if(path.endsWith('/generate')){window.calls.generate++;await new Promise(r=>setTimeout(r,150));return {fortune:{...row,state:'COMPLETED',errorCode:''}};}
 window.calls.read++;if(window.calls.read===1)throw new FortuneApiError('SERVICE_UNAVAILABLE','상담 기록에 잠시 연결하지 못했어요.',503);
 return {fortune:row};
}
export function loginForCurrentPage(){throw Error('unexpected login');}
export function checkoutPath(){throw Error('paid retry must not enter checkout');}
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
  await retry.waitFor();await retry.click();
  assert.equal(await page.getByRole('button',{name:'복구 요청 중'}).isDisabled(),true);
  await page.getByText('네 이야기를 모두 펼쳐두었어. 천천히 읽어봐.').waitFor();
  assert.equal((await page.evaluate(()=>window.calls)).generate,1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:'build-cache/yeongnyangi-retry/recovered-'+width+'.png'});
  await page.close();
 }
 console.log('PASS: first-read 503, manual reload, paid retry, disabled duplicate submission, completed reread; 390/1280px; real calls=0');
}finally{await browser.close();await new Promise(r=>server.close(r));}
