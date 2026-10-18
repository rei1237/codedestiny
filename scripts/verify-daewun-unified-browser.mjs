import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
import { buildSajuSectionHtml } from '../worker/lib/saju-section/report.js';
import { HONEY_UNLOCK_PRODUCTS } from '../worker/lib/honey-unlock-catalog.js';


// Only local mock access and section responses; no payment, LLM or production DB.
const root=process.cwd(), requests=[], forbidden=[];
const output=process.env.CD_DAEWUN_PROOF_DIR||resolve('.tmp/daewun-unified');
let unlocked=false;
const server=createServer(async(req,res)=>{
 const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const json=(body,status=200)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(body));};
 if(path==='/api/auth/me')return json({ok:true,authenticated:true,user:{id:'daewun-mock',name:'검수'}});
 if(path==='/api/honey/catalog')return json({ok:true,products:HONEY_UNLOCK_PRODUCTS,otherUses:[]});
 if(path==='/api/saju/section'){
  let raw='';for await(const part of req)raw+=part;const body=JSON.parse(raw);requests.push(body.featureKey);
  if(!unlocked||body.featureKey!=='section_daewun')return json({ok:false},402);
  return json({ok:true,unlocked:true,featureKey:body.featureKey,...buildSajuSectionHtml({...body,birth:{...body.birth,calendarDate:body.birth.date}})});
 }
 if(path.startsWith('/api/')){if(req.method!=='GET'&&path!=='/api/kasi/calendar')forbidden.push(path);return json({ok:true,profiles:[],unlocks:[],data:{}});}
 const file=resolve(root,'public','.'+(path.endsWith('/')?path+'index.html':path));
 if(!file.startsWith(resolve(root,'public')+'/')&&!file.startsWith(resolve(root,'public')+'\\')){res.writeHead(403);res.end();return;}
 try{const data=await readFile(file);res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml','.wasm':'application/wasm'})[extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'});
 await page.routeWebSocket('**',socket=>socket.close());
 await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 await page.goto(origin+'/ggulggul/?action=cdOneStepFreeSajuEntry');
 await page.locator('#nameInput').fill('검수');await page.locator('#birthDate').fill('1990-01-15');await page.locator('#btnF').click();await page.locator('#run-btn').click();
 await page.getByRole('button',{name:'동의하고 결과 보기',exact:true}).click();
 await page.waitForFunction(()=>window.__cdLastDaewunBazi&&window.SajuReadingPresentation);
 await page.evaluate(async()=>{
  await window.__cdEnsureDestinyProfileLoaded();
  const bazi=window.__cdLastDaewunBazi;
  const profile={id:'daewun-mock',name:'검수',gender:'F',birth:{year:1990,month:1,day:15,hour:12,minute:0,calType:'solar'},location:{lat:37.5665,lng:126.978,tzOffset:9,name:'서울'}};
  window.DestinyProfileManager.storage.save([profile]);window.DestinyProfileManager.storage.setCurrent(profile.id);
  window.__cdLastDaewunBazi=bazi;
  window.__daewunMockUnlocked=false;
  window.CodeDestinyAccessStore.getSnapshot=()=>({profileId:'daewun-mock',status:'ready',persistentUnlocks:window.__daewunMockUnlocked?{section_daewun:true}:{},optimistic:{},lastPayload:{authority:'server',completeness:'full'}});
  window.dispatchEvent(new CustomEvent('cd:unlocks-changed'));
  renderCurrentSeasonSummary(bazi);
 });
 assert.equal(await page.locator('#currentSeasonSummary').textContent(),'');
 assert.equal(await page.locator('#currentSeasonCard').isVisible(),false);
 assert.equal(await page.locator('#dwGrid .dw-item').count(),0);
 assert.equal(requests.length,0);
 unlocked=true;
 await page.evaluate(()=>{window.__daewunMockUnlocked=true;window.dispatchEvent(new CustomEvent('cd:unlocks-changed'));});
 await page.locator('#currentSeasonCard').waitFor({state:'visible'});
 assert.match(await page.locator('#currentSeasonSummary').textContent(),/현재 대운/);
 assert.match(await page.locator('#currentSeasonSummary').textContent(),/올해의 나/);
 await page.locator('#dwGrid .dw-item').first().click();
 await page.locator('#dwDetail .saju-cycle-guide').waitFor({state:'visible'});
 assert.equal(await page.locator('#yearList .year-row').count(),10);
 assert.equal(await page.locator('#daewunGate #currentSeasonCard').count(),1);
 await mkdir(output,{recursive:true});
 const metrics=[];
 for(const width of [360,390,430,1280]){
  await page.setViewportSize({width,height:900});await page.locator('#currentSeasonCard').scrollIntoViewIfNeeded();
  const bounds=await page.locator('#currentSeasonCard').evaluate(el=>({width:innerWidth,left:el.getBoundingClientRect().left,right:el.getBoundingClientRect().right,overflow:el.scrollWidth>el.clientWidth+1}));
  assert.equal(bounds.overflow,false);assert(bounds.left>=0&&bounds.right<=width);metrics.push(bounds);
  await page.screenshot({path:resolve(output,'unified-'+width+'.png')});
 }
 // Recalculation while locked cannot retain a previous person's current-year reading.
 unlocked=false;
 await page.evaluate(()=>{window.__daewunMockUnlocked=false;window.dispatchEvent(new CustomEvent('cd:profile-changed',{detail:{profileId:'different-profile',birthChanged:true}}));renderCurrentSeasonSummary();});
 assert.equal(await page.locator('#currentSeasonSummary').textContent(),'');
 assert.equal(await page.locator('#dwGrid .dw-item').count(),0);
 assert.equal(await page.locator('#dwDetail').textContent(),'');
 assert.deepEqual(forbidden,[]);assert(requests.every(key=>key==='section_daewun'));
 console.log(JSON.stringify({output,metrics,sectionRequests:requests.length,forbidden,lockedEmpty:true,unlockedUnified:true,profileChangeCleared:true}));
}finally{await browser.close();await new Promise(done=>server.close(done));}
