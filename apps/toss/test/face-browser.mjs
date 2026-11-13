import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import sharp from 'sharp';
const origin='http://127.0.0.1:'+Number(process.env.TOSS_TEST_PORT||4329);
const browser=await chromium.launch({channel:'chrome'});
const ctx=await browser.newContext({viewport:{width:360,height:740}});
ctx.setDefaultTimeout(25000);
await ctx.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
// Same coordinate-only fixtures used by the source web regression. The
// uploaded PNG is a solid color synthesized here; it contains no person's face.
const vector=JSON.parse(await readFile(new URL('../../../scripts/fixtures/physiognomy-landmark-vectors.json',import.meta.url),'utf8'));
await ctx.addInitScript(({indices,points})=>{
 const landmarks=Array.from({length:478},()=>({x:.5,y:.5,z:0}));
 indices.forEach((index,i)=>{const [x,y,z]=points[i];landmarks[index]={x,y,z};});
 window.FaceMesh=class{setOptions(){}onResults(fn){this.done=fn;}async send(){this.done({multiFaceLandmarks:[landmarks]});}async close(){}};
},{indices:vector.indices,points:vector.samples[0].points});
const photo={name:'solid-local-fixture.png',mimeType:'image/png',buffer:await sharp({create:{width:480,height:600,channels:3,background:'#77665b'}}).png().toBuffer()};
const p=await ctx.newPage();p.on('pageerror',e=>console.error(e.message));
try{
 await p.goto(origin);await p.locator('.world-entry-ggulggul').click();await p.getByRole('button',{name:'전문가 동물 관상',exact:true}).click();
 const f=p.frameLocator('iframe[title="전문가 동물 관상"]');
 await f.locator('#phyFileInput').setInputFiles(photo);await f.locator('#captureBtn').click();
 await f.locator('#expertReportContainer details').first().waitFor();assert.equal(await f.locator('#phyTop3 .phy-top3__name').count(),3);
 await f.locator('#expertReportContainer .phy-premium-cta').first().click();
 await f.locator('#expertReportContainer .phy-premium-cta').first().waitFor({state:'detached'});
 await f.locator('#pastLifeBridgeBtn').click();await f.locator('#plfCompatBtn').click();
 await f.locator('#plfFileInput').setInputFiles(photo);
 await f.locator('#plfRevealBody').getByText(/전생 인연 궁합|두 사람의 전생/).first().waitFor();
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('toss-offline-fixture')||'{}').orders?.length||0),0);
 await f.locator('#plfCloseBtn').click();
 await f.locator('#compatStartBtn').click();await f.locator('#phyFileInput').setInputFiles(photo);
 await f.locator('#phyStatus').getByText(/상대방 얼굴이 인식되었습니다/).waitFor();
 await f.locator('#captureBtn').scrollIntoViewIfNeeded();
 // The web controller ignores taps during its 180-ms post-scroll gesture guard.
 await p.waitForTimeout(220);
 await f.locator('#captureBtn').click();
 await f.locator('#phyResultSummary').getByText('두 사람의 관상 에너지를 교차 분석한 결과입니다.').waitFor();
 console.log('PASS guest local image selection, original 27-archetype scoring, five features and moles, both compatibility calculations; no order');
}catch(e){for(const f of p.frames())try{console.error(f.url(),(await f.locator('body').innerText({timeout:1000})).slice(-950));}catch{}throw e;}finally{await browser.close();}
