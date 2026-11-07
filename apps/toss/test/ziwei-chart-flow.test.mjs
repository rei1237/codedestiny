import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
import {build} from 'esbuild';

const require=createRequire(new URL('../package.json',import.meta.url));
const Module=require('node:module');
const dom=new JSDOM('<div id="chart"></div>',{url:'http://localhost/ziwei/chart'});
globalThis.window=dom.window;
globalThis.document=dom.window.document;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react');
const {createRoot}=require('react-dom/client');
const bundle=await build({
  entryPoints:[path.resolve(import.meta.dirname,'../src/ZiweiChart.tsx')],
  bundle:true,write:false,outfile:'chart.cjs',format:'cjs',platform:'node',jsx:'automatic',
  tsconfig:path.resolve(import.meta.dirname,'../tsconfig.json'),
  alias:{'@':path.resolve(import.meta.dirname,'../../..')},external:['react','react/jsx-runtime'],
  loader:{'.css':'empty'},plugins:[{name:'test-toss-bridges',setup(builder){
    builder.onResolve({filter:/^(\.\/platform|\.\/release|@toss\/tds-mobile)$/},args=>({namespace:'test',path:args.path}));
    builder.onLoad({filter:/.*/,namespace:'test'},({path:id})=>{
      if(id==='./release')return {contents:'export const SERVICE_AVAILABLE=true'};
      if(id==='./platform')return {contents:'export const getTossSessionRevision=()=>window.testSessionEpoch||0; export const onTossSessionRevisionChanged=fn=>{window.addEventListener("session",fn);return ()=>window.removeEventListener("session",fn)};'};
      return {contents:`import React from 'react';
        export const Button=({children,display,variant,loading,...props})=>React.createElement('button',props,children);
        export const TextField=({label,labelOption,variant,...props})=>React.createElement('input',props);`};
    });
  }}]
});
const loaded=new Module(path.resolve(import.meta.dirname,'ziwei-test.cjs'));
loaded.paths=Module._nodeModulePaths(path.resolve(import.meta.dirname,'..'));
loaded._compile(bundle.outputFiles[0].text,loaded.id);

test('unknown birth time stays provisional and a changed session discards the chart and input',async()=>{
  const root=createRoot(document.getElementById('chart'));
  const set=(field,value)=>{
    const select=field.tagName==='SELECT';
    const proto=select?window.HTMLSelectElement.prototype:window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto,'value').set.call(field,value);
    field.dispatchEvent(new window.Event(select?'change':'input',{bubbles:true}));
  };
  try{
    await React.act(()=>root.render(React.createElement(loaded.exports.default)));
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
