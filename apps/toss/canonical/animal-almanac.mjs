import {readFileSync} from 'node:fs';
import {createAnimalDestinyRuntime} from '../../../worker/lib/saju-section/runtime.generated.mjs';
import {STEM_HANJA,BRANCH_HANJA} from '../../../lib/korean-calendar/labels.js';
import {compressAnimalRuntime} from './compressed-animal-runtime.mjs';

// Build-time projection: the browser gets only the stage cross-table and the names on the public dex.
export function publicAnimalAlmanac(){
  const source=createAnimalDestinyRuntime();
  const cms=JSON.parse(readFileSync(new URL('../../../app/_content/cms.generated.json',import.meta.url),'utf8'));
  const catalog=source.ANIMAL_DESTINY_LIST.map(({stageKey,saju_stage:stage,stage_hanja:hanja,animal_ko:name})=>{
    const override=cms?.entries?.['saju-animal']?.stage?.record?.[stageKey]?.animalName;
    return {stage,hanja,name:typeof override==='string'&&override.trim()?override:name};
  });
  const stages=Object.fromEntries(STEM_HANJA.map(stem=>[stem,Object.fromEntries(BRANCH_HANJA.map(branch=>{
    const pillars={day:{stem,branch}};
    const {primary}=source.getTwelveStagesForPillars({dayStem:stem,pillars});
    if(!catalog.some(entry=>entry.stage===primary))throw new Error('Missing public animal stage');
    return [branch,primary];
  }))]));
  return {catalog,stages};
}
export default function animalAlmanac(){const key='virtual:toss-animal-almanac';return {
  name:'toss-public-animal-almanac',resolveId(id){if(id===key)return '\0'+key;},
  enforce:'pre',transform(code,id){if(id.replaceAll('\\','/').split('?')[0].endsWith('/worker/lib/saju-section/runtime.generated.mjs'))return compressAnimalRuntime(code);},
  load(id){if(id==='\0'+key)return 'export default '+JSON.stringify(publicAnimalAlmanac());},
};}
