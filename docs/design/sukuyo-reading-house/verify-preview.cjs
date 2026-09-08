const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();const page=await browser.newPage({reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().url().startsWith('file:')?r.continue():r.abort());
 await page.goto('file:///'+path.join(__dirname,'preview.html').replaceAll('\\','/'));
 const results=[];
 for(const width of [1040,360,390,430]){
  await page.setViewportSize({width,height:900});await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:path.join(__dirname,`preview-${width}.png`),fullPage:width===1040});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'overflow '+width);
  assert.equal(await page.locator('#mansion-grid button').count(),27);
  assert.equal(await page.locator('.sy-hero img').evaluate(i=>i.complete&&i.naturalWidth>0),true);
  results.push({width,overflow:false});
 }
 await page.locator('#search').fill('위');assert.equal(await page.locator('#mansion-grid button:visible').count(),2);
 await page.locator('#mansion-grid button:visible').last().click();assert.equal(await page.locator('#mansion-han').innerText(),'胃宿');
 await page.locator('#search').fill('없는숙');assert.equal(await page.locator('#mansion-grid button:visible').count(),0);
 await page.locator('#search').fill('');
 for(let i=0;i<27;i++){await page.locator('#mansion-grid button').nth(i).click();assert.ok((await page.locator('#core').innerText()).length>30);assert.ok((await page.locator('#love-text').innerText()).length>20);}
 for(let i=0;i<3;i++){await page.locator(`[data-story="${i}"]`).click();assert.equal(await page.locator('#story-reader').isVisible(),true);await page.locator('#close-story').click();assert.equal(await page.locator('#story-reader').isVisible(),false);assert.equal(await page.locator(`[data-story="${i}"]`).evaluate(e=>e===document.activeElement),true);}
 await page.locator('#theme').click();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(__dirname,'preview-neo-430.png')});
 assert.deepEqual(errors,[]);
 const rgb=h=>h.match(/../g).map(c=>parseInt(c,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 const lum=h=>rgb(h).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 const contrast=(a,b)=>{let x=lum(a),y=lum(b);return +( (Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2)};
 const colors={yeonBody:contrast('fff1f7','3a0e28'),yeonMuted:contrast('dbb3c4','3a0e28'),neoBody:contrast('f4eeff','13102a'),neoMuted:contrast('c8bada','13102a'),primary:contrast('24081a','f4bed1')};
 assert.ok(Object.values(colors).every(v=>v>=4.5));
 const result={scope:'prototype only',viewports:results,mansions:27,articles:3,contrast:colors,errors};fs.writeFileSync(path.join(__dirname,'verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
