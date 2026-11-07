import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {Module} from 'node:module';
import {build} from 'esbuild';
import {chartFixture} from './chart-fixture.mjs';

const file=path.resolve(import.meta.dirname,'../canonical/music-shelf.ts');
const out=await build({entryPoints:[file],format:'cjs',bundle:true,platform:'node',write:false});
const m=new Module(file);m._compile(out.outputFiles[0].text,file);
const tracks=m.exports.publicStreamList();
test('only full streams from the canonical music CDN enter the shelf; paid purchase and download fields stay out',()=>{
  assert.ok(tracks.length>0);assert.equal(new Set(tracks.map(t=>t.id)).size,tracks.length);
  assert.ok(tracks.every(t=>/^https:\/\//.test(t.stream)&&Object.keys(t).every(k=>['id','title','artist','artistKey','stream'].includes(k))));
  assert.deepEqual(m.exports.publicStreamList([{accessTier:'locked_preview',audioSourceKey:decodeURIComponent(new URL(tracks[0].stream).pathname.split('/').slice(-2).join('/')),audioUrl:'https://invalid.example/protected.mp3'}]),[]);
  assert.throws(()=>m.exports.publicStreamList([{accessTier:'free_full',audioSourceKey:decodeURIComponent(new URL(tracks[0].stream).pathname.split('/').slice(-2).join('/')),audioUrl:'https://invalid.example/private.mp3'}]));
});
test('search, play, pause and native back leave the list filtered and stop playback without exposing a download action',async()=>{
  const id='virtual:toss-music-shelf',plugin=m.exports.default();
  const {dom,React,createRoot,Component}=await chartFixture('MusicShelf.tsx','/music',[{name:'music-fixture',setup(b){
    b.onResolve({filter:/^virtual:toss-music-shelf$/},()=>({path:id,namespace:'shelf'}));
    b.onLoad({filter:/.*/,namespace:'shelf'},()=>({contents:plugin.load(plugin.resolveId(id))}));
  }}]);
  let play=0,pause=0;
  window.HTMLMediaElement.prototype.play=function(){play++;this.dispatchEvent(new window.Event('playing'));return Promise.resolve();};
  window.HTMLMediaElement.prototype.pause=function(){pause++;this.dispatchEvent(new window.Event('pause'));};
  const root=createRoot(document.getElementById('chart'));
  const button=text=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent===text);
  try{
    await React.act(()=>root.render(React.createElement(Component)));
    const track=tracks[0],field=document.querySelector('input');
    await React.act(()=>{Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set.call(field,track.title);field.dispatchEvent(new window.Event('input',{bubbles:true}));});
    await React.act(()=>document.getElementById('track-'+track.id).click());
    assert.equal(document.querySelector('audio').preload,'none');assert.equal(play,0);
    await React.act(async()=>button('곡 재생하기').click());
    assert.equal(play,1);assert.ok(button('일시 정지'));assert.equal(document.querySelector('[download]'),null);
    await React.act(()=>button('일시 정지').click());
    const before=pause;
    await React.act(()=>window.dispatchEvent(new window.Event('code-destiny:toss-back',{cancelable:true})));
    assert.ok(pause>before);assert.equal(document.querySelector('input').value,track.title);assert.equal(document.querySelector('audio'),null);
  }finally{await React.act(()=>root.unmount());dom.window.close();}
});
