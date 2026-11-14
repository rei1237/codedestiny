import {teaSpreads} from '../../../lib/fortune-tea-house/tarot-contract.mjs';
export function teaModeInput(mode){
 const people={user:{name:'테스트',birthDate:'1990-01-01',gender:'female',birthTimeUnknown:true,calendarType:'solar'},partner:{name:'상대',birthDate:'1992-02-02',gender:'male',birthTimeUnknown:true,calendarType:'solar'},relationshipType:'연인',focus:'관계 흐름'};
 return {consultationMode:mode==='sajuJoint'?'saju':mode==='tarotFive'?'tarot':mode,
 ...(mode==='sajuJoint'?{sajuReportVersion:'saju-specialist-v2'}:{}),
 ...(mode.startsWith('tarot')?{tarotSpread:mode==='tarotFive'?'five':'three',tarotSpreadId:teaSpreads.find(s=>s.cardCount===(mode==='tarotFive'?5:3)).id,attemptId:'test-tea-'+mode,selectedTeaCupId:'test-cup'}:{}),
 ...(mode==='sajuCompatibility'?{sajuCompatibility:people}:mode==='sukuyo'?{sukuyo:people}:{}),
 birthDate:'1990-01-01',gender:'female',birthTimeUnknown:true};
}

export async function prepareTeaModeDraw(request,input){
 if(input.consultationMode!=='tarot')return;
 const prepared=await request('/canonical/fortune-tea-house/tarot/prepare',input);
 if(prepared.status!==200)throw Error('Tea prepare failed: '+await prepared.text());
 const drawn=await request('/canonical/fortune-tea-house/tarot/draw',{attemptId:input.attemptId,auto:true});
 if(drawn.status!==200)throw Error('Tea draw failed: '+await drawn.text());
 return (await drawn.json()).draft;
}
