import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import scenes from '../../../app/yeongnyangi/_home/prologue-scenes.json' with {type:'json'};

export async function verifyYeongnyangiRoom(origin,context){
 const page=await context.newPage();
 page.setDefaultTimeout(20000);
 const errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  const AudioElement=window.Audio;
  window.Audio=class extends AudioElement{constructor(...args){super(...args);window.roomTestPlayer=this;}};
 });
 const root=page.locator('.toss-yn-room');
 const reader=page.getByRole('dialog',{name:'영냥이의 프롤로그'});
 const soundState=paused=>page.waitForFunction(value=>window.roomTestPlayer?.paused===value,paused);
 const capture=async name=>{if(process.env.TOSS_CAPTURE_DIR){await mkdir(process.env.TOSS_CAPTURE_DIR,{recursive:true});await page.screenshot({path:join(process.env.TOSS_CAPTURE_DIR,name+'.png')});}};
 try{
  await page.goto(origin);
  await page.locator('.world-entry-yeongnyangi').click();
  await page.getByRole('button',{name:/영냥이의 방/}).click();
  await root.getByRole('heading',{name:'영냥이의 방'}).waitFor();
  await root.locator('.room-scenery').evaluate(img=>img.decode());
  const mascot=root.getByRole('button',{name:'영냥이 쓰다듬기'});
  for(let reaction=0;reaction<4;reaction++){
   await mascot.click();await mascot.locator('[data-pet-sprite="active"]').waitFor();
   assert.equal(await mascot.getAttribute('data-reaction'),String(reaction));
  }
  await mascot.locator('[data-pet-sprite="active"]').waitFor({state:'hidden'});
  for(const width of [360,390,430]){
   await page.setViewportSize({width,height:740});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow at '+width);
  }
  await page.setViewportSize({width:390,height:740});await capture('room-390');
  const chat=root.locator('#room-chat');
  for(const button of await chat.getByRole('group',{name:'영냥이에게 말 걸기'}).getByRole('button').all()){
   await button.click();const first=await chat.locator('.room-moment p').innerText();
   await button.click();assert.notEqual(await chat.locator('.room-moment p').innerText(),first);
   await chat.locator('.room-moment img').evaluate(img=>img.decode());
  }
  await chat.locator('summary').click();
  for(const button of await chat.locator('.room-note-options button').all()){
   await button.click();await chat.locator('.room-note-result button').click();
   assert.equal(await chat.locator('.room-note-result button').getAttribute('aria-pressed'),'true');
  }
  await root.getByRole('button',{name:'BGM 켜기'}).click();await soundState(false);
  await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await soundState(true);
  await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));await soundState(false);
  await root.getByRole('button',{name:'프롤로그'}).click();
  await reader.waitFor();
  const reveal=async label=>{await reader.getByRole('button',{name:label}).click();};
  await reveal('말없이 곁에 앉는다');
  await reader.locator('[data-panel="a"] img').evaluate(img=>img.decode());
  await reveal('네오라고 불러준다');
  assert.equal(await reader.locator('[data-panel="a"]').count(),0);
  for(const scene of scenes.filter(s=>s.id!=='a')){
   const img=reader.locator('[data-panel="'+scene.id+'"] img');
   await img.scrollIntoViewIfNeeded();await img.evaluate(node=>node.decode());assert.equal(await img.getAttribute('alt'),scene.alt);
  }
  await reader.getByRole('button',{name:'영냥이 곁에 머물기'}).waitFor();
  await capture('room-prologue-390');
  await page.evaluate(()=>window.dispatchEvent(new Event('code-destiny:toss-overlay-back',{cancelable:true})));
  await reader.waitFor({state:'hidden'});await root.getByRole('button',{name:'BGM 끄기'}).click();await soundState(true);
  assert.equal(await root.locator('[data-hat-entry]').getAttribute('href'),'/yeongnyangi/hat/');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('consultations')||'{}').orders?.length||0),0);
  assert.deepEqual(errors,[]);
  console.log('PASS room: guest home, four mascot reactions, ten chats and three notes, two branches and '+scenes.length+' original panels, native back, mock audio pause/resume/mute, zero orders');
 }catch(error){console.error('Room verification',page.url(),(await page.locator('body').innerText().catch(()=>'')).slice(0,500));throw error;}
 finally{await page.close();}
}
