"use client";
import dynamic from 'next/dynamic';
import SavedFptiReading from './SavedFptiReading';
import { useState } from 'react';
import type { EvidenceItem } from '@/app/karma-destiny-ai/result/_lib/report-model';
import { asRecord as object, asList as list, storedText as text, parseSavedText, readingLabel, savedReadingModel } from '@/lib/records/reading-content';
import { readingView } from '@/lib/records/reading-registry';
import { useLocale } from '@/lib/i18n/useT';
import { recordsCopy } from '@/lib/records/copy';
import { SavedYoga, SavedGeomancy, SavedTotem, SavedNaming } from './SavedSupplementalReadings';
import { SavedChapters, SavedText } from './SavedReadingParts';
import { SavedSaju, SavedZiwei, SavedAstrology, SavedVedic, SavedHumanDesign, SavedCards, SavedFacts } from './SavedCharts';
import { RelationshipReportHero, RelationshipReportChapters } from '@/app/relationship-boundary-test/RelationshipReportParts';
import { CompassSavedChapters } from '@/app/destiny-compass/_components/SavedCompassReport';
import { normalizeReport, type KarmaResult } from '@/app/karma-destiny-ai/result/_lib/report-model';
import type { ActionSecret } from '@/app/love-secret-ai/result/LoveSecretChecklist';
import type { Grade } from '@/app/relationship-boundary-test/scenes';
import bookStyles from '@/app/life-book-ai/result/LifeBookAiResultClient.module.css';
import loveTheme from '@/app/love-secret-ai/love-secret-theme.module.css';
import loveStyles from '@/app/love-secret-ai/result/LoveSecretAiResultClient.module.css';
import styles from './saved-reading.module.css';
import sukuyoStyles from '@/app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient.module.css';
import vedicStyles from '@/app/vedic-ai/VedicAiClient.module.css';
const SavedSukuyoSummary = dynamic(() => import('@/app/sukuyo-compatibility-ai/SukuyoCompatibilityAiClient').then(m=>m.SavedSukuyoSummary));
const LensRadar = dynamic(() => import('@/app/karma-destiny-ai/result/_components/LensRadar'));
const EvidenceDisclosure = dynamic(() => import('@/app/karma-destiny-ai/result/_components/EvidenceDisclosure'));
const LoveSecretChecklist = dynamic(() => import('@/app/love-secret-ai/result/LoveSecretChecklist'));
const VedicStructured = dynamic(() => import('@/app/vedic-ai/VedicAiClient').then(m=>m.StructuredReadingResult));

function assistantObject(row:Record<string,unknown>) {
 for(const message of [...list(row.messages)].reverse()) {
  const m=object(message);
  if(m.role==='assistant'||m.speaker==='assistant') {
   const parsed=object(parseSavedText(m.content||m.text));
   if(Object.keys(parsed).length)return {parsed, message};
  }
 }
 return {parsed:{}, message:undefined};
}
export default function SavedServiceReading({source,serviceId,value,status}:{source:string;serviceId:string;value:unknown;status?:string}) {
 const locale=useLocale(), c=recordsCopy(locale), view=readingView(source,serviceId);
 const original=object(savedReadingModel(value)), row=original;
 const {parsed,message}=assistantObject(row);
 const model=Object.keys(parsed).length?{...row,...parsed,messages:list(row.messages).filter(entry=>entry!==message)}:row;
 const family=view.family, saju=model.sajuResult||model.saju||model.sajuFacts||object(model.basis).saju;
 const body=<SavedChapters labels={family==='pet'?{routine:locale==='ko'?'하루의 돌봄':'Daily care'}:undefined} value={Object.keys(original).length?model:value} fields={view.fields} omit={['cards','savedCards','saju','sajuResult','sajuFacts','ziweiChart','astrologyChart','vedicChart','calculation','basis','canonical']}/>;
 if(typeof parseSavedText(value)==='string') return <div className={['book','love','naming','saju'].includes(family)?styles.letter:styles.reader}><SavedText text={text(value)}/></div>;
 if(family==='relationship') {
  const sections=list(row.sections).map(object).filter(s=>typeof s.body==='string').map(s=>({title:text(s.title),body:text(s.body)}));
  const valid=['low','medium','high'].includes(text(row.grade))&&typeof row.score==='number';
  return <div className={styles.native}><div className="rt-page"><article className="rt-shell">
   {valid&&<RelationshipReportHero grade={row.grade as Grade} score={row.score as number}/>}
   <div className="rt-body"><div className="rt-summary"><h2>{text(object(row.character).title)}</h2><p>{text(object(row.character).caption)}</p>{text(row.summary)&&<SavedText text={text(row.summary)}/>}</div>
   <SavedChapters value={{scoreFactors:row.scoreFactors}} showEmpty={false}/>
   <RelationshipReportChapters sections={sections}/>
   <SavedChapters value={{finalMessage:row.finalMessage}} showEmpty={false}/>
   </div></article></div></div>;
 }
 if(family==='compass') {
  const sections=(Array.isArray(row.sections)?row.sections:Object.values(object(row.sections))).map(object).filter(s=>typeof s.body==='string').sort((a,b)=>Number(a.order||0)-Number(b.order||0)).map((s,i)=>({key:text(s.key)||String(i),title:text(s.title)||c.result,body:text(s.body)}));
  return <div className={styles.narrow}><CompassSavedChapters sections={sections} title={c.result}/><SavedChapters value={row} omit={['sections']} showEmpty={sections.length===0}/></div>;
 }
 if(family==='karma') {
  const report=normalizeReport(row as KarmaResult);
  return <div className={styles.notebook}>
    {!!row.lensContribution&&report&&<LensRadar model={report.radar} forceTable/>}
    {list(row.chapters).map((raw,index)=>{const chapter=object(raw);return <section key={index} className={styles.chapter}><h2>{text(chapter.title)||c.result}</h2><SavedText text={text(chapter.content||chapter.body)}/><SavedChapters value={{summary:chapter.summary,keyTakeaways:chapter.keyTakeaways,highlightQuotes:chapter.highlightQuotes}} showEmpty={false}/>{Array.isArray(chapter.evidence)&&<KarmaEvidence items={chapter.evidence as EvidenceItem[]} />}</section>;})}
    <SavedChapters value={row} omit={['chapters']} showEmpty={!list(row.chapters).length}/>
   </div>;
 }
 if(family==='book') return <div className={bookStyles.readingRoom+' '+styles.book} style={{minHeight:0}}><div className={bookStyles.paperPage}>{saju?<SavedSaju value={saju}/>:null}<SavedChapters value={model} fields={view.fields} omit={['sajuResult','saju','sajuFacts']} chapterClass={bookStyles.chapterProse}/></div></div>;
 if(family==='love') {
  const secrets=list(model.actionSecrets).filter(v=>typeof object(v).action==='string') as ActionSecret[];
  return <div className={loveTheme.reportTheme+' '+styles.letter}><div className={loveStyles.resultDocument}>{saju?<SavedSaju value={saju}/>:null}<SavedChapters value={model} omit={[...(secrets.length?['actionSecrets','sevenDayGuide']:[])]} fields={view.fields}/>{!!secrets.length&&<LoveSecretChecklist secrets={secrets} sevenDayGuide={list(model.sevenDayGuide).filter((v):v is string=>typeof v==='string')} consultationKey={text(row.id)} forceExpanded/>}</div></div>;
 }
 if(family==='vedic'||family==='prashna') {
  const chart=object(model.vedicChart||object(model.prashnaResult).chart||model.chart), reading=object(model.reading||parsed);
  return <div className={vedicStyles.shell+' '+styles.night+' '+styles.vedic} style={{minHeight:0}}>{reading.scores&&reading.sections ? <><VedicStructured savedOnly reading={{scores:object(reading.scores),sections:object(reading.sections)}} chart={chart} name="" completed={(status||row.status)==='completed'}/><SavedChapters value={{messages:model.messages,finalMessage:model.finalMessage,evidence:model.evidence}} showEmpty={false}/></> : <><SavedVedic value={chart}/>{body}</>}</div>;
 }
 if(family==='astrology') return <div className={styles.night}><SavedAstrology value={model.astrologyChart||model.chart}/>{body}</div>;
 if(family==='ziwei'&&(model.serviceType==='ziwei-island-palace-consult'||model.palaceKey)) return <article className={styles.island}><img className={styles.islandArt} src="/images/destiny-island/consult-reading.webp" alt="" width={720} height={720}/><p>당신의 궁이 보내온 편지</p><h2>{text(model.palaceKey)}{model.palaceTitle?' · '+text(model.palaceTitle):''}</h2><SavedZiwei value={model.ziweiChart||model.chart}/>{body}</article>;
 if(family==='ziwei') return <div className={styles.reader}><SavedZiwei value={model.ziweiChart||model.chart}/>{body}</div>;
 if(family==='human-design') {
  const chart=row.calculation||object(row.basis).chart||row.chart;
  return <div className={styles.reader}><SavedHumanDesign value={chart}/>{body}</div>;
 }
 if(family==='saju'||family==='pet') return <div className={styles.letter}>{saju?<SavedSaju value={saju}/>:<SavedSaju value={model}/>}<SavedFacts value={object(model.facts)}/>{body}</div>;
 if(family==='sukuyo') return <div className={sukuyoStyles.screen+' '+styles.nativeSukuyo} style={{minHeight:0}}><SavedSukuyoSummary value={model}/><SavedFacts value={model.sukuyoResult||object(model.meta).relation}/>{body}</div>;
 if(family.startsWith('tarot')||family==='celestial') return <div className={styles.night}><SavedCards value={model.cards||model.savedCards||object(model.reading).cards} variant={family}/>{body}</div>;
 if(family==='geomancy') return <SavedGeomancy row={model}/>;
 if(family==='yoga') return <SavedYoga row={model}/>;
 if(family==='year') return <div className={styles.timeline}>{saju?<SavedSaju value={saju}/>:null}{body}</div>;
 if(family==='dream') return <div className={styles.notebook}>{list(model.chapters).length?body:<SavedChapters value={object(model.record).markdown||model}/>}</div>;
 if(family==='totem') return <SavedTotem row={model}/>;
 if(family==='palm') return <div className={styles.notebook}>{Object.entries(object(model.lines||model.lineReadings)).map(([key,value])=><section className={styles.chapter} key={key}><h2>{readingLabel(key,locale)}</h2><SavedChapters value={value} showEmpty={false}/></section>)}<SavedChapters value={model} omit={['lines','lineReadings']} fields={['mounts','fingers','palmResult']}/></div>;
 if(family==='fpti') return <SavedFptiReading value={model}/>;
 if(family==='naming') return <SavedNaming row={model}/>;
 return <div className={styles.reader} data-saved-family={family}>{body}</div>;
}


function KarmaEvidence({items}:{items:EvidenceItem[]}) { const [open,setOpen]=useState(false); return <EvidenceDisclosure evidence={items} open={open} onToggle={setOpen}/>; }
