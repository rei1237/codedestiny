'use client';
import {useEffect,useState} from 'react';
import type {FortuneRecord} from '../_lib/api';
import {readingCopy} from '../_lib/reading-copy';
import ReadingCharts from './ReadingCharts';
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
 const copy=readingCopy(row.locale);
 const title=(index:number)=>row.locale&&row.locale!=='ko'?(row.chapters[index]?.title || `${copy.chapter} ${index+1}`):row.manifest[index].title;
 const available=new Set(row.manifest.slice(0,row.chapters.length).map(c=>c.id));
 return <div className={styles.book} lang={row.locale || 'ko'}>
  <aside className={styles.navigation}><details open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>{copy.contents} · {Math.max(1,row.manifest.findIndex(c=>`chapter-${c.id}`===current)+1)} / {row.manifest.length}</summary>
   <nav aria-label={copy.contents}>{row.manifest.map((chapter,i)=><a key={chapter.id} href={available.has(chapter.id)?`#chapter-${chapter.id}`:'#reading-progress'} aria-current={current===`chapter-${chapter.id}`?'location':undefined}>{i+1}. {title(i)}{!available.has(chapter.id)&&` · ${copy.preparing}`}</a>)}</nav>
  </details>{saved&&row.manifest.some(c=>`chapter-${c.id}`===saved)&&<a className={styles.resume} href={`#${saved}`}>{copy.resume}</a>}</aside>
  <div className={styles.body}>
   {row.chapters.length>0&&<section className={styles.overview}><h2>{copy.intro}</h2><p>{row.chapters[0].summary}</p>{(row.chapters[0].highlights || []).length>0&&<ul>{(row.chapters[0].highlights || []).map((t,i)=><li key={i}>{t}</li>)}</ul>}</section>}
   {!!row.charts?.length&&<ReadingCharts charts={row.charts} available={available} titles={Object.fromEntries(row.manifest.map((c,i)=>[c.id,title(i)]))} locale={row.locale}/>}
   {row.chapters.map((chapter,index)=><article data-reading-chapter key={row.manifest[index].id} id={`chapter-${row.manifest[index].id}`} className={styles.chapter} tabIndex={-1}>
    <h2>{title(index)}</h2><p className={styles.chapterSummary}>{chapter.summary}</p>
    {chapter.questionAnswers?.map(answer=><section key={answer.questionId}><h3>{row.consultation?.questions?.find(q=>q.id===answer.questionId)?.text || copy.answer}</h3><p>{answer.answer}</p><h4>{copy.reason}</h4><p>{answer.reason}</p><h4>{copy.timing}</h4><p>{answer.timing}</p><h4>{copy.action}</h4><p>{answer.action}</p></section>)}
    {chapter.blocks?.length?chapter.blocks.map((block,b)=><section key={block.id || b}><h3>{block.title}</h3>{block.paragraphs.map((text,i)=><p key={i}>{text}</p>)}</section>):chapter.analysis.map((text,i)=><p key={i}>{text}</p>)}
    {chapter.example&&<section><h3>{copy.example}</h3><p>{chapter.example}</p></section>}{chapter.advice&&<section><h3>{copy.next}</h3><p>{chapter.advice}</p></section>}
    <blockquote>{chapter.persona}</blockquote><a href="#reading-progress">{copy.top}</a>
   </article>)}
  </div>
 </div>;
}
