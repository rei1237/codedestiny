import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
import {vedicReadingModule,vedicExports,vedicReadingStyles} from '../canonical/vedic-reading.mjs';
import {vedicPositions} from '../../../worker/lib/verified-natal.js';

test('extracted Vedic reading preserves original chart, seven topics, deep details and both chart renderers',async()=>{
 const html=readFileSync(new URL('../../../public/vedic-astrology.html',import.meta.url),'utf8');
 const dom=new JSDOM(html,{runScripts:'dangerously',url:'https://code-destiny.com/vedic-astrology.html',virtualConsole:new VirtualConsole(),beforeParse(window){const noop=()=>{};window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=noop;window.scrollTo=noop;window.HTMLCanvasElement.prototype.getContext=()=>new Proxy({createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop}),measureText:()=>({width:0})},{get:(target,key)=>target[key]||noop});}});
 const previous=globalThis.window;globalThis.window=dom.window;
 try{
  const source=vedicReadingModule(),engine=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  for(const name of vedicExports)assert.equal(typeof engine[name],'function');
  assert.doesNotMatch(source,/function (?:openVedicBasicUnlock|vedicAiSubmit|doCalc)\(/);
  const sample={name:'원본 대조',year:1990,month:2,day:3,hour:8,minute:35,timezone:9,lat:37.5665,lon:126.978,gender:'F',birthTimeKnown:true};
  const natal=vedicPositions(new Date(Date.UTC(1990,1,3,8,35)-9*3600000),sample.lat,sample.lon);
  const actual=engine.buildChart(sample,undefined,natal),expected=dom.window.buildChart(sample,undefined,natal);
  const plain=value=>JSON.parse(JSON.stringify(value));
  assert.deepEqual(plain(actual),plain(expected));
  const report=engine.analyze(actual),original=dom.window.analyze(expected),insights=engine.generateInsights(actual,report);
  assert.deepEqual(plain(report),plain(original));
  assert.deepEqual(plain(engine.buildVedicSections(actual,report,insights)),plain(dom.window.buildVedicSections(expected,original,dom.window.generateInsights(expected,original))));
  assert.deepEqual(plain(engine.buildVedicDeepDetails(actual,report)),plain(dom.window.buildVedicDeepDetails(expected,original)));
  for(const name of ['renderSouthChart','renderNorthChart'])assert.equal(engine[name](actual.rasi),dom.window[name](expected.rasi));
  const mansions=dom.window.eval('NAKS.map(n=>n.n)');
  for(const first of mansions)for(const second of mansions)assert.deepEqual(plain(engine.calcCompatibility(first,second)),plain(dom.window.calcCompatibility(first,second)));
  const compatibility=engine.calcCompatibility(actual.nak.name,actual.nak.name),rendered=engine.renderVedicCompatibility(actual,actual,compatibility);
  assert.match(rendered,/8 항목 상세 점수/);assert.match(rendered,/종합 해석/);assert.equal((rendered.match(/class="compat-item"/g)||[]).length,8);assert.ok(rendered.includes(compatibility.advice));
 }finally{globalThis.window=previous;dom.window.close();}
});

test('original Vedic reading styles are scoped and have no external font requests',()=>{const css=vedicReadingStyles();assert.match(css,/\.toss-vedic-reading \.acc-body/);assert.match(css,/@keyframes toss-vedic-/);assert.doesNotMatch(css,/@(?:import|font-face)/);assert.doesNotMatch(css,/<script|\+\s*'/);});
