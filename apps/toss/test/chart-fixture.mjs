import '../../../scripts/lib/mock-network-guard.cjs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
import {build} from 'esbuild';

export async function chartFixture(filename,route,extraPlugins=[]){
const require=createRequire(new URL('../package.json',import.meta.url));
const Module=require('node:module');
const dom=new JSDOM('<div id="chart"></div>',{url:'http://localhost'+route});
globalThis.window=dom.window;
globalThis.document=dom.window.document;
globalThis.location=dom.window.location;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react');
const {createRoot}=require('react-dom/client');
const bundle=await build({
  entryPoints:[path.resolve(import.meta.dirname,'../src/'+filename)],
  bundle:true,write:false,outfile:'chart.cjs',format:'cjs',platform:'node',jsx:'automatic',
  tsconfig:path.resolve(import.meta.dirname,'../tsconfig.json'),
  alias:{'@':path.resolve(import.meta.dirname,'../../..')},external:['react','react/jsx-runtime'],
  loader:{'.css':'empty'},plugins:[...extraPlugins,{name:'test-toss-bridges',setup(builder){
    builder.onResolve({filter:/^\.\/media$/},()=>({namespace:'chart-export',path:'media'}));
    builder.onLoad({filter:/.*/,namespace:'chart-export'},()=>({contents:'export const saveReportPdf=()=>{throw Error("Unexpected PDF request")};'}));
    builder.onResolve({filter:/^(\.\/platform|@toss\/tds-mobile)$/},args=>({namespace:'test',path:args.path}));
    builder.onLoad({filter:/.*/,namespace:'test'},({path:id})=>{
      if(id==='./platform')return {contents:'export const api=()=>{throw Error("Unexpected chart request")}; export const nativeSaleProducts=async()=>[],paymentRequiresReview=()=>false,purchase=()=>{throw Error("Unexpected chart purchase")}; export const getTossSessionRevision=()=>window.testSessionEpoch||0; export const onTossSessionRevisionChanged=fn=>{window.addEventListener("session",fn);return ()=>window.removeEventListener("session",fn)};'};
      return {contents:`import React from 'react';
        export const Button=({children,display,variant,loading,...props})=>React.createElement('button',props,children);
        export const TextField=({label,labelOption,variant,...props})=>React.createElement('input',props);`};
    });
  }}]
});
const loaded=new Module(path.resolve(import.meta.dirname,'test-chart.cjs'));
loaded.paths=Module._nodeModulePaths(path.resolve(import.meta.dirname,'..'));
loaded._compile(bundle.outputFiles[0].text,loaded.id);

return {dom,React,createRoot,Component:loaded.exports.default};
}
