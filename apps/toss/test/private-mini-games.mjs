import assert from 'node:assert/strict';
import {miniGameRoutes} from '../canonical/mini-games.mjs';

export async function playMiniGames(page,open){
 let f=await open('fortune-fish');await f.locator('#read-button').click();await f.locator('#reading:not([hidden])').waitFor();
 assert.ok((await f.locator('#reading-body').innerText()).length>150);await f.locator('#read-button').click();await f.locator('#reading:not([hidden])').waitFor();
 f=await open('blood-type');await f.locator('.bt-ab').click();
 // The original game locks its bottom navigation for 280ms during each transition.
 const settled=()=>new Promise(resolve=>setTimeout(resolve,300));
 await settled();for(const section of ['personality','compatibility','lifestyle','entertainment']){await f.locator('#nav-'+section).click();await f.locator('#pg-'+section+'.active').waitFor();await settled();}
 await f.locator('#nav-lifestyle').click();await f.locator('button[onclick*="showShareModal"]').filter({hasText:'공유'}).last().click();
 await f.locator('button[onclick="shareLink()"]').click();
 f=await open('blood-type');await f.locator('#nav-personality').waitFor();
 f=await open('hwatu-life');await f.getByRole('button',{name:'판에 참여하기'}).click();for(let i=0;i<7;i++)await f.locator('.life-choice').nth(i%3).click();
 await f.locator('#lifeResultImg').evaluate(img=>img.decode());
 await f.locator('#lifeDetailToggleBtn').click();
 await f.locator('button[onclick="shareHwatuLifeCard()"]').click();
 await f.locator('#modeBtnThreeCard').click();await f.getByRole('button',{name:'세 장 펼치기'}).click();assert.equal(await f.locator('#hwatuThreeResult article').count(),3);
 await f.locator('#modeBtnSeotda').click();await f.locator('#startShuffleBtn').waitFor();
 await f.locator('#modeBtnTraditional').click();await f.locator('#tradGameBoard:visible, #tradStartBtn:visible').first().waitFor();
 f=await open('destiny-poker');await f.locator('#open-king-game').click();await f.locator('#king-choices button').first().click();await f.locator('#king-reading:not([hidden])').waitFor();assert.ok((await f.locator('#king-spread').innerText()).length>15);
 await f.locator('#screen-king .salon-back').click();await f.locator('#name-input').fill('달빛');await f.getByRole('button',{name:'마스터 선택하기'}).click();assert.equal(await f.locator('.dealer-card').count(),4);await f.locator('[data-d="amon"]').click();
 for(let i=0;i<5;i++)await f.getByRole('button',{name:/체크/}).click();
 await f.getByRole('button',{name:/운명 판결서 받기/}).click();await f.locator('button[onclick="sharePokerKakao()"]').click();
 f=await open('destiny-poker');await f.locator('#name-input').fill('달빛');await f.getByRole('button',{name:'마스터 선택하기'}).click();await f.locator('[data-d="amon"]').click();await f.getByRole('button',{name:'알겠습니다'}).waitFor();
}

export async function verifyMiniGames(origin,context){
 const page=await context.newPage();page.setDefaultTimeout(24000);
 const hub=async()=>{await page.goto(origin);await page.locator('.world-entry-ggulggul').click();await page.getByRole('searchbox').fill('미니 운세 게임');await page.locator('.directory-list button').filter({hasText:'미니 운세 게임'}).first().click();await page.getByRole('heading',{name:'미니 운세 게임'}).waitFor();};
 const open=async slug=>{await hub();await page.locator('a[href="'+miniGameRoutes[slug]+'"]').click();return page.frameLocator('iframe[sandbox="allow-scripts"]');};
 try{
  await hub();for(const path of Object.values(miniGameRoutes)){const link=page.locator('a[href="'+path+'"]');assert.equal(await link.count(),1);await link.locator('img').evaluate(el=>el.decode());}
  for(const slug of ['omikuji','secret-house','destiny-island','saju-fpti','psychotest']){await hub();await page.locator('a[href="'+miniGameRoutes[slug]+'"]').click();await page.waitForURL(url=>(url.pathname+url.search).replace(/\/$/,'')===miniGameRoutes[slug].replace(/\/$/,''));}
  await playMiniGames(page,open);
  assert.equal(await page.evaluate(()=>localStorage.getItem('private-mini-game-share')),'opened');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')||'{}').orders?.length||0),0);
  await Promise.all([page.waitForEvent('load'),page.getByLabel('모의 계정',{exact:true}).selectOption('B')]);
  const b=await open('blood-type');await b.locator('.bt-ab').waitFor();console.log('PASS nine original destinations; fish reading, four blood-type pages, seven Hwatu questions and detail, king and four-dealer poker/fictional stake, daily limit, private share and account B isolation, zero orders');
 }catch(error){console.error(page.url(),(await page.locator('body').innerText()).slice(-1600));throw error;}finally{await page.close();}
}
