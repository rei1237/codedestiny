"use client";
import CurrentLocationButton,{type CurrentLocation} from '@/app/components/CurrentLocationButton';
import {readingLocationCopy} from '../_lib/current-location-copy';
import {useId,useRef,useState,type FormEvent} from 'react';
import {birthDateTextInputProps} from '@/lib/birthDateInputProps';
import {authFetch} from '@/app/_lib/auth-client';
import {readDestinyProfileAccountId,type DestinyProfileCard} from '@/app/_lib/profile-card-storage';
import {invalidateProfileCache} from '@/app/_lib/user-session-cache';
import {loginForCurrentPage} from '../_lib/api';
import {consultationInputCopy} from '../_lib/consultation-input-copy';
import type {ReadingLocale} from '@/worker/yeongnyangi/fortune/reading-locale';
import styles from './profiles.module.css';
import ProfileChatFields,{type ProfileChatField} from './ProfileChatFields';
import chatStyles from './intake-chat.module.css';
import type {VoiceStyle} from '../_lib/voice-style-copy';
export default function ProfileForm({onSaved,locale,conversational=false,voice='banmal',onLogin=loginForCurrentPage}:{onSaved:(profile:DestinyProfileCard)=>void;locale?:ReadingLocale;conversational?:boolean;voice?:VoiceStyle;onLogin?:()=>void}) {
 const copy=consultationInputCopy(locale);
 const [currentLocation,setCurrentLocation]=useState<CurrentLocation|null>(null);
 const [birthDate,setBirthDate]=useState(''),[place,setPlace]=useState('');
 const [unknown,setUnknown]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
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
   onSaved(data.profile);
  }catch(e){setError(e instanceof Error?e.message:copy.saveError);}finally{lock.current=false;setBusy(false);}
 }
 const fields=[
  {id:'name',prompt:voice==='honorific'?'어떻게 불러드릴까요?':'어떻게 불러줄까?',content:<label>{copy.name}<input name="name" required maxLength={40} autoComplete="nickname" /></label>},
  {id:'gender',prompt:voice==='honorific'?'계산에 사용할 성별을 알려주세요.':'계산에 사용할 성별을 알려줘.',content:<label>{copy.gender}<select name="gender"><option value="F">{copy.female}</option><option value="M">{copy.male}</option></select></label>},
  {id:'date',prompt:voice==='honorific'?'태어난 날짜와 달력을 알려주세요.':'태어난 날짜와 달력을 알려줘.',content:<><label>{copy.birthDate}<input name="date" required {...birthDateTextInputProps(birthDate,setBirthDate)} /></label><label>{copy.calendar}<select name="calendar"><option value="solar">{copy.solar}</option><option value="lunar">{copy.lunar}</option><option value="lunar_leap">{copy.leap}</option></select></label></>},
  {id:'time',prompt:voice==='honorific'?'태어난 시간을 알고 계세요?':'태어난 시간을 알고 있어?',content:<><label>{copy.birthTime}<input name="time" type="time" required={!unknown} disabled={unknown} /></label><label><input type="checkbox" checked={unknown} onChange={e=>setUnknown(e.target.checked)} /> {copy.unknown}</label><p>{copy.unknownHint}</p></>},
  {id:'place',prompt:voice==='honorific'?'태어난 곳도 알려주실래요?':'태어난 곳도 알려줄래?',content:<><label>{copy.birthPlace}<input name="place" value={place} onChange={e=>{setPlace(e.target.value);setCurrentLocation(null);}} placeholder={copy.placeExample} maxLength={120} /></label><CurrentLocationButton locale={locale} translation={readingLocationCopy(locale||'ko')} disabled={busy} onLocation={value=>{setCurrentLocation(value);setPlace(value.name);}}/>{currentLocation&&<p role="status">{copy.locationUsed} {currentLocation.timezone}</p>}<p>{copy.placeHint}</p></>},
 ];
 const chip=(selected:boolean,label:string,select:()=>void)=><button type="button" key={label} aria-pressed={selected} onClick={select}>{label}</button>;
 const calendars:[string,string][]=[['solar',copy.solar],['lunar',copy.lunar],['lunar_leap',copy.leap]];
 // 대화형은 입력 UI를 IntakeChat 하단 답장 영역에 그린다. form 속성으로 대화 안의 <form> 제출에 묶는다.
 const chatFields:ProfileChatField[]=[
  {id:'name',prompt:fields[0].prompt,input:<input name="name" form={formId} required maxLength={40} autoComplete="nickname" placeholder={copy.name}/>},
  {id:'gender',prompt:fields[1].prompt,chips:<>{([['F',copy.female],['M',copy.male]] as const).map(([value,label])=>chip(gender===value,label,()=>setGender(value)))}<input type="hidden" name="gender" form={formId} value={gender}/></>,answer:gender==='M'?copy.male:copy.female},
  {id:'date',prompt:fields[2].prompt,chips:<>{calendars.map(([value,label])=>chip(calendar===value,label,()=>setCalendar(value)))}<input type="hidden" name="calendar" form={formId} value={calendar}/></>,input:<input name="date" form={formId} required aria-label={copy.birthDate} {...birthDateTextInputProps(birthDate,setBirthDate)}/>,answer:birthDate?`${birthDate} · ${calendars.find(([value])=>value===calendar)?.[1]}`:undefined},
  {id:'time',prompt:fields[3].prompt,chips:chip(unknown,copy.unknown,()=>setUnknown(!unknown)),note:copy.unknownHint,input:<input name="time" type="time" form={formId} aria-label={copy.birthTime} required={!unknown} disabled={unknown}/>,answer:unknown?copy.unknown:undefined},
  {id:'place',prompt:fields[4].prompt,note:<><div className={chatStyles.locate}><CurrentLocationButton locale={locale} translation={readingLocationCopy(locale||'ko')} disabled={busy} onLocation={value=>{setCurrentLocation(value);setPlace(value.name);}}/></div>{currentLocation&&<p role="status">{copy.locationUsed} {currentLocation.timezone}</p>}<p>{copy.placeHint}</p></>,input:<input name="place" form={formId} aria-label={copy.birthPlace} value={place} onChange={e=>{setPlace(e.target.value);setCurrentLocation(null);}} placeholder={copy.placeExample} maxLength={120}/>},
 ];
 return conversational?<ProfileChatFields fields={chatFields} formId={formId} onSubmit={save} busy={busy} error={error} saveLabel={busy?copy.saving:copy.save}/>:<form onSubmit={save} className={styles.profileForm} lang={locale||'ko'}><h3>{copy.profileHeading}</h3><p>{copy.profileIntro}</p>{fields.map(field=><div key={field.id}>{field.content}</div>)}<button disabled={busy} type="submit">{busy?copy.saving:copy.save}</button>{error&&<p role="alert">{error}</p>}</form>;
}
