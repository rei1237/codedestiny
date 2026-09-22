'use client';
import {useEffect,useState} from 'react';
import type {FortuneRecord} from '../_lib/api';
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
 const available=new Set(row.manifest.slice(0,row.chapters.length).map(c=>c.id));
 return <div className={styles.book}>
  <aside className={styles.navigation}><details open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>상담 목차 · {Math.max(1,row.manifest.findIndex(c=>`chapter-${c.id}`===current)+1)} / {row.manifest.length}</summary>
   <nav aria-label="상담 목차">{row.manifest.map((chapter,i)=><a key={chapter.id} href={available.has(chapter.id)?`#chapter-${chapter.id}`:'#reading-progress'} aria-current={current===`chapter-${chapter.id}`?'location':undefined}>{i+1}. {chapter.title}{!available.has(chapter.id)&&' · 준비 중'}</a>)}</nav>
  </details>{saved&&row.manifest.some(c=>`chapter-${c.id}`===saved)&&<a className={styles.resume} href={`#${saved}`}>읽던 이야기로 이동</a>}</aside>
  <div className={styles.body}>
   {row.chapters.length>0&&<section className={styles.overview}><h2>먼저, 너에게 전할 이야기</h2><p>{row.chapters[0].summary}</p>{(row.chapters[0].highlights || []).length>0&&<ul>{(row.chapters[0].highlights || []).map((t,i)=><li key={i}>{t}</li>)}</ul>}</section>}
   {!!row.charts?.length&&<ReadingCharts charts={row.charts} available={available} titles={Object.fromEntries(row.manifest.map(c=>[c.id,c.title]))}/>}
   {row.chapters.map((chapter,index)=><article data-reading-chapter key={row.manifest[index].id} id={`chapter-${row.manifest[index].id}`} className={styles.chapter} tabIndex={-1}>
    <h2>{row.manifest[index].title}</h2><p className={styles.chapterSummary}>{chapter.summary}</p>
    {chapter.questionAnswers?.map(answer=><section key={answer.questionId}><h3>{row.consultation?.questions?.find(q=>q.id===answer.questionId)?.text || '질문에 대한 답변'}</h3><p>{answer.answer}</p><h4>해석의 근거</h4><p>{answer.reason}</p><h4>관련 시기</h4><p>{answer.timing}</p><h4>실천 조언</h4><p>{answer.action}</p></section>)}
    {chapter.blocks?.length?chapter.blocks.map((block,b)=><section key={block.id || b}><h3>{block.title}</h3>{block.paragraphs.map((text,i)=><p key={i}>{text}</p>)}</section>):chapter.analysis.map((text,i)=><p key={i}>{text}</p>)}
    {chapter.example&&<section><h3>생활 속에서는</h3><p>{chapter.example}</p></section>}{chapter.advice&&<section><h3>지금 해볼 일</h3><p>{chapter.advice}</p></section>}
    <blockquote>{chapter.persona}</blockquote><a href="#reading-progress">진행과 목차 위로</a>
   </article>)}
  </div>
 </div>;
}
