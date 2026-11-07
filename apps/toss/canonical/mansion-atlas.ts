import {SUKUYO_MANSIONS} from '../../../worker/lib/sukuyo-premium.js';
import {crosswalkFromSukuyo} from '../../../constants/nakshatra-crosswalk.js';
import {getNakshatraAttributes} from '../../../constants/nakshatra-attributes.js';
import {getFusionBySukuyo} from '../../../constants/nakshatra-fusion.js';
import {GRAHA_KO} from '../../../worker/lib/vedic-derived-calculations.js';

// Project only the fields displayed in the original public /nakshatra/codex/[index] articles.
export function publicMansions(){
  return SUKUYO_MANSIONS.map((s,i)=>{
    const pair=crosswalkFromSukuyo(i),a=pair&&getNakshatraAttributes(pair.nakshatraIdx),f=getFusionBySukuyo(i);
    if(!a||!f)throw new Error('Missing public atlas entry: '+i);
    return {index:i,eastern:{name:s.nameKo,han:s.nameHan,title:s.archetypeTitle,direction:s.direction,
      strengths:s.strengths,shadows:s.shadows??[],keywords:s.keywords},
      indian:{name:a.nameKo,nameEn:a.nameEn,planet:GRAHA_KO[a.lord as keyof typeof GRAHA_KO]||a.lord,deity:a.deity,
        symbol:a.symbol,power:a.shakti,motive:a.motiveKo,padas:a.padaSignsKo},
      convergence:f.convergence,divergence:f.divergence};
  });
}
export default function mansionAtlas(){
  const id='virtual:toss-mansion-atlas';
  return {name:'toss-public-mansion-atlas',resolveId(name:string){if(name===id)return '\0'+id;},
    load(name:string){if(name==='\0'+id)return 'export default '+JSON.stringify(publicMansions());}};
}
