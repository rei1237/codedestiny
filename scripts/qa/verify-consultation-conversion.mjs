// Local visual proof. Production hosts, payments, microphones and cameras are never used.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import {chromium} from 'playwright';
import {renderConsultationDiscovery} from '../../lib/marketing/consultation-discovery.mjs';
const root=process.cwd(),out=path.join(root,'build-cache/consultation-conversion');
fs.mkdirSync(out,{recursive:true});
const require=createRequire(import.meta.url);
await build({
 stdin:{contents:'import React from "react";import{createRoot}from"react-dom/client";import Landing from "./src/features/master-love-codex/components/CodexLanding";createRoot(document.getElementById("root")).render(<Landing hasSeenPrologue={false} chapterCount={20} onEnter={mode=>{window.selectedMode=mode||"default"}} onReplayPrologue={()=>{}}/>);',resolveDir:root,loader:'tsx'},
 absWorkingDir:root,alias:{'@':root},bundle:true,jsx:'automatic',format:'iife',platform:'browser',
 define:{'process.env.NODE_ENV':'"development"','process.env':'{}'},outfile:path.join(out,'app.js'),
 plugins:[{name:'local-next-navigation',setup(b){
   b.onResolve({filter:/^next\/(image|link|navigation)$/},args=>({path:args.path,namespace:'fixture'}));
   b.onLoad({filter:/.*/,namespace:'fixture'},args=>({loader:'jsx',resolveDir:root,contents:args.path.endsWith('navigation')?'export const usePathname=()=>"/master-love-codex/";export const useRouter=()=>({push:()=>{}});export const useSearchParams=()=>new URLSearchParams("lang=ko");':'import React from "react";export default function Component({priority,fill,loader,unoptimized,placeholder,blurDataURL,children,...props}){return React.createElement("'+(args.path.endsWith('image')?'img':'a')+'",props,children)}'}));
 }}],
});
const css=await postcss([tailwindcss({...require('../../tailwind.config.js'),content:['./src/features/master-love-codex/**/*.{tsx,ts}','./app/components/{CraftedProductDetail,SampleSurface,PriceBadge}.tsx']})]).process('@tailwind base;@tailwind components;@tailwind utilities;',{from:undefined});
fs.writeFileSync(path.join(out,'tailwind.css'),css.css);
const html='<html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/tailwind.css"><link rel="stylesheet" href="/app.css"><div id="root"></div><script>window.sampleEvents=[];window.cdTrack=(name,payload)=>sampleEvents.push({name,payload});</script><script src="/app.js"></script></html>';
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),name=url.pathname.slice(1);
 if(url.pathname==='/discovery/'){res.setHeader('content-type','text/html; charset=utf-8');res.end('<html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles/theme-tokens.css"><link rel="stylesheet" href="/styles/consultation-discovery.css"><style>body{margin:0;font-family:system-ui;background:#100e19}*{box-sizing:border-box}</style>'+renderConsultationDiscovery());return;}
 const base=['app.js','app.css','tailwind.css'].includes(name)?out:path.join(root,'public');
 const file=path.resolve(base,name);
 if(file.startsWith(base+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()){res.setHeader('content-type',({'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));return;}
 res.setHeader('content-type','text/html; charset=utf-8');res.end(html);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
let browser;const evidence=[];
try{
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext({reducedMotion:'reduce',serviceWorkers:'block'});
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.origin!==origin)return route.abort();
  if(url.pathname.startsWith('/api/'))return route.fulfill({json:{ok:true,authenticated:false,profiles:[],sessions:[],data:{}}});
  return route.continue();
 });
 await context.routeWebSocket('**',socket=>socket.close());
 const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
 for(const width of [360,390,430,1280]){
  await page.setViewportSize({width,height:900});
  await page.goto(origin+'/discovery/');
  await page.getByText('다른 상담도 살펴보기',{exact:true}).click();
  assert.equal(await page.locator('.consultation-discovery a').count(),7);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:path.join(out,'discovery-'+width+'.png'),fullPage:true});
  await page.goto(origin+'/master-love-codex/?lang=ko');
  await page.getByRole('heading',{name:'먼저, 실제 결과의 한 대목을 읽어보세요.'}).waitFor();
  await page.getByRole('heading',{name:'먼저, 실제 결과의 한 대목을 읽어보세요.'}).scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(out,'sample-'+width+'.png')});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  for(const label of ['개인판 상세 안내','궁합판 상세 안내']){
   const region=page.getByRole('region',{name:label});
   await region.locator('summary').first().click();
   await region.locator('.craftedEditorial [data-example-kind="result"]').waitFor();
   await region.locator('.craftedEditorial [data-example-kind="result"]').scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(out,(label.startsWith('개인')?'solo':'pair')+'-'+width+'.png')});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await region.locator('summary').first().click();
  }
  assert.ok(await page.locator('[aria-label*="30,000"]').count()>0,'solo price remains registry-derived');
  assert.ok(await page.locator('[aria-label*="50,000"]').count()>0,'pair price remains registry-derived');
  for (const mode of ['solo','compat']) {
   await page.locator('#codex-plan-'+mode+' button').click();
   assert.equal(await page.evaluate(()=>window.selectedMode),mode,'existing CTA preserves selected consultation');
  }
  evidence.push({width,overflow:false,price:true,examples:true,entryModes:true});
 }
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({passed:true,evidence,externalRequestsAllowed:false,scope:'actual CodexLanding and shared discovery; auth/result covered by separate mock suites'},null,2));
 console.log(JSON.stringify({passed:true,evidence}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
