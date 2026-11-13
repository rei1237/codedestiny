import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {isFreeFortuneFeatureKey} from '../../../lib/payment/free-fortune-policy.mjs';
const path=fileURLToPath(new URL('../../../js/oracle-kcg.js',import.meta.url));
export function kemetModule(){
  if(!isFreeFortuneFeatureKey('openKemetModal'))throw new Error('Kemet oracle requires an entitlement');
  const source=readFileSync(path,'utf8');
  function section(a,b){const start=source.indexOf(a),end=source.indexOf(b,start+a.length);if(start<0||end<=start)throw new Error('Missing Kemet source: '+a);return source.slice(start,end);}
  return [section('const KEMET_GODS =','function findKemetAiPromptPanel'),`export const cards=KEMET_GODS.length;
    export function readKemet(userInput,indices){
      if(userInput.trim().length<2||indices.length!==3||new Set(indices).size!==3||indices.some(id=>!Number.isInteger(id)||id<0||id>=cards))throw Error('INVALID_KEMET_SELECTION');
      const gods=indices.map(id=>KEMET_GODS[id]),[pastGod,presentGod,futureGod]=gods;
      ${section('  var q = (userInput','  var safeUserInput =')}
      const prompt=buildKemetAiPrompt({question:userInput,pastGod,presentGod,futureGod,catKey,catLabel,catSymbol});
      const positions=['past','present','future'];
      return {catLabel,catSymbol,prompt,papyrus:presentGod.papyrus,
        synthesis:stripKemetHtml(buildKemetSynthesis(pastGod,presentGod,futureGod,catKey)),
        gods:gods.map((god,index)=>({name:god.god,icon:god.icon,role:god.role,oracle:stripKemetHtml(god.nileOracle),position:stripKemetHtml(god.positional[positions[index]]),topic:stripKemetHtml(god[catKey]),heka:stripKemetHtml(god.heka)}))};
    }`].join('\n');
}
export default function kemetOracle(){const id='virtual:toss-kemet';return {name:'toss-kemet',resolveId(name){if(name===id)return '\0'+id;},load(name){if(name==='\0'+id){this.addWatchFile(path);return kemetModule();}}};}
