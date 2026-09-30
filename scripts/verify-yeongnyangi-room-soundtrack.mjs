import {build} from 'esbuild';
import {chromium} from 'playwright';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';

// Exercise the actual React hook, isolated from Next and all service APIs.
const bundle=await build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {useRoomSoundtrack,RoomSoundControls} from './app/yeongnyangi/_original/RoomSoundtrack';function App(){const sound=useRoomSoundtrack('room');return <RoomSoundControls sound={sound}/>;}const root=createRoot(document.getElementById('root'));root.render(<App/>);window.unmountRoom=()=>root.unmount();`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic'});
const server=createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/app.js'?'text/javascript':'text/html');res.end(req.url==='/app.js'?bundle.outputFiles[0].text:'<!doctype html><html><body><div id="root"></div><script src="/app.js"></script></body></html>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
// Deterministic silent WAV: no remote music, account, database or provider calls.
const wav=Buffer.alloc(44+8000*2);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
let fail=true,requests=0;
try{
 await page.route('https://**/*',route=>{requests++;return fail?route.abort():route.fulfill({contentType:'audio/wav',body:wav});});
 await page.addInitScript(()=>{const NativeAudio=window.Audio;window.players=[];window.Audio=function(...args){const player=new NativeAudio(...args);window.players.push(player);return player;};});
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 assert.equal(requests,0,'no automatic audio requests');
 await page.getByRole('button',{name:'BGM 켜기'}).click();
 await page.getByRole('status').waitFor();
 assert.equal(await page.getByRole('button',{name:'BGM 켜기'}).getAttribute('aria-pressed'),'false');
 fail=false;
 await page.getByRole('button',{name:'BGM 켜기'}).click();
 await page.waitForFunction(()=>window.players.some(player=>!player.paused&&player.currentTime>0),null,{timeout:10000});
 await page.getByRole('slider').fill('0.4');
 assert.equal(await page.evaluate(()=>window.players.at(-1).volume),.4);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 assert.equal(await page.evaluate(()=>window.players.at(-1).paused),true);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForFunction(()=>!window.players.at(-1).paused);
 await page.evaluate(()=>window.unmountRoom());
 assert.equal(await page.evaluate(()=>window.players.at(-1).paused),true);
 assert.equal(await page.evaluate(()=>window.players.at(-1).getAttribute('src')),null);
 console.log('PASS: opt-in, failed media retry, volume, hidden-tab pause/resume, unmount cleanup (mock audio)');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
