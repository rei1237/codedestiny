// Exercise every visible destination from a fresh visit to the normal character home.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const origin=process.env.TOSS_OFFLINE_ORIGIN;
assert.equal(new URL(origin).hostname,'127.0.0.1');
const browser=await chromium.launch({channel:'chrome'});
try{
 const context=await browser.newContext({viewport:{width:360,height:740},serviceWorkers:'block',reducedMotion:'reduce'});
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage();page.setDefaultTimeout(45000);
 const failures=[],evidence=[];
 async function openHome(){await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('.world-entry-ggulggul').click();await page.getByRole('searchbox').waitFor();}
 await openHome();
 const titles=await page.locator('.directory-list button strong').allTextContents();
 assert.equal(new Set(titles).size,titles.length);
 for(const title of titles){
  try{
   await openHome();await page.getByRole('searchbox').fill(title);
   const button=page.locator('.directory-list button').filter({has:page.getByText(title,{exact:true})});
   await button.click();
   await page.waitForFunction(()=>!document.querySelector('.fortune-directory')&&document.body.innerText.trim().length>16);
   await page.locator('h1,h2,[role=alert],button,label').filter({visible:true}).first().waitFor();
   const url=new URL(page.url()),heading=await page.locator('h1,h2,[role=alert],label,button').filter({visible:true}).allTextContents();
   const content=heading.map(x=>x.trim()).filter(Boolean).slice(0,4).join(' / ');
   assert.ok(content,title);
   evidence.push({title,path:url.pathname+url.search,visible:content});
  }catch(error){failures.push({title,error:error.message.split('\n')[0]});}
 }
 console.log(JSON.stringify({destinations:titles.length,opened:evidence.length,failures}));
 if(process.env.TOSS_DIRECTORY_EVIDENCE)await writeFile(process.env.TOSS_DIRECTORY_EVIDENCE,JSON.stringify({destinations:titles.length,evidence,failures},null,2)+'\n');
 assert.deepEqual(failures,[]);
}finally{await browser.close();}
