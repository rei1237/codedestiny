import {readFile} from 'node:fs/promises';
import {extractSajuCompatClosure} from '../../../scripts/lib/saju-compat-closure.mjs';
const runtime=new URL('../../../js/core/index-inline-runtime.js',import.meta.url);
const functions=['_dfBuildAtelierExtension','_dfBuildArtPrompt','_dfBuildNegativePrompt','_dfBuildPromptPack','_dfBuildSnapshot','_dfFlowerHookText','_dfGetSajuBadges','_dfSourceLabelText','_dfBouquetReading','_DF_STUDIO_HISTORY_LIMIT'];
export async function flowerStudioModule(){
 const {order,decl}=extractSajuCompatClosure(await readFile(runtime,'utf8'),functions);
 const code=order.map(name=>decl.get(name)).sort((a,b)=>a.node.pos-b.node.pos).map(entry=>entry.text).join('\n');
 return code+`\nexport const historyLimit=_DF_STUDIO_HISTORY_LIMIT;
 export function describeFlower(source,row){
  const flower=row.flower,matched={...row.studio.matched,narrative:row.narrative};
  const selection={source,flower,matched,primary:flower.primary_color,secondary:flower.secondary_color,keywords:flower.keywords||[],flowerData:matched.flower_data,payload:{analysis:row.studio.analysis}};
  const label=_dfSourceLabelText(source),badges=_dfGetSajuBadges(selection),verdict=_dfGetSajuVerdict(selection);
  const extension=_dfBuildAtelierExtension(selection,label,badges,matched.flower_data||{},verdict);
  return {source,label,flower,verdict,extension:{...extension,flowerLanguage:matched.destiny_flower_language||extension.flowerLanguage},why:matched.rationale_points||[],story:matched.bloom_story,selection,
    positive:_dfBuildArtPrompt(selection),negative:_dfBuildNegativePrompt(),promptPack:_dfBuildPromptPack(selection)};
 }
 export const bouquet=items=>_dfBouquetReading(items);
 export function flowerCard(studio){
  const {selection,...reading}=studio,snapshot=_dfBuildSnapshot(selection);
  const shareUrl=new URL('/ggulggul/','https://code-destiny.com');
  shareUrl.search=new URLSearchParams({action:'openDestinyFlowerStudio',fl:snapshot.flower_id,fs:snapshot.source});
  const share=_dfFlowerHookText({name:snapshot.name,language:snapshot.flower_language,rarity:snapshot.rarity_line,url:shareUrl.href});
  return {...reading,snapshot,share};
 }`;
}
export default function flowerStudio(){return {name:'toss:original-flower-studio',resolveId(id){if(id==='virtual:flower-studio')return '\\0'+id;},load(id){if(id==='\\0virtual:flower-studio')return flowerStudioModule();}};}
