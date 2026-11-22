'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {ChevronDown} from 'lucide-react';
import type {FortuneRecord} from '../_lib/api';
import {readingFocusCopy} from '../_lib/reading-focus-copy';
import {resultStateCopy} from '../_lib/result-state-copy';
import {questionMemoCopy} from '../_lib/question-memo-copy';
import {localizedKind} from '../_lib/consultation-locale-copy';
import {formatAskRange} from '@/worker/yeongnyangi/fortune/ask/period';
import styles from './question-memo.module.css';

// The result is the lead; the buyer's question sits above it as a three-line memo (2026-11-23).
// A question past 120 characters or three lines starts folded; a shorter one folds only when it measures past three lines.
const LONG_QUESTION=120;
export default function QuestionMemo({row,question,context=false}:{row:FortuneRecord;question?:string;context?:boolean}){
 const locale=row.locale||'ko',state=resultStateCopy(locale),memo=questionMemoCopy(locale),c=row.consultation;
 const text=(question??c?.question??'').trim().replace(/\n{3,}/g,'\n\n');
 const label=text?readingFocusCopy(locale).question:locale==='ko'?(c?.kindLabel||c?.topicLabel||state.consultation):c?.consultationKind?localizedKind(c.consultationKind,locale):state.consultation;
 const period=c?.period?(locale==='ko'?c.period.label+(c.period.ranges?.length?` (${c.period.ranges.map(formatAskRange).join(', ')})`:''):c.period.years?.map(value=>value.year).join('–')||[c.period.start,c.period.end].filter(Boolean).join('–')||state.periodHint):'';
 const meta=[
  c?.relationship?.participants?`${c.relationship.participants.self} · ${c.relationship.participants.partner}`:'',
  c?.asOf?`${state.asOf}: ${c.asOf} · ${c.timezone||'Asia/Seoul'}`:'',
  c?.period?`${state.period}: ${period}. ${state.periodHint}`:'',
 ].filter(Boolean);
 const long=text.length>LONG_QUESTION||text.split('\n').length>3;
 const [expanded,setExpanded]=useState(false),[clipped,setClipped]=useState(long);
 // Folded, a long question runs on as one passage so three lines fill and the ellipsis never lands after a paragraph stop; open, each paragraph is its own block.
 const folded=long&&!expanded,paragraphs=text.split(/\s*\n\s*/).filter(Boolean);
 const body=useRef<HTMLParagraphElement>(null),id=useId();
 useEffect(()=>{
  const el=body.current;if(!el||expanded)return;
  const measure=()=>setClipped(el.scrollHeight>el.clientHeight+1);
  measure();
  if(typeof ResizeObserver==='undefined')return;
  const observer=new ResizeObserver(measure);observer.observe(el);
  return ()=>observer.disconnect();
 },[text,expanded]);
 if(!text&&!meta.length&&!context)return null;
 return <aside className={styles.memo} aria-labelledby={`${id}-label`} data-question-memo>
  <p id={`${id}-label`} className={styles.label}>{label}</p>
  {text?<p ref={body} id={`${id}-text`} className={styles.text} data-clamped={expanded?undefined:'true'}>{folded?paragraphs.join(' '):paragraphs.map((line,i)=><span key={i} className={styles.paragraph}>{line}</span>)}</p>:context&&<p className={styles.text}>{state.context}</p>}
  {text&&(expanded||clipped)&&<button type="button" className={styles.toggle} aria-expanded={expanded} aria-controls={`${id}-text`} onClick={()=>setExpanded(open=>!open)}>{expanded?memo.collapse:memo.expand}<ChevronDown size={18} aria-hidden="true"/></button>}
  {meta.length>0&&<ul className={styles.meta}>{meta.map(line=><li key={line}>{line}</li>)}</ul>}
 </aside>;
}
