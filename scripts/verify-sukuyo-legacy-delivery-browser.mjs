import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
import { buildSajuSectionHtml } from '../worker/lib/saju-section/report.js';
import { HONEY_UNLOCK_PRODUCTS } from '../worker/lib/honey-unlock-catalog.js';

const root=process.cwd(), requests=[], archives=[];
let failSection=true, archiveAttempts=0;
const server=createServer(async(req,res)=>{
  const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const json=(value,status=200)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(value));};
  if(path==='/api/auth/me')return json({ok:true,authenticated:true,user:{id:'sukuyo-mock',name:'검수'}});
  if(path==='/api/honey/catalog')return json({ok:true,products:HONEY_UNLOCK_PRODUCTS,otherUses:[]});
  if(path==='/api/honey/attendance')return json({ok:true,attendance:{},wallet:{balance:0}});
  if(path==='/api/saju/section'){
    let raw='';for await(const chunk of req)raw+=chunk;
    const body=JSON.parse(raw);requests.push(body);
    if(failSection)return json({ok:false,message:'mock 기록 지연'},503);
    const report=buildSajuSectionHtml({featureKey:body.featureKey,gender:'F',partnerGender:'M',lang:'ko',sukuyo:{mine:{moonEclipticLongitude:150},partner:{moonEclipticLongitude:190}}});
    return json({ok:true,unlocked:true,featureKey:body.featureKey,...report});
  }
  if(path==='/api/sukuyo/compat/archive'){
    let raw='';for await(const chunk of req)raw+=chunk;archives.push(JSON.parse(raw));
    if(archiveAttempts++===0)return json({ok:false},503);
    return json({ok:true,recordId:'mock-record'});
  }
  if(path.startsWith('/api/'))return json({ok:true,profiles:[],unlocks:[],data:{}});
  const file=resolve(root,'public','.'+(path.endsWith('/')?path+'index.html':path));
  if(!file.startsWith(resolve(root,'public'))) {res.writeHead(403);res.end();return;}
  try{const data=await readFile(file);res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml','.wasm':'application/wasm'})[extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'});
  await page.routeWebSocket('**',socket=>socket.close());
  await page.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  await page.goto(origin+'/ggulggul/?action=cdOneStepFreeSajuEntry');
  await page.locator('#nameInput').fill('검수');await page.locator('#birthDate').fill('1990-01-15');await page.locator('#btnF').click();await page.locator('#run-btn').click();
  await page.getByRole('button',{name:'동의하고 결과 보기',exact:true}).click();
  await page.waitForFunction(()=>typeof window.openSukuyoModal==='function');
  await page.evaluate(async()=>{
    await window.__cdEnsureDestinyProfileLoaded();
    const profile={id:'sukuyo-mock',name:'검수',gender:'F',birth:{year:1990,month:1,day:15,hour:12,minute:0,calType:'solar'},location:{lat:37.5665,lng:126.978,tzOffset:9,name:'서울'}};
    window.DestinyProfileManager.storage.save([profile]);window.DestinyProfileManager.storage.setCurrent(profile.id);
    await window.__cdEnsureBirthModalDepsLoaded();window.openSukuyoModal();
  });
  await page.locator('.sy-master-intro').waitFor({timeout:60000});
  await mkdir('.tmp/sukuyo-visual',{recursive:true});
  for(const width of [360,390,430,1280]){
    await page.setViewportSize({width,height:900});
    const card=page.locator('.sy-master-intro');await card.scrollIntoViewIfNeeded();
    await card.locator('.sy-master-art').evaluate(img=>img.decode());
    const bounds=await card.evaluate(el=>({overflow:el.scrollWidth>el.clientWidth+1,image:el.querySelector('img').getBoundingClientRect().toJSON(),text:el.querySelector('.sy-master-reading').getBoundingClientRect().toJSON()}));
    assert.equal(bounds.overflow,false);assert(bounds.image.right<=width);assert(bounds.image.right<=bounds.text.left+1||bounds.image.bottom<=bounds.text.top+1);
    await card.screenshot({path:`.tmp/sukuyo-visual/hanbi-${width}.png`});
  }
  await page.setViewportSize({width:390,height:900});
  await page.locator('#sy3BirthY').selectOption('1992');await page.locator('#sy3BirthM').selectOption('3');await page.locator('#sy3BirthD').selectOption('4');
  await page.evaluate(()=>{window.__sukuyoMockGateCalls=0;window._cdOpenPaidServiceGate=async options=>{window.__sukuyoMockGateCalls++;window.__sukuyoOriginalId=options.requestId+'r';return{status:'granted',payload:{data:{consume:{accessMethod:'PASS'}}},requestId:window.__sukuyoOriginalId};};});
  // Directly open the actual paid CTA handler; payment itself is a mock, section client is real.
  await page.evaluate(()=>window.openSukuyoCompatDetail(window._syWheelState.mansionIdx,window._syWheelState.mansion));
  await page.getByRole('button',{name:'같은 결제로 결과 다시 불러오기'}).waitFor({timeout:90000});
  assert(requests.length>0);assert.equal(requests[0].accessMethod,'pass');
  failSection=false;
  await page.getByRole('button',{name:'같은 결제로 결과 다시 불러오기'}).click();
  await page.locator('.sy-archive-status a').waitFor({timeout:45000});
  assert.equal(await page.evaluate(()=>window.__sukuyoMockGateCalls),1);
  assert.equal(new Set(requests.map(row=>row.requestId)).size,1);
  assert.equal(requests[0].requestId,await page.evaluate(()=>window.__sukuyoOriginalId));
  assert.equal(new Set(archives.map(row=>row.requestId)).size,1);
  assert.equal(archives.length,2);assert(archives[0].sections.length>0);
  await page.locator('#sy3Result').screenshot({path:'.tmp/sukuyo-visual/result.png'});
  console.log(JSON.stringify({ok:true,widths:[360,390,430,1280],gateCalls:1,sectionRequests:requests.length,archiveAttempts:archives.length,mode:'mock only; real legacy DOM and section client'},null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
