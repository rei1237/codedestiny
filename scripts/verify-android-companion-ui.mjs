// Actual React component; mocked native state/profile and daily API. No live services.
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir,readdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),out=path.resolve(root,'output/android-20261007/ui-mock');
await mkdir(out,{recursive:true});
const mocks={
  'next/navigation':'export const usePathname=()=>new URLSearchParams(location.search).get("testPath")||"/lock-screen-fortune/index.html";',
  '@/app/hooks/useAiProfileSeed': 'export const useAiProfileSeed=()=>({seed:null,seedVersion:0});',
  '@/app/_lib/api-config':'export const getApiUrl=p=>p;',
  '../_lib/auth-client':'export const isMobileAppRuntime=()=>true;',
  '@/constants/loadingMessages':'export const getCurrentLoadingLocale=()=>window.TEST_LOCALE||"ko"; export const INTL_LOCALE_BY_LOADING_LOCALE={ko:"ko-KR",en:"en-US",ja:"ja-JP","zh-CN":"zh-CN"};',
  './cms/build-text':'export const cmsLines=(a,b,c,fallback)=>fallback;',
};
const result=await build({stdin:{contents:'import React from "react";import {createRoot} from "react-dom/client";import App from "./app/lock-screen-fortune/LockScreenFortuneClient";import OfflineOverlay from "./app/components/OfflineOverlay";createRoot(document.getElementById("root")).render(<><App/><OfflineOverlay/></>);',resolveDir:root,loader:'tsx'},bundle:true,write:false,format:'iife',jsx:'automatic',platform:'browser',tsconfig:path.join(root,'tsconfig.json'),plugins:[{name:'mock-boundaries',setup(b){b.onResolve({filter:/.*/},a=>a.path in mocks?{path:a.path,namespace:'mock'}:undefined);b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:mocks[a.path],loader:'js'}));}}]});
const bundle=result.outputFiles[0].text;
const cssdir=path.join(root,'dist/_next/static/css');
const css=(await Promise.all((await readdir(cssdir)).filter(f=>f.endsWith('.css')).map(f=>readFile(path.join(cssdir,f),'utf8')))).join('\n')+'\n'+await readFile(path.join(root,'app/lock-screen-fortune/companion.css'),'utf8');
const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/bundle.js'){res.setHeader('content-type','text/javascript');res.end(bundle);return;}
  if(url.pathname==='/ui.css'){res.setHeader('content-type','text/css');res.end(css);return;}
  if(url.pathname.startsWith('/api/')){res.setHeader('content-type','application/json');const locale=url.searchParams.get('locale')||'ko';const text={ko:['오늘의 흐름','작은 일부터 차분하게 살펴보세요.'],en:['Today’s flow','Take a moment to focus on one small step.'],ja:['今日の流れ','小さな一歩からゆっくり始めましょう。'],'zh-CN':['今日的节奏','从一件小事开始，慢慢向前。']}[locale];const card={anchor:'QA · MOCK',headline:text[0],body:text[1],personalized:false,label:''};res.end(JSON.stringify({ok:true,date:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date()),systems:{saju:card,sukuyo:card,vedic:card}}));return;}
  if(url.pathname==='/'){res.setHeader('content-type','text/html');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/ui.css"><style>body{margin:0}*{box-sizing:border-box}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');return;}
  const file=path.resolve(root,'public',url.pathname.slice(1));if(!file.startsWith(path.resolve(root,'public')+path.sep))throw Error('invalid path');res.end(await readFile(file));
}catch{res.statusCode=404;res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'chromium',headless:true,args:['--disable-background-networking']});
const evidence=[];
try{
 for(const locale of ['ko','en','ja','zh-CN']){
  const context=await browser.newContext({viewport:{width:390,height:844},locale});
  await context.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
  await context.addInitScript(({locale})=>{window.TEST_LOCALE=locale;window.Capacitor={isNativePlatform:()=>true,Plugins:{CodeDestinyLockScreen:{getState:async()=>({enabled:false,value:'',notificationsAllowed:false}),setState:async()=>{},setPublicContent:async()=>{},setEnabled:async()=>{},scheduleAlarms:async()=>{},testNotification:async()=>({posted:false}),openNotificationSettings:async()=>{}}}};},{locale});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/?content=quote');await page.locator('.cd-companion-sentence').waitFor();
  for(const width of [360,390,412,768]){
   await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${locale} ${width} overflow`);
   await page.screenshot({path:path.join(out,`${locale}-${width}-quote.png`),fullPage:true});
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('.cd-companion-header button').click();await page.getByRole('dialog').waitFor();
  await page.screenshot({path:path.join(out,`${locale}-settings.png`),fullPage:true});
  await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
  if(locale==='ko'){
   await page.locator('.cd-companion-header button').click();await page.getByRole('button',{name:/테마/}).click();
   await page.getByRole('img',{name:'Yeoni · 연이'}).click();await page.keyboard.press('Escape');
   assert.match(await page.locator('.cd-companion-cat').getAttribute('src'),/yeoni.webp/);
   await page.locator('.cd-companion-cat').evaluate(img=>img.decode());
   await page.screenshot({path:path.join(out,'ko-yeoni.png'),fullPage:true});
   await page.evaluate(()=>document.documentElement.style.fontSize='32px');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'200% font overflow');
   await page.screenshot({path:path.join(out,'ko-yeoni-large-text.png'),fullPage:true});
   await page.evaluate(()=>{document.documentElement.style.fontSize='16px';Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false});window.dispatchEvent(new Event('offline'));});
   assert.equal(await page.getByText('인터넷 연결이 끊겼어요',{exact:true}).count(),0,'offline reader must remain available');
   assert.equal(await page.locator('.cd-companion-sentence').isVisible(),true);
   await page.screenshot({path:path.join(out,'ko-yeoni-offline.png'),fullPage:true});
   await page.addInitScript(()=>Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false}));
   await page.goto(origin+'/?testPath=/points/');
   await page.getByText('인터넷 연결이 끊겼어요',{exact:true}).waitFor();
  }
  assert.deepEqual(errors,[]);evidence.push({locale,widths:[360,390,412,768],errors,overflow:false,kind:'React component with mocked native/profile/API boundaries'});await context.close();
 }
 await writeFile(path.join(out,'results.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence,null,2));
}finally{await browser.close();server.close();}
