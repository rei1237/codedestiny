'use client';
import {Fragment,useEffect,useState} from 'react';
import type {FortuneRecord} from '../_lib/api';
import {readingCopy} from '../_lib/reading-copy';
import {askPhase5Copy} from '../_lib/ask-phase5-copy';
import {journeyCopy} from '../_lib/journey-copy';
import ReadingCharts from './ReadingCharts';
import {AtAGlance,AnswerTable,Interlude,KeyPoints,MascotBubble,SajuBoard,TimingTimeline} from './ReadingVisuals';
import {expressionFor,interludes,isRichReading,sajuFacts,timingRows} from '../_lib/reading-visuals';
import styles from './reading-v5.module.css';

export default function ReadingBook({row}:{row:FortuneRecord}){
 const [current,setCurrent]=useState(''),[saved,setSaved]=useState(''),[open,setOpen]=useState(false);
 const storageKey=`yeongnyangi:reading-position:${row.id}`;
 useEffect(()=>{try{setSaved(localStorage.getItem(storageKey)||'');}catch{/* Optional device preference. */}setOpen(matchMedia('(min-width: 1000px)').matches);},[storageKey]);
 useEffect(()=>{
  const observer=new IntersectionObserver(entries=>{
   const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top)[0];
   if(visible){setCurrent(visible.target.id);try{localStorage.setItem(storageKey,visible.target.id);}catch{/* Reading stays available without storage. */}}
  },{rootMargin:'-10% 0px -65% 0px'});
  document.querySelectorAll('[data-reading-chapter]').forEach(el=>observer.observe(el));
  return ()=>observer.disconnect();
 },[storageKey,row.chapters.length]);
 const copy=readingCopy(row.locale),journey=journeyCopy(row.locale);
 const recovery=row.recovery?.canRetryNow||['GENERATION_REVIEW_REQUIRED','AUTOMATIC_RECOVERY_STOPPED','PAYMENT_NOT_ACTIVE'].includes(row.errorCode||'');
 const answerCopy=askPhase5Copy(row.locale).answer;
 const title=(index:number)=>row.locale&&row.locale!=='ko'?(row.chapters[index]?.title || `${copy.chapter} ${index+1}`):row.manifest[index].title;
 const available=new Set(row.manifest.slice(0,row.chapters.length).map(c=>c.id));
 // Long readings only: short readings keep the plain text layout unchanged.
 const rich=isRichReading(row.chapters);
 const breaks=rich?interludes(row.chapters,row.manifest):new Map();
 const timing=rich?timingRows(row.charts || []):[];
 const timingAt=timing.length?row.manifest.findIndex((c,i)=>i<row.chapters.length&&c.theme==='timing'):-1;
 const saju=rich?sajuFacts(row.charts || []):null;
 return <div className={styles.book} lang={row.locale || 'ko'}>
  {row.chapters.length>0&&<section className={styles.overview}><h2>{copy.intro}</h2><p>{row.chapters[0].summary}</p>{(row.chapters[0].highlights || []).length>0&&<ul>{(row.chapters[0].highlights || []).map((t,i)=><li key={i}>{t}</li>)}</ul>}{row.chapters[0].advice&&<p><strong>{copy.next}</strong><br/>{row.chapters[0].advice}</p>}</section>}
  <aside className={styles.navigation}><details open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>{copy.contents} · {Math.max(1,row.manifest.findIndex(c=>`chapter-${c.id}`===current)+1)} / {row.manifest.length}</summary>
   <nav aria-label={copy.contents}>{row.manifest.map((chapter,i)=><a key={chapter.id} href={available.has(chapter.id)?`#chapter-${chapter.id}`:'#reading-progress'} aria-current={current===`chapter-${chapter.id}`?'location':undefined}>{i+1}. {title(i)}<span className={styles.chapterStatus}>{available.has(chapter.id)?journey.saved:recovery?journey.recovery:journey.preparing}</span></a>)}</nav>
  </details>{saved&&row.manifest.some(c=>`chapter-${c.id}`===saved)&&<a className={styles.resume} href={`#${saved}`}>{copy.resume}</a>}</aside>
  <div className={styles.body}>
   {rich&&<AtAGlance manifest={row.manifest} chapters={row.chapters} title={title} locale={row.locale}/>}
   {!!row.charts?.length&&<ReadingCharts charts={row.charts} available={available} titles={Object.fromEntries(row.manifest.map((c,i)=>[c.id,title(i)]))} locale={row.locale}/>}
   {row.chapters.map((chapter,index)=><Fragment key={row.manifest[index].id}><article data-reading-chapter id={`chapter-${row.manifest[index].id}`} className={styles.chapter} tabIndex={-1}>
    <h2>{title(index)}</h2><p className={styles.chapterSummary}>{chapter.summary}</p>
    {rich&&index>0&&!!chapter.highlights?.length&&<KeyPoints items={chapter.highlights} locale={row.locale}/>}
    {index===timingAt&&<TimingTimeline rows={timing} locale={row.locale}/>}
    {chapter.questionAnswers?.map(answer=><section key={answer.questionId}><h3>{row.consultation?.questions?.find(q=>q.id===answer.questionId)?.text || (answer.mode?answerCopy.answer:copy.answer)}</h3>
     {answer.mode&&<div className={styles.answerStatus} data-mode={answer.mode} role="note"><strong>{answerCopy[answer.mode]}</strong>{answer.mode==='limited'&&<p>{answerCopy.limitedHint}</p>}{answer.mode==='care'&&<p>{answerCopy.careHint}</p>}</div>}
     <p>{answer.answer}</p>{rich?<AnswerTable label={answer.mode?answerCopy.answer:copy.answer} rows={[[answer.mode?answerCopy.reason:copy.reason,answer.reason],[answer.mode?answerCopy.timing:copy.timing,answer.timing],[answer.mode?answerCopy.action:copy.action,answer.action]]}/>:<><h4>{answer.mode?answerCopy.reason:copy.reason}</h4><p>{answer.reason}</p><h4>{answer.mode?answerCopy.timing:copy.timing}</h4><p>{answer.timing}</p><h4>{answer.mode?answerCopy.action:copy.action}</h4><p>{answer.action}</p></>}</section>)}
    {chapter.blocks?.length?chapter.blocks.map((block,b)=><section key={block.id || b}><h3>{block.title}</h3>{block.paragraphs.map((text,i)=><p key={i}>{text}</p>)}</section>):chapter.analysis.map((text,i)=><p key={i}>{text}</p>)}
    {chapter.example&&<section><h3>{copy.example}</h3><p>{chapter.example}</p></section>}{chapter.advice&&<section><h3>{copy.next}</h3><p>{chapter.advice}</p></section>}
    {rich&&index===0&&saju&&<SajuBoard pillars={saju.pillars} elements={saju.elements} locale={row.locale}/>}
    {rich&&chapter.persona?<MascotBubble expression={expressionFor(row.manifest[index].theme,index)} text={chapter.persona} locale={row.locale}/>:<blockquote>{chapter.persona}</blockquote>}<a href="#reading-progress">{copy.top}</a>
   </article>{breaks.has(index)&&<Interlude art={breaks.get(index)!}/>}</Fragment>)}
  </div>
 </div>;
}
