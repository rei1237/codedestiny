import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {extractSajuCompatClosure} from '../../../scripts/lib/saju-compat-closure.mjs';
export default function compatBasis(){
 const legacy=new URL('../../../js/saju-engine.js',import.meta.url),natal=new URL('../../../js/core/saju/natal-core.generated.js',import.meta.url);
 return {name:'original-compat-basis',resolveId(id){if(id==='virtual:saju-compat-basis')return '\0toss-compat-basis';},async load(id){
   if(id!=='\0toss-compat-basis')return;
   for(const f of [legacy,natal])this.addWatchFile(fileURLToPath(f));
   const {code}=extractSajuCompatClosure(await readFile(legacy,'utf8'));
   return (await readFile(natal,'utf8'))+'\n'+code+`
function side(raw){
   const p=Object.fromEntries(['y','m','d','h'].map((key,i)=>{const pair=raw[i];return [key,{g:pair[0],j:pair[1],gE:GAN[pair[0]].e,jE:JI[pair[1]].e}];}));
   return [p,calcNatalElement(p),calcPower(p),analyzeJohu(p),detectJong(p)];
}
export function compatibilityHtml(first,second,type,name){
 const safeName=String(name).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const a=side(first),b=side(second);
 return analyzeCompat(...a,...b,type,safeName,{omitLightSections:true}).html+analyzePastLifeCompat(a[0],b[0],safeName);
}
export function compatibilityFacts(first,second,type,name){
 const a=side(first),b=side(second),out={};
 const analyzed=analyzeCompat(...a,...b,type,name);analyzePastLifeCompat(a[0],b[0],name,out);
 return {selfPillars:a[0],partnerPillars:b[0],compatFacts:analyzed.facts,pastLifeFacts:out.facts};
}`;
 }};
}
