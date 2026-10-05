import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const origin=process.env.TEA_ALBUM_ORIGIN || 'http://127.0.0.1:26524',out=process.env.TEA_ALBUM_OUTPUT || '.tmp/album-visual'; if(!['127.0.0.1','localhost'].includes(new URL(origin).hostname))throw new Error('Local mock verification only');fs.mkdirSync(out,{recursive:true});
const imageCache=new Map(); const browser=await chromium.launch();const errors=[],calls=[];let wallet={authenticated:false,currentHoneyDrops:0,balance:0,tarotAlbumUnlocked:false};let failUnlock=false;
try {
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block',acceptDownloads:true});
 await context.route('**/*',async r=>{const q=r.request(),u=new URL(q.url());
 if(u.pathname.startsWith('/api/')){calls.push(q.method()+' '+u.pathname);
 if(u.pathname.endsWith('/honey-drops/balance'))return r.fulfill({json:{ok:true,honeyDrops:wallet}});
 if(u.pathname.endsWith('/tarot-album/unlock')){if(failUnlock)return r.fulfill({status:503,json:{ok:false,message:'잠시 후 다시 확인해주세요.'}});wallet={...wallet,currentHoneyDrops:0,balance:0,tarotAlbumUnlocked:true};return r.fulfill({json:{ok:true,success:true,honeyDrops:wallet}});}
 return r.fulfill({json:{ok:false,user:null,authenticated:false,items:[]}});}
 if(u.hostname==='assets.code-destiny.com'&&['image','font'].includes(q.resourceType())){if(!imageCache.has(u.href))imageCache.set(u.href,(async()=>{const response=await r.fetch();return {status:response.status(),body:await response.body(),headers:{...response.headers(),'access-control-allow-origin':'*'}}})());return r.fulfill(await imageCache.get(u.href));}
 if(u.origin===origin||(q.method()==='GET'&&['image','font'].includes(q.resourceType())&&u.hostname==='assets.code-destiny.com'))return r.continue();return r.abort();});
 await context.addInitScript(()=>localStorage.setItem('code-destiny-fortune-tea-house-bgm:v1','off'));
 const p=await context.newPage();p.setDefaultTimeout(25000);p.on('pageerror',e=>errors.push(e.message));
 await p.goto(origin+'/fortune-tea-house/',{waitUntil:'domcontentloaded',timeout:120000});
 const open=()=>p.getByRole('button',{name:'달빛 타로 앨범 보기',exact:true}).click();
 await open();await p.getByRole('link',{name:'로그인하고 꿀방울 확인하기'}).waitFor();await p.screenshot({path:out+'/guest-390.png'});await p.getByRole('button',{name:'달빛 타로 앨범 닫기'}).click();
 wallet={authenticated:true,currentHoneyDrops:9,balance:9,tarotAlbumUnlocked:false};await p.reload({waitUntil:'domcontentloaded'});await p.getByText('꿀방울 9 / 10개',{exact:true}).waitFor();
 await p.locator('#teaAlbumInvitationTitle').scrollIntoViewIfNeeded();await p.screenshot({path:out+'/invitation-390.png'});await open();await p.getByRole('button',{name:'꿀방울이 조금 더 필요해요'}).waitFor();assert.equal(await p.getByRole('button',{name:'꿀방울이 조금 더 필요해요'}).isDisabled(),true);
 wallet={...wallet,currentHoneyDrops:10,balance:10};await p.getByRole('button',{name:'꿀방울 다시 확인하기'}).click();const unlock=p.getByRole('button',{name:'꿀방울 10개로 앨범 열기'});await unlock.waitFor();await p.screenshot({path:out+'/locked-390.png'});
 failUnlock=true;await unlock.click();await p.getByText('잠시 후 다시 확인해주세요.',{exact:true}).waitFor();assert.equal(await p.getByRole('button',{name:'전체 PDF 다운로드',exact:true}).count(),0);failUnlock=false;await unlock.click();await p.getByRole('button',{name:'전체 PDF 다운로드',exact:true}).waitFor();
 for(const width of [360,390,430,1280]){await p.setViewportSize({width,height:900});await p.waitForTimeout(400);await p.screenshot({path:out+'/album-'+width+'.png'});assert.equal(await p.locator('[aria-labelledby="tarotAlbumTitle"]').evaluate(e=>e.scrollWidth>e.clientWidth),false,'album overflow '+width);}
 await p.getByRole('tab',{name:'메이저 아르카나',exact:true}).click();await p.getByRole('searchbox',{name:'카드 이름, 키워드, 해석 검색'}).fill('The Moon');await p.getByRole('button',{name:'모두 펼치기'}).click();
 const select=p.getByRole('button',{name:/달빛 서가에 담기 담음/}).first();await select.waitFor();await select.click();
 const dl=p.waitForEvent('download',{timeout:120000});await p.getByRole('button',{name:'선택 1장 PDF',exact:true}).first().click();const file=await dl;await file.saveAs(out+'/selected.pdf');assert.equal(await file.failure(),null);
 await p.getByRole('searchbox').fill('');await p.getByRole('tab',{name:'전체',exact:true}).click();
 console.log('selected PDF complete');const all=p.waitForEvent('download',{timeout:300000});await p.getByRole('button',{name:'전체 PDF 다운로드',exact:true}).click();await p.waitForFunction(()=>document.querySelectorAll('[data-tarot-pdf-page]').length===81);const heights=await p.locator('[data-tarot-pdf-page]').evaluateAll(nodes=>nodes.map(x=>Math.ceil(x.getBoundingClientRect().height)));fs.writeFileSync(out+'/page-heights.json',JSON.stringify(heights));const allFile=await all;await allFile.saveAs(out+'/all.pdf');assert.equal(await allFile.failure(),null);assert.equal((fs.readFileSync(out+'/all.pdf').toString('latin1').match(/\/Type \/Page\b/g)||[]).length,81,'78 cards plus cover, contents and closing');assert.equal((fs.readFileSync(out+'/selected.pdf').toString('latin1').match(/\/Type \/Page\b/g)||[]).length,4);
 await p.getByRole('button',{name:'달빛 타로 앨범 닫기'}).click();await open();await p.getByRole('button',{name:'전체 PDF 다운로드',exact:true}).waitFor();assert.equal(calls.filter(x=>x.includes('/unlock')).length,2);
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/result.json',JSON.stringify({pass:true,checks:['guest','9 drops locked','10 drops unlock','unlock failure stays locked','unlocked 0 balance','search/filter','selection PDF','78-card PDF','reopen without spending','4 widths'],calls,errors},null,2));console.log('PASS album scenarios and actual PDF downloads');
}finally{await browser.close()}
