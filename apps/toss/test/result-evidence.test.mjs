import '../../../scripts/lib/mock-network-guard.cjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(import.meta.url),Module=require('node:module');
const root=path.resolve(import.meta.dirname,'../../..');
const bundle=await build({entryPoints:[path.join(root,'apps/toss/src/ResultEvidence.tsx')],bundle:true,platform:'node',format:'cjs',write:false,jsx:'automatic',external:['react','react/jsx-runtime']});
const loaded=new Module(path.join(root,'apps/toss/toss-evidence-check.cjs'));loaded.paths=Module._nodeModulePaths(path.join(root,'apps/toss'));loaded._compile(bundle.outputFiles[0].text,loaded.id);
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');

test('saved evidence keeps all six domains and unknown facts without inventing chart values',()=>{
 const charts=['saju','astrology','ziwei','vedic','sukuyo','tarot'].map(domain=>({domain,title:`저장된 ${domain}`,source:'구매 당시 저장된 계산 근거',limitations:['출생 시각 미상'],
  groups:[{id:'saved',label:'저장 항목',items:[{label:'근거',value:'<원본> 누락은 추정하지 않음'}],...(domain==='ziwei'?{ziwei:{stars:[{name:'천기',hanja:'天機',kind:'main',grade:null}],notes:['원본 명반의 해석']}}:{})}]}));
 const html=renderToStaticMarkup(React.createElement(loaded.exports.default,{charts}));
 for(const chart of charts)assert.ok(html.includes(chart.title));
 assert.ok(html.includes('&lt;원본&gt;'));assert.ok(html.includes('출생 시각 미상'));assert.ok(html.includes('천기'));
 assert.equal((html.match(/aria-pressed="true"/g)||[]).length,6);
 assert.ok(!html.includes('undefined'));assert.ok(!html.includes('NaN'));
});
