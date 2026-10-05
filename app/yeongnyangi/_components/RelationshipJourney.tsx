"use client";
import Image from 'next/image';
import {ArrowLeft,ArrowRight,Check,ChevronDown} from 'lucide-react';
import {useEffect,useRef} from 'react';
import {relationshipMethodCopy} from '../_lib/relationship-method-copy';
import {localizedSystem,localizedKind} from '../_lib/consultation-locale-copy';
import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';

import type {DomainId} from '@/worker/yeongnyangi/fortune/shared/contracts';
import {relationshipCopyFor} from '../_lib/relationship-locales';
import {profileKey,useProfiles} from '../_lib/use-profiles';
import ProfilePicker from './ProfilePicker';
import styles from './relationship.module.css';

export default function RelationshipJourney({locale='ko',stage,setStage,questionId,onQuestion,participants,onParticipants,profileState,partnerId,onPartner,onEngine}:{
 locale?:ReadingLocale;stage:string;setStage:(s:string)=>void;questionId:string;onQuestion:(id:string,text:string)=>void;
 participants:{self:string;partner:string};onParticipants:(v:{self:string;partner:string})=>void;
 profileState:ReturnType<typeof useProfiles>;partnerId:string;onPartner:(s:string)=>void;onEngine:(id:DomainId)=>void;
}){
 const method=relationshipMethodCopy(locale),relationshipQuestions=method.questions,relationshipAdvice=method.advice;
 const copy={...relationshipCopyFor(locale),steps:method.steps};
 const selected=relationshipQuestions.find(q=>q.id===questionId),profiles=profileState.profiles;
 const complete=participants.self.trim()&&participants.partner.trim();
 const self=profiles.find(p=>profileKey(p)===profileState.profileId),partner=profiles.find(p=>profileKey(p)===partnerId);
 const hasBirth=Boolean(self&&partner),hasTime=hasBirth&&!self?.birth?.timeUnknown&&!partner?.birth?.timeUnknown;
 const recommended=selected?.domain==='ziwei'&&hasTime?'ziwei':'tarot';
 const engines=[recommended,...(['ziwei','saju','sukuyo','vedic','astrology','tarot'] as DomainId[]).filter(d=>d!==recommended)] as DomainId[];
 const step=stage==='question'?0:stage==='people'?1:2;
 const heading=useRef<HTMLHeadingElement>(null);
 const previousStage=useRef(stage);
 useEffect(()=>{if(previousStage.current!==stage){heading.current?.focus();previousStage.current=stage;}},[stage]);
 const renderEngine=(d:DomainId,featured=false)=><article key={d} className={featured?styles.recommended:styles.engine}>
  <div className={styles.engineHeading}><h3>{localizedSystem(d,locale)} · {localizedKind('compatibility',locale)}</h3>{featured&&<span className={styles.recommendation}><Check size={14} aria-hidden="true"/>{copy.recommended}</span>}</div>
  <p className={styles.engineDescription}>{relationshipAdvice[d]}</p>
  {d!=='tarot'&&(!hasBirth||d!=='saju'&&!hasTime)&&<p className={styles.requirement}>{copy.missingBirth}</p>}
  <button type="button" className={featured?styles.primary:styles.secondary} onClick={()=>onEngine(d)}>{localizedSystem(d,locale)} · {copy.start}<ArrowRight size={18} aria-hidden="true"/></button>
 </article>;
 return <section className={styles.journey} aria-label={copy.entry} lang={locale}>
  <ol className={styles.steps} aria-label={copy.progress}>{copy.steps.map((label,index)=><li key={label} aria-current={step===index?'step':undefined} className={index<step?styles.finished:undefined}><span aria-hidden="true">{index<step?<Check size={14}/>:index+1}</span>{label}</li>)}</ol>
  <div className={styles.layout}>
   <aside className={styles.companion} aria-label={copy.entry}>
    <Image className={styles.scene} src="/assets/yeongnyangi/reading-art/insight.webp" width={720} height={480} sizes="(max-width: 759px) 100vw, 340px" alt="Yeongnyangi"/>
    <p className={styles.companionCopy}>{copy.description}</p>
   </aside>
   <div className={styles.content}>
    <header className={styles.heading}><h1 ref={heading} tabIndex={-1}>{step===0?copy.question:step===1?copy.people:copy.engine}</h1><p>{step===0?copy.questionHint:step===1?copy.peopleHint:copy.engineHint}</p></header>
    {selected&&stage!=='question'&&<div className={styles.chosen}><span>{copy.selectedQuestion}</span><strong>{selected.label}</strong></div>}
    {stage==='question'?<div className={styles.questions}>{relationshipQuestions.map(q=><button type="button" className={styles.question} key={q.id} onClick={()=>{onQuestion(q.id,q.label);setStage('people');}}><span>{q.label}</span><ArrowRight size={18} aria-hidden="true"/></button>)}</div>:<>
     {stage==='people'?<>
      <div className={styles.people}>
       <div className={styles.person}><span className={styles.personRole}>{copy.selfRole}</span><label className={styles.field}>{copy.self}<input className={styles.input} aria-describedby="relationship-names-hint" maxLength={40} placeholder={copy.selfPlaceholder} value={participants.self} onChange={e=>onParticipants({...participants,self:e.target.value})}/></label></div>
       <div className={styles.person}><span className={styles.personRole}>{copy.partnerRole}</span><label className={styles.field}>{copy.partner}<input className={styles.input} aria-describedby="relationship-names-hint" maxLength={40} placeholder={copy.partnerPlaceholder} value={participants.partner} onChange={e=>onParticipants({...participants,partner:e.target.value})}/></label></div>
      </div>
      <div className={styles.guide}><Image src="/assets/yeongnyangi/expressions/welcome.webp" width={48} height={48} alt=""/><p>{copy.tarotHint}</p></div>
      <details className={styles.birth}><summary><span>{copy.birthOptional}</span><small>{copy.optional}</small><ChevronDown size={18} aria-hidden="true"/></summary><div className={styles.birthBody}><p className={styles.birthHint}>{copy.birthHint}</p><ProfilePicker state={profileState} locale={locale}/>
       <label className={styles.field}>{copy.partnerProfile}<select className={styles.input} aria-label={copy.partnerProfile} value={partnerId} onChange={e=>onPartner(e.target.value)}><option value="">{copy.partnerProfilePlaceholder}</option>{profiles.filter(p=>profileKey(p)!==profileState.profileId).map(p=><option key={profileKey(p)} value={profileKey(p)}>{p.name}</option>)}</select></label>
      </div></details>
      <p className={styles.status} id="relationship-names-hint" aria-live="polite">{complete?copy.ready:copy.namesRequired}</p>
     </>:<div className={styles.engines}><h2 className={styles.sectionTitle}>{copy.recommended}</h2>{renderEngine(engines[0],true)}<h2 className={styles.sectionTitle}>{copy.otherEngines}</h2>{engines.slice(1).map(d=>renderEngine(d))}</div>}
     <div className={styles.actions}>
      {stage==='people'&&<button type="button" className={styles.primary} disabled={!complete} aria-describedby="relationship-names-hint" onClick={()=>setStage('engine')}>{copy.next}<ArrowRight size={18} aria-hidden="true"/></button>}
      <button type="button" className={styles.back} onClick={()=>setStage(stage==='people'?'question':'people')}><ArrowLeft size={16} aria-hidden="true"/>{copy.back}</button>
     </div>
    </>}
   </div>
  </div>
 </section>;
}
