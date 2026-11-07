import test from 'node:test';
import assert from 'node:assert/strict';
import {chartFixture} from './chart-fixture.mjs';

test('a leap-month chart handles unknown time, preserves editable input on back, and clears private data on session replacement',async()=>{
  const {dom,React,createRoot,Component}=await chartFixture('BasicSajuReading.tsx','/saju/basic/play');
  const root=createRoot(document.getElementById('chart'));
  const field=(el,value)=>{
    const select=el.tagName==='SELECT';
    Object.getOwnPropertyDescriptor(select?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype,'value').set.call(el,value);
    el.dispatchEvent(new window.Event(select?'change':'input',{bubbles:true}));
  };
  const submit=()=>React.act(()=>document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));
  const back=()=>React.act(()=>assert.equal(window.dispatchEvent(new window.Event('code-destiny:toss-back',{cancelable:true})),false));
  const counts=()=>Array.from(document.querySelectorAll('.daily-basis dd'),el=>Number(el.textContent)).reduce((a,b)=>a+b,0);
  try{
    await React.act(()=>root.render(React.createElement(Component)));
    await React.act(()=>{
      field(document.querySelector('input[type=date]'),'2023-02-01');
      field(document.querySelector('input[type=time]'),'08:30');
      const [calendar,city]=document.querySelectorAll('select');
      field(calendar,'lunar_leap');field(city,'서울');
    });
    await submit();
    assert.deepEqual(Array.from(document.querySelectorAll('.manse-pillars dd strong'),x=>x.textContent),['계묘','을묘','기묘','무진']);
    assert.equal(counts(),8);
    await back();
    assert.equal(document.querySelector('input[type=time]').value,'08:30');
    await React.act(()=>document.querySelector('input[type=checkbox]').click());
    await submit();
    assert.match(document.body.textContent,/시주는 비워/);assert.equal(counts(),6);
    await back();
    await React.act(()=>field(document.querySelector('input[type=date]'),'2023-03-01'));
    await submit();assert.ok(document.querySelector('[role=alert]'));assert.equal(document.querySelector('.manse-pillars'),null);
    await React.act(()=>field(document.querySelector('input[type=date]'),'2023-02-01'));
    await submit();
    await React.act(()=>{window.testSessionEpoch=1;window.dispatchEvent(new window.Event('session'));});
    assert.equal(document.querySelector('input[type=date]').value,'');
    assert.equal(window.localStorage.length+window.sessionStorage.length,0);
  }finally{await React.act(()=>root.unmount());dom.window.close();}
});
