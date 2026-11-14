import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import novelReader,{novelBook} from '../canonical/novel-book.mjs';
import {chartFixture} from './chart-fixture.mjs';

test('each shipped episode retains the original Korean dialogue, choices and endings',()=>{
  const {episodes,text}=novelBook();
  const root=new URL('../../../public/',import.meta.url);
  const manifest=JSON.parse(readFileSync(new URL('data/novel/manifest.json',root)));
  assert.equal(episodes.length,manifest.episodeCount);
  for(const [i,e] of episodes.entries()){
    const source=JSON.parse(readFileSync(new URL(manifest.episodes[i].path.slice(1),root)));
    const rows=JSON.parse(gunzipSync(Buffer.from(text[e.id],'base64')));
    assert.deepEqual(rows.map(r=>r[1]),source.beats.map(b=>b.t));
    for(const [n,b] of source.beats.entries())if(b.nm)assert.equal(rows[n][0],b.nm);
    assert.deepEqual(e.options,(source.beats.at(-1).choice?.options||[]).map(({label,target})=>({label,target})));
    assert.equal(e.ending,manifest.episodes[i].ending?.label??null);
  }
});
test('the last fork opens the selected branch and native back keeps the current page available',async()=>{
  const p=novelReader(),id='virtual:toss-novel-book',book=novelBook();
  const {dom,React,createRoot,Component}=await chartFixture('NovelReader.tsx','/novel',[{name:'test-novel-book',setup(b){
    b.onResolve({filter:/^virtual:toss-novel-book$/},()=>({path:id,namespace:'book'}));
    b.onLoad({filter:/.*/,namespace:'book'},()=>({contents:p.load(p.resolveId(id))}));
  }}]);
  let root=createRoot(document.getElementById('chart'));
  const button=text=>Array.from(document.querySelectorAll('button')).find(el=>el.textContent===text);
  const click=text=>React.act(()=>{const el=button(text);assert.ok(el,text);el.click();});
  try{
    await React.act(()=>root.render(React.createElement(Component)));
    const fork=book.episodes.find(e=>e.options.length);
    await click(fork.title);
    for(let i=1;i<Math.ceil(fork.count/12);i++)await click('다음 쪽');
    assert.equal(button('다음 화 읽기'),undefined);
    await click(fork.options[1].label);
    const chosen=book.episodes.find(e=>e.id===fork.options[1].target);
    assert.equal(document.querySelector('h1').textContent,chosen.title);
    await click('다음 쪽');
    await React.act(()=>assert.equal(window.dispatchEvent(new window.Event('code-destiny:toss-back',{cancelable:true})),false));
    await click('읽던 곳부터 이어보기');
    assert.equal(document.querySelector('h1').textContent,chosen.title);
    assert.match(document.querySelector('.muted').textContent,/^2 \/ /);
    const key='toss:novel-bookmark:v1',saved=JSON.parse(window.localStorage.getItem(key));
    assert.deepEqual(saved,{version:1,id:chosen.id,page:1,rev:chosen.rev});
    const remount=async()=>{await React.act(()=>root.unmount());root=createRoot(document.getElementById('chart'));await React.act(()=>root.render(React.createElement(Component)));};
    await remount();await click('읽던 곳부터 이어보기');
    assert.equal(document.querySelector('h1').textContent,chosen.title);assert.match(document.querySelector('.muted').textContent,/^2 \/ /);
    window.localStorage.setItem(key,JSON.stringify({...saved,rev:saved.rev-1}));
    await remount();await click('읽던 곳부터 이어보기');assert.match(document.querySelector('.muted').textContent,/^1 \/ /);
    for(const invalid of ['{broken',JSON.stringify({...saved,id:'missing'}),JSON.stringify({...saved,page:999999}),JSON.stringify({...saved,page:-1})]){
      window.localStorage.setItem(key,invalid);await remount();assert.equal(button('읽던 곳부터 이어보기'),undefined);
    }
    const write=dom.window.Storage.prototype.setItem;
    dom.window.Storage.prototype.setItem=()=>{throw new Error('device storage unavailable');};
    try{await click(chosen.title);await click('다음 쪽');await click('차례로 돌아가기');await click('읽던 곳부터 이어보기');assert.match(document.querySelector('.muted').textContent,/^2 \/ /);}finally{dom.window.Storage.prototype.setItem=write;}
  }finally{await React.act(()=>root.unmount());dom.window.close();}
});
