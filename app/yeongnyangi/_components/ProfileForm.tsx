"use client";
import BirthTimeInput from "@/app/components/BirthTimeInput";

import CurrentLocationButton,{type CurrentLocation} from '@/app/components/CurrentLocationButton';
import {readingLocationCopy} from '../_lib/current-location-copy';
import {useEffect,useId,useRef,useState,type FormEvent} from 'react';
import {readFeatureSessionDraft,writeFeatureSessionDraft,clearFeatureSessionDraft} from '@/app/_lib/feature-session-draft';
import {birthDateTextInputProps} from '@/lib/birthDateInputProps';
import {normalizeBirthDateInput} from '@/lib/birthDateInput';
import {authFetch} from '@/app/_lib/auth-client';
import {readDestinyProfileAccountId,type DestinyProfileCard} from '@/app/_lib/profile-card-storage';
import {invalidateProfileCache} from '@/app/_lib/user-session-cache';
import {loginForCurrentPage} from '../_lib/api';
import {consultationInputCopy,birthCalculationCopy} from '../_lib/consultation-input-copy';
import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import styles from './profiles.module.css';
import ProfileChatFields,{type ProfileChatField} from './ProfileChatFields';
import chatStyles from './intake-chat.module.css';
import type {VoiceStyle} from '../_lib/voice-style-copy';
type EntryDraft={name?:string;date?:string;time?:string;gender?:string;calendar?:string;place?:string;unknown?:boolean;step?:number;currentLocation?:CurrentLocation|null};
export function profileEntryDraftScope(){return {featureKey:'toss-profile-entry',profileId:'account:'+readDestinyProfileAccountId(),route:typeof window==='undefined'?'':window.location.pathname+window.location.search};}
export default function ProfileForm({onSaved,locale,conversational=false,guided=false,voice='banmal',surface='night',accountLabel,onLogin=loginForCurrentPage}:{onSaved:(profile:DestinyProfileCard)=>void;locale?:ReadingLocale;conversational?:boolean;guided?:boolean;voice?:VoiceStyle;surface?:'night'|'paper';accountLabel?:string;onLogin?:()=>void}) {
 const copy=consultationInputCopy(locale);
 const calculationCopy=birthCalculationCopy(locale);
 const [draftScope]=useState(profileEntryDraftScope);
 const [draft]=useState(()=>guided?readFeatureSessionDraft<EntryDraft>(draftScope)?.value:undefined);
 const draftText=(key:keyof EntryDraft,max=120)=>typeof draft?.[key]==='string'?String(draft[key]).slice(0,max):'';
 const [currentLocation,setCurrentLocation]=useState<CurrentLocation|null>(()=>{
  const value=draft?.currentLocation;
  return value&&value.source==='geolocation'&&Number.isFinite(value.latitude)&&Math.abs(value.latitude)<=90&&Number.isFinite(value.longitude)&&Math.abs(value.longitude)<=180&&typeof value.name==='string'&&typeof value.timezone==='string'?value:null;
 });
 const [birthDate,setBirthDate]=useState(()=>draftText('date',10)),[place,setPlace]=useState(()=>draftText('place'));
 const [unknown,setUnknown]=useState(draft?.unknown===true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [step,setStep]=useState(()=>Number.isInteger(draft?.step)?Math.max(0,Math.min(3,Number(draft?.step))):0);
 const guidedForm=useRef<HTMLFormElement>(null),stepHeading=useRef<HTMLHeadingElement>(null);
 const stepNames=['이름과 성별','태어난 날짜','태어난 시간','태어난 곳'];
 function keepDraft(){
  if(!guided||!guidedForm.current||draftScope.profileId!=='account:'+readDestinyProfileAccountId())return;
  const form=new FormData(guidedForm.current),text=(key:string)=>String(form.get(key)||'');
  writeFeatureSessionDraft(draftScope,{name:text('name'),date:text('date'),time:text('time'),gender:text('gender'),calendar:text('calendar'),place:text('place'),unknown,step,currentLocation});
 }
 useEffect(()=>{keepDraft();},[step,birthDate,place,unknown,currentLocation]);
 useEffect(()=>{if(guided){stepHeading.current?.focus({preventScroll:true});stepHeading.current?.scrollIntoView?.({block:'start'});}},[guided,step]);
 useEffect(()=>{if(!guided||step===0)return;const back=(event:Event)=>{if(event.defaultPrevented)return;event.preventDefault();if(!busy)setStep(value=>Math.max(0,value-1));};window.addEventListener('code-destiny:toss-overlay-back',back);return()=>window.removeEventListener('code-destiny:toss-overlay-back',back);},[guided,step,busy]);
 function nextStep(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(busy)return;
  const date=event.currentTarget.querySelector<HTMLInputElement>('[name="date"]');
  if(date&&(step===1||step===3))date.setCustomValidity(normalizeBirthDateInput(date.value)?'':'태어난 날짜를 끝까지 확인해 주세요.');
  const selector=step===3?'input,select':`[data-profile-step="${step}"] input,[data-profile-step="${step}"] select`;
  const invalid=Array.from(event.currentTarget.querySelectorAll<HTMLInputElement|HTMLSelectElement>(selector)).find(input=>!input.checkValidity());
  if(invalid){const target=invalid.closest<HTMLElement>('[data-profile-step]');if(target)setStep(Number(target.dataset.profileStep));requestAnimationFrame(()=>invalid.reportValidity());return;}
  keepDraft();if(step<3)setStep(step+1);else void save(event);
 }
 const [gender,setGender]=useState('F'),[calendar,setCalendar]=useState('solar'),formId=useId();
 const profileId=useRef(''),lock=useRef(false);
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(lock.current)return;lock.current=true;
  if(!profileId.current)profileId.current=`yn_${crypto.randomUUID()}`;
  const account=readDestinyProfileAccountId();
  const form=new FormData(event.currentTarget);setBusy(true);setError('');
  try{
   const place=String(form.get('place')||'').trim();
   let location=currentLocation?{label:currentLocation.name,tz:currentLocation.timezone,lat:currentLocation.latitude,lng:currentLocation.longitude}:undefined;
   if(place&&!currentLocation){
    const response=await authFetch(`/api/geocode?place=${encodeURIComponent(place)}`);
    const found=await response.json();
    if(!response.ok||found.fallback||!Number.isFinite(found.lat)||!Number.isFinite(found.lng))throw new Error(copy.geocodeError);
    location={label:found.name,tz:found.timezone,lat:found.lat,lng:found.lng};
   }
   const [year,month,day]=String(form.get('date')).split('-').map(Number);
   const [hour,minute]=String(form.get('time')||'').split(':').map(Number);
   if(account!==readDestinyProfileAccountId())return;
   const response=await authFetch('/api/yeongnyangi/profiles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile:{profileId:profileId.current,name:form.get('name'),gender:form.get('gender'),birth:{year,month,day,hour:unknown?null:hour,minute:unknown?null:minute,timeUnknown:unknown,calType:form.get('calendar')},...(location?{location}:{})}})});
   if(response.status===401){onLogin();return;}
   const data=await response.json();if(!response.ok)throw new Error(locale==='ko'&&data.message?data.message:copy.saveError);
   if(account!==readDestinyProfileAccountId())return;
   invalidateProfileCache('yeongnyangi-profile-created');
   if(guided)clearFeatureSessionDraft(draftScope);
   onSaved(data.profile);
  }catch(e){setError(e instanceof Error?e.message:copy.saveError);}finally{lock.current=false;setBusy(false);}
 }
 const fields=[
  {id:'name',prompt:voice==='honorific'?'어떻게 불러드릴까요?':'어떻게 불러줄까?',content:<label>{copy.name}<input name="name" required maxLength={40} autoComplete="nickname" defaultValue={draftText('name',40)} /></label>},
  {id:'gender',prompt:voice==='honorific'?'계산에 사용할 성별을 알려주세요.':'계산에 사용할 성별을 알려줘.',content:<label>{copy.gender}<select name="gender" defaultValue={draftText('gender')==='M'?'M':'F'}><option value="F">{copy.female}</option><option value="M">{copy.male}</option></select></label>},
  {id:'date',prompt:voice==='honorific'?'태어난 날짜와 달력을 알려주세요.':'태어난 날짜와 달력을 알려줘.',content:<><label>{copy.birthDate}<input name="date" required {...birthDateTextInputProps(birthDate,setBirthDate)} /></label><label>{copy.calendar}<select name="calendar" defaultValue={['solar','lunar','lunar_leap'].includes(draftText('calendar'))?draftText('calendar'):'solar'}><option value="solar">{copy.solar}</option><option value="lunar">{copy.lunar}</option><option value="lunar_leap">{copy.leap}</option></select></label><p>{calculationCopy.calendarHint}</p></>},
  {id:'time',prompt:voice==='honorific'?'태어난 시간을 알고 계세요?':'태어난 시간을 알고 있어?',content:<><label>{copy.birthTime}<BirthTimeInput name="time" defaultValue={draftText('time',5)} required={!unknown} disabled={unknown} /></label><label><input type="checkbox" checked={unknown} onChange={e=>setUnknown(e.target.checked)} /> {copy.unknown}</label><p>{copy.unknownHint}</p></>},
  {id:'place',prompt:voice==='honorific'?'태어난 곳도 알려주실래요?':'태어난 곳도 알려줄래?',content:<><label>{copy.birthPlace}<input name="place" value={place} onChange={e=>{setPlace(e.target.value);setCurrentLocation(null);}} placeholder={copy.placeExample} maxLength={120} /></label><CurrentLocationButton locale={locale} translation={readingLocationCopy(locale||'ko')} disabled={busy} onLocation={value=>{setCurrentLocation(value);setPlace(value.name);}}/>{currentLocation&&<p role="status">{copy.locationUsed} {currentLocation.timezone}</p>}<p>{copy.placeHint}</p><p>{calculationCopy.placeHint}</p></>},
 ];
 const chip=(selected:boolean,label:string,select:()=>void)=><button type="button" key={label} aria-pressed={selected} onClick={select}>{label}</button>;
 const calendars:[string,string][]=[['solar',copy.solar],['lunar',copy.lunar],['lunar_leap',copy.leap]];
 // 대화형 입력은 form 속성으로 대화 안의 <form> 제출에 묶는다.
 const chatFields:ProfileChatField[]=[
  {id:'name',prompt:fields[0].prompt,input:<input name="name" form={formId} required maxLength={40} autoComplete="nickname" placeholder={copy.name}/>},
  {id:'gender',prompt:fields[1].prompt,chips:<>{([['F',copy.female],['M',copy.male]] as const).map(([value,label])=>chip(gender===value,label,()=>setGender(value)))}<input type="hidden" name="gender" form={formId} value={gender}/></>,answer:gender==='M'?copy.male:copy.female},
  {id:'date',prompt:fields[2].prompt,note:calculationCopy.calendarHint,chips:<>{calendars.map(([value,label])=>chip(calendar===value,label,()=>setCalendar(value)))}<input type="hidden" name="calendar" form={formId} value={calendar}/></>,input:<input name="date" form={formId} required aria-label={copy.birthDate} {...birthDateTextInputProps(birthDate,setBirthDate)}/>,answer:birthDate?`${birthDate} · ${calendars.find(([value])=>value===calendar)?.[1]}`:undefined},
  {id:'time',prompt:fields[3].prompt,chips:chip(unknown,copy.unknown,()=>setUnknown(!unknown)),note:copy.unknownHint,input:<BirthTimeInput name="time"  form={formId} aria-label={copy.birthTime} required={!unknown} disabled={unknown}/>,answer:unknown?copy.unknown:undefined},
  {id:'place',prompt:fields[4].prompt,note:<><div className={chatStyles.locate}><CurrentLocationButton locale={locale} translation={readingLocationCopy(locale||'ko')} disabled={busy} onLocation={value=>{setCurrentLocation(value);setPlace(value.name);}}/></div>{currentLocation&&<p role="status">{copy.locationUsed} {currentLocation.timezone}</p>}<p>{copy.placeHint}</p><p>{calculationCopy.placeHint}</p></>,input:<input name="place" form={formId} aria-label={copy.birthPlace} value={place} onChange={e=>{setPlace(e.target.value);setCurrentLocation(null);}} placeholder={copy.placeExample} maxLength={120}/>},
 ];
 if(guided)return <form ref={guidedForm} onChange={keepDraft} onSubmit={nextStep} noValidate className={`${styles.profileForm} ${styles.guided}`} lang={locale||'ko'}>
  <p className={styles.stepCount} role="status">출생정보 · {step+1} / {stepNames.length}</p><h3 ref={stepHeading} tabIndex={-1}>{stepNames[step]}</h3>
  {[[0,1],[2],[3],[4]].map((indices,index)=><div key={index} data-profile-step={index} hidden={index!==step}>{indices.map(i=><div key={fields[i].id}>{fields[i].content}</div>)}</div>)}
  <div className={styles.stepActions}>{step>0&&<button type="button" disabled={busy} onClick={()=>setStep(step-1)}>이전</button>}<button disabled={busy} type="submit">{busy?copy.saving:step===3?'저장하고 계속':'다음'}</button></div>
  {error&&<p role="alert">{error}</p>}
 </form>;
 return conversational?<ProfileChatFields fields={chatFields} formId={formId} onSubmit={save} busy={busy} error={error} saveLabel={busy?copy.saving:copy.save}/>:<form onSubmit={save} className={`${styles.profileForm}${surface==='paper'?` ${styles.paper}`:''}`} lang={locale||'ko'}><h3>{copy.profileHeading}</h3><p>{accountLabel||copy.profileIntro}</p>{fields.map(field=><div key={field.id}>{field.content}</div>)}<button disabled={busy} type="submit">{busy?copy.saving:copy.save}</button>{error&&<p role="alert">{error}</p>}</form>;
}
