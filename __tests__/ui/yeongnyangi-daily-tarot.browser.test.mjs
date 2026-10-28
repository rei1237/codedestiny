import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {chromium} from '@playwright/test';

test('daily tarot: illustrated entry preserves attendance gate, reveal and day state',async()=>{
 const mocks={
  'next/image':`import React from 'react';export default function Image({priority,fill,...props}){return <img {...props}/>}`,
  '../_lib/api':`import {kstDateKey} from './lib/tarot/yeongnyangi-daily-card';export const loginForCurrentPage=()=>{};export const fortuneApi=async()=>{if(location.search==='?guest')throw {status:401};return {day:kstDateKey(),unlocked:false};};window.unlock=()=>window.dispatchEvent(new CustomEvent('cd:yeongnyangi-daily-pass',{detail:{day:kstDateKey(),unlocked:true}}));`,
 };
 const built=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import DailyTarotCard from './app/yeongnyangi/_components/DailyTarotCard';createRoot(document.getElementById('root')).render(<DailyTarotCard/>);`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,outdir:'tarot-mock',jsx:'automatic',plugins:[{name:'tarot-mocks',setup(b){b.onResolve({filter:/.*/},a=>mocks[a.path]?{path:a.path,namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'tsx',resolveDir:process.cwd()}));}}]});
 const js=built.outputFiles.find(f=>f.path.endsWith('.js')).text,css=built.outputFiles.find(f=>f.path.endsWith('.css')).text;
 const room=readFileSync('app/yeongnyangi/_original/room.css','utf8');
 const server=createServer((req,res)=>{
  if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(js);}
  else if(req.url.startsWith('/assets/yeongnyangi/')){res.setHeader('Content-Type',req.url.endsWith('.avif')?'image/avif':req.url.endsWith('.png')?'image/png':'image/webp');try{res.end(readFileSync(resolve('public',req.url.slice(1))));}catch{res.statusCode=404;res.end();}}
  else{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<html lang="ko"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0;background:#17121e;color:#f8efe4;font-family:Arial,sans-serif}*{box-sizing:border-box}${room}${css}</style><div id="root" class="ynOriginal"></div><script src="/app.js"></script></html>`);}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;let browser;
 try{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
  for(const width of [360,390,430,1280]){
   await page.setViewportSize({width,height:1000});await page.goto(origin);
   const hero=page.getByRole('img',{name:/안내 삽화/});await hero.waitFor();await hero.evaluate(img=>img.decode());
   assert.ok(await hero.evaluate(img=>img.naturalWidth>0));assert.equal(await page.locator('.daily-tarot-flip').count(),0);
   assert.equal(await page.getByRole('link',{name:'출석 멸치로 열기'}).getAttribute('href'),'#daily');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(process.env.HAT_CAPTURE_DIR){mkdirSync(process.env.HAT_CAPTURE_DIR,{recursive:true});await page.locator('#daily-tarot').screenshot({path:join(process.env.HAT_CAPTURE_DIR,`tarot-locked-${width}.png`)});}
   await page.evaluate(()=>window.unlock());const cards=page.locator('.daily-tarot-flip');await cards.first().waitFor();
   for(let i=0;i<3;i++)await cards.nth(i).click();await page.getByRole('heading',{name:'내일의 종합 리딩'}).waitFor();
   await page.getByRole('img',{name:'카드를 든 영냥이',exact:true}).evaluate(img=>img.decode());
   assert.equal(await page.locator('.daily-tarot-flip[aria-expanded=true]').count(),3);
   await page.getByRole('button',{name:'오늘의 운세',exact:true}).click();assert.equal(await page.locator('.daily-tarot-flip[aria-expanded=true]').count(),0);
   await page.getByRole('button',{name:'내일의 운세',exact:true}).click();assert.equal(await page.locator('.daily-tarot-flip[aria-expanded=true]').count(),3);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.goto(`${origin}?guest`);await page.getByRole('button',{name:'로그인하고 출석하기'}).waitFor();assert.equal(await page.locator('.daily-tarot-flip').count(),0);
  assert.deepEqual(errors,[]);
 }finally{try{await browser?.close();}finally{await new Promise(r=>server.close(r));}}
});
