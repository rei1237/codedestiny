import assert from 'node:assert/strict';
import test from 'node:test';
import {chartFixture} from './chart-fixture.mjs';
import {publicAnimalAlmanac} from '../canonical/animal-almanac.mjs';
import {animalSource,animalExample} from './animal-source-fixture.mjs';

test('legacy stage projection still preserves twelve named stages for every stem',()=>{
 const {stages,catalog}=publicAnimalAlmanac();assert.equal(catalog.length,12);assert.equal(Object.keys(stages).length,10);
 for(const series of Object.values(stages)){assert.equal(Object.keys(series).length,12);assert.deepEqual(new Set(Object.values(series)),new Set(catalog.map(row=>row.stage)));}
});
test('full original animal screen exposes ten tabs, six chapters, dex, native back and account reset',async()=>{
 const {dom,React,createRoot,Component}=await chartFixture('AnimalDestiny.tsx','/saju/animal-destiny',[{name:'animal-media-offline',setup(builder){
  builder.onResolve({filter:/^\.\/animal-media$/},()=>({path:'animal-media',namespace:'animal-test'}));
  builder.onLoad({filter:/.*/,namespace:'animal-test'},()=>({contents:'export const saveAnimalCard=()=>{},shareAnimalCard=()=>{};'}));
 }}]);
 globalThis.Element=dom.window.Element;globalThis.HTMLElement=dom.window.HTMLElement;globalThis.SVGElement=dom.window.SVGElement;
 const root=createRoot(document.getElementById('chart')),request=async(path,body)=>{assert.equal(path,'/animal-destiny/reading');return animalSource.tossAnimalDestiny(body);};
 const field=(el,value)=>{const select=el.tagName==='SELECT';Object.getOwnPropertyDescriptor(select?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new window.Event(select?'change':'input',{bubbles:true}));};
 const button=label=>Array.from(document.querySelectorAll('button')).find(el=>el.textContent===label);
 try{
  await React.act(()=>root.render(React.createElement(Component,{request})));
  await React.act(()=>{field(document.querySelector('[type=date]'),'2023-02-01');field(document.querySelector('select'),'lunar_leap');document.querySelector('[type=checkbox]').click();});
  await React.act(async()=>document.querySelector('form').dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true})));
  const reading=animalSource.tossAnimalDestiny({input:animalExample}).reading;
  assert.match(document.body.textContent,/구름 토끼/);assert.match(document.body.textContent,/시각|시간/);assert.equal(document.querySelector('[data-animal-paid-lock]'),null);
  for(const section of reading.sections){await React.act(()=>button(section.label).click());assert.ok(document.body.textContent.includes(section.content),section.label);}
  for(const key of ['personality','love','career','wealth','relationship','today'])assert.ok(document.body.textContent.includes(reading.detailed[key].replace(/\s+/g,' ').trim()),key);
  assert.ok(document.body.textContent.includes(reading.result.growthMission));
  await React.act(()=>window.dispatchEvent(new window.Event('code-destiny:toss-back',{cancelable:true})));assert.equal(document.querySelector('[type=date]').value,'2023-02-01');
  await React.act(()=>{window.testSessionEpoch=1;window.dispatchEvent(new window.Event('session'));});assert.equal(document.querySelector('[type=date]').value,'');assert.equal(window.localStorage.length+window.sessionStorage.length,0);
 }finally{await React.act(()=>root.unmount());dom.window.close();}
});
