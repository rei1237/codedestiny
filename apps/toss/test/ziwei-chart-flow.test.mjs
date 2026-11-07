import test from 'node:test';
import assert from 'node:assert/strict';
import {chartFixture} from './chart-fixture.mjs';
const {dom,React,createRoot,Component}=await chartFixture('ZiweiChart.tsx','/ziwei/chart');

test('unknown birth time stays provisional and a changed session discards the chart and input',async()=>{
  const root=createRoot(document.getElementById('chart'));
  const set=(field,value)=>{
    const select=field.tagName==='SELECT';
    const proto=select?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto,'value').set.call(field,value);
    field.dispatchEvent(new window.Event(select?'change':'input',{bubbles:true}));
  };
  try{
    await React.act(()=>root.render(React.createElement(Component)));
    const selects=document.querySelectorAll('select');
    await React.act(()=>{
      set(document.querySelector('input[type=date]'),'1990-05-15');
      document.querySelector('input[type=checkbox]').click();
      set(selects[1],'F');set(selects[2],selects[2].options[1].value);
    });
    await React.act(()=>document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));
    assert.equal(document.querySelectorAll('.ziwei-palace').length,12);
    assert.match(document.body.textContent,/정오를 기준으로/);
    assert.doesNotMatch(document.body.textContent,/시기별로 살펴볼 궁/);
    await React.act(()=>{window.testSessionEpoch=1;window.dispatchEvent(new window.Event('session'));});
    assert.equal(document.querySelectorAll('.ziwei-palace').length,0);
    assert.equal(document.querySelector('input[type=date]').value,'');
    assert.equal(window.sessionStorage.length,0);
  }finally{await React.act(()=>root.unmount());dom.window.close();}
});
