"use client";
import {relationshipQuestions,relationshipAdvice} from '@/worker/yeongnyangi/fortune/relationship-contract';
import {systemNames} from '@/worker/yeongnyangi/payments/catalog';
import type {DomainId} from '@/worker/yeongnyangi/fortune/shared/contracts';
import {relationshipCopy as copy} from '../_lib/relationship-copy';
import {profileKey,useProfiles} from '../_lib/use-profiles';
import ProfilePicker from './ProfilePicker';
import styles from './relationship.module.css';

export default function RelationshipJourney({stage,setStage,questionId,onQuestion,participants,onParticipants,profileState,partnerId,onPartner,onEngine}:{
 stage:string;setStage:(s:string)=>void;questionId:string;onQuestion:(id:string,text:string)=>void;
 participants:{self:string;partner:string};onParticipants:(v:{self:string;partner:string})=>void;
 profileState:ReturnType<typeof useProfiles>;partnerId:string;onPartner:(s:string)=>void;onEngine:(id:DomainId)=>void;
}){
 const selected=relationshipQuestions.find(q=>q.id===questionId),profiles=profileState.profiles;
 const complete=participants.self.trim()&&participants.partner.trim();
 const self=profiles.find(p=>profileKey(p)===profileState.profileId),partner=profiles.find(p=>profileKey(p)===partnerId);
 const hasBirth=Boolean(self&&partner),hasTime=hasBirth&&!self?.birth?.timeUnknown&&!partner?.birth?.timeUnknown;
 const recommended=selected?.domain==='ziwei'&&hasTime?'ziwei':'tarot';
 const engines=[recommended,...(['ziwei','saju','sukuyo','vedic','astrology','tarot'] as DomainId[]).filter(d=>d!==recommended)] as DomainId[];
 return <section className={styles.journey} aria-label={copy.entry}>
  <h1>{stage==='question'?copy.question:stage==='people'?copy.people:copy.engine}</h1>
  <p>{copy.description}</p>
  {stage==='question'?<div className={styles.questions}>{relationshipQuestions.map(q=><button key={q.id} onClick={()=>{onQuestion(q.id,q.label);setStage('people');}}>{q.label}</button>)}</div>:<>
   <p className={styles.chosen}>{selected?.label}</p>
   {stage==='people'?<>
    <label>{copy.self}<input maxLength={40} value={participants.self} onChange={e=>onParticipants({...participants,self:e.target.value})}/></label>
    <label>{copy.partner}<input maxLength={40} value={participants.partner} onChange={e=>onParticipants({...participants,partner:e.target.value})}/></label>
    <p>{copy.birthHint}</p>
    <details><summary>{copy.birthOptional}</summary><ProfilePicker state={profileState} locale="ko"/>
     <label>상대 프로필<select value={partnerId} onChange={e=>onPartner(e.target.value)}><option value="">상대 프로필 선택</option>{profiles.filter(p=>profileKey(p)!==profileState.profileId).map(p=><option key={profileKey(p)} value={profileKey(p)}>{p.name}</option>)}</select></label>
    </details>
    <button disabled={!complete} onClick={()=>setStage('engine')}>{copy.next}</button>
   </>:<div className={styles.engines}>{engines.map(d=><article key={d}><h2>{systemNames[d]} 궁합 {d===recommended&&<small>{copy.recommended}</small>}</h2><p>{relationshipAdvice[d]}</p>{d!=='tarot'&&(!hasBirth||d!=='saju'&&!hasTime)&&<p>{copy.missingBirth}</p>}<button onClick={()=>onEngine(d)}>{systemNames[d]} {copy.start}</button></article>)}</div>}
   <button onClick={()=>setStage(stage==='people'?'question':'people')}>{copy.back}</button>
  </>}
 </section>;
}
