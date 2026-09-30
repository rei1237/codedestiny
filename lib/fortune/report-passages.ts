import {looksLikeRawJson,extractReadableTextFromJsonLike} from '../llm-text';

function quotedValues(value:unknown,label=''):string[]{
 if(typeof value==='string')return value.trim()?[value]:[];
 if(typeof value==='number'||typeof value==='boolean')return [`${label}: ${value}`];
 if(Array.isArray(value))return value.flatMap(item=>quotedValues(item,label));
 if(value&&typeof value==='object')return Object.entries(value).flatMap(([key,item])=>quotedValues(item,key));
 return [];
}

// Normal structured responses keep even short sentences and dates. Recovery is only for malformed JSON.
export function savedReportPassages(content:string|string[]):string[]{
 return (Array.isArray(content)?content:[content]).flatMap(message=>{
  if(!looksLikeRawJson(message))return message.split(/\n\s*\n/).filter(part=>part.trim());
  try{
   const parsed=JSON.parse(message.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));
   return quotedValues(parsed?.sections??parsed);
  }catch{return extractReadableTextFromJsonLike(message).split(/\n\s*\n/).filter(part=>part.trim());}
 });
}
