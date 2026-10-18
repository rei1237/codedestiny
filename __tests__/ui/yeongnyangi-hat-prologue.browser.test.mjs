import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {readFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {chromium} from '@playwright/test';

// Render the actual SortingHat + Prologue; replace only framework image and external dependencies.
const entry=`import React from 'react';import{createRoot}from'react-dom/client';import SortingHat from './app/yeongnyangi/_components/SortingHat';
window.calls=[];window.requests=[];window.account='owner';window.fixture=id=>({version:'mock',houseId:id,mode:'complete',usedCount:6,systems:[],reasons:[]});
createRoot(document.getElementById('root')).render(<SortingHat/>);`;
const mocks={
 'next/image':`import React from 'react';export default function Image({priority,fill,...props}){return <img {...props}/>}`,
 '@/app/_lib/profile-card-storage':`export const readDestinyProfileAccountId=()=>window.account;`,
 '../_lib/api':`export const loginForCurrentPage=()=>{};export const fortuneApi=(path,body)=>{window.calls.push({path,body});return new Promise((resolve,reject)=>window.requests.push({resolve,reject}));};`,
 '../_lib/use-profiles':`import{useState}from'react';export const profileKey=p=>p.id;export function useProfiles(){const[id,setId]=useState('a');window.changeProfile=setId;return {profileId:id,profiles:[{id:'a'},{id:'b'}],loading:false,guest:false,refresh:async()=>{}};}`,
 './ProfilePicker':`import React from 'react';export default function Picker(){return <button onClick={()=>window.changeProfile('b')}>테스트 프로필 변경</button>}`,
};
test('hat story: six houses, reveal, skip, errors, stale requests, keyboard and mobile',async()=>{
 const built=await build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,outdir:'hat-mock',jsx:'automatic',plugins:[{name:'hat-mocks',setup(b){b.onResolve({filter:/.*/},a=>mocks[a.path]?{path:a.path,namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'tsx',resolveDir:process.cwd()}));}}]});
 const js=built.outputFiles.find(f=>f.path.endsWith('.js')).text,css=built.outputFiles.find(f=>f.path.endsWith('.css')).text;
 const tokens=`:root{--yn-ivory:#f8efe4;--yn-deep:#17121e;--yn-surface:#251c2d;--yn-gold:#e5c788;--yn-muted:#c8b8ce;--yn-line:#67516b;--yn-radius:18px;--font-body:Arial,sans-serif}body{margin:0;background:#17121e}*{box-sizing:border-box}`;
 const server=createServer((req,res)=>{if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(js);}else if(req.url.startsWith('/assets/yeongnyangi/hat/')){res.setHeader('Content-Type',req.url.endsWith('.png')?'image/png':'image/webp');res.end(readFileSync(resolve('public',req.url.slice(1))));}else{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<html lang="ko"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${tokens}${css}</style><div id="root"></div><script src="/app.js"></script></html>`);}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin=`http://127.0.0.1:${server.address().port}`;let browser;
 try{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
  const story=page.getByRole('region',{name:'모자의 배정 이야기'}),dialogue=story.locator('button').first();
  async function start(){await page.goto(origin);await page.getByRole('button',{name:'내 기숙사 알아보기'}).click();await page.getByRole('button',{name:'모자 써보기',exact:true}).click();}
  async function settle(id,index=0){await page.evaluate(({id,index})=>window.requests[index].resolve({result:window.fixture(id)}),{id,index});}
  const ids=['moon-library','star-forge','dawn-tower','gold-vault','wind-gallery','star-greenhouse'];
  const names=['달빛서가','별불공방','새벽첨탑','금실금고','바람회랑','별숲온실'];
  for(let i=0;i<ids.length;i++){
   await page.setViewportSize({width:[360,390,430,1280,390,360][i],height:900});await start();await settle(ids[i]);
   assert.equal(await story.getByRole('img',{name:/의 문장$/}).count(),6);
   assert.equal(await story.locator('img').getAttribute('src'),'/assets/yeongnyangi/hat/spirit-hat-v2.png');
   assert.equal(await page.locator('#hat-result-title').count(),0);
   assert.equal(await page.evaluate(()=>window.calls.length),1);
   await dialogue.getByText('다음 대사',{exact:true}).waitFor();
   for(let n=0;n<6;n++){
    const previous=await dialogue.getAttribute('aria-label');await dialogue.press('Enter');
    await page.waitForFunction(previous=>document.querySelector('[aria-label="모자의 배정 이야기"] button')?.getAttribute('aria-label')!==previous,previous);
   }
   await dialogue.getByText('다음 대사',{exact:true}).waitFor();await dialogue.press('Enter');
   await page.locator('[data-reveal="true"]').waitFor();
   assert.equal(await story.locator('img').evaluate(el=>getComputedStyle(el.parentElement).animationName),'none');
   assert.equal(await page.locator('[data-lit="true"] [data-house-name]').innerText(),names[i]);
   assert.equal(await page.locator('[data-lit="true"]').count(),1);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(process.env.HAT_CAPTURE_DIR){mkdirSync(process.env.HAT_CAPTURE_DIR,{recursive:true});await story.screenshot({path:join(process.env.HAT_CAPTURE_DIR,`hat-${i}.png`)});}
   await dialogue.press('Space');await dialogue.press('Enter');
   await page.locator('#hat-result-title').waitFor();assert.equal(await page.locator('#hat-result-title').innerText(),names[i]);
   assert.equal(await page.evaluate(()=>document.activeElement.id),'hat-result-title');
   const result=page.getByRole('article',{name:names[i],exact:true});
   await result.getByText('모자가 읽은, 타고난 마음의 결',{exact:true}).waitFor();
   assert.ok(await result.locator('figure img').evaluate(img=>img.complete&&img.naturalWidth>0));
   const secret=result.locator('details').filter({hasText:'모자의 비밀 쪽지 펼치기'});
   assert.equal(await secret.getAttribute('open'),null);await secret.locator('summary').click();assert.notEqual(await secret.getAttribute('open'),null);
   const choices=result.locator('button[aria-pressed]');await choices.nth(0).click();const reply=await result.getByRole('status').first().innerText();await choices.nth(1).click();assert.notEqual(await result.getByRole('status').first().innerText(),reply);assert.equal(await choices.nth(1).getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(()=>window.calls.length),1);
   assert.equal(await page.locator('#hat-result-title').innerText(),names[i]);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   if(process.env.HAT_CAPTURE_DIR)await result.screenshot({path:join(process.env.HAT_CAPTURE_DIR,`result-${i}.png`)});
  }
  await start();await story.getByRole('button',{name:'이야기 건너뛰기'}).click();assert.equal(await page.locator('#hat-result-title').count(),0);await settle(ids[0]);await page.locator('#hat-result-title').waitFor();
  await start();for(let n=0;n<6;n++)await dialogue.click();assert.equal(await page.locator('[data-reveal="true"]').count(),0);await settle(ids[1]);await story.getByRole('button',{name:/창작/}).waitFor();assert.match(await dialogue.getAttribute('aria-label'),/창작/);
  await start();await page.evaluate(()=>window.requests[0].reject(new Error('mock failure')));await story.getByRole('button',{name:'배정 다시 시도하기'}).click();await settle(ids[2],1);await story.getByRole('button',{name:'이야기 건너뛰기'}).click();await page.locator('#hat-result-title').waitFor();assert.equal(await page.evaluate(()=>window.calls.length),2);
  await start();await page.getByRole('button',{name:'테스트 프로필 변경'}).click();await story.waitFor({state:'detached'});await settle(ids[0]);assert.equal(await story.count(),0);assert.equal(await page.locator('#hat-result-title').count(),0);await page.getByRole('button',{name:'모자 써보기',exact:true}).click();await settle(ids[5],1);await story.getByRole('button',{name:'이야기 건너뛰기'}).click();await page.locator('#hat-result-title').waitFor();assert.equal(await page.locator('#hat-result-title').innerText(),names[5]);
  await start();await page.evaluate(()=>window.requests[0].resolve({result:{...window.fixture('moon-library'),usedCount:0}}));await story.getByRole('button',{name:'배정 다시 시도하기'}).waitFor();assert.equal(await page.locator('[data-reveal="true"]').count(),0);
  await page.emulateMedia({reducedMotion:'no-preference'});await start();assert.equal(await story.getAttribute('data-speaking'),'true');await dialogue.click();assert.match(await dialogue.innerText(),/오랜만이구나/);await page.waitForTimeout(90);assert.match(await dialogue.innerText(),/오랜만이구나/);assert.equal(await story.getAttribute('data-speaking'),'false');await dialogue.click();assert.match(await dialogue.getAttribute('aria-label'),/영냥이는 잠시/);
  assert.deepEqual(errors,[]);
 }finally{try{await browser?.close();}finally{await new Promise(r=>server.close(r));}}
});
