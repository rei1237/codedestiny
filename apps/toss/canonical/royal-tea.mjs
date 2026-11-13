import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {isFreeFortuneFeatureKey} from '../../../lib/payment/free-fortune-policy.mjs';
const path=fileURLToPath(new URL('../../../royal-tea-oracle.html',import.meta.url));
export function royalTeaModule(){
  if(!isFreeFortuneFeatureKey('royal-tea-oracle'))throw new Error('Royal tea requires an entitlement');
  const shell=readFileSync(path,'utf8');
  function between(a,b){const start=shell.indexOf(a),end=shell.indexOf(b,start+a.length);if(start<0||end<=start)throw new Error('Royal tea source missing: '+a);return shell.slice(start,end);}
  const css=between('.cert-head {','.result-keyword-chip {');
  const draw=between('function buildCupMap(intent)','function setRoyalTeaPaymentPending')
    .replace('buildCupMap(intent)','buildCupMap(intent,drinker)').replace('const drinker = getDrinkerKey();','');
  return ['export const certificateStyles='+JSON.stringify(css)+';',between('const SYMBOLS =','const canvas ='),between('function getSymbolKeywords','function getDrinkerKey'),
    between('function getKstDateKey','function buildCupMap(intent)'),draw,between('function escapeHtml','function syncCertMoreHint'),
    'export {INTENTS}; export function readRoyalTea(intent,drinker){const cup=buildCupMap(intent,drinker);return {title:cup.cupName,serial:cup.serial,html:buildCertificateHtml(cup)};}'].join('\n');
}
export default function royalTea(){
  const id='virtual:toss-royal-tea';
  return {name:'toss-royal-tea',resolveId(name){if(name===id)return '\0'+id;},load(name){if(name==='\0'+id){this.addWatchFile(path);return royalTeaModule();}}};
}
