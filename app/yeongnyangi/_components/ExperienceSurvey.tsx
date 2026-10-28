'use client';
import styles from '../yeongnyangi.module.css';
import {experienceCopy} from '../_lib/experience-copy';
import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';

export type ExperienceCheck={years:number[];minYear:number;maxYear:number;maxEntries:number;noteMax:number};
type Outcome=''|'good'|'bad'|'mixed'|'ordinary'|'unsure'|'skip';
type Domain=''|'career'|'business'|'money'|'relationship'|'study';
export type ExperienceRow={id:string;year:number;month:string;domain:Domain;outcome:Outcome;intensity:'1'|'2'|'3';unsure:boolean;note:string;source:'prompted'|'volunteered'};

const OUTCOMES=['good','bad','mixed','ordinary','unsure','skip'] as const;
const DOMAINS=['career','business','money','relationship','study'] as const;
// 좋음·나쁨·혼재는 어느 분야의 일인지 있어야 센다. 서버 파서도 같은 조건으로 거른다.
const needsDomain=(outcome:Outcome)=>outcome==='good'||outcome==='bad'||outcome==='mixed';

/** 질문 연도 줄. 연도는 서버가 날짜로만 고른 값이다. */
export const promptedRows=(check:ExperienceCheck):ExperienceRow[]=>check.years.map(year=>({id:`p${year}`,year,month:'',domain:'',outcome:'',intensity:'2',unsure:false,note:'',source:'prompted'}));

/** 요청 본문의 experience. 답하지 않은 줄과 분야 없는 신호 줄은 보내지 않는다. */
export function experienceAnswers(rows:ExperienceRow[],max=40){
 return rows.filter(r=>r.outcome&&(!needsDomain(r.outcome)||r.domain)).slice(0,max).map(r=>({
  year:r.year,...(r.month?{month:Number(r.month)}:{}),domain:r.domain||null,outcome:r.outcome,
  intensity:Number(r.intensity),certainty:r.unsure?'unsure':'sure',source:r.source,...(r.note.trim()?{note:r.note.trim()}:{}),
 }));
}

export default function ExperienceSurvey({check,rows,onRows,locale,disabled,open}:{check:ExperienceCheck;rows:ExperienceRow[];onRows:(rows:ExperienceRow[])=>void;locale:ReadingLocale;disabled?:boolean;open?:boolean}){
 const copy=experienceCopy(locale);
 const set=(id:string,patch:Partial<ExperienceRow>)=>onRows(rows.map(r=>r.id===id?{...r,...patch}:r));
 const years=Array.from({length:Math.max(0,check.maxYear-check.minYear+1)},(_,i)=>check.maxYear-i);
 const full=rows.length>=check.maxEntries;
 return <details className={styles.experienceSurvey} open={open} lang={locale}>
  <summary>{copy.heading}</summary>
  <p>{copy.intro}</p>
  <p>{copy.invariant}</p>
  <p className={styles.experienceNote}>{copy.optional}</p>
  {rows.map(row=>{
   const name=`experience-${row.id}`;
   return <fieldset key={row.id} disabled={disabled} className={styles.experienceRow}>
    <legend>{row.source==='prompted'?copy.year(row.year):copy.addedEvent}</legend>
    {row.source==='volunteered'&&<label>{copy.yearLabel}<select name={`${name}-year`} value={row.year} onChange={e=>set(row.id,{year:Number(e.target.value)})}>{years.map(y=><option key={y} value={y}>{copy.year(y)}</option>)}</select></label>}
    <label className={styles.experienceWide}>{copy.outcomeLabel}<select name={`${name}-outcome`} value={row.outcome} onChange={e=>set(row.id,{outcome:e.target.value as Outcome})}><option value="">{copy.unanswered}</option>{OUTCOMES.map(o=><option key={o} value={o}>{copy.outcomes[o]}</option>)}</select></label>
    <label>{copy.domainLabel}<select name={`${name}-domain`} value={row.domain} onChange={e=>set(row.id,{domain:e.target.value as Domain})}><option value="">{copy.domainPick}</option>{DOMAINS.map(d=><option key={d} value={d}>{copy.domains[d]}</option>)}</select></label>
    {needsDomain(row.outcome)&&<label>{copy.intensityLabel}<select name={`${name}-intensity`} value={row.intensity} onChange={e=>set(row.id,{intensity:e.target.value as ExperienceRow['intensity']})}><option value="1">{copy.intensities.low}</option><option value="2">{copy.intensities.mid}</option><option value="3">{copy.intensities.high}</option></select></label>}
    <label>{copy.monthLabel}<select name={`${name}-month`} value={row.month} onChange={e=>set(row.id,{month:e.target.value})}><option value="">{copy.monthUnknown}</option>{Array.from({length:12},(_,i)=><option key={i+1} value={String(i+1)}>{i+1}</option>)}</select></label>
    <label className={styles.experienceCheck}><input type="checkbox" name={`${name}-unsure`} checked={row.unsure} onChange={e=>set(row.id,{unsure:e.target.checked})}/>{copy.unsureMemory}</label>
    <label className={styles.experienceWide}>{copy.noteLabel}<input name={`${name}-note`} maxLength={check.noteMax} value={row.note} placeholder={copy.notePlaceholder} onChange={e=>set(row.id,{note:e.target.value})}/></label>
    {needsDomain(row.outcome)&&!row.domain&&<p className={styles.experienceHint}>{copy.domainNeeded}</p>}
    {row.source==='volunteered'&&<button type="button" className={styles.secondary} onClick={()=>onRows(rows.filter(r=>r.id!==row.id))}>{copy.remove}</button>}
   </fieldset>;
  })}
  <button type="button" className={styles.secondary} disabled={disabled||full} onClick={()=>onRows([...rows,{id:`v${Date.now()}-${rows.length}`,year:check.maxYear,month:'',domain:'',outcome:'',intensity:'2',unsure:false,note:'',source:'volunteered'}])}>{copy.addEvent}</button>
  {full&&<p className={styles.experienceHint}>{copy.limit}</p>}
  <p className={styles.experienceNote}>{copy.privacy}</p>
 </details>;
}
