import test from 'node:test';
import assert from 'node:assert/strict';
import {chartFixture} from './chart-fixture.mjs';

test('an authenticated chart request never restores stale birth data after session replacement',async()=>{
  const {dom,React,createRoot,Component}=await chartFixture('BasicSkyChart.tsx','/vedic');
  const root=createRoot(document.getElementById('chart'));
  const set=(el,v)=>{
    const sel=el.tagName==='SELECT';
    Object.getOwnPropertyDescriptor(sel?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype,'value').set.call(el,v);
    el.dispatchEvent(new window.Event(sel?'change':'input',{bubbles:true}));
  };
  let resolve,paths=[],logins=0;
  const request=path=>{paths.push(path);return new Promise(done=>{resolve=done;});};
  const render=loggedIn=>React.act(()=>root.render(React.createElement(Component,{system:'vedic',loggedIn,onLogin:()=>logins++,request,onError:e=>{throw e;}})));
  try{
    await render(false);assert.equal(document.querySelector('form'),null);
    await React.act(()=>document.querySelector('button').click());assert.equal(logins,1);
    await render(true);
    await React.act(()=>{
      set(document.querySelector('input[type=date]'),'1990-05-15');set(document.querySelector('input[type=time]'),'08:30');set(document.querySelectorAll('select')[1],'서울');
    });
    await React.act(()=>document.querySelector('form').dispatchEvent(new window.Event('submit',{cancelable:true,bubbles:true})));
    assert.deepEqual(paths,['/charts/vedic']);
    await React.act(()=>{window.testSessionEpoch=1;window.dispatchEvent(new window.Event('session'));});
    await React.act(()=>resolve({system:'vedic',positions:[],ascendant:'stale'}));
    assert.equal(document.querySelector('input[type=date]').value,'');assert.equal(document.querySelector('[role=alert]'),null);
    assert.doesNotMatch(document.body.textContent,/stale/);
    assert.equal(window.sessionStorage.length+window.localStorage.length,0);
  }finally{await React.act(()=>root.unmount());dom.window.close();}
});
