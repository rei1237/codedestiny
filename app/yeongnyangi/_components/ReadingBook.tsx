'use client';
import {Fragment,useEffect,useState} from 'react';
import type {FortuneRecord} from '../_lib/api';
import {readingCopy} from '../_lib/reading-copy';
import {readingFocusCopy} from '../_lib/reading-focus-copy';
import {chartCopy,visualCopy} from '../_lib/reading-chart-copy';
import {askPhase5Copy} from '../_lib/ask-phase5-copy';
import {journeyCopy} from '../_lib/journey-copy';
import {v7Label,v7PartHead} from '../_lib/reading-v7-copy';
import ReadingCharts from './ReadingCharts';
import {TarotSpreadResult,spreadCards} from './tarot/TarotSpreadReveal';
import BlockChartHints from './BlockChartHints';
import {AtAGlance,AnswerTable,Interlude,KeyPoints,MascotBubble,SajuBoard,SceneArt,TimingTimeline,YearFocus} from './ReadingVisuals';
import {expressionFor,interludes,isRichReading,sajuFacts,sceneArt,timingRows,yearFocus} from '../_lib/reading-visuals';
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
 const copy=readingCopy(row.locale),journey=journeyCopy(row.locale),focusCopy=readingFocusCopy(row.locale);
 const first=row.chapters[0],firstAnswer=first?.questionAnswers?.[0];
 const firstQuestion=firstAnswer?row.consultation?.questions?.find(q=>q.id===firstAnswer.questionId)?.text:undefined;
 const recovery=row.recovery?.canRetryNow||['GENERATION_REVIEW_REQUIRED','AUTOMATIC_RECOVERY_STOPPED','PAYMENT_NOT_ACTIVE'].includes(row.errorCode||'');
 const answerCopy=askPhase5Copy(row.locale).answer;
 // v7 titles come from the dictionary, so an unsaved chapter still has a localized title in the contents;
 // v6 keeps the model's own title and the Korean manifest title.
 const title=(index:number)=>row.locale&&row.locale!=='ko'
  ?(v7Label(row.manifest[index].titleKey,row.locale) || row.chapters[index]?.title || `${copy.chapter} ${index+1}`)
  :row.manifest[index].title;
 const available=new Set(row.manifest.slice(0,row.chapters.length).map(c=>c.id));
 // Long readings get every visual; question readings of any length get the charts, answer table and mascot,
 // while the glance table, key points and illustrations stay long-reading only.
 const rich=isRichReading(row.chapters),ask=!!row.consultation?.questions?.length,visual=rich||ask;
 const breaks=rich?interludes(row.chapters,row.manifest):new Map();
 // One life-scene picture per part, under the heading of its first scene section (any reading length).
 const scenes=sceneArt(row.manifest,row.chapters);
 const scene=(index:number,blockId?:string)=>{const slot=scenes.get(index);return slot&&slot.blockId===blockId?<SceneArt art={slot.art}/>:null;};
 const timing=visual?timingRows(row.charts || []):[];
 const timingChapter=timing.length?row.manifest.findIndex((c,i)=>i<row.chapters.length&&c.theme==='timing'):-1;
 // Without a timing chapter a question reading shows the timeline after its first answers.
 const timingAt=timingChapter>=0?timingChapter:ask&&timing.length?0:-1,timingLate=timingChapter<0;
 const saju=visual?sajuFacts(row.charts || []):null;
 const years=yearFocus(row.consultation?.period?.years,row.consultation?.asOf),focus=years.map(y=>y.year);
 // v3 tarot: the spread map sits between the core answer (chapter 1) and the per-position chapter.
 const spreadMap=row.tarotSpread?spreadCards(row.tarotSpread,row.charts?.find(chart=>chart.domain==='tarot')):undefined;
 return <div className={styles.book} lang={row.locale || 'ko'}>
  {first&&<section className={styles.overview} aria-labelledby="reading-focus-title" data-reading-focus>
   <h2 id="reading-focus-title">{firstAnswer?focusCopy.answer:copy.intro}</h2>
   {(firstQuestion||row.consultation?.question)&&<blockquote className={styles.originalQuestion} aria-label={focusCopy.question}>{firstQuestion||row.consultation?.question}</blockquote>}
   {firstAnswer?.mode&&<div className={styles.answerStatus} data-mode={firstAnswer.mode} role="note"><strong>{answerCopy[firstAnswer.mode]}</strong>{firstAnswer.mode==='limited'&&<p>{answerCopy.limitedHint}</p>}{firstAnswer.mode==='care'&&<p>{answerCopy.careHint}</p>}</div>}
   <p className={styles.focusAnswer}>{firstAnswer?.answer||first.summary}</p>
   {firstAnswer?<dl className={styles.focusDetails}>
    <div><dt>{firstAnswer.mode?answerCopy.reason:copy.reason}</dt><dd>{firstAnswer.reason}</dd></div>
    <div><dt>{firstAnswer.mode?answerCopy.timing:copy.timing}</dt><dd>{firstAnswer.timing}</dd></div>
    <div className={styles.focusAction}><dt>{firstAnswer.mode?answerCopy.action:copy.action}</dt><dd>{firstAnswer.action}</dd></div>
    {firstAnswer.review&&<div className={styles.answerReview}><dt>{answerCopy.review}</dt><dd>{firstAnswer.review}</dd></div>}
   </dl>:first.advice&&<div className={styles.focusAction}><h3>{copy.next}</h3><p>{first.advice}</p></div>}
  </section>}
  <aside className={styles.navigation}><details open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>{ask?answerCopy.answer:`${copy.contents} · ${Math.max(1,row.manifest.findIndex(c=>`chapter-${c.id}`===current)+1)} / ${row.manifest.length}`}</summary>
   <nav aria-label={copy.contents}>{row.manifest.map((chapter,i)=>{
    const head=v7PartHead(row.manifest,i,row.locale);
     return <Fragment key={chapter.id}>{head&&<b className={styles.partHeading}>{head}</b>}<a href={available.has(chapter.id)?`#chapter-${chapter.id}`:'#reading-progress'} aria-current={current===`chapter-${chapter.id}`?'location':undefined}>{ask?'':`${i+1}. `}{title(i)}<span className={styles.chapterStatus}>{available.has(chapter.id)?journey.saved:recovery?journey.recovery:journey.preparing}</span></a></Fragment>;
   })}</nav>
  </details>{saved&&row.manifest.some(c=>`chapter-${c.id}`===saved)&&<a className={styles.resume} href={`#${saved}`}>{copy.resume}</a>}</aside>
  <div className={styles.body}>
   {rich&&<details className={styles.reference}><summary>{visualCopy(row.locale).glance}</summary><AtAGlance manifest={row.manifest} chapters={row.chapters} title={title} locale={row.locale}/></details>}
   {!!row.charts?.length&&<details className={styles.reference} data-reading-evidence><summary>{chartCopy(row.locale).section}</summary><ReadingCharts charts={row.charts} available={available} titles={Object.fromEntries(row.manifest.map((c,i)=>[c.id,title(i)]))} locale={row.locale}/></details>}
   {row.chapters.map((chapter,index)=><Fragment key={row.manifest[index].id}><article data-reading-chapter id={`chapter-${row.manifest[index].id}`} className={styles.chapter} tabIndex={-1}>
    <h2>{title(index)}</h2>{(index>0||!!firstAnswer)&&<p className={styles.chapterSummary}>{chapter.summary}</p>}
    {(rich||index===0)&&!!chapter.highlights?.length&&<KeyPoints items={chapter.highlights} locale={row.locale}/>}
    {index===0&&years.length>0&&<YearFocus rows={years} expression="curious" locale={row.locale}/>}
    {index===timingAt&&!timingLate&&<TimingTimeline rows={timing} focus={focus} locale={row.locale}/>}
    {chapter.questionAnswers?.filter(answer=>answer!==firstAnswer).map(answer=><section key={answer.questionId}><h3>{row.consultation?.questions?.find(q=>q.id===answer.questionId)?.text || (answer.mode?answerCopy.answer:copy.answer)}</h3>
     {answer.mode&&<div className={styles.answerStatus} data-mode={answer.mode} role="note"><strong>{answerCopy[answer.mode]}</strong>{answer.mode==='limited'&&<p>{answerCopy.limitedHint}</p>}{answer.mode==='care'&&<p>{answerCopy.careHint}</p>}</div>}
     <p>{answer.answer}</p>{visual?<AnswerTable label={answer.mode?answerCopy.answer:copy.answer} rows={[[answer.mode?answerCopy.reason:copy.reason,answer.reason],[answer.mode?answerCopy.timing:copy.timing,answer.timing],[answer.mode?answerCopy.action:copy.action,answer.action]]}/>:<><h4>{answer.mode?answerCopy.reason:copy.reason}</h4><p>{answer.reason}</p><h4>{answer.mode?answerCopy.timing:copy.timing}</h4><p>{answer.timing}</p><h4>{answer.mode?answerCopy.action:copy.action}</h4><p>{answer.action}</p></>}{answer.review&&<div className={styles.answerReview}><h4>{answerCopy.review}</h4><p>{answer.review}</p></div>}</section>)}
    {chapter.blocks?.length?chapter.blocks.map((block,b)=><section key={block.id || b}><h3>{block.title}</h3>{block.id?scene(index,block.id):null}<BlockChartHints block={block} charts={row.charts} locale={row.locale}/>{block.paragraphs.map((text,i)=><p key={i}>{text}</p>)}</section>):chapter.analysis.map((text,i)=><p key={i}>{text}</p>)}
    {chapter.example&&<section><h3>{copy.example}</h3>{scene(index)}<p>{chapter.example}</p></section>}{chapter.advice&&(index>0||!!firstAnswer)&&<section><h3>{copy.next}</h3><p>{chapter.advice}</p></section>}
    {index===timingAt&&timingLate&&<TimingTimeline rows={timing} focus={focus} locale={row.locale}/>}
    {visual&&index===0&&saju&&<SajuBoard pillars={saju.pillars} elements={saju.elements} locale={row.locale}/>}
    {visual&&chapter.persona?<MascotBubble expression={expressionFor(row.manifest[index].theme,index)} text={chapter.persona} locale={row.locale}/>:<blockquote>{chapter.persona}</blockquote>}<a href="#reading-progress">{copy.top}</a>
   </article>{index===0&&row.tarotSpread&&spreadMap&&<TarotSpreadResult spread={row.tarotSpread} locale={row.locale} cards={spreadMap}/>}{breaks.has(index)&&<Interlude art={breaks.get(index)!}/>}</Fragment>)}
  </div>
 </div>;
}
