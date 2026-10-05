"use client";
import { useId } from 'react';
import { asRecord as object, asList as list, storedText as text } from '@/lib/records/reading-content';
import { SavedChapters, SavedText } from './SavedReadingParts';
import cosmic from '@/components/fpti/FptiCosmic.module.css';
import styles from './saved-reading.module.css';
// The saved seven-chapter report uses the original cosmic surface and the
// interpretation / strength / risk / action structure, without default analysis.
export default function SavedFptiReading({value}:{value:unknown}) {
 const id=useId(), root=object(value), report=object(root.report), row=Object.keys(report).length?report:root;
 const chapters=list(row.chapters).map(object);
 return <div className={cosmic.cosmicPage+' '+styles.fpti}>
  <header><h2>{text(row.typeName)}</h2><p>{text(row.userTypeCode)}</p><SavedChapters value={{summary:row.summary}} showEmpty={false}/></header>
  {!!chapters.length&&<nav aria-label="리포트 목차" className={styles.fptiOutline}>{chapters.map((chapter,index)=><a key={index} href={'#'+id+'-'+index}>{index+1}. {text(chapter.title)}</a>)}</nav>}
  {chapters.map((chapter,index)=><section key={index} id={id+'-'+index} className={styles.fptiChapter} data-fpti-saved-chapter>
   <h2><span>{text(chapter.roman)||String(index+1).padStart(2,'0')}</span> {text(chapter.title)}</h2>
   {list(chapter.sections).map((raw,i)=>{const section=object(raw);return <article key={i} className={styles.fptiSection}><h3>{text(section.title)}</h3><SavedText text={text(section.body||section.interpretation)}/><div className={styles.fptiTriad}><SavedChapters value={{strength:section.strength,risk:section.risk,action:section.advice||section.action}} showEmpty={false}/></div></article>;})}
   <SavedChapters value={{body:chapter.body,chapterSummary:chapter.chapterSummary}} showEmpty={false}/>
  </section>)}
  <SavedChapters value={row} omit={['chapters','summary']} showEmpty={!chapters.length}/>
 </div>;
}
