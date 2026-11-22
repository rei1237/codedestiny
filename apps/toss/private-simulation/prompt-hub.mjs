import fixtures from './prompt-hub-examples.json' with {type:'json'};
import {PROMPT_HUB_TOOLS,buildStructuredFortunePrompt} from '../../../lib/fortune/prompt-hub-template.js';
import {isFreeFortuneFeatureKey} from '../../../lib/payment/free-fortune-policy.mjs';

function matches(actual,expected){
 if(actual===expected)return true;
 if(!actual||!expected||typeof actual!=='object'||typeof expected!=='object')return false;
 const keys=Object.keys(expected);
 return Object.keys(actual).length===keys.length&&keys.every(key=>Object.hasOwn(actual,key)&&matches(actual[key],expected[key]));
}
const exampleRequired=()=>Response.json({error:'PROMPT_HUB_EXAMPLE_REQUIRED',message:'이 계산은 모의 환경에서 도구의 예시 입력으로 확인할 수 있어요.'},{status:422});
export async function mockPromptHubRequest(request,path){
 if(request.method==='GET'&&path==='/canonical/geocode'){
  const place=new URL(request.url).searchParams.get('place');
  if(Object.hasOwn(fixtures.places,place)){
   const [lat,lng]=fixtures.places[place];
   return Response.json({name:place,lat,lng,timezone:'Asia/Seoul',fallback:false});
  }
  return null;
 }
 if(request.method!=='POST')return null;
 if(path==='/canonical/fortune/prompt-hub/generate'){
  const input=await request.json();
  if(!isFreeFortuneFeatureKey('fortune-prompt-hub-generate')||input.paymentRequestId)return Response.json({error:'PAYMENT_NOT_SUPPORTED'},{status:409});
  if(!Object.hasOwn(PROMPT_HUB_TOOLS,input.toolId)||!Array.isArray(input.fields))return Response.json({error:'INVALID_PROMPT_HUB_REQUEST'},{status:400});
  if(input.toolId==='horary'&&(!matches(input.horary,fixtures.horary.input)||input.locale!=='ko'))return exampleRequired();
  const prompt=input.toolId==='horary'?fixtures.horary.prompt:buildStructuredFortunePrompt(input.toolId,input.fields,input.computedFacts);
  return Response.json({ok:true,toolId:input.toolId,prompt,paidWith:'public'});
 }
 if(!['/canonical/astrology/basic','/canonical/sukuyo/astronomy','/canonical/nakshatra/resolve'].includes(path))return null;
 const input=await request.json(),row=fixtures.rows.find(item=>'/canonical'+item.path===path&&matches(input,item.input));
 return row?Response.json(row.result):exampleRequired();
}
