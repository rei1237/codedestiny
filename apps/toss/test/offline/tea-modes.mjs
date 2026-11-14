// Private/offline simulation only. Original web calculation snapshots remain unchanged.
import {TEA_SAJU_JOINT_SECTIONS} from '../../../../worker/lib/tea-saju-specialist.js';
export const teaModes = [
 ['saju','saju','가상 찻집 사주'],
 ['sajuJoint','saju-joint','가상 공동 사주'],
 ['tarot','tarot','가상 타로 3장'],
 ['tarotFive','tarot-five','가상 타로 5장'],
 ['sajuCompatibility','saju-compatibility','가상 사주 궁합'],
 ['sukuyo','sukuyo-compatibility','가상 숙요 궁합'],
].map(([mode,key,name])=>({mode,service:'tea',name,featureKey:'fortune-tea-house-'+key+'-consultation',path:'/fortune-tea-house/'}));
export function teaMode(input){
 const mode=input.consultationMode||'saju';
 return mode==='saju'&&input.sajuReportVersion==='saju-specialist-v2'?'sajuJoint':mode==='tarot'&&input.tarotSpread==='five'?'tarotFive':mode;
}
const keys=['question','consultationMode','sajuReportVersion','tarotSpread','tarotSpreadId','consultationVersion','birthDate','birthTime','birthTimeUnknown','birthPlace','timezone','longitude','isLeapMonth','gender','calendarType','selectedTeaCupId','selectedTeaCupName','selectedTeaCupTopic','questionCategory','sajuCompatibility','sukuyo'];
const stable=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(k=>[k,item[k]])):item);
export const sameTeaInput=(left,right)=>teaMode(left)===teaMode(right)&&keys.every(key=>stable(left[key])===stable(right[key]));
export function teaModeResult(row,body,base,draw){
 const input=row.input,draft=body.draftResult||{},mode=input.consultationMode||'saju',text='[테스트 전용] 찻집에서 저장한 결과 원문입니다.';
 const result={...base,consultationMode:mode,sajuReportVersion:input.sajuReportVersion,featureKey:row.featureKey,tarotSpread:input.tarotSpread,tarotSpreadId:input.tarotSpreadId};
 if(draft.saju)result.saju={...draft.saju,title:text,summary:text,keyPoints:[text],deepSections:[],oneLineAdvice:text};
 if(input.sajuReportVersion==='saju-specialist-v2')result.saju.deepSections=TEA_SAJU_JOINT_SECTIONS.map((title,index)=>({id:'mock-joint-'+index,title,body:text}));
 if(mode==='tarot'){
  result.tarot={...draw.cards[0],reading:text};
  result.tarotSpreadCards=draw.cards.map(card=>({...card,reading:card.nameKo+' '+text}));
 }
 if(mode==='sajuCompatibility')result.sajuCompatibility={...draft.sajuCompatibility,title:text,summary:text,interaction:{summary:text,strengths:[text],cautions:[text]},adviceKeywords:[]};
 if(mode==='sukuyo')result.sukuyoCompatibility={...draft.sukuyoCompatibility,available:true,calculationSource:'mock-response-no-astronomy',title:text,summary:text,strengths:[text],cautions:[text],adviceKeywords:[],chapters:[{title:'모의 관계 상담',body:text}]};
 return result;
}
