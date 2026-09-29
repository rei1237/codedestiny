import './lib/mock-network-guard.cjs';
import {chromium} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=process.cwd(),out='build-cache/signup-result-gate';
await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const pathname=['/','/ggulggul/'].includes(url.pathname)?'/index.html':url.pathname;
 const file=resolve(root,'.'+pathname);
 if(!file.startsWith(root+'\\')&&!file.startsWith(root+'/')){res.writeHead(403);res.end();return;}
 try{const data=await readFile(file);res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`,browser=await chromium.launch();
const evidence=[];
try{
 for(const width of [360,390,430,1280]){
  let signedIn=false,authCalls=0;
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname.startsWith('/api/')){
    if(url.pathname==='/api/auth/me'){authCalls++;await route.fulfill({status:signedIn?200:401,json:signedIn?{ok:true,authenticated:true,user:{id:'mock-result-user',name:'검증'}}:{ok:false,error:'unauthorized'}});return;}
    await route.fulfill({status:200,json:{ok:true,profiles:[],unlocks:[],data:{}}});return;
   }
   if(url.origin!==origin){await route.abort();return;}
   if(url.pathname.replace(/\/$/,'')==='/login'){await route.fulfill({contentType:'text/html',body:'<p>Mock OAuth boundary</p>'});return;}
   await route.continue();
  });
  await context.addInitScript(()=>sessionStorage.setItem('privacyAgreed','true'));
  const page=await context.newPage();page.on('dialog',d=>d.dismiss());
  await page.goto(origin,{waitUntil:'domcontentloaded'});
  await page.locator('#cdQuickServices a[href*="cdOneStepFreeSajuEntry"]').click();
  await page.locator('#birthDate').fill('19900515');
  await page.locator('#nameInput').fill('입력복원검증');
  await page.locator('#run-btn').click();
  await page.locator('#cdLoginRequiredModal.is-open').waitFor();
  assert.equal(await page.locator('#resultPage').isVisible(),false);
  assert.ok(authCalls>0,'server session checked');
  const draft=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('cd:saju-login-draft:v1')));
  assert.equal(draft.fields.birthDate.replaceAll('-',''),'19900515');
  assert.match(await page.locator('#cdLoginRequiredDesc').textContent(),/회원가입/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`${out}/gate-${width}.png`,animations:'disabled'});
  await page.locator('[data-cd-login-close="1"]').click();
  assert.equal(await page.locator('#resultPage').isVisible(),false);
  // Reload after cancelled login retains the input, but does not redirect again.
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#cdQuickServices a[href*="cdOneStepFreeSajuEntry"]').click();
  await page.waitForFunction(()=>document.getElementById('birthDate').value.replaceAll('-','')==='19900515');
  assert.equal(await page.locator('#cdLoginRequiredModal.is-open').count(),0);
  await page.locator('#run-btn').click();
  await page.locator('#cdLoginRequiredModal.is-open [data-cd-login-action="login"]').click();
  await page.waitForURL('**/login?**');
  const returnPath=new URL(page.url()).searchParams.get('next');
  assert.ok(returnPath.includes('action=cdOneStepFreeSajuEntry'));
  assert.ok(!returnPath.includes('1990'));
  // Mock the completed OAuth session; the real bootstrap, draft and engine resume.
  signedIn=true;
  await page.goto(origin+returnPath,{waitUntil:'domcontentloaded'});
  await page.locator('#resultPage').waitFor({state:'visible',timeout:60000});
  await page.waitForFunction(()=>sessionStorage.getItem('cd:saju-login-draft:v1')===null);
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('cd:saju-login-draft:v1')),null);
  await page.screenshot({path:`${out}/resumed-${width}.png`});
  evidence.push({width,guestBlocked:true,cancelRestored:true,mockLoginResumed:true,authCalls});
  await context.close();
 }
 await writeFile(`${out}/results.json`,JSON.stringify({mode:'mock browser; no real OAuth, payments or LLM',evidence},null,2));
 console.log(JSON.stringify(evidence));
}finally{await browser.close();await new Promise(r=>server.close(r));}
