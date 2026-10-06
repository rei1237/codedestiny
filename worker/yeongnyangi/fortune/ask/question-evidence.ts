import {FortuneError,type DomainContext} from '../shared/contracts';
import type {QuestionDecision} from './question-policy';
import {questionCycles} from '../counsel-purpose';

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
  periods=[{currentMahadasha:dasha.currentMahadasha,currentAntardasha:dasha.currentAntardasha},
   ...(dasha.periods||[]).filter((p:any)=>p.startDate>asOf).slice(0,1)];
  rule='베다 빈쇼타리 다샤다. 저장된 마하다샤·안타르다샤와 다음 마하다샤의 실제 기간을 사용하며 사주 대운으로 부르지 않는다.';
 }else throw new FortuneError('QUESTION_SCOPE_UNSUPPORTED');
 if(!Array.isArray(periods)||!periods.length)throw new FortuneError('QUESTION_EVIDENCE_UNAVAILABLE');
 return {...ctx,facts:[...ctx.facts,{id:ctx.domain+'.questionTiming',label:'questionTiming',value:{periods,rule,requestedPeriod:d.period}}]};
}
