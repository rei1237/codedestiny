import {FortuneError,type DomainContext} from '../shared/contracts';
import type {QuestionDecision} from './question-policy';
import {questionCycles} from '../counsel-purpose';
import {buildSubDasha} from '../../../lib/vedic-derived-calculations.js';

/** Projects already-calculated periods only. Never introduces another chart calculation or synthetic date. */
export function questionEvidence(ctx:DomainContext,d:QuestionDecision,question:string,asOf:string):DomainContext{
 if(d.horizon!=='transition')return ctx;
 const get=(label:string)=>ctx.facts.find(f=>f.label===label)?.value as any;
 const text=question+' '+d.period;
 let periods:unknown,rule:string;
 if(ctx.domain==='saju'){
  const major=get('majorLuck'),cycles=major?.cycles;
  if(!Array.isArray(cycles)||!cycles.length)throw new FortuneError('QUESTION_EVIDENCE_UNAVAILABLE');
  periods=questionCycles(text,asOf,cycles);
  rule='사주 대운이다. 원국과 실제 대운의 관계만 비교하며 시기의 해상도를 높이지 않는다.';
 }else if(ctx.domain==='ziwei'){
  const major=get('majorLuck'),age=Number(get('minorLuck')?.current?.age);
  const current=Array.isArray(major)?major.find((p:any)=>age>=p.startAge&&age<=p.endAge):undefined;
  if(!current)throw new FortuneError('QUESTION_EVIDENCE_UNAVAILABLE');
  periods=[current,...major.filter((p:any)=>p.startAge===current.endAge+1)];
  rule='자미두수 대한이다. 저장된 소한의 현재 나이로 해당 대한과 다음 대한을 선택했다. 대한의 궁간 사화와 생년 사화를 구분한다. 나이 구간만 있는 근거를 정확한 월·일로 바꾸지 않는다.';
 }else if(ctx.domain==='vedic'){
  const dasha=get('vimshottariDasha');
  if(!dasha?.currentMahadasha)throw new FortuneError('QUESTION_EVIDENCE_UNAVAILABLE');
  const remaining=remainingAntardashas(get('dasha'),dasha.currentMahadasha,asOf);
  periods=[{currentMahadasha:dasha.currentMahadasha,currentAntardasha:dasha.currentAntardasha,...(remaining?{remainingAntardashas:remaining}:{})},
   ...(dasha.periods||[]).filter((p:any)=>p.startDate>asOf).slice(0,1)];
  rule='베다 빈쇼타리 다샤다. 저장된 마하다샤·안타르다샤와 다음 마하다샤의 실제 기간을 사용하며 사주 대운으로 부르지 않는다. 현재 마하다샤의 안타르다샤는 remainingAntardashas의 순서와 기간만 쓴다. 그 목록의 마지막 항목만 마지막 안타르다샤라고 부르고, 목록에 없는 안타르다샤를 마지막이라고 부르지 않는다.';
 }else throw new FortuneError('QUESTION_SCOPE_UNSUPPORTED');
 if(!Array.isArray(periods)||!periods.length)throw new FortuneError('QUESTION_EVIDENCE_UNAVAILABLE');
 return {...ctx,facts:[...ctx.facts,{id:ctx.domain+'.questionTiming',label:'questionTiming',value:{periods,rule,requestedPeriod:d.period}}]};
}

/** The current mahadasha's antardashas from asOf to its end, cut from the engine's own full-precision timeline. */
function remainingAntardashas(raw:any,current:any,asOf:string){
 const md=(raw?.timeline||[]).find((p:any)=>p.lord===current?.lord&&p.startDate===current?.startDate);
 if(!md?.start||!md?.end)return undefined;
 const out:{lord:string,startDate:string,endDate:string}[]=[];
 let cursor=Date.parse(asOf);
 for(let i=0;i<9;i++){
  const ad=buildSubDasha(md,new Date(cursor));
  if(!ad)break;
  out.push({lord:ad.lord,startDate:ad.start.slice(0,10),endDate:ad.end.slice(0,10)});
  cursor=Date.parse(ad.end);
 }
 return out.length?out:undefined;
}

const startDate=(r:any)=>`${r?.start?.year}-${String(r?.start?.month).padStart(2,'0')}-${String(r?.start?.day).padStart(2,'0')}`;
/**
 * Current-horizon question timing reaches the end of the asked period. Saju month rows come from the same engine,
 * run once per later civil year (at most three); ziwei years are cut from the stored timeline to the asked years.
 */
export async function questionPeriodTiming(ctx:DomainContext,d:QuestionDecision,period:{end?:string}|undefined,asOf:string,
 monthsOf:(year:number)=>Promise<unknown>):Promise<DomainContext>{
 if(d.horizon==='transition')return ctx;
 const end=period?.end&&period.end>asOf?period.end:asOf,first=Number(asOf.slice(0,4)),last=Number(end.slice(0,4));
 const replace=(label:string,value:unknown)=>({...ctx,facts:ctx.facts.map(f=>f.label===label?{...f,value}:f)});
 if(ctx.domain==='saju'){
  const rows=ctx.facts.find(f=>f.label==='monthlyLuck')?.value;
  if(!Array.isArray(rows)||!rows.length)return ctx;
  const extra:unknown[]=[];
  for(let year=Math.max(...rows.map((r:any)=>Number(r?.start?.year)))+1;year<=Math.min(last,first+3);year++){
   const later=await monthsOf(year);
   extra.push(...(Array.isArray(later)?later:[]).filter((r:any)=>r?.start?.year===year&&startDate(r)<=end));
  }
  return extra.length?replace('monthlyLuck',[...rows,...extra]):ctx;
 }
 if(ctx.domain==='ziwei'){
  const rows=ctx.facts.find(f=>f.label==='yearlyTimeline')?.value;
  return Array.isArray(rows)?replace('yearlyTimeline',rows.filter((r:any)=>r?.year>=first&&r?.year<=last)):ctx;
 }
 return ctx;
}
