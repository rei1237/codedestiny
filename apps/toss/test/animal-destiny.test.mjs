import assert from 'node:assert/strict';
import test from 'node:test';
import {chartFixture} from './chart-fixture.mjs';
import {publicAnimalAlmanac} from '../canonical/animal-almanac.mjs';

test('public animal projection has twelve named stages for every stem, without any paid interpretation',()=>{
  const {stages,catalog}=publicAnimalAlmanac();
  assert.equal(catalog.length,12);assert.equal(Object.keys(stages).length,10);
  for(const series of Object.values(stages)){assert.equal(Object.keys(series).length,12);assert.deepEqual(new Set(Object.values(series)),new Set(catalog.map(row=>row.stage)));}
  for(const row of catalog)assert.deepEqual(Object.keys(row).sort(),['hanja','name','stage']);
});
test('a leap birthday gets its own day animal; back from the dex keeps the result and changing accounts clears it',async()=>{
  const id='virtual:toss-animal-almanac';
  const {dom,React,createRoot,Component}=await chartFixture('AnimalDestiny.tsx','/saju/animal-destiny',[{name:'canonical-animals',setup(builder){
    builder.onResolve({filter:/^virtual:toss-animal-almanac$/},()=>({path:id,namespace:'animals'}));
    builder.onLoad({filter:/.*/,namespace:'animals'},()=>({contents:'export default '+JSON.stringify(publicAnimalAlmanac())}));
  }}]);
  const root=createRoot(document.getElementById('chart'));
  const field=(el,value)=>{const select=el.tagName==='SELECT';Object.getOwnPropertyDescriptor(select?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new window.Event(select?'change':'input',{bubbles:true}));};
  const back=()=>React.act(()=>assert.equal(window.dispatchEvent(new window.Event('code-destiny:toss-back',{cancelable:true})),false));
  try{
    await React.act(()=>root.render(React.createElement(Component)));
    await React.act(()=>{field(document.querySelector('[type=date]'),'2023-02-01');field(document.querySelector('select'),'lunar_leap');field(document.querySelectorAll('select')[1],'서울');document.querySelector('[type=checkbox]').click();});
    await React.act(()=>document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));
    assert.equal(document.querySelector('h1').textContent,'구름 토끼');assert.match(document.querySelector('dl').textContent,/일주己卯 · 병/);
    assert.match(document.querySelector('dl').textContent,/시주시각 미상/);
    await React.act(()=>document.querySelector('button').click());assert.equal(document.querySelectorAll('dd').length,12);
    assert.match(document.body.textContent,/구름 토끼 · 나의 동물/);await back();assert.equal(document.querySelector('h1').textContent,'구름 토끼');
    await back();assert.equal(document.querySelector('[type=date]').value,'2023-02-01');
    await React.act(()=>{window.testSessionEpoch=1;window.dispatchEvent(new window.Event('session'));});
    assert.equal(document.querySelector('[type=date]').value,'');assert.equal(window.localStorage.length+window.sessionStorage.length,0);
  }finally{await React.act(()=>root.unmount());dom.window.close();}
});
