import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {isFreeFortuneFeatureKey} from '../../../lib/payment/free-fortune-policy.mjs';
const path=fileURLToPath(new URL('../../../js/iching-engine.js',import.meta.url));
export function turtleModule(){
  if(!isFreeFortuneFeatureKey('openJuyukModal'))throw new Error('Turtle oracle requires an entitlement');
  const engine=readFileSync(path,'utf8');
  function block(start,end){
    const a=engine.indexOf(start),b=engine.indexOf(end,a+start.length);
    if(a<0||b<=a)throw new Error('Missing original I Ching stage: '+start);
    return engine.slice(a,b);
  }
  const tables=block('  var TRIGRAMS =','  function drawCracks');
  const draw=block('    var rng2 =','    setTimeout(function() {\n      _renderResult'.replaceAll('\n',engine.includes('\r\n')?'\r\n':'\n'));
  const report=block('    var echoRules =','    var html =');
  return [tables,`export function castTurtle(question,seed){
    const qStr=question.trim();
    ${draw}
    ${report}
    return {hexChar,hexName,upper,lower,wisdom,echo:_tcPlain(echoText),strategy:_tcPlain(biStrategy),change:_tcPlain(changingNote),
      relation:relation?{title:relation.title,text:_tcPlain(relation.text)}:null,categories:catRows,
      answer:{title:qWisdom.keyword,advice:_tcPlain(qWisdom.advice)},ending:aphorisms[aIdx],prompt:_tcAiPrompt};
  }`].join('\n');
}
export default function turtleOracle(){
  const id='virtual:toss-turtle-oracle';
  return {name:'toss-turtle-oracle',resolveId(name){if(name===id)return '\0'+id;},load(name){if(name==='\0'+id){this.addWatchFile(path);return turtleModule();}}};
}
