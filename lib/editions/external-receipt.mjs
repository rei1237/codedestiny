import {publicationDate} from './ledger-date.mjs';
import {seriesRows} from './batch-registry.mjs';
import spring from './yeoni-spring-declaration.json' with {type:'json'};

const repo='rei1237/codedestiny';
const initialSha='a0050173d211a04516c0afc115705d3e85ad92ae';
const initialPath='lib/editions/yeoni-spring-declaration.json';
const raw='https://raw.githubusercontent.com/'+repo+'/';
const blob='https://github.com/'+repo+'/blob/';
export const tagFor=(row)=>{
  if(!/^[a-f0-9-]{36}$/.test(row.editionId)||!Number.isSafeInteger(row.serial)||row.serial<1||row.serial>100)throw Error('발행 식별자 오류');
  return 'edition-record/'+row.editionId+'/'+row.serial;
};

export function snapshotFor(rows,item) {
  const ordered=seriesRows(rows,{id:item.editionId,title:item.title,character:item.character,cap:item.cap});
  const records=ordered.slice(0,item.serial).map(row=>({serial:row.serial,code:row.code,pin:row.pin,publishedOn:publicationDate(row)}));
  if(records.length!==item.serial || records.at(-1)?.code!==item.code ||
     records.some(r=>!/^\d{4}-\d{2}-\d{2}$/.test(r.publishedOn)))throw Error('공개할 발행 기록이 빠졌어요.');
  return {schema:1,editionId:item.editionId,title:item.title,character:item.character,cap:item.cap,publishedCount:item.serial,records};
}
export function sameSnapshot(actual,expected) {
  return ['schema','editionId','title','character','cap','publishedCount'].every(k=>actual?.[k]===expected[k]) &&
    Array.isArray(actual.records) && actual.records.length===expected.records.length &&
    expected.records.every((r,i)=>['serial','code','pin','publishedOn'].every(k=>r[k]===actual.records[i]?.[k]));
}
async function original(url,request){
  const response=await request(url,{redirect:'error',credentials:'omit',headers:{'User-Agent':'Code-Destiny-Edition-Checker'},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('외부 원본을 조회할 수 없어요.');
  return response.json();
}
export async function saleRecord(proof,items,request=fetch) {
  const row=items.find(r=>r.code===proof.code);
  if(!row||proof.status!=='verified'||proof.serial!==row.serial||proof.cap!==row.cap||proof.title!==row.title||proof.character!==row.character)return null;
  const bytes=new TextEncoder().encode(JSON.stringify([row.editionId,proof.code,proof.title,proof.character,proof.cap,proof.serial,proof.digest,proof.chainId,proof.contract,proof.token,proof.tx,proof.blockHash]));
  const pin=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  if(pin!==row.pin)return null;
  const expected=snapshotFor(items,row);
  const isSpring=row.editionId===spring.editionId;
  if(isSpring && (row.cap!==spring.cap||row.title!==spring.title||row.character!==spring.character||
    !spring.records.every((r,i)=>['code','pin','publishedOn'].every(k=>expected.records[i]?.[k]===r[k]))))return null;
  let path;
  if(isSpring && row.serial===1) {
    path=initialSha+'/'+initialPath;
  }else{
    if(!/^[0-9a-f]{40}$/.test(row.externalSha??''))return null;
    const canonical=await original(raw+'refs/tags/'+tagFor(row)+'/receipt.json',request);
    if(!sameSnapshot(canonical,expected))return null;
    path=row.externalSha+'/receipt.json';
  }
  if(!sameSnapshot(await original(raw+path,request),expected))return null;
  return {saleEligible:true,editionId:row.editionId,serial:row.serial,cap:row.cap,publishedCount:expected.publishedCount,source:blob+path};
}
